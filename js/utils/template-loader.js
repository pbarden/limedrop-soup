class TemplateLoader {
    constructor() {
        this.templateCache = new Map();
        this.loadingPromises = new Map();
    }

    async loadTemplate(templateName) {
        if (this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName);
        }

        if (this.loadingPromises.has(templateName)) {
            return this.loadingPromises.get(templateName);
        }

        const loadPromise = this.fetchTemplate(templateName);
        this.loadingPromises.set(templateName, loadPromise);

        try {
            const template = await loadPromise;
            this.templateCache.set(templateName, template);
            this.loadingPromises.delete(templateName);
            return template;
        } catch (error) {
            this.loadingPromises.delete(templateName);
            throw error;
        }
    }

    async fetchTemplate(templateName) {
        try {
            const response = await fetch(`templates/${templateName}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load template: ${templateName} (${response.status})`);
            }
            const html = await response.text();
            
            const template = document.createElement('template');
            template.innerHTML = html;
            return template;
        } catch (error) {
            console.error(`Error loading template ${templateName}:`, error);
            throw error;
        }
    }

    createElementFromTemplate(templateName, templateContent = null) {
        let template;
        
        if (templateContent) {
            template = templateContent;
        } else {
            template = this.templateCache.get(templateName);
            if (!template) {
                throw new Error(`Template not loaded: ${templateName}`);
            }
        }

        const clone = template.content.cloneNode(true);
        return clone.children.length === 1 ? clone.children[0] : clone;
    }

    async loadAndCreateElement(templateName) {
        const template = await this.loadTemplate(templateName);
        return this.createElementFromTemplate(templateName, template);
    }

    clearCache() {
        this.templateCache.clear();
        this.loadingPromises.clear();
    }

    preloadTemplates(templateNames) {
        const loadPromises = templateNames.map(name => this.loadTemplate(name));
        return Promise.all(loadPromises);
    }
}

window.templateLoader = new TemplateLoader();