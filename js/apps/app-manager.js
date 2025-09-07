// Simple working App Manager
class AppManager {
    constructor(windowEl) {
        this.windowEl = windowEl;
        console.log('AppManager constructor called');
        this.render();
    }

    render() {
        console.log('AppManager render called');
        const content = this.windowEl.querySelector('.window-content');
        if (!content) {
            console.error('No window content found');
            return;
        }

        content.innerHTML = '';
        
        // Create main container
        const container = document.createElement('div');
        container.style.cssText = 'padding: 20px; color: white; height: 100%; overflow-y: auto;';
        
        // Add title
        const title = document.createElement('h2');
        title.textContent = 'App Manager';
        title.style.cssText = 'margin: 0 0 20px 0; color: white;';
        container.appendChild(title);
        
        // Check for registry using the global variable directly
        if (typeof appRegistry === 'undefined') {
            container.innerHTML = '<h2>App Manager</h2><p style="color: red;">Error: App Registry not available</p>';
            content.appendChild(container);
            return;
        }
        
        const userApps = Array.from(appRegistry.userApps.entries());
        console.log('Found user apps:', userApps);
        
        if (userApps.length === 0) {
            // No apps - show empty state
            container.innerHTML = `
                <h2 style="margin: 0 0 20px 0; color: white;">App Manager</h2>
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 16px; color: rgba(255,255,255,0.7);">
                        <i class="fas fa-cube"></i>
                    </div>
                    <h3 style="color: white; margin-bottom: 8px;">No Apps Found</h3>
                    <p style="color: rgba(255,255,255,0.7); margin-bottom: 20px;">Create your first app with the App Builder</p>
                    <button onclick="appRegistry.launchApp('app-builder')" 
                            style="padding: 10px 20px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-hammer"></i> Open App Builder
                    </button>
                </div>
            `;
        } else {
            // Show list of apps
            const appsList = document.createElement('div');
            appsList.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';
            
            userApps.forEach(([appId, app]) => {
                console.log('Creating row for app:', app.name);
                const appRow = this.createAppRow(appId, app);
                appsList.appendChild(appRow);
            });
            
            container.appendChild(appsList);
        }
        
        content.appendChild(container);
        console.log('AppManager render complete');
    }
    
    createAppRow(appId, app) {
        const row = document.createElement('div');
        row.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 16px;
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
        starBtn.onclick = () => {
            console.log('Toggling favorite for:', appId);
            appRegistry.toggleFavorite(appId);
            this.render();
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
        this.render();
        
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
            this.render();
            
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.success(`"${app.name}" deleted successfully`);
            }
        }
    }
}

// Expose AppManager globally
window.AppManager = AppManager;