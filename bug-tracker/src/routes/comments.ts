import { Router } from 'express';
import { z } from 'zod';
import db from '../db/database';
import { validate } from '../middleware/validate';
import { requireAdmin } from '../middleware/auth';

const router = Router({ mergeParams: true });

const CommentCreateSchema = z.object({
  content: z.string().min(1),
});

// GET /bugs/:id/comments
router.get('/', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.name AS author_name
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.bug_id = ?
    ORDER BY c.id
  `).all((req.params as { id: string }).id);
  res.json(comments);
});

// POST /bugs/:id/comments
router.post('/', validate(CommentCreateSchema), (req, res) => {
  const bugId = (req.params as { id: string }).id;
  const bug = db.prepare('SELECT id FROM bugs WHERE id = ?').get(bugId);
  if (!bug) {
    res.status(404).json({ error: 'Bug not found' });
    return;
  }
  const { content } = req.body as z.infer<typeof CommentCreateSchema>;
  const user_id = req.user!.id;
  const info = db.prepare(
    'INSERT INTO comments (bug_id, user_id, content) VALUES (?, ?, ?)'
  ).run(bugId, user_id, content);

  const comment = db.prepare(`
    SELECT c.*, u.name AS author_name
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `).get(info.lastInsertRowid);
  res.status(201).json(comment);
});

// DELETE /comments/:id  (mounted separately in app.ts)
export const deleteComment = (router2: Router) => {
  router2.delete('/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
    res.status(204).send();
  });
};

export default router;
