import { useState, useCallback, useRef } from 'react'
import { useMobile } from './useMobile'

/**
 * Sensible opening size per app. The builder in particular lays out three
 * panels side by side, so the generic 800x600 default cropped its toolbar and
 * squeezed the canvas to nothing.
 */
const APP_WINDOW_DEFAULTS = {
  'app-builder': { width: 1180, height: 760 },
  'app-builder-classic': { width: 900, height: 640 },
  'app-manager': { width: 880, height: 620 },
  'file-manager': { width: 820, height: 580 },
  'settings': { width: 860, height: 660 }
}

const DEFAULT_WINDOW = { width: 800, height: 600 }

/** Clamp a preferred size to what the viewport can actually show. */
function fitToViewport({ width, height }) {
  return {
    width: Math.min(width, Math.max(320, window.innerWidth - 48)),
    height: Math.min(height, Math.max(240, window.innerHeight - 96))
  }
}

export function useWindowManager() {
  const [windows, setWindows] = useState([])
  const [activeWindowId, setActiveWindowId] = useState(null)
  const nextZIndex = useRef(1000)

  // Mirrors activeWindowId so callbacks can read the current value without
  // listing it as a dependency (which would give every consumer a new
  // function identity on each focus change).
  const activeWindowIdRef = useRef(null)
  const setActiveWindow = useCallback((windowId) => {
    activeWindowIdRef.current = windowId
    setActiveWindowId(windowId)
  }, [])

  const isMobile = useMobile()

  const generateWindowId = useCallback(() => {
    return `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const focusWindow = useCallback((windowId) => {
    // Always set as active window first
    setActiveWindow(windowId)
    
    setWindows(prev => {
      // Find the window being focused
      const targetWindow = prev.find(w => w.windowId === windowId)
      if (!targetWindow) return prev
      
      // Always bring clicked window to front regardless of current z-index
      const newZIndex = nextZIndex.current++
      
      return prev.map(w => 
        w.windowId === windowId 
          ? { ...w, zIndex: newZIndex }
          : w
      )
    })
  }, [setActiveWindow])

  const openApp = useCallback((appId, options = {}) => {
    // Check if window for this app is already open
    const existingWindow = windows.find(w => w.appId === appId)
    if (existingWindow) {
      focusWindow(existingWindow.windowId)
      return existingWindow.windowId
    }

    const windowId = generateWindowId()
    const size = fitToViewport(APP_WINDOW_DEFAULTS[appId] || DEFAULT_WINDOW)
    // Cascade successive windows slightly instead of scattering them randomly.
    const offset = (windows.length % 5) * 24

    const defaultOptions = {
      title: appId.charAt(0).toUpperCase() + appId.slice(1).replace(/-/g, ' '),
      width: size.width,
      height: size.height,
      left: Math.max(0, Math.round((window.innerWidth - size.width) / 2) + offset),
      top: Math.max(0, Math.round((window.innerHeight - size.height) / 2 - 20) + offset),
      minimized: false,
      maximized: isMobile, // Default to maximized on mobile
      resizable: true,
      ...options
    }

    const newWindow = {
      windowId,
      appId,
      zIndex: nextZIndex.current++,
      ...defaultOptions
    }

    setWindows(prev => [...prev, newWindow])
    setActiveWindow(windowId)
    
    return windowId
  }, [windows, focusWindow, generateWindowId, isMobile, setActiveWindow])

  const closeWindow = useCallback((windowId) => {
    setWindows(prev => {
      const remaining = prev.filter(w => w.windowId !== windowId)
      
      // If closing the active window, focus whichever window is now on top.
      if (activeWindowIdRef.current === windowId) {
        const nextActive = remaining.length > 0
          ? remaining.reduce((highest, w) => (w.zIndex > highest.zIndex ? w : highest))
          : null
        setActiveWindow(nextActive ? nextActive.windowId : null)
      }

      return remaining
    })
  }, [setActiveWindow])

  const minimizeWindow = useCallback((windowId) => {
    setWindows(prev => prev.map(w => 
      w.windowId === windowId 
        ? { ...w, minimized: !w.minimized }
        : w
    ))
  }, [])

  const toggleMaximize = useCallback((windowId) => {
    setWindows(prev => prev.map(w => 
      w.windowId === windowId 
        ? { ...w, maximized: !w.maximized }
        : w
    ))
  }, [])

  const updateWindowPosition = useCallback((windowId, { left, top }) => {
    setWindows(prev => prev.map(w => 
      w.windowId === windowId 
        ? { ...w, left, top }
        : w
    ))
  }, [])

  const updateWindowSize = useCallback((windowId, { width, height }) => {
    setWindows(prev => prev.map(w => 
      w.windowId === windowId 
        ? { ...w, width, height }
        : w
    ))
  }, [])

  const getWindow = useCallback((windowId) => {
    return windows.find(w => w.windowId === windowId)
  }, [windows])

  return {
    windows,
    activeWindowId,
    openApp,
    closeWindow,
    focusWindow,
    minimizeWindow,
    toggleMaximize,
    updateWindowPosition,
    updateWindowSize,
    getWindow
  }
}