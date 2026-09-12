import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { componentCategories } from '../../data/componentLibrary'
import {
  NODE_WIDTH,
  HEADER_HEIGHT,
  PORT_ROW_HEIGHT,
  PORTS_PADDING,
  contentBounds,
  definitionFor,
  edgePath,
  nodeHeight,
  portPosition,
  portsFor
} from './geometry'
import styles from './WorkflowCanvas.module.css'

const MIN_ZOOM = 0.3
const MAX_ZOOM = 2
const ZOOM_STEP = 1.15

const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))

/**
 * The workflow canvas: a pannable, zoomable surface holding nodes and the
 * wires between them.
 *
 * Nodes and edges are drawn in one shared coordinate space that lives inside a
 * single transformed element, so a node and the wire attached to it can never
 * drift apart — the browser applies the same pan and zoom to both.
 */
function WorkflowCanvas({
  components,
  connections,
  selectedId,
  issuesByComponent,
  onSelect,
  onMove,
  onRemove,
  onConnectionCreate,
  onConnectionDelete,
  onDropComponent
}) {
  const viewportRef = useRef(null)
  const [view, setView] = useState({ x: 40, y: 40, zoom: 1 })
  const [wire, setWire] = useState(null)
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [isPanning, setIsPanning] = useState(false)
  const [isDropTarget, setIsDropTarget] = useState(false)

  const byId = useMemo(
    () => new Map(components.map(component => [component.id, component])),
    [components]
  )

  /** Client (screen) point -> canvas point. */
  const toCanvas = useCallback((clientX, clientY) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (clientX - rect.left - view.x) / view.zoom,
      y: (clientY - rect.top - view.y) / view.zoom
    }
  }, [view])

  // ---- View controls -------------------------------------------------

  const zoomAround = useCallback((factor, clientX, clientY) => {
    setView(prev => {
      const next = clampZoom(prev.zoom * factor)
      if (next === prev.zoom) return prev

      const rect = viewportRef.current?.getBoundingClientRect()
      // Keep whatever sits under the pointer (or the viewport centre) fixed.
      const px = rect ? clientX - rect.left : 0
      const py = rect ? clientY - rect.top : 0
      const ratio = next / prev.zoom

      return {
        zoom: next,
        x: px - (px - prev.x) * ratio,
        y: py - (py - prev.y) * ratio
      }
    })
  }, [])

  const zoomByButton = useCallback((factor) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    zoomAround(
      factor,
      rect ? rect.left + rect.width / 2 : 0,
      rect ? rect.top + rect.height / 2 : 0
    )
  }, [zoomAround])

  const fitToView = useCallback(() => {
    const rect = viewportRef.current?.getBoundingClientRect()
    const bounds = contentBounds(components)
    if (!rect || !bounds) {
      setView({ x: 40, y: 40, zoom: 1 })
      return
    }

    const padding = 48
    const zoom = clampZoom(Math.min(
      (rect.width - padding * 2) / Math.max(bounds.width, 1),
      (rect.height - padding * 2) / Math.max(bounds.height, 1),
      1
    ))

    setView({
      zoom,
      x: (rect.width - bounds.width * zoom) / 2 - bounds.minX * zoom,
      y: (rect.height - bounds.height * zoom) / 2 - bounds.minY * zoom
    })
  }, [components])

  // Wheel pans, ctrl/cmd+wheel zooms — the convention every node editor uses.
  // Registered natively because React's onWheel is passive and cannot
  // preventDefault the browser's own page zoom.
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleWheel = (event) => {
      event.preventDefault()
      if (event.ctrlKey || event.metaKey) {
        zoomAround(event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, event.clientX, event.clientY)
      } else {
        setView(prev => ({ ...prev, x: prev.x - event.deltaX, y: prev.y - event.deltaY }))
      }
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [zoomAround])

  // ---- Panning -------------------------------------------------------

  const handleViewportPointerDown = useCallback((event) => {
    const onEmptySurface = event.target === event.currentTarget ||
      event.target.dataset.canvasSurface === 'true'
    const withMiddleButton = event.button === 1

    if (!withMiddleButton && !(event.button === 0 && onEmptySurface)) return

    if (onEmptySurface) {
      onSelect?.(null)
      setSelectedEdge(null)
    }

    setIsPanning(true)

    const startX = event.clientX
    const startY = event.clientY
    const origin = { x: view.x, y: view.y }

    const handleMove = (moveEvent) => {
      setView(prev => ({
        ...prev,
        x: origin.x + moveEvent.clientX - startX,
        y: origin.y + moveEvent.clientY - startY
      }))
    }

    const handleUp = () => {
      setIsPanning(false)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }, [view.x, view.y, onSelect])

  // ---- Node dragging -------------------------------------------------

  const startNodeDrag = useCallback((event, component) => {
    if (event.button !== 0) return
    event.stopPropagation()

    const startX = event.clientX
    const startY = event.clientY
    const originX = component.position?.x ?? 0
    const originY = component.position?.y ?? 0
    const zoom = view.zoom

    const handleMove = (moveEvent) => {
      // Divide by zoom: a 10px pointer move at 50% zoom is 20 canvas px.
      onMove?.(component.id, {
        x: Math.max(0, Math.round(originX + (moveEvent.clientX - startX) / zoom)),
        y: Math.max(0, Math.round(originY + (moveEvent.clientY - startY) / zoom))
      })
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }, [onMove, view.zoom])

  // ---- Wiring --------------------------------------------------------

  const startWire = useCallback((event, componentId, port, direction) => {
    event.stopPropagation()
    event.preventDefault()
    if (event.button !== 0) return

    const point = toCanvas(event.clientX, event.clientY)
    setWire({ componentId, port, direction, point })
    setSelectedEdge(null)
  }, [toCanvas])

  const isValidTarget = useCallback((componentId, direction) => {
    if (!wire) return false
    if (wire.componentId === componentId) return false
    return wire.direction !== direction
  }, [wire])

  // Live wire follows the pointer, and lands on whatever port is underneath.
  // Hit-testing on pointerup (rather than relying on the target's own
  // pointerenter) means a drop still registers when the pointer moves fast.
  useEffect(() => {
    if (!wire) return

    const handleMove = (event) => {
      setWire(prev => prev && { ...prev, point: toCanvas(event.clientX, event.clientY) })
    }

    const handleUp = (event) => {
      const element = document.elementFromPoint(event.clientX, event.clientY)
      const target = element?.closest('[data-port]')

      if (target) {
        const componentId = target.getAttribute('data-component')
        const port = target.getAttribute('data-port')
        const direction = target.getAttribute('data-direction')

        if (componentId !== wire.componentId && direction !== wire.direction) {
          const fromOutput = wire.direction === 'output'
          onConnectionCreate?.({
            id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            from: fromOutput ? wire.componentId : componentId,
            fromPort: fromOutput ? wire.port : port,
            to: fromOutput ? componentId : wire.componentId,
            toPort: fromOutput ? port : wire.port,
            type: 'data'
          })
        }
      }

      setWire(null)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [wire, toCanvas, onConnectionCreate])

  // Backspace/Delete removes the selected wire. Node deletion stays with the
  // builder, which owns the confirmation dialog.
  useEffect(() => {
    if (!selectedEdge) return

    const handleKeyDown = (event) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)
      if (typing || event.target.isContentEditable) return
      if (event.key !== 'Delete' && event.key !== 'Backspace') return

      event.preventDefault()
      onConnectionDelete?.(selectedEdge)
      setSelectedEdge(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEdge, onConnectionDelete])

  // ---- Palette drops -------------------------------------------------

  const handleDragOver = useCallback((event) => {
    if (!event.dataTransfer.types.includes('application/x-limedrop-component')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDropTarget(true)
  }, [])

  const handleDrop = useCallback((event) => {
    const typeId = event.dataTransfer.getData('application/x-limedrop-component')
    setIsDropTarget(false)
    if (!typeId) return

    event.preventDefault()
    const point = toCanvas(event.clientX, event.clientY)
    // Drop where the node's centre lands under the pointer.
    onDropComponent?.(typeId, {
      x: Math.max(0, Math.round(point.x - NODE_WIDTH / 2)),
      y: Math.max(0, Math.round(point.y - HEADER_HEIGHT / 2))
    })
  }, [toCanvas, onDropComponent])

  // ---- Rendering -----------------------------------------------------

  const drawnEdges = useMemo(() => connections.map(connection => {
    const source = byId.get(connection.from)
    const target = byId.get(connection.to)
    if (!source || !target) return null

    const from = portPosition(source, connection.fromPort, 'output')
    const to = portPosition(target, connection.toPort, 'input')

    return {
      connection,
      path: edgePath(from, to),
      midpoint: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
    }
  }).filter(Boolean), [connections, byId])

  const wirePreview = useMemo(() => {
    if (!wire) return null
    const component = byId.get(wire.componentId)
    if (!component) return null

    const anchor = portPosition(component, wire.port, wire.direction)
    return wire.direction === 'output'
      ? edgePath(anchor, wire.point)
      : edgePath(wire.point, anchor)
  }, [wire, byId])

  const isEmpty = components.length === 0

  return (
    <div className={styles.canvasShell}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={styles.toolButton}
            onClick={() => zoomByButton(1 / ZOOM_STEP)}
            disabled={view.zoom <= MIN_ZOOM}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <i className="fas fa-magnifying-glass-minus" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            className={styles.zoomLevel}
            onClick={() => setView(prev => ({ ...prev, zoom: 1 }))}
            title="Reset to 100%"
          >
            {Math.round(view.zoom * 100)}%
          </button>
          <button
            type="button"
            className={styles.toolButton}
            onClick={() => zoomByButton(ZOOM_STEP)}
            disabled={view.zoom >= MAX_ZOOM}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <i className="fas fa-magnifying-glass-plus" aria-hidden="true"></i>
          </button>
        </div>

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={styles.toolButton}
            onClick={fitToView}
            disabled={isEmpty}
            title="Fit workflow to view"
            aria-label="Fit workflow to view"
          >
            <i className="fas fa-expand" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={[
          styles.viewport,
          isPanning ? styles.panning : '',
          isDropTarget ? styles.dropTarget : ''
        ].filter(Boolean).join(' ')}
        data-canvas-surface="true"
        onPointerDown={handleViewportPointerDown}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDropTarget(false)}
        onDrop={handleDrop}
        style={{
          // The grid is painted on the viewport so it can scroll with the
          // content without being scaled into blurriness at high zoom.
          backgroundSize: `${24 * view.zoom}px ${24 * view.zoom}px`,
          backgroundPosition: `${view.x}px ${view.y}px`
        }}
      >
        {isEmpty && (
          <div className={styles.empty} data-canvas-surface="true">
            <i className="fas fa-diagram-project" aria-hidden="true"></i>
            <h4>Start building</h4>
            <p>Drag a component from the palette, or click one to drop it here.</p>
          </div>
        )}

        <div
          className={styles.world}
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`
          }}
        >
          <svg className={styles.edgeLayer} aria-hidden="true">
            {drawnEdges.map(({ connection, path }) => (
              <g
                key={connection.id}
                className={`${styles.edge} ${selectedEdge === connection.id ? styles.edgeSelected : ''}`}
              >
                {/* A wide transparent stroke underneath gives the thin wire a
                    forgiving click target. */}
                <path
                  d={path}
                  className={styles.edgeHitArea}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    setSelectedEdge(connection.id)
                  }}
                  onDoubleClick={() => onConnectionDelete?.(connection.id)}
                />
                <path d={path} className={styles.edgeLine} markerEnd="url(#wf-arrow)" />
              </g>
            ))}

            {wirePreview && (
              <path d={wirePreview} className={styles.wirePreview} />
            )}

            <defs>
              <marker
                id="wf-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="3"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d="M0,0 L7,3 L0,6 Z" className={styles.arrowHead} />
              </marker>
            </defs>
          </svg>

          {/* Delete affordance for the selected wire, in normal DOM so it
              stays a real button with a real hit target. */}
          {drawnEdges
            .filter(({ connection }) => selectedEdge === connection.id)
            .map(({ connection, midpoint }) => (
              <button
                key={`${connection.id}-delete`}
                type="button"
                className={styles.edgeDelete}
                style={{ left: midpoint.x, top: midpoint.y }}
                onClick={() => {
                  onConnectionDelete?.(connection.id)
                  setSelectedEdge(null)
                }}
                title="Delete connection"
                aria-label="Delete connection"
              >
                <i className="fas fa-xmark" aria-hidden="true"></i>
              </button>
            ))}

          {components.map(component => (
            <WorkflowNode
              key={component.id}
              component={component}
              isSelected={selectedId === component.id}
              issues={issuesByComponent?.get(component.id) || []}
              wire={wire}
              isValidTarget={isValidTarget}
              onSelect={onSelect}
              onRemove={onRemove}
              onHeaderPointerDown={startNodeDrag}
              onPortPointerDown={startWire}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function WorkflowNode({
  component,
  isSelected,
  issues,
  wire,
  isValidTarget,
  onSelect,
  onRemove,
  onHeaderPointerDown,
  onPortPointerDown
}) {
  const definition = definitionFor(component)
  const { inputs, outputs } = portsFor(component)
  const rows = Math.max(inputs.length, outputs.length, 1)
  const category = componentCategories[definition?.category]
  const hasError = issues.some(issue => issue.severity === 'error')
  const hasWarning = !hasError && issues.length > 0

  const configuredCount = Object.keys(component.config || {}).length

  return (
    <div
      className={[
        styles.node,
        isSelected ? styles.nodeSelected : '',
        hasError ? styles.nodeError : '',
        hasWarning ? styles.nodeWarning : ''
      ].filter(Boolean).join(' ')}
      style={{
        left: component.position?.x ?? 0,
        top: component.position?.y ?? 0,
        width: NODE_WIDTH,
        height: nodeHeight(component),
        '--node-accent': category?.color || 'var(--primary-button-color)'
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => onSelect?.(component)}
    >
      <div
        className={styles.nodeHeader}
        style={{ height: HEADER_HEIGHT }}
        onPointerDown={(event) => onHeaderPointerDown(event, component)}
        title="Drag to move"
      >
        <span className={styles.nodeIcon}>
          <i className={definition?.icon || 'fas fa-cube'} aria-hidden="true"></i>
        </span>
        <span className={styles.nodeName}>{component.name || definition?.name}</span>

        {issues.length > 0 && (
          <span
            className={hasError ? styles.nodeBadgeError : styles.nodeBadgeWarning}
            title={issues.map(issue => issue.message).join('\n')}
          >
            <i
              className={hasError ? 'fas fa-circle-exclamation' : 'fas fa-triangle-exclamation'}
              aria-hidden="true"
            ></i>
          </span>
        )}

        {configuredCount > 0 && (
          <span className={styles.nodeConfigured} title={`${configuredCount} properties set`}>
            <i className="fas fa-sliders" aria-hidden="true"></i>
          </span>
        )}

        <button
          type="button"
          className={styles.nodeRemove}
          onClick={(event) => {
            event.stopPropagation()
            onRemove?.(component.id)
          }}
          title="Remove component"
          aria-label={`Remove ${component.name || definition?.name || 'component'}`}
        >
          <i className="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div className={styles.nodePorts} style={{ padding: `${PORTS_PADDING}px 0` }}>
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className={styles.portRow} style={{ height: PORT_ROW_HEIGHT }}>
            <PortSlot
              component={component}
              port={inputs[row]}
              direction="input"
              wire={wire}
              isValidTarget={isValidTarget}
              onPortPointerDown={onPortPointerDown}
            />
            <PortSlot
              component={component}
              port={outputs[row]}
              direction="output"
              wire={wire}
              isValidTarget={isValidTarget}
              onPortPointerDown={onPortPointerDown}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function PortSlot({ component, port, direction, wire, isValidTarget, onPortPointerDown }) {
  if (!port) return <span className={styles.portSpacer} />

  // While a wire is in flight, dim the ports it cannot legally land on so the
  // valid targets are obvious without having to try them.
  const wiring = Boolean(wire)
  const valid = wiring && isValidTarget(component.id, direction)
  const isOrigin = wiring && wire.componentId === component.id && wire.port === port

  return (
    <span
      className={[
        styles.port,
        direction === 'input' ? styles.portInput : styles.portOutput,
        wiring && !valid && !isOrigin ? styles.portMuted : '',
        valid ? styles.portCandidate : ''
      ].filter(Boolean).join(' ')}
      data-component={component.id}
      data-port={port}
      data-direction={direction}
      onPointerDown={(event) => onPortPointerDown(event, component.id, port, direction)}
      title={`${direction === 'input' ? 'Input' : 'Output'}: ${port} — drag to connect`}
    >
      <span className={styles.portDot} />
      <span className={styles.portLabel}>{port.replace(/_/g, ' ')}</span>
    </span>
  )
}

export default WorkflowCanvas
