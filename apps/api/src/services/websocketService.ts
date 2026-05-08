import { WebSocketServer, WebSocket } from 'ws'

let wss: WebSocketServer | null = null

export function startWebSocketServer(port: number) {
  wss = new WebSocketServer({ port })

  wss.on('connection', (ws) => {
    console.log('[ws] client connected')
    ws.on('close', () => console.log('[ws] client disconnected'))
    ws.on('error', (err) => console.error('[ws] error', err.message))
  })

  console.log(`FlowOps WS  → ws://localhost:${port}`)
}

export function broadcast(event: Record<string, unknown>) {
  if (!wss) return
  const msg = JSON.stringify(event)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg)
    }
  }
}
