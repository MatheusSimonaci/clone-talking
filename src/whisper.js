const { OpenAI, toFile } = require('openai')

async function transcribe(audioBuffer, mimeType = 'audio/webm') {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1',
  })

  const baseMime = mimeType.split(';')[0]
  const ext = baseMime.includes('ogg') ? 'ogg'
    : baseMime.includes('mp4') ? 'mp4'
    : baseMime.includes('wav') ? 'wav'
    : baseMime.includes('mpeg') ? 'mp3'
    : 'webm'

  const file = await toFile(audioBuffer, `audio.${ext}`, { type: baseMime })

  const response = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file,
  })

  return response.text
}

module.exports = { transcribe }
