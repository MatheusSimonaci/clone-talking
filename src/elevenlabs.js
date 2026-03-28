async function* streamTTS({ text, voiceId, apiKey }) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`ElevenLabs error ${response.status}: ${err}`)
  }

  const reader = response.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    yield Buffer.from(value)
  }
}

module.exports = { streamTTS }
