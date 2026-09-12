import { memo, useCallback, useEffect, useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { listInstalledApps, subscribe, appWindowId } from '../storage/appStore'
import styles from '../styles/Dock.module.css'

const systemApps = [
  { id: 'app-builder', icon: 'fas fa-hammer', tooltip: 'App Builder' },
  { id: 'app-manager', icon: 'fas fa-th-large', tooltip: 'App Manager' },
  { id: 'file-manager', icon: 'fas fa-folder', tooltip: 'Files' },
  { id: 'settings', icon: 'fas fa-cog', tooltip: 'Settings' }
]

const FALLBACK_ICON = 'fas fa-window-maximize'

function Dock() {
  const { openApp, windows, focusWindow, minimizeWindow } = useApp()
  const [builtApps, setBuiltApps] = useState([])

  // Installed apps live in the favourites slot and refresh on install/delete.
  useEffect(() => {
    setBuiltApps(listInstalledApps())
    return subscribe(() => setBuiltApps(listInstalledApps()))
  }, [])

  const handleBuiltAppClick = useCallback((app) => {
    const id = appWindowId(app.id)
    const existing = windows.find(w => w.appId === id)
    if (existing?.minimized) {
      minimizeWindow(existing.windowId)
    } else {
      openApp(id, { title: app.name, builtAppData: app })
    }
  }, [openApp, windows, minimizeWindow])

  const handleRunningAppClick = useCallback((window) => {
    if (window.minimized) {
      minimizeWindow(window.windowId) // This will toggle minimized state back to false
    } else {
      focusWindow(window.windowId)
    }
  }, [minimizeWindow, focusWindow])

  // Get app icon based on appId
  // Built apps carry their own icon on the window record.
  const getAppIcon = useCallback((windowData) => {
    const systemApp = systemApps.find(app => app.id === windowData.appId)
    if (systemApp) return systemApp.icon
    return windowData.builtAppData?.icon || FALLBACK_ICON
  }, [])

  // Get non-system running windows for the running section
  // The running section must not repeat what the pinned sections already show.
  const pinnedIds = new Set([
    ...systemApps.map(app => app.id),
    ...builtApps.map(app => appWindowId(app.id))
  ])
  const runningWindows = windows.filter(window => !pinnedIds.has(window.appId))

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
      {builtApps.length > 0 && (
        <>
          <div className={styles.dockSeparator}></div>
          <div className={styles.dockFavorites} id="dock-favorites">
            {builtApps.map(app => {
              const appWindow = windows.find(w => w.appId === appWindowId(app.id))
              return (
                <div
                  key={app.id}
                  className={`${styles.dockItem} ${appWindow?.minimized ? styles.minimized : ''}`}
                  data-app={appWindowId(app.id)}
                  onClick={() => handleBuiltAppClick(app)}
                >
                  <div className={styles.dockIcon}>
                    <i className={app.icon}></i>
                  </div>
                  <div className={styles.dockTooltip}>
                    {app.name} {appWindow?.minimized ? '(Minimized)' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
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
                  <i className={getAppIcon(window)}></i>
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