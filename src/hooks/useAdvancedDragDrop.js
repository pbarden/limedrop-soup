import { useCallback, useRef, useState, useEffect } from 'react'

export function useAdvancedDragDrop({
  onDragStart,
  onDragEnd,
  onDrop,
  gridSize = 20,
  magneticThreshold = 10,
  animationDuration = 300
}) {
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedItem: null,
    dragOffset: { x: 0, y: 0 },
    dropZones: [],
    nearestDropZone: null,
    snapPosition: null
  })

  const dropZoneRefs = useRef(new Map())

  // Grid snapping utility
  const snapToGrid = useCallback((x, y) => {
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    }
  }, [gridSize])

  // Find nearest drop zone.
  //
  // Distance is measured to the zone's rectangle, not its centre: a pointer
  // anywhere inside the zone scores 0. Measuring from the centre meant a large
  // canvas could only be hit within magneticThreshold px of its exact middle,
  // so drops almost never registered.
  const findNearestDropZone = useCallback((x, y) => {
    let nearest = null
    let minDistance = Infinity

    dragState.dropZones.forEach(zone => {
      const rect = zone.element.getBoundingClientRect()
      const dx = Math.max(rect.left - x, 0, x - rect.right)
      const dy = Math.max(rect.top - y, 0, y - rect.bottom)
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < minDistance && distance <= magneticThreshold) {
        minDistance = distance
        nearest = zone
      }
    })

    // handleDragMove reads `distance` to decide on the magnetic highlight.
    return nearest ? { ...nearest, distance: minDistance } : null
  }, [dragState.dropZones, magneticThreshold])

  // Create enhanced ghost element
  const createGhostElement = useCallback((originalElement) => {
    const ghost = originalElement.cloneNode(true)
    ghost.className = 'drag-ghost'
    
    // Enhanced ghost styling
    Object.assign(ghost.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '10000',
      opacity: '0.8',
      transform: 'scale(1.05)',
      transition: `all ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
      borderRadius: '8px',
      backdropFilter: 'blur(10px)',
      border: '2px solid var(--primary-button-color)'
    })

    // Add glow effect for futuristic feel
    const glow = document.createElement('div')
    glow.style.cssText = `
      position: absolute;
      top: -4px;
      left: -4px;
      right: -4px;
      bottom: -4px;
      background: linear-gradient(45deg, var(--primary-button-color), transparent, var(--primary-button-color));
      border-radius: 12px;
      opacity: 0.3;
      z-index: -1;
      filter: blur(8px);
    `
    ghost.appendChild(glow)

    return ghost
  }, [animationDuration])

  // Enhanced drag move with visual feedback
  const handleDragMove = useCallback((e) => {
    if (!dragState.isDragging) return

    const x = e.clientX - dragState.dragOffset.x
    const y = e.clientY - dragState.dragOffset.y

    // Update ghost position
    const ghost = document.querySelector('.drag-ghost')
    if (ghost) {
      const snapped = snapToGrid(x, y)
      ghost.style.transform = `translate(${snapped.x}px, ${snapped.y}px)`
      
      // Add snap visual indicator
      ghost.classList.toggle('snapped', 
        Math.abs(x - snapped.x) < 5 && Math.abs(y - snapped.y) < 5)
    }

    // Find and highlight nearest drop zone
    const nearest = findNearestDropZone(e.clientX, e.clientY)
    
    // Update drop zone highlights
    document.querySelectorAll('.drop-zone-highlight').forEach(el => {
      el.classList.remove('drop-zone-highlight', 'drop-zone-magnetic')
    })

    if (nearest) {
      nearest.element.classList.add('drop-zone-highlight')
      if (nearest.distance < magneticThreshold / 2) {
        nearest.element.classList.add('drop-zone-magnetic')
      }
    }

    setDragState(prev => ({
      ...prev,
      nearestDropZone: nearest,
      snapPosition: snapToGrid(x, y)
    }))

    e.preventDefault()
  }, [dragState, snapToGrid, findNearestDropZone, magneticThreshold])

  // Cleanup drag state
  const cleanupDrag = useCallback(() => {
    // Remove ghost element
    const ghost = document.querySelector('.drag-ghost')
    if (ghost) {
      document.body.removeChild(ghost)
    }

    // Clear highlights
    document.querySelectorAll('.drop-zone-highlight').forEach(el => {
      el.classList.remove('drop-zone-highlight', 'drop-zone-magnetic')
    })

    setDragState({
      isDragging: false,
      draggedItem: null,
      dragOffset: { x: 0, y: 0 },
      dropZones: [],
      nearestDropZone: null,
      snapPosition: null
    })
  }, [])

  // Enhanced drag end with animations
  const handleDragEnd = useCallback((e) => {
    if (!dragState.isDragging) return

    const ghost = document.querySelector('.drag-ghost')
    const dropZone = dragState.nearestDropZone

    // Animate to final position
    if (ghost) {
      ghost.classList.add('dropping')
      
      if (dropZone && onDrop) {
        // Animate to drop zone
        const rect = dropZone.element.getBoundingClientRect()
        const targetX = rect.left + rect.width / 2
        const targetY = rect.top + rect.height / 2
        
        ghost.style.transform = `translate(${targetX}px, ${targetY}px) scale(0.8)`
        ghost.style.opacity = '0'

        setTimeout(() => {
          onDrop(dragState.draggedItem, dropZone, {
            x: e.clientX,
            y: e.clientY
          })
          cleanupDrag()
        }, animationDuration)
      } else {
        // Animate back to original position or snap to grid
        const finalPos = dragState.snapPosition || { x: e.clientX, y: e.clientY }
        ghost.style.transform = `translate(${finalPos.x}px, ${finalPos.y}px)`
        
        setTimeout(cleanupDrag, animationDuration)
      }
    } else {
      cleanupDrag()
    }

    onDragEnd?.(dragState.draggedItem, dropZone, {
      x: e.clientX,
      y: e.clientY
    })

    e.preventDefault()
  }, [dragState, onDrop, onDragEnd, animationDuration, cleanupDrag])

  // Enhanced drag start
  const handleDragStart = useCallback((e, item, initialOffset = { x: 0, y: 0 }) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const dragOffset = {
      x: e.clientX - rect.left - initialOffset.x,
      y: e.clientY - rect.top - initialOffset.y
    }

    setDragState(prev => ({
      ...prev,
      isDragging: true,
      draggedItem: item,
      dragOffset
    }))

    // Create ghost element
    const ghost = createGhostElement(e.currentTarget)
    document.body.appendChild(ghost)

    onDragStart?.(item, { x: e.clientX, y: e.clientY })

    e.preventDefault()
  }, [onDragStart, createGhostElement])

  // Drag listeners live here rather than in handleDragStart so they always
  // close over the current drag state; handlers registered at mousedown would
  // capture isDragging === false and immediately bail.
  useEffect(() => {
    if (!dragState.isDragging) return

    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)

    return () => {
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
    }
  }, [dragState.isDragging, handleDragMove, handleDragEnd])


// Register drop zone
  const registerDropZone = useCallback((element, id, metadata = {}) => {
    if (!element) return

    // Re-registering the same element must not touch state: callers often pass
    // an inline ref callback, which React re-invokes on every render, and an
    // unconditional setState there loops until React bails out.
    if (dropZoneRefs.current.get(id)?.element === element) return

    dropZoneRefs.current.set(id, { element, metadata })

    setDragState(prev => ({
      ...prev,
      dropZones: Array.from(dropZoneRefs.current.values())
    }))

    // Add drop zone styling
    element.classList.add('drop-zone')
    
    return () => {
      dropZoneRefs.current.delete(id)
      element.classList.remove('drop-zone', 'drop-zone-highlight', 'drop-zone-magnetic')
      
      setDragState(prev => ({
        ...prev,
        dropZones: Array.from(dropZoneRefs.current.values())
      }))
    }
  }, [])

  // Unregister drop zone
  const unregisterDropZone = useCallback((id) => {
    dropZoneRefs.current.delete(id)
    setDragState(prev => ({
      ...prev,
      dropZones: Array.from(dropZoneRefs.current.values())
    }))
  }, [])

  // Touch support for mobile
  useEffect(() => {
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true
        })
        e.target.dispatchEvent(mouseEvent)
      }
    }

    const handleTouchMove = (e) => {
      if (e.touches.length === 1 && dragState.isDragging) {
        const touch = e.touches[0]
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: touch.clientX,
          clientY: touch.clientY,
          bubbles: true
        })
        document.dispatchEvent(mouseEvent)
        e.preventDefault()
      }
    }

    const handleTouchEnd = () => {
      if (dragState.isDragging) {
        const mouseEvent = new MouseEvent('mouseup', {
          bubbles: true
        })
        document.dispatchEvent(mouseEvent)
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [dragState.isDragging])

  return {
    dragState,
    handleDragStart,
    registerDropZone,
    unregisterDropZone,
    snapToGrid,
    cleanupDrag
  }
}