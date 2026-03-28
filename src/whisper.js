const { OpenAI, toFile } = require('openai')

async function transcribe(audioBuffer) {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.openai.com/v1',
  })

  const file = await toFile(audioBuffer, 'audio.webm', { type: 'audio/webm' })

  const response = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file,
  })

  return response.text
}

module.exports = { transcribe }
