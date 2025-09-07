// Base App Component - Reduces redundancy across app components
class BaseApp {
    constructor(windowEl, templateName) {
        this.windowEl = windowEl;
        this.templateName = templateName;
        this.eventHandlers = new Map();
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        try {
            await this.loadTemplate();
            this.setupEventListeners();
            await this.onInit();
            this.initialized = true;
        } catch (error) {
            console.error(`Error initializing ${this.constructor.name}:`, error);
        }
    }

    async loadTemplate() {
        if (!this.templateName) return;
        
        const content = this.windowEl.querySelector('.window-content');
        if (!content) {
            console.error('No window content found');
            return;
        }

        let templateEl = content.querySelector(`.${this.templateName}`);
        if (!templateEl) {
            console.warn(`${this.templateName} template not found, using existing content`);
        }
    }

    setupEventListeners() {
        // Override in subclasses
    }

    async onInit() {
        // Override in subclasses for custom initialization
    }

    on(selector, event, handler) {
        const elements = this.windowEl.querySelectorAll(selector);
        elements.forEach(el => {
            el.addEventListener(event, handler);
            
            // Store for cleanup
            const key = `${selector}-${event}`;
            if (!this.eventHandlers.has(key)) {
                this.eventHandlers.set(key, []);
            }
            this.eventHandlers.get(key).push({ element: el, handler });
        });
    }

    find(selector) {
        return this.windowEl.querySelector(selector);
    }

    findAll(selector) {
        return this.windowEl.querySelectorAll(selector);
    }

    show(selector) {
        const elements = this.findAll(selector);
        elements.forEach(el => el.style.display = '');
    }

    hide(selector) {
        const elements = this.findAll(selector);
        elements.forEach(el => el.style.display = 'none');
    }

    toggle(selector, show) {
        if (show) {
            this.show(selector);
        } else {
            this.hide(selector);
        }
    }

    setContent(selector, content) {
        const element = this.find(selector);
        if (element) {
            if (typeof content === 'string') {
                element.textContent = content;
            } else {
                element.innerHTML = '';
                element.appendChild(content);
            }
        }
    }

    getValue(selector) {
        const element = this.find(selector);
        return element ? element.value : null;
    }

    setValue(selector, value) {
        const element = this.find(selector);
        if (element) {
            element.value = value;
        }
    }

    async showModal(type, title, message, options = {}) {
        if (!window.modalManager) return null;
        
        switch (type) {
            case 'alert':
                return await window.modalManager.alert(message, title, options.type);
            case 'confirm':
                return await window.modalManager.confirm(message, title);
            case 'prompt':
                return await window.modalManager.prompt(message, title, options.defaultValue, options.placeholder);
            default:
                return null;
        }
    }

    showNotification(title, message, type = 'info') {
        if (window.notificationManager) {
            window.notificationManager.show({ title, message, type });
        }
    }

    cleanup() {
        // Remove all event listeners
        this.eventHandlers.forEach((handlers, key) => {
            handlers.forEach(({ element, handler }) => {
                const [selector, event] = key.split('-');
                element.removeEventListener(event, handler);
            });
        });
        this.eventHandlers.clear();
        this.initialized = false;
    }

    // Storage helpers
    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    loadData(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Error loading data:', error);
            return defaultValue;
        }
    }

    // Animation helpers
    fadeIn(selector, duration = 300) {
        const elements = this.findAll(selector);
        elements.forEach(el => {
            el.style.opacity = '0';
            el.style.display = '';
            el.style.transition = `opacity ${duration}ms ease`;
            
            requestAnimationFrame(() => {
                el.style.opacity = '1';
            });
        });
    }

    fadeOut(selector, duration = 300) {
        const elements = this.findAll(selector);
        elements.forEach(el => {
            el.style.transition = `opacity ${duration}ms ease`;
            el.style.opacity = '0';
            
            setTimeout(() => {
                el.style.display = 'none';
                el.style.transition = '';
            }, duration);
        });
    }
}