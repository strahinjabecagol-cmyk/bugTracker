import 'dotenv/config';
import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { initWss } from './ws';
import usersRouter    from './routes/users';
import projectsRouter from './routes/projects';
import bugsRouter     from './routes/bugs';
import commentsRouter, { deleteComment } from './routes/comments';
import linksRouter from './routes/links';
import projectMembersRouter from './routes/projectMembers';
import aiAssessRouter from './routes/aiAssess';
import aiPortfolioAssessRouter from './routes/aiPortfolioAssess';
import integrationsRouter from './routes/integrations';
import projectIntegrationRouter from './routes/projectIntegration';
import authRouter from './routes/auth';
import { requireAuth, requireAdmin } from './middleware/auth';
import { broadcast } from './ws';
import { startPoller, syncCommits, syncCommitsForProject } from './gitlab/poller';
import db from './db/database';

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(cookieParser());

// Auth routes — public (no token required)
app.use('/auth', authRouter);

// Internal broadcast endpoint — called by the MCP server to push WS events
// Protected by INTERNAL_SECRET header (must come before requireAuth)
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? 'dev-internal-secret';
app.post('/internal/broadcast', (req, res) => {
  if (req.headers['x-internal-secret'] !== INTERNAL_SECRET) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
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

// Nested: GET/POST/DELETE /bugs/:id/links
app.use('/bugs/:id/links', linksRouter);

// Nested: POST /bugs/:id/ai-assess  GET /bugs/:id/ai-assess/history
app.use('/bugs/:id/ai-assess', aiAssessRouter);

// Portfolio AI assessment
app.use('/ai-portfolio-assess', aiPortfolioAssessRouter);

// Integration profiles
app.use('/integrations', integrationsRouter);

// Per-project integration binding
app.use('/projects/:id/integration', projectIntegrationRouter);

// Nested: GET /projects/:id/bugs
app.use('/projects/:id/bugs', bugsRouter);

// Nested: GET/POST/DELETE /projects/:id/members
app.use('/projects/:id/members', projectMembersRouter);

// GET /bugs/:id/portfolio-assessment — latest portfolio assessment result for a specific bug
app.get('/bugs/:id/portfolio-assessment', (req, res) => {
  const bugId = Number(req.params.id);
  const result = db.prepare(`
    SELECT apr.*, apl.run_at, apl.model, apl.item_count,
           b.priority AS current_priority, b.severity AS current_severity
    FROM ai_portfolio_results apr
    JOIN ai_portfolio_log apl ON apl.id = apr.run_id
    JOIN bugs b ON b.id = apr.bug_id
    WHERE apr.bug_id = ?
    ORDER BY apl.run_at DESC
    LIMIT 1
  `).get(bugId);
  res.json(result ?? null);
});

// GET /bugs/:id/commits — returns stored commits from DB
app.get('/bugs/:id/commits', (req, res) => {
  const bugId = Number(req.params.id);
  const commits = db.prepare('SELECT * FROM bug_commits WHERE bug_id = ? ORDER BY committed_at DESC').all(bugId);
  res.json(commits);
});

// GET /ai-usage — admin-only global token usage summary
app.get('/ai-usage', requireAdmin, (_req, res) => {
  const totals = db.prepare(`
    SELECT COALESCE(SUM(tokens_in), 0) AS total_tokens_in,
           COALESCE(SUM(tokens_out), 0) AS total_tokens_out,
           COUNT(*) AS total_calls
    FROM ai_usage_log
  `).get() as { total_tokens_in: number; total_tokens_out: number; total_calls: number };

  const log = db.prepare(`
    SELECT l.*, b.title AS bug_title
    FROM ai_usage_log l
    JOIN bugs b ON b.id = l.bug_id
    ORDER BY l.created_at DESC
  `).all();

  const portfolioTotals = db.prepare(`
    SELECT COALESCE(SUM(tokens_in), 0) AS portfolio_total_tokens_in,
           COALESCE(SUM(tokens_out), 0) AS portfolio_total_tokens_out,
           COUNT(*) AS portfolio_total_runs
    FROM ai_portfolio_log
  `).get() as { portfolio_total_tokens_in: number; portfolio_total_tokens_out: number; portfolio_total_runs: number };

  const portfolioLog = db.prepare(`
    SELECT * FROM ai_portfolio_log ORDER BY run_at DESC
  `).all();

  res.json({
    total_tokens_in: totals.total_tokens_in + portfolioTotals.portfolio_total_tokens_in,
    total_tokens_out: totals.total_tokens_out + portfolioTotals.portfolio_total_tokens_out,
    total_calls: totals.total_calls,
    log,
    ...portfolioTotals,
    portfolio_log: portfolioLog,
  });
});

// POST /gitlab/sync — manual sync trigger
app.post('/gitlab/sync', async (_req, res) => {
  await syncCommits();
  res.json({ ok: true });
});

// POST /bugs/:id/sync — sync only the project bound to this bug
app.post('/bugs/:id/sync', async (req, res) => {
  const bugId = Number(req.params.id);
  const bug = db.prepare('SELECT project_id FROM bugs WHERE id = ?').get(bugId) as { project_id: number } | undefined;
  if (!bug) { res.status(404).json({ error: 'Bug not found' }); return; }
  await syncCommitsForProject(bug.project_id);
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

const PORT = process.env.APP_PORT ?? 3000;
const server = http.createServer(app);
initWss(server);
server.listen(PORT, () => {
  console.log(`Bug Tracker API running on http://localhost:${PORT}`);
  startPoller();
});

export default app;
