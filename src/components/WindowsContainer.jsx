import { memo } from 'react'
import { useApp } from '../contexts/AppContext'
import Window from './Window'
import Settings from './apps/Settings'
import FileManager from './apps/FileManager'
import AppBuilder from './apps/AppBuilder'
import EnhancedAppBuilder from './apps/EnhancedAppBuilder'
import AppManager from './apps/AppManager'
import BuiltAppRunner from './apps/BuiltAppRunner'
import { getApp, parseAppWindowId } from '../storage/appStore'
import styles from '../styles/WindowsContainer.module.css'

const appComponents = {
  'settings': Settings,
  'file-manager': FileManager,
  'app-builder': EnhancedAppBuilder,
  'app-builder-classic': AppBuilder,
  'app-manager': AppManager
}

function WindowsContainer() {
  const { windows } = useApp()

  const getAppContent = (appId, windowData) => {
    // User-built apps are addressed as "built:<appId>" and resolved from store.
    const builtAppId = parseAppWindowId(appId)
    if (builtAppId) {
      const appData = windowData.builtAppData || getApp(builtAppId)
      return appData
        ? <BuiltAppRunner appData={appData} />
        : <div className={styles.missingApp}>This app no longer exists.</div>
    }

    const AppComponent = appComponents[appId]
    return AppComponent
      ? <AppComponent />
      : <div className={styles.missingApp}>App not found: {appId}</div>
  }

  return (
    <div id="windows-container" className={styles.windowsContainer}>
      {windows.map((windowData) => (
        <Window
          key={windowData.windowId}
          windowId={windowData.windowId}
          appId={windowData.appId}
          title={windowData.title}
          width={windowData.width}
          height={windowData.height}
          left={windowData.left}
          top={windowData.top}
          zIndex={windowData.zIndex}
          minimized={windowData.minimized}
          maximized={windowData.maximized}
          content={getAppContent(windowData.appId, windowData)}
        />
      ))}
    </div>
  )
}

export default memo(WindowsContainer)
