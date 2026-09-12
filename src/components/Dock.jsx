import { memo, useCallback } from 'react'
import { useApp } from '../contexts/AppContext'
import styles from '../styles/Dock.module.css'

function Dock() {
  const { openApp, windows, focusWindow, minimizeWindow } = useApp()

  const systemApps = [
    { id: 'app-builder', icon: 'fas fa-hammer', tooltip: 'App Builder' },
    { id: 'app-manager', icon: 'fas fa-th-large', tooltip: 'App Manager' },
    { id: 'file-manager', icon: 'fas fa-folder', tooltip: 'Files' },
    { id: 'settings', icon: 'fas fa-cog', tooltip: 'Settings' }
  ]

  const handleRunningAppClick = useCallback((window) => {
    if (window.minimized) {
      minimizeWindow(window.windowId) // This will toggle minimized state back to false
    } else {
      focusWindow(window.windowId)
    }
  }, [minimizeWindow, focusWindow])

  // Get app icon based on appId
  const getAppIcon = useCallback((appId) => {
    const systemApp = systemApps.find(app => app.id === appId)
    if (systemApp) return systemApp.icon
    
    // Default icons for other apps
    const iconMap = {
      'calculator': 'fas fa-calculator',
      'notepad': 'fas fa-sticky-note',
      'weather': 'fas fa-cloud-sun',
      'music-player': 'fas fa-music'
    }
    
    return iconMap[appId] || 'fas fa-window-maximize'
  }, [systemApps])

  // Get non-system running windows for the running section
  const runningWindows = windows.filter(window => 
    !systemApps.some(sysApp => sysApp.id === window.appId)
  )

  // Handle system app clicks - if minimized, restore; if open, minimize or focus
  const handleSystemAppClick = useCallback((appId) => {
    const existingWindow = windows.find(w => w.appId === appId)
    if (existingWindow && existingWindow.minimized) {
      minimizeWindow(existingWindow.windowId) // Restore the minimized window
    } else {
      openApp(appId) // Open new or focus existing
    }
  }, [openApp, windows, minimizeWindow])

  return (
    <div className={styles.dock}>
      <div className={styles.dockSystem} id="dock-system">
        {systemApps.map(app => {
          const systemWindow = windows.find(w => w.appId === app.id)
          const isMinimized = systemWindow && systemWindow.minimized
          
          return (
            <div
              key={app.id}
              className={`${styles.dockItem} ${isMinimized ? styles.minimized : ''}`}
              data-app={app.id}
              onClick={() => handleSystemAppClick(app.id)}
            >
              <div className={styles.dockIcon}>
                <i className={app.icon}></i>
              </div>
              <div className={styles.dockTooltip}>
                {app.tooltip} {isMinimized ? '(Minimized)' : ''}
              </div>
            </div>
          )
        })}
      </div>
      <div className={styles.dockSeparator}></div>
      <div className={styles.dockFavorites} id="dock-favorites"></div>
      {runningWindows.length > 0 && (
        <>
          <div className={styles.dockSeparator}></div>
          <div className={styles.dockRunning} id="dock-running">
            {runningWindows.map(window => (
              <div
                key={window.windowId}
                className={`${styles.dockItem} ${window.minimized ? styles.minimized : ''}`}
                onClick={() => handleRunningAppClick(window)}
                title={window.title}
              >
                <div className={styles.dockIcon}>
                  <i className={getAppIcon(window.appId)}></i>
                </div>
                <div className={styles.dockTooltip}>
                  {window.title} {window.minimized ? '(Minimized)' : ''}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default memo(Dock)