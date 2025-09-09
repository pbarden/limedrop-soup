import { useState, useEffect } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import styles from '../../styles/Settings.module.css'

function Settings() {
  const { settings, updateSetting, resetSettings } = useSettings()

  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  ]

  const minimizeIcons = [
    { id: 'default', name: 'Default', symbol: '−' },
    { id: 'fas fa-minus', name: 'Minus' },
    { id: 'fas fa-window-minimize', name: 'Window Minimize' },
    { id: 'fas fa-chevron-down', name: 'Chevron Down' },
    { id: 'fas fa-angle-down', name: 'Angle Down' },
    { id: 'fas fa-compress-alt', name: 'Compress' }
  ]

  const maximizeIcons = [
    { id: 'default', name: 'Default', symbol: '□' },
    { id: 'fas fa-expand-alt', name: 'Expand' },
    { id: 'fas fa-external-link-alt', name: 'External Link' },
    { id: 'fas fa-arrows-alt', name: 'Arrows' },
    { id: 'fas fa-maximize', name: 'Maximize' },
    { id: 'fas fa-square', name: 'Square' }
  ]

  const closeIcons = [
    { id: 'default', name: 'Default', symbol: '×' },
    { id: 'fas fa-times', name: 'X Close' },
    { id: 'fas fa-times-circle', name: 'Circle X' },
    { id: 'fas fa-ban', name: 'Ban' },
    { id: 'fas fa-skull-crossbones', name: 'Skull' },
    { id: 'fas fa-bomb', name: 'Bomb' }
  ]

  const handleColorChange = (key, value) => {
    console.log(`🎨 handleColorChange: ${key} = ${value}`)
    console.log('Current settings before change:', settings[key])
    const result = updateSetting(key, value)
    console.log('updateSetting result:', result)
    setTimeout(() => {
      console.log('Settings after change:', settings[key])
    }, 100)
  }

  const handleSliderChange = (key, value) => {
    console.log(`🎚️ handleSliderChange: ${key} = ${value}`)
    console.log('Current settings before change:', settings[key])
    const result = updateSetting(key, value)
    console.log('updateSetting result:', result)
    setTimeout(() => {
      console.log('Settings after change:', settings[key])
    }, 100)
  }

  const handleBackgroundChange = (gradient) => {
    updateSetting('backgroundStyle', gradient)
  }

  const testCSSVariables = () => {
    const root = document.documentElement
    console.log('🧪 === CRITICAL SETTINGS DEBUG ===')
    
    // Check localStorage directly
    const rawStorage = localStorage.getItem('limedrop-settings')
    console.log('Raw localStorage:', rawStorage)
    const parsedStorage = rawStorage ? JSON.parse(rawStorage) : null
    console.log('Parsed localStorage:', parsedStorage)
    
    // Check current settings object
    console.log('Current settings object:', settings)
    console.log('Settings object length:', Object.keys(settings).length)
    
    // Check specific values
    console.log('Font colors in settings:', {
      fontColor: settings.fontColor,
      desktopFontColor: settings.desktopFontColor,
      windowFontColor: settings.windowFontColor,
      headerFontColor: settings.headerFontColor
    })
    
    // Check CSS variables
    const criticalVars = [
      'font-color', 'desktop-font-color', 'window-font-color', 'header-font-color',
      'primary-button-color', 'background-style', 'window-tint-color', 'window-tint-rgb'
    ]
    console.log('CSS Variables:')
    criticalVars.forEach(varName => {
      const value = getComputedStyle(root).getPropertyValue(`--${varName}`).trim()
      console.log(`  --${varName}: "${value}"`)
    })
    
    // Test manual setting
    console.log('🔧 Testing manual CSS variable setting...')
    root.style.setProperty('--font-color', '#ff0000')
    root.style.setProperty('--desktop-font-color', '#00ff00') 
    root.style.setProperty('--window-font-color', '#0000ff')
    console.log('Set font colors to red/green/blue manually')
  }

  const clearStorage = () => {
    if (confirm('Are you sure you want to clear all settings? This cannot be undone.')) {
      resetSettings()
      localStorage.removeItem('limedrop-files')
      localStorage.removeItem('limedrop-apps')
      window.location.reload()
    }
  }

  return (
    <div className={styles.settings}>
      <div className={styles.settingsHeader}>
        <h2>System Settings</h2>
      </div>
      
      <div className={styles.settingsBody}>
        <div className={styles.settingsSection}>
          <h3>Typography</h3>
          
          <div className={styles.colorControl}>
            <label>General Font Color:</label>
            <input 
              type="color"
              value={settings.fontColor}
              onChange={(e) => handleColorChange('fontColor', e.target.value)}
            />
          </div>

          <div className={styles.colorControl}>
            <label>Desktop Font Color:</label>
            <input 
              type="color"
              value={settings.desktopFontColor}
              onChange={(e) => handleColorChange('desktopFontColor', e.target.value)}
            />
          </div>

          <div className={styles.colorControl}>
            <label>Window Font Color:</label>
            <input 
              type="color"
              value={settings.windowFontColor}
              onChange={(e) => handleColorChange('windowFontColor', e.target.value)}
            />
          </div>

          <div className={styles.colorControl}>
            <label>Header Font Color:</label>
            <input 
              type="color"
              value={settings.headerFontColor}
              onChange={(e) => handleColorChange('headerFontColor', e.target.value)}
            />
          </div>

        </div>

        <div className={styles.settingsSection}>
          <h3>Colors & Theme</h3>
          
          <div className={styles.colorControl}>
            <label>Primary Button Color:</label>
            <input 
              type="color"
              value={settings.primaryButtonColor}
              onChange={(e) => handleColorChange('primaryButtonColor', e.target.value)}
            />
          </div>

          <div className={styles.colorControl}>
            <label>Button Font Color:</label>
            <input 
              type="color"
              value={settings.primaryButtonTextColor}
              onChange={(e) => handleColorChange('primaryButtonTextColor', e.target.value)}
            />
          </div>

          <div className={styles.checkboxControl}>
            <label>
              <input 
                type="checkbox"
                checked={settings.matchDesktopTheme}
                onChange={(e) => updateSetting('matchDesktopTheme', e.target.checked)}
              />
              Match Desktop Theme
            </label>
          </div>

          <div className={styles.colorControl}>
            <label>Secondary Button Color:</label>
            <input 
              type="color"
              value={settings.secondaryButtonBg}
              onChange={(e) => handleColorChange('secondaryButtonBg', e.target.value)}
            />
          </div>

          <div className={styles.colorControl}>
            <label>Secondary Button Font Color:</label>
            <input 
              type="color"
              value={settings.secondaryButtonTextColor}
              onChange={(e) => handleColorChange('secondaryButtonTextColor', e.target.value)}
            />
          </div>
        </div>


        <div className={styles.settingsSection}>
          <h3>Desktop & Icons</h3>
          
          <div className={styles.colorControl}>
            <label>Icon Color:</label>
            <input 
              type="color"
              value={settings.desktopIconColor}
              onChange={(e) => handleColorChange('desktopIconColor', e.target.value)}
            />
          </div>

          <div className={styles.sliderControl}>
            <label>Desktop Icon Size: {settings.desktopIconSize}</label>
            <input 
              type="range"
              min="0.8"
              max="3.0"
              step="0.1"
              value={parseFloat(settings.desktopIconSize)}
              onChange={(e) => handleSliderChange('desktopIconSize', e.target.value + 'rem')}
            />
          </div>
        </div>

        <div className={styles.settingsSection}>
          <h3>Window Transparency</h3>
          
          <div className={styles.sliderControl}>
            <label>Glass Opacity: {settings.glassOpacity}</label>
            <input 
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={parseFloat(settings.glassOpacity)}
              onChange={(e) => handleSliderChange('glassOpacity', e.target.value)}
            />
          </div>

          <div className={styles.sliderControl}>
            <label>Glass Blur: {settings.glassBlur}</label>
            <input 
              type="range"
              min="0"
              max="20"
              step="1"
              value={parseInt(settings.glassBlur)}
              onChange={(e) => handleSliderChange('glassBlur', e.target.value + 'px')}
            />
          </div>

          <div className={styles.sliderControl}>
            <label>Window Header Opacity: {settings.windowHeaderOpacity}</label>
            <input 
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={parseFloat(settings.windowHeaderOpacity)}
              onChange={(e) => handleSliderChange('windowHeaderOpacity', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.settingsSection}>
          <h3>Background</h3>
          <div className={styles.gradientGrid}>
            {gradients.map((gradient, index) => (
              <div
                key={index}
                className={styles.gradientPreview}
                style={{ background: gradient }}
                onClick={() => handleBackgroundChange(gradient)}
                title={`Gradient ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className={styles.settingsSection}>
          <h3>Window Controls</h3>
          
          <div className={styles.iconControlGroup}>
            <label className={styles.iconControlLabel}>Minimize Icon:</label>
            <div className={styles.iconButtonGroup}>
              {minimizeIcons.map(icon => (
                <button
                  key={icon.id}
                  className={`${styles.iconButton} ${settings.minimizeIcon === icon.id ? styles.selected : ''}`}
                  onClick={() => updateSetting('minimizeIcon', icon.id)}
                  title={icon.name}
                >
                  {icon.id === 'default' ? icon.symbol : <i className={icon.id}></i>}
                </button>
              ))}
            </div>
          </div>
          
          <div className={styles.iconControlGroup}>
            <label className={styles.iconControlLabel}>Maximize Icon:</label>
            <div className={styles.iconButtonGroup}>
              {maximizeIcons.map(icon => (
                <button
                  key={icon.id}
                  className={`${styles.iconButton} ${settings.maximizeIcon === icon.id ? styles.selected : ''}`}
                  onClick={() => updateSetting('maximizeIcon', icon.id)}
                  title={icon.name}
                >
                  {icon.id === 'default' ? icon.symbol : <i className={icon.id}></i>}
                </button>
              ))}
            </div>
          </div>
          
          <div className={styles.iconControlGroup}>
            <label className={styles.iconControlLabel}>Close Icon:</label>
            <div className={styles.iconButtonGroup}>
              {closeIcons.map(icon => (
                <button
                  key={icon.id}
                  className={`${styles.iconButton} ${settings.closeIcon === icon.id ? styles.selected : ''}`}
                  onClick={() => updateSetting('closeIcon', icon.id)}
                  title={icon.name}
                >
                  {icon.id === 'default' ? icon.symbol : <i className={icon.id}></i>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.settingsSection}>
          <h3>System</h3>

          
          <div className={styles.checkboxControl}>
            <label>
              <input 
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => updateSetting('autoSave', e.target.checked)}
              />
              Auto-save changes
            </label>
          </div>
          
          <div className={styles.checkboxControl}>
            <label>
              <input 
                type="checkbox"
                checked={settings.showIcons}
                onChange={(e) => updateSetting('showIcons', e.target.checked)}
              />
              Show desktop icons
            </label>
          </div>
          
          <div className={styles.testZone}>
            <h4>Debug & Testing</h4>
            <button className="btn-primary" onClick={testCSSVariables}>
              Test CSS Variables
            </button>
            <p>Click to test if CSS variables are working. Check console.</p>
          </div>

          <div className={styles.dangerZone}>
            <h4>Danger Zone</h4>
            <button className="btn-danger" onClick={clearStorage}>
              Clear All Storage
            </button>
            <p>This will delete all your settings, files, and apps. Cannot be undone.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings