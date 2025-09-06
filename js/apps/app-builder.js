// Extended App Builder Component with support for Modules
//
// The original Limedrop App Builder allowed users to assemble a single linear
// workflow from a collection of components.  In order to support more
// sophisticated applications we introduce the concept of **modules**.  A
// module groups a set of components into its own mini‑workflow consisting of
// one input (data source), any number of processing steps, and a final
// output.  Applications are composed of one or more modules executed
// sequentially.  This implementation preserves the original component
// semantics while adding module management and properly persisting the
// structure on save.  Existing apps without modules will continue to work
// because we flatten modules into a top‑level components array on save.

class AppBuilder {
    constructor(windowEl) {
        this.windowEl = windowEl;
        // Each module has {id, name, components: []}.  A fresh app starts
        // with a single module to mirror the original single workflow
        this.modules = [];
        // Index of the currently selected module in this.modules
        this.selectedModuleIndex = 0;
        // Currently selected component for editing; stored as an object with
        // moduleIndex and component reference.  This is used by the property
        // panel.
        this.selectedComponentRef = null;
        this.selectedIcon = 'fas fa-rocket';
        // Define the valid component types per section.  These arrays are
        // referenced when rendering the workflow so that each module can
        // present dedicated drop zones for Input, Processing and Output
        // categories.  The grouping mirrors the sidebar in the builder.
        this.inputTypes = ['text-input', 'file-upload', 'canvas', 'rich-text'];
        this.processingTypes = ['ai-prompt', 'data-transform'];
        this.outputTypes = ['display', 'chart', 'export'];
        this.init();
    }

    /**
     * Perform all initialisation: drag‑and‑drop setup, module UI and
     * component event registration.
     */
    init() {
        this.setupModuleUI();
        this.setupDragAndDrop();
        this.setupEvents();
        this.initIconPicker();
        // Ensure at least one module exists
        if (this.modules.length === 0) {
            this.addModule();
        }
    }

    /**
     * Create the UI elements for managing modules.  This adds a module list
     * section above the workflow container with controls to add/select/remove
     * modules.  It does not depend on any markup in index.html; instead it
     * injects the necessary elements into the window on the fly.
     */
    setupModuleUI() {
        // Locate the workflow container which exists in the original layout
        const workflowContainer = this.windowEl.querySelector('#workflow-container');
        // Create a container for modules
        const moduleContainer = document.createElement('div');
        moduleContainer.id = 'module-container';
        moduleContainer.className = 'module-container';
        moduleContainer.innerHTML = `
            <div class="module-header">Modules</div>
            <div id="module-list" class="module-list"></div>
            <button class="btn-primary module-add" id="module-add">+ Add Module</button>
        `;
        // Insert the module container before the workflow container
        workflowContainer.parentNode.insertBefore(moduleContainer, workflowContainer);
        // Bind the add module button
        const addBtn = moduleContainer.querySelector('#module-add');
        addBtn.addEventListener('click', () => this.addModule());
    }

    /**
     * Initialise the icon picker from the original builder for app icons.
     */
    initIconPicker() {
        const iconPickerContainer = this.windowEl.querySelector('#app-icon-picker');
        if (iconPickerContainer) {
            this.iconPicker = new IconPicker(iconPickerContainer, this.selectedIcon, (icon) => {
                this.selectedIcon = icon;
            });
        }
    }

    /**
     * Setup drag and drop handlers for components.  The drop target is
     * unchanged, however when a component is dropped it will be appended to
     * the currently selected module rather than a global list.
     */
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
        // Drop handlers are attached to the individual workflow zones when
        // rendering the module.  The workflow container itself no longer
        // processes drops because modules now have separate input, processing
        // and output areas.
    }

    /**
     * Register the Save button event listener from the original builder.
     */
    setupEvents() {
        const saveBtn = this.windowEl.querySelector('.save-app');
        saveBtn.addEventListener('click', () => this.saveApp());
    }

    /**
     * Create a new module with a default name and select it.
     */
    addModule() {
        const module = {
            id: `module-${Date.now()}`,
            name: `Module ${this.modules.length + 1}`,
            components: []
        };
        this.modules.push(module);
        this.selectedModuleIndex = this.modules.length - 1;
        this.renderModules();
        this.renderWorkflow();
    }

    /**
     * Remove a module by its id.  If the removed module was selected,
     * select another valid module.  Deleting the last module automatically
     * adds an empty module so the builder is never without at least one.
     */
    removeModule(moduleId) {
        const index = this.modules.findIndex(m => m.id === moduleId);
        if (index === -1) return;
        this.modules.splice(index, 1);
        // Ensure at least one module remains
        if (this.modules.length === 0) {
            this.addModule();
            return;
        }
        // Adjust selected module index if necessary
        if (this.selectedModuleIndex >= this.modules.length) {
            this.selectedModuleIndex = this.modules.length - 1;
        }
        this.renderModules();
        this.renderWorkflow();
    }

    /**
     * Change the selected module by index.  Updates the module list and
     * workflow display accordingly.
     */
    selectModule(index) {
        if (index < 0 || index >= this.modules.length) return;
        this.selectedModuleIndex = index;
        // Clear selected component when switching modules
        this.selectedComponentRef = null;
        this.renderModules();
        this.renderWorkflow();
        this.renderProperties();
    }

    /**
     * Append a component of the given type to the currently selected module.
     * Component defaults mirror the original implementation.
     */
    addComponent(type) {
        const component = {
            id: `comp-${Date.now()}`,
            type: type,
            config: this.getDefaultConfig(type)
        };
        const module = this.modules[this.selectedModuleIndex];
        module.components.push(component);
        this.renderWorkflow();
    }

    /**
     * Return default configuration values for a given component type.  This
     * method is unchanged from the original builder.
     */
    getDefaultConfig(type) {
        const defaults = {
            'text-input': { label: 'Text Input', placeholder: 'Enter text...', required: false },
            'file-upload': { label: 'Upload File', accept: '*' },
            'canvas': { label: 'Drawing Canvas', width: 400, height: 300, editable: true },
            'rich-text': { label: 'Rich Text Editor' },
            'ai-prompt': { prompt: 'Process the following: {{input}}', model: 'gpt-3.5' },
            'data-transform': { transformation: 'uppercase' },
            'display': { label: 'Output Display' },
            'chart': { type: 'bar', title: 'Chart' },
            'export': { format: 'json', filename: 'export' }
        };
        return defaults[type] || {};
    }

    /**
     * Render the list of modules in the module UI.  Each module entry shows
     * its name and the number of components it contains.  Clicking an entry
     * selects that module.  A remove button deletes the module.
     */
    renderModules() {
        const list = this.windowEl.querySelector('#module-list');
        if (!list) return;
        list.innerHTML = '';
        this.modules.forEach((module, index) => {
            const item = document.createElement('div');
            item.className = 'module-item' + (index === this.selectedModuleIndex ? ' selected' : '');
            item.dataset.moduleId = module.id;
            item.innerHTML = `
                <span class="module-name">${module.name}</span>
                <span class="module-count">(${module.components.length})</span>
                <button class="module-delete btn-danger">×</button>
            `;
            // Select module on click (except delete button)
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('module-delete')) return;
                this.selectModule(index);
            });
            // Delete module
            item.querySelector('.module-delete').addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await modalManager.confirm(`Remove ${module.name}?`, 'Remove Module');
                if (confirmed) {
                    this.removeModule(module.id);
                }
            });
            list.appendChild(item);
        });
    }

    /**
     * Render the workflow for the selected module.  If there are no
     * components display a helpful hint.  Component items behave exactly
     * like in the original builder: clicking an item selects it for
     * editing and the remove icon deletes it.
     */
    // Legacy renderer for flat workflows (no modules).  This method
    // remains for backwards compatibility but is no longer invoked in
    // the new modular builder.  It has been renamed to clarify its purpose.
    renderFlatWorkflow() {
        const container = this.windowEl.querySelector('#workflow-container');
        if (!container) return;
        // Validate selected module index
        const module = this.modules[this.selectedModuleIndex];
        if (!module || module.components.length === 0) {
            container.innerHTML = '<div class="workflow-empty">Drag components here to build your module</div>';
            return;
        }
        container.innerHTML = '';
        module.components.forEach((component, index) => {
            const item = document.createElement('div');
            item.className = 'workflow-item';
            item.dataset.componentId = component.id;
            item.innerHTML = `
                <span class="workflow-index">${index + 1}</span>
                <span class="workflow-label">${this.getComponentLabel(component)}</span>
                <button class="workflow-item-delete btn-danger">Remove</button>
            `;
            // Selecting a component
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('workflow-item-delete')) {
                    this.selectComponent(module, component);
                }
            });
            // Removing a component
            item.querySelector('.workflow-item-delete').addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await modalManager.confirm(
                    `Remove "${this.getComponentLabel(component)}" from the module?`,
                    'Remove Component'
                );
                if (confirmed) {
                    this.removeComponent(module.id, component.id);
                }
            });
            container.appendChild(item);
        });
    }

    /**
     * Return a human readable label for a component.  This is the same
     * mapping used in the original builder.
     */
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

    /**
     * Select a component for editing.  Store both the module and the
     * component reference so configuration updates are correctly applied.
     */
    selectComponent(module, component) {
        this.selectedComponentRef = { moduleId: module.id, component: component };
        // Highlight the selected workflow item
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

    /**
     * Render the configuration panel for the currently selected component.  If
     * no component is selected a placeholder message is shown.  The
     * configuration templates are defined in the original HTML by id
     * `${component.type}-config` and are cloned into the properties panel.
     */
    renderProperties() {
        const container = this.windowEl.querySelector('#properties-content');
        if (!container) return;
        if (!this.selectedComponentRef) {
            container.innerHTML = '<div class="properties-empty">Select a component to configure</div>';
            return;
        }
        const { component } = this.selectedComponentRef;
        const templateId = `${component.type}-config`;
        const template = document.getElementById(templateId);
        if (template) {
            container.innerHTML = '';
            container.appendChild(template.content.cloneNode(true));
            this.populateConfig(container);
            this.attachConfigListeners(container);
        } else {
            container.innerHTML = `<div class="properties-empty">Configuration for ${this.getComponentLabel(component)}</div>`;
        }
    }

    /**
     * Populate the configuration panel with the current values of the
     * selected component.  Works the same as the original builder but
     * references the selectedComponentRef object.
     */
    populateConfig(container) {
        const { component } = this.selectedComponentRef;
        const config = component.config;
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

    /**
     * Attach change listeners to configuration form controls so that updates
     * are reflected in the component config.  This matches the original
     * behaviour and uses the selectedComponentRef for context.
     */
    attachConfigListeners(container) {
        const inputs = container.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                const key = Array.from(input.classList).find(c => c.startsWith('config-')).replace('config-', '');
                const { component } = this.selectedComponentRef;
                if (input.type === 'checkbox') {
                    component.config[key] = input.checked;
                } else {
                    component.config[key] = input.value;
                }
            });
        });
    }

    /**
     * Remove a component by module id and component id.  If the
     * removed component was selected clear the selection.
     */
    removeComponent(moduleId, componentId) {
        const module = this.modules.find(m => m.id === moduleId);
        if (!module) return;
        const index = module.components.findIndex(c => c.id === componentId);
        if (index === -1) return;
        module.components.splice(index, 1);
        if (this.selectedComponentRef && this.selectedComponentRef.component.id === componentId) {
            this.selectedComponentRef = null;
            this.renderProperties();
        }
        this.renderWorkflow();
    }

    /**
     * Render the workflow for the selected module.  Each module is
     * visualised with three drop zones corresponding to input,
     * processing and output categories.  Components are grouped into
     * these zones based on their type.  Dropping any component onto
     * any zone will append it to the module; this approach emphasises
     * but does not strictly enforce the grouping.  Clicking on a
     * component selects it for editing and the remove button deletes it.
     */
    renderWorkflow() {
        const container = this.windowEl.querySelector('#workflow-container');
        if (!container) return;
        const module = this.modules[this.selectedModuleIndex];
        // Clear any existing content
        container.innerHTML = '';
        // Always render the three zones so drop targets are visible
        this.renderWorkflowZones(container, module);
        if (!module || module.components.length === 0) {
            // Insert placeholder messages when module is empty
            ['input', 'processing', 'output'].forEach(zone => {
                const body = container.querySelector(`.workflow-group-body[data-zone='${zone}']`);
                if (body) {
                    const empty = document.createElement('div');
                    empty.className = 'workflow-empty';
                    empty.textContent = `Drag components here for the ${zone} phase`;
                    body.appendChild(empty);
                }
            });
            return;
        }
        // Distribute components into the appropriate zone bodies
        module.components.forEach((component) => {
            const zone = this.getZoneForComponent(component);
            const groupBody = container.querySelector(`.workflow-group-body[data-zone='${zone}']`);
            if (!groupBody) return;
            // Compute position within its zone
            const index = module.components.filter(c => this.getZoneForComponent(c) === zone).indexOf(component);
            const item = document.createElement('div');
            item.className = 'workflow-item';
            item.dataset.componentId = component.id;
            item.innerHTML = `<span class="workflow-index">${index + 1}</span><span class="workflow-label">${this.getComponentLabel(component)}</span><button class="workflow-item-delete btn-danger">Remove</button>`;
            // Selecting a component
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('workflow-item-delete')) {
                    this.selectComponent(module, component);
                }
            });
            // Removing a component
            item.querySelector('.workflow-item-delete').addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await modalManager.confirm(
                    `Remove "${this.getComponentLabel(component)}" from the module?`,
                    'Remove Component'
                );
                if (confirmed) {
                    this.removeComponent(module.id, component.id);
                }
            });
            groupBody.appendChild(item);
        });
        // Insert placeholders for empty groups
        ['input', 'processing', 'output'].forEach(zone => {
            const body = container.querySelector(`.workflow-group-body[data-zone='${zone}']`);
            if (body && body.children.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'workflow-empty';
                empty.textContent = `Drag components here for the ${zone} phase`;
                body.appendChild(empty);
            }
        });
    }

    /**
     * Create three drop zones (Input, Processing, Output) inside the
     * workflow container.  These zones serve as visual guides and drop
     * targets for components.  Drop events on these zones call
     * addComponent() regardless of type so that grouping is advisory.
     */
    renderWorkflowZones(container, module) {
        const sections = [
            { zone: 'input', title: 'Input' },
            { zone: 'processing', title: 'Processing' },
            { zone: 'output', title: 'Output' }
        ];
        sections.forEach(({ zone, title }) => {
            const group = document.createElement('div');
            group.className = `workflow-group workflow-group-${zone}`;
            // Header
            const header = document.createElement('div');
            header.className = 'workflow-group-header';
            header.textContent = title;
            group.appendChild(header);
            // Body (drop zone)
            const body = document.createElement('div');
            body.className = 'workflow-group-body';
            body.dataset.zone = zone;
            // Attach drop handlers
            body.addEventListener('dragover', (e) => {
                e.preventDefault();
                group.classList.add('drag-over');
            });
            body.addEventListener('dragleave', () => {
                group.classList.remove('drag-over');
            });
            body.addEventListener('drop', (e) => {
                e.preventDefault();
                group.classList.remove('drag-over');
                const componentType = e.dataTransfer.getData('component-type');
                if (componentType) {
                    this.addComponent(componentType);
                }
            });
            group.appendChild(body);
            container.appendChild(group);
        });
    }

    /**
     * Determine which zone a component belongs to based on its type.
     */
    getZoneForComponent(component) {
        if (this.inputTypes.includes(component.type)) return 'input';
        if (this.processingTypes.includes(component.type)) return 'processing';
        return 'output';
    }

    /**
     * Persist the app definition to the file system and register it with
     * the app registry.  The definition includes both `modules` and a
     * flattened `components` array for backwards compatibility.
     */
    saveApp() {
        const nameInput = this.windowEl.querySelector('.app-name-input');
        const name = nameInput.value.trim();
        if (!name) {
            NotificationManager.error('Please enter an app name');
            return;
        }
        // Ensure at least one component exists across all modules
        const hasComponents = this.modules.some(m => m.components.length > 0);
        if (!hasComponents) {
            NotificationManager.error('Please add at least one component');
            return;
        }
        // Flatten all components for legacy consumers (e.g. older runtime)
        const flatComponents = this.modules.reduce((acc, mod) => acc.concat(mod.components), []);
        const appDefinition = {
            name: name,
            icon: this.iconPicker ? this.iconPicker.getValue() : this.selectedIcon,
            modules: this.modules,
            components: flatComponents
        };
        // Save as file and register user app
        const fileId = fileSystem.createFile(name, 'app', appDefinition);
        const appId = appRegistry.registerUserApp(appDefinition);
        NotificationManager.success(`App "${name}" saved successfully!`);
        // Reset builder state
        this.modules = [];
        this.selectedModuleIndex = 0;
        this.selectedComponentRef = null;
        nameInput.value = '';
        if (this.iconPicker) {
            this.iconPicker.setValue('fas fa-rocket');
        }
        // Recreate default module
        this.addModule();
        this.renderModules();
        this.renderWorkflow();
        this.renderProperties();
    }
}

// Expose AppBuilder globally so that the boot sequence can instantiate it.
window.AppBuilder = AppBuilder;