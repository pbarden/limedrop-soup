import Anthropic from '@anthropic-ai/sdk'

// User-supplied credentials live in localStorage. This is a single-user
// personal-workspace model: the key never leaves the browser, but it is also
// readable by anything running on this origin. See Settings > AI.
const CREDENTIALS_KEY = 'limedrop-ai-credentials'

export const DEFAULT_MODEL = 'claude-opus-5'

export const AVAILABLE_MODELS = [
  { id: 'claude-opus-5', name: 'Claude Opus 5', note: 'Most capable. $5/$25 per Mtok.' },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', note: 'Faster and cheaper. $2/$10 per Mtok.' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', note: 'Fastest. $1/$5 per Mtok.' }
]

export const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max']

export function getCredentials() {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY)
    if (!raw) return { apiKey: '', model: DEFAULT_MODEL }
    const parsed = JSON.parse(raw)
    return { apiKey: parsed.apiKey || '', model: parsed.model || DEFAULT_MODEL }
  } catch {
    return { apiKey: '', model: DEFAULT_MODEL }
  }
}

export function setCredentials({ apiKey, model }) {
  const current = getCredentials()
  const next = {
    apiKey: apiKey !== undefined ? apiKey : current.apiKey,
    model: model !== undefined ? model : current.model
  }
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(next))
  return next
}

export function clearCredentials() {
  localStorage.removeItem(CREDENTIALS_KEY)
}

export function hasApiKey() {
  return Boolean(getCredentials().apiKey)
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('No Anthropic API key configured. Add one in Settings > AI.')
    this.name = 'MissingApiKeyError'
  }
}

function createClient() {
  const { apiKey } = getCredentials()
  if (!apiKey) throw new MissingApiKeyError()

  // dangerouslyAllowBrowser sends the anthropic-dangerous-direct-browser-access
  // header so the request clears CORS. Acceptable here because the key is the
  // user's own and never leaves their machine.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

/**
 * Pull the first JSON value out of a model response, tolerating code fences
 * and surrounding prose. Returns null when nothing parses.
 */
export function extractJson(text) {
  if (!text) return null

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidates = [fenced?.[1], text].filter(Boolean)

  for (const candidate of candidates) {
    const trimmed = candidate.trim()
    try {
      return JSON.parse(trimmed)
    } catch {
      // Fall back to locating the outermost brace/bracket pair.
      const start = trimmed.search(/[[{]/)
      if (start === -1) continue
      const opener = trimmed[start]
      const closer = opener === '{' ? '}' : ']'
      const end = trimmed.lastIndexOf(closer)
      if (end <= start) continue
      try {
        return JSON.parse(trimmed.slice(start, end + 1))
      } catch {
        continue
      }
    }
  }
  return null
}

function textFromResponse(response) {
  return response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
}

/**
 * Single Messages API call. Returns { text, usage, stopReason, model }.
 */
export async function complete({
  prompt,
  system,
  model,
  effort = 'medium',
  maxTokens = 4096,
  signal
}) {
  const client = createClient()
  const { model: defaultModel } = getCredentials()

  const response = await client.messages.create(
    {
      model: model || defaultModel || DEFAULT_MODEL,
      max_tokens: maxTokens,
      output_config: { effort },
      ...(system ? { system } : {}),
      messages: [{ role: 'user', content: prompt }]
    },
    signal ? { signal } : undefined
  )

  if (response.stop_reason === 'refusal') {
    const detail = response.stop_details?.explanation || 'the request was declined'
    throw new Error(`Claude declined this request: ${detail}`)
  }

  return {
    text: textFromResponse(response),
    usage: response.usage,
    stopReason: response.stop_reason,
    model: response.model
  }
}

// --- Named text operations used by the AI Text Processor component -------

const OPERATION_SPECS = {
  sentiment: {
    system:
      'You are a sentiment analysis engine. Respond with JSON only, no prose, ' +
      'matching: {"label": "positive"|"negative"|"neutral"|"mixed", ' +
      '"score": <number between -1 and 1>, "confidence": <number between 0 and 1>, ' +
      '"rationale": "<one short sentence>"}',
    buildPrompt: (text) => `Analyze the sentiment of the following text:\n\n${text}`,
    parse: (raw) => extractJson(raw) || { label: 'unknown', score: 0, confidence: 0, rationale: raw }
  },

  summarization: {
    system:
      'You are a summarization engine. Respond with JSON only, no prose, matching: ' +
      '{"summary": "<the summary>", "confidence": <number between 0 and 1>}',
    buildPrompt: (text) =>
      `Summarize the following text concisely, preserving the key facts:\n\n${text}`,
    parse: (raw) => extractJson(raw) || { summary: raw, confidence: 0.5 }
  },

  translation: {
    system:
      'You are a translation engine. Respond with JSON only, no prose, matching: ' +
      '{"translation": "<translated text>", "detectedLanguage": "<ISO 639-1 code>", ' +
      '"confidence": <number between 0 and 1>}',
    buildPrompt: (text, config) => {
      const target = config.targetLanguage && config.targetLanguage !== 'auto'
        ? config.targetLanguage
        : 'en'
      return `Translate the following text into ${target}:\n\n${text}`
    },
    parse: (raw) => extractJson(raw) || { translation: raw, detectedLanguage: 'unknown', confidence: 0.5 }
  },

  keywords: {
    system:
      'You are a keyword extraction engine. Respond with JSON only, no prose, matching: ' +
      '{"keywords": [{"term": "<term>", "relevance": <number between 0 and 1>}], ' +
      '"confidence": <number between 0 and 1>}',
    buildPrompt: (text) => `Extract the most important keywords from the following text:\n\n${text}`,
    parse: (raw) => extractJson(raw) || { keywords: [], confidence: 0 }
  },

  entities: {
    system:
      'You are a named entity recognition engine. Respond with JSON only, no prose, matching: ' +
      '{"entities": [{"text": "<entity>", "type": "person"|"organization"|"location"|"date"|"other", ' +
      '"confidence": <number between 0 and 1>}], "confidence": <number between 0 and 1>}',
    buildPrompt: (text) => `Extract all named entities from the following text:\n\n${text}`,
    parse: (raw) => extractJson(raw) || { entities: [], confidence: 0 }
  }
}

export const SUPPORTED_OPERATIONS = Object.keys(OPERATION_SPECS)

/**
 * Run one named text operation. Returns the parsed result plus usage.
 */
export async function runTextOperation({ operation, text, config = {}, signal }) {
  const spec = OPERATION_SPECS[operation]
  if (!spec) throw new Error(`Unknown AI operation: ${operation}`)
  if (!text || !String(text).trim()) throw new Error(`"${operation}" received no input text`)

  const { text: raw, usage, model } = await complete({
    prompt: spec.buildPrompt(String(text), config),
    system: spec.system,
    model: config.model,
    effort: config.effort || 'medium',
    maxTokens: config.maxTokens || 4096,
    signal
  })

  return { result: spec.parse(raw), raw, usage, model }
}
