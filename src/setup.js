const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')

// Per-agent config map: { "dev": { voiceId: "..." }, "qa": { voiceId: "..." } }
const CONFIG_FILE = '.voice-config.json'
const AGENTS_DIR = path.join('.claude', 'commands', 'AIOX', 'agents')

// ---------------------------------------------------------------------------
// Agent file parser
// ---------------------------------------------------------------------------

function parseAgentFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')

  // Strip YAML frontmatter (--- ... ---)
  content = content.replace(/^---[\s\S]*?---\n?/, '')

  // Strip fenced code blocks (```...```)
  content = content.replace(/```[\s\S]*?```/g, '')

  // Strip HTML-style tags
  content = content.replace(/<[^>]+>/g, '')

  // Clean up excessive blank lines
  const systemPrompt = content.replace(/\n{3,}/g, '\n\n').trim()

  const name = path.basename(filePath, '.md')
  return { name, systemPrompt }
}

function listAgentFiles() {
  if (!fs.existsSync(AGENTS_DIR)) return []
  return fs.readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(AGENTS_DIR, f))
}

function findAgentFile(agentName) {
  const filePath = path.join(AGENTS_DIR, `${agentName}.md`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Agent file not found: ${filePath}\nRun "npm start" without arguments to see available agents.`)
  }
  return filePath
}

// ---------------------------------------------------------------------------
// Config persistence
// ---------------------------------------------------------------------------

function loadConfigs() {
  if (!fs.existsSync(CONFIG_FILE)) return {}
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
  } catch {
    return {}
  }
}

function saveConfigs(configs) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2))
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * @param {string|null} agentArg - agent name from CLI arg, or null for interactive
 */
async function runSetup(agentArg) {
  await promptMissingApiKeys()

  const model = resolveModel()
  const configs = loadConfigs()

  let agentFile
  let agentName

  if (agentArg) {
    // Direct mode: agent name given via CLI
    agentFile = findAgentFile(agentArg)
    agentName = agentArg
  } else {
    // Interactive: let user pick
    const agentFiles = listAgentFiles()
    if (agentFiles.length === 0) {
      throw new Error(`No .md agent files found in ${AGENTS_DIR}`)
    }
    const { chosen } = await inquirer.prompt([{
      type: 'list',
      name: 'chosen',
      message: 'Which agent do you want to clone?',
      choices: agentFiles.map(f => ({ name: path.basename(f, '.md'), value: f })),
    }])
    agentFile = chosen
    agentName = path.basename(chosen, '.md')
  }

  // Check if this agent already has a saved voice ID
  const savedVoiceId = configs[agentName]?.voiceId
  let voiceId

  if (savedVoiceId) {
    if (agentArg) {
      // Non-interactive: use saved voice ID directly
      voiceId = savedVoiceId
    } else {
      const { reuse } = await inquirer.prompt([{
        type: 'confirm',
        name: 'reuse',
        message: `Use saved ElevenLabs voice ID for "${agentName}"? (${savedVoiceId})`,
        default: true,
      }])
      voiceId = reuse ? savedVoiceId : await promptVoiceId()
    }
  } else {
    voiceId = await promptVoiceId()
  }

  // Save updated config
  configs[agentName] = { voiceId }
  saveConfigs(configs)

  // Preview system prompt (interactive mode only)
  const { systemPrompt } = parseAgentFile(agentFile)
  if (!agentArg) {
    console.log('\n--- System prompt preview (first 300 chars) ---')
    console.log(systemPrompt.slice(0, 300) + (systemPrompt.length > 300 ? '...' : ''))
    console.log(`---\nModel: ${model}\n`)

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Looks good? Start the server.',
      default: true,
    }])
    if (!confirm) process.exit(0)
  } else {
    console.log(`[setup] Agent: ${agentName} | Model: ${model}`)
  }

  return {
    agentFile,
    agentName,
    systemPrompt,
    voiceId,
    model,
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveModel() {
  const model = process.env.OPENROUTER_MODEL
  if (!model) {
    throw new Error(
      'OPENROUTER_MODEL is not set in .env\n' +
      'Example: OPENROUTER_MODEL=anthropic/claude-sonnet-4-5'
    )
  }
  return model
}

async function promptVoiceId() {
  const { voiceId } = await inquirer.prompt([{
    type: 'input',
    name: 'voiceId',
    message: 'ElevenLabs Voice ID (from elevenlabs.io → Voices):',
    validate: v => v.trim().length > 0 || 'Voice ID is required',
  }])
  return voiceId.trim()
}

async function promptMissingApiKeys() {
  const questions = []

  if (!process.env.OPENROUTER_API_KEY) {
    questions.push({ type: 'input', name: 'openrouterKey', message: 'OpenRouter API key:' })
  }
  if (!process.env.OPENAI_API_KEY) {
    questions.push({ type: 'input', name: 'openaiKey', message: 'OpenAI API key (Whisper STT):' })
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    questions.push({ type: 'input', name: 'elevenLabsKey', message: 'ElevenLabs API key:' })
  }
  if (!process.env.NGROK_AUTHTOKEN) {
    questions.push({
      type: 'input',
      name: 'ngrokToken',
      message: 'ngrok auth token (leave blank to use local HTTP — mic may not work):',
    })
  }

  if (questions.length === 0) return

  const answers = await inquirer.prompt(questions)
  if (answers.openrouterKey) process.env.OPENROUTER_API_KEY = answers.openrouterKey.trim()
  if (answers.openaiKey) process.env.OPENAI_API_KEY = answers.openaiKey.trim()
  if (answers.elevenLabsKey) process.env.ELEVENLABS_API_KEY = answers.elevenLabsKey.trim()
  if (answers.ngrokToken && answers.ngrokToken.trim()) {
    process.env.NGROK_AUTHTOKEN = answers.ngrokToken.trim()
  }
}

module.exports = { runSetup }
