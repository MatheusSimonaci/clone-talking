(function () {
  // === DOM ===
  const callScreen       = document.getElementById('call-screen')
  const transcriptScreen = document.getElementById('transcript-screen')
  const timerEl          = document.getElementById('call-timer')
  const avatarEl         = document.getElementById('avatar')
  const cloneNameEl      = document.getElementById('clone-name')
  const callStatusEl     = document.getElementById('call-status')
  const volBarsEl        = document.getElementById('vol-bars')
  const volBars          = [1,2,3,4,5,6,7].map(i => document.getElementById('vb' + i))
  const micLabelEl       = document.getElementById('mic-label')
  const endBtn           = document.getElementById('end-btn')
  const messagesEl       = document.getElementById('messages')
  const tAvatarEl        = document.getElementById('t-avatar')
  const tNameEl          = document.getElementById('t-name')
  const tDurationEl      = document.getElementById('t-duration')
  const newCallBtn       = document.getElementById('new-call-btn')

  // === App state ===
  // states: connecting | idle | speaking | processing | playing | ended
  let state        = 'connecting'
  let cloneName    = 'Clone'
  let callStart    = null
  let timerInterv  = null
  let callLog      = []   // { role, text } — only rendered at end
  let isEnded      = false

  // === VAD config ===
  const SPEAK_THRESH   = 20    // avg frequency amplitude to trigger speech
  const SILENCE_THRESH = 14    // avg amplitude to consider silence
  const SILENCE_MS     = 1400  // ms of silence before stopping
  const MIN_SPEECH_MS  = 350   // ignore bursts shorter than this

  // === Audio state ===
  let mediaStream  = null
  let audioCtx     = null
  let analyser     = null
  let freqBuf      = null
  let recorder     = null
  let audioChunks  = []
  let silenceTimer = null
  let speechStart  = null
  let vadLive      = false
  let pendingAudio = []

  // === WebSocket ===
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const ws    = new WebSocket(`${proto}://${location.host}`)
  ws.binaryType = 'arraybuffer'

  ws.onopen  = () => initMic()
  ws.onclose = () => { if (!isEnded) endCall('Connection lost') }
  ws.onerror = () => { if (!isEnded) endCall('Connection error') }

  ws.onmessage = async (event) => {
    // Binary = audio chunk
    if (event.data instanceof ArrayBuffer) {
      pendingAudio.push(event.data)
      return
    }

    const msg = JSON.parse(event.data)

    if (msg.type === 'clone_info') {
      cloneName = msg.cloneName || 'Clone'
      const initials = getInitials(cloneName)
      avatarEl.textContent   = initials
      cloneNameEl.textContent = cloneName
      tAvatarEl.textContent  = initials
      tNameEl.textContent    = cloneName

    } else if (msg.type === 'status') {
      setStatus(msg.text)

    } else if (msg.type === 'user_transcript') {
      callLog.push({ role: 'user', text: msg.text })

    } else if (msg.type === 'ai_transcript') {
      callLog.push({ role: 'assistant', text: msg.text })

    } else if (msg.type === 'audio_end') {
      await playAudio(pendingAudio)
      pendingAudio = []

    } else if (msg.type === 'error') {
      callLog.push({ role: 'error', text: msg.message })
      endCall()
    }
  }

  // === Microphone init ===
  async function initMic() {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })

      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.5
      freqBuf = new Uint8Array(analyser.frequencyBinCount)

      const source = audioCtx.createMediaStreamSource(mediaStream)
      source.connect(analyser)

      micLabelEl.textContent = 'mic active'
      micLabelEl.classList.add('on')

      setState('idle')
      startTimer()
      startVAD()

    } catch {
      callLog.push({ role: 'error', text: 'Microphone access denied. Please allow it and reload.' })
      endCall()
    }
  }

  // === VAD loop ===
  function startVAD() {
    vadLive = true

    function tick() {
      if (!vadLive) return

      analyser.getByteFrequencyData(freqBuf)
      const level = avgLevel(freqBuf)

      // Update volume bars while speaking
      if (state === 'speaking') {
        volBarsEl.classList.add('visible')
        updateVolBars(freqBuf)
      } else {
        volBarsEl.classList.remove('visible')
      }

      if (state === 'idle' && level > SPEAK_THRESH) {
        startRecording()

      } else if (state === 'speaking') {
        if (level < SILENCE_THRESH) {
          if (!silenceTimer) {
            silenceTimer = setTimeout(() => {
              silenceTimer = null
              const dur = Date.now() - speechStart
              if (dur >= MIN_SPEECH_MS) {
                stopAndSend()
              } else {
                // Too short — discard
                if (recorder && recorder.state !== 'inactive') {
                  recorder.ondataavailable = null
                  recorder.onstop = null
                  recorder.stop()
                }
                audioChunks = []
                setState('idle')
              }
            }, SILENCE_MS)
          }
        } else {
          // Still speaking — reset silence timer
          if (silenceTimer) {
            clearTimeout(silenceTimer)
            silenceTimer = null
          }
        }
      }

      requestAnimationFrame(tick)
    }

    tick()
  }

  function avgLevel(data) {
    let sum = 0
    for (let i = 0; i < data.length; i++) sum += data[i]
    return sum / data.length
  }

  function updateVolBars(data) {
    // Sample 7 evenly spaced frequency bins in the voice range
    const slots = [4, 8, 14, 20, 28, 36, 46]
    slots.forEach((bin, i) => {
      const h = Math.max(3, Math.min(28, (data[bin] / 255) * 28))
      volBars[i].style.height = h + 'px'
    })
  }

  // === Recording ===
  function startRecording() {
    if (!mediaStream) return
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus' : 'audio/webm'

    recorder     = new MediaRecorder(mediaStream, { mimeType: mime })
    audioChunks  = []
    speechStart  = Date.now()

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }

    recorder.onstop = () => {
      if (audioChunks.length > 0) {
        const blob = new Blob(audioChunks, { type: recorder.mimeType })
        blob.arrayBuffer().then(buf => {
          ws.send(JSON.stringify({ type: 'audio_meta', mimeType: blob.type }))
          ws.send(buf)
        })
      }
      audioChunks = []
    }

    recorder.start()
    setState('speaking')
  }

  function stopAndSend() {
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    setState('processing')
  }

  // === Audio playback ===
  async function playAudio(chunks) {
    if (!chunks.length) { setState('idle'); return }

    setState('playing')
    vadLive = false   // pause VAD while AI speaks — prevents echo feedback

    if (audioCtx.state === 'suspended') await audioCtx.resume()

    const total    = chunks.reduce((s, c) => s + c.byteLength, 0)
    const combined = new Uint8Array(total)
    let offset     = 0
    for (const c of chunks) {
      combined.set(new Uint8Array(c), offset)
      offset += c.byteLength
    }

    try {
      const decoded = await audioCtx.decodeAudioData(combined.buffer)
      const src     = audioCtx.createBufferSource()
      src.buffer    = decoded
      src.connect(audioCtx.destination)
      src.onended   = () => {
        document.body.classList.remove('is-playing')
        vadLive = true
        startVAD()
        setState('idle')
      }
      src.start()
      document.body.classList.add('is-playing')
    } catch (err) {
      console.error('Audio decode error:', err)
      vadLive = true
      startVAD()
      setState('idle')
    }
  }

  // === Call timer ===
  function startTimer() {
    callStart   = Date.now()
    timerInterv = setInterval(() => {
      const s   = Math.floor((Date.now() - callStart) / 1000)
      const mm  = String(Math.floor(s / 60)).padStart(2, '0')
      const ss  = String(s % 60).padStart(2, '0')
      timerEl.textContent = `${mm}:${ss}`
    }, 1000)
  }

  // === End call ===
  function endCall(errorMsg) {
    if (isEnded) return
    isEnded = true

    vadLive = false
    clearInterval(timerInterv)
    if (silenceTimer) clearTimeout(silenceTimer)
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null
      recorder.onstop = null
      recorder.stop()
    }

    try { ws.send(JSON.stringify({ type: 'end_call' })) } catch {}

    const duration = callStart
      ? fmtDuration(Math.floor((Date.now() - callStart) / 1000))
      : '0:00'

    if (errorMsg) callLog.push({ role: 'error', text: errorMsg })

    showTranscript(duration)
  }

  function showTranscript(duration) {
    callScreen.style.display       = 'none'
    transcriptScreen.style.display = 'flex'
    tDurationEl.textContent        = `Call ended · ${duration}`

    callLog.forEach(({ role, text }) => {
      const div       = document.createElement('div')
      div.className   = `msg ${role === 'error' ? 'error-msg' : role}`
      div.textContent = text
      messagesEl.appendChild(div)
    })
    messagesEl.scrollTop = messagesEl.scrollHeight
  }

  function fmtDuration(secs) {
    const m = Math.floor(secs / 60)
    const s = String(secs % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  // === UI state machine ===
  function setState(newState) {
    state = newState

    const labels = {
      connecting: 'Connecting…',
      idle:       'Listening…',
      speaking:   'Speaking…',
      processing: 'Thinking…',
      playing:    'Responding…',
    }
    setStatus(labels[newState] || '')

    document.body.classList.toggle('is-listening', newState === 'idle')
  }

  function setStatus(text) { callStatusEl.textContent = text }

  function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  // === Controls ===
  endBtn.addEventListener('click', () => endCall())
  newCallBtn.addEventListener('click', () => location.reload())
})()
