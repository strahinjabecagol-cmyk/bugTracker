import { Router } from 'express';
import { z } from 'zod';
import db from '../db/database';
import { validate } from '../middleware/validate';

const router = Router({ mergeParams: true });

const CommentCreateSchema = z.object({
  user_id: z.number().int().positive(),
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
  `).all(req.params.id);
  res.json(comments);
});

// POST /bugs/:id/comments
router.post('/', validate(CommentCreateSchema), (req, res) => {
  const { user_id, content } = req.body as z.infer<typeof CommentCreateSchema>;
  const info = db.prepare(
    'INSERT INTO comments (bug_id, user_id, content) VALUES (?, ?, ?)'
  ).run(req.params.id, user_id, content);

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
  router2.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
    res.status(204).send();
  });
};

export default router;
