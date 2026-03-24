# MCP HTTP Server — OAuth 2.0 Setup Guide

This guide explains how to connect the Bug Tracker MCP HTTP server to **Claude Desktop** using OAuth 2.0 authentication.

---

## How It Works

When Claude Desktop connects to the MCP HTTP server it will:

1. Hit `POST /mcp` without a token → receive `401` with a `WWW-Authenticate` header
2. Follow the header to `/.well-known/oauth-protected-resource` → discover the OAuth server
3. Read `/.well-known/oauth-authorization-server` → get authorization/token endpoints
4. Register itself as a client via `POST /oauth/register`
5. Open a browser tab to `/oauth/authorize` → show the Bug Tracker login form
6. You log in with your Bug Tracker email and password
7. Claude Desktop exchanges the auth code for a Bearer token
8. All subsequent `/mcp` calls use that token automatically

---

## Prerequisites

- Bug Tracker backend running on `http://localhost:3000` (`npm run dev`)
- Node.js 18+
- Claude Desktop installed

---

## Step 1 — Configure the Issuer

Create or update `bug-tracker/.env` and set the public base URL of the MCP HTTP server:

```env
MCP_OAUTH_ISSUER=http://localhost:3001
```

> If you expose the server on a different host or port, set this to that address (e.g. `https://mcp.yourdomain.com`). OAuth redirect URLs and discovery documents are built from this value.

---

## Step 2 — Start the MCP HTTP Server

```bash
cd bug-tracker
npm run mcp:http
```

You should see:

```
Bug Tracker MCP server started (http) on port 3001
```

Verify it is healthy:

```bash
curl http://localhost:3001/health
# {"status":"ok","transport":"http"}
```

---

## Step 3 — Configure Claude Desktop

Open the Claude Desktop config file:

- **Windows:** `C:\Users\<you>\AppData\Roaming\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the MCP server entry:

```json
{
  "mcpServers": {
    "bug-tracker": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

> If you already have other MCP servers configured, add `"bug-tracker"` alongside them inside `"mcpServers"`.

---

## Step 4 — Restart Claude Desktop

Fully quit and relaunch Claude Desktop. On first connection it will trigger the OAuth flow:

1. A browser tab opens with the **Authorize MCP Access** login page
2. Enter your Bug Tracker email and password
3. Click **Sign in & Authorize**
4. The browser closes / redirects — Claude Desktop is now connected

Claude Desktop stores the token and refreshes it automatically. You will not need to log in again unless you revoke the token or clear Claude Desktop's session data.

---

## Step 5 — Verify the Connection

In a new Claude Desktop conversation, ask something like:

> "List all open bugs in the BugApp project"

Claude should call the `get_items` tool and return results from your Bug Tracker.

---

## Available MCP Tools

Once connected, Claude Desktop has access to all 20 Bug Tracker tools:

| Tool | Description |
|------|-------------|
| `get_items` | List bugs/tasks with optional filters |
| `get_item` | Fetch a single item by ID |
| `create_item` | Create a new bug or task |
| `update_item` | Update status, priority, assignee, etc. |
| `delete_item` | Delete an item |
| `get_projects` | List all projects |
| `create_project` | Create a new project |
| `update_project` | Update project name/description |
| `delete_project` | Delete a project |
| `get_users` | List all users |
| `create_user` | Create a new user |
| `update_user` | Update a user |
| `delete_user` | Delete a user |
| `get_item_links` | Get all items linked to an item |
| `link_items` | Link two items together |
| `unlink_items` | Remove a link between items |
| `add_comment` | Add a comment to a bug |
| `get_comments` | Get all comments for a bug |
| `get_project_members` | List project members |
| `add_project_member` | Add a user to a project |
| `remove_project_member` | Remove a user from a project |
| `assess_item_risk` | Fetch full context for AI risk assessment |

---

## Running Everything Together

Open 3 terminals:

| Terminal | Command | URL |
|----------|---------|-----|
| 1 — Backend | `cd bug-tracker && npm run dev` | `http://localhost:3000` |
| 2 — Frontend | `cd frontend && npm run dev` | `http://localhost:5173` |
| 3 — MCP HTTP | `cd bug-tracker && npm run mcp:http` | `http://localhost:3001` |

---

## OAuth Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.well-known/oauth-protected-resource` | GET | Resource metadata (points to auth server) |
| `/.well-known/oauth-authorization-server` | GET | Auth server metadata (discovery) |
| `/oauth/register` | POST | Dynamic client registration |
| `/oauth/authorize` | GET | Login page |
| `/oauth/authorize` | POST | Process login, issue auth code |
| `/oauth/token` | POST | Exchange code for token / refresh |
| `/oauth/revoke` | POST | Revoke an access or refresh token |

---

## API Key Auth (Alternative / Backward Compat)

If you set `MCP_API_KEY` in `.env`, direct Bearer token access still works alongside OAuth:

```env
MCP_API_KEY=your-secret-key
```

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Both auth methods are accepted simultaneously. OAuth is the recommended approach for Claude Desktop.

---

## Troubleshooting

**Claude Desktop shows no MCP tools**
- Make sure the MCP HTTP server is running (`npm run mcp:http`)
- Confirm the `url` in `claude_desktop_config.json` is `http://localhost:3001/mcp`
- Check that `MCP_OAUTH_ISSUER=http://localhost:3001` is set in `.env`

**Login page shows "Invalid client or redirect_uri"**
- Claude Desktop may have cached a stale client registration — restart Claude Desktop to trigger a fresh registration

**Login fails with correct credentials**
- Make sure your user account has a password set (accounts created before the auth feature was added may not have one — use the Register page on the frontend to set one)

**Token expired mid-session**
- Tokens last 1 hour. Claude Desktop will automatically use the refresh token to get a new one. If refresh fails, re-authorize from Claude Desktop settings.
