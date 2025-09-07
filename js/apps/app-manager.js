// Fixed App Manager - Handles timing issues
class AppManager {
    constructor(windowEl) {
        this.windowEl = windowEl;
        console.log('AppManager constructor called');
        console.log('windowEl:', this.windowEl);
        
        // Add a small delay to ensure window content is loaded
        setTimeout(() => {
            this.init();
        }, 50);
    }

    init() {
        console.log('AppManager init() called');
        
        // Find the content that was loaded from the template
        const content = this.windowEl.querySelector('.window-content');
        console.log('Found window-content:', content);
        
        if (!content) {
            console.error('No window content found - this should not happen');
            // Try to find any container as fallback
            const fallbackContent = this.windowEl.querySelector('.window-body') || this.windowEl;
            console.log('Using fallback content:', fallbackContent);
            this.createContent(fallbackContent);
            return;
        }

        // Check if content is already populated from template
        let appManagerEl = content.querySelector('.app-manager');
        console.log('Found app-manager element:', appManagerEl);
        
        if (!appManagerEl) {
            // Fallback: create content if template didn't load
            console.warn('App Manager template not found, creating content manually');
            this.createContent(content);
            appManagerEl = content.querySelector('.app-manager');
            console.log('Created app-manager element:', appManagerEl);
        }

        if (appManagerEl) {
            console.log('Binding events and rendering apps list');
            this.bindEvents(appManagerEl);
            this.renderAppsList(appManagerEl);
        } else {
            console.error('Failed to create or find app-manager element');
        }
    }

    createContent(container) {
        console.log('Creating content in container:', container);
        
        // Fallback content creation if template fails
        container.innerHTML = `
            <div class="app-manager">
                <div class="app-manager-header">
                    <h2>App Manager</h2>
                    <div class="app-manager-controls">
                        <button class="btn-secondary new-app">
                            <i class="fas fa-plus"></i> New App
                        </button>
                    </div>
                </div>
                <div class="app-manager-body">
                    <div class="apps-list" id="apps-list">
                        <!-- Apps will be populated here -->
                    </div>
                </div>
            </div>
        `;
        
        console.log('Content created, innerHTML set');
    }

    bindEvents(appManagerEl) {
        console.log('Binding events for app manager');
        
        // Find and bind any interactive elements
        const newAppBtn = appManagerEl.querySelector('.new-app');
        console.log('Found new app button:', newAppBtn);
        
        if (newAppBtn) {
            newAppBtn.addEventListener('click', () => {
                console.log('New app button clicked');
                if (typeof appRegistry !== 'undefined') {
                    appRegistry.launchApp('app-builder');
                } else {
                    console.error('appRegistry not available');
                }
            });
        }
    }

    renderAppsList(appManagerEl) {
        console.log('Rendering apps list');
        
        // Try multiple selectors to find the apps container
        let appsList = appManagerEl.querySelector('#apps-list') || 
                      appManagerEl.querySelector('.apps-list') ||
                      appManagerEl.querySelector('[data-apps-list]') ||
                      appManagerEl.querySelector('.app-list') ||
                      appManagerEl.querySelector('.apps-container');
        
        console.log('Found apps list container:', appsList);
        console.log('Available elements in appManagerEl:', appManagerEl.innerHTML);
        
        if (!appsList) {
            console.error('Apps list container not found, creating one');
            // Create the missing container
            const bodyEl = appManagerEl.querySelector('.app-manager-body') || 
                          appManagerEl.querySelector('.app-body') ||
                          appManagerEl;
            
            appsList = document.createElement('div');
            appsList.className = 'apps-list';
            appsList.id = 'apps-list';
            bodyEl.appendChild(appsList);
            console.log('Created apps list container:', appsList);
        }

        // Check for registry using the global variable directly
        console.log('Checking for appRegistry:', typeof appRegistry);
        
        if (typeof appRegistry === 'undefined') {
            console.error('App Registry not available');
            appsList.innerHTML = '<p style="color: red;">Error: App Registry not available</p>';
            return;
        }
        
        console.log('AppRegistry found, getting user apps');
        console.log('appRegistry.userApps:', appRegistry.userApps);
        
        const userApps = Array.from(appRegistry.userApps.entries());
        console.log('Found user apps:', userApps);
        
        if (userApps.length === 0) {
            console.log('No user apps found, showing empty state');
            // No apps - show empty state
            appsList.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 16px; color: rgba(255,255,255,0.7);">
                        <i class="fas fa-cube"></i>
                    </div>
                    <h3 style="color: white; margin-bottom: 8px;">No Apps Found</h3>
                    <p style="color: rgba(255,255,255,0.7); margin-bottom: 20px;">Create your first app with the App Builder</p>
                    <button onclick="appRegistry.launchApp('app-builder')" 
                            style="padding: 10px 20px; color: white; border: none; border-radius: 6px; cursor: pointer; background: var(--primary-button-color);">
                        <i class="fas fa-hammer"></i> Open App Builder
                    </button>
                </div>
            `;
        } else {
            console.log('Rendering', userApps.length, 'user apps');
            // Show list of apps
            appsList.innerHTML = '';
            
            userApps.forEach(([appId, app]) => {
                console.log('Creating row for app:', app.name);
                const appRow = this.createAppRow(appId, app);
                appsList.appendChild(appRow);
            });
        }
        
        console.log('AppManager renderAppsList complete');
    }
    
    createAppRow(appId, app) {
        const row = document.createElement('div');
        row.className = 'app-row';
        row.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            transition: background 0.3s ease;
        `;
        
        // App info section
        const appInfo = document.createElement('div');
        appInfo.style.cssText = 'display: flex; align-items: center; gap: 12px; flex: 1;';
        
        // App icon
        const iconDiv = document.createElement('div');
        iconDiv.style.cssText = `
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            color: white;
        `;
        iconDiv.innerHTML = `<i class="${app.icon || 'fas fa-cube'}"></i>`;
        appInfo.appendChild(iconDiv);
        
        // App details
        const detailsDiv = document.createElement('div');
        detailsDiv.style.cssText = 'flex: 1;';
        
        const nameDiv = document.createElement('div');
        nameDiv.style.cssText = 'font-size: 16px; font-weight: 500; color: white; margin-bottom: 4px;';
        nameDiv.textContent = app.name || 'Untitled App';
        detailsDiv.appendChild(nameDiv);
        
        const metaDiv = document.createElement('div');
        metaDiv.style.cssText = 'font-size: 12px; color: rgba(255, 255, 255, 0.6);';
        const componentCount = app.components ? app.components.length : 
                              (app.modules ? app.modules.reduce((sum, mod) => sum + (mod.components?.length || 0), 0) : 0);
        const moduleCount = app.modules ? app.modules.length : 1;
        metaDiv.textContent = `${moduleCount} module${moduleCount !== 1 ? 's' : ''} • ${componentCount} component${componentCount !== 1 ? 's' : ''}`;
        detailsDiv.appendChild(metaDiv);
        
        appInfo.appendChild(detailsDiv);
        row.appendChild(appInfo);
        
        // Actions section
        const actionsDiv = document.createElement('div');
        actionsDiv.style.cssText = 'display: flex; gap: 8px; align-items: center;';
        
        // Favorite star
        const starBtn = document.createElement('button');
        starBtn.style.cssText = `
            background: none;
            border: none;
            color: ${app.favorite ? '#FFD700' : 'rgba(255, 255, 255, 0.5)'};
            font-size: 18px;
            cursor: pointer;
            padding: 6px;
            transition: color 0.3s ease;
        `;
        starBtn.innerHTML = '<i class="fas fa-star"></i>';
        starBtn.title = app.favorite ? 'Remove from dock' : 'Add to dock';
        starBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Star button clicked for app:', appId, 'current favorite status:', app.favorite);
            
            try {
                if (typeof appRegistry === 'undefined') {
                    console.error('appRegistry not available');
                    return;
                }
                
                if (typeof appRegistry.toggleFavorite !== 'function') {
                    console.error('toggleFavorite method not found on appRegistry');
                    return;
                }
                
                // Toggle the favorite status
                appRegistry.toggleFavorite(appId);
                console.log('Favorite toggled, re-rendering apps list');
                
                // Re-render the apps list
                const appManagerEl = this.windowEl.querySelector('.app-manager');
                if (appManagerEl) {
                    this.renderAppsList(appManagerEl);
                } else {
                    console.error('Could not find app-manager element for re-rendering');
                }
                
            } catch (error) {
                console.error('Error toggling favorite:', error);
            }
        };
        actionsDiv.appendChild(starBtn);
        
        // Action buttons
        const actions = [
            { icon: 'fas fa-play', title: 'Run App', action: () => { console.log('Running app:', appId); appRegistry.launchApp(appId); } },
            { icon: 'fas fa-edit', title: 'Edit App', action: () => { console.log('Editing app:', appId); appRegistry.editUserApp(appId); } },
            { icon: 'fas fa-copy', title: 'Duplicate', action: () => this.duplicateApp(appId, app) },
            { icon: 'fas fa-download', title: 'Export', action: () => this.exportApp(appId, app) },
            { icon: 'fas fa-trash', title: 'Delete', action: () => this.deleteApp(appId, app), danger: true }
        ];
        
        actions.forEach(({ icon, title, action, danger }) => {
            const btn = document.createElement('button');
            btn.style.cssText = `
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: ${danger ? '#ff4444' : 'white'};
                padding: 8px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 14px;
            `;
            btn.innerHTML = `<i class="${icon}"></i>`;
            btn.title = title;
            btn.onclick = action;
            btn.onmouseenter = () => {
                btn.style.background = danger ? 'rgba(255, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.2)';
            };
            btn.onmouseleave = () => {
                btn.style.background = 'rgba(255, 255, 255, 0.1)';
            };
            actionsDiv.appendChild(btn);
        });
        
        row.appendChild(actionsDiv);
        
        // Hover effect
        row.onmouseenter = () => {
            row.style.background = 'rgba(255, 255, 255, 0.15)';
        };
        row.onmouseleave = () => {
            row.style.background = 'rgba(255, 255, 255, 0.1)';
        };
        
        return row;
    }
    
    duplicateApp(appId, app) {
        console.log('Duplicating app:', app.name);
        const newApp = {
            ...JSON.parse(JSON.stringify(app)),
            name: `${app.name} (Copy)`,
            created: new Date().toISOString(),
            favorite: false
        };
        
        appRegistry.registerUserApp(newApp);
        this.renderAppsList(this.windowEl.querySelector('.app-manager'));
        
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.success(`App duplicated as "${newApp.name}"`);
        }
    }
    
    exportApp(appId, app) {
        console.log('Exporting app:', app.name);
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
            
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.success(`"${app.name}" exported successfully`);
            }
        } catch (error) {
            console.error('Export failed:', error);
        }
    }
    
    deleteApp(appId, app) {
        console.log('Deleting app:', app.name);
        const confirmed = confirm(`Delete "${app.name}"? This cannot be undone.`);
        
        if (confirmed) {
            appRegistry.deleteUserApp(appId);
            this.renderAppsList(this.windowEl.querySelector('.app-manager'));
            
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.success(`"${app.name}" deleted successfully`);
            }
        }
    }
}

// Expose AppManager globally
window.AppManager = AppManager;