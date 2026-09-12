import { load as yamlLoad, dump as yamlDump } from 'js-yaml'

/**
 * Parse/serialize the data formats offered by the Data Transformer component.
 * Everything funnels through plain JS values in between.
 */

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      // Treat \r\n as one break.
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  if (rows.length === 0) return []

  const [header, ...body] = rows
  return body
    .filter(cells => cells.some(cell => cell !== ''))
    .map(cells => {
      const record = {}
      header.forEach((name, index) => {
        record[name] = cells[index] ?? ''
      })
      return record
    })
}

export function serializeCsv(data) {
  const rows = Array.isArray(data) ? data : [data]
  if (rows.length === 0) return ''

  const headers = [...new Set(rows.flatMap(row => Object.keys(row ?? {})))]

  const escape = (value) => {
    const str = value === null || value === undefined ? '' : String(value)
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }

  return [
    headers.join(','),
    ...rows.map(row => headers.map(header => escape(row?.[header])).join(','))
  ].join('\n')
}

function xmlNodeToValue(node) {
  const elements = Array.from(node.children)

  if (elements.length === 0) {
    return node.textContent
  }

  const result = {}
  for (const child of elements) {
    const value = xmlNodeToValue(child)
    if (child.tagName in result) {
      if (!Array.isArray(result[child.tagName])) {
        result[child.tagName] = [result[child.tagName]]
      }
      result[child.tagName].push(value)
    } else {
      result[child.tagName] = value
    }
  }
  return result
}

export function parseXml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  const error = doc.querySelector('parsererror')
  if (error) throw new Error(`Invalid XML: ${error.textContent.trim()}`)
  return xmlNodeToValue(doc.documentElement)
}

function valueToXml(value, tagName) {
  if (Array.isArray(value)) {
    return value.map(item => valueToXml(item, tagName)).join('')
  }
  if (value !== null && typeof value === 'object') {
    const inner = Object.entries(value)
      .map(([key, child]) => valueToXml(child, key))
      .join('')
    return `<${tagName}>${inner}</${tagName}>`
  }
  const escaped = String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<${tagName}>${escaped}</${tagName}>`
}

export function serializeXml(data) {
  return `<?xml version="1.0" encoding="UTF-8"?>${valueToXml(data, 'root')}`
}

export function parseFormat(text, format) {
  if (typeof text !== 'string') return text // Already structured upstream.

  switch (format) {
    case 'json':
      return JSON.parse(text)
    case 'csv':
      return parseCsv(text)
    case 'yaml':
      return yamlLoad(text)
    case 'xml':
      return parseXml(text)
    case 'custom':
      return text
    default:
      throw new Error(`Unsupported input format: ${format}`)
  }
}

export function serializeFormat(data, format) {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2)
    case 'csv':
      return serializeCsv(data)
    case 'yaml':
      return yamlDump(data)
    case 'xml':
      return serializeXml(data)
    case 'custom':
      return typeof data === 'string' ? data : JSON.stringify(data)
    default:
      throw new Error(`Unsupported output format: ${format}`)
  }
}
