const os = require('os')

async function startTunnel(port) {
  const token = process.env.NGROK_AUTHTOKEN

  if (!token) {
    const ip = getLocalIP()
    const url = `http://${ip}:${port}`
    console.warn('\n[tunnel] NGROK_AUTHTOKEN not set — falling back to local HTTP.')
    console.warn('[tunnel] Microphone access may be blocked on Android Chrome without HTTPS.\n')
    return url
  }

  try {
    const ngrok = require('@ngrok/ngrok')
    const listener = await ngrok.forward({ addr: port, authtoken: token })
    const url = listener.url()
    console.log(`[tunnel] ngrok tunnel active: ${url}`)
    return url
  } catch (err) {
    const ip = getLocalIP()
    const url = `http://${ip}:${port}`
    console.warn(`[tunnel] ngrok failed (${err.message}) — falling back to local HTTP.`)
    return url
  }
}

function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
}

module.exports = { startTunnel }
