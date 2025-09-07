// Window Management System
class WindowManager {
    constructor() {
        this.windows = new Map();
        this.activeWindow = null;
        this.zIndex = 100;
        this.container = document.getElementById('windows-container');
    }

    createWindow(appId, title, contentTemplate, width = 800, height = 600) {
        const windowId = `window-${Date.now()}`;
        const template = document.getElementById('window-template');
        if (!template) {
            console.error('Window template not found');
            return null;
        }
        
        const windowEl = template.content.cloneNode(true).querySelector('.window');
        if (!windowEl) {
            console.error('Window element not found in template');
            return null;
        }
        
        // Ensure dimensions are within reasonable bounds
        const maxWidth = window.innerWidth - 100;
        const maxHeight = window.innerHeight - 150;
        width = Math.min(width, maxWidth);
        height = Math.min(height, maxHeight);
        
        // Calculate center position with offset for multiple windows
        const offset = (this.windows.size % 5) * 30;
        const left = Math.max(20, (window.innerWidth - width) / 2 + offset);
        const top = Math.max(20, (window.innerHeight - height) / 2 + offset);
        
        windowEl.id = windowId;
        windowEl.style.width = `${width}px`;
        windowEl.style.height = `${height}px`;
        windowEl.style.left = `${left}px`;
        windowEl.style.top = `${top}px`;
        windowEl.style.zIndex = this.zIndex++;
        
        const titleEl = windowEl.querySelector('.window-title');
        if (titleEl) {
            titleEl.textContent = title;
        }
        
        const contentEl = windowEl.querySelector('.window-content');
        if (contentTemplate && contentEl) {
            const content = document.getElementById(contentTemplate);
            if (content) {
                contentEl.appendChild(content.content.cloneNode(true));
            } else {
                console.warn(`Content template '${contentTemplate}' not found`);
            }
        }
        
        if (!this.container) {
            console.error('Windows container not found');
            return null;
        }
        
        this.container.appendChild(windowEl);
        
        const windowObj = {
            element: windowEl,
            appId: appId,
            title: title,
            minimized: false,
            maximized: false
        };
        
        this.windows.set(windowId, windowObj);
        
        this.attachWindowEvents(windowEl, windowId);
        this.focusWindow(windowId);
        
        // Update dock with error handling
        try {
            const dockItem = document.querySelector(`.dock-item[data-app="${appId}"]`);
            if (dockItem) {
                dockItem.classList.add('active');
            }
        } catch (err) {
            console.warn('Failed to update dock item', err);
        }
        this.updateDockRunning();

        return windowId;
    }

    // In window-manager.js, improve attachWindowEvents method:
    attachWindowEvents(windowEl, windowId) {
        const header = windowEl.querySelector('.window-header');
        const minimizeBtn = windowEl.querySelector('.window-control.minimize');
        const maximizeBtn = windowEl.querySelector('.window-control.maximize');
        const closeBtn = windowEl.querySelector('.window-control.close');
        const resizeHandle = windowEl.querySelector('.window-resize-handle');
        
        if (!header) {
            console.warn('Window header not found');
            return;
        }
        
        // Window dragging with bounds checking
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('window-control')) return;
            isDragging = true;
            dragOffset = {
                x: e.clientX - windowEl.offsetLeft,
                y: e.clientY - windowEl.offsetTop
            };
            this.focusWindow(windowId);
            e.preventDefault();
        });
        
        const handleMouseMove = (e) => {
            if (isDragging && !this.windows.get(windowId)?.maximized) {
                // Keep window within viewport bounds
                const newLeft = Math.max(0, Math.min(
                    window.innerWidth - windowEl.offsetWidth, 
                    e.clientX - dragOffset.x
                ));
                const newTop = Math.max(0, Math.min(
                    window.innerHeight - windowEl.offsetHeight,
                    e.clientY - dragOffset.y
                ));
                
                windowEl.style.left = `${newLeft}px`;
                windowEl.style.top = `${newTop}px`;
            }
        };
        
        const handleMouseUp = () => {
            isDragging = false;
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Window resizing with minimum size constraints
        if (resizeHandle) {
            let isResizing = false;
            let resizeStart = { x: 0, y: 0, width: 0, height: 0 };
            
            resizeHandle.addEventListener('mousedown', (e) => {
                isResizing = true;
                resizeStart = {
                    x: e.clientX,
                    y: e.clientY,
                    width: windowEl.offsetWidth,
                    height: windowEl.offsetHeight
                };
                e.preventDefault();
            });
            
            const handleResizeMove = (e) => {
                if (isResizing && !this.windows.get(windowId)?.maximized) {
                    const newWidth = Math.max(300, Math.min(
                        window.innerWidth - windowEl.offsetLeft,
                        resizeStart.width + (e.clientX - resizeStart.x)
                    ));
                    const newHeight = Math.max(200, Math.min(
                        window.innerHeight - windowEl.offsetTop,
                        resizeStart.height + (e.clientY - resizeStart.y)
                    ));
                    
                    windowEl.style.width = `${newWidth}px`;
                    windowEl.style.height = `${newHeight}px`;
                }
            };
            
            const handleResizeUp = () => {
                isResizing = false;
            };
            
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeUp);
        }
        
        // Window controls with error handling
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                try {
                    this.minimizeWindow(windowId);
                } catch (err) {
                    console.warn('Failed to minimize window', err);
                }
            });
        }
        
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', () => {
                try {
                    this.toggleMaximize(windowId);
                } catch (err) {
                    console.warn('Failed to toggle maximize', err);
                }
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                try {
                    this.closeWindow(windowId);
                } catch (err) {
                    console.warn('Failed to close window', err);
                }
            });
        }
        
        // Focus on click
        windowEl.addEventListener('mousedown', () => {
            try {
                this.focusWindow(windowId);
            } catch (err) {
                console.warn('Failed to focus window', err);
            }
        });
    }

    attachWindowEvents(windowEl, windowId) {
        const header = windowEl.querySelector('.window-header');
        const minimizeBtn = windowEl.querySelector('.window-control.minimize');
        const maximizeBtn = windowEl.querySelector('.window-control.maximize');
        const closeBtn = windowEl.querySelector('.window-control.close');
        const resizeHandle = windowEl.querySelector('.window-resize-handle');
        
        // Window dragging
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('window-control')) return;
            isDragging = true;
            dragOffset = {
                x: e.clientX - windowEl.offsetLeft,
                y: e.clientY - windowEl.offsetTop
            };
            this.focusWindow(windowId);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging && !this.windows.get(windowId).maximized) {
                windowEl.style.left = `${e.clientX - dragOffset.x}px`;
                windowEl.style.top = `${e.clientY - dragOffset.y}px`;
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // Window resizing
        let isResizing = false;
        let resizeStart = { x: 0, y: 0, width: 0, height: 0 };
        
        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            resizeStart = {
                x: e.clientX,
                y: e.clientY,
                width: windowEl.offsetWidth,
                height: windowEl.offsetHeight
            };
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isResizing && !this.windows.get(windowId).maximized) {
                const newWidth = resizeStart.width + (e.clientX - resizeStart.x);
                const newHeight = resizeStart.height + (e.clientY - resizeStart.y);
                windowEl.style.width = `${Math.max(400, newWidth)}px`;
                windowEl.style.height = `${Math.max(300, newHeight)}px`;
            }
        });
        
        document.addEventListener('mouseup', () => {
            isResizing = false;
        });
        
        // Window controls
        minimizeBtn.addEventListener('click', () => this.minimizeWindow(windowId));
        maximizeBtn.addEventListener('click', () => this.toggleMaximize(windowId));
        closeBtn.addEventListener('click', () => this.closeWindow(windowId));
        
        // Focus on click
        windowEl.addEventListener('mousedown', () => this.focusWindow(windowId));
    }

    focusWindow(windowId) {
        const window = this.windows.get(windowId);
        if (!window) return;
        
        // Remove focus from all windows
        this.windows.forEach((win) => {
            win.element.classList.remove('focused');
        });
        
        // Add focus to current window
        window.element.classList.add('focused');
        window.element.style.zIndex = this.zIndex++;
        this.activeWindow = windowId;
    }

    minimizeWindow(windowId) {
        const window = this.windows.get(windowId);
        if (!window) return;
        
        window.element.classList.add('minimized');
        window.minimized = true;
    }

    restoreWindow(windowId) {
        const window = this.windows.get(windowId);
        if (!window) return;
        
        window.element.classList.remove('minimized');
        window.minimized = false;
        this.focusWindow(windowId);
    }

    toggleMaximize(windowId) {
        const window = this.windows.get(windowId);
        if (!window) return;
        
        if (window.maximized) {
            window.element.classList.remove('maximized');
            window.maximized = false;
        } else {
            window.element.classList.add('maximized');
            window.maximized = true;
        }
    }

    closeWindow(windowId) {
        const window = this.windows.get(windowId);
        if (!window) return;
        
        window.element.remove();
        this.windows.delete(windowId);
        
        // Update dock
        const dockItem = document.querySelector(`.dock-item[data-app="${window.appId}"]`);
        if (dockItem) {
        // Check if any other windows of this app are open
        const hasOtherWindows = Array.from(this.windows.values()).some(w => w.appId === window.appId);
        if (!hasOtherWindows) {
            dockItem.classList.remove('active');
            
            // Remove from running dock if not a favorite
            const dockRunning = document.getElementById('dock-running');
            if (dockRunning && window.appId.startsWith('user-app-')) {
                const app = appRegistry.userApps.get(window.appId);
                if (app && !app.favorite) {
                    const runningItem = dockRunning.querySelector(`[data-app="${window.appId}"]`);
                    if (runningItem) runningItem.remove();
                }
            }
        }
    }

    // Update dock running section
    this.updateDockRunning();

    }

    updateDockRunning() {
        const dockRunning = document.getElementById('dock-running');
        if (!dockRunning) return;
        
        // Clear current running apps
        dockRunning.innerHTML = '';
        
        // Get all open windows that aren't favorites
        this.windows.forEach((windowObj, windowId) => {
            const appId = windowObj.appId;
            
            // Skip system apps and check if it's a favorite
            if (!appId.startsWith('user-app-')) return;
            
            const app = appRegistry.userApps.get(appId);
            if (!app || app.favorite) return; // Skip favorites
            
            // Check if already in running dock
            const existing = dockRunning.querySelector(`[data-app="${appId}"]`);
            if (existing) return;
            
            const dockItem = document.createElement('div');
            dockItem.className = 'dock-item';
            dockItem.dataset.app = appId;
            
            const iconClass = app.icon || 'fas fa-cube';
            
            dockItem.innerHTML = `
                <div class="dock-icon">
                    <i class="${iconClass}"></i>
                </div>
                <div class="dock-tooltip">${app.name}</div>
            `;
            
            // Add click handler
            dockItem.addEventListener('click', () => {
                this.focusWindow(windowId);
            });
            
            dockRunning.appendChild(dockItem);
        });
        
        // Show/hide separator based on running apps
        const separator = document.getElementById('dock-separator-2');
        const hasFavorites = document.getElementById('dock-favorites').children.length > 0;
        const hasRunning = dockRunning.children.length > 0;
        
        if (separator) {
            separator.style.display = (hasFavorites && hasRunning) ? '' : 'none';
        }
    }

    getWindowByApp(appId) {
        for (const [windowId, window] of this.windows) {
            if (window.appId === appId) {
                return windowId;
            }
        }
        return null;
    }
}

// File System Manager
