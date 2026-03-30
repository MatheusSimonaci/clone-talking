async function* streamTTS({ text, voiceId, apiKey }) {
  const response = await fetch('https://api.voispark.com/api/tts/generate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      provider: process.env.VOISPARK_PROVIDER || 'fish-audio',
      model_id: process.env.VOISPARK_MODEL_ID || '',
      voice: {
        type: 'ip',
        project_id: voiceId,
      },
      sync: true,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    let errMsg = errText
    try { errMsg = JSON.parse(errText).message || errText } catch {}
    throw new Error(`VoiSpark error ${response.status}: ${errMsg}`)
  }

  const data = await response.json()
  const audioUrl = data.data?.url || data.data?.details?.url
  if (!audioUrl) throw new Error(`VoiSpark: no audio URL in response: ${JSON.stringify(data)}`)

  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) throw new Error(`VoiSpark: failed to download audio (${audioRes.status})`)

  const buffer = Buffer.from(await audioRes.arrayBuffer())
  yield buffer
}

module.exports = { streamTTS }
