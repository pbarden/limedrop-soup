// App Registry
class AppRegistry {
    constructor() {
        this.apps = new Map();
        this.userApps = new Map();
        this.loadFromStorage();
        this.initSystemApps();
    }

    initSystemApps() {
        this.registerSystemApp('app-builder', {
            name: 'App Builder',
            icon: 'fas fa-hammer',
            template: 'app-builder-template',
            width: 900,
            height: 600
        });
        
        this.registerSystemApp('file-manager', {
            name: 'File Manager',
            icon: 'fas fa-folder',
            template: 'file-manager-template',
            width: 800,
            height: 500
        });
        
        this.registerSystemApp('settings', {
            name: 'Settings',
            icon: 'fas fa-cog',
            template: 'settings-template',
            width: 600,
            height: 500
        });
    }

    registerSystemApp(id, definition) {
        this.apps.set(id, definition);
    }

    registerUserApp(definition) {
        const appId = `user-app-${Date.now()}`;
        this.userApps.set(appId, definition);
        this.saveToStorage();
        this.addToDock(appId, definition);
        return appId;
    }

    addToDock(appId, definition) {
        const dockApps = document.getElementById('dock-apps');
        const separator = dockApps.querySelector('.dock-separator');
        
        const dockItem = document.createElement('div');
        dockItem.className = 'dock-item';
        dockItem.dataset.app = appId;
        dockItem.innerHTML = `
            <div class="dock-icon"><i class="${definition.icon || 'fas fa-cube'}"></i></div>
            <div class="dock-tooltip">${definition.name}</div>
        `;
        
        dockApps.insertBefore(dockItem, separator);
        
        dockItem.addEventListener('click', () => {
            this.launchApp(appId);
        });
    }

    getApp(appId) {
        return this.apps.get(appId) || this.userApps.get(appId);
    }

    launchApp(appId) {
        const app = this.getApp(appId);
        if (!app) return;
        
        // Check if app window already exists
        const existingWindow = windowManager.getWindowByApp(appId);
        if (existingWindow) {
            windowManager.restoreWindow(existingWindow);
            windowManager.focusWindow(existingWindow);
            return;
        }
        
        // Special handling for user apps
        if (this.userApps.has(appId)) {
            this.launchUserApp(appId, app);
        } else {
            // Launch system app
            const windowId = windowManager.createWindow(
                appId,
                app.name,
                app.template,
                app.width,
                app.height
            );
            
            // Initialize app-specific functionality
            this.initializeApp(appId, windowId);
        }
    }

    launchUserApp(appId, app) {
        const windowId = windowManager.createWindow(
            appId,
            app.name,
            null,
            600,
            500
        );
        
        const window = windowManager.windows.get(windowId);
        const content = window.element.querySelector('.window-content');
        
        // Create runtime interface for user app
        const runtime = new AppRuntime(app, content);
        runtime.render();
    }

    initializeApp(appId, windowId) {
        const window = windowManager.windows.get(windowId);
        if (!window) return;
        
        switch (appId) {
            case 'app-builder':
                new AppBuilder(window.element);
                break;
            case 'file-manager':
                new FileManager(window.element);
                break;
            case 'settings':
                new Settings(window.element);
                break;
        }
    }

    saveToStorage() {
        const data = Array.from(this.userApps.entries());
        localStorage.setItem('limedrop-user-apps', JSON.stringify(data));
    }

    loadFromStorage() {
        const stored = localStorage.getItem('limedrop-user-apps');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.userApps = new Map(data);
                
                // Re-add apps to dock
                this.userApps.forEach((app, appId) => {
                    this.addToDock(appId, app);
                });
            } catch (error) {
                console.error('Failed to load user apps:', error);
            }
        }
    }
}

// App Builder Component
