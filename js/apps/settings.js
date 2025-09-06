// Settings Component
class Settings {
    constructor(windowEl) {
        this.windowEl = windowEl;
        this.init();
    }

    init() {
        this.attachEvents();
        this.loadSettings();
    }

    attachEvents() {
        const bgSelect = this.windowEl.querySelector('#theme-background');
        const opacitySlider = this.windowEl.querySelector('#glass-opacity');
        const blurSlider = this.windowEl.querySelector('#blur-intensity');
        const autoSaveCheck = this.windowEl.querySelector('#auto-save');
        const showIconsCheck = this.windowEl.querySelector('#show-icons');
        const clearBtn = this.windowEl.querySelector('.clear-storage');
        
        bgSelect.addEventListener('change', (e) => {
            this.changeBackground(e.target.value);
        });
        
        opacitySlider.addEventListener('input', (e) => {
            this.changeOpacity(e.target.value);
        });
        
        blurSlider.addEventListener('input', (e) => {
            this.changeBlur(e.target.value);
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
        
        if (settings.opacity !== undefined) {
            this.windowEl.querySelector('#glass-opacity').value = settings.opacity;
            this.changeOpacity(settings.opacity);
        }
        
        if (settings.blur !== undefined) {
            this.windowEl.querySelector('#blur-intensity').value = settings.blur;
            this.changeBlur(settings.blur);
        }
    }

    saveSettings() {
        const settings = {
            background: this.windowEl.querySelector('#theme-background').value,
            opacity: this.windowEl.querySelector('#glass-opacity').value,
            blur: this.windowEl.querySelector('#blur-intensity').value,
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
            gradient3: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 50%, #f29400 100%)'
        };
        
        desktop.style.background = gradients[style] || gradients.gradient1;
        this.saveSettings();
    }

    changeOpacity(value) {
        document.documentElement.style.setProperty('--glass-opacity', value / 100);
        this.saveSettings();
    }

    changeBlur(value) {
        document.documentElement.style.setProperty('--glass-blur', `${value}px`);
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
}
