// App Manager application
//
// Provides a simple interface to view, edit and delete installed user apps.
// The manager lists all user applications stored in the AppRegistry and
// offers actions to launch them in edit mode or remove them entirely.
// Deleting an app also removes its dock entry and persists the change.

class AppManager {
    constructor(windowEl) {
        this.windowEl = windowEl;
        this.render();
    }

    /**
     * Render the manager UI with enhanced functionality
     */
    render() {
        const content = this.windowEl.querySelector('.window-content');
        if (!content) return;
        
        content.innerHTML = '';
        
        const container = document.createElement('div');
        container.className = 'app-manager-container';
        
        const registry = window.appRegistry;
        
        // Header with title and controls
        const header = document.createElement('div');
        header.className = 'app-manager-header';
        header.innerHTML = `
            <h3>Installed Applications</h3>
            <div class="app-manager-controls">
                <button class="btn-secondary" id="refresh-apps">
                    <i class="fas fa-sync"></i> Refresh
                </button>
                <button class="btn-primary" id="import-app">
                    <i class="fas fa-upload"></i> Import App
                </button>
            </div>
        `;
        container.appendChild(header);
        
        // Apps list
        const appsList = document.createElement('div');
        appsList.className = 'apps-list';
        
        const entries = Array.from(registry.userApps.entries());
        
        if (entries.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'apps-empty';
            empty.innerHTML = `
                <div class="empty-icon">
                    <i class="fas fa-cube"></i>
                </div>
                <h4>No Applications Installed</h4>
                <p>Create apps using the App Builder or import existing ones.</p>
                <button class="btn-primary" onclick="appRegistry.launchApp('app-builder')">
                    <i class="fas fa-hammer"></i> Open App Builder
                </button>
            `;
            appsList.appendChild(empty);
        } else {
            entries.forEach(([appId, appDef]) => {
                const row = this.createAppRow(appId, appDef);
                appsList.appendChild(row);
            });
        }
        
        container.appendChild(appsList);
        content.appendChild(container);
        
        // Attach event listeners
        this.attachEvents();
    }
    
    /**
     * Create an app row with all the controls
     */
    createAppRow(appId, appDef) {
        const row = document.createElement('div');
        row.className = 'app-row';
        row.dataset.appId = appId;
        
        // Calculate metadata
        const componentCount = appDef.components ? appDef.components.length : 
                              (appDef.modules ? appDef.modules.reduce((sum, mod) => sum + (mod.components?.length || 0), 0) : 0);
        const moduleCount = appDef.modules ? appDef.modules.length : 1;
        const createdDate = appDef.created ? new Date(appDef.created).toLocaleDateString() : 'Unknown';
        
        row.innerHTML = `
            <div class="app-row-info">
                <div class="app-row-icon">
                    <i class="${appDef.icon || 'fas fa-cube'}"></i>
                </div>
                <div class="app-row-details">
                    <div class="app-row-name">${appDef.name || 'Untitled App'}</div>
                    <div class="app-row-meta">
                        ${moduleCount} module${moduleCount !== 1 ? 's' : ''} • 
                        ${componentCount} component${componentCount !== 1 ? 's' : ''} • 
                        Created ${createdDate}
                    </div>
                </div>
            </div>
            <div class="app-row-actions">
                <button class="app-favorite-star ${appDef.favorite ? 'active' : ''}" 
                        data-app-id="${appId}" 
                        title="${appDef.favorite ? 'Remove from dock' : 'Add to dock'}">
                    <i class="fas fa-star"></i>
                </button>
                <button class="btn-secondary app-action" 
                        data-action="run" 
                        data-app-id="${appId}"
                        title="Run App">
                    <i class="fas fa-play"></i>
                </button>
                <button class="btn-secondary app-action" 
                        data-action="edit" 
                        data-app-id="${appId}"
                        title="Edit App">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-secondary app-action" 
                        data-action="duplicate" 
                        data-app-id="${appId}"
                        title="Duplicate App">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn-secondary app-action" 
                        data-action="export" 
                        data-app-id="${appId}"
                        title="Export App">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-danger app-action" 
                        data-action="delete" 
                        data-app-id="${appId}"
                        title="Delete App">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        return row;
    }
    
    /**
     * Attach event listeners for all controls
     */
    attachEvents() {
        const container = this.windowEl.querySelector('.app-manager-container');
        if (!container) return;
        
        // Refresh button
        const refreshBtn = container.querySelector('#refresh-apps');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.render();
                NotificationManager.info('App list refreshed');
            });
        }
        
        // Import button
        const importBtn = container.querySelector('#import-app');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.importApp();
            });
        }
        
        // App action buttons
        container.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            const appId = target.dataset.appId;
            const action = target.dataset.action;
            
            if (target.classList.contains('app-favorite-star')) {
                this.toggleFavorite(appId);
            } else if (action && appId) {
                this.handleAppAction(action, appId);
            }
        });
    }
    
    /**
     * Toggle favorite status
     */
    toggleFavorite(appId) {
        const registry = window.appRegistry;
        registry.toggleFavorite(appId);
        
        // Update the star visual
        const star = this.windowEl.querySelector(`[data-app-id="${appId}"].app-favorite-star`);
        const app = registry.userApps.get(appId);
        
        if (star && app) {
            star.classList.toggle('active', app.favorite);
            star.title = app.favorite ? 'Remove from dock' : 'Add to dock';
            
            NotificationManager.info(
                app.favorite ? 
                `"${app.name}" added to dock` : 
                `"${app.name}" removed from dock`
            );
        }
    }
    
    /**
     * Handle app actions
     */
    async handleAppAction(action, appId) {
        const registry = window.appRegistry;
        const app = registry.userApps.get(appId);
        
        if (!app) {
            NotificationManager.error('App not found');
            return;
        }
        
        switch (action) {
            case 'run':
                registry.launchApp(appId);
                break;
                
            case 'edit':
                registry.editUserApp(appId);
                break;
                
            case 'duplicate':
                await this.duplicateApp(appId, app);
                break;
                
            case 'export':
                this.exportApp(appId, app);
                break;
                
            case 'delete':
                await this.deleteApp(appId, app);
                break;
        }
    }
    
    /**
     * Duplicate an app
     */
    async duplicateApp(appId, app) {
        const newApp = {
            ...JSON.parse(JSON.stringify(app)), // Deep clone
            name: `${app.name} (Copy)`,
            created: new Date().toISOString(),
            favorite: false // Don't auto-favorite copies
        };
        
        const registry = window.appRegistry;
        const newAppId = registry.registerUserApp(newApp);
        
        this.render();
        NotificationManager.success(`App duplicated as "${newApp.name}"`);
    }
    
    /**
     * Export an app
     */
    exportApp(appId, app) {
        try {
            const exportData = {
                ...app,
                exportedAt: new Date().toISOString(),
                exportedFrom: 'Limedrop.ai'
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${app.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            NotificationManager.success(`"${app.name}" exported successfully`);
        } catch (error) {
            NotificationManager.error('Export failed: ' + error.message);
        }
    }
    
    /**
     * Delete an app with confirmation
     */
    async deleteApp(appId, app) {
        try {
            const confirmed = await modalManager.confirm(
                `Are you sure you want to delete "${app.name}"? This action cannot be undone.`,
                'Delete Application'
            );
            
            if (confirmed) {
                const registry = window.appRegistry;
                registry.deleteUserApp(appId);
                this.render();
                NotificationManager.success(`"${app.name}" deleted successfully`);
            }
        } catch (error) {
            // Fallback to browser confirm if modal fails
            if (confirm(`Delete "${app.name}"? This cannot be undone.`)) {
                const registry = window.appRegistry;
                registry.deleteUserApp(appId);
                this.render();
                NotificationManager.success(`"${app.name}" deleted successfully`);
            }
        }
    }
    
    /**
     * Import an app from file
     */
    importApp() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const appData = JSON.parse(e.target.result);
                    
                    // Validate app structure
                    if (!appData.name) {
                        throw new Error('Invalid app file: missing name');
                    }
                    
                    if (!appData.components && !appData.modules) {
                        throw new Error('Invalid app file: missing components or modules');
                    }
                    
                    // Clean up import data
                    delete appData.exportedAt;
                    delete appData.exportedFrom;
                    appData.created = new Date().toISOString();
                    appData.favorite = false;
                    
                    // Check for name conflicts
                    const registry = window.appRegistry;
                    const existingNames = Array.from(registry.userApps.values()).map(app => app.name);
                    if (existingNames.includes(appData.name)) {
                        appData.name = `${appData.name} (Imported)`;
                    }
                    
                    const appId = registry.registerUserApp(appData);
                    this.render();
                    
                    NotificationManager.success(`App "${appData.name}" imported successfully`);
                    
                } catch (error) {
                    NotificationManager.error('Import failed: ' + error.message);
                }
            };
            reader.readAsText(file);
        });
        
        input.click();
    }
}

// Expose AppManager globally
window.AppManager = AppManager;