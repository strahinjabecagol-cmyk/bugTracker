import 'dotenv/config';
import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { initWss } from './ws';
import usersRouter    from './routes/users';
import projectsRouter from './routes/projects';
import bugsRouter     from './routes/bugs';
import commentsRouter, { deleteComment } from './routes/comments';
import authRouter from './routes/auth';
import { requireAuth } from './middleware/auth';
import { broadcast } from './ws';
import { startPoller, syncCommits } from './gitlab/poller';
import db from './db/database';

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(cookieParser());

// Auth routes — public (no token required)
app.use('/auth', authRouter);

// Internal broadcast endpoint — called by the MCP server to push WS events
app.post('/internal/broadcast', (req, res) => {
  console.log('[broadcast] received:', req.body);
  broadcast(req.body);
  res.status(204).send();
});

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

// GET /bugs/:id/commits
app.get('/bugs/:id/commits', (req, res) => {
  const commits = db.prepare('SELECT * FROM bug_commits WHERE bug_id = ? ORDER BY committed_at DESC').all(req.params.id);
  res.json(commits);
});

// POST /gitlab/sync — manual sync trigger
app.post('/gitlab/sync', (_req, res) => {
  syncCommits().catch(console.error);
  res.json({ ok: true });
});

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
const server = http.createServer(app);
initWss(server);
server.listen(PORT, () => {
  console.log(`Bug Tracker API running on http://localhost:${PORT}`);
  startPoller();
});

export default app;
