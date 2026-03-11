# Bug Tracker — Quick Start

Full-stack bug tracking app: Express/TypeScript/SQLite backend, React/Vite frontend, and an MCP server so AI assistants (Claude Desktop / Claude Code) can interact with the data directly.

---

## Prerequisites

- Node.js 18+
- npm 9+

---

## Backend (REST API)

```bash
cd bug-tracker
npm install
npm run seed      # seed sample data (first time only)
npm run dev       # start on http://localhost:3000
```

---

## Frontend (React)

```bash
cd frontend
npm install
npm run dev       # start on http://localhost:5173
```

The frontend proxies `/api` → `http://localhost:3000`, so the backend must be running.

---

## MCP Server — stdio (Claude Desktop / Claude Code)

```bash
cd bug-tracker
npm run mcp
```

Add to `claude_desktop_config.json` (`%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "bug-tracker": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "C:/Users/strahinja.becagol/Desktop/bugtracker/bug-tracker"
    }
  }
}
```

---

## MCP Server — HTTP (remote / SSE clients)

```bash
cd bug-tracker
npm run mcp:http  # start on http://localhost:3001/mcp
```

Add to Claude config:

```json
{
  "mcpServers": {
    "bug-tracker-http": {
      "type": "http",
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

---

## Running Everything at Once

Open 3 terminals:

| Terminal | Command |
|----------|---------|
| 1 — Backend | `cd bug-tracker && npm run dev` |
| 2 — Frontend | `cd frontend && npm run dev` |
| 3 — MCP stdio | `cd bug-tracker && npm run mcp` |
| 3 — MCP http | `cd bug-tracker && npm run mcp:http` |
