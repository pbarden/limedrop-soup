import React, { useRef, useEffect, useState, useCallback } from 'react'
import styles from '../styles/ConnectionSystem.module.css'

function ConnectionSystem({ 
  components, 
  connections, 
  onConnectionCreate, 
  onConnectionDelete,
  workflowRef 
}) {
  const svgRef = useRef(null)
  const [dragState, setDragState] = useState({
    isDragging: false,
    fromComponent: null,
    fromPort: null,
    mousePosition: { x: 0, y: 0 }
  })
  const [hoveredPort, setHoveredPort] = useState(null)

  // Update SVG size and position
  useEffect(() => {
    if (!svgRef.current || !workflowRef?.current) return

    const updateSvgSize = () => {
      const workflowRect = workflowRef.current.getBoundingClientRect()
      const svg = svgRef.current
      
      svg.style.width = `${workflowRect.width}px`
      svg.style.height = `${workflowRect.height}px`
      svg.setAttribute('viewBox', `0 0 ${workflowRect.width} ${workflowRect.height}`)
    }

    updateSvgSize()
    
    const resizeObserver = new ResizeObserver(updateSvgSize)
    resizeObserver.observe(workflowRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [workflowRef])

  // Handle connection drag start
  const handleConnectionStart = useCallback((componentId, portId, portType, event) => {
    event.stopPropagation()
    
    setDragState({
      isDragging: true,
      fromComponent: componentId,
      fromPort: portId,
      fromPortType: portType,
      mousePosition: { x: event.clientX, y: event.clientY }
    })

    document.addEventListener('mousemove', handleConnectionDrag)
    document.addEventListener('mouseup', handleConnectionEnd)
  }, [])

  // Handle connection drag
  const handleConnectionDrag = useCallback((event) => {
    if (!dragState.isDragging) return

    setDragState(prev => ({
      ...prev,
      mousePosition: { x: event.clientX, y: event.clientY }
    }))
  }, [dragState.isDragging])

  // Handle connection end
  const handleConnectionEnd = useCallback((event) => {
    if (!dragState.isDragging) return

    // Find target port under mouse
    const targetElement = document.elementFromPoint(event.clientX, event.clientY)
    const portElement = targetElement?.closest('[data-port-id]')
    
    if (portElement) {
      const toComponent = portElement.getAttribute('data-component-id')
      const toPort = portElement.getAttribute('data-port-id')
      const toPortType = portElement.getAttribute('data-port-type')
      
      // Validate connection
      if (canCreateConnection(
        dragState.fromComponent, 
        dragState.fromPort, 
        dragState.fromPortType,
        toComponent, 
        toPort, 
        toPortType
      )) {
        onConnectionCreate?.({
          id: `conn-${Date.now()}`,
          from: dragState.fromComponent,
          fromPort: dragState.fromPort,
          to: toComponent,
          toPort: toPort,
          type: 'data'
        })
      }
    }

    setDragState({
      isDragging: false,
      fromComponent: null,
      fromPort: null,
      mousePosition: { x: 0, y: 0 }
    })

    document.removeEventListener('mousemove', handleConnectionDrag)
    document.removeEventListener('mouseup', handleConnectionEnd)
  }, [dragState, onConnectionCreate])

  // Validate if connection can be created
  const canCreateConnection = (fromComp, fromPort, fromType, toComp, toPort, toType) => {
    // Can't connect to same component
    if (fromComp === toComp) return false
    
    // Output ports can only connect to input ports
    if (fromType === 'output' && toType !== 'input') return false
    if (fromType === 'input' && toType !== 'output') return false
    
    // Check if connection already exists
    const existingConnection = connections.find(conn => 
      conn.from === fromComp && 
      conn.fromPort === fromPort && 
      conn.to === toComp && 
      conn.toPort === toPort
    )
    
    return !existingConnection
  }

  // Get port position on screen
  const getPortPosition = (componentId, portId, portType) => {
    const portElement = document.querySelector(
      `[data-component-id="${componentId}"] [data-port-id="${portId}"]`
    )
    
    if (!portElement || !workflowRef?.current) return { x: 0, y: 0 }

    const portRect = portElement.getBoundingClientRect()
    const workflowRect = workflowRef.current.getBoundingClientRect()
    
    return {
      x: portRect.left + portRect.width / 2 - workflowRect.left,
      y: portRect.top + portRect.height / 2 - workflowRect.top
    }
  }

  // Generate SVG path for connection
  const generateConnectionPath = (from, to) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    
    // Control points for bezier curve
    const cp1x = from.x + Math.abs(dx) * 0.5
    const cp1y = from.y
    const cp2x = to.x - Math.abs(dx) * 0.5
    const cp2y = to.y
    
    return `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`
  }

  // Render connection ports for a component
  const renderConnectionPorts = (component) => {
    // This would be enhanced to read from component metadata
    const inputPorts = ['input', 'trigger']
    const outputPorts = ['output', 'result', 'error']
    
    return (
      <>
        {/* Input ports (left side) */}
        <div className={styles.inputPorts}>
          {inputPorts.map(port => (
            <div
              key={port}
              className={`${styles.connectionPort} ${styles.inputPort}`}
              data-component-id={component.id}
              data-port-id={port}
              data-port-type="input"
              onMouseDown={(e) => handleConnectionStart(component.id, port, 'input', e)}
              onMouseEnter={() => setHoveredPort({ component: component.id, port })}
              onMouseLeave={() => setHoveredPort(null)}
            >
              <div className={styles.portIndicator}></div>
              <span className={styles.portLabel}>{port}</span>
            </div>
          ))}
        </div>

        {/* Output ports (right side) */}
        <div className={styles.outputPorts}>
          {outputPorts.map(port => (
            <div
              key={port}
              className={`${styles.connectionPort} ${styles.outputPort}`}
              data-component-id={component.id}
              data-port-id={port}
              data-port-type="output"
              onMouseDown={(e) => handleConnectionStart(component.id, port, 'output', e)}
              onMouseEnter={() => setHoveredPort({ component: component.id, port })}
              onMouseLeave={() => setHoveredPort(null)}
            >
              <span className={styles.portLabel}>{port}</span>
              <div className={styles.portIndicator}></div>
            </div>
          ))}
        </div>
      </>
    )
  }

  return (
    <div className={styles.connectionSystem}>
      {/* Connection SVG Layer */}
      <svg
        ref={svgRef}
        className={styles.connectionSvg}
        style={{ pointerEvents: dragState.isDragging ? 'none' : 'auto' }}
      >
        <defs>
          {/* Gradient definitions for connections */}
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary-button-color)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--primary-button-color)" stopOpacity="0.4" />
          </linearGradient>
          
          <linearGradient id="activeConnectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary-button-color)" stopOpacity="1" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--primary-button-color)" stopOpacity="1" />
          </linearGradient>
          
          {/* Arrow marker */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="var(--primary-button-color)"
              opacity="0.8"
            />
          </marker>
          
          {/* Animated flow marker */}
          <circle id="flowDot" r="3" fill="white" opacity="0.9">
            <animate
              attributeName="opacity"
              values="0.2;1;0.2"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        </defs>

        {/* Existing connections */}
        {connections.map(connection => {
          const fromPos = getPortPosition(connection.from, connection.fromPort, 'output')
          const toPos = getPortPosition(connection.to, connection.toPort, 'input')
          const path = generateConnectionPath(fromPos, toPos)

          return (
            <g key={connection.id} className={styles.connectionGroup}>
              {/* Main connection path */}
              <path
                d={path}
                stroke="url(#connectionGradient)"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead)"
                className={styles.connectionPath}
                onClick={() => onConnectionDelete?.(connection.id)}
              />
              
              {/* Animated flow indicator */}
              <circle r="2" fill="white" opacity="0.8">
                <animateMotion dur="3s" repeatCount="indefinite">
                  <mpath xlinkHref={`#${connection.id}-path`} />
                </animateMotion>
              </circle>
              
              {/* Invisible thicker path for easier clicking */}
              <path
                d={path}
                stroke="transparent"
                strokeWidth="10"
                fill="none"
                className={styles.connectionClickArea}
                onClick={() => onConnectionDelete?.(connection.id)}
              />
              
              {/* Hidden path for animation reference */}
              <path
                id={`${connection.id}-path`}
                d={path}
                stroke="none"
                fill="none"
                style={{ display: 'none' }}
              />
            </g>
          )
        })}

        {/* Active drag connection */}
        {dragState.isDragging && workflowRef?.current && (
          <g className={styles.dragConnection}>
            <path
              d={generateConnectionPath(
                getPortPosition(dragState.fromComponent, dragState.fromPort, dragState.fromPortType),
                {
                  x: dragState.mousePosition.x - workflowRef.current.getBoundingClientRect().left,
                  y: dragState.mousePosition.y - workflowRef.current.getBoundingClientRect().top
                }
              )}
              stroke="url(#activeConnectionGradient)"
              strokeWidth="3"
              fill="none"
              strokeDasharray="5,5"
              markerEnd="url(#arrowhead)"
              opacity="0.8"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="0;10"
                dur="0.5s"
                repeatCount="indefinite"
              />
            </path>
          </g>
        )}
      </svg>

      {/* Connection ports overlay */}
      <div className={styles.portsOverlay}>
        {components.map(component => (
          <div
            key={component.id}
            className={styles.componentPorts}
            style={{
              left: component.position?.x || 0,
              top: component.position?.y || 0,
              width: component.size?.width || 200,
              height: component.size?.height || 100
            }}
          >
            {renderConnectionPorts(component)}
          </div>
        ))}
      </div>

      {/* Connection info tooltip */}
      {hoveredPort && (
        <div
          className={styles.connectionTooltip}
          style={{
            left: dragState.mousePosition.x + 10,
            top: dragState.mousePosition.y - 30
          }}
        >
          <strong>{hoveredPort.port}</strong>
          <br />
          <small>Click and drag to connect</small>
        </div>
      )}

      {/* Connection statistics */}
      <div className={styles.connectionStats}>
        <span>{connections.length} connections</span>
        <span>{components.length} components</span>
      </div>
    </div>
  )
}

export default ConnectionSystem