import { memo, useCallback } from 'react'
import { useApp } from '../contexts/AppContext'
import styles from '../styles/Dock.module.css'

function Dock() {
  const { openApp } = useApp()

  const systemApps = [
    { id: 'app-builder', icon: 'fas fa-hammer', tooltip: 'App Builder' },
    { id: 'app-manager', icon: 'fas fa-th-large', tooltip: 'App Manager' },
    { id: 'file-manager', icon: 'fas fa-folder', tooltip: 'Files' },
    { id: 'settings', icon: 'fas fa-cog', tooltip: 'Settings' }
  ]

  const handleDockItemClick = useCallback((appId) => {
    openApp(appId)
  }, [openApp])

  return (
    <div className={styles.dock}>
      <div className={styles.dockSystem} id="dock-system">
        {systemApps.map(app => (
          <div
            key={app.id}
            className={styles.dockItem}
            data-app={app.id}
            onClick={() => handleDockItemClick(app.id)}
          >
            <div className={styles.dockIcon}>
              <i className={app.icon}></i>
            </div>
            <div className={styles.dockTooltip}>{app.tooltip}</div>
          </div>
        ))}
      </div>
      <div className={styles.dockSeparator}></div>
      <div className={styles.dockFavorites} id="dock-favorites"></div>
      <div className={styles.dockSeparator} id="dock-separator-2" style={{ display: 'none' }}></div>
      <div className={styles.dockRunning} id="dock-running"></div>
    </div>
  )
}

export default memo(Dock)