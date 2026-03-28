(function () {
  const btn = document.getElementById('talk-btn')
  const statusEl = document.getElementById('status')
  const transcriptEl = document.getElementById('transcript')
  const connBadge = document.getElementById('conn-badge')
  const emptyHint = document.getElementById('empty-hint')

  // States: idle | recording | processing
  let state = 'idle'
  let recorder = null
  let audioChunks = []
  let mediaStream = null
  let audioCtx = null

  // WebSocket — use wss:// when served over HTTPS (ngrok), ws:// otherwise
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${location.host}`)
  ws.binaryType = 'arraybuffer'

  // --- WebSocket handlers ---

  ws.onopen = () => {
    connBadge.className = 'connected'
    setStatus('Ready')
    initMic()
  }

  ws.onclose = () => {
    connBadge.className = 'error'
    setStatus('Disconnected')
    btn.disabled = true
  }

  ws.onerror = () => {
    connBadge.className = 'error'
  }

  // Pending binary audio chunks (accumulate until audio_end)
  let pendingAudio = []

  ws.onmessage = async (event) => {
    if (event.data instanceof ArrayBuffer) {
      pendingAudio.push(event.data)
      return
    }

    const msg = JSON.parse(event.data)

    if (msg.type === 'status') {
      setStatus(msg.text)
    } else if (msg.type === 'user_transcript') {
      addMessage('user', msg.text)
    } else if (msg.type === 'ai_transcript') {
      addMessage('assistant', msg.text)
    } else if (msg.type === 'audio_end') {
      await playAccumulatedAudio(pendingAudio)
      pendingAudio = []
      setState('idle')
    } else if (msg.type === 'error') {
      addMessage('error', msg.message)
      setState('idle')
    }
  }

  // --- Microphone setup ---

  async function initMic() {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      btn.disabled = false
    } catch (err) {
      setStatus('Mic access denied')
      addMessage('error', 'Microphone access was denied. Please allow it and reload.')
    }
  }

  // --- Button: hold to record ---

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    if (state !== 'idle' || !mediaStream) return
    // Warm up AudioContext on user gesture (required by Android Chrome)
    ensureAudioContext()
    startRecording()
  })

  btn.addEventListener('pointerup', (e) => {
    e.preventDefault()
    if (state !== 'recording') return
    stopRecordingAndSend()
  })

  btn.addEventListener('pointercancel', (e) => {
    e.preventDefault()
    if (state !== 'recording') return
    stopRecordingAndSend()
  })

  // --- Recording ---

  function startRecording() {
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    recorder = new MediaRecorder(mediaStream, { mimeType })
    audioChunks = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: recorder.mimeType })
      blob.arrayBuffer().then((buf) => ws.send(buf))
      audioChunks = []
    }

    recorder.start()
    setState('recording')
  }

  function stopRecordingAndSend() {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    setState('processing')
  }

  // --- Audio playback ---

  function ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
  }

  async function playAccumulatedAudio(chunks) {
    if (chunks.length === 0) return
    ensureAudioContext()

    const totalLen = chunks.reduce((sum, c) => sum + c.byteLength, 0)
    const combined = new Uint8Array(totalLen)
    let offset = 0
    for (const chunk of chunks) {
      combined.set(new Uint8Array(chunk), offset)
      offset += chunk.byteLength
    }

    try {
      const decoded = await audioCtx.decodeAudioData(combined.buffer)
      const source = audioCtx.createBufferSource()
      source.buffer = decoded
      source.connect(audioCtx.destination)
      source.start()
    } catch (err) {
      console.error('Audio decode error:', err)
    }
  }

  // --- UI helpers ---

  function setState(newState) {
    state = newState
    if (newState === 'idle') {
      btn.disabled = false
      btn.classList.remove('recording')
      btn.textContent = 'Hold to Talk'
    } else if (newState === 'recording') {
      btn.disabled = false
      btn.classList.add('recording')
      btn.textContent = 'Release to Send'
    } else {
      btn.disabled = true
      btn.classList.remove('recording')
      btn.textContent = 'Hold to Talk'
    }
  }

  function setStatus(text) {
    statusEl.textContent = text
  }

  function addMessage(role, text) {
    if (emptyHint) emptyHint.remove()

    const div = document.createElement('div')
    div.className = `msg ${role === 'error' ? 'error-msg' : role}`
    div.textContent = text
    transcriptEl.appendChild(div)
    transcriptEl.scrollTop = transcriptEl.scrollHeight
  }
})()
