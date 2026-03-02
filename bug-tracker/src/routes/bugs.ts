import { Router, Request } from 'express';
import { z } from 'zod';
import db from '../db/database';
import { validate } from '../middleware/validate';
import { requireAdmin } from '../middleware/auth';

const router = Router({ mergeParams: true });

const BugCreateSchema = z.object({
  project_id:  z.number().int().positive(),
  title:       z.string().min(1),
  description: z.string().optional().default(''),
  priority:    z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  severity:    z.enum(['minor', 'major', 'critical', 'blocker']).optional().default('major'),
  reporter_id: z.number().int().positive(),
  assignee_id: z.number().int().positive().nullable().optional(),
});

const BugUpdateSchema = z.object({
  title:       z.string().min(1).optional(),
  description: z.string().optional(),
  status:      z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority:    z.enum(['low', 'medium', 'high', 'critical']).optional(),
  severity:    z.enum(['minor', 'major', 'critical', 'blocker']).optional(),
  assignee_id: z.number().int().positive().nullable().optional(),
});

// GET /bugs  or  GET /projects/:id/bugs
router.get('/', (req: Request, res) => {
  const { status, priority, severity, project_id, assignee_id } = req.query as Record<string, string | undefined>;

  // When mounted under /projects/:id, mergeParams makes req.params.id available
  const projectIdParam = (req.params as { id?: string }).id;
  const effectiveProjectId = projectIdParam ?? project_id;

  const conditions: string[] = [];
  const values: unknown[] = [];

  if (effectiveProjectId) { conditions.push('project_id = ?');  values.push(effectiveProjectId); }
  if (status)              { conditions.push('status = ?');      values.push(status); }
  if (priority)            { conditions.push('priority = ?');    values.push(priority); }
  if (severity)            { conditions.push('severity = ?');    values.push(severity); }
  if (assignee_id)         { conditions.push('assignee_id = ?'); values.push(assignee_id); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const bugs = db.prepare(`SELECT * FROM bugs ${where} ORDER BY id`).all(...values);
  res.json(bugs);
});

// GET /bugs/:id
router.get('/:id', (req, res) => {
  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
  if (!bug) {
    res.status(404).json({ error: 'Bug not found' });
    return;
  }
  res.json(bug);
});

// POST /bugs
router.post('/', validate(BugCreateSchema), (req, res) => {
  const { project_id, title, description, priority, severity, reporter_id, assignee_id } =
    req.body as z.infer<typeof BugCreateSchema>;

  const info = db.prepare(`
    INSERT INTO bugs (project_id, title, description, priority, severity, reporter_id, assignee_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(project_id, title, description, priority, severity, reporter_id, assignee_id ?? null);

  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(bug);
});

// PUT /bugs/:id
router.put('/:id', validate(BugUpdateSchema), (req, res) => {
  const updates = req.body as z.infer<typeof BugUpdateSchema>;
  const existing = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Bug not found' });
    return;
  }
  const merged = { ...existing, ...updates };
  db.prepare(`
    UPDATE bugs
    SET title = ?, description = ?, status = ?, priority = ?, severity = ?,
        assignee_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    merged.title, merged.description, merged.status,
    merged.priority, merged.severity, merged.assignee_id,
    req.params.id,
  );
  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id);
  res.json(bug);
});

// DELETE /bugs/:id
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM bugs WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
