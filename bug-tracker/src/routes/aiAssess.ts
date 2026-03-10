import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import db from '../db/database';
import { requireAdmin } from '../middleware/auth';

const router = Router({ mergeParams: true });
const MODEL = 'claude-haiku-4-5-20251001';

const client = new Anthropic({ apiKey: process.env.ANTROPIC_API_KEY });

// POST /bugs/:id/ai-assess
router.post('/', requireAdmin, async (req, res) => {
  const bugId = Number(req.params.id);
  const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(bugId) as Record<string, unknown> | undefined;
  if (!bug) { res.status(404).json({ error: 'Item not found' }); return; }

  const comments = db.prepare('SELECT content FROM comments WHERE bug_id = ?').all(bugId) as { content: string }[];
  const links = db.prepare(`
    SELECT b.id, b.title, b.priority, b.severity
    FROM item_links il
    JOIN bugs b ON b.id = CASE WHEN il.bug_id = ? THEN il.linked_bug_id ELSE il.bug_id END
    WHERE il.bug_id = ? OR il.linked_bug_id = ?
  `).all(bugId, bugId, bugId) as Record<string, unknown>[];

  const prompt = `You are a software risk assessment expert. Analyze the following bug tracker item and provide a concise risk assessment.

Item: #${bug.id} — ${bug.title}
Type: ${bug.type}
Current Priority: ${bug.priority}
Current Severity: ${bug.severity}
Status: ${bug.status}
Description: ${bug.description || '(none)'}${comments.length > 0 ? `\nComments:\n${comments.map((c) => `- ${c.content}`).join('\n')}` : ''}${links.length > 0 ? `\nLinked items:\n${links.map((l) => `- #${l.id} ${l.title} (${l.priority} priority, ${l.severity} severity)`).join('\n')}` : ''}

Respond with a JSON object only, no markdown, no extra text:
{"explanation":"<2-4 sentences>","suggested_priority":"<low|medium|high|critical>","suggested_severity":"<minor|major|critical|blocker>"}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    let text = (response.content[0] as { type: string; text: string }).text.trim();
    // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(text) as { explanation: string; suggested_priority: string; suggested_severity: string };
    const tokensIn = response.usage.input_tokens;
    const tokensOut = response.usage.output_tokens;

    db.prepare(`
      UPDATE bugs
      SET ai_explanation = ?, ai_suggested_priority = ?, ai_suggested_severity = ?,
          ai_assessed_at = datetime('now'), ai_tokens_in = ?, ai_tokens_out = ?
      WHERE id = ?
    `).run(parsed.explanation, parsed.suggested_priority, parsed.suggested_severity, tokensIn, tokensOut, bugId);

    db.prepare(`
      INSERT INTO ai_usage_log (bug_id, model, tokens_in, tokens_out) VALUES (?, ?, ?, ?)
    `).run(bugId, MODEL, tokensIn, tokensOut);

    const updated = db.prepare('SELECT * FROM bugs WHERE id = ?').get(bugId);
    res.json(updated);
  } catch (err) {
    console.error('[ai-assess]', err);
    const message = err instanceof Error ? err.message : 'AI assessment failed';
    res.status(500).json({ error: message });
  }
});

// GET /bugs/:id/ai-assess/history
router.get('/history', requireAdmin, (req, res) => {
  const bugId = Number(req.params.id);
  const rows = db.prepare('SELECT * FROM ai_usage_log WHERE bug_id = ? ORDER BY created_at DESC').all(bugId);
  res.json(rows);
});

export default router;
