require('dotenv').config()

const http = require('http')
const path = require('path')
const express = require('express')
const { WebSocketServer } = require('ws')

const { runSetup } = require('./setup')
const { createSession } = require('./logger')
const { startTunnel } = require('./tunnel')
const { printQR } = require('./qrcode')
const { processTurn } = require('./pipeline')

const PORT = parseInt(process.env.PORT || '3000', 10)

async function main() {
  const agentArg = process.argv[2] || null
  const config = await runSetup(agentArg)

  const session = createSession({
    agentFile: config.agentFile,
    voiceId: config.voiceId,
    model: config.model,
  })
  console.log(`[server] Session log: ${session.getPath()}`)

  const app = express()
  app.use(express.static(path.join(__dirname, '..', 'public')))

  const server = http.createServer(app)
  const wss = new WebSocketServer({ server })

  wss.on('connection', (socket) => {
    console.log('[ws] Client connected')
    const history = []

    socket.on('message', async (data) => {
      if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)
        await processTurn({ audioBuffer: buf, socket, history, session, config })
      }
    })

    socket.on('close', () => {
      console.log('[ws] Client disconnected')
      session.flush()
    })

    socket.on('error', (err) => {
      console.error('[ws] Socket error:', err.message)
    })
  })

  server.listen(PORT, '0.0.0.0', async () => {
    console.log(`[server] Listening on port ${PORT}`)
    const publicUrl = await startTunnel(PORT)
    printQR(publicUrl)
  })
}

main().catch((err) => {
  console.error('[server] Fatal error:', err.message)
  process.exit(1)
})
