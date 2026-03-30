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
  const cloneArg = process.argv[2] || null
  const config = await runSetup(cloneArg)

  const session = createSession({
    cloneFile: config.cloneFile,
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
    let pendingMimeType = 'audio/webm'

    socket.send(JSON.stringify({
      type: 'clone_info',
      cloneName: config.cloneName,
      cloneId: config.cloneId,
    }))

    socket.on('message', async (data, isBinary) => {
      if (!isBinary) {
        try {
          const msg = JSON.parse(data.toString())
          if (msg.type === 'end_call') session.flush()
          else if (msg.type === 'audio_meta') pendingMimeType = msg.mimeType || 'audio/webm'
        } catch {}
        return
      }
      const buf = Buffer.from(data)
      await processTurn({ audioBuffer: buf, socket, history, session, config, mimeType: pendingMimeType })
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
