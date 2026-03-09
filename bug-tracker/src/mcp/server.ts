import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './createServer';

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
