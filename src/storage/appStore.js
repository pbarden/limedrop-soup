import { getComponentById } from '../data/componentLibrary'
import { resolveType } from '../runtime/executors'

/**
 * Single source of truth for user-built apps.
 *
 * Replaces three keys that never agreed with each other:
 *   chaiq-built-apps     - written by the original basic builder
 *   chaiq-enhanced-apps  - written by the enhanced builder, read by nothing
 *   chaiq-apps           - install flags, read by the app manager
 *
 * Legacy data is migrated on first load and the old keys are left in place
 * (renamed with a .backup suffix) so nothing is destroyed.
 */

const APPS_KEY = 'limedrop-apps'
const MIGRATION_FLAG = 'limedrop-apps-migrated'

const LEGACY_BUILT = 'chaiq-built-apps'
const LEGACY_ENHANCED = 'chaiq-enhanced-apps'
const LEGACY_INSTALLED = 'chaiq-apps'

// Subscribers are notified whenever the app list changes, so the desktop and
// dock update as soon as an app is installed, renamed, or deleted.
const listeners = new Set()

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  const apps = listApps()
  listeners.forEach(listener => {
    try {
      listener(apps)
    } catch {
      // A broken subscriber must not break the write that triggered it.
    }
  })
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function slugify(name) {
  return String(name || 'app')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'app'
}

function defaultPorts(type) {
  const definition = getComponentById(resolveType(type) || type)
  return {
    input: definition?.inputs?.[0] || 'input',
    output: definition?.outputs?.[0] || 'output'
  }
}

/**
 * The basic builder stored an ordered list with no connections, and the old
 * runner "executed" them top to bottom. Preserve that intent by wiring each
 * component to the next.
 */
function chainComponents(components) {
  const connections = []

  for (let i = 0; i < components.length - 1; i++) {
    const from = components[i]
    const to = components[i + 1]

    connections.push({
      id: `migrated-${from.id}-${to.id}`,
      from: from.id,
      fromPort: defaultPorts(from.type).output,
      to: to.id,
      toPort: defaultPorts(to.type).input
    })
  }

  return connections
}

/** Bring any stored shape up to the current app schema. */
export function normalizeApp(app, { chainIfUnconnected = false } = {}) {
  const components = (app.components || []).map((component, index) => ({
    id: component.id || `comp-${index}-${Math.random().toString(36).slice(2, 9)}`,
    type: component.type,
    name: component.name || component.type,
    config: component.config || {},
    position: component.position || { x: 60 + index * 40, y: 60 + index * 120 },
    size: component.size || { width: 280, height: 120 }
  }))

  let connections = app.connections || []
  if (chainIfUnconnected && connections.length === 0 && components.length > 1) {
    connections = chainComponents(components)
  }

  const now = new Date().toISOString()

  return {
    id: app.id || `app-${slugify(app.name)}-${Date.now()}`,
    name: app.name || 'Untitled App',
    description: app.description || '',
    icon: app.icon || 'fas fa-rocket',
    version: app.version || '1.0.0',
    installed: app.installed !== false,
    components,
    connections,
    metadata: {
      created: app.metadata?.created || app.created || now,
      modified: app.metadata?.modified || app.lastModified || now,
      author: app.metadata?.author || 'Current User'
    }
  }
}

function migrateLegacyApps() {
  if (localStorage.getItem(MIGRATION_FLAG)) return []

  const migrated = []

  // Basic-builder apps were sequential, so give them a chain of connections.
  for (const app of readJson(LEGACY_BUILT, [])) {
    migrated.push(normalizeApp(app, { chainIfUnconnected: true }))
  }

  // Enhanced-builder apps already carry their own connections.
  for (const app of readJson(LEGACY_ENHANCED, [])) {
    migrated.push(normalizeApp(app))
  }

  // Preserve the old data rather than deleting it.
  for (const key of [LEGACY_BUILT, LEGACY_ENHANCED, LEGACY_INSTALLED]) {
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      localStorage.setItem(`${key}.backup`, raw)
      localStorage.removeItem(key)
    }
  }

  localStorage.setItem(MIGRATION_FLAG, new Date().toISOString())

  if (migrated.length > 0) {
    localStorage.setItem(APPS_KEY, JSON.stringify(migrated))
  }

  return migrated
}

export function listApps() {
  migrateLegacyApps()
  return readJson(APPS_KEY, []).map(app => normalizeApp(app))
}

/** Apps the user has installed, for the desktop and dock. */
export function listInstalledApps() {
  return listApps().filter(app => app.installed)
}

export function getApp(id) {
  return listApps().find(app => app.id === id) || null
}

export function saveApp(app) {
  const apps = listApps()
  const normalized = normalizeApp({
    ...app,
    metadata: { ...app.metadata, modified: new Date().toISOString() }
  })

  const index = apps.findIndex(existing => existing.id === normalized.id)
  if (index >= 0) {
    apps[index] = normalized
  } else {
    apps.push(normalized)
  }

  localStorage.setItem(APPS_KEY, JSON.stringify(apps))
  notify()
  return normalized
}

export function deleteApp(id) {
  const apps = listApps().filter(app => app.id !== id)
  localStorage.setItem(APPS_KEY, JSON.stringify(apps))
  notify()
  return apps
}

export function setInstalled(id, installed) {
  const apps = listApps().map(app =>
    app.id === id ? { ...app, installed } : app
  )
  localStorage.setItem(APPS_KEY, JSON.stringify(apps))
  notify()
  return apps
}

/** Window id used to launch a built app. */
export function appWindowId(appId) {
  return `built:${appId}`
}

export function parseAppWindowId(windowAppId) {
  return windowAppId?.startsWith('built:') ? windowAppId.slice('built:'.length) : null
}
