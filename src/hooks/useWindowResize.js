import { useEffect, useRef } from 'react'
import { useApp } from '../contexts/AppContext'

export function useWindowResize(windowRef, windowId, initialSize) {
  const { updateWindowSize } = useApp()
  const isResizing = useRef(false)
  const resizeDirection = useRef(null)
  const finalSize = useRef({})

  useEffect(() => {
    const windowEl = windowRef.current
    if (!windowEl) return

    const resizeHandle = windowEl.querySelector('[class*="windowResizeHandle"]')
    if (!resizeHandle) return

    const handleMouseDown = (e) => {
      isResizing.current = true
      resizeDirection.current = 'se' // Southeast (bottom-right)
      e.preventDefault()
    }

    const handleMouseMove = (e) => {
      if (!isResizing.current) return

      const rect = windowEl.getBoundingClientRect()
      
      const newWidth = Math.max(300, e.clientX - rect.left) // Minimum 300px width
      const newHeight = Math.max(200, e.clientY - rect.top) // Minimum 200px height
      
      // Don't resize beyond screen boundaries
      const maxWidth = window.innerWidth - rect.left
      const maxHeight = window.innerHeight - rect.top
      
      const finalWidth = Math.min(newWidth, maxWidth)
      const finalHeight = Math.min(newHeight, maxHeight)

      windowEl.style.width = `${finalWidth}px`
      windowEl.style.height = `${finalHeight}px`
      
      // Store final size for state update on resize end
      finalSize.current = { width: finalWidth, height: finalHeight }
    }

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false
        resizeDirection.current = null
        
        // Update the window manager state only once at end of resize
        if (finalSize.current.width && finalSize.current.height) {
          updateWindowSize(windowId, finalSize.current)
        }
      }
    }

    // Add event listeners
    resizeHandle.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      resizeHandle.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [windowRef, windowId, updateWindowSize])

  return {
    isResizing: isResizing.current
  }
}