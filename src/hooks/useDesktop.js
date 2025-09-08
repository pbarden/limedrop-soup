import { useCallback } from 'react'

export function useDesktop() {
  const initializeDesktop = useCallback(() => {
    // Apply saved settings from localStorage
    const settings = JSON.parse(localStorage.getItem('limedrop-settings') || '{}')
    
    // Apply theme settings to CSS custom properties
    const root = document.documentElement
    
    // Default theme values
    const defaults = {
      fontColor: '#ffffff',
      primaryButtonStyle: 'solid',
      primaryButtonColor: '#667eea',
      primaryGradientStart: '#667eea',
      primaryGradientEnd: '#764ba2',
      primaryButtonText: '#ffffff',
      secondaryButtonBg: '#ffffff',
      secondaryButtonOpacity: '0.1',
      secondaryButtonText: '#ffffff',
      secondaryButtonBorder: '#ffffff',
      secondaryBorderOpacity: '0.2',
      windowTintColor: '#ffffff',
      windowTintRgb: '255, 255, 255',
      glassOpacity: '0.8',
      glassBlur: '10px',
      windowHeaderColor: '#ffffff',
      windowHeaderRgb: '255, 255, 255',
      windowHeaderOpacity: '0.15',
      windowHeaderText: '#ffffff',
      windowHeaderBorderOpacity: '0.1',
      backgroundStyle: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }
    
    const finalSettings = { ...defaults, ...settings }
    
    // Apply CSS custom properties
    Object.entries(finalSettings).forEach(([key, value]) => {
      const cssKey = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase()
      root.style.setProperty(cssKey, value)
    })
    
    // Background is handled by CSS variable --background-style
    
    // Set up window resize handler
    const handleResize = () => {
      // Handle window resize events for responsive behavior
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
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return {
    initializeDesktop
  }
}