import { memo, useCallback, useEffect, useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { listInstalledApps, subscribe, appWindowId } from '../storage/appStore'
import styles from '../styles/DesktopIcons.module.css'

const systemApps = [
  { id: 'app-builder', icon: 'fas fa-hammer', label: 'App Builder' },
  { id: 'app-manager', icon: 'fas fa-th-large', label: 'App Manager' },
  { id: 'file-manager', icon: 'fas fa-folder', label: 'Files' },
  { id: 'settings', icon: 'fas fa-cog', label: 'Settings' }
]

function DesktopIcons() {
  const { openApp } = useApp()
  const [builtApps, setBuiltApps] = useState([])

  // Installed apps sit on the desktop next to the system ones, and the list
  // refreshes as soon as one is installed, renamed, or deleted.
  useEffect(() => {
    setBuiltApps(listInstalledApps())
    return subscribe(() => setBuiltApps(listInstalledApps()))
  }, [])

  const handleSystemClick = useCallback((appId) => {
    openApp(appId)
  }, [openApp])

  const handleBuiltClick = useCallback((app) => {
    openApp(appWindowId(app.id), { title: app.name, builtAppData: app })
  }, [openApp])

  return (
    <div className={styles.desktopIcons}>
      {systemApps.map(app => (
        <div
          key={app.id}
          className={styles.desktopIcon}
          data-app={app.id}
          onClick={() => handleSystemClick(app.id)}
          title={app.label}
        >
          <div className={styles.iconImage}>
            <i className={app.icon}></i>
          </div>
          <div className={styles.iconLabel}>{app.label}</div>
        </div>
      ))}

      {builtApps.map(app => (
        <div
          key={app.id}
          className={styles.desktopIcon}
          data-app={appWindowId(app.id)}
          onClick={() => handleBuiltClick(app)}
          title={app.description || app.name}
        >
          <div className={styles.iconImage}>
            <i className={app.icon}></i>
          </div>
          <div className={styles.iconLabel}>{app.name}</div>
        </div>
      ))}
    </div>
  )
}

export default memo(DesktopIcons)
