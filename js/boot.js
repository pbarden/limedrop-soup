// Initialize System
const eventBus = new EventBus();
const modalManager = new ModalManager();
const windowManager = new WindowManager();
const fileSystem = new FileSystem();
const appRegistry = new AppRegistry();

// Initialize Desktop
document.addEventListener('DOMContentLoaded', () => {
    try {        
        // Desktop icon clicks with error handling
        document.querySelectorAll('.desktop-icon').forEach(icon => {
            icon.addEventListener('dblclick', () => {
                try {
                    const appId = icon.dataset.app;
                    if (appId && appRegistry) {
                        appRegistry.launchApp(appId);
                    }
                } catch (err) {
                    console.warn('Failed to launch app from desktop icon:', err);
                }
            });
        });
        
        // Dock item clicks with error handling
        document.querySelectorAll('.dock-item').forEach(item => {
            item.addEventListener('click', () => {
                try {
                    const appId = item.dataset.app;
                    if (appId && appRegistry) {
                        appRegistry.launchApp(appId);
                    }
                } catch (err) {
                    console.warn('Failed to launch app from dock:', err);
                }
            });
        });
        
        // Context menu prevention
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Keyboard shortcuts with error handling
        document.addEventListener('keydown', (e) => {
            try {
                // Ctrl/Cmd + O: Open File Manager
                if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                    e.preventDefault();
                    if (appRegistry) appRegistry.launchApp('file-manager');
                }
                
                // Ctrl/Cmd + N: Open App Builder
                if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                    e.preventDefault();
                    if (appRegistry) appRegistry.launchApp('app-builder');
                }
                
                // Ctrl/Cmd + ,: Open Settings
                if ((e.ctrlKey || e.metaKey) && e.key === ',') {
                    e.preventDefault();
                    if (appRegistry) appRegistry.launchApp('settings');
                }
                
                // Ctrl/Cmd + Shift + N: Show notification example
                if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
                    e.preventDefault();
                    if (NotificationManager) {
                        NotificationManager.info('Keyboard shortcuts are working!', 'System');
                    }
                }
            } catch (err) {
                console.warn('Keyboard shortcut failed:', err);
            }
        });
        
        // Load settings with error handling
        try {
            const settings = JSON.parse(localStorage.getItem('limedrop-settings') || '{}');
            if (settings.showIcons === false) {
                const iconsEl = document.querySelector('.desktop-icons');
                if (iconsEl) iconsEl.style.display = 'none';
            }
        } catch (err) {
            console.warn('Failed to load settings:', err);
        }
        
        // Initial CSS variables
        document.documentElement.style.setProperty('--glass-opacity', '0.1');
        document.documentElement.style.setProperty('--glass-blur', '20px');
        
        // Show welcome notification
        if (!localStorage.getItem('limedrop-welcomed')) {
            setTimeout(() => {
                try {
                    if (NotificationManager) {
                        NotificationManager.info(
                            'Double-click desktop icons or use the dock to launch apps. Press Ctrl+O for files, Ctrl+N for app builder.',
                            'Welcome to Limedrop.ai'
                        );
                    }
                    localStorage.setItem('limedrop-welcomed', 'true');
                } catch (err) {
                    console.warn('Failed to show welcome notification:', err);
                }
            }, 1000);
        }
        
    } catch (error) {
        console.error('System initialization failed:', error);
        // Show fallback error message
        document.body.innerHTML = `
            <div style="
                position: fixed; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%);
                background: rgba(255, 67, 54, 0.9);
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                font-family: sans-serif;
            ">
                <h2>System Initialization Failed</h2>
                <p>Please refresh the page to try again.</p>
                <button onclick="location.reload()" style="
                    background: white;
                    color: #333;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 10px;
                ">Refresh</button>
            </div>
        `;
    }
});

// Global Settings Loader - Add this to the end of your boot.js file or create a separate settings-loader.js

class GlobalSettingsLoader {
    static load() {
        const settings = JSON.parse(localStorage.getItem('limedrop-settings') || '{}');
        
        // Initialize CSS custom properties
        this.initializeThemeProperties();
        
        // Apply saved settings
        this.applyFontColor(settings.fontColor);
        this.applyPrimaryButtonStyle(settings.primaryButtonStyle);
        this.applyPrimaryButtonColor(settings.primaryButtonColor);
        this.applyPrimaryGradient(settings.primaryGradientStart, settings.primaryGradientEnd);
        this.applyPrimaryButtonText(settings.primaryButtonText);
        this.applySecondaryButtonBg(settings.secondaryButtonBg, settings.secondaryButtonOpacity);
        this.applySecondaryButtonText(settings.secondaryButtonText);
        this.applySecondaryButtonBorder(settings.secondaryButtonBorder, settings.secondaryBorderOpacity);
        this.applyWindowTint(settings.windowTintColor);
        this.applyBackground(settings.background);
        this.applyDesktopIcons(settings.showIcons);
        
        console.log('Global settings loaded:', settings);
    }
    
    static initializeThemeProperties() {
        const root = document.documentElement;
        
        // Only set defaults if not already set
        if (!root.style.getPropertyValue('--font-color')) {
            root.style.setProperty('--font-color', '#ffffff');
        }
        if (!root.style.getPropertyValue('--primary-button-style')) {
            root.style.setProperty('--primary-button-style', 'solid');
        }
        if (!root.style.getPropertyValue('--primary-button-color')) {
            root.style.setProperty('--primary-button-color', '#667eea');
        }
        if (!root.style.getPropertyValue('--primary-gradient-start')) {
            root.style.setProperty('--primary-gradient-start', '#667eea');
        }
        if (!root.style.getPropertyValue('--primary-gradient-end')) {
            root.style.setProperty('--primary-gradient-end', '#764ba2');
        }
        if (!root.style.getPropertyValue('--primary-button-text')) {
            root.style.setProperty('--primary-button-text', '#ffffff');
        }
        if (!root.style.getPropertyValue('--secondary-button-bg')) {
            root.style.setProperty('--secondary-button-bg', '#ffffff');
        }
        if (!root.style.getPropertyValue('--secondary-button-opacity')) {
            root.style.setProperty('--secondary-button-opacity', '0.1');
        }
        if (!root.style.getPropertyValue('--secondary-button-text')) {
            root.style.setProperty('--secondary-button-text', '#ffffff');
        }
        if (!root.style.getPropertyValue('--secondary-button-border')) {
            root.style.setProperty('--secondary-button-border', '#ffffff');
        }
        if (!root.style.getPropertyValue('--secondary-border-opacity')) {
            root.style.setProperty('--secondary-border-opacity', '0.2');
        }
        if (!root.style.getPropertyValue('--window-tint-color')) {
            root.style.setProperty('--window-tint-color', '#ffffff');
        }
        if (!root.style.getPropertyValue('--window-tint-rgb')) {
            root.style.setProperty('--window-tint-rgb', '255, 255, 255');
        }
        if (!root.style.getPropertyValue('--glass-opacity')) {
            root.style.setProperty('--glass-opacity', '0.8');
        }
        if (!root.style.getPropertyValue('--glass-blur')) {
            root.style.setProperty('--glass-blur', '10px');
        }
    }
    
    static applyFontColor(color) {
        if (color) {
            document.documentElement.style.setProperty('--font-color', color);
        }
    }
    
    static applyPrimaryButtonStyle(style) {
        if (style) {
            document.documentElement.style.setProperty('--primary-button-style', style);
            if (style === 'gradient') {
                document.body.classList.add('gradient-buttons');
            } else {
                document.body.classList.remove('gradient-buttons');
            }
        }
    }
    
    static applyPrimaryButtonColor(color) {
        if (color) {
            document.documentElement.style.setProperty('--primary-button-color', color);
        }
    }
    
    static applyPrimaryGradient(startColor, endColor) {
        if (startColor) {
            document.documentElement.style.setProperty('--primary-gradient-start', startColor);
        }
        if (endColor) {
            document.documentElement.style.setProperty('--primary-gradient-end', endColor);
        }
    }
    
    static applyPrimaryButtonText(color) {
        if (color) {
            document.documentElement.style.setProperty('--primary-button-text', color);
        }
    }
    
    static applySecondaryButtonBg(color, opacity) {
        if (color) {
            const rgb = this.hexToRgb(color);
            if (rgb) {
                document.documentElement.style.setProperty('--secondary-button-bg', color);
                document.documentElement.style.setProperty('--secondary-button-bg-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
            }
        }
        if (opacity !== undefined) {
            document.documentElement.style.setProperty('--secondary-button-opacity', opacity / 100);
        }
    }
    
    static applySecondaryButtonText(color) {
        if (color) {
            document.documentElement.style.setProperty('--secondary-button-text', color);
        }
    }
    
    static applySecondaryButtonBorder(color, opacity) {
        if (color) {
            const rgb = this.hexToRgb(color);
            if (rgb) {
                document.documentElement.style.setProperty('--secondary-button-border', color);
                document.documentElement.style.setProperty('--secondary-button-border-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
            }
        }
        if (opacity !== undefined) {
            document.documentElement.style.setProperty('--secondary-border-opacity', opacity / 100);
        }
    }
    
    static applyWindowTint(color) {
        if (color) {
            const rgb = this.hexToRgb(color);
            if (rgb) {
                document.documentElement.style.setProperty('--window-tint-color', color);
                document.documentElement.style.setProperty('--window-tint-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
            }
        }
    }
    
    static applyBackground(style) {
        if (style) {
            const desktop = document.querySelector('.desktop-background');
            if (desktop) {
                const gradients = {
                    gradient1: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
                    gradient2: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e8ba3 100%)',
                    gradient3: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 50%, #f29400 100%)',
                    gradient4: 'linear-gradient(135deg, #2f2f2f 0%, #4a4a4a 35%, #8f8f8f 70%, #dedede 100%)',
                    gradient5: 'linear-gradient(135deg, #4e2a12 0%, #8a4f2d 35%, #d29b6e 70%, #f6eadc 100%)',
                    gradient6: 'linear-gradient(135deg, #1f4d27 0%, #4f7f3f 35%, #8fbd6b 70%, #eef6e7 100%)',
                    gradient7: 'linear-gradient(135deg, #5f4da8 0%, #8c76c9 35%, #c7b5e6 70%, #f1ecff 100%)',
                    gradient8: 'linear-gradient(135deg, #c74a00 0%, #f07f2f 35%, #ffc78e 70%, #fff3df 100%)',
                    gradient9: 'linear-gradient(135deg, #4a3324 0%, #7a5a3e 35%, #b69576 70%, #efe3d1 100%)',
                    gradient10: 'linear-gradient(135deg, #5c3622 0%, #8a5533 35%, #d09a59 70%, #f2e7cf 100%)',
                    gradient11: 'linear-gradient(135deg, #d8263f 0%, #ff6b6b 35%, #ff9fb1 70%, #ffe3ec 100%)',
                    gradient12: 'linear-gradient(135deg, #ff8a00 0%, #ffb84d 35%, #ffd27f 70%, #fff0cc 100%)',
                    gradient13: 'linear-gradient(135deg, #fff7f7 0%, #fbdde2 35%, #f2b6c3 70%, #d68098 100%)',
                    gradient14: 'linear-gradient(135deg, #ffd24d 0%, #ffb300 35%, #ff8c00 70%, #5a381e 100%)',
                    gradient15: 'linear-gradient(135deg, #452a7a 0%, #6b44b8 35%, #a78bdc 70%, #f2eaff 100%)',
                    gradient16: 'linear-gradient(135deg, #ffffff 0%, #f7fbf9 35%, #e6f3f0 70%, #d5ece8 100%)',
                    gradient17: 'linear-gradient(135deg, #0d1b12 0%, #1a2b22 35%, #2e3c33 70%, #49564c 100%)',
                    gradient18: 'linear-gradient(135deg, #1b0f07 0%, #3b2416 35%, #6b4b31 70%, #a67854 100%)',
                    gradient19: 'linear-gradient(135deg, #7f864f 0%, #b1b873 35%, #dfe6b0 70%, #f7f5e6 100%)',
                    gradient20: 'linear-gradient(135deg, #7f4f2d 0%, #a4673b 35%, #d59a64 70%, #f4e6d5 100%)',
                    gradient21: 'linear-gradient(135deg, #ffe94a 0%, #ffb400 35%, #ff6a00 70%, #7a1e5c 100%)',
                    gradient22: 'linear-gradient(135deg, #5a0f1b 0%, #8d2b34 35%, #b85a63 70%, #f0d2cf 100%)',
                    gradient23: 'linear-gradient(135deg, #1e8a44 0%, #56b870 35%, #a6dfbf 70%, #ffffff 100%)',
                    gradient24: 'linear-gradient(135deg, #ffffff 0%, #8b4a2b 33%, #3b2314 66%, #a0522d 100%)',
                    gradient25: 'linear-gradient(135deg, #fff7fa 0%, #ff7891 22%, #ffdbe6 45%, #b3e6a0 72%, #3e7e3b 100%)',
                    gradient26: 'linear-gradient(135deg, #fffaf2 0%, #b7d7a8 25%, #3e6b2e 50%, #2b1e14 75%, #f1e6d0 100%)',
                    gradient27: 'linear-gradient(135deg, #ffffff 0%, #f0e6cf 22%, #d6a15a 45%, #9c5a1d 72%, #3a2515 100%)',
                    gradient28: 'linear-gradient(135deg, #fff5e6 0%, #f1d3b3 22%, #d1925a 45%, #8a4f2b 72%, #2f1b0a 100%)',
                    gradient29: 'linear-gradient(135deg, #fff5f8 0%, #ffd1e8 22%, #ff9ec7 45%, #f15bb5 72%, #ffe6f1 100%)',
                    gradient30: 'linear-gradient(135deg, #0f0f0f 0%, #2e2e2e 22%, #777777 45%, #c9b8a4 72%, #f1ece4 100%)',
                    gradient31: 'linear-gradient(135deg, #1e3a8a 0%, #3f6bd1 22%, #7fd3f7 45%, #ffd166 72%, #fff7cc 100%)',
                    gradient32: 'linear-gradient(135deg, #eaffea 0%, #c8f7c5 22%, #8bd48a 45%, #5ca86e 72%, #3b6b47 100%)',
                    gradient33: 'linear-gradient(135deg, #fff9f6 0%, #ff2e85 22%, #ff6fb0 45%, #ffd166 72%, #fff1d6 100%)',
                    gradient34: 'linear-gradient(135deg, #f2fff2 0%, #ccf4d1 22%, #a2e6b3 45%, #79c596 72%, #eaffea 100%)',
                    gradient35: 'linear-gradient(135deg, #ffffff 0%, #eaeaea 22%, #c2c2c2 45%, #6e5b4b 72%, #2f251e 100%)',
                    gradient36: 'linear-gradient(135deg, #fff8e7 0%, #e6d2b5 22%, #c9a27a 45%, #6f4e37 72%, #3b2e2a 100%)',
                    gradient37: 'linear-gradient(135deg, #fff7e3 0%, #ffe0a3 22%, #ffc371 45%, #c96b2c 72%, #6b3e2e 100%)',
                    gradient38: 'linear-gradient(135deg, #ffe3ec 0%, #f7b6c6 22%, #f0dee1 45%, #9fd3a8 72%, #5b8c5a 100%)',
                    gradient39: 'linear-gradient(135deg, #ffffff 0%, #f5e6c8 22%, #d4a373 45%, #8b5e34 72%, #2e1b0f 100%)',
                    gradient40: 'linear-gradient(135deg, #f7f5ff 0%, #dcd7ff 22%, #b7b5e8 45%, #6a78a8 72%, #3d4a78 100%)',
                    gradient41: 'linear-gradient(135deg, #fff0e1 0%, #ffc49c 22%, #f77f00 45%, #a3663f 72%, #fff7e9 100%)',
                    gradient42: 'linear-gradient(135deg, #fff5f7 0%, #ffd3de 22%, #ff6b81 45%, #ff3d3d 72%, #ffecee 100%)',
                    gradient43: 'linear-gradient(135deg, #ffffff 0%, #f4efe7 22%, #e2d7c5 45%, #c7b8a1 72%, #8a7a63 100%)',
                    gradient44: 'linear-gradient(135deg, #ffe4ec 0%, #ff6f91 25%, #2dd4bf 50%, #111827 75%, #f5f5f5 100%)',
                    gradient45: 'linear-gradient(135deg, #fff1e6 0%, #00c6ff 25%, #1e3a8a 50%, #ff4dcf 75%, #ffe5d1 100%)',
                    gradient46: 'linear-gradient(135deg, #fff36d 0%, #8bc34a 25%, #1b5e20 50%, #0b0f10 75%, #f5f7fa 100%)',
                    gradient47: 'linear-gradient(135deg, #fffced 0%, #ff6685 22%, #0e9f6e 50%, #111827 72%, #a7f3d0 100%)',
                    gradient48: 'linear-gradient(135deg, #fff0ea 0%, #ff6b6b 25%, #5b32b4 50%, #86b6ff 75%, #f2e9ff 100%)',
                    gradient49: 'linear-gradient(135deg, #4e342e 0%, #86efac 25%, #ec4899 50%, #f9a8d4 75%, #fff1f2 100%)',
                    gradient50: 'linear-gradient(135deg, #fff1cc 0%, #ffb700 25%, #6d28d9 50%, #2e1065 75%, #0f172a 100%)',
                    gradient51: 'linear-gradient(135deg, #fff8f0 0%, #84cc16 25%, #ef4444 50%, #ffe4e6 75%, #fff8f0 100%)',
                    gradient52: 'linear-gradient(135deg, #ffffff 0%, #ff0db0 25%, #84cc16 50%, #111827 75%, #f5f5f5 100%)',
                    gradient53: 'linear-gradient(135deg, #ff7a00 0%, #ffd29c 25%, #b3a08a 50%, #2f2f2f 75%, #fffaf2 100%)'
                };
                desktop.style.background = gradients[style] || gradients.gradient1;
            }
        }
    }
    
    static applyDesktopIcons(show) {
        if (show !== undefined) {
            const icons = document.querySelector('.desktop-icons');
            if (icons) {
                icons.style.display = show ? 'flex' : 'none';
            }
        }
    }
    
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}

// Load settings immediately when the page loads
document.addEventListener('DOMContentLoaded', () => {
    GlobalSettingsLoader.load();
});

// Also load settings when the window loads (as a backup)
window.addEventListener('load', () => {
    GlobalSettingsLoader.load();
});

// Export for debugging
window.limedrop = {
    eventBus,
    modalManager,
    windowManager,
    fileSystem,
    appRegistry,
    NotificationManager,
    IconPicker
};

