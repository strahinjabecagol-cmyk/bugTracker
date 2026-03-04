import { Router, Request } from 'express';
import { z } from 'zod';
import db from '../db/database';
import { validate } from '../middleware/validate';
import { requireAdmin } from '../middleware/auth';
import { broadcast } from '../ws';

const router = Router({ mergeParams: true });

const BugCreateSchema = z.object({
  project_id:  z.number().int().positive(),
  title:       z.string().min(1),
  description: z.string().optional().default(''),
  type:        z.enum(['bug', 'task']).optional().default('bug'),
  priority:    z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  severity:    z.enum(['minor', 'major', 'critical', 'blocker']).optional().default('major'),
  reporter_id: z.number().int().positive(),
  assignee_id: z.number().int().positive().nullable().optional(),
  images:      z.array(z.string()).optional(),
});

const BugUpdateSchema = z.object({
  title:       z.string().min(1).optional(),
  description: z.string().optional(),
  type:        z.enum(['bug', 'task']).optional(),
  status:      z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority:    z.enum(['low', 'medium', 'high', 'critical']).optional(),
  severity:    z.enum(['minor', 'major', 'critical', 'blocker']).optional(),
  assignee_id: z.number().int().positive().nullable().optional(),
  images:      z.array(z.string()).optional(),
});

function getImages(bugId: number) {
  return db.prepare('SELECT * FROM bug_images WHERE bug_id = ? ORDER BY id').all(bugId);
}

// GET /bugs  or  GET /projects/:id/bugs
router.get('/', (req: Request, res) => {
  const { status, priority, severity, project_id, assignee_id, type } = req.query as Record<string, string | undefined>;

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
  if (type)                { conditions.push('type = ?');        values.push(type); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const bugs = db.prepare(`SELECT * FROM bugs ${where} ORDER BY id`).all(...values);
  const result = (bugs as Record<string, unknown>[]).map((b) => ({
    ...b,
    images: getImages(b.id as number),
  }));
  res.json(result);
});

// GET /bugs/:id
router.get('/:id', (req, res) => {
  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!bug) {
    res.status(404).json({ error: 'Bug not found' });
    return;
  }
  res.json({ ...bug, images: getImages(bug.id as number) });
});

// POST /bugs
router.post('/', validate(BugCreateSchema), (req, res) => {
  const { project_id, title, description, type, priority, severity, reporter_id, assignee_id, images } =
    req.body as z.infer<typeof BugCreateSchema>;

  const info = db.prepare(`
    INSERT INTO bugs (project_id, title, description, type, priority, severity, reporter_id, assignee_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(project_id, title, description, type, priority, severity, reporter_id, assignee_id ?? null);

  const newId = info.lastInsertRowid as number;
  if (images?.length) {
    const insertImg = db.prepare('INSERT INTO bug_images (bug_id, data_url) VALUES (?, ?)');
    for (const url of images) insertImg.run(newId, url);
  }

  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(newId) as Record<string, unknown>;
  broadcast({ type: 'bug_created', bug });
  res.status(201).json({ ...bug, images: getImages(newId) });
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
    SET title = ?, description = ?, type = ?, status = ?, priority = ?, severity = ?,
        assignee_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    merged.title, merged.description, merged.type, merged.status,
    merged.priority, merged.severity, merged.assignee_id,
    req.params.id,
  );

  if (updates.images !== undefined) {
    const bugId = Number(req.params.id);
    db.prepare('DELETE FROM bug_images WHERE bug_id = ?').run(bugId);
    if (updates.images.length) {
      const insertImg = db.prepare('INSERT INTO bug_images (bug_id, data_url) VALUES (?, ?)');
      for (const url of updates.images) insertImg.run(bugId, url);
    }
  }

  const bugId = Number(req.params.id);
  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(bugId) as Record<string, unknown>;
  broadcast({ type: 'bug_updated', bug });
  res.json({ ...bug, images: getImages(bugId) });
});

// DELETE /bugs/:id
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM bugs WHERE id = ?').run(req.params.id);
  broadcast({ type: 'bug_deleted', id: Number(req.params.id) });
  res.status(204).send();
});

export default router;
