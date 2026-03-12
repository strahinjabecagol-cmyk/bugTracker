import { Router } from 'express';
import { z } from 'zod';
import db from '../db/database';
import { validate } from '../middleware/validate';
import { requireAdmin } from '../middleware/auth';

const router = Router();

const PLATFORM = z.enum(['github', 'gitlab', 'bitbucket']);

const IntegrationCreateSchema = z.object({
  name:         z.string().min(1),
  platform:     PLATFORM,
  base_url:     z.string().optional().default(''),
  repo:         z.string().min(1),
  access_token: z.string().min(1),
}).superRefine((val, ctx) => {
  if (val.platform === 'gitlab' && !val.base_url) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['base_url'], message: 'base_url is required for GitLab' });
  }
});

const IntegrationUpdateSchema = z.object({
  name:         z.string().min(1).optional(),
  platform:     PLATFORM.optional(),
  base_url:     z.string().optional(),
  repo:         z.string().min(1).optional(),
  access_token: z.string().min(1).optional(),
});

type Profile = { id: number; name: string; platform: string; base_url: string; repo: string; access_token: string; created_at: string; updated_at: string };

function strip(profile: Profile) {
  const { access_token: _, ...safe } = profile;
  return safe;
}

// GET /integrations — all authenticated users
router.get('/', (_req, res) => {
  const profiles = db.prepare('SELECT * FROM integration_profiles ORDER BY id').all() as Profile[];
  res.json(profiles.map(strip));
});

// GET /integrations/:id
router.get('/:id', (req, res) => {
  const profile = db.prepare('SELECT * FROM integration_profiles WHERE id = ?').get(req.params.id) as Profile | undefined;
  if (!profile) { res.status(404).json({ error: 'Integration profile not found' }); return; }
  res.json(strip(profile));
});

// POST /integrations — admin only
router.post('/', requireAdmin, validate(IntegrationCreateSchema), (req, res) => {
  const { name, platform, base_url, repo, access_token } = req.body as z.infer<typeof IntegrationCreateSchema>;
  const info = db.prepare(`
    INSERT INTO integration_profiles (name, platform, base_url, repo, access_token)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, platform, base_url, repo, access_token);
  const profile = db.prepare('SELECT * FROM integration_profiles WHERE id = ?').get(info.lastInsertRowid) as Profile;
  res.status(201).json(strip(profile));
});

// PATCH /integrations/:id — admin only
router.patch('/:id', requireAdmin, validate(IntegrationUpdateSchema), (req, res) => {
  const existing = db.prepare('SELECT * FROM integration_profiles WHERE id = ?').get(req.params.id) as Profile | undefined;
  if (!existing) { res.status(404).json({ error: 'Integration profile not found' }); return; }

  const updates = req.body as z.infer<typeof IntegrationUpdateSchema>;
  const merged = { ...existing, ...updates };

  if (merged.platform === 'gitlab' && !merged.base_url) {
    res.status(400).json({ error: 'base_url is required for GitLab' });
    return;
  }

  db.prepare(`
    UPDATE integration_profiles
    SET name = ?, platform = ?, base_url = ?, repo = ?,
        access_token = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(merged.name, merged.platform, merged.base_url, merged.repo, merged.access_token, req.params.id);

  const profile = db.prepare('SELECT * FROM integration_profiles WHERE id = ?').get(req.params.id) as Profile;
  res.json(strip(profile));
});

// DELETE /integrations/:id — admin only, blocked if profile is in use
router.delete('/:id', requireAdmin, (req, res) => {
  const profile = db.prepare('SELECT * FROM integration_profiles WHERE id = ?').get(req.params.id) as Profile | undefined;
  if (!profile) { res.status(404).json({ error: 'Integration profile not found' }); return; }

  const boundProjects = db.prepare(`
    SELECT p.id, p.name FROM project_integrations pi
    JOIN projects p ON p.id = pi.project_id
    WHERE pi.profile_id = ?
  `).all(req.params.id) as { id: number; name: string }[];

  if (boundProjects.length > 0) {
    res.status(409).json({ error: 'Profile is in use', projects: boundProjects });
    return;
  }

  db.prepare('DELETE FROM integration_profiles WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
