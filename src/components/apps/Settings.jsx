import { useState, useEffect } from 'react'
import { useSettings } from '../../hooks/useSettings'
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

  const windowControlIcons = [
    { id: 'default', name: 'Default', symbol: '−' },
    { id: 'fas fa-minus', name: 'Minus', symbol: '−' },
    { id: 'fas fa-window-minimize', name: 'Window', symbol: '' },
    { id: 'fas fa-chevron-down', name: 'Chevron Down', symbol: '' },
    { id: 'fas fa-angle-down', name: 'Angle Down', symbol: '' }
  ]

  const handleColorChange = (key, value) => {
    updateSetting(key, value)
  }

  const handleSliderChange = (key, value) => {
    updateSetting(key, value)
  }

  const handleBackgroundChange = (gradient) => {
    updateSetting('backgroundStyle', gradient)
  }

  const testCSSVariables = () => {
    const root = document.documentElement
    const testColor = '#ff0000' // Red
    root.style.setProperty('--primary-button-color', testColor)
    console.log('🧪 Test: Set --primary-button-color to red')
    console.log('Current CSS vars:', {
      'primary-button-color': getComputedStyle(root).getPropertyValue('--primary-button-color'),
      'font-color': getComputedStyle(root).getPropertyValue('--font-color'),
      'window-tint-rgb': getComputedStyle(root).getPropertyValue('--window-tint-rgb')
    })
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
            <label>Font Color:</label>
            <input 
              type="color"
              value={settings.fontColor}
              onChange={(e) => handleColorChange('fontColor', e.target.value)}
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
            <label>Secondary Button Color:</label>
            <input 
              type="color"
              value={settings.secondaryButtonBg}
              onChange={(e) => handleColorChange('secondaryButtonBg', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.settingsSection}>
          <h3>Windows</h3>
          
          <div className={styles.colorControl}>
            <label>Window Tint Color:</label>
            <input 
              type="color"
              value={settings.windowTintColor}
              onChange={(e) => handleColorChange('windowTintColor', e.target.value)}
            />
          </div>

          <div className={styles.colorControl}>
            <label>Window Header Color:</label>
            <input 
              type="color"
              value={settings.windowHeaderColor}
              onChange={(e) => handleColorChange('windowHeaderColor', e.target.value)}
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
          
          <div className={styles.windowControl}>
            <label>Minimize Icon:</label>
            <select 
              value={settings.minimizeIcon}
              onChange={(e) => updateSetting('minimizeIcon', e.target.value)}
            >
              {windowControlIcons.map(icon => (
                <option key={icon.id} value={icon.id}>
                  {icon.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className={styles.windowControl}>
            <label>Maximize Icon:</label>
            <select 
              value={settings.maximizeIcon}
              onChange={(e) => updateSetting('maximizeIcon', e.target.value)}
            >
              {windowControlIcons.map(icon => (
                <option key={icon.id} value={icon.id}>
                  {icon.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className={styles.windowControl}>
            <label>Close Icon:</label>
            <select 
              value={settings.closeIcon}
              onChange={(e) => updateSetting('closeIcon', e.target.value)}
            >
              {windowControlIcons.map(icon => (
                <option key={icon.id} value={icon.id}>
                  {icon.name}
                </option>
              ))}
            </select>
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