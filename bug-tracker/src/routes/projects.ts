import { Router } from 'express';
import { z } from 'zod';
import db from '../db/database';
import { validate } from '../middleware/validate';
import { requireAdmin } from '../middleware/auth';

const router = Router();

const ProjectCreateSchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional().default(''),
});

const ProjectUpdateSchema = ProjectCreateSchema.partial();

// GET /projects — admins see all; others see only their member projects
router.get('/', (req, res) => {
  let projects;
  if (req.user?.role === 'admin') {
    projects = db.prepare('SELECT * FROM projects ORDER BY id').all();
  } else {
    projects = db.prepare(`
      SELECT p.* FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = ?
      ORDER BY p.id
    `).all(req.user!.id);
  }
  res.json(projects);
});

// GET /projects/:id
router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
});

// POST /projects
router.post('/', requireAdmin, validate(ProjectCreateSchema), (req, res) => {
  const { name, description } = req.body as z.infer<typeof ProjectCreateSchema>;
  const info = db.prepare('INSERT INTO projects (name, description) VALUES (?, ?)').run(name, description);
  // Auto-enroll the creator as a member
  db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)').run(info.lastInsertRowid, req.user!.id);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(project);
});

// PUT /projects/:id
router.put('/:id', requireAdmin, validate(ProjectUpdateSchema), (req, res) => {
  const updates = req.body as z.infer<typeof ProjectUpdateSchema>;
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const merged = { ...existing, ...updates };
  db.prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?')
    .run(merged.name, merged.description, req.params.id);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(project);
});

// DELETE /projects/:id
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
