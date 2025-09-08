import { useEffect, useRef } from 'react'
import { useApp } from '../contexts/AppContext'
import { useWindowDrag } from '../hooks/useWindowDrag'
import { useWindowResize } from '../hooks/useWindowResize'
import styles from '../styles/Window.module.css'

function Window({ windowId, appId, title, width, height, left, top, zIndex, minimized, maximized, content }) {
  const windowRef = useRef(null)
  const { focusWindow, minimizeWindow, toggleMaximize, closeWindow, activeWindowId } = useApp()
  
  useWindowDrag(windowRef, windowId, { left, top })
  useWindowResize(windowRef, windowId, { width, height })

  useEffect(() => {
    if (windowRef.current) {
      const el = windowRef.current
      el.style.width = `${width}px`
      el.style.height = `${height}px`
      el.style.left = `${left}px`
      el.style.top = `${top}px`
      el.style.zIndex = zIndex
    }
  }, [width, height, left, top, zIndex])

  const handleWindowClick = (e) => {
    // Focus window on any click within the window
    focusWindow(windowId)
  }

  const handleHeaderClick = (e) => {
    e.stopPropagation()
    focusWindow(windowId)
  }

  const handleMinimize = () => {
    minimizeWindow(windowId)
  }

  const handleMaximize = () => {
    toggleMaximize(windowId)
  }

  const handleClose = (e) => {
    e.stopPropagation()
    closeWindow(windowId)
  }

  const isActive = activeWindowId === windowId

  return (
    <div
      ref={windowRef}
      id={windowId}
      className={`${styles.window} ${minimized ? styles.minimized : ''} ${maximized ? styles.maximized : ''} ${isActive ? styles.active : ''}`}
      onClick={handleWindowClick}
    >
      <div className={styles.windowHeader} onClick={handleHeaderClick}>
        <div className={styles.windowTitle}>{title}</div>
        <div className={styles.windowControls}>
          <button className={`${styles.windowControl} ${styles.minimize}`} onClick={(e) => { e.stopPropagation(); handleMinimize(); }}>
            −
          </button>
          <button className={`${styles.windowControl} ${styles.maximize}`} onClick={(e) => { e.stopPropagation(); handleMaximize(); }}>
            □
          </button>
          <button className={`${styles.windowControl} ${styles.close}`} onClick={handleClose}>
            ×
          </button>
        </div>
      </div>
      <div className={styles.windowContent}>
        {content}
      </div>
      <div className={styles.windowResizeHandle}></div>
    </div>
  )
}

export default Window