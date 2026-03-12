import { Router, Request, Response } from 'express';
import { z } from 'zod';
import db from '../db/database';
import { validate } from '../middleware/validate';
import { requireAdmin } from '../middleware/auth';

const router = Router({ mergeParams: true });

const BindSchema = z.object({
  profile_id: z.number().int().positive(),
});

type Binding = { project_id: number; profile_id: number; name: string; platform: string; base_url: string; repo: string };
type P = { id: string };

// GET /projects/:id/integration — returns current binding or null
router.get('/', (req: Request<P>, res: Response) => {
  const binding = db.prepare(`
    SELECT pi.project_id, pi.profile_id, ip.name, ip.platform, ip.base_url, ip.repo
    FROM project_integrations pi
    JOIN integration_profiles ip ON ip.id = pi.profile_id
    WHERE pi.project_id = ?
  `).get(req.params['id']) as Binding | undefined;
  res.json(binding ?? null);
});

// PUT /projects/:id/integration — set or replace binding (admin only)
router.put('/', requireAdmin, validate(BindSchema), (req: Request<P>, res: Response) => {
  const projectId = Number(req.params['id']);
  const { profile_id } = req.body as z.infer<typeof BindSchema>;

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const profile = db.prepare('SELECT id FROM integration_profiles WHERE id = ?').get(profile_id);
  if (!profile) { res.status(404).json({ error: 'Integration profile not found' }); return; }

  db.prepare(`
    INSERT INTO project_integrations (project_id, profile_id)
    VALUES (?, ?)
    ON CONFLICT(project_id) DO UPDATE SET profile_id = excluded.profile_id
  `).run(projectId, profile_id);

  const binding = db.prepare(`
    SELECT pi.project_id, pi.profile_id, ip.name, ip.platform, ip.base_url, ip.repo
    FROM project_integrations pi
    JOIN integration_profiles ip ON ip.id = pi.profile_id
    WHERE pi.project_id = ?
  `).get(projectId) as Binding;
  res.json(binding);
});

// DELETE /projects/:id/integration — remove binding (admin only)
router.delete('/', requireAdmin, (req: Request<P>, res: Response) => {
  const projectId = Number(req.params['id']);
  const existing = db.prepare('SELECT project_id FROM project_integrations WHERE project_id = ?').get(projectId);
  if (!existing) { res.status(404).json({ error: 'No integration binding found for this project' }); return; }

  db.prepare('DELETE FROM project_integrations WHERE project_id = ?').run(projectId);
  res.status(204).send();
});

export default router;
