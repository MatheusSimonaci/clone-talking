const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')

// Per-clone config map: { "einstein": { voiceId: "..." }, "sherlock": { voiceId: "..." } }
const CONFIG_FILE = '.voice-config.json'
const CLONES_DIR = path.join('.', 'clones')

// ---------------------------------------------------------------------------
// Clone file parser
// ---------------------------------------------------------------------------

function parseCloneFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')

  // Extract YAML frontmatter between --- delimiters
  const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n?/)
  let id = path.basename(filePath, '.md')
  let name = id
  let description = ''
  let voiceId = ''

  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1]

    const idMatch = frontmatter.match(/^id:\s*(.+)$/m)
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
    const descMatch = frontmatter.match(/^description:\s*(.+)$/m)
    const voiceMatch = frontmatter.match(/^voiceId:\s*(.*)$/m)

    if (idMatch) id = idMatch[1].trim()
    if (nameMatch) name = nameMatch[1].trim()
    if (descMatch) description = descMatch[1].trim()
    if (voiceMatch) voiceId = voiceMatch[1].trim()
  }

  // Everything after the frontmatter block is the system prompt
  const systemPrompt = raw.replace(/^---\n[\s\S]*?\n---\n?/, '').trim()

  return { id, name, description, voiceId, systemPrompt, filePath }
}

function listCloneFiles() {
  if (!fs.existsSync(CLONES_DIR)) return []
  return fs.readdirSync(CLONES_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(CLONES_DIR, f))
}

function findCloneFile(cloneId) {
  const filePath = path.join(CLONES_DIR, `${cloneId}.md`)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Clone file not found: ${filePath}\nRun "npm start" without arguments to see available clones.`)
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
 * @param {string|null} cloneArg - clone id from CLI arg, or null for interactive
 */
async function runSetup(cloneArg) {
  await promptMissingApiKeys()

  const model = resolveModel()
  const configs = loadConfigs()

  let clone

  if (cloneArg) {
    // Direct mode: clone id given via CLI
    const filePath = findCloneFile(cloneArg)
    clone = parseCloneFile(filePath)
  } else {
    // Interactive: let user pick
    const cloneFiles = listCloneFiles()
    if (cloneFiles.length === 0) {
      throw new Error(`No .md clone files found in ${CLONES_DIR}`)
    }
    const clones = cloneFiles.map(f => parseCloneFile(f))
    const { chosenId } = await inquirer.prompt([{
      type: 'list',
      name: 'chosenId',
      message: 'Which clone do you want to talk to?',
      choices: clones.map(c => ({
        name: `${c.name} — ${c.description}`,
        value: c.id,
      })),
    }])
    clone = clones.find(c => c.id === chosenId)
  }

  // Resolve voice ID: saved config overrides frontmatter default
  const savedVoiceId = configs[clone.id]?.voiceId
  const defaultVoiceId = savedVoiceId || clone.voiceId || ''
  let voiceId

  if (defaultVoiceId) {
    if (cloneArg) {
      // Non-interactive: use saved/default voice ID directly
      voiceId = defaultVoiceId
    } else {
      const { reuse } = await inquirer.prompt([{
        type: 'confirm',
        name: 'reuse',
        message: `Use saved Fish Audio voice ID for "${clone.name}"? (${defaultVoiceId})`,
        default: true,
      }])
      voiceId = reuse ? defaultVoiceId : await promptVoiceId()
    }
  } else {
    voiceId = await promptVoiceId()
  }

  // Save updated config (user-entered override keyed by clone id)
  configs[clone.id] = { voiceId }
  saveConfigs(configs)

  // Preview system prompt (interactive mode only)
  if (!cloneArg) {
    console.log('\n--- System prompt preview (first 300 chars) ---')
    console.log(clone.systemPrompt.slice(0, 300) + (clone.systemPrompt.length > 300 ? '...' : ''))
    console.log(`---\nModel: ${model}\n`)

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Looks good? Start the server.',
      default: true,
    }])
    if (!confirm) process.exit(0)
  } else {
    console.log(`[setup] Clone: ${clone.name} | Model: ${model}`)
  }

  return {
    cloneFile: clone.filePath,
    cloneId: clone.id,
    cloneName: clone.name,
    systemPrompt: clone.systemPrompt,
    voiceId,
    model,
    voisparkApiKey: process.env.VOISPARK_API_KEY,
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
    message: 'VoiSpark Voice ID (voice_id from your VoiSpark clone):',
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
  if (!process.env.VOISPARK_API_KEY) {
    questions.push({ type: 'input', name: 'voisparkKey', message: 'VoiSpark API key:' })
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
  if (answers.voisparkKey) process.env.VOISPARK_API_KEY = answers.voisparkKey.trim()
  if (answers.ngrokToken && answers.ngrokToken.trim()) {
    process.env.NGROK_AUTHTOKEN = answers.ngrokToken.trim()
  }
}

module.exports = { runSetup }
