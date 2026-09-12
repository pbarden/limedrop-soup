/**
 * The virtual file system behind the File Manager.
 *
 * Extracted so runtime components can read and write the same files the user
 * sees in the File Manager, rather than each owning a private copy.
 *
 * A file is { id, name, type, content, created, modified }.
 */

const FILES_KEY = 'chaiq-files'

// Subscribers are notified whenever files change, so an open File Manager
// window reflects writes made by a running app.
const listeners = new Set()

function read() {
  try {
    const raw = localStorage.getItem(FILES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(files) {
  localStorage.setItem(FILES_KEY, JSON.stringify(files))
  listeners.forEach(listener => {
    try {
      listener(files)
    } catch {
      // A broken subscriber must not stop the write from completing.
    }
  })
  return files
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function listFiles() {
  return read()
}

export function getFile(idOrName) {
  const files = read()
  return files.find(file => file.id === idOrName) ||
         files.find(file => file.name === idOrName) ||
         null
}

export function saveFiles(files) {
  return write(files)
}

export function createFile({ name, type = 'default', content = '' }) {
  const now = new Date().toISOString()
  const file = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    type,
    content,
    created: now,
    modified: now
  }
  write([...read(), file])
  return file
}

export function updateFile(id, updates) {
  const files = read()
  const index = files.findIndex(file => file.id === id)
  if (index === -1) return null

  const updated = { ...files[index], ...updates, modified: new Date().toISOString() }
  files[index] = updated
  write(files)
  return updated
}

export function deleteFile(id) {
  write(read().filter(file => file.id !== id))
}

/**
 * Write by name: updates the file if one already has that name, otherwise
 * creates it. This is what the File Write component needs - an app that runs
 * twice should overwrite its output rather than pile up duplicates.
 */
export function writeFileByName(name, content, type = 'default') {
  const existing = read().find(file => file.name === name)
  if (existing) {
    return updateFile(existing.id, { content })
  }
  return createFile({ name, type, content })
}
