import express from 'express'
import cors from 'cors'
import aiRoutes from './routes/ai'
import pipelineRoutes from './routes/pipelines'
import runRoutes from './routes/runs'
import { startWebSocketServer } from './services/websocketService'

const app = express()

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))
app.use(express.json({ limit: '2mb' }))

app.use('/api/ai', aiRoutes)
app.use('/api/pipelines', pipelineRoutes)
app.use('/api/runs', runRoutes)

app.get('/health', (_req, res) => res.json({ ok: true }))

const PORT = Number(process.env.PORT ?? 3001)
const WS_PORT = Number(process.env.WS_PORT ?? 3002)

app.listen(PORT, () => console.log(`FlowOps API → http://localhost:${PORT}`))
startWebSocketServer(WS_PORT)
