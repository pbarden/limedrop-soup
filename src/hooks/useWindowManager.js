import { useState, useCallback, useRef } from 'react'

export function useWindowManager() {
  const [windows, setWindows] = useState([])
  const [activeWindowId, setActiveWindowId] = useState(null)
  const nextZIndex = useRef(1000)

  const generateWindowId = useCallback(() => {
    return `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const focusWindow = useCallback((windowId) => {
    // Always set as active window first
    setActiveWindowId(windowId)
    
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
  }, [])

  const openApp = useCallback((appId, options = {}) => {
    // Check if window for this app is already open
    const existingWindow = windows.find(w => w.appId === appId)
    if (existingWindow) {
      focusWindow(existingWindow.windowId)
      return existingWindow.windowId
    }

    const windowId = generateWindowId()
    const defaultOptions = {
      title: appId.charAt(0).toUpperCase() + appId.slice(1).replace(/-/g, ' '),
      width: 800,
      height: 600,
      left: Math.max(0, window.innerWidth / 2 - 400 + Math.random() * 100),
      top: Math.max(0, window.innerHeight / 2 - 300 + Math.random() * 100),
      minimized: false,
      maximized: false,
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
    setActiveWindowId(windowId)
    
    return windowId
  }, [windows, focusWindow, generateWindowId])

  const closeWindow = useCallback((windowId) => {
    setWindows(prev => {
      const remaining = prev.filter(w => w.windowId !== windowId)
      
      // If closing the active window, find next window to activate
      if (activeWindowId === windowId && remaining.length > 0) {
        const nextActive = remaining.reduce((highest, w) => 
          w.zIndex > highest.zIndex ? w : highest
        )
        setActiveWindowId(nextActive.windowId)
      } else if (activeWindowId === windowId) {
        setActiveWindowId(null)
      }
      
      return remaining
    })
  }, [])

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