// App Builder Component
class AppBuilder {
    constructor(windowEl) {
        this.windowEl = windowEl;
        this.components = [];
        this.selectedComponent = null;
        this.selectedIcon = 'fas fa-rocket';
        this.init();
    }

    init() {
        this.setupDragAndDrop();
        this.setupEvents();
        this.initIconPicker();
    }
    
    initIconPicker() {
        const iconPickerContainer = this.windowEl.querySelector('#app-icon-picker');
        if (iconPickerContainer) {
            this.iconPicker = new IconPicker(iconPickerContainer, this.selectedIcon, (icon) => {
                this.selectedIcon = icon;
            });
        }
    }

    setupDragAndDrop() {
        const componentItems = this.windowEl.querySelectorAll('.component-item');
        const workflowContainer = this.windowEl.querySelector('#workflow-container');
        
        componentItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('component-type', item.dataset.type);
                item.classList.add('dragging');
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
        });
        
        workflowContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            workflowContainer.classList.add('drag-over');
        });
        
        workflowContainer.addEventListener('dragleave', () => {
            workflowContainer.classList.remove('drag-over');
        });
        
        workflowContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            workflowContainer.classList.remove('drag-over');
            
            const componentType = e.dataTransfer.getData('component-type');
            if (componentType) {
                this.addComponent(componentType);
            }
        });
    }

    setupEvents() {
        const saveBtn = this.windowEl.querySelector('.save-app');
        saveBtn.addEventListener('click', () => this.saveApp());
    }

    addComponent(type) {
        const component = {
            id: `comp-${Date.now()}`,
            type: type,
            config: this.getDefaultConfig(type)
        };
        
        this.components.push(component);
        this.renderWorkflow();
    }

    getDefaultConfig(type) {
        const defaults = {
            'text-input': { label: 'Text Input', placeholder: 'Enter text...', required: false },
            'file-upload': { label: 'Upload File', accept: '*' },
            'canvas': { label: 'Drawing Canvas', width: 400, height: 300 },
            'rich-text': { label: 'Rich Text Editor' },
            'ai-prompt': { prompt: 'Process the following: {{input}}', model: 'gpt-3.5' },
            'data-transform': { transformation: 'uppercase' },
            'display': { label: 'Output Display' },
            'chart': { type: 'bar', title: 'Chart' },
            'export': { format: 'json', filename: 'export' }
        };
        
        return defaults[type] || {};
    }

    renderWorkflow() {
        const container = this.windowEl.querySelector('#workflow-container');
        
        if (this.components.length === 0) {
            container.innerHTML = '<div class="workflow-placeholder">Drag components here to build your app</div>';
            return;
        }
        
        container.innerHTML = '';
        
        this.components.forEach((component, index) => {
            const item = document.createElement('div');
            item.className = 'workflow-item';
            item.dataset.componentId = component.id;
            
            item.innerHTML = `
                <div class="workflow-item-info">
                    <div class="workflow-item-number">${index + 1}</div>
                    <span>${this.getComponentLabel(component)}</span>
                </div>
                <button class="workflow-item-delete">Remove</button>
            `;
            
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('workflow-item-delete')) {
                    this.selectComponent(component);
                }
            });
            
            item.querySelector('.workflow-item-delete').addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await modalManager.confirm(
                    `Remove "${this.getComponentLabel(component)}" from the workflow?`,
                    'Remove Component'
                );
                if (confirmed) {
                    this.removeComponent(component.id);
                }
            });
            
            container.appendChild(item);
        });
    }

    getComponentLabel(component) {
        const labels = {
            'text-input': 'Text Input',
            'file-upload': 'File Upload',
            'canvas': 'Drawing Canvas',
            'rich-text': 'Rich Text Editor',
            'ai-prompt': 'AI Prompt',
            'data-transform': 'Data Transform',
            'display': 'Display Output',
            'chart': 'Chart',
            'export': 'Export Data'
        };
        
        return labels[component.type] || component.type;
    }

    selectComponent(component) {
        this.selectedComponent = component;
        
        // Update selection UI
        const items = this.windowEl.querySelectorAll('.workflow-item');
        items.forEach(item => {
            if (item.dataset.componentId === component.id) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
        
        this.renderProperties();
    }

    renderProperties() {
        const container = this.windowEl.querySelector('#properties-content');
        
        if (!this.selectedComponent) {
            container.innerHTML = '<p class="properties-placeholder">Select a component to configure</p>';
            return;
        }
        
        const templateId = `${this.selectedComponent.type}-config`;
        const template = document.getElementById(templateId);
        
        if (template) {
            container.innerHTML = '';
            container.appendChild(template.content.cloneNode(true));
            
            // Populate with current config
            this.populateConfig(container);
            
            // Attach change listeners
            this.attachConfigListeners(container);
        } else {
            container.innerHTML = `
                <div class="config-form">
                    <p>Configuration for ${this.getComponentLabel(this.selectedComponent)}</p>
                </div>
            `;
        }
    }

    populateConfig(container) {
        const config = this.selectedComponent.config;
        
        Object.keys(config).forEach(key => {
            const element = container.querySelector(`.config-${key}`);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = config[key];
                } else {
                    element.value = config[key];
                }
            }
        });
    }

    attachConfigListeners(container) {
        const inputs = container.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                const key = input.className.replace('config-', '');
                if (input.type === 'checkbox') {
                    this.selectedComponent.config[key] = input.checked;
                } else {
                    this.selectedComponent.config[key] = input.value;
                }
            });
        });
    }

    removeComponent(componentId) {
        this.components = this.components.filter(c => c.id !== componentId);
        if (this.selectedComponent?.id === componentId) {
            this.selectedComponent = null;
            this.renderProperties();
        }
        this.renderWorkflow();
    }

    saveApp() {
        const nameInput = this.windowEl.querySelector('.app-name-input');
        const name = nameInput.value.trim();
        
        if (!name) {
            NotificationManager.error('Please enter an app name');
            return;
        }
        
        if (this.components.length === 0) {
            NotificationManager.error('Please add at least one component');
            return;
        }
        
        const appDefinition = {
            name: name,
            icon: this.iconPicker ? this.iconPicker.getValue() : this.selectedIcon,
            components: this.components
        };
        
        // Save as file
        const fileId = fileSystem.createFile(name, 'app', appDefinition);
        
        // Register as user app
        const appId = appRegistry.registerUserApp(appDefinition);
        
        NotificationManager.success(`App "${name}" saved successfully!`);
        
        // Clear the builder
        this.components = [];
        this.selectedComponent = null;
        nameInput.value = '';
        if (this.iconPicker) {
            this.iconPicker.setValue('fas fa-rocket');
        }
        this.renderWorkflow();
        this.renderProperties();
    }
}

// App Runtime for executing user apps
