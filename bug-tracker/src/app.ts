import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import usersRouter    from './routes/users';
import projectsRouter from './routes/projects';
import bugsRouter     from './routes/bugs';
import commentsRouter, { deleteComment } from './routes/comments';
import authRouter from './routes/auth';
import { requireAuth } from './middleware/auth';

const app = express();
app.use(express.json());
app.use(cookieParser());

// Auth routes — public (no token required)
app.use('/auth', authRouter);

// All routes below this line require a valid JWT
app.use(requireAuth);

// Core routes
app.use('/users',    usersRouter);
app.use('/projects', projectsRouter);
app.use('/bugs',     bugsRouter);

// Nested: GET/POST /bugs/:id/comments
app.use('/bugs/:id/comments', commentsRouter);

// Nested: GET /projects/:id/bugs
app.use('/projects/:id/bugs', bugsRouter);

// DELETE /comments/:id
const commentDeleteRouter = express.Router();
deleteComment(commentDeleteRouter);
app.use('/comments', commentDeleteRouter);

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`Bug Tracker API running on http://localhost:${PORT}`);
});

export default app;
