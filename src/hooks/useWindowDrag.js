import { useEffect, useRef } from 'react'
import { useApp } from '../contexts/AppContext'

export function useWindowDrag(windowRef, windowId, initialPosition) {
  const { updateWindowPosition } = useApp()
  const isDragging = useRef(false)
  const startPos = useRef({ x: 0, y: 0 })
  const startWindowPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const windowEl = windowRef.current
    if (!windowEl) return

    const headerEl = windowEl.querySelector('[class*="windowHeader"]')
    if (!headerEl) return

    const handleMouseDown = (e) => {
      // Don't start dragging if clicking on window controls
      if (e.target.closest('[class*="windowControl"]')) return
      
      isDragging.current = true
      headerEl.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none' // Prevent text selection
      
      // Store the mouse position and current window position
      startPos.current = { x: e.clientX, y: e.clientY }
      const rect = windowEl.getBoundingClientRect()
      startWindowPos.current = { x: rect.left, y: rect.top }
      
      e.preventDefault()
      e.stopPropagation()
    }

    const handleMouseMove = (e) => {
      if (!isDragging.current) return

      // Calculate the offset from start position
      const deltaX = e.clientX - startPos.current.x
      const deltaY = e.clientY - startPos.current.y
      
      // Calculate new window position
      const newLeft = Math.max(0, Math.min(
        window.innerWidth - 200, // Minimum 200px visible
        startWindowPos.current.x + deltaX
      ))
      
      const newTop = Math.max(0, Math.min(
        window.innerHeight - 50, // Minimum 50px visible
        startWindowPos.current.y + deltaY
      ))

      // Directly set position - no requestAnimationFrame for precise tracking
      windowEl.style.left = `${newLeft}px`
      windowEl.style.top = `${newTop}px`
    }

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        headerEl.style.cursor = 'grab'
        document.body.style.userSelect = ''
        
        // Get final position from computed style
        const rect = windowEl.getBoundingClientRect()
        
        // Update the window manager state
        updateWindowPosition(windowId, { 
          left: rect.left, 
          top: rect.top 
        })
      }
    }

    // Add event listeners
    headerEl.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove, { passive: false })
    document.addEventListener('mouseup', handleMouseUp)

    // Set initial cursor style
    headerEl.style.cursor = 'grab'

    return () => {
      headerEl.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
    }
  }, [windowRef, windowId, updateWindowPosition])

  return {
    isDragging: isDragging.current
  }
}