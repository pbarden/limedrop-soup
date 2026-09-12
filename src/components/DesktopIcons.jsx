import { memo, useCallback, useEffect, useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { listInstalledApps, subscribe, appWindowId } from '../storage/appStore'
import styles from '../styles/DesktopIcons.module.css'

const systemApps = [
  { id: 'app-builder', icon: 'fas fa-diagram-project', label: 'App Builder' },
  { id: 'app-manager', icon: 'fas fa-table-cells-large', label: 'App Manager' },
  { id: 'file-manager', icon: 'fas fa-folder-open', label: 'Files' },
  { id: 'settings', icon: 'fas fa-gear', label: 'Settings' }
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
    <nav className={styles.desktopIcons} aria-label="Desktop shortcuts">
      {systemApps.map(app => (
        <button
          type="button"
          key={app.id}
          className={styles.desktopIcon}
          data-app={app.id}
          onClick={() => handleSystemClick(app.id)}
          title={app.label}
        >
          <span className={styles.iconImage}>
            <i className={app.icon} aria-hidden="true"></i>
          </span>
          <span className={styles.iconLabel}>{app.label}</span>
        </button>
      ))}

      {builtApps.map(app => (
        <button
          type="button"
          key={app.id}
          className={styles.desktopIcon}
          data-app={appWindowId(app.id)}
          onClick={() => handleBuiltClick(app)}
          title={app.description || app.name}
        >
          <span className={styles.iconImage}>
            <i className={app.icon} aria-hidden="true"></i>
          </span>
          <span className={styles.iconLabel}>{app.name}</span>
        </button>
      ))}
    </nav>
  )
}

export default memo(DesktopIcons)
