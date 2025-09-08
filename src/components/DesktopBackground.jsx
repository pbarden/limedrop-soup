import { useEffect } from 'react'
import { useSettings } from '../hooks/useSettings'
import styles from '../styles/DesktopBackground.module.css'

function DesktopBackground() {
  const { settings } = useSettings()

  useEffect(() => {
    const backgroundEl = document.querySelector(`.${styles.desktopBackground}`)
    if (backgroundEl && settings.background) {
      // Apply background gradient based on settings
      const gradientMap = {
        gradient1: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
        gradient2: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e8ba3 100%)',
        gradient3: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 50%, #f29400 100%)',
        // Add more gradients as needed
      }
      
      backgroundEl.style.background = gradientMap[settings.background] || gradientMap.gradient1
      
      if (settings.backgroundAnimation) {
        backgroundEl.classList.add(styles.animated)
        backgroundEl.classList.add(styles[settings.animationStyle] || styles.gradientFlow)
      } else {
        backgroundEl.classList.remove(styles.animated)
      }
    }
  }, [settings.background, settings.backgroundAnimation, settings.animationStyle])

  return <div className={styles.desktopBackground}></div>
}

export default DesktopBackground