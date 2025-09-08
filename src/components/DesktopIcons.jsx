import { memo, useCallback } from 'react'
import { useApp } from '../contexts/AppContext'
import styles from '../styles/DesktopIcons.module.css'

function DesktopIcons() {
  const { openApp } = useApp()

  const desktopApps = [
    { id: 'app-builder', icon: 'fas fa-hammer', label: 'App Builder' },
    { id: 'app-manager', icon: 'fas fa-th-large', label: 'App Manager' },
    { id: 'file-manager', icon: 'fas fa-folder', label: 'Files' },
    { id: 'settings', icon: 'fas fa-cog', label: 'Settings' }
  ]

  const handleIconClick = useCallback((appId) => {
    openApp(appId)
  }, [openApp])

  return (
    <div className={styles.desktopIcons}>
      {desktopApps.map(app => (
        <div
          key={app.id}
          className={styles.desktopIcon}
          data-app={app.id}
          onClick={() => handleIconClick(app.id)}
        >
          <div className={styles.iconImage}>
            <i className={app.icon}></i>
          </div>
          <div className={styles.iconLabel}>{app.label}</div>
        </div>
      ))}
    </div>
  )
}

export default memo(DesktopIcons)