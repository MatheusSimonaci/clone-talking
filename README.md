<p align="center">
  <h1 align="center">🎙️ Clone Talking</h1>
  <p align="center"><strong>Talk to AI persona clones from your phone — voice in, voice out.</strong></p>
</p>

<p align="center">
  <a href="#how-it-works"><strong>How It Works</strong></a> &middot;
  <a href="#quick-start"><strong>Quick Start</strong></a> &middot;
  <a href="#clone-system"><strong>Clones</strong></a> &middot;
  <a href="#architecture"><strong>Architecture</strong></a> &middot;
  <a href="#troubleshooting"><strong>Troubleshooting</strong></a>
</p>

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" /></a>
  <a href="https://voispark.com"><img src="https://img.shields.io/badge/VoiSpark-Voice%20Cloning-00bcd4?style=flat-square" alt="VoiSpark" /></a>
  <a href="https://openrouter.ai/"><img src="https://img.shields.io/badge/OpenRouter-Any%20Model-6366f1?style=flat-square" alt="OpenRouter" /></a>
  <a href="https://openai.com/"><img src="https://img.shields.io/badge/Whisper-Speech--to--Text-412991?style=flat-square&logo=openai&logoColor=white" alt="Whisper" /></a>
  <a href="https://ngrok.com/"><img src="https://img.shields.io/badge/ngrok-HTTPS%20Tunnel-1f1e37?style=flat-square" alt="ngrok" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-f59e0b?style=flat-square" alt="MIT License" /></a>
</p>

<br/>

## What is Clone Talking?

Clone Talking is a voice AI web app that brings personas to life. Run a server on your PC, scan a QR code with your phone, hold a button to speak, and the AI responds in a cloned voice — in real time.

Whether you want to chat with Elon Musk, a custom mentor, or any fully custom persona you create — it's just a few taps away. No app installation. No cloud hosting. Just your PC and your phone.

<br/>

## How It Works

```
┌─────────────┐
│ Your Phone  │  Scan QR code → browser opens
└──────┬──────┘
       │  Hold button → speak → release to send
       ▼
┌──────────────────┐
│  Express Server  │
│   + WebSocket    │
└────┬─┬─┬────────┘
     │ │ │
     ▼ ▼ ▼
   ┌───────────────────────┐
   │ Whisper (OpenAI)      │  Audio → Text
   │ OpenRouter LLM        │  Text  → Response
   │ VoiSpark TTS          │  Text  → Cloned Voice
   └──────────┬────────────┘
              ▼
         ┌─────────────┐
         │ Your Phone  │  Plays audio response
         │ (Speaker)   │  Saves conversation log
         └─────────────┘
```

<br/>

## Features

<table>
<tr>
<td align="center" width="33%">
<h3>⚡ Real-Time Pipeline</h3>
Ultra-low latency WebSocket pipeline. STT → LLM → TTS with no polling.
</td>
<td align="center" width="33%">
<h3>🧬 Voice Cloning</h3>
VoiSpark synthesizes natural, expressive voices — supports celebrity voices and custom clones.
</td>
<td align="center" width="33%">
<h3>🤖 Any AI Model</h3>
Route through OpenRouter: Claude, GPT-4, Llama, Gemini, Mistral — your choice.
</td>
</tr>
<tr>
<td align="center">
<h3>📱 Phone-First</h3>
Scan a QR code and you're live. No app install. Works on any modern mobile browser.
</td>
<td align="center">
<h3>🎭 Custom Personas</h3>
Define any character as a <code>.md</code> file with YAML frontmatter. One file = one clone.
</td>
<td align="center">
<h3>📝 Session Logs</h3>
Every conversation saved as structured JSON. Timestamps, roles, full history.
</td>
</tr>
</table>

<br/>

## Prerequisites

- **Node.js 18+**
- **Android phone with Chrome** — or any modern browser supporting Web Audio API
- **4 API keys** (all have free tiers):

| Service | Purpose | Get Key |
|---------|---------|---------|
| **OpenRouter** | LLM routing (any model) | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **OpenAI** | Whisper speech-to-text | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **VoiSpark** | Text-to-speech with voice cloning | [voispark.com](https://voispark.com) → Settings → API Tokens |
| **ngrok** | HTTPS tunnel for mobile mic | [dashboard.ngrok.com](https://dashboard.ngrok.com/get-started/your-authtoken) |

<br/>

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/MatheusSimonaci/clone-talking.git
cd clone-talking
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your keys:

```env
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=anthropic/claude-sonnet-4-5
OPENAI_API_KEY=your-key-here
VOISPARK_API_KEY=your-key-here
VOISPARK_PROVIDER=fish-audio
VOISPARK_MODEL_ID=s1
NGROK_AUTHTOKEN=your-token-here
```

### 3. Run the interactive setup

```bash
npm start
```

The wizard will:
- List all available clones
- Ask for a VoiSpark voice ID (saved automatically for future runs)
- Start the server on `localhost:3000`
- Open an ngrok HTTPS tunnel
- Display a QR code in your terminal

### 4. Scan and chat

1. **Scan the QR code** with your phone
2. **Tap "Allow"** when prompted for microphone access
3. **Hold the button** and speak
4. **Release** to send
5. **Listen** as the AI responds in its cloned voice

<br/>

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OPENROUTER_API_KEY` | Yes | LLM routing key | `sk-or-v1-...` |
| `OPENROUTER_MODEL` | Yes | Model to use | `anthropic/claude-sonnet-4-5` |
| `OPENAI_API_KEY` | Yes | Whisper STT key | `sk-proj-...` |
| `VOISPARK_API_KEY` | Yes | TTS + voice cloning | `your-voispark-key` |
| `VOISPARK_PROVIDER` | No | TTS provider (default: `fish-audio`) | `fish-audio` |
| `VOISPARK_MODEL_ID` | No | Provider model (default: `s1`) | `s1` |
| `NGROK_AUTHTOKEN` | Yes | HTTPS tunnel token | `...your-token...` |
| `PORT` | No | Server port (default: 3000) | `3000` |

> **Why ngrok?** Android Chrome requires HTTPS for microphone access. ngrok creates a free encrypted tunnel to your local server — no certificate setup needed.

<br/>

## Clone System

Clones are the heart of Clone Talking. Each clone is a persona — a character with its own voice, personality, and expertise.

### How clones work

Clones live in the `clones/` directory as Markdown files. Each file has:
- **YAML frontmatter** — metadata (`id`, `name`, `description`, `voiceId`)
- **Markdown body** — the system prompt (instructions for the AI)

When you chat with a clone, the file body becomes the LLM's system prompt.

### Clone file format

```markdown
---
id: elon-musk
name: Elon Musk
description: Strategic mentor — First Principles, The Algorithm, Maniacal Urgency
voiceId: b43a971a-f770-41fe-8afd-d245423ee75a
---

You are Elon Musk — entrepreneur, engineer, and strategic mentor.
Apply first principles thinking. Question every requirement. Delete before building.
```

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier — used in `npm start -- elon-musk` |
| `name` | Yes | Display name shown in the setup wizard |
| `description` | Yes | Short description shown in the setup wizard |
| `voiceId` | No | VoiSpark voice project ID — saved automatically if left empty |

### Adding a custom clone

```bash
cat > clones/my-mentor.md << 'EOF'
---
id: my-mentor
name: My Mentor
description: A custom strategic advisor persona.
voiceId: ""
---

You are a sharp, direct strategic advisor.
Give concise, actionable answers. Ask clarifying questions before diving in.
EOF
```

Then run it:

```bash
npm start -- my-mentor
```

On first run, the wizard will ask for a VoiSpark voice ID. It saves automatically.

### Voice IDs (VoiSpark)

Each clone needs a **VoiSpark Voice ID** — identifies a celebrity voice or custom clone.

**How to get a Voice ID:**
1. Go to [voispark.com](https://voispark.com) and log in
2. Browse **Celebrity Voices** or the voice catalog
3. Select a voice and copy its **Project ID**
4. Paste it as the `voiceId` in your clone's frontmatter or enter it during setup

**How voices are stored:**

Voice IDs are saved automatically in `.voice-config.json` (gitignored):

```json
{
  "elon-musk": { "voiceId": "b43a971a-f770-41fe-8afd-d245423ee75a" }
}
```

You can also edit `.voice-config.json` directly, or set a `voiceId` in the clone's frontmatter as a default.

<br/>

## Usage

```bash
# Interactive mode — pick from menu
npm start

# Direct mode — skip wizard
npm start -- elon-musk

# Raw Node.js
node src/server.js elon-musk
```

<br/>

## Model Selection

Any model on [OpenRouter](https://openrouter.ai/models) works. Set `OPENROUTER_MODEL` in `.env`.

| Model | Speed | Quality | Cost | Best For |
|-------|-------|---------|------|----------|
| `anthropic/claude-sonnet-4-5` | Fast | Excellent | $$ | **Default** — best balance |
| `anthropic/claude-opus-4` | Slow | Best-in-class | $$$$ | Complex reasoning |
| `openai/gpt-4o` | Medium | Very good | $$$ | Multimodal tasks |
| `openai/gpt-4o-mini` | Very fast | Good | $ | Budget-friendly |
| `google/gemini-flash-1.5` | Very fast | Good | $ | Speed-critical |
| `meta-llama/llama-3.1-70b-instruct` | Fast | Very good | $ | Open-source |

<br/>

## Architecture

```
Client (Browser)
       │
       │ WebSocket
       │
    Express Server (server.js)
       │
       ├─→ Whisper API (OpenAI)        ← Audio → Text
       │
       ├─→ OpenRouter (any LLM)        ← Text → Response
       │
       ├─→ VoiSpark TTS API            ← Text → Cloned Voice (streamed)
       │
       └─→ ngrok Tunnel               ← HTTPS for mobile mic access
```

**Pipeline flow:**

1. **Client** records audio and sends it via WebSocket
2. **Whisper** transcribes audio to text
3. **OpenRouter LLM** generates a response using the clone's system prompt
4. **VoiSpark** streams synthesized audio with the clone's voice
5. **Server** streams audio chunks back to the client in real time
6. **Logger** saves the full exchange to a session JSON file

<br/>

## Session Logs

Every conversation is automatically saved to `logs/`:

```
logs/session-2026-03-28-15-30-00.json
```

```json
{
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "cloneFile": "clones/elon-musk.md",
  "voiceId": "b43a971a-f770-41fe-8afd-d245423ee75a",
  "model": "anthropic/claude-sonnet-4-5",
  "startedAt": "2026-03-28T15:30:00.000Z",
  "messages": [
    {
      "role": "user",
      "content": "What is the theory of relativity?",
      "timestamp": "2026-03-28T15:30:05.123Z"
    },
    {
      "role": "assistant",
      "content": "Ah, a wonderful question! Allow me to explain E=mc²...",
      "timestamp": "2026-03-28T15:30:08.456Z"
    }
  ]
}
```

The `logs/` directory is gitignored.

<br/>

## Troubleshooting

<details>
<summary><b>Microphone not working on Android</b></summary>

**Problem:** Android Chrome asks for permission but mic doesn't activate.

**Solution:**
1. Check that ngrok is running — you should see an `https://...` URL in the terminal
2. Ensure the QR code links to `https://` (not `http://`)
3. Reload the page after granting permissions
4. Try a different browser (Firefox, Edge, Samsung Internet)

</details>

<details>
<summary><b>No voice output</b></summary>

**Problem:** Text response appears but no audio plays.

**Solution:**
1. Check `VOISPARK_API_KEY` in `.env`
2. Verify the voice project ID at [voispark.com](https://voispark.com) — confirm it exists in your account
3. Check your VoiSpark credit balance
4. Look at the server terminal for API errors

</details>

<details>
<summary><b>Slow responses</b></summary>

**Problem:** Long delay between speaking and hearing a reply.

**Solution:**
1. Switch to a faster model: `OPENROUTER_MODEL=openai/gpt-4o-mini`
2. Check your internet speed — Whisper and VoiSpark need good bandwidth
3. Verify your OpenRouter API key has credits

</details>

<details>
<summary><b>QR code changes every restart</b></summary>

**Problem:** ngrok assigns a new URL each restart (free tier).

**Solution:** This is normal on the free plan. Scan the new QR code each session. Upgrade to a paid ngrok plan for a fixed domain.

</details>

<br/>

## Ethical Use

Clone Talking is a tool for creative, educational, and entertainment purposes. Voice cloning is powerful technology — use it responsibly.

**The following uses are strictly prohibited:**

- ❌ **Fraud & impersonation** — cloning someone's voice without consent to deceive others
- ❌ **Scams** — using AI voices to impersonate real people in financial or social engineering attacks
- ❌ **Non-consensual content** — generating voice content with a real person's likeness without their explicit permission
- ❌ **Harassment** — using cloned voices to harass, defame, or harm individuals
- ❌ **Disinformation** — creating fake audio attributed to real people to spread false information

> **By using this project, you agree to comply with all applicable laws and the terms of service of each API provider (VoiSpark, OpenRouter, OpenAI, ngrok).** The author is not responsible for any misuse of this software.

If you witness abuse, report it to the relevant platform or authority.

<br/>

## Contributing

Clone Talking is open source. Contributions welcome!

- **Found a bug?** Open an [issue](https://github.com/MatheusSimonaci/clone-talking/issues)
- **Have an idea?** Submit a [pull request](https://github.com/MatheusSimonaci/clone-talking/pulls)
- **Want to share a clone?** Add it to `clones/` and open a PR

<br/>

## License

MIT License. See [LICENSE](LICENSE) for details.

<br/>

---

<p align="center">
  <sub>Built with Node.js · Express · WebSocket · OpenAI Whisper · OpenRouter · VoiSpark</sub><br/>
  <sub><em>Talk to anyone. From anywhere. Voice first.</em></sub>
</p>
