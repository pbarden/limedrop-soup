import { runTextOperation, complete } from './aiClient'
import { parseFormat, serializeFormat } from './formats'

/**
 * An executor receives:
 *   config   - the component's resolved property values
 *   inputs   - { [inputPortName]: value } gathered from incoming connections
 *   runtime  - { getValue(componentId) } for user-supplied source values
 *   signal   - AbortSignal for cancelling in-flight work
 *
 * and returns { outputs: { [outputPortName]: value }, display? }.
 * `display` is what the runner renders for this node; `outputs` is what flows
 * downstream. Throwing marks the node failed and blocks its dependents.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/[^\s]+$/i
const PHONE_RE = /^\+?[\d\s().-]{7,}$/

function validateText(value, rule, customPattern) {
  if (!rule || rule === 'none') return []
  if (!value) return []

  switch (rule) {
    case 'email':
      return EMAIL_RE.test(value) ? [] : ['Not a valid email address']
    case 'phone':
      return PHONE_RE.test(value) ? [] : ['Not a valid phone number']
    case 'url':
      return URL_RE.test(value) ? [] : ['Not a valid URL']
    case 'custom': {
      if (!customPattern) return []
      try {
        return new RegExp(customPattern).test(value) ? [] : ['Does not match the required pattern']
      } catch {
        return ['Custom validation pattern is not a valid regular expression']
      }
    }
    default:
      return []
  }
}

function formatText(value, style) {
  if (!value || !style || style === 'none') return value

  switch (style) {
    case 'currency': {
      const number = Number(String(value).replace(/[^0-9.-]/g, ''))
      return Number.isFinite(number)
        ? number.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
        : value
    }
    case 'date': {
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
    }
    case 'phone': {
      const digits = String(value).replace(/\D/g, '')
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
      }
      return value
    }
    default:
      return value
  }
}

/** Resolve a dot path like "user.address.city" against a value. */
function getField(data, path) {
  if (!path) return data
  return String(path)
    .split('.')
    .reduce((current, key) => (current == null ? undefined : current[key]), data)
}

function compare(left, operator, right) {
  switch (operator) {
    case '>': return Number(left) > Number(right)
    case '<': return Number(left) < Number(right)
    case '>=': return Number(left) >= Number(right)
    case '<=': return Number(left) <= Number(right)
    case '==': return left == right
    case '===': return left === right
    case '!=': return left != right
    case '!==': return left !== right
    case 'contains': return String(left ?? '').includes(String(right))
    case 'startsWith': return String(left ?? '').startsWith(String(right))
    case 'endsWith': return String(left ?? '').endsWith(String(right))
    case 'isEmpty': return left == null || left === '' ||
      (Array.isArray(left) && left.length === 0)
    default:
      throw new Error(`Unknown condition operator: ${operator}`)
  }
}

/**
 * Run user-authored JS. This is the user's own code executing in their own
 * browser on their own page - the code component exists for exactly this - but
 * it is NOT a sandbox: it has full access to the page. Do not run app
 * definitions from sources you do not trust.
 */
function runUserCode(code, args) {
  const names = Object.keys(args)
  const fn = new Function(...names, `"use strict";\n${code}`)
  return fn(...names.map(name => args[name]))
}

function firstDefined(inputs, ...names) {
  for (const name of names) {
    if (inputs[name] !== undefined) return inputs[name]
  }
  return undefined
}

export const executors = {
  'smart-text-input': async ({ config, runtime, componentId }) => {
    const raw = runtime.getValue(componentId) ?? ''
    const errors = validateText(raw, config.validation, config.customPattern)

    if (config.required && !String(raw).trim()) {
      errors.push('This field is required')
    }
    if (config.maxLength && String(raw).length > Number(config.maxLength)) {
      errors.push(`Exceeds the ${config.maxLength} character limit`)
    }

    const value = formatText(raw, config.formatting)

    return {
      outputs: {
        text_value: value,
        is_valid: errors.length === 0,
        validation_errors: errors
      },
      display: { kind: 'text', value, errors }
    }
  },

  'file-dropzone': async ({ runtime, componentId }) => {
    // Files are read to text/data URLs by the runner before execution.
    const files = runtime.getValue(componentId) ?? []
    return {
      outputs: {
        uploaded_files: files,
        upload_progress: files.length ? 100 : 0,
        upload_errors: []
      },
      display: { kind: 'files', value: files }
    }
  },

  'data-table-input': async ({ config, runtime, componentId }) => {
    const rows = runtime.getValue(componentId) ?? []
    const columns = Array.isArray(config.columns) ? config.columns : []

    // Flag cells that do not match their column's declared type.
    const errors = []
    rows.forEach((row, index) => {
      columns.forEach(column => {
        const value = row?.[column.name]
        if (column.type === 'number' && value !== '' && value != null &&
            !Number.isFinite(Number(value))) {
          errors.push(`Row ${index + 1}: "${column.name}" is not a number`)
        }
      })
    })

    return {
      outputs: {
        table_data: rows,
        selected_rows: [],
        validation_errors: errors
      },
      display: { kind: 'table', value: rows, errors }
    }
  },

  'ai-text-processor': async ({ config, inputs, signal }) => {
    const input = firstDefined(inputs, 'text_input', 'input', 'text')
    const text = typeof input === 'string' ? input : JSON.stringify(input ?? '')

    const operations = Array.isArray(config.operations)
      ? config.operations
      : [config.operations || 'sentiment']

    const results = {}
    const metadata = { operations: [], usage: { input_tokens: 0, output_tokens: 0 } }
    let lowestConfidence = 1

    for (const operation of operations) {
      const { result, usage, model } = await runTextOperation({
        operation,
        text,
        config,
        signal
      })

      results[operation] = result

      const confidence = typeof result.confidence === 'number' ? result.confidence : 1
      lowestConfidence = Math.min(lowestConfidence, confidence)

      metadata.operations.push({ operation, model, confidence })
      metadata.usage.input_tokens += usage?.input_tokens ?? 0
      metadata.usage.output_tokens += usage?.output_tokens ?? 0
    }

    const threshold = Number(config.confidenceThreshold ?? 0)
    if (threshold && lowestConfidence < threshold) {
      metadata.belowThreshold = true
    }

    // The primary text output favours whichever operation produced prose.
    const processed =
      results.summarization?.summary ??
      results.translation?.translation ??
      results

    return {
      outputs: {
        processed_text: processed,
        confidence_score: lowestConfidence,
        metadata
      },
      display: { kind: 'json', value: results }
    }
  },

  'ai-prompt': async ({ config, inputs, signal }) => {
    const input = firstDefined(inputs, 'input', 'text_input', 'text') ?? ''
    const template = config.prompt || '{{input}}'
    const prompt = template.replace(/\{\{\s*input\s*\}\}/g, String(input))

    const { text, usage, model } = await complete({
      prompt,
      system: config.system,
      model: config.model,
      effort: config.effort || 'medium',
      maxTokens: Number(config.maxTokens) || 4096,
      signal
    })

    return {
      outputs: { output: text, result: text, metadata: { usage, model } },
      display: { kind: 'markdown', value: text }
    }
  },

  'data-transformer': async ({ config, inputs }) => {
    const raw = firstDefined(inputs, 'raw_data', 'input', 'data')
    const errors = []

    let parsed
    try {
      parsed = parseFormat(raw, config.inputFormat || 'json')
    } catch (error) {
      if (config.errorHandling === 'strict') throw error
      errors.push(`Parse failed: ${error.message}`)
      parsed = raw
    }

    let transformed = parsed
    if (config.transformationRules?.trim()) {
      try {
        transformed = runUserCode(config.transformationRules, { data: parsed })
      } catch (error) {
        if (config.errorHandling !== 'ignore') {
          if (config.errorHandling === 'strict') {
            throw new Error(`Transform failed: ${error.message}`)
          }
          errors.push(`Transform failed: ${error.message}`)
        }
      }
    }

    // "json" means the structured JS value, so it travels downstream as-is.
    // The text formats (csv/xml/yaml/custom) are serialized to a string.
    let output = transformed
    const textFormats = ['csv', 'xml', 'yaml', 'custom']
    if (textFormats.includes(config.outputFormat)) {
      try {
        output = serializeFormat(transformed, config.outputFormat)
      } catch (error) {
        if (config.errorHandling === 'strict') throw error
        errors.push(`Serialize failed: ${error.message}`)
      }
    }

    const valid = config.validateOutput ? output !== undefined && output !== null : true

    return {
      outputs: {
        transformed_data: output,
        validation_results: { valid, checkedAt: new Date().toISOString() },
        processing_errors: errors
      },
      display: { kind: 'json', value: output }
    }
  },

  'workflow-condition': async ({ config, inputs }) => {
    const data = firstDefined(inputs, 'input_data', 'input', 'data')

    let passed
    if (config.customLogic?.trim()) {
      passed = Boolean(runUserCode(config.customLogic, { data }))
    } else {
      const conditions = Array.isArray(config.conditions) ? config.conditions : []
      const results = conditions.map(condition =>
        compare(getField(data, condition.field), condition.operator, condition.value)
      )

      switch (config.logicalOperator || 'AND') {
        case 'OR':
          passed = results.some(Boolean)
          break
        case 'NOT':
          passed = !results.some(Boolean)
          break
        default:
          passed = results.every(Boolean)
      }
    }

    if (!passed && config.fallbackBehavior === 'error') {
      throw new Error('Condition evaluated false and fallback behaviour is "error"')
    }

    return {
      outputs: {
        condition_result: passed,
        matched_data: passed ? data : null,
        failed_data: passed ? null : data
      },
      // A false gate with fallbackBehavior "stop" prunes everything downstream.
      halt: !passed && config.fallbackBehavior === 'stop',
      display: { kind: 'boolean', value: passed }
    }
  },

  'advanced-chart': async ({ config, inputs }) => {
    const data = firstDefined(inputs, 'chart_data', 'input', 'data') ?? []
    const series = Array.isArray(data) ? data : [data]

    return {
      outputs: {
        user_interactions: [],
        selected_data: series,
        chart_events: []
      },
      display: { kind: 'chart', value: series, chartType: config.chartType || 'bar' }
    }
  },

  'smart-dashboard': async ({ config, inputs }) => {
    const data = firstDefined(inputs, 'dashboard_data', 'input', 'data') ?? {}
    return {
      outputs: {
        widget_interactions: [],
        layout_changes: [],
        user_actions: []
      },
      display: { kind: 'dashboard', value: data, config }
    }
  }
}

/**
 * Components saved by the original basic builder use short type names. Map them
 * onto the real implementations so existing saved apps keep running.
 */
export const LEGACY_TYPE_ALIASES = {
  'text-input': 'smart-text-input',
  'file-upload': 'file-dropzone',
  'data-transform': 'data-transformer',
  'chart': 'advanced-chart',
  'display': 'display',
  'export': 'export'
}

// Display and export have no advanced equivalent, so implement them directly.
executors.display = async ({ inputs }) => {
  const value = firstDefined(inputs, 'input', 'data', 'text_input')
  return {
    outputs: { output: value },
    display: { kind: typeof value === 'string' ? 'markdown' : 'json', value }
  }
}

executors.export = async ({ config, inputs }) => {
  const value = firstDefined(inputs, 'input', 'data')
  const format = config.format || 'json'
  const serialized = serializeFormat(value, format)

  return {
    outputs: { output: serialized },
    display: { kind: 'export', value: serialized, format, filename: config.filename || 'export' }
  }
}

export function resolveType(type) {
  if (executors[type]) return type
  const alias = LEGACY_TYPE_ALIASES[type]
  if (alias && executors[alias]) return alias
  return null
}

export function getExecutor(type) {
  const resolved = resolveType(type)
  return resolved ? executors[resolved] : null
}

/** Component types that take their value from the user rather than a connection. */
export const SOURCE_TYPES = new Set([
  'smart-text-input',
  'file-dropzone',
  'data-table-input'
])
