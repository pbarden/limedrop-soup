import { useEffect } from 'react'
import DesktopIcons from '../components/DesktopIcons'
import WindowsContainer from '../components/WindowsContainer'
import Dock from '../components/Dock'
import UserMenu from '../components/UserMenu'
import ModalOverlay from '../components/ModalOverlay'
import NotificationContainer from '../components/NotificationContainer'
import styles from '../styles/Desktop.module.css'

function Desktop() {

  // Set up window resize handler
  useEffect(() => {
    const handleResize = () => {
      const windows = document.querySelectorAll('.window')
      windows.forEach(windowEl => {
        const rect = windowEl.getBoundingClientRect()
        if (rect.right > window.innerWidth) {
          windowEl.style.left = `${window.innerWidth - rect.width}px`
        }
        if (rect.bottom > window.innerHeight) {
          windowEl.style.top = `${window.innerHeight - rect.height}px`
        }
      })
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div id="desktop" className={styles.desktop}>
      <DesktopIcons />
      <WindowsContainer />
      <Dock />
      <UserMenu />
      <ModalOverlay />
      <NotificationContainer />
    </div>
  )
}

export default Desktop