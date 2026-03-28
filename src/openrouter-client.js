const { OpenAI } = require('openai')

async function chat({ systemPrompt, history, model }) {
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/clone-talking',
      'X-Title': 'Clone Talking',
    },
  })
  // Cap history to last 20 messages to stay within token limits
  const trimmed = history.slice(-20)

  const response = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      ...trimmed,
    ],
  })

  return response.choices[0].message.content
}

module.exports = { chat }
