# Bug Tracker API + MCP Server

A full-featured Bug Tracker backend with a REST API (Express/TypeScript/SQLite) and an MCP server so AI assistants like Claude can interact with bug data directly.

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
cd bug-tracker
npm install
npm run seed   # populate sample data (5 users, 3 projects, 22 bugs, 15 comments)
npm run dev    # start REST API on http://localhost:3000
```

To run the MCP server instead:
```bash
npm run mcp
```

---

## REST API

### Users

```bash
# List all users
curl http://localhost:3000/users

# Get user by id
curl http://localhost:3000/users/1

# Create user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Frank Dev","email":"frank@example.com","role":"developer"}'

# Update user
curl -X PUT http://localhost:3000/users/1 \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'

# Delete user
curl -X DELETE http://localhost:3000/users/1
```

### Projects

```bash
# List all projects
curl http://localhost:3000/projects

# Get project by id
curl http://localhost:3000/projects/1

# Create project
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Data Pipeline","description":"ETL and analytics pipeline"}'

# Update project
curl -X PUT http://localhost:3000/projects/1 \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated description"}'

# Delete project
curl -X DELETE http://localhost:3000/projects/1

# Get all bugs for a project
curl http://localhost:3000/projects/1/bugs
```

### Bugs

```bash
# List all bugs
curl http://localhost:3000/bugs

# Filter bugs (combine any params)
curl "http://localhost:3000/bugs?status=open"
curl "http://localhost:3000/bugs?priority=critical&status=open"
curl "http://localhost:3000/bugs?project_id=1&severity=blocker"
curl "http://localhost:3000/bugs?assignee_id=2"

# Get bug by id
curl http://localhost:3000/bugs/1

# Create bug
curl -X POST http://localhost:3000/bugs \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 1,
    "title": "Button alignment broken on mobile",
    "description": "The submit button overlaps with the footer on screens <375px.",
    "priority": "medium",
    "severity": "minor",
    "reporter_id": 4,
    "assignee_id": 2
  }'

# Update bug status
curl -X PUT http://localhost:3000/bugs/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress","assignee_id":3}'

# Delete bug
curl -X DELETE http://localhost:3000/bugs/1
```

### Comments

```bash
# Get comments for a bug
curl http://localhost:3000/bugs/1/comments

# Add comment to bug
curl -X POST http://localhost:3000/bugs/1/comments \
  -H "Content-Type: application/json" \
  -d '{"user_id":2,"content":"Looking into this now."}'

# Delete comment
curl -X DELETE http://localhost:3000/comments/1
```

---

## MCP Server

The MCP server runs as a separate process over stdio and gives AI assistants direct read/write access to the SQLite database.

### Available Tools

| Tool | Description |
|------|-------------|
| `get_bugs` | List bugs — filter by `status`, `priority`, `severity`, `project_id`, `assignee_id` |
| `get_bug` | Get a single bug by `id` |
| `create_bug` | Create a new bug |
| `update_bug` | Update bug fields and touch `updated_at` |
| `delete_bug` | Delete a bug by `id` |
| `get_projects` | List all projects |
| `create_project` | Create a new project |
| `get_users` | List all users |
| `add_comment` | Add a comment to a bug |
| `get_comments` | Get all comments for a bug |

### Claude Desktop Configuration

Add this to your `claude_desktop_config.json` (usually at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "bug-tracker": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/absolute/path/to/bug-tracker"
    }
  }
}
```

After saving, restart Claude Desktop. You can then ask Claude:
- "List all open bugs"
- "Show me critical bugs in project 1"
- "Create a new bug for project 2 titled 'Login fails on Firefox'"
- "Mark bug 5 as resolved"

---

## Data Model

| Field | Values |
|-------|--------|
| `status` | `open` \| `in_progress` \| `resolved` \| `closed` |
| `priority` | `low` \| `medium` \| `high` \| `critical` |
| `severity` | `minor` \| `major` \| `critical` \| `blocker` |
| `role` | `admin` \| `developer` \| `tester` |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start REST API (port 3000, auto-restart on change) |
| `npm run mcp` | Start MCP server over stdio |
| `npm run seed` | Insert sample data into `bugtracker.db` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled output |
