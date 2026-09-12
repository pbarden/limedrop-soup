import { useEffect, useRef } from 'react'
import { useApp } from '../contexts/AppContext'
import { useWindowDrag } from '../hooks/useWindowDrag'
import { useWindowResize } from '../hooks/useWindowResize'
import { useSettings } from '../contexts/SettingsContext'
import { useMobile } from '../hooks/useMobile'
import styles from '../styles/Window.module.css'

function Window({ windowId, title, width, height, left, top, zIndex, minimized, maximized, content }) {
  const windowRef = useRef(null)
  const { focusWindow, minimizeWindow, toggleMaximize, closeWindow, activeWindowId } = useApp()
  const { settings } = useSettings()
  const isMobile = useMobile()
  
  useWindowDrag(windowRef, windowId, { left, top })
  useWindowResize(windowRef, windowId, { width, height })
  
  // Helper function to get icon based on settings
  const getControlIcon = (iconType, defaultIcon) => {
    const iconSetting = settings[`${iconType}Icon`]
    if (!iconSetting || iconSetting === 'default') return defaultIcon
    return <i className={iconSetting}></i>
  }

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

  const handleWindowClick = () => {
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
        <div className={styles.windowTitle} title={title}>{title}</div>
        <div className={styles.windowControls}>
          <button
            type="button"
            className={`${styles.windowControl} ${styles.minimize}`}
            onClick={(e) => { e.stopPropagation(); handleMinimize(); }}
            title={minimized ? 'Restore' : 'Minimize'}
            aria-label={`${minimized ? 'Restore' : 'Minimize'} ${title}`}
          >
            {getControlIcon('minimize', '−')}
          </button>
          {!isMobile && (
            <button
              type="button"
              className={`${styles.windowControl} ${styles.maximize}`}
              onClick={(e) => { e.stopPropagation(); handleMaximize(); }}
              title={maximized ? 'Restore down' : 'Maximize'}
              aria-label={`${maximized ? 'Restore down' : 'Maximize'} ${title}`}
            >
              {getControlIcon('maximize', '□')}
            </button>
          )}
          <button
            type="button"
            className={`${styles.windowControl} ${styles.close}`}
            onClick={handleClose}
            title="Close"
            aria-label={`Close ${title}`}
          >
            {getControlIcon('close', '×')}
          </button>
        </div>
      </div>
      <div className={styles.windowContent}>
        {content}
      </div>
      {!maximized && <div className={styles.windowResizeHandle}></div>}
    </div>
  )
}

export default Window