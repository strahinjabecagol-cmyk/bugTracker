import { Router } from 'express';
import { z } from 'zod';
import db from '../db/database';
import { validate } from '../middleware/validate';
import { requireProjectMember } from '../middleware/auth';

const router = Router({ mergeParams: true });

const LinkCreateSchema = z.object({
  linked_bug_id: z.number().int().positive(),
});

// GET /bugs/:id/links
router.get('/', (req, res) => {
  const id = Number(req.params.id);
  const links = db.prepare(`
    SELECT il.id, b.id AS bug_id, b.title, b.status, b.type, b.priority
    FROM item_links il
    JOIN bugs b ON b.id = il.linked_bug_id
    WHERE il.bug_id = ?
    UNION
    SELECT il.id, b.id AS bug_id, b.title, b.status, b.type, b.priority
    FROM item_links il
    JOIN bugs b ON b.id = il.bug_id
    WHERE il.linked_bug_id = ?
    ORDER BY il.id
  `).all(id, id);
  res.json(links);
});

// POST /bugs/:id/links
router.post('/', validate(LinkCreateSchema), requireProjectMember, (req, res) => {
  const id = Number(req.params.id);
  const { linked_bug_id } = req.body as z.infer<typeof LinkCreateSchema>;

  if (id === linked_bug_id) {
    res.status(400).json({ error: 'Cannot link an item to itself' });
    return;
  }

  // Normalize: smaller id is always bug_id
  const [a, b] = id < linked_bug_id ? [id, linked_bug_id] : [linked_bug_id, id];

  try {
    db.prepare('INSERT INTO item_links (bug_id, linked_bug_id) VALUES (?, ?)').run(a, b);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE')) {
      res.status(409).json({ error: 'Link already exists' });
      return;
    }
    throw e;
  }

  // Return all links for the requested bug
  const links = db.prepare(`
    SELECT il.id, b2.id AS bug_id, b2.title, b2.status, b2.type, b2.priority
    FROM item_links il
    JOIN bugs b2 ON b2.id = il.linked_bug_id
    WHERE il.bug_id = ?
    UNION
    SELECT il.id, b2.id AS bug_id, b2.title, b2.status, b2.type, b2.priority
    FROM item_links il
    JOIN bugs b2 ON b2.id = il.bug_id
    WHERE il.linked_bug_id = ?
    ORDER BY il.id
  `).all(id, id);
  res.status(201).json(links);
});

// DELETE /bugs/:id/links/:linked_id
router.delete('/:linked_id', requireProjectMember, (req, res) => {
  const id = Number(req.params.id);
  const linked_id = Number(req.params.linked_id);
  db.prepare(`
    DELETE FROM item_links
    WHERE (bug_id = ? AND linked_bug_id = ?)
       OR (bug_id = ? AND linked_bug_id = ?)
  `).run(id, linked_id, linked_id, id);
  res.status(204).send();
});

export default router;
