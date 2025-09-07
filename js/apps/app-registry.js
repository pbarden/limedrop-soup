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

        // Register App Manager for managing installed user apps
        this.registerSystemApp('app-manager', {
            name: 'App Manager',
            icon: 'fas fa-th-large',
            template: null,
            width: 600,
            height: 500
        });
    }

    registerSystemApp(id, definition) {
        this.apps.set(id, definition);
    }

    registerUserApp(definition) {
        const appId = `user-app-${Date.now()}`;
        // Ensure favorite flag exists on definition
        definition.favorite = definition.favorite || false;
        this.userApps.set(appId, definition);
        this.saveToStorage();
        this.addToDock(appId, definition);
        return appId;
    }

    /**
     * Remove a user app from the registry and update persistent storage
     * and dock.  If the app is currently open, its window remains
     * untouched (the user may need to close it manually).  Removing
     * an app also removes its dock entry.
     * @param {string} appId
     */
    deleteUserApp(appId) {
        // Remove from map
        const appDef = this.userApps.get(appId);
        if (!appDef) return;
        this.userApps.delete(appId);
        // Remove dock item
        const dockApps = document.getElementById('dock-apps');
        if (dockApps) {
            const dockItem = dockApps.querySelector(`[data-app="${appId}"]`);
            if (dockItem) dockItem.remove();
        }
        this.saveToStorage();
    }

    /**
     * Launch the App Builder in edit mode for an existing user app.  The
     * specified app's definition is loaded into a new builder instance,
     * allowing the user to modify modules and components.  The caller
     * must supply a valid appId that exists in the userApps map.
     * @param {string} appId The user app identifier to edit
     */
    editUserApp(appId) {
        const definition = this.userApps.get(appId);
        if (!definition) return;
        // Create a builder window and load the app definition
        const windowId = windowManager.createWindow(
            'app-builder',
            `Edit ${definition.name}`,
            null,
            900,
            600
        );
        const windowObj = windowManager.windows.get(windowId);
        const content = windowObj.element;
        const builder = new AppBuilder(content);
        if (typeof builder.loadAppDefinition === 'function') {
            builder.loadAppDefinition(definition);
        }
    }

    addToDock(appId, definition) {
        const dockApps = document.getElementById('dock-apps');
        if (!dockApps) return;
        const separator = dockApps.querySelector('.dock-separator');
        const dockItem = document.createElement('div');
        dockItem.className = 'dock-item';
        dockItem.dataset.app = appId;
        // Include an icon if available.  Use a default icon for user apps when none is provided.
        const iconClass = definition.icon || 'fas fa-cube';
        dockItem.innerHTML = `<i class="dock-icon ${iconClass}"></i><span class="dock-label">${definition.name}</span>`;
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
            case 'app-manager':
                new AppManager(windowObj.element);
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