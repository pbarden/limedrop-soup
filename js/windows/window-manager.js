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
        const windowEl = template.content.cloneNode(true).querySelector('.window');
        
        windowEl.id = windowId;
        windowEl.style.width = `${width}px`;
        windowEl.style.height = `${height}px`;
        windowEl.style.left = `${(window.innerWidth - width) / 2}px`;
        windowEl.style.top = `${(window.innerHeight - height) / 2}px`;
        windowEl.style.zIndex = this.zIndex++;
        
        windowEl.querySelector('.window-title').textContent = title;
        
        const contentEl = windowEl.querySelector('.window-content');
        if (contentTemplate) {
            const content = document.getElementById(contentTemplate);
            if (content) {
                contentEl.appendChild(content.content.cloneNode(true));
            }
        }
        
        this.container.appendChild(windowEl);
        
        this.windows.set(windowId, {
            element: windowEl,
            appId: appId,
            title: title,
            minimized: false,
            maximized: false
        });
        
        this.attachWindowEvents(windowEl, windowId);
        this.focusWindow(windowId);
        
        // Update dock
        const dockItem = document.querySelector(`.dock-item[data-app="${appId}"]`);
        if (dockItem) {
            dockItem.classList.add('active');
        }
        
        return windowId;
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
            }
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
