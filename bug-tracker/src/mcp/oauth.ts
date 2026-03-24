import { Router, Request, Response } from 'express';
import express from 'express';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../db/database';

export const ISSUER = process.env.MCP_OAUTH_ISSUER ?? 'http://localhost:3001';

const ACCESS_TOKEN_TTL = 3600;      // 1 hour
const CODE_TTL         = 300;       // 5 minutes

function tok(bytes = 32) { return randomBytes(bytes).toString('hex'); }
function expiresAt(seconds: number) { return new Date(Date.now() + seconds * 1000).toISOString(); }
function esc(s: unknown) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const router = Router();

// ── Protected resource metadata (RFC 9728) ─────────────────────────────────
router.get('/.well-known/oauth-protected-resource', (_req, res) => {
  res.json({ resource: ISSUER, authorization_servers: [ISSUER] });
});

// ── Authorization server metadata (RFC 8414) ───────────────────────────────
router.get('/.well-known/oauth-authorization-server', (_req, res) => {
  res.json({
    issuer:                                ISSUER,
    authorization_endpoint:                `${ISSUER}/oauth/authorize`,
    token_endpoint:                        `${ISSUER}/oauth/token`,
    registration_endpoint:                 `${ISSUER}/register`,
    revocation_endpoint:                   `${ISSUER}/oauth/revoke`,
    response_types_supported:              ['code'],
    grant_types_supported:                 ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported:      ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  });
});

// ── Dynamic Client Registration (RFC 7591) ─────────────────────────────────
// /register is the path mcp-remote uses; /oauth/register is our canonical path
function registerHandler(req: Request, res: Response) {
  const { client_name, redirect_uris } = req.body as { client_name?: string; redirect_uris?: string[] };
  if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    res.status(400).json({ error: 'invalid_client_metadata', error_description: 'redirect_uris is required' });
    return;
  }
  const clientId = tok(16);
  const name = client_name ?? 'Unknown Client';
  db.prepare('INSERT INTO oauth_clients (client_id, client_name, redirect_uris) VALUES (?, ?, ?)').run(clientId, name, JSON.stringify(redirect_uris));
  res.status(201).json({
    client_id: clientId,
    client_name: name,
    redirect_uris,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  });
}

router.post('/register', registerHandler);
router.post('/oauth/register', registerHandler);

// ── Authorization endpoint — GET (show login form) ─────────────────────────
router.get('/oauth/authorize', (req, res) => {
  const q = req.query as Record<string, string>;
  if (q.response_type !== 'code' || !q.client_id || !q.redirect_uri || !q.code_challenge) {
    res.status(400).send('Missing or invalid parameters');
    return;
  }
  const client = db.prepare('SELECT client_name, redirect_uris FROM oauth_clients WHERE client_id = ?').get(q.client_id) as { client_name: string; redirect_uris: string } | undefined;
  if (!client || !(JSON.parse(client.redirect_uris) as string[]).includes(q.redirect_uri)) {
    res.status(400).send('Invalid client or redirect_uri');
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(loginPage(client.client_name, q));
});

// ── Authorization endpoint — POST (process login, issue code) ──────────────
router.post('/oauth/authorize', express.urlencoded({ extended: false }), (req, res) => {
  const b = req.body as Record<string, string>;

  const client = db.prepare('SELECT redirect_uris FROM oauth_clients WHERE client_id = ?').get(b.client_id) as { redirect_uris: string } | undefined;
  if (!client || !(JSON.parse(client.redirect_uris) as string[]).includes(b.redirect_uri)) {
    res.status(400).send('Invalid client or redirect_uri');
    return;
  }

  interface UserRow { id: number; password_hash: string | null; }
  const user = db.prepare('SELECT id, password_hash FROM users WHERE email = ?').get(b.email) as UserRow | undefined;
  const valid = !!(user?.password_hash && bcrypt.compareSync(b.password ?? '', user.password_hash));
  if (!valid) {
    const params = new URLSearchParams({ ...b, error: 'Invalid email or password' });
    res.redirect(302, `/oauth/authorize?${params}`);
    return;
  }

  const code = tok(32);
  db.prepare('INSERT INTO oauth_codes (code, client_id, user_id, redirect_uri, code_challenge, code_challenge_method, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    code, b.client_id, user!.id, b.redirect_uri, b.code_challenge, b.code_challenge_method ?? 'S256', expiresAt(CODE_TTL),
  );

  const redirect = new URL(b.redirect_uri);
  redirect.searchParams.set('code', code);
  if (b.state) redirect.searchParams.set('state', b.state);
  res.redirect(302, redirect.toString());
});

// ── Token endpoint ─────────────────────────────────────────────────────────
router.post('/oauth/token', express.urlencoded({ extended: false }), (req, res) => {
  const b = req.body as Record<string, string>;

  if (b.grant_type === 'authorization_code') {
    interface CodeRow { client_id: string; user_id: number; redirect_uri: string; code_challenge: string; code_challenge_method: string; expires_at: string; used: number; }
    const row = db.prepare('SELECT * FROM oauth_codes WHERE code = ?').get(b.code) as CodeRow | undefined;

    if (!row || row.used || row.client_id !== b.client_id || row.redirect_uri !== b.redirect_uri) {
      res.status(400).json({ error: 'invalid_grant' });
      return;
    }
    if (new Date(row.expires_at) < new Date()) {
      res.status(400).json({ error: 'invalid_grant', error_description: 'code expired' });
      return;
    }

    // Verify PKCE (S256)
    const challenge = createHash('sha256').update(b.code_verifier ?? '').digest('base64url');
    let pkceOk = false;
    try {
      const a = Buffer.from(challenge);
      const c = Buffer.from(row.code_challenge);
      pkceOk = a.length === c.length && timingSafeEqual(a, c);
    } catch { /* length mismatch — not ok */ }

    if (!pkceOk) {
      res.status(400).json({ error: 'invalid_grant', error_description: 'code_verifier mismatch' });
      return;
    }

    db.prepare('UPDATE oauth_codes SET used = 1 WHERE code = ?').run(b.code);

    const accessToken = tok();
    const refreshToken = tok();
    db.prepare('INSERT INTO oauth_tokens (access_token, refresh_token, client_id, user_id, expires_at) VALUES (?, ?, ?, ?, ?)').run(
      accessToken, refreshToken, b.client_id, row.user_id, expiresAt(ACCESS_TOKEN_TTL),
    );
    res.json({ access_token: accessToken, token_type: 'Bearer', expires_in: ACCESS_TOKEN_TTL, refresh_token: refreshToken });
    return;
  }

  if (b.grant_type === 'refresh_token') {
    interface TokenRow { client_id: string; user_id: number; }
    const row = db.prepare('SELECT client_id, user_id FROM oauth_tokens WHERE refresh_token = ?').get(b.refresh_token) as TokenRow | undefined;
    if (!row) { res.status(400).json({ error: 'invalid_grant' }); return; }

    db.prepare('DELETE FROM oauth_tokens WHERE refresh_token = ?').run(b.refresh_token);
    const accessToken = tok();
    const refreshToken = tok();
    db.prepare('INSERT INTO oauth_tokens (access_token, refresh_token, client_id, user_id, expires_at) VALUES (?, ?, ?, ?, ?)').run(
      accessToken, refreshToken, row.client_id, row.user_id, expiresAt(ACCESS_TOKEN_TTL),
    );
    res.json({ access_token: accessToken, token_type: 'Bearer', expires_in: ACCESS_TOKEN_TTL, refresh_token: refreshToken });
    return;
  }

  res.status(400).json({ error: 'unsupported_grant_type' });
});

// ── Token revocation ───────────────────────────────────────────────────────
router.post('/oauth/revoke', express.urlencoded({ extended: false }), (req, res) => {
  const t = (req.body as Record<string, string>).token;
  if (t) db.prepare('DELETE FROM oauth_tokens WHERE access_token = ? OR refresh_token = ?').run(t, t);
  res.status(200).send('');
});

// ── Token validation helper (used by server.ts) ────────────────────────────
export function isValidOAuthToken(token: string): boolean {
  const row = db.prepare('SELECT expires_at FROM oauth_tokens WHERE access_token = ?').get(token) as { expires_at: string } | undefined;
  return !!row && new Date(row.expires_at) > new Date();
}

// ── Login page HTML ────────────────────────────────────────────────────────
function loginPage(clientName: string, q: Record<string, string>): string {
  const hidden = ['client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method', 'response_type']
    .map(k => `<input type="hidden" name="${k}" value="${esc(q[k])}">`)
    .join('');
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Authorize – Bug Tracker</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:2rem;width:100%;max-width:380px}
h1{font-size:1.2rem;font-weight:600;margin-bottom:.4rem}
.sub{font-size:.85rem;color:#94a3b8;margin-bottom:1.5rem}
label{font-size:.8rem;font-weight:500;color:#cbd5e1;display:block;margin-bottom:.25rem}
input[type=email],input[type=password]{width:100%;padding:.5rem .75rem;border-radius:6px;border:1px solid #475569;background:#0f172a;color:#f1f5f9;font-size:.875rem;margin-bottom:1rem}
input:focus{outline:none;border-color:#6366f1}
button{width:100%;padding:.6rem;border:none;border-radius:6px;background:#6366f1;color:#fff;font-size:.9rem;font-weight:600;cursor:pointer}
button:hover{background:#4f46e5}
.err{color:#f87171;font-size:.8rem;margin:.5rem 0 1rem;padding:.5rem;background:#451a1a;border-radius:4px}
</style></head>
<body><div class="card">
<h1>Authorize MCP Access</h1>
<p class="sub">Sign in to allow <strong>${esc(clientName)}</strong> to access Bug Tracker.</p>
${q.error ? `<p class="err">${esc(q.error)}</p>` : ''}
<form method="POST" action="/oauth/authorize">
${hidden}
<label for="em">Email</label>
<input type="email" id="em" name="email" required autofocus>
<label for="pw">Password</label>
<input type="password" id="pw" name="password" required>
<button type="submit">Sign in &amp; Authorize</button>
</form>
</div></body></html>`;
}

export default router;
