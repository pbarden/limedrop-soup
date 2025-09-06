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
        // Inject module workflow styles to ensure the drop zones match
        // the look and feel of the application. This is done once per
        // builder instance and only if the styles have not already
        // been added to the document.
        this.injectModuleStyles();
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
     * Dynamically inject CSS rules for module workflow groups. Because
     * the original Limedrop application loads its global styles from a
     * separate file that we cannot modify directly in this environment,
     * we embed the necessary styles here. The CSS mirrors the
     * application’s translucent backgrounds, dashed borders and
     * typography. It is added only once per page.
     */
    injectModuleStyles() {
        const styleId = 'module-workflow-styles';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Module Workflow Group Styles */
            .workflow-group {
                margin-bottom: 20px;
            }
            .workflow-group-header {
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                margin-bottom: 6px;
                color: rgba(255, 255, 255, 0.7);
            }
            .workflow-group-body {
                background: rgba(255, 255, 255, 0.05);
                border: 1px dashed rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                padding: 8px;
                min-height: 60px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                transition: background 0.3s ease, border-color 0.3s ease;
            }
            .workflow-group-body.drag-over {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.3);
            }
            .workflow-empty {
                color: rgba(255, 255, 255, 0.5);
                font-size: 12px;
                text-align: center;
                padding: 10px 0;
            }

            /* Module dropdown styles */
            .module-dropdown {
                position: relative;
                display: inline-block;
                width: 100%;
            }
            .module-dropdown-toggle {
                width: 100%;
                padding: 10px 12px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #fff;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                text-align: left;
            }
            .module-dropdown-toggle:after {
                content: '';
            }
            .module-dropdown-menu {
                position: absolute;
                left: 0;
                right: 0;
                top: 100%;
                margin-top: 5px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                backdrop-filter: blur(20px);
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
                z-index: 1000;
                max-height: 250px;
                overflow-y: auto;
            }
            .module-dropdown-menu.hide {
                display: none;
            }
            .module-option {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 14px;
                transition: background 0.2s ease;
            }
            .module-option:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .module-option.selected {
                background: rgba(255, 255, 255, 0.15);
                border-left: 3px solid rgba(255, 255, 255, 0.4);
            }
            .module-option-actions {
                display: flex;
                gap: 4px;
            }
            .module-option-actions button {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.7);
                font-size: 12px;
                padding: 2px 4px;
                cursor: pointer;
            }
            .module-option-actions button:hover {
                color: rgba(255, 255, 255, 0.9);
            }
            .module-add-option {
                padding: 10px 12px;
                font-size: 14px;
                color: rgba(255, 255, 255, 0.8);
                cursor: pointer;
            }
            .module-add-option:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .module-menu-divider {
                height: 1px;
                background: rgba(255, 255, 255, 0.1);
                margin: 4px 0;
            }
            .module-option-count {
                margin-left: 6px;
                color: rgba(255, 255, 255, 0.6);
                font-size: 12px;
            }
            .module-option-name {
                flex: 1;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Create the UI elements for managing modules.  This method replaces
     * the previous list and standalone add button with a custom dropdown
     * control.  The dropdown displays the currently selected module and
     * allows users to select, rename, remove or add modules via a menu.
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
            <div id="module-dropdown" class="module-dropdown">
                <button class="module-dropdown-toggle"></button>
                <div class="module-dropdown-menu hide"></div>
            </div>
        `;
        // Insert the module container before the workflow container
        workflowContainer.parentNode.insertBefore(moduleContainer, workflowContainer);
        // Toggle dropdown visibility on click
        const dropdown = moduleContainer.querySelector('#module-dropdown');
        const toggle = dropdown.querySelector('.module-dropdown-toggle');
        const menu = dropdown.querySelector('.module-dropdown-menu');
        toggle.addEventListener('click', () => {
            menu.classList.toggle('hide');
        });
        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                menu.classList.add('hide');
            }
        });
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
            // Text input now includes additional validation and customisation options:
            // - inputType: HTML input type (text, email, number, password, etc.)
            // - minLength / maxLength: minimum and maximum character length
            // - pattern: a regular expression string the value must match
            // - defaultValue: initial value shown to the user
            // - required: whether the field must be filled
            'text-input': {
                label: 'Text Input',
                placeholder: 'Enter text...',
                required: false,
                inputType: 'text',
                minLength: 0,
                maxLength: null,
                pattern: '',
                defaultValue: ''
            },
            // File upload now supports choosing an existing file registered in the
            // file system.  The `source` field determines whether the user can
            // upload a new file or select an existing one.  When using
            // "existing", the `fileId` or `fileName` should be set by the
            // configuration UI (not yet implemented).  The `accept` field
            // remains for filtering upload types.
            'file-upload': { label: 'Upload File', accept: '*', source: 'upload', fileId: null },
            // Canvas supports additional toggles to enable/disable drawing
            // tools.  `editable` controls whether drawing is allowed.
            // `showBrushControls` toggles brush size/color selectors, while
            // `showTaskbar` toggles a toolbar with AI prompt buttons.  The
            // `aiPrompts` array defines the names of prompts to be shown in
            // the taskbar.  `brushSize` and `brushColor` initialise the
            // drawing tool.  These values can later be customised via the
            // properties panel when that UI is extended.
            'canvas': {
                label: 'Drawing Canvas',
                width: 400,
                height: 300,
                editable: true,
                showBrushControls: true,
                showTaskbar: false,
                aiPrompts: ['Watercolor', 'Sketch'],
                brushSize: 5,
                brushColor: '#000000'
            },
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
        const dropdown = this.windowEl.querySelector('#module-dropdown');
        if (!dropdown) return;
        const toggle = dropdown.querySelector('.module-dropdown-toggle');
        const menu = dropdown.querySelector('.module-dropdown-menu');
        // Update toggle button text to show selected module name and count
        const selected = this.modules[this.selectedModuleIndex];
        if (selected) {
            toggle.textContent = `${selected.name} (${selected.components.length}) \u25BC`;
        } else {
            toggle.textContent = 'No Module \u25BC';
        }
        // Clear menu
        menu.innerHTML = '';
        // Build module options
        this.modules.forEach((module, index) => {
            const option = document.createElement('div');
            option.className = 'module-option' + (index === this.selectedModuleIndex ? ' selected' : '');
            option.dataset.index = index;
            option.innerHTML = `
                <span class="module-option-name">${module.name}</span>
                <span class="module-option-count">(${module.components.length})</span>
                <div class="module-option-actions">
                    <button class="module-option-edit" title="Rename">✎</button>
                    <button class="module-option-delete" title="Remove">×</button>
                </div>
            `;
            // Selecting a module
            option.addEventListener('click', (e) => {
                // If clicking on edit or delete, do not change selection here
                if (e.target.closest('.module-option-edit') || e.target.closest('.module-option-delete')) {
                    return;
                }
                this.selectModule(index);
                menu.classList.add('hide');
            });
            // Rename module
            const editBtn = option.querySelector('.module-option-edit');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newName = prompt('Enter module name', module.name);
                if (newName && newName.trim()) {
                    module.name = newName.trim();
                    this.renderModules();
                }
            });
            // Delete module
            const deleteBtn = option.querySelector('.module-option-delete');
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await modalManager.confirm(`Remove ${module.name}?`, 'Remove Module');
                if (confirmed) {
                    this.removeModule(module.id);
                    menu.classList.add('hide');
                }
            });
            menu.appendChild(option);
        });
        // Add option to create a new module
        const addOption = document.createElement('div');
        addOption.className = 'module-add-option';
        addOption.textContent = '+ Add Module';
        addOption.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addModule();
            menu.classList.add('hide');
        });
        // Add a divider before the add option if there are existing modules
        if (this.modules.length > 0) {
            const divider = document.createElement('div');
            divider.className = 'module-menu-divider';
            menu.appendChild(divider);
        }
        menu.appendChild(addOption);
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
        // Provide a custom property editor for text-input so additional
        // configuration options (inputType, defaultValue, minLength, etc.)
        // can be adjusted without relying on an external HTML template.
        if (component.type === 'text-input') {
            this.renderTextInputProperties(container);
            return;
        }
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
     * Render custom properties UI for the text input component.  This
     * includes fields for label, placeholder, default value, input type,
     * required toggle, min/max length and a regex pattern.  After
     * building the form the existing populateConfig and attachConfigListeners
     * methods are invoked to bind the config values and listeners.
     */
    renderTextInputProperties(container) {
        container.innerHTML = '';
        const form = document.createElement('div');
        form.className = 'config-form';
        form.innerHTML = `
            <div class="form-group">
                <label>Label</label>
                <input type="text" class="config-label" />
            </div>
            <div class="form-group">
                <label>Placeholder</label>
                <input type="text" class="config-placeholder" />
            </div>
            <div class="form-group">
                <label>Default Value</label>
                <input type="text" class="config-defaultValue" />
            </div>
            <div class="form-group">
                <label>Input Type</label>
                <select class="config-inputType">
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="number">Number</option>
                    <option value="password">Password</option>
                    <option value="tel">Telephone</option>
                    <option value="url">URL</option>
                </select>
            </div>
            <div class="form-group">
                <label>Required</label>
                <input type="checkbox" class="config-required" />
            </div>
            <div class="form-group">
                <label>Min Length</label>
                <input type="number" min="0" class="config-minLength" />
            </div>
            <div class="form-group">
                <label>Max Length</label>
                <input type="number" min="0" class="config-maxLength" />
            </div>
            <div class="form-group">
                <label>Pattern (Regex)</label>
                <input type="text" class="config-pattern" />
            </div>
        `;
        container.appendChild(form);
        // Populate fields from config and attach listeners
        this.populateConfig(container);
        this.attachConfigListeners(container);
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