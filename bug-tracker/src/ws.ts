import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

export type WsMessage =
  | { type: 'bug_created'; bug: Record<string, unknown> }
  | { type: 'bug_updated'; bug: Record<string, unknown> }
  | { type: 'bug_deleted'; id: number };

let wss: WebSocketServer;

export function initWss(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws: WebSocket) => {
    ws.on('error', console.error);
  });
}

export function broadcast(msg: WsMessage) {
  if (!wss) return;
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}
