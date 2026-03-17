import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import db, { DELETED_USER_ID } from '../db/database';
import { validate } from '../middleware/validate';
import { requireAdmin, requireAuth } from '../middleware/auth';

const router = Router();

const UserCreateSchema = z.object({
  name:     z.string().min(1),
  email:    z.string().email(),
  role:     z.enum(['admin', 'developer', 'tester']),
  password: z.string().min(6).optional(),
});

const UserUpdateSchema = UserCreateSchema.partial();

// GET /users
router.get('/', requireAuth, (_req, res) => {
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
router.post('/', requireAdmin, validate(UserCreateSchema), (req, res) => {
  const { name, email, role, password } = req.body as z.infer<typeof UserCreateSchema>;
  const passwordHash = password ? bcrypt.hashSync(password, 10) : null;
  try {
    const stmt = db.prepare('INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?)');
    const info = stmt.run(name, email, role, passwordHash);
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
router.put('/:id', requireAdmin, validate(UserUpdateSchema), (req, res) => {
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
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const adminId = req.user!.id;
  db.transaction(() => {
    // Reassign reported bugs to the admin performing the delete
    db.prepare('UPDATE bugs SET reporter_id = ? WHERE reporter_id = ?').run(adminId, id);
    // Nullify assignee where applicable
    db.prepare('UPDATE bugs SET assignee_id = NULL WHERE assignee_id = ?').run(id);
    // Reassign comments to the system "Deleted User" account
    db.prepare('UPDATE comments SET user_id = ? WHERE user_id = ?').run(DELETED_USER_ID, id);
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  })();
  res.status(204).send();
});

export default router;
