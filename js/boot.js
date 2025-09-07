// Initialize System
const eventBus = new EventBus();
const modalManager = new ModalManager();
const windowManager = new WindowManager();
const fileSystem = new FileSystem();
const appRegistry = new AppRegistry();

// Initialize Desktop
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Clock with error handling
        function updateClock() {
            try {
                const clock = document.getElementById('clock');
                if (clock) {
                    const now = new Date();
                    clock.textContent = now.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                }
            } catch (err) {
                console.warn('Clock update failed:', err);
            }
        }
        
        updateClock();
        setInterval(updateClock, 1000);
        
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
