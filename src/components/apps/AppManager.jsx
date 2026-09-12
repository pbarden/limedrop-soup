import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../../contexts/AppContext'
import { listApps, setInstalled, deleteApp, appWindowId } from '../../storage/appStore'
import styles from '../../styles/AppManager.module.css'

const SYSTEM_APPS = [
  {
    id: 'settings',
    name: 'Settings',
    icon: 'fas fa-cog',
    description: 'System configuration, theming, and your Anthropic API key',
    isSystem: true,
    installed: true
  },
  {
    id: 'file-manager',
    name: 'File Manager',
    icon: 'fas fa-folder',
    description: 'Browse and manage your files',
    isSystem: true,
    installed: true
  },
  {
    id: 'app-builder',
    name: 'App Builder',
    icon: 'fas fa-hammer',
    description: 'Build apps by wiring components into a workflow',
    isSystem: true,
    installed: true
  },
  {
    id: 'app-builder-classic',
    name: 'App Builder (Classic)',
    icon: 'fas fa-list',
    description: 'The original list-based builder, kept for older apps',
    isSystem: true,
    installed: true
  },
  {
    id: 'app-manager',
    name: 'App Manager',
    icon: 'fas fa-th-large',
    description: 'Manage installed applications',
    isSystem: true,
    installed: true
  }
]

function AppManager() {
  const { openApp, showNotification } = useApp()
  const [builtApps, setBuiltApps] = useState([])
  const [selectedApp, setSelectedApp] = useState(null)

  const refresh = useCallback(() => {
    setBuiltApps(listApps().map(app => ({
      ...app,
      description: app.description ||
        `${app.components.length} components, ${app.connections.length} connections`,
      isSystem: false,
      isBuiltApp: true
    })))
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const allApps = [...SYSTEM_APPS, ...builtApps]
  const installedList = allApps.filter(app => app.installed)
  const availableList = allApps.filter(app => !app.installed)

  const installApp = (appId) => {
    setInstalled(appId, true)
    refresh()
    setSelectedApp(prev => (prev?.id === appId ? { ...prev, installed: true } : prev))
  }

  const uninstallApp = (app) => {
    if (app.isSystem) {
      showNotification('System apps cannot be uninstalled', 'warning')
      return
    }
    setInstalled(app.id, false)
    refresh()
    setSelectedApp(prev => (prev?.id === app.id ? { ...prev, installed: false } : prev))
    showNotification(`${app.name} uninstalled`, 'info')
  }

  const removeApp = (app) => {
    if (!confirm(`Permanently delete "${app.name}"? This cannot be undone.`)) return
    deleteApp(app.id)
    refresh()
    setSelectedApp(null)
    showNotification(`${app.name} deleted`, 'info')
  }

  const launchApp = (app) => {
    if (app.isBuiltApp) {
      // Pass the definition through so the runner does not re-read storage.
      openApp(appWindowId(app.id), { title: app.name, builtAppData: app })
    } else {
      openApp(app.id)
    }
  }

  const renderCard = (app, action) => (
    <div
      key={app.id}
      className={`${styles.appCard} ${app.installed ? styles.installed : styles.available}`}
      onClick={() => setSelectedApp(app)}
    >
      <div className={styles.appIcon}>
        <i className={app.icon}></i>
      </div>
      <div className={styles.appInfo}>
        <div className={styles.appName}>{app.name}</div>
        <div className={styles.appVersion}>{app.version || '1.0.0'}</div>
      </div>
      <div className={styles.appActions}>{action}</div>
    </div>
  )

  return (
    <div className={styles.appManager}>
      <div className={styles.appManagerHeader}>
        <h2>App Manager</h2>
        <div className={styles.appStats}>
          <span>{installedList.length} installed</span>
          <span>{builtApps.length} built by you</span>
        </div>
      </div>

      <div className={styles.appManagerBody}>
        <div className={styles.appsList}>
          <div className={styles.appsSection}>
            <h3>Installed Apps</h3>
            <div className={styles.appsGrid}>
              {installedList.map(app => renderCard(
                app,
                <>
                  <button
                    className="btn-primary btn-small"
                    onClick={(e) => { e.stopPropagation(); launchApp(app) }}
                  >
                    Open
                  </button>
                  {!app.isSystem && (
                    <button
                      className="btn-danger btn-small"
                      onClick={(e) => { e.stopPropagation(); uninstallApp(app) }}
                    >
                      Uninstall
                    </button>
                  )}
                </>
              ))}
            </div>
          </div>

          {availableList.length > 0 && (
            <div className={styles.appsSection}>
              <h3>Not Installed</h3>
              <div className={styles.appsGrid}>
                {availableList.map(app => renderCard(
                  app,
                  <button
                    className="btn-primary btn-small"
                    onClick={(e) => { e.stopPropagation(); installApp(app.id) }}
                  >
                    Install
                  </button>
                ))}
              </div>
            </div>
          )}

          {builtApps.length === 0 && (
            <div className={styles.emptyState}>
              <i className="fas fa-hammer"></i>
              <p>You have not built any apps yet.</p>
              <button className="btn-primary" onClick={() => openApp('app-builder')}>
                Open App Builder
              </button>
            </div>
          )}
        </div>

        {selectedApp && (
          <div className={styles.appDetails}>
            <div className={styles.appDetailsHeader}>
              <div className={styles.appIcon}>
                <i className={selectedApp.icon}></i>
              </div>
              <div>
                <h3>{selectedApp.name}</h3>
                <p>{selectedApp.description}</p>
                <small>Version: {selectedApp.version || '1.0.0'}</small>
              </div>
            </div>

            <div className={styles.appDetailsActions}>
              {selectedApp.installed ? (
                <>
                  <button className="btn-primary" onClick={() => launchApp(selectedApp)}>
                    Launch
                  </button>
                  {!selectedApp.isSystem && (
                    <>
                      <button className="btn-secondary" onClick={() => uninstallApp(selectedApp)}>
                        Uninstall
                      </button>
                      <button className="btn-danger" onClick={() => removeApp(selectedApp)}>
                        Delete
                      </button>
                    </>
                  )}
                </>
              ) : (
                <button className="btn-primary" onClick={() => installApp(selectedApp.id)}>
                  Install App
                </button>
              )}
            </div>

            <div className={styles.appDetailsInfo}>
              <h4>App Information</h4>
              <div className={styles.infoGrid}>
                <div>
                  <strong>Type:</strong> {selectedApp.isSystem ? 'System App' : 'User App'}
                </div>
                <div>
                  <strong>Status:</strong> {selectedApp.installed ? 'Installed' : 'Not Installed'}
                </div>
                <div>
                  <strong>Version:</strong> {selectedApp.version || '1.0.0'}
                </div>
                {selectedApp.isBuiltApp && (
                  <>
                    <div>
                      <strong>Components:</strong> {selectedApp.components.length}
                    </div>
                    <div>
                      <strong>Connections:</strong> {selectedApp.connections.length}
                    </div>
                    <div>
                      <strong>Modified:</strong>{' '}
                      {new Date(selectedApp.metadata.modified).toLocaleString()}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AppManager
