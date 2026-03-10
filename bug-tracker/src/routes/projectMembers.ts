import { Router } from 'express';
import { z } from 'zod';
import db from '../db/database';
import { validate } from '../middleware/validate';
import { requireAdmin } from '../middleware/auth';

const router = Router({ mergeParams: true });

const MemberAddSchema = z.object({
  user_id: z.number().int().positive(),
});

// GET /projects/:id/members
router.get('/', (req, res) => {
  const projectId = Number((req.params as { id: string }).id);
  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, pm.created_at AS joined_at
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
    ORDER BY u.name
  `).all(projectId);
  res.json(members);
});

// POST /projects/:id/members — admin only
router.post('/', requireAdmin, validate(MemberAddSchema), (req, res) => {
  const projectId = Number((req.params as { id: string }).id);
  const { user_id } = req.body as z.infer<typeof MemberAddSchema>;

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  try {
    db.prepare('INSERT INTO project_members (project_id, user_id) VALUES (?, ?)').run(projectId, user_id);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE')) {
      res.status(409).json({ error: 'User is already a member of this project' });
      return;
    }
    throw e;
  }

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, pm.created_at AS joined_at
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
    ORDER BY u.name
  `).all(projectId);
  res.status(201).json(members);
});

// DELETE /projects/:id/members/:userId — admin only
router.delete('/:userId', requireAdmin, (req, res) => {
  const projectId = Number((req.params as { id: string; userId: string }).id);
  const userId = Number((req.params as { id: string; userId: string }).userId);
  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(projectId, userId);
  res.status(204).send();
});

export default router;
