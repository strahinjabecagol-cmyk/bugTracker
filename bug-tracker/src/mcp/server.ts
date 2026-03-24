import 'dotenv/config';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { timingSafeEqual } from 'crypto';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { createServer } from './createServer';
import oauthRouter, { ISSUER, isValidOAuthToken } from './oauth';

if (process.env.MCP_TRANSPORT === 'http') {
  const apiKey = process.env.MCP_API_KEY ?? null;
  if (!apiKey) {
    console.error('INFO: MCP_API_KEY not set — API key auth disabled, OAuth only.');
  }

  const port = parseInt(process.env.PORT ?? '3001', 10);
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(oauthRouter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', transport: 'http' });
  });

  // Session store for SSE (GET) + POST pairing
  const sessions = new Map<string, { transport: StreamableHTTPServerTransport; mcpServer: ReturnType<typeof createServer> }>();

  function checkAuth(req: express.Request, res: express.Response): boolean {
    const authHeader = req.headers['authorization'];
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    let authorized = false;
    if (bearer && apiKey) {
      try { authorized = bearer.length === apiKey.length && timingSafeEqual(Buffer.from(bearer), Buffer.from(apiKey)); } catch { /* mismatch */ }
    }
    if (!authorized && bearer) authorized = isValidOAuthToken(bearer);

    if (!authorized) {
      res.setHeader('WWW-Authenticate', `Bearer realm="bug-tracker", resource_metadata="${ISSUER}/.well-known/oauth-protected-resource"`);
      res.status(401).json({ error: 'Unauthorized' });
    }
    return authorized;
  }

  // POST /mcp — Streamable HTTP (primary transport)
  app.post('/mcp', async (req, res) => {
    if (!checkAuth(req, res)) return;

    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;
    let mcpServer: ReturnType<typeof createServer>;

    if (sessionId && sessions.has(sessionId)) {
      // Reuse existing session — critical for initialize → notifications/initialized sequence
      ({ transport, mcpServer } = sessions.get(sessionId)!);
    } else {
      mcpServer = createServer();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => { sessions.set(id, { transport, mcpServer }); },
      });
      // Do NOT close transport on response close — session must survive across requests
      await mcpServer.connect(transport);
    }
    await transport.handleRequest(req, res, req.body);
  });

  // GET /mcp — SSE stream (fallback transport for mcp-remote)
  app.get('/mcp', async (req, res) => {
    if (!checkAuth(req, res)) return;

    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const { transport } = sessions.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    const mcpServer = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => { sessions.set(id, { transport, mcpServer }); },
    });
    // SSE: clean up when the long-lived connection closes
    res.on('close', () => {
      if (transport.sessionId) sessions.delete(transport.sessionId);
      transport.close();
      mcpServer.close();
    });
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Use HTTPS if mkcert certs exist, otherwise fall back to HTTP
  const certPath = path.join(process.cwd(), 'localhost.pem');
  const keyPath  = path.join(process.cwd(), 'localhost-key.pem');
  const useTls   = fs.existsSync(certPath) && fs.existsSync(keyPath);

  const httpServer = useTls
    ? https.createServer({ cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) }, app).listen(port, () => {
        console.error(`Bug Tracker MCP server started (https) on port ${port}`);
      })
    : app.listen(port, () => {
        console.error(`Bug Tracker MCP server started (http) on port ${port}`);
      });

  const shutdown = () => {
    console.error('Shutting down gracefully...');
    httpServer.close(() => {
      console.error('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} else {
  async function main() {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Bug Tracker MCP server started (stdio)');
  }

  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
