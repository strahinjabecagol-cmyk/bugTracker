# Bug Tracker API + MCP Server

## Project Overview
Build a RESTful Bug Tracker API using Node.js and Express, with a Model Context Protocol (MCP) server wrapper so AI assistants like Claude can interact with it directly.

## Tech Stack
- Node.js + Express
- SQLite (via better-sqlite3, no setup overhead)
- Zod for request validation
- TypeScript

## Data Models

### User
- id, name, email, role (admin | developer | tester), created_at

### Project
- id, name, description, created_at

### Bug
- id, project_id, title, description, status (open | in_progress | resolved | closed), priority (low | medium | high | critical), severity (minor | major | critical | blocker), reporter_id, assignee_id, created_at, updated_at

### Comment
- id, bug_id, user_id, content, created_at

## REST API Endpoints

### Users
- GET /users
- GET /users/:id
- POST /users
- PUT /users/:id
- DELETE /users/:id

### Projects
- GET /projects
- GET /projects/:id
- POST /projects
- PUT /projects/:id
- DELETE /projects/:id

### Bugs
- GET /bugs (support query params: status, priority, severity, project_id, assignee_id)
- GET /bugs/:id
- POST /bugs
- PUT /bugs/:id
- DELETE /bugs/:id
- GET /projects/:id/bugs

### Comments
- GET /bugs/:id/comments
- POST /bugs/:id/comments
- DELETE /comments/:id

## MCP Server

Wrap the API with an MCP server using @modelcontextprotocol/sdk.

### Tools to expose
- get_bugs - list bugs with optional filters (status, priority, project_id)
- get_bug - get single bug by id
- create_bug - create a new bug
- update_bug - update status, priority, assignee etc
- delete_bug - delete a bug
- get_projects - list all projects
- create_project - create a new project
- get_users - list all users
- add_comment - add a comment to a bug
- get_comments - get all comments for a bug

## Project Structure
```
bug-tracker/
├── src/
│   ├── db/
│   │   ├── database.ts
│   │   └── seed.ts
│   ├── routes/
│   │   ├── users.ts
│   │   ├── projects.ts
│   │   ├── bugs.ts
│   │   └── comments.ts
│   ├── middleware/
│   │   └── validate.ts
│   ├── mcp/
│   │   └── server.ts
│   └── app.ts
├── package.json
└── tsconfig.json
```

## Additional Requirements
- Seed the database with realistic sample data (3 projects, 5 users, 20+ bugs in various states)
- Return proper HTTP status codes
- Validate all incoming request bodies with Zod
- MCP server should run as a separate entry point (src/mcp/server.ts)
- REST API runs on port 3000
- Include a README with setup instructions and example requests