async function* streamTTS({ text, voiceId, apiKey }) {
  const url = 'https://api.fish.audio/v1/tts'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      reference_id: voiceId,
      format: 'mp3',
      streaming: true,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    let errMsg = errText
    try { errMsg = JSON.parse(errText).message || errText } catch {}
    throw new Error(`Fish Audio error ${response.status}: ${errMsg}`)
  }

  const reader = response.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    yield Buffer.from(value)
  }
}

module.exports = { streamTTS }
