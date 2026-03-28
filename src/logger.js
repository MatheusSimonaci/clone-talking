const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

function createSession({ agentFile, voiceId, model }) {
  fs.mkdirSync('logs', { recursive: true })

  const timestamp = new Date().toISOString()
    .replace(/T/, '-').replace(/:/g, '-').slice(0, 19)
  const filename = path.join('logs', `session-${timestamp}.json`)

  const session = {
    sessionId: crypto.randomUUID(),
    agentFile,
    voiceId,
    model,
    startedAt: new Date().toISOString(),
    messages: [],
  }

  fs.writeFileSync(filename, JSON.stringify(session, null, 2))

  return {
    appendMessage({ role, content }) {
      session.messages.push({ role, content, timestamp: new Date().toISOString() })
      fs.writeFileSync(filename, JSON.stringify(session, null, 2))
    },
    flush() {
      fs.writeFileSync(filename, JSON.stringify(session, null, 2))
    },
    getPath() {
      return filename
    },
  }
}

module.exports = { createSession }
