import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { createServer } from './createServer';

if (process.env.MCP_TRANSPORT === 'http') {
  const port = parseInt(process.env.PORT ?? '3001', 10);
  const app = express();
  app.use(express.json());

  app.post('/mcp', async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.listen(port, () => {
    console.error(`Bug Tracker MCP server started (http) on port ${port}`);
  });
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
