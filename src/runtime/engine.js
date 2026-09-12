import { getComponentById } from '../data/componentLibrary'
import { getExecutor, resolveType, SOURCE_TYPES } from './executors'

/**
 * Dataflow engine for user-built apps.
 *
 * An app is a directed graph of components joined by connections:
 *   connection = { id, from: componentId, fromPort, to: componentId, toPort }
 *
 * Execution runs in dependency order. Nodes with no unmet dependencies run
 * concurrently as a level; each level awaits before the next begins, so a node
 * always sees finished upstream values.
 */

export const NODE_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
  SKIPPED: 'skipped'
}

/** Merge component-library property defaults under the user's saved config. */
export function resolveConfig(component) {
  const definition = getComponentById(resolveType(component.type) || component.type)
  const defaults = {}

  if (definition?.properties) {
    for (const [key, spec] of Object.entries(definition.properties)) {
      if (spec.default !== undefined) defaults[key] = spec.default
    }
  }

  return { ...defaults, ...(component.config || {}) }
}

/**
 * Order components so every node follows its dependencies (Kahn's algorithm).
 * Returns levels of concurrently-runnable nodes, plus any nodes trapped in a
 * cycle.
 */
export function planExecution(components, connections) {
  const ids = new Set(components.map(c => c.id))
  const edges = connections.filter(conn => ids.has(conn.from) && ids.has(conn.to))

  const indegree = new Map(components.map(c => [c.id, 0]))
  const dependents = new Map(components.map(c => [c.id, []]))

  for (const edge of edges) {
    // Parallel edges between the same pair each count, so a node waits for all.
    indegree.set(edge.to, indegree.get(edge.to) + 1)
    dependents.get(edge.from).push(edge.to)
  }

  const levels = []
  const remaining = new Map(indegree)
  let frontier = components.filter(c => remaining.get(c.id) === 0).map(c => c.id)

  while (frontier.length > 0) {
    levels.push(frontier)
    const next = []

    for (const id of frontier) {
      for (const dependent of dependents.get(id)) {
        const degree = remaining.get(dependent) - 1
        remaining.set(dependent, degree)
        if (degree === 0) next.push(dependent)
      }
    }
    frontier = next
  }

  const ordered = new Set(levels.flat())
  const cyclic = components.filter(c => !ordered.has(c.id)).map(c => c.id)

  return { levels, cyclic, edges }
}

/**
 * Static validation, so the builder can surface problems before a run.
 * Returns an array of { severity, componentId?, message }.
 */
export function validateApp(app) {
  const issues = []
  const components = app.components || []
  const connections = app.connections || []

  if (components.length === 0) {
    issues.push({ severity: 'error', message: 'This app has no components yet.' })
    return issues
  }

  for (const component of components) {
    if (!resolveType(component.type)) {
      issues.push({
        severity: 'error',
        componentId: component.id,
        message: `"${component.name || component.type}" has no runtime implementation.`
      })
    }
  }

  const { cyclic } = planExecution(components, connections)
  for (const id of cyclic) {
    const component = components.find(c => c.id === id)
    issues.push({
      severity: 'error',
      componentId: id,
      message: `"${component?.name || id}" is part of a connection cycle and cannot run.`
    })
  }

  // Nodes that consume input but have nothing wired in.
  const wiredTargets = new Set(connections.map(conn => conn.to))
  for (const component of components) {
    const type = resolveType(component.type)
    if (!type || SOURCE_TYPES.has(type)) continue

    const definition = getComponentById(type)
    if (definition?.inputs?.length && !wiredTargets.has(component.id)) {
      issues.push({
        severity: 'warning',
        componentId: component.id,
        message: `"${component.name || type}" has no input connected.`
      })
    }
  }

  return issues
}

/**
 * Execute the app graph.
 *
 * @param app      { components, connections }
 * @param values   { [componentId]: userValue } for source components
 * @param onEvent  called with progress events as the run proceeds
 * @param signal   AbortSignal to cancel in-flight AI calls
 * @returns { status, results, issues }
 */
export async function runApp(app, { values = {}, onEvent = () => {}, signal } = {}) {
  const components = app.components || []
  const connections = app.connections || []
  const byId = new Map(components.map(c => [c.id, c]))

  const { levels, cyclic, edges } = planExecution(components, connections)

  const incoming = new Map(components.map(c => [c.id, []]))
  for (const edge of edges) incoming.get(edge.to).push(edge)

  const dependents = new Map(components.map(c => [c.id, []]))
  for (const edge of edges) dependents.get(edge.from).push(edge.to)

  const results = new Map()
  const runtime = { getValue: (componentId) => values[componentId] }

  onEvent({ type: 'run-start', total: components.length })

  for (const id of cyclic) {
    results.set(id, {
      status: NODE_STATUS.ERROR,
      error: 'Part of a connection cycle — cannot determine an execution order.'
    })
    onEvent({ type: 'node-error', componentId: id, error: 'Connection cycle' })
  }

  /** Mark a node and everything downstream of it as skipped. */
  const skipDescendants = (rootId, reason) => {
    const queue = [...dependents.get(rootId)]
    const seen = new Set()

    while (queue.length > 0) {
      const id = queue.shift()
      if (seen.has(id) || results.has(id)) continue
      seen.add(id)
      results.set(id, { status: NODE_STATUS.SKIPPED, reason })
      onEvent({ type: 'node-skipped', componentId: id, reason })
      queue.push(...dependents.get(id))
    }
  }

  for (const level of levels) {
    if (signal?.aborted) break

    await Promise.all(level.map(async (id) => {
      if (results.has(id)) return // Already skipped by an upstream failure.

      const component = byId.get(id)
      const executor = getExecutor(component.type)

      if (!executor) {
        const error = `No runtime implementation for type "${component.type}"`
        results.set(id, { status: NODE_STATUS.ERROR, error })
        onEvent({ type: 'node-error', componentId: id, error })
        skipDescendants(id, 'an upstream component failed')
        return
      }

      // Gather upstream values onto this node's input ports.
      const inputs = {}
      for (const edge of incoming.get(id)) {
        const upstream = results.get(edge.from)
        if (upstream?.status === NODE_STATUS.SUCCESS) {
          inputs[edge.toPort] = upstream.outputs?.[edge.fromPort]
        }
      }

      onEvent({ type: 'node-start', componentId: id, name: component.name })
      results.set(id, { status: NODE_STATUS.RUNNING })

      const startedAt = performance.now()
      try {
        const output = await executor({
          config: resolveConfig(component),
          inputs,
          runtime,
          componentId: id,
          signal
        })

        results.set(id, {
          status: NODE_STATUS.SUCCESS,
          outputs: output.outputs || {},
          display: output.display,
          durationMs: Math.round(performance.now() - startedAt)
        })

        onEvent({
          type: 'node-success',
          componentId: id,
          name: component.name,
          outputs: output.outputs,
          durationMs: Math.round(performance.now() - startedAt)
        })

        if (output.halt) {
          skipDescendants(id, 'a condition gate stopped the branch')
        }
      } catch (error) {
        results.set(id, {
          status: NODE_STATUS.ERROR,
          error: error.message,
          durationMs: Math.round(performance.now() - startedAt)
        })
        onEvent({
          type: 'node-error',
          componentId: id,
          name: component.name,
          error: error.message
        })
        skipDescendants(id, 'an upstream component failed')
      }
    }))
  }

  const failed = [...results.values()].filter(r => r.status === NODE_STATUS.ERROR)
  const status = signal?.aborted ? 'cancelled' : failed.length > 0 ? 'failed' : 'succeeded'

  onEvent({ type: 'run-end', status, failed: failed.length })

  return { status, results, issues: validateApp(app) }
}
