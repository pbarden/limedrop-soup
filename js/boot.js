// Initialize System
const eventBus = new EventBus();
const modalManager = new ModalManager();
const windowManager = new WindowManager();
const fileSystem = new FileSystem();
const appRegistry = new AppRegistry();

// Initialize Desktop
document.addEventListener('DOMContentLoaded', () => {
    // Clock
    function updateClock() {
        const clock = document.getElementById('clock');
        const now = new Date();
        clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    updateClock();
    setInterval(updateClock, 1000);
    
    // Desktop icon clicks
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        icon.addEventListener('dblclick', () => {
            const appId = icon.dataset.app;
            appRegistry.launchApp(appId);
        });
    });
    
    // Dock item clicks
    document.querySelectorAll('.dock-item').forEach(item => {
        item.addEventListener('click', () => {
            const appId = item.dataset.app;
            appRegistry.launchApp(appId);
        });
    });
    
    // Context menu prevention
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + O: Open File Manager
        if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
            e.preventDefault();
            appRegistry.launchApp('file-manager');
        }
        
        // Ctrl/Cmd + N: Open App Builder
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            appRegistry.launchApp('app-builder');
        }
        
        // Ctrl/Cmd + ,: Open Settings
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            appRegistry.launchApp('settings');
        }
        
        // Ctrl/Cmd + Shift + N: Show notification example
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
            e.preventDefault();
            NotificationManager.info('Keyboard shortcuts are working!', 'System');
        }
    });
    
    // Load settings
    const settings = JSON.parse(localStorage.getItem('limedrop-settings') || '{}');
    if (settings.showIcons === false) {
        document.querySelector('.desktop-icons').style.display = 'none';
    }
    
    // Initial CSS variables
    document.documentElement.style.setProperty('--glass-opacity', '0.1');
    document.documentElement.style.setProperty('--glass-blur', '20px');
    
    // Show welcome notification
    if (!localStorage.getItem('limedrop-welcomed')) {
        setTimeout(() => {
            NotificationManager.info(
                'Double-click desktop icons or use the dock to launch apps. Press Ctrl+O for files, Ctrl+N for app builder.',
                'Welcome to Limedrop.ai'
            );
            localStorage.setItem('limedrop-welcomed', 'true');
        }, 1000);
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
