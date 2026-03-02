import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database';
import { validate } from '../middleware/validate';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const COOKIE_NAME = 'bt_token';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const RegisterSchema = z.object({
  name:     z.string().min(1),
  email:    z.string().email(),
  password: z.string().min(6),
});

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  password_hash: string | null;
}

function signToken(user: Pick<UserRow, 'id' | 'email' | 'role'>) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

// POST /auth/login
router.post('/login', validate(LoginSchema), (req, res) => {
  const { email, password } = req.body as z.infer<typeof LoginSchema>;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  if (!user || !user.password_hash) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

// POST /auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax' });
  res.json({ message: 'Logged out' });
});

// POST /auth/register
router.post('/register', validate(RegisterSchema), (req, res) => {
  const { name, email, password } = req.body as z.infer<typeof RegisterSchema>;
  const hash = bcrypt.hashSync(password, 10);

  try {
    const info = db.prepare(
      `INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, 'developer', ?)`
    ).run(name, email, hash);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as UserRow;
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE')) {
      res.status(409).json({ error: 'Email already in use' });
    } else {
      throw err;
    }
  }
});

// GET /auth/me
router.get('/me', (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(payload.id);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;
