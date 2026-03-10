import 'dotenv/config';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { timingSafeEqual } from 'crypto';
import { createServer } from './createServer';

if (process.env.MCP_TRANSPORT === 'http') {
  const apiKey = process.env.MCP_API_KEY;
  if (!apiKey) {
    console.error('ERROR: MCP_API_KEY must be set when MCP_TRANSPORT=http');
    process.exit(1);
  }

  const port = parseInt(process.env.PORT ?? '3001', 10);
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', transport: 'http' });
  });

  app.post('/mcp', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    const authorized = token !== null &&
      token.length === apiKey.length &&
      timingSafeEqual(Buffer.from(token), Buffer.from(apiKey));

    if (!authorized) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const httpServer = app.listen(port, () => {
    console.error(`Bug Tracker MCP server started (http) on port ${port}`);
  });

  const shutdown = () => {
    console.error('Shutting down gracefully...');
    httpServer.close(() => {
      console.error('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} else {
  async function main() {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Bug Tracker MCP server started (stdio)');
  }

  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
