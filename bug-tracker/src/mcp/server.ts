import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import db from '../db/database';

const server = new Server(
  { name: 'bug-tracker', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ── Tool definitions ──────────────────────────────────────────────────────────

const tools = [
  {
    name: 'get_bugs',
    description: 'List bugs with optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        status:     { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] },
        priority:   { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        severity:   { type: 'string', enum: ['minor', 'major', 'critical', 'blocker'] },
        project_id: { type: 'number' },
        assignee_id:{ type: 'number' },
      },
    },
  },
  {
    name: 'get_bug',
    description: 'Get a single bug by id.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number' } },
      required: ['id'],
    },
  },
  {
    name: 'create_bug',
    description: 'Create a new bug.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id:  { type: 'number' },
        title:       { type: 'string' },
        description: { type: 'string' },
        priority:    { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        severity:    { type: 'string', enum: ['minor', 'major', 'critical', 'blocker'] },
        reporter_id: { type: 'number' },
        assignee_id: { type: 'number' },
      },
      required: ['project_id', 'title', 'reporter_id'],
    },
  },
  {
    name: 'update_bug',
    description: 'Update a bug by id.',
    inputSchema: {
      type: 'object',
      properties: {
        id:          { type: 'number' },
        title:       { type: 'string' },
        description: { type: 'string' },
        status:      { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed'] },
        priority:    { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        severity:    { type: 'string', enum: ['minor', 'major', 'critical', 'blocker'] },
        assignee_id: { type: 'number' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_bug',
    description: 'Delete a bug by id.',
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
];

// ── List tools ────────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

// ── Call tool ────────────────────────────────────────────────────────────────

const GetBugsInput = z.object({
  status:      z.string().optional(),
  priority:    z.string().optional(),
  severity:    z.string().optional(),
  project_id:  z.number().optional(),
  assignee_id: z.number().optional(),
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const text = (result: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
  });

  switch (name) {
    case 'get_bugs': {
      const input = GetBugsInput.parse(args ?? {});
      const conditions: string[] = [];
      const values: unknown[] = [];
      if (input.project_id)  { conditions.push('project_id = ?');  values.push(input.project_id); }
      if (input.status)      { conditions.push('status = ?');      values.push(input.status); }
      if (input.priority)    { conditions.push('priority = ?');    values.push(input.priority); }
      if (input.severity)    { conditions.push('severity = ?');    values.push(input.severity); }
      if (input.assignee_id) { conditions.push('assignee_id = ?'); values.push(input.assignee_id); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const bugs = db.prepare(`SELECT * FROM bugs ${where} ORDER BY id`).all(...values);
      return text(bugs);
    }

    case 'get_bug': {
      const { id } = z.object({ id: z.number() }).parse(args);
      const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(id);
      if (!bug) return text({ error: 'Bug not found' });
      return text(bug);
    }

    case 'create_bug': {
      const input = z.object({
        project_id:  z.number(),
        title:       z.string(),
        description: z.string().optional().default(''),
        priority:    z.string().optional().default('medium'),
        severity:    z.string().optional().default('major'),
        reporter_id: z.number(),
        assignee_id: z.number().optional(),
      }).parse(args);
      const info = db.prepare(`
        INSERT INTO bugs (project_id, title, description, priority, severity, reporter_id, assignee_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.project_id, input.title, input.description,
        input.priority, input.severity, input.reporter_id,
        input.assignee_id ?? null,
      );
      const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(info.lastInsertRowid);
      return text(bug);
    }

    case 'update_bug': {
      const input = z.object({
        id:          z.number(),
        title:       z.string().optional(),
        description: z.string().optional(),
        status:      z.string().optional(),
        priority:    z.string().optional(),
        severity:    z.string().optional(),
        assignee_id: z.number().nullable().optional(),
      }).parse(args);
      const existing = db.prepare('SELECT * FROM bugs WHERE id = ?').get(input.id) as Record<string, unknown> | undefined;
      if (!existing) return text({ error: 'Bug not found' });
      const merged = { ...existing, ...input };
      db.prepare(`
        UPDATE bugs
        SET title = ?, description = ?, status = ?, priority = ?, severity = ?,
            assignee_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        merged.title, merged.description, merged.status,
        merged.priority, merged.severity, merged.assignee_id,
        input.id,
      );
      const bug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(input.id);
      return text(bug);
    }

    case 'delete_bug': {
      const { id } = z.object({ id: z.number() }).parse(args);
      db.prepare('DELETE FROM bugs WHERE id = ?').run(id);
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
        id:          z.number(),
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
      const { id } = z.object({ id: z.number() }).parse(args);
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
        id:    z.number(),
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
      const { id } = z.object({ id: z.number() }).parse(args);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      return text({ success: true, id });
    }

    case 'add_comment': {
      const input = z.object({ bug_id: z.number(), user_id: z.number(), content: z.string() }).parse(args);
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
      const { bug_id } = z.object({ bug_id: z.number() }).parse(args);
      const comments = db.prepare(`
        SELECT c.*, u.name AS author_name
        FROM comments c JOIN users u ON u.id = c.user_id
        WHERE c.bug_id = ? ORDER BY c.id
      `).all(bug_id);
      return text(comments);
    }

    default:
      return text({ error: `Unknown tool: ${name}` });
  }
});

// ── Start ────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Bug Tracker MCP server started (stdio)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
