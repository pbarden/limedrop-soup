import { useState, useEffect } from 'react'
import { useApp } from '../../contexts/AppContext'
import styles from '../../styles/AppManager.module.css'

function AppManager() {
  const { openApp } = useApp()
  const [installedApps, setInstalledApps] = useState([])
  const [selectedApp, setSelectedApp] = useState(null)

  const systemApps = [
    { 
      id: 'settings', 
      name: 'Settings', 
      icon: 'fas fa-cog', 
      description: 'System configuration and preferences',
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
      description: 'Build and customize applications',
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

  const sampleApps = [
    {
      id: 'calculator',
      name: 'Calculator',
      icon: 'fas fa-calculator',
      description: 'Simple arithmetic calculator',
      version: '1.0.0',
      isSystem: false,
      installed: false
    },
    {
      id: 'notepad',
      name: 'Notepad',
      icon: 'fas fa-sticky-note',
      description: 'Basic text editor for quick notes',
      version: '1.2.1',
      isSystem: false,
      installed: false
    },
    {
      id: 'weather',
      name: 'Weather App',
      icon: 'fas fa-cloud-sun',
      description: 'Check current weather conditions',
      version: '2.0.0',
      isSystem: false,
      installed: false
    },
    {
      id: 'music-player',
      name: 'Music Player',
      icon: 'fas fa-music',
      description: 'Play your favorite music files',
      version: '1.5.3',
      isSystem: false,
      installed: false
    }
  ]

  useEffect(() => {
    loadInstalledApps()
  }, [])

  const loadInstalledApps = () => {
    const saved = JSON.parse(localStorage.getItem('limedrop-apps') || '[]')
    const builtApps = JSON.parse(localStorage.getItem('limedrop-built-apps') || '[]')
    
    // Convert built apps to the app manager format
    const builtAppsList = builtApps.map(app => ({
      id: `built-${app.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: app.name,
      icon: app.icon || 'fas fa-cogs',
      description: `Custom app with ${app.components.length} components`,
      version: '1.0.0',
      isSystem: false,
      installed: true,
      isBuiltApp: true,
      builtAppData: app
    }))

    const allApps = [
      ...systemApps, 
      ...sampleApps.map(app => {
        const savedApp = saved.find(s => s.id === app.id)
        return savedApp ? { ...app, installed: true } : app
      }),
      ...builtAppsList
    ]
    setInstalledApps(allApps)
  }

  const saveInstalledApps = (apps) => {
    const userApps = apps.filter(app => !app.isSystem && app.installed)
    localStorage.setItem('limedrop-apps', JSON.stringify(userApps))
  }

  const installApp = (appId) => {
    const updatedApps = installedApps.map(app => 
      app.id === appId ? { ...app, installed: true } : app
    )
    setInstalledApps(updatedApps)
    saveInstalledApps(updatedApps)
  }

  const uninstallApp = (appId) => {
    const app = installedApps.find(a => a.id === appId)
    if (app?.isSystem) {
      alert('System apps cannot be uninstalled')
      return
    }
    
    if (!confirm(`Are you sure you want to uninstall ${app?.name}?`)) return
    
    const updatedApps = installedApps.map(app => 
      app.id === appId ? { ...app, installed: false } : app
    )
    setInstalledApps(updatedApps)
    saveInstalledApps(updatedApps)
  }

  const launchApp = (appId) => {
    openApp(appId)
  }

  const getInstalledApps = () => installedApps.filter(app => app.installed)
  const getAvailableApps = () => installedApps.filter(app => !app.installed)

  return (
    <div className={styles.appManager}>
      <div className={styles.appManagerHeader}>
        <h2>App Manager</h2>
        <div className={styles.appStats}>
          <span>{getInstalledApps().length} installed</span>
          <span>{getAvailableApps().length} available</span>
        </div>
      </div>

      <div className={styles.appManagerBody}>
        <div className={styles.appsList}>
          <div className={styles.appsSection}>
            <h3>Installed Apps</h3>
            <div className={styles.appsGrid}>
              {getInstalledApps().map(app => (
                <div 
                  key={app.id}
                  className={`${styles.appCard} ${styles.installed}`}
                  onClick={() => setSelectedApp(app)}
                >
                  <div className={styles.appIcon}>
                    <i className={app.icon}></i>
                  </div>
                  <div className={styles.appInfo}>
                    <div className={styles.appName}>{app.name}</div>
                    <div className={styles.appVersion}>{app.version || '1.0.0'}</div>
                  </div>
                  <div className={styles.appActions}>
                    {!app.isSystem && (
                      <button 
                        className="btn-danger btn-small"
                        onClick={(e) => {
                          e.stopPropagation()
                          uninstallApp(app.id)
                        }}
                      >
                        Uninstall
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.appsSection}>
            <h3>Available Apps</h3>
            <div className={styles.appsGrid}>
              {getAvailableApps().map(app => (
                <div 
                  key={app.id}
                  className={`${styles.appCard} ${styles.available}`}
                  onClick={() => setSelectedApp(app)}
                >
                  <div className={styles.appIcon}>
                    <i className={app.icon}></i>
                  </div>
                  <div className={styles.appInfo}>
                    <div className={styles.appName}>{app.name}</div>
                    <div className={styles.appVersion}>{app.version || '1.0.0'}</div>
                  </div>
                  <div className={styles.appActions}>
                    <button 
                      className="btn-primary btn-small"
                      onClick={(e) => {
                        e.stopPropagation()
                        installApp(app.id)
                      }}
                    >
                      Install
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                  <button className="btn-primary" onClick={() => launchApp(selectedApp.id)}>
                    Launch
                  </button>
                  {!selectedApp.isSystem && (
                    <button 
                      className="btn-danger"
                      onClick={() => uninstallApp(selectedApp.id)}
                    >
                      Uninstall
                    </button>
                  )}
                </>
              ) : (
                <button 
                  className="btn-primary"
                  onClick={() => installApp(selectedApp.id)}
                >
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AppManager