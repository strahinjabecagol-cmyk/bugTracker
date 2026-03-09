import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import db from '../db/database';

const API = 'http://localhost:3000';
async function wsBroadcast(msg: unknown) {
  try {
    const res = await fetch(`${API}/internal/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });
    console.error('[wsBroadcast] status:', res.status);
  } catch (e) {
    console.error('[wsBroadcast] fetch error:', e);
  }
}

// ── Tool definitions ──────────────────────────────────────────────────────────

const tools = [
  {
    name: 'get_items',
    description: 'List items (bugs and tasks) with optional filters. Always pass project_id to scope results to a single project — required for risk assessment workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        status:     { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] },
        type:       { type: 'string', enum: ['bug', 'task'] },
        priority:   { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        severity:   { type: 'string', enum: ['minor', 'major', 'critical', 'blocker'] },
        project_id: { type: 'number' },
        assignee_id:{ type: 'number' },
      },
    },
  },
  {
    name: 'get_item',
    description: 'Get a single item (bug or task) by id.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
  {
    name: 'create_item',
    description: 'Create a new item. type is required — use "task" for tasks, "bug" for bugs.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id:  { type: 'number' },
        title:       { type: 'string' },
        description: { type: 'string' },
        type:        { type: 'string', enum: ['bug', 'task'] },
        priority:    { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        severity:    { type: 'string', enum: ['minor', 'major', 'critical', 'blocker'] },
        reporter_id: { type: 'number' },
        assignee_id: { type: 'number' },
      },
      required: ['project_id', 'title', 'reporter_id', 'type'],
    },
  },
  {
    name: 'update_item',
    description: 'Update an item (bug or task) by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id:          { type: 'number' },
        title:       { type: 'string' },
        description: { type: 'string' },
        type:        { type: 'string', enum: ['bug', 'task'] },
        status:      { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] },
        priority:    { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        severity:    { type: 'string', enum: ['minor', 'major', 'critical', 'blocker'] },
        assignee_id: { type: 'number' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_item',
    description: 'Delete an item (bug or task) by id.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
  {
    name: 'get_projects',
    description: 'List all projects.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_project',
    description: 'Create a new project.',
    inputSchema: {
      type: 'object',
      properties: {
        name:        { type: 'string' },
        description: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_project',
    description: 'Update a project by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id:          { type: 'number' },
        name:        { type: 'string' },
        description: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_project',
    description: 'Delete a project by id.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
  {
    name: 'get_users',
    description: 'List all users.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_user',
    description: 'Create a new user.',
    inputSchema: {
      type: 'object',
      properties: {
        name:  { type: 'string' },
        email: { type: 'string' },
        role:  { type: 'string', enum: ['admin', 'developer', 'tester'] },
      },
      required: ['name', 'email', 'role'],
    },
  },
  {
    name: 'update_user',
    description: 'Update a user by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id:    { type: 'number' },
        name:  { type: 'string' },
        email: { type: 'string' },
        role:  { type: 'string', enum: ['admin', 'developer', 'tester'] },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_user',
    description: 'Delete a user by id.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
  {
    name: 'get_item_links',
    description: 'Get all items linked to a given item (bidirectional).',
    inputSchema: {
      type: 'object',
      properties: { item_id: { type: 'number' } },
      required: ['item_id'],
    },
  },
  {
    name: 'link_items',
    description: 'Create a bidirectional link between two items.',
    inputSchema: {
      type: 'object',
      properties: {
        item_id:        { type: 'number' },
        linked_item_id: { type: 'number' },
      },
      required: ['item_id', 'linked_item_id'],
    },
  },
  {
    name: 'unlink_items',
    description: 'Remove a link between two items.',
    inputSchema: {
      type: 'object',
      properties: {
        item_id:        { type: 'number' },
        linked_item_id: { type: 'number' },
      },
      required: ['item_id', 'linked_item_id'],
    },
  },
  {
    name: 'add_comment',
    description: 'Add a comment to a bug.',
    inputSchema: {
      type: 'object',
      properties: {
        bug_id:  { type: 'number' },
        user_id: { type: 'number' },
        content: { type: 'string' },
      },
      required: ['bug_id', 'user_id', 'content'],
    },
  },
  {
    name: 'get_comments',
    description: 'Get all comments for a bug.',
    inputSchema: {
      type: 'object',
      properties: { bug_id: { type: 'number' } },
      required: ['bug_id'],
    },
  },
  {
    name: 'assess_item_risk',
    description: 'Fetch full context for an item to perform an AI risk assessment. Pass project_id to validate the item belongs to that project and scope linked items to the same project. Returns item details, comments, and linked items so the caller can suggest a risk quadrant (critical / monitor / plan / low_risk) with reasoning.',
    inputSchema: {
      type: 'object',
      properties: {
        id:         { type: 'number' },
        project_id: { type: 'number', description: 'Scope the assessment to this project. Returns an error if the item does not belong to it.' },
      },
      required: ['id', 'project_id'],
    },
  },
];

// ── Zod schemas ───────────────────────────────────────────────────────────────

const GetBugsInput = z.object({
  status:      z.string().optional(),
  type:        z.string().optional(),
  priority:    z.string().optional(),
  severity:    z.string().optional(),
  project_id:  z.coerce.number().optional(),
  assignee_id: z.coerce.number().optional(),
});

// ── Factory ───────────────────────────────────────────────────────────────────

export function createServer(): Server {
  const server = new Server(
    { name: 'bug-tracker', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const text = (result: unknown) => ({
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    });

    switch (name) {
      case 'get_items': {
        const input = GetBugsInput.parse(args ?? {});
        const conditions: string[] = [];
        const values: unknown[] = [];
        if (input.project_id)  { conditions.push('project_id = ?');  values.push(input.project_id); }
        if (input.status)      { conditions.push('status = ?');      values.push(input.status); }
        if (input.type)        { conditions.push('type = ?');        values.push(input.type); }
        if (input.priority)    { conditions.push('priority = ?');    values.push(input.priority); }
        if (input.severity)    { conditions.push('severity = ?');    values.push(input.severity); }
        if (input.assignee_id) { conditions.push('assignee_id = ?'); values.push(input.assignee_id); }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const bugs = db.prepare(`SELECT * FROM bugs ${where} ORDER BY id`).all(...values);
        return text(bugs);
      }

      case 'get_item': {
        const { id } = z.object({ id: z.coerce.number() }).parse(args);
        const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(id);
        if (!bug) return text({ error: 'Bug not found' });
        return text(bug);
      }

      case 'create_item': {
        const input = z.object({
          project_id:  z.coerce.number(),
          title:       z.string(),
          description: z.string().optional().default(''),
          type:        z.enum(['bug', 'task']),
          priority:    z.string().optional().default('medium'),
          severity:    z.string().optional().default('major'),
          reporter_id: z.coerce.number(),
          assignee_id: z.coerce.number().optional(),
        }).parse(args);
        const info = db.prepare(`
          INSERT INTO bugs (project_id, title, description, type, priority, severity, reporter_id, assignee_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          input.project_id, input.title, input.description,
          input.type, input.priority, input.severity, input.reporter_id,
          input.assignee_id ?? null,
        );
        const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(info.lastInsertRowid);
        await wsBroadcast({ type: 'bug_created', bug });
        return text(bug);
      }

      case 'update_item': {
        const input = z.object({
          id:          z.coerce.number(),
          title:       z.string().optional(),
          description: z.string().optional(),
          type:        z.enum(['bug', 'task']).optional(),
          status:      z.string().optional(),
          priority:    z.string().optional(),
          severity:    z.string().optional(),
          assignee_id: z.coerce.number().nullable().optional(),
        }).parse(args);
        const existing = db.prepare('SELECT * FROM bugs WHERE id = ?').get(input.id) as Record<string, unknown> | undefined;
        if (!existing) return text({ error: 'Bug not found' });
        const merged = { ...existing, ...input };
        db.prepare(`
          UPDATE bugs
          SET title = ?, description = ?, type = ?, status = ?, priority = ?, severity = ?,
              assignee_id = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(
          merged.title, merged.description, merged.type, merged.status,
          merged.priority, merged.severity, merged.assignee_id,
          input.id,
        );
        const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(input.id);
        await wsBroadcast({ type: 'bug_updated', bug });
        return text(bug);
      }

      case 'delete_item': {
        const { id } = z.object({ id: z.coerce.number() }).parse(args);
        db.prepare('DELETE FROM bugs WHERE id = ?').run(id);
        await wsBroadcast({ type: 'bug_deleted', id });
        return text({ success: true, id });
      }

      case 'get_projects': {
        const projects = db.prepare('SELECT * FROM projects ORDER BY id').all();
        return text(projects);
      }

      case 'create_project': {
        const input = z.object({ name: z.string(), description: z.string().optional().default('') }).parse(args);
        const info = db.prepare('INSERT INTO projects (name, description) VALUES (?, ?)').run(input.name, input.description);
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid);
        return text(project);
      }

      case 'update_project': {
        const input = z.object({
          id:          z.coerce.number(),
          name:        z.string().optional(),
          description: z.string().optional(),
        }).parse(args);
        const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(input.id) as Record<string, unknown> | undefined;
        if (!existing) return text({ error: 'Project not found' });
        const merged = { ...existing, ...input };
        db.prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?')
          .run(merged.name, merged.description, input.id);
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(input.id);
        return text(project);
      }

      case 'delete_project': {
        const { id } = z.object({ id: z.coerce.number() }).parse(args);
        db.prepare('DELETE FROM projects WHERE id = ?').run(id);
        return text({ success: true, id });
      }

      case 'get_users': {
        const users = db.prepare('SELECT * FROM users ORDER BY id').all();
        return text(users);
      }

      case 'create_user': {
        const input = z.object({
          name:  z.string(),
          email: z.string(),
          role:  z.enum(['admin', 'developer', 'tester']),
        }).parse(args);
        const info = db.prepare('INSERT INTO users (name, email, role) VALUES (?, ?, ?)').run(
          input.name, input.email, input.role,
        );
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
        return text(user);
      }

      case 'update_user': {
        const input = z.object({
          id:    z.coerce.number(),
          name:  z.string().optional(),
          email: z.string().optional(),
          role:  z.enum(['admin', 'developer', 'tester']).optional(),
        }).parse(args);
        const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(input.id) as Record<string, unknown> | undefined;
        if (!existing) return text({ error: 'User not found' });
        const merged = { ...existing, ...input };
        db.prepare('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?')
          .run(merged.name, merged.email, merged.role, input.id);
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(input.id);
        return text(user);
      }

      case 'delete_user': {
        const { id } = z.object({ id: z.coerce.number() }).parse(args);
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return text({ success: true, id });
      }

      case 'get_item_links': {
        const { item_id } = z.object({ item_id: z.coerce.number() }).parse(args);
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
        `).all(item_id, item_id);
        return text(links);
      }

      case 'link_items': {
        const input = z.object({ item_id: z.coerce.number(), linked_item_id: z.coerce.number() }).parse(args);
        const { item_id, linked_item_id } = input;
        if (item_id === linked_item_id) return text({ error: 'Cannot link an item to itself' });
        const [a, b] = item_id < linked_item_id ? [item_id, linked_item_id] : [linked_item_id, item_id];
        try {
          db.prepare('INSERT INTO item_links (bug_id, linked_bug_id) VALUES (?, ?)').run(a, b);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes('UNIQUE')) return text({ error: 'Link already exists' });
          throw e;
        }
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
        `).all(item_id, item_id);
        return text(links);
      }

      case 'unlink_items': {
        const { item_id, linked_item_id } = z.object({ item_id: z.coerce.number(), linked_item_id: z.coerce.number() }).parse(args);
        db.prepare(`
          DELETE FROM item_links
          WHERE (bug_id = ? AND linked_bug_id = ?)
             OR (bug_id = ? AND linked_bug_id = ?)
        `).run(item_id, linked_item_id, linked_item_id, item_id);
        return text({ success: true });
      }

      case 'add_comment': {
        const input = z.object({ bug_id: z.coerce.number(), user_id: z.coerce.number(), content: z.string() }).parse(args);
        const info = db.prepare('INSERT INTO comments (bug_id, user_id, content) VALUES (?, ?, ?)').run(
          input.bug_id, input.user_id, input.content,
        );
        const comment = db.prepare(`
          SELECT c.*, u.name AS author_name
          FROM comments c JOIN users u ON u.id = c.user_id
          WHERE c.id = ?
        `).get(info.lastInsertRowid);
        return text(comment);
      }

      case 'get_comments': {
        const { bug_id } = z.object({ bug_id: z.coerce.number() }).parse(args);
        const comments = db.prepare(`
          SELECT c.*, u.name AS author_name
          FROM comments c JOIN users u ON u.id = c.user_id
          WHERE c.bug_id = ? ORDER BY c.id
        `).all(bug_id);
        return text(comments);
      }

      case 'assess_item_risk': {
        const { id, project_id } = z.object({ id: z.coerce.number(), project_id: z.coerce.number() }).parse(args);
        const item = db.prepare('SELECT * FROM bugs WHERE id = ?').get(id) as Record<string, unknown> | undefined;
        if (!item) return text({ error: 'Item not found' });
        if (item.project_id !== project_id) {
          return text({ error: `Item ${id} does not belong to project ${project_id}` });
        }

        const scopeProjectId = project_id;

        const comments = db.prepare(`
          SELECT c.content, u.name AS author
          FROM comments c JOIN users u ON u.id = c.user_id
          WHERE c.bug_id = ? ORDER BY c.id
        `).all(id);

        const links = db.prepare(`
          SELECT b.id, b.title, b.type, b.status, b.priority, b.severity
          FROM item_links il
          JOIN bugs b ON b.id = il.linked_bug_id
          WHERE il.bug_id = ? AND b.project_id = ?
          UNION
          SELECT b.id, b.title, b.type, b.status, b.priority, b.severity
          FROM item_links il
          JOIN bugs b ON b.id = il.bug_id
          WHERE il.linked_bug_id = ? AND b.project_id = ?
        `).all(id, scopeProjectId, id, scopeProjectId);

        return text({
          item,
          comments,
          linked_items: links,
          instructions: 'Analyze this item and return a risk assessment with: quadrant (critical|monitor|plan|low_risk), reasoning (why this quadrant), and optionally suggested_priority and suggested_severity if the current values seem miscalibrated. The quadrant is determined by: critical=high priority+high severity, monitor=high priority+low severity, plan=low priority+high severity, low_risk=low priority+low severity. NOTE: linked_items are already scoped to the same project — do not fetch items from other projects.',
        });
      }

      default:
        return text({ error: `Unknown tool: ${name}` });
    }
  });

  return server;
}
