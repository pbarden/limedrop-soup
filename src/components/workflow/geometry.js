import { getComponentById } from '../../data/componentLibrary'
import { resolveType } from '../../runtime/executors'

/**
 * Node and port geometry for the workflow canvas.
 *
 * Every position here is derived arithmetically from a node's stored
 * `position` and its port counts. Nothing is measured from the DOM, which is
 * what the previous connection layer did: it read getBoundingClientRect()
 * during render, so edges drew at (0, 0) on the first paint of a saved app and
 * only corrected themselves if something else happened to trigger a re-render.
 * With fixed geometry the edge layer and the node layer cannot disagree.
 */

export const NODE_WIDTH = 208
export const HEADER_HEIGHT = 34
export const PORT_ROW_HEIGHT = 22
export const PORTS_PADDING = 10
export const PORT_RADIUS = 5

/** The component-library definition behind a placed node, alias-aware. */
export function definitionFor(component) {
  if (!component) return null
  return getComponentById(resolveType(component.type) || component.type) || null
}

export function portsFor(component) {
  const definition = definitionFor(component)
  return {
    inputs: definition?.inputs || [],
    outputs: definition?.outputs || []
  }
}

export function nodeHeight(component) {
  const { inputs, outputs } = portsFor(component)
  const rows = Math.max(inputs.length, outputs.length, 1)
  return HEADER_HEIGHT + PORTS_PADDING * 2 + rows * PORT_ROW_HEIGHT
}

export function nodeRect(component) {
  const x = component.position?.x ?? 0
  const y = component.position?.y ?? 0
  return { x, y, width: NODE_WIDTH, height: nodeHeight(component) }
}

/** Centre of a port, in canvas coordinates. */
export function portPosition(component, portName, direction) {
  const { inputs, outputs } = portsFor(component)
  const list = direction === 'input' ? inputs : outputs
  const index = list.indexOf(portName)
  const rect = nodeRect(component)

  // An unknown port (a connection saved against a port the definition no
  // longer has) anchors to the node's edge midpoint rather than drawing from
  // the origin, so a stale wire stays visible and removable.
  const row = index === -1 ? (list.length - 1) / 2 : index

  return {
    x: direction === 'input' ? rect.x : rect.x + rect.width,
    y: rect.y + HEADER_HEIGHT + PORTS_PADDING + row * PORT_ROW_HEIGHT + PORT_ROW_HEIGHT / 2
  }
}

/** Horizontal bezier between two canvas points. */
export function edgePath(from, to) {
  const distance = Math.abs(to.x - from.x)
  const curve = Math.max(36, Math.min(distance * 0.5, 160))
  return `M ${from.x} ${from.y} C ${from.x + curve} ${from.y}, ${to.x - curve} ${to.y}, ${to.x} ${to.y}`
}

/** Bounding box of every node, used by "fit to view". */
export function contentBounds(components) {
  if (!components.length) return null

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const component of components) {
    const rect = nodeRect(component)
    minX = Math.min(minX, rect.x)
    minY = Math.min(minY, rect.y)
    maxX = Math.max(maxX, rect.x + rect.width)
    maxY = Math.max(maxY, rect.y + rect.height)
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

/**
 * Place a new node so it does not land on top of an existing one. Walks right
 * along a row, then wraps to the next row.
 */
export function nextFreePosition(components, preferred) {
  const COLUMN = NODE_WIDTH + 56
  const ROW = 180
  const start = preferred || { x: 40, y: 40 }

  const collides = (x, y) => components.some(other => {
    const rect = nodeRect(other)
    return Math.abs(rect.x - x) < NODE_WIDTH && Math.abs(rect.y - y) < rect.height
  })

  let { x, y } = start
  for (let attempt = 0; attempt < 60 && collides(x, y); attempt++) {
    x += COLUMN
    if (x > start.x + COLUMN * 3) {
      x = start.x
      y += ROW
    }
  }
  return { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) }
}
