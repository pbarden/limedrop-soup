// Extended App Registry
//
// The registry maintains a catalogue of both system applications defined by
// Limedrop and user applications created via the App Builder.  This version
// updates the launch of user apps to instantiate the extended AppRuntime
// defined in js/apps/app-runtime.js.  Additionally it preserves existing
// behaviour such as storing user apps in localStorage and adding entries
// to the dock.  The majority of the logic is carried over from the
// original project with only minimal changes to accommodate modules.

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
        dockItem.innerHTML = `<span class="dock-label">${definition.name}</span>`;
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
        // If already open bring to front
        const existingWindow = windowManager.getWindowByApp(appId);
        if (existingWindow) {
            windowManager.restoreWindow(existingWindow);
            windowManager.focusWindow(existingWindow);
            return;
        }
        // Launch user apps with runtime
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
        const windowObj = windowManager.windows.get(windowId);
        const content = windowObj.element.querySelector('.window-content');
        // Instantiate a new runtime and expose it globally for onclick handlers
        const runtime = new AppRuntime(app, content);
        window.__runtimeInstance = runtime;
        runtime.render();
    }

    initializeApp(appId, windowId) {
        const windowObj = windowManager.windows.get(windowId);
        if (!windowObj) return;
        switch (appId) {
            case 'app-builder':
                new AppBuilder(windowObj.element);
                break;
            case 'file-manager':
                new FileManager(windowObj.element);
                break;
            case 'settings':
                new Settings(windowObj.element);
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
                this.userApps.forEach((app, appId) => {
                    this.addToDock(appId, app);
                });
            } catch (error) {
                console.error('Failed to load user apps:', error);
            }
        }
    }
}

// Expose globally
window.AppRegistry = AppRegistry;