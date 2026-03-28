# Clone Talking

Talk to an AI clone of any agent persona from your phone — voice in, voice out.

Run the server on your PC, scan a QR code with your Android phone, hold a button to speak, and hear the AI respond in a cloned voice via ElevenLabs.

---

## How it works

```
npm start [agent-name]
        │
        ▼
  Setup wizard (first run)
        │
        ▼
  Express + WebSocket server on :3000
        │
        ▼
  ngrok HTTPS tunnel → QR code in terminal
        │
        ▼
  Scan with phone → browser opens → allow mic
        │
  Hold button → speak → release
        │
  Whisper STT → OpenRouter LLM → ElevenLabs TTS
        │
  AI responds with cloned voice
        │
  Conversation saved to logs/session-{timestamp}.json
```

---

## Prerequisites

- **Node.js 18+**
- **4 API keys** (see setup below)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

Open `.env` and set:

```env
# Required: OpenRouter (LLM)
OPENROUTER_API_KEY=your-key-here
OPENROUTER_MODEL=anthropic/claude-sonnet-4-5

# Required: OpenAI (Whisper speech-to-text)
OPENAI_API_KEY=your-key-here

# Required: ElevenLabs (text-to-speech with voice cloning)
ELEVENLABS_API_KEY=your-key-here

# Required for mic access on Android Chrome (HTTPS)
NGROK_AUTHTOKEN=your-token-here
```

| Variable | Where to get |
|---|---|
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `OPENROUTER_MODEL` | Browse at [openrouter.ai/models](https://openrouter.ai/models) |
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `ELEVENLABS_API_KEY` | [elevenlabs.io](https://elevenlabs.io) → Profile → API Key |
| `NGROK_AUTHTOKEN` | [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken) |

> **Why ngrok?** Android Chrome blocks microphone access on plain HTTP. ngrok creates a free HTTPS tunnel to your local server — no certificate setup needed.

---

## Configuring agents

Agent personas live in `.claude/commands/AIOX/agents/` as `.md` files.
Each file's content becomes the AI's system prompt (its personality and expertise).

**Available agents by default:**

| Command | Persona |
|---|---|
| `dev` | Dex — Developer, implementation expert |
| `qa` | Quinn — QA Engineer, testing specialist |
| `architect` | Aria — System architect |
| `pm` | Morgan — Product Manager |
| `po` | Pax — Product Owner |
| `analyst` | Alex — Research and analysis |
| `data-engineer` | Dara — Database specialist |
| `ux-design-expert` | Uma — UX/UI designer |

### Assigning a voice to an agent

Each agent needs an ElevenLabs **Voice ID** — this is what gives each clone a unique voice.

**How to get a Voice ID:**
1. Go to [elevenlabs.io](https://elevenlabs.io) → **Voices**
2. Use a pre-made voice or clone a new one (upload a short audio sample)
3. Click on the voice → copy the **Voice ID** (looks like `21m00Tcm4TlvDq8ikWAM`)

**How voices are stored:**

Voice IDs are saved automatically the first time you run an agent.
They are stored in `.voice-config.json` at the project root:

```json
{
  "dev": {
    "voiceId": "21m00Tcm4TlvDq8ikWAM"
  },
  "qa": {
    "voiceId": "AZnzlk1XvdvUeBnXmlld"
  }
}
```

You can also edit this file directly to update or add voice IDs without going through the wizard.

---

## Running

### Interactive mode (pick agent via menu)

```bash
npm start
```

The wizard will ask you to:
1. Choose an agent
2. Enter the ElevenLabs voice ID (saved for future runs)
3. Confirm and start

### Direct mode (skip wizard)

```bash
node src/server.js dev
```

Or using npm:

```bash
npm start -- dev
```

Replace `dev` with any agent name. The server starts immediately using the saved voice ID for that agent (or prompts for one if not yet configured).

**Examples:**

```bash
node src/server.js qa            # Talk to Quinn the QA engineer
node src/server.js architect     # Talk to Aria the architect
node src/server.js analyst       # Talk to Alex the analyst
```

---

## Using your phone

1. Run the server — a QR code appears in the terminal
2. Scan with your Android phone (Chrome recommended)
3. Tap **Allow** when the browser asks for microphone access
4. **Hold** the button to record your voice
5. **Release** to send — the AI will respond in its cloned voice
6. The conversation transcript appears on screen in real time

> The QR code URL changes every time you restart (free ngrok tier). Re-scan on each session.

---

## Session logs

Every run creates a new JSON file in `logs/`:

```
logs/session-2026-03-28-15-30-00.json
```

Format:

```json
{
  "sessionId": "a1b2c3d4-...",
  "agentFile": ".claude/commands/AIOX/agents/dev.md",
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "model": "anthropic/claude-sonnet-4-5",
  "startedAt": "2026-03-28T15:30:00.000Z",
  "messages": [
    { "role": "user", "content": "Hey, how do I set up a Node project?", "timestamp": "..." },
    { "role": "assistant", "content": "Run npm init -y to scaffold...", "timestamp": "..." }
  ]
}
```

The `logs/` directory is gitignored. Use these files to review, analyse, or export conversations.

---

## Choosing a model

Set `OPENROUTER_MODEL` in `.env`. Any model available on OpenRouter works.

| Model | Notes |
|---|---|
| `anthropic/claude-sonnet-4-5` | Recommended — fast, high quality |
| `anthropic/claude-opus-4` | Most capable, slower |
| `openai/gpt-4o` | Great alternative |
| `openai/gpt-4o-mini` | Fastest and cheapest |
| `google/gemini-flash-1.5` | Very fast, low cost |
| `meta-llama/llama-3.1-70b-instruct` | Open-source option |

Browse all available models at [openrouter.ai/models](https://openrouter.ai/models).

---

## Adding a custom agent

1. Create a new `.md` file in `.claude/commands/AIOX/agents/`:

```bash
# Example: .claude/commands/AIOX/agents/coach.md
```

2. Write the persona as plain text (this becomes the system prompt):

```markdown
You are a personal productivity coach named Casey. You are direct, encouraging,
and help people break down goals into actionable steps. You speak in a warm but
efficient tone and always end responses with a concrete next action.
```

3. Run it:

```bash
node src/server.js coach
```

The wizard will ask for the ElevenLabs voice ID on the first run, then save it for future sessions.
