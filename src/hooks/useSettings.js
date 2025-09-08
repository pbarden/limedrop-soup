import { useState, useEffect, useCallback } from 'react'

const defaultSettings = {
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
  autoSave: true,
  showIcons: true,
  minimizeIcon: 'default',
  maximizeIcon: 'default',
  closeIcon: 'default',
  backgroundStyle: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  background: 'gradient1',
  backgroundAnimation: false,
  animationStyle: 'gradientFlow'
}

export function useSettings() {
  const [settings, setSettings] = useState(defaultSettings)

  // Load settings from localStorage on mount
  useEffect(() => {
    loadSettings()
  }, [])

  // Apply CSS variables when settings change
  useEffect(() => {
    applySettings()
  }, [settings])

  const loadSettings = useCallback(() => {
    try {
      const savedSettings = localStorage.getItem('limedrop-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error)
    }
  }, [])

  const saveSettings = useCallback((newSettings) => {
    try {
      const updatedSettings = { ...settings, ...newSettings }
      setSettings(updatedSettings)
      
      if (updatedSettings.autoSave !== false) {
        localStorage.setItem('limedrop-settings', JSON.stringify(updatedSettings))
      }
      
      return updatedSettings
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error)
      return settings
    }
  }, [settings])

  const applySettings = useCallback(() => {
    try {
      const root = document.documentElement
      
      // Apply CSS custom properties for theming
      Object.entries(settings).forEach(([key, value]) => {
        if (typeof value === 'string') {
          if (key.includes('Color') && value.startsWith('#')) {
            root.style.setProperty(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value)
            
            // Convert hex to RGB for rgba usage
            if (key === 'windowTintColor') {
              const rgb = hexToRgb(value)
              if (rgb) {
                root.style.setProperty('--window-tint-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`)
              }
            }
            
            // Apply fontColor to all font color variants
            if (key === 'fontColor') {
              root.style.setProperty('--font-color', value)
              root.style.setProperty('--desktop-font-color', value)
              root.style.setProperty('--window-font-color', value)
              root.style.setProperty('--header-font-color', value)
            }
          } else if (key.includes('Opacity') || key.includes('Blur')) {
            root.style.setProperty(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value)
          }
        }
      })

      // Background is handled by CSS variable --background-style

    } catch (error) {
      console.warn('Failed to apply settings:', error)
    }
  }, [settings])

  const updateSetting = useCallback((key, value) => {
    return saveSettings({ [key]: value })
  }, [saveSettings])

  const resetSettings = useCallback(() => {
    try {
      setSettings(defaultSettings)
      localStorage.removeItem('limedrop-settings')
      return defaultSettings
    } catch (error) {
      console.warn('Failed to reset settings:', error)
      return settings
    }
  }, [settings])

  const exportSettings = useCallback(() => {
    try {
      const dataStr = JSON.stringify(settings, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'limedrop-settings.json'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.warn('Failed to export settings:', error)
    }
  }, [settings])

  const importSettings = useCallback((file) => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const imported = JSON.parse(e.target.result)
            const newSettings = { ...defaultSettings, ...imported }
            saveSettings(newSettings)
            resolve(newSettings)
          } catch (parseError) {
            reject(new Error('Invalid settings file format'))
          }
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsText(file)
      } catch (error) {
        reject(error)
      }
    })
  }, [saveSettings])

  return {
    settings,
    updateSetting,
    saveSettings,
    loadSettings,
    resetSettings,
    exportSettings,
    importSettings,
    applySettings
  }
}

// Utility function to convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

export default useSettings