// Settings Component
class Settings {
    constructor(windowEl) {
        this.windowEl = windowEl;
        this.init();
    }

    init() {
        this.attachEvents();
        this.loadSettings();
        this.initializeColorTheme();
    }

    attachEvents() {
        const bgSelect = this.windowEl.querySelector('#theme-background');
        const autoSaveCheck = this.windowEl.querySelector('#auto-save');
        const showIconsCheck = this.windowEl.querySelector('#show-icons');
        const clearBtn = this.windowEl.querySelector('.clear-storage');
        const fontColorPicker = this.windowEl.querySelector('#font-color');
        const buttonBgColorPicker = this.windowEl.querySelector('#button-bg-color');
        const buttonTextColorPicker = this.windowEl.querySelector('#button-text-color');
        const windowTintColorPicker = this.windowEl.querySelector('#window-tint-color');
        const colorResetBtns = this.windowEl.querySelectorAll('.color-reset');

        fontColorPicker.addEventListener('input', (e) => {
            this.changeFontColor(e.target.value);
        });

        buttonBgColorPicker.addEventListener('input', (e) => {
            this.changeButtonBgColor(e.target.value);
        });

        buttonTextColorPicker.addEventListener('input', (e) => {
            this.changeButtonTextColor(e.target.value);
        });

        windowTintColorPicker.addEventListener('input', (e) => {
            this.changeWindowTint(e.target.value);
        });

        // Color reset buttons
        colorResetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.target.dataset.target;
                const defaultValue = e.target.dataset.default;
                const targetInput = this.windowEl.querySelector(`#${targetId}`);
                
                if (targetInput) {
                    targetInput.value = defaultValue;
                    // Trigger the input event to apply the change
                    targetInput.dispatchEvent(new Event('input'));
                }
            });
        });
        
        bgSelect.addEventListener('change', (e) => {
            this.changeBackground(e.target.value);
        });
        
        autoSaveCheck.addEventListener('change', (e) => {
            this.toggleAutoSave(e.target.checked);
        });
        
        showIconsCheck.addEventListener('change', (e) => {
            this.toggleDesktopIcons(e.target.checked);
        });
        
        clearBtn.addEventListener('click', async () => {
            const confirmed = await modalManager.confirm(
                'This will delete all apps, files, and settings. This action cannot be undone.',
                'Clear All Data'
            );
            
            if (confirmed) {
                const loadingModal = modalManager.loading('Clearing all data...');
                
                setTimeout(() => {
                    localStorage.clear();
                    loadingModal.update('Data cleared. Reloading...');
                    
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                }, 500);
            }
        });
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('limedrop-settings') || '{}');
        
        if (settings.background) {
            this.windowEl.querySelector('#theme-background').value = settings.background;
            this.changeBackground(settings.background);
        }
        
    }

    saveSettings() {
        const settings = {
            background: this.windowEl.querySelector('#theme-background').value,
            autoSave: this.windowEl.querySelector('#auto-save').checked,
            showIcons: this.windowEl.querySelector('#show-icons').checked
        };
        
        localStorage.setItem('limedrop-settings', JSON.stringify(settings));
    }

    changeBackground(style) {
        const desktop = document.querySelector('.desktop-background');
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
            gradient53: 'linear-gradient(135deg, #ff7a00 0%, #ffd29c 25%, #b3a08a 50%, #2f2f2f 75%, #fffaf2 100%)',
        };
        
        desktop.style.background = gradients[style] || gradients.gradient1;
        this.saveSettings();
    }

    toggleAutoSave(enabled) {
        // Auto-save is always on in this implementation
        this.saveSettings();
    }

    toggleDesktopIcons(show) {
        const icons = document.querySelector('.desktop-icons');
        icons.style.display = show ? 'flex' : 'none';
        this.saveSettings();
    }

    initializeColorTheme() {
        // Set up CSS custom properties for theming
        const root = document.documentElement;
        
        // Default values
        root.style.setProperty('--font-color', '#ffffff');
        root.style.setProperty('--button-bg-color', '#667eea');
        root.style.setProperty('--button-text-color', '#ffffff');
        root.style.setProperty('--window-tint-color', '#ffffff');
        root.style.setProperty('--glass-opacity', '0.8');
        root.style.setProperty('--glass-blur', '10px');
    }

    changeFontColor(color) {
        document.documentElement.style.setProperty('--font-color', color);
        this.saveSettings();
    }

    changeButtonBgColor(color) {
        document.documentElement.style.setProperty('--button-bg-color', color);
        this.saveSettings();
    }

    changeButtonTextColor(color) {
        document.documentElement.style.setProperty('--button-text-color', color);
        this.saveSettings();
    }

    changeWindowTint(color) {
        // Convert hex color to RGB for use with CSS filters or overlays
        const rgb = this.hexToRgb(color);
        if (rgb) {
            // Apply a color overlay to windows using mix-blend-mode or filter
            document.documentElement.style.setProperty('--window-tint-color', color);
            document.documentElement.style.setProperty('--window-tint-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
        this.saveSettings();
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
}
