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
     * Render the manager UI.  Displays a list of installed user apps
     * with Edit and Delete buttons.  If no apps exist, shows a
     * placeholder message.  The list updates automatically when
     * apps are deleted.
     */
    render() {
        const content = this.windowEl.querySelector('.window-content');
        if (!content) return;
        content.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'app-manager-container';
        container.style.padding = '20px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '12px';
        const registry = window.appRegistry;
        // Title
        const title = document.createElement('h3');
        title.textContent = 'Installed Apps';
        title.style.margin = '0 0 8px 0';
        container.appendChild(title);
        // Build list
        const entries = Array.from(registry.userApps.entries());
        if (entries.length === 0) {
            const empty = document.createElement('div');
            empty.textContent = 'No installed apps.';
            empty.style.color = 'rgba(255, 255, 255, 0.7)';
            container.appendChild(empty);
        } else {
            entries.forEach(([appId, appDef]) => {
                const row = document.createElement('div');
                row.className = 'app-row';
                row.style.display = 'flex';
                row.style.alignItems = 'center';
                row.style.justifyContent = 'space-between';
                row.style.background = 'rgba(255, 255, 255, 0.05)';
                row.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                row.style.borderRadius = '6px';
                row.style.padding = '10px 12px';
                row.style.gap = '10px';
                // Label and optional favorite star
                const nameSpan = document.createElement('span');
                nameSpan.textContent = appDef.name || appId;
                nameSpan.style.flexGrow = '1';
                row.appendChild(nameSpan);
                // Actions container
                const actions = document.createElement('div');
                actions.style.display = 'flex';
                actions.style.gap = '8px';
                // Edit button
                const editBtn = document.createElement('button');
                editBtn.className = 'btn-secondary';
                editBtn.textContent = 'Edit';
                editBtn.addEventListener('click', () => {
                    registry.editUserApp(appId);
                });
                actions.appendChild(editBtn);
                // Delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn-danger';
                deleteBtn.textContent = 'Delete';
                deleteBtn.addEventListener('click', () => {
                    if (confirm(`Delete app "${appDef.name}"? This cannot be undone.`)) {
                        registry.deleteUserApp(appId);
                        // Re-render list after deletion
                        this.render();
                    }
                });
                actions.appendChild(deleteBtn);
                row.appendChild(actions);
                container.appendChild(row);
            });
        }
        content.appendChild(container);
    }
}

// Expose globally
window.AppManager = AppManager;