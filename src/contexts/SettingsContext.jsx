import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const defaultSettings = {
  fontColor: '#1f2937',
  desktopFontColor: '#ffffff',
  windowFontColor: '#1f2937',
  headerFontColor: '#1f2937',
  primaryButtonStyle: 'solid',
  primaryButtonColor: '#667eea',
  primaryButtonRgb: '102, 126, 234',
  primaryGradientStart: '#667eea',
  primaryGradientEnd: '#764ba2',
  primaryButtonText: '#ffffff',
  primaryButtonTextColor: '#ffffff',
  matchDesktopTheme: false,
  secondaryButtonBg: '#ffffff',
  secondaryButtonTextColor: '#1f2937',
  secondaryButtonOpacity: '0.1',
  secondaryButtonText: '#1f2937',
  secondaryButtonBorder: '#ffffff',
  secondaryBorderOpacity: '0.2',
  glassOpacity: '0.8',
  glassBlur: '10px',
  windowHeaderOpacity: '0.15',
  desktopIconColor: '#ffffff',
  desktopIconSize: '1.2rem',
  autoSave: true,
  showIcons: true,
  minimizeIcon: 'fas fa-minus',
  maximizeIcon: 'fas fa-expand-alt',
  closeIcon: 'fas fa-times',
  backgroundStyle: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
  background: 'gradient1',
  backgroundAnimation: false,
  animationStyle: 'gradientFlow'
}

const SettingsContext = createContext()

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings)

  const loadSettings = useCallback(() => {
    try {
      const savedSettings = localStorage.getItem('chaiq-settings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      }
    } catch (error) {
      console.warn('❌ Failed to load settings from localStorage:', error)
    }
  }, [])

  const saveSettings = useCallback((newSettings) => {
    try {
      const updatedSettings = { ...settings, ...newSettings }
      setSettings(updatedSettings)
      
      if (updatedSettings.autoSave !== false) {
        localStorage.setItem('chaiq-settings', JSON.stringify(updatedSettings))
      }
      
      return updatedSettings
    } catch (error) {
      console.warn('❌ Failed to save settings to localStorage:', error)
      return settings
    }
  }, [settings])

  const applySettings = useCallback(() => {
    try {
      const root = document.documentElement
      
      // Apply CSS custom properties for theming
      Object.entries(settings).forEach(([key, value]) => {
        // Skip non-primitive values
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
          return
        }
        
        // Convert key to CSS custom property format
        const cssKey = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
        
        // Apply the setting as a CSS variable
        root.style.setProperty(cssKey, String(value))
        
        // Special handling for font color settings
        if (key === 'fontColor' && typeof value === 'string') {
          root.style.setProperty('--font-color', value)
        }
        if (key === 'desktopFontColor' && typeof value === 'string') {
          root.style.setProperty('--desktop-font-color', value)
        }
        if (key === 'windowFontColor' && typeof value === 'string') {
          root.style.setProperty('--window-font-color', value)
        }
        if (key === 'headerFontColor' && typeof value === 'string') {
          root.style.setProperty('--header-font-color', value)
        }
        if (key === 'primaryButtonTextColor' && typeof value === 'string') {
          root.style.setProperty('--primary-button-text-color', value)
        }
        if (key === 'secondaryButtonTextColor' && typeof value === 'string') {
          root.style.setProperty('--secondary-button-text-color', value)
        }
        if (key === 'desktopIconColor' && typeof value === 'string') {
          root.style.setProperty('--desktop-icon-color', value)
          root.style.setProperty('--icon-color', value)
          root.style.setProperty('--primary-icon-color', value)
        }
        if (key === 'desktopIconSize' && typeof value === 'string') {
          root.style.setProperty('--desktop-icon-font-size', value)
        }
        
        // Handle match desktop theme setting
        if (key === 'matchDesktopTheme' && typeof value === 'boolean') {
          if (value) {
            // Use the desktop background as button background
            root.style.setProperty('--primary-button-color', settings.backgroundStyle || defaultSettings.backgroundStyle)
          } else {
            // Use the regular primary button color
            root.style.setProperty('--primary-button-color', settings.primaryButtonColor)
          }
        }
        
        // Convert hex colors to RGB for rgba usage
        if (key.includes('Color') && typeof value === 'string' && value.startsWith('#')) {
          const rgb = hexToRgb(value)
          if (rgb) {
            const rgbKey = key.replace('Color', '') + 'Rgb'
            const rgbCssKey = `--${rgbKey.replace(/([A-Z])/g, '-$1').toLowerCase()}`
            root.style.setProperty(rgbCssKey, `${rgb.r}, ${rgb.g}, ${rgb.b}`)
            
            // Special handling for specific colors that need exact RGB variable names
            if (key === 'primaryButtonColor') {
              root.style.setProperty('--primary-button-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`)
            }
            if (key === 'secondaryButtonBg') {
              root.style.setProperty('--secondary-button-bg', value)
              root.style.setProperty('--secondary-button-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`)
            }
          }
        }
        
        // Special background handling
        if (key === 'backgroundStyle') {
          root.style.setProperty('--background-style', value)
          // Also set body background directly for immediate effect
          document.body.style.background = value
        }
      })

    } catch (error) {
      console.error('❌ Failed to apply settings:', error)
    }
  }, [settings])

  // Load saved settings once on mount.
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Re-apply CSS variables whenever settings change. applySettings only writes
  // to the document root, so depending on it cannot loop.
  useEffect(() => {
    applySettings()
  }, [applySettings])


  const updateSetting = useCallback((key, value) => {
    return saveSettings({ [key]: value })
  }, [saveSettings])

  const resetSettings = useCallback(() => {
    try {
      setSettings(defaultSettings)
      localStorage.removeItem('chaiq-settings')
      return defaultSettings
    } catch (error) {
      console.warn('❌ Failed to reset settings:', error)
      return settings
    }
  }, [settings])

  // Utility function to convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  const value = {
    settings,
    updateSetting,
    saveSettings,
    loadSettings,
    resetSettings,
    applySettings
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

export default SettingsContext