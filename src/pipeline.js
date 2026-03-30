const { transcribe } = require('./whisper')
const { chat } = require('./openrouter-client')
const { streamTTS } = require('./voispark')

async function processTurn({ audioBuffer, socket, history, session, config, mimeType = 'audio/webm' }) {
  const send = (obj) => socket.send(JSON.stringify(obj))

  try {
    // 1. Speech-to-text
    send({ type: 'status', text: 'Transcribing...' })
    const userText = await transcribe(audioBuffer, mimeType)
    if (!userText || !userText.trim()) {
      send({ type: 'status', text: 'Ready' })
      return
    }

    // 2. Log + broadcast user transcript
    session.appendMessage({ role: 'user', content: userText })
    history.push({ role: 'user', content: userText })
    send({ type: 'user_transcript', text: userText })

    // 3. LLM response
    send({ type: 'status', text: 'Thinking...' })
    const callPrompt = config.systemPrompt + `\n\n---\nYou are on a voice phone call. Rules for this conversation:\n- Keep every response short and direct — 1 to 3 sentences maximum.\n- Ask only one question per turn, never multiple.\n- Do not repeat or summarize what the user just said.\n- Avoid filler phrases like "Great question!" or "Of course!".\n- Speak naturally, as if in a real phone call.`

    const aiText = await chat({
      systemPrompt: callPrompt,
      history,
      model: config.model,
    })

    // 4. Log + broadcast AI transcript
    history.push({ role: 'assistant', content: aiText })
    session.appendMessage({ role: 'assistant', content: aiText })
    send({ type: 'ai_transcript', text: aiText })

    // 5. TTS — stream audio chunks to client
    send({ type: 'status', text: 'Speaking...' })
    for await (const chunk of streamTTS({
      text: aiText,
      voiceId: config.voiceId,
      apiKey: config.voisparkApiKey,
    })) {
      socket.send(chunk)
    }
    send({ type: 'audio_end' })
    send({ type: 'status', text: 'Ready' })
  } catch (err) {
    console.error('[pipeline] error:', err.message)
    send({ type: 'error', message: err.message })
    send({ type: 'status', text: 'Ready' })
  }
}

module.exports = { processTurn }
