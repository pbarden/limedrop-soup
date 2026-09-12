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
  windowTintColor: '#ffffff',
  glassOpacity: '0.8',
  glassBlur: '10px',
  windowHeaderOpacity: '0.15',
  desktopIconColor: '#ffffff',
  desktopIconSize: '1.05rem',
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
      const savedSettings = localStorage.getItem('limedrop-settings')
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
        localStorage.setItem('limedrop-settings', JSON.stringify(updatedSettings))
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
        
        // "Match desktop theme" paints buttons with the desktop gradient.
        // It writes a separate --primary-button-fill rather than overwriting
        // --primary-button-color: that variable has to stay a real colour,
        // because borders, focus rings and every color-mix() in the app are
        // derived from it and a gradient value would invalidate them all.
        if (key === 'matchDesktopTheme' && typeof value === 'boolean') {
          root.style.setProperty(
            '--primary-button-fill',
            value
              ? (settings.backgroundStyle || defaultSettings.backgroundStyle)
              : 'var(--primary-button-color)'
          )
        }

        // Publish an "r, g, b" companion for every themed colour, so rules
        // that need a translucent version can use rgba(var(--x-rgb), a).
        if (key.includes('Color') && typeof value === 'string' && value.startsWith('#')) {
          const rgb = hexToRgb(value)
          if (rgb) {
            const triplet = `${rgb.r}, ${rgb.g}, ${rgb.b}`

            // --fontColor -> --font-color-rgb (keeping the full variable name,
            // so the companion is always the base name plus "-rgb").
            root.style.setProperty(`${cssKey}-rgb`, triplet)

            // Legacy shorter aliases some modules still reference.
            const rgbKey = key.replace('Color', '') + 'Rgb'
            root.style.setProperty(`--${rgbKey.replace(/([A-Z])/g, '-$1').toLowerCase()}`, triplet)

            if (key === 'primaryButtonColor') {
              root.style.setProperty('--primary-button-rgb', triplet)
            }
          }
        }

        if (key === 'secondaryButtonBg' && typeof value === 'string' && value.startsWith('#')) {
          const rgb = hexToRgb(value)
          if (rgb) {
            root.style.setProperty('--secondary-button-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`)
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
      localStorage.removeItem('limedrop-settings')
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