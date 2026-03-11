import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import db from '../db/database';
import { requireAdmin } from '../middleware/auth';
import { broadcast } from '../ws';

const router = Router();
const MODEL = 'claude-haiku-4-5-20251001';

const client = new Anthropic({ apiKey: process.env.ANTROPIC_API_KEY });

interface BugRow {
  id: number;
  title: string;
  type: string;
  description: string;
  priority: string;
  severity: string;
  link_count: number;
  comment_count: number;
}

interface PortfolioResult {
  bug_id: number;
  rank: number;
  suggested_priority: string;
  suggested_severity: string;
  rationale: string;
}

// POST /ai-portfolio-assess — admin only
router.post('/', requireAdmin, async (_req, res) => {
  const items = db.prepare(`
    SELECT
      b.id, b.title, b.type, b.description, b.priority, b.severity,
      (SELECT COUNT(*) FROM item_links il WHERE il.bug_id = b.id OR il.linked_bug_id = b.id) AS link_count,
      (SELECT COUNT(*) FROM comments c WHERE c.bug_id = b.id) AS comment_count
    FROM bugs b
    WHERE b.status IN ('open', 'in_progress')
    ORDER BY b.id
  `).all() as BugRow[];

  if (items.length === 0) {
    res.json({ run: null, results: [], message: 'No open or in-progress items to assess.' });
    return;
  }

  const itemList = items.map(i =>
    `#${i.id} [${i.type}] "${i.title}" | priority: ${i.priority} | severity: ${i.severity} | links: ${i.link_count} | comments: ${i.comment_count}\nDescription: ${i.description?.slice(0, 300) || '(none)'}`
  ).join('\n\n');

  const prompt = `You are a software risk assessment expert. You will rank ${items.length} open/in-progress items by risk relative to each other.

ITEMS:
${itemList}

INSTRUCTIONS:
- Rank all items from 1 (highest risk) to ${items.length} (lowest risk). No ties.
- Assign suggested_priority (critical/high/medium/low) and suggested_severity (blocker/critical/major/minor).
- FORCED GRADATION RULE: No more than 30% of items may share the same suggested_priority tier. You MUST spread the distribution across all four priority levels (critical, high, medium, low).
- Write a one-sentence rationale explaining the ranking.
- Consider: complexity, links to other items, description quality, comment activity, type (bug vs task).

Respond with a JSON array only — no markdown fences, no extra text:
[{"bug_id":N,"rank":N,"suggested_priority":"...","suggested_severity":"...","rationale":"one sentence"}]`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    let text = (response.content[0] as { type: string; text: string }).text.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(text) as PortfolioResult[];

    const tokensIn = response.usage.input_tokens;
    const tokensOut = response.usage.output_tokens;

    // Insert run log
    const runResult = db.prepare(`
      INSERT INTO ai_portfolio_log (model, tokens_in, tokens_out, item_count)
      VALUES (?, ?, ?, ?)
    `).run(MODEL, tokensIn, tokensOut, items.length);

    const runId = runResult.lastInsertRowid as number;

    // Insert per-item results
    const insertResult = db.prepare(`
      INSERT INTO ai_portfolio_results (run_id, bug_id, rank, suggested_priority, suggested_severity, rationale)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const r of parsed) {
      insertResult.run(runId, r.bug_id, r.rank, r.suggested_priority, r.suggested_severity, r.rationale);
    }

    // Return run + joined results
    const run = db.prepare('SELECT * FROM ai_portfolio_log WHERE id = ?').get(runId);
    const results = db.prepare(`
      SELECT apr.*, b.title AS bug_title, b.status AS bug_status,
             b.priority AS current_priority, b.severity AS current_severity
      FROM ai_portfolio_results apr
      JOIN bugs b ON b.id = apr.bug_id
      WHERE apr.run_id = ?
      ORDER BY apr.rank
    `).all(runId);

    res.json({ run, results });
  } catch (err) {
    console.error('[ai-portfolio-assess]', err);
    const message = err instanceof Error ? err.message : 'AI portfolio assessment failed';
    res.status(500).json({ error: message });
  }
});

// GET /ai-portfolio-assess/latest — all authenticated users
router.get('/latest', (_req, res) => {
  const run = db.prepare(`
    SELECT * FROM ai_portfolio_log ORDER BY run_at DESC LIMIT 1
  `).get() as { id: number } | undefined;

  if (!run) {
    res.json({ run: null, results: [] });
    return;
  }

  const results = db.prepare(`
    SELECT apr.*, b.title AS bug_title, b.status AS bug_status,
           b.priority AS current_priority, b.severity AS current_severity
    FROM ai_portfolio_results apr
    JOIN bugs b ON b.id = apr.bug_id
    WHERE apr.run_id = ?
    ORDER BY apr.rank
  `).all(run.id);

  res.json({ run, results });
});

// POST /ai-portfolio-assess/apply — admin only
// Body: { bug_ids?: number[] } — omit to apply all from latest run
router.post('/apply', requireAdmin, (req, res) => {
  const run = db.prepare(`
    SELECT * FROM ai_portfolio_log ORDER BY run_at DESC LIMIT 1
  `).get() as { id: number } | undefined;

  if (!run) {
    res.status(404).json({ error: 'No portfolio assessment run found.' });
    return;
  }

  const results = db.prepare(`
    SELECT apr.bug_id, apr.suggested_priority, apr.suggested_severity
    FROM ai_portfolio_results apr
    WHERE apr.run_id = ?
  `).all(run.id) as { bug_id: number; suggested_priority: string; suggested_severity: string }[];

  const bugIds: number[] | undefined = req.body?.bug_ids;
  const toApply = bugIds && bugIds.length > 0
    ? results.filter((r) => bugIds.includes(r.bug_id))
    : results;

  const updateStmt = db.prepare(`
    UPDATE bugs SET priority = ?, severity = ?, updated_at = datetime('now') WHERE id = ?
  `);

  const updatedIds: number[] = [];
  for (const r of toApply) {
    updateStmt.run(r.suggested_priority, r.suggested_severity, r.bug_id);
    updatedIds.push(r.bug_id);
    const updated = db.prepare('SELECT * FROM bugs WHERE id = ?').get(r.bug_id);
    if (updated) broadcast({ type: 'bug_updated', bug: updated });
  }

  res.json({ applied: updatedIds });
});

export default router;
