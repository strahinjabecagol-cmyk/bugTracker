import { Router } from 'express';
import { z } from 'zod';
import db from '../db/database';
import { validate } from '../middleware/validate';

const router = Router();

const UserCreateSchema = z.object({
  name:  z.string().min(1),
  email: z.string().email(),
  role:  z.enum(['admin', 'developer', 'tester']),
});

const UserUpdateSchema = UserCreateSchema.partial();

// GET /users
router.get('/', (_req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY id').all();
  res.json(users);
});

// GET /users/:id
router.get('/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

// POST /users
router.post('/', validate(UserCreateSchema), (req, res) => {
  const { name, email, role } = req.body as z.infer<typeof UserCreateSchema>;
  try {
    const stmt = db.prepare('INSERT INTO users (name, email, role) VALUES (?, ?, ?)');
    const info = stmt.run(name, email, role);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(user);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE')) {
      res.status(409).json({ error: 'Email already in use' });
    } else {
      throw err;
    }
  }
});

// PUT /users/:id
router.put('/:id', validate(UserUpdateSchema), (req, res) => {
  const updates = req.body as z.infer<typeof UserUpdateSchema>;
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const merged = { ...existing, ...updates };
  db.prepare('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?')
    .run(merged.name, merged.email, merged.role, req.params.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json(user);
});

// DELETE /users/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
