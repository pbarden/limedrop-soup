import { useState, useEffect } from 'react'
import { useSettings } from '../../contexts/SettingsContext'
import { useApp } from '../../contexts/AppContext'
import styles from '../../styles/Settings.module.css'

function Settings() {
  const { settings, updateSetting, resetSettings } = useSettings()
  const { showModal, closeModal } = useApp()

  // Find current gradient info
  const getCurrentGradient = () => {
    return backgroundGradients.find(g => g.gradient === settings.backgroundStyle) || backgroundGradients[0]
  }

  const BackgroundSelectorModal = () => {
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [forceUpdate, setForceUpdate] = useState(0)
    
    // Get current gradient reactively (this will update when settings change)
    const currentGradient = backgroundGradients.find(g => g.gradient === settings.backgroundStyle) || backgroundGradients[0]
    
    // Organize gradients by category
    const categories = {
      'all': { name: 'All Themes', icon: '🎨' },
      'classic': { name: 'Classic', icon: '☕' },
      'fruit': { name: 'Fruity', icon: '🍓' },
      'milk-tea': { name: 'Milk Teas', icon: '🧋' },
      'exotic': { name: 'Exotic', icon: '🌺' },
      'dessert': { name: 'Desserts', icon: '🍰' }
    }
    
    const getGradientCategory = (gradient) => {
      const name = gradient.name.toLowerCase()
      if (name.includes('milk') || name.includes('tea') || name.includes('latte') || name.includes('oolong') || name.includes('chai')) return 'milk-tea'
      if (name.includes('strawberry') || name.includes('mango') || name.includes('peach') || name.includes('kiwi') || name.includes('guava') || name.includes('dragonfruit') || name.includes('blueberry')) return 'fruit'
      if (name.includes('cream') || name.includes('jelly') || name.includes('cookies') || name.includes('tiramisu') || name.includes('caramel')) return 'dessert'
      if (name.includes('butterfly') || name.includes('charcoal') || name.includes('sesame') || name.includes('ube') || name.includes('pandan')) return 'exotic'
      return 'classic'
    }
    
    const filteredGradients = backgroundGradients.filter(gradient => {
      const matchesCategory = selectedCategory === 'all' || getGradientCategory(gradient) === selectedCategory
      const matchesSearch = gradient.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })
    
    return (
      <div className={styles.backgroundSelectorModal}>
        <div className={styles.selectorHeader}>
          <div className={styles.searchContainer}>
            <i className="fas fa-search"></i>
            <input 
              type="text"
              placeholder="Search themes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
        
        <div className={styles.categoriesContainer}>
          {Object.entries(categories).map(([key, category]) => (
            <button
              key={key}
              className={`${styles.categoryButton} ${selectedCategory === key ? styles.active : ''}`}
              onClick={() => setSelectedCategory(key)}
            >
              <span className={styles.categoryIcon}>{category.icon}</span>
              <span className={styles.categoryName}>{category.name}</span>
            </button>
          ))}
        </div>
        
        <div className={styles.backgroundGrid}>
          {filteredGradients.map(gradient => (
            <div
              key={gradient.id}
              className={`${styles.backgroundOption} ${currentGradient.id === gradient.id ? styles.selected : ''}`}
              onClick={() => {
                updateSetting('backgroundStyle', gradient.gradient)
                // Force re-render to update selection indicators
                setForceUpdate(prev => prev + 1)
              }}
            >
              <div 
                className={styles.backgroundPreview}
                style={{ background: gradient.gradient }}
              >
                <div className={styles.previewOverlay}>
                  {currentGradient.id === gradient.id && (
                    <i className={`fas fa-check ${styles.selectedIcon}`}></i>
                  )}
                </div>
              </div>
              <div className={styles.backgroundInfo}>
                <span className={styles.backgroundName}>{gradient.name}</span>
                <span className={styles.backgroundCategory}>{categories[getGradientCategory(gradient)].name}</span>
              </div>
            </div>
          ))}
        </div>
        
        {filteredGradients.length === 0 && (
          <div className={styles.noResults}>
            <i className="fas fa-search"></i>
            <p>No themes found matching your criteria</p>
          </div>
        )}
      </div>
    )
  }

  const handleOpenBackgroundSelector = () => {
    console.log('Opening background selector modal')
    showModal({
      title: '🎨 Choose Your Theme',
      content: <BackgroundSelectorModal />,
      size: 'large'
    })
  }

  const backgroundGradients = [
    { id: 'gradient1', name: 'Raspberry Lemonade', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)' },
    { id: 'gradient2', name: 'Blue Java', gradient: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e8ba3 100%)' },
    { id: 'gradient3', name: 'Mango Sherbert', gradient: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 50%, #f29400 100%)' },
    { id: 'gradient4', name: 'Black Sesame', gradient: 'linear-gradient(135deg, #2f2f2f 0%, #4a4a4a 35%, #8f8f8f 70%, #dedede 100%)' },
    { id: 'gradient5', name: 'Brown Sugar Milk', gradient: 'linear-gradient(135deg, #4e2a12 0%, #8a4f2d 35%, #d29b6e 70%, #f6eadc 100%)' },
    { id: 'gradient6', name: 'Matcha Latte', gradient: 'linear-gradient(135deg, #1f4d27 0%, #4f7f3f 35%, #8fbd6b 70%, #eef6e7 100%)' },
    { id: 'gradient7', name: 'Taro Milk', gradient: 'linear-gradient(135deg, #5f4da8 0%, #8c76c9 35%, #c7b5e6 70%, #f1ecff 100%)' },
    { id: 'gradient8', name: 'Thai Tea', gradient: 'linear-gradient(135deg, #c74a00 0%, #f07f2f 35%, #ffc78e 70%, #fff3df 100%)' },
    { id: 'gradient9', name: 'Hojicha Latte', gradient: 'linear-gradient(135deg, #4a3324 0%, #7a5a3e 35%, #b69576 70%, #efe3d1 100%)' },
    { id: 'gradient10', name: 'Chai Spice', gradient: 'linear-gradient(135deg, #5c3622 0%, #8a5533 35%, #d09a59 70%, #f2e7cf 100%)' },
    { id: 'gradient11', name: 'Strawberry Jelly', gradient: 'linear-gradient(135deg, #d8263f 0%, #ff6b6b 35%, #ff9fb1 70%, #ffe3ec 100%)' },
    { id: 'gradient12', name: 'Mango Jelly', gradient: 'linear-gradient(135deg, #ff8a00 0%, #ffb84d 35%, #ffd27f 70%, #fff0cc 100%)' },
    { id: 'gradient13', name: 'Lychee Rose', gradient: 'linear-gradient(135deg, #fff7f7 0%, #fbdde2 35%, #f2b6c3 70%, #d68098 100%)' },
    { id: 'gradient14', name: 'Honey Boba', gradient: 'linear-gradient(135deg, #ffd24d 0%, #ffb300 35%, #ff8c00 70%, #5a381e 100%)' },
    { id: 'gradient15', name: 'Ube Cream', gradient: 'linear-gradient(135deg, #452a7a 0%, #6b44b8 35%, #a78bdc 70%, #f2eaff 100%)' },
    { id: 'gradient16', name: 'Coconut Jelly', gradient: 'linear-gradient(135deg, #ffffff 0%, #f7fbf9 35%, #e6f3f0 70%, #d5ece8 100%)' },
    { id: 'gradient17', name: 'Grass Jelly', gradient: 'linear-gradient(135deg, #0d1b12 0%, #1a2b22 35%, #2e3c33 70%, #49564c 100%)' },
    { id: 'gradient18', name: 'Coffee Jelly', gradient: 'linear-gradient(135deg, #1b0f07 0%, #3b2416 35%, #6b4b31 70%, #a67854 100%)' },
    { id: 'gradient19', name: 'Wintermelon Milk', gradient: 'linear-gradient(135deg, #7f864f 0%, #b1b873 35%, #dfe6b0 70%, #f7f5e6 100%)' },
    { id: 'gradient20', name: 'Oolong Milk Tea', gradient: 'linear-gradient(135deg, #7f4f2d 0%, #a4673b 35%, #d59a64 70%, #f4e6d5 100%)' },
    { id: 'gradient21', name: 'Passionfruit Pop', gradient: 'linear-gradient(135deg, #ffe94a 0%, #ffb400 35%, #ff6a00 70%, #7a1e5c 100%)' },
    { id: 'gradient22', name: 'Red Bean', gradient: 'linear-gradient(135deg, #5a0f1b 0%, #8d2b34 35%, #b85a63 70%, #f0d2cf 100%)' },
    { id: 'gradient23', name: 'Pandan Coconut', gradient: 'linear-gradient(135deg, #1e8a44 0%, #56b870 35%, #a6dfbf 70%, #ffffff 100%)' },
    { id: 'gradient24', name: 'Chai Latte Layered', gradient: 'linear-gradient(135deg, #ffffff 0%, #8b4a2b 33%, #3b2314 66%, #a0522d 100%)' },
    { id: 'gradient25', name: 'Strawberry Matcha', gradient: 'linear-gradient(135deg, #fff7fa 0%, #ff7891 22%, #ffdbe6 45%, #b3e6a0 72%, #3e7e3b 100%)' },
    { id: 'gradient26', name: 'Dirty Matcha', gradient: 'linear-gradient(135deg, #fffaf2 0%, #b7d7a8 25%, #3e6b2e 50%, #2b1e14 75%, #f1e6d0 100%)' },
    { id: 'gradient27', name: 'Sea Salt Cheese Foam', gradient: 'linear-gradient(135deg, #ffffff 0%, #f0e6cf 22%, #d6a15a 45%, #9c5a1d 72%, #3a2515 100%)' },
    { id: 'gradient28', name: 'Tiger Milk', gradient: 'linear-gradient(135deg, #fff5e6 0%, #f1d3b3 22%, #d1925a 45%, #8a4f2b 72%, #2f1b0a 100%)' },
    { id: 'gradient29', name: 'Sakura Lychee Milk', gradient: 'linear-gradient(135deg, #fff5f8 0%, #ffd1e8 22%, #ff9ec7 45%, #f15bb5 72%, #ffe6f1 100%)' },
    { id: 'gradient30', name: 'Charcoal Sesame Latte', gradient: 'linear-gradient(135deg, #0f0f0f 0%, #2e2e2e 22%, #777777 45%, #c9b8a4 72%, #f1ece4 100%)' },
    { id: 'gradient31', name: 'Butterfly Pea Lemonade', gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3f6bd1 22%, #7fd3f7 45%, #ffd166 72%, #fff7cc 100%)' },
    { id: 'gradient32', name: 'Kiwi Aloe', gradient: 'linear-gradient(135deg, #eaffea 0%, #c8f7c5 22%, #8bd48a 45%, #5ca86e 72%, #3b6b47 100%)' },
    { id: 'gradient33', name: 'Dragonfruit Yakult', gradient: 'linear-gradient(135deg, #fff9f6 0%, #ff2e85 22%, #ff6fb0 45%, #ffd166 72%, #fff1d6 100%)' },
    { id: 'gradient34', name: 'Honeydew Melon Milk', gradient: 'linear-gradient(135deg, #f2fff2 0%, #ccf4d1 22%, #a2e6b3 45%, #79c596 72%, #eaffea 100%)' },
    { id: 'gradient35', name: 'Cookies & Cream', gradient: 'linear-gradient(135deg, #ffffff 0%, #eaeaea 22%, #c2c2c2 45%, #6e5b4b 72%, #2f251e 100%)' },
    { id: 'gradient36', name: 'Tiramisu Milk Tea', gradient: 'linear-gradient(135deg, #fff8e7 0%, #e6d2b5 22%, #c9a27a 45%, #6f4e37 72%, #3b2e2a 100%)' },
    { id: 'gradient37', name: 'Crème Brûlée Milk', gradient: 'linear-gradient(135deg, #fff7e3 0%, #ffe0a3 22%, #ffc371 45%, #c96b2c 72%, #6b3e2e 100%)' },
    { id: 'gradient38', name: 'Rose Pistachio Milk', gradient: 'linear-gradient(135deg, #ffe3ec 0%, #f7b6c6 22%, #f0dee1 45%, #9fd3a8 72%, #5b8c5a 100%)' },
    { id: 'gradient39', name: 'Salted Caramel Cold Foam', gradient: 'linear-gradient(135deg, #ffffff 0%, #f5e6c8 22%, #d4a373 45%, #8b5e34 72%, #2e1b0f 100%)' },
    { id: 'gradient40', name: 'Blueberry Lavender Milk', gradient: 'linear-gradient(135deg, #f7f5ff 0%, #dcd7ff 22%, #b7b5e8 45%, #6a78a8 72%, #3d4a78 100%)' },
    { id: 'gradient41', name: 'Peach Oolong Cream', gradient: 'linear-gradient(135deg, #fff0e1 0%, #ffc49c 22%, #f77f00 45%, #a3663f 72%, #fff7e9 100%)' },
    { id: 'gradient42', name: 'Guava Strawberry Cream', gradient: 'linear-gradient(135deg, #fff5f7 0%, #ffd3de 22%, #ff6b81 45%, #ff3d3d 72%, #ffecee 100%)' },
    { id: 'gradient43', name: 'Almond Jelly Milk', gradient: 'linear-gradient(135deg, #ffffff 0%, #f4efe7 22%, #e2d7c5 45%, #c7b8a1 72%, #8a7a63 100%)' },
    { id: 'gradient44', name: 'Guava Mint Charcoal', gradient: 'linear-gradient(135deg, #ffe4ec 0%, #ff6f91 25%, #2dd4bf 50%, #111827 75%, #f5f5f5 100%)' },
    { id: 'gradient45', name: 'Blue Raspberry Yakult', gradient: 'linear-gradient(135deg, #fff1e6 0%, #00c6ff 25%, #1e3a8a 50%, #ff4dcf 75%, #ffe5d1 100%)' },
    { id: 'gradient46', name: 'Pineapple Matcha Charcoal', gradient: 'linear-gradient(135deg, #fff36d 0%, #8bc34a 25%, #1b5e20 50%, #0b0f10 75%, #f5f7fa 100%)' },
    { id: 'gradient47', name: 'Watermelon Basil Fizz', gradient: 'linear-gradient(135deg, #fffced 0%, #ff6685 22%, #0e9f6e 50%, #111827 72%, #a7f3d0 100%)' },
    { id: 'gradient48', name: 'Grapefruit Butterfly Pea', gradient: 'linear-gradient(135deg, #fff0ea 0%, #ff6b6b 25%, #5b32b4 50%, #86b6ff 75%, #f2e9ff 100%)' },
    { id: 'gradient49', name: 'Cocoa Mint Pink Salt', gradient: 'linear-gradient(135deg, #4e342e 0%, #86efac 25%, #ec4899 50%, #f9a8d4 75%, #fff1f2 100%)' },
    { id: 'gradient50', name: 'Mango Ube Charcoal Swirl', gradient: 'linear-gradient(135deg, #fff1cc 0%, #ffb700 25%, #6d28d9 50%, #2e1065 75%, #0f172a 100%)' },
    { id: 'gradient51', name: 'Kiwi Strawberry Latte', gradient: 'linear-gradient(135deg, #fff8f0 0%, #84cc16 25%, #ef4444 50%, #ffe4e6 75%, #fff8f0 100%)' },
    { id: 'gradient52', name: 'Dragonfruit Lime Cream', gradient: 'linear-gradient(135deg, #ffffff 0%, #ff0db0 25%, #84cc16 50%, #111827 75%, #f5f5f5 100%)' },
    { id: 'gradient53', name: 'Orange Sesame Cream', gradient: 'linear-gradient(135deg, #ff7a00 0%, #ffd29c 25%, #b3a08a 50%, #2f2f2f 75%, #fffaf2 100%)' }
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
    const rawStorage = localStorage.getItem('chaiq-settings')
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
      localStorage.removeItem('chaiq-files')
      localStorage.removeItem('chaiq-apps')
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
          <div className={styles.backgroundSelector}>
            <div className={styles.currentBackground}>
              <div 
                className={styles.currentGradientPreview}
                style={{ background: getCurrentGradient().gradient }}
              ></div>
              <span className={styles.currentGradientName}>{getCurrentGradient().name}</span>
            </div>
            <button 
              className={styles.backgroundSelectorButton}
              onClick={handleOpenBackgroundSelector}
            >
              Choose Background
            </button>
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