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
        this.inputTypes = ['text-input', 'file-upload', 'canvas', 'rich-text', 'table', 'data-source'];
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
        // Dynamically insert a Table component item into the input list if it
        // does not already exist in the HTML.  This enables dragging
        // a table component without requiring manual HTML changes.
        this.injectTableComponentItem();
        // Dynamically insert a Data Source component item into the input list
        // if it does not already exist.  This ensures the new component
        // appears in the builder sidebar without manual HTML edits.
        this.injectDataSourceComponentItem();
        // Ensure at least one module exists
        if (this.modules.length === 0) {
            this.addModule();
        }
    }

    /**
     * Insert a new component item for the table input into the input
     * components list.  It clones the class names from the text input
     * item to maintain visual consistency.  If a table item already
     * exists (e.g. defined in the HTML), this method does nothing.
     */
    injectTableComponentItem() {
        // Check if a table item already exists
        if (this.windowEl.querySelector('.component-item[data-type="table"]')) {
            return;
        }
        // Find an existing input component item to clone classes
        const reference = this.windowEl.querySelector('.component-item[data-type="text-input"]');
        if (!reference) return;
        const parent = reference.parentElement;
        if (!parent) return;
        const item = document.createElement('div');
        item.className = reference.className;
        item.setAttribute('draggable', 'true');
        item.dataset.type = 'table';
        // Use a table icon if font-awesome is available
        item.innerHTML = `<i class="fas fa-table" style="margin-right:8px;"></i><span>Table</span>`;
        parent.appendChild(item);
        // Attach dragstart and dragend events to the new item
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('component-type', 'table');
            item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });
    }

    /**
     * Insert a new component item for the data source input into the input
     * components list.  It clones the class names from the text input
     * item to maintain visual consistency.  If a data source item already
     * exists (e.g. defined in the HTML), this method does nothing.
     */
    injectDataSourceComponentItem() {
        // Check if a data source item already exists
        if (this.windowEl.querySelector('.component-item[data-type="data-source"]')) {
            return;
        }
        // Find an existing input component item to clone classes
        const reference = this.windowEl.querySelector('.component-item[data-type="text-input"]');
        if (!reference) return;
        const parent = reference.parentElement;
        if (!parent) return;
        const item = document.createElement('div');
        item.className = reference.className;
        item.setAttribute('draggable', 'true');
        item.dataset.type = 'data-source';
        // Use a database/file import icon if font-awesome is available
        item.innerHTML = `<i class="fas fa-database" style="margin-right:8px;"></i><span>Data Source</span>`;
        parent.appendChild(item);
        // Attach dragstart and dragend events to the new item
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('component-type', 'data-source');
            item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });
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
                defaultValue: '',
                allowImport: true,
                allowExport: true
            },
            // File upload now supports choosing an existing file registered in the
            // file system.  The `source` field determines whether the user can
            // upload a new file, select an existing one, or offer both options.
            // `accept` restricts the allowed file types, `fileId` can preselect an
            // existing file, and `multiple` allows selecting multiple files.
            'file-upload': {
                label: 'Upload File',
                accept: '*',
                source: 'both', // 'upload', 'existing', or 'both'
                fileId: null,
                multiple: false,
                required: false
            },
            // Canvas supports additional toggles to enable/disable drawing
            // tools.  `editable` controls whether drawing is allowed.
            // `showBrushControls` toggles brush size/color selectors, while
            // `showTaskbar` toggles a toolbar with AI prompt buttons.  The
            // `aiPrompts` field can be a comma-separated string (e.g. "Watercolor,Sketch")
            // or an array of prompt names.  `brushSize` and `brushColor` initialise the
            // drawing tool.  These values can be customised via the properties panel.
            'canvas': {
                label: 'Drawing Canvas',
                width: 400,
                height: 300,
                editable: true,
                showBrushControls: true,
                showTaskbar: false,
                // aiOptions is an array of objects: { label, prompt, icon }
                aiOptions: [],
                brushSize: 5,
                brushColor: '#000000',
                allowImport: true,
                allowExport: true,
                // Additional tools
                showFill: false,
                showErase: false
            },
            // Rich text editor now supports height, placeholder, toolbar options
            // (comma-separated), and a default value.  Toolbar options can include
            // bold, italic, underline, bullet, numbered, link.  These will be
            // parsed at runtime to build the editor toolbar.
            'rich-text': {
                label: 'Rich Text Editor',
                height: 200,
                placeholder: '',
                toolbarOptions: 'bold,italic,underline,bullet,numbered,link',
                defaultValue: '',
                allowImport: true,
                allowExport: true,
                // AI options allow defining custom actions that transform the rich text.
                aiOptions: [],
                // Show taskbar toggles the AI options toolbar in the runtime UI.
                showTaskbar: false
            },
            // Table input for tabular data.  Columns is a comma‑separated list of
            // column names.  Rows defines the number of initial blank rows.
            // Editable determines whether the user can modify cells.
            'table': {
                label: 'Table',
                columns: 'Column 1,Column 2',
                rows: 2,
                editable: true,
                allowImport: true,
                allowExport: true,
                // AI options allow defining custom actions that manipulate the table.
                aiOptions: [],
                // Show taskbar toggles the AI options toolbar in the runtime UI.
                showTaskbar: false
            },
            // Data source component allows the app creator to select a JSON file
            // from the file system as an input.  The dataType determines how
            // the JSON should be interpreted at run time: auto (heuristic),
            // text (first string), image (first data URL), or table (first
            // array/object).  The fileId stores the selected file name or id.
            'data-source': {
                label: 'Data Source',
                fileId: null,
                dataType: 'auto'
            },
            // AI prompt component allows setting a system prompt for an AI model
            // along with the target model and optional display text to show
            // to the end user.  The displayText field is not sent to the model;
            // it is purely for user guidance during runtime.
            'ai-prompt': {
                label: 'AI Prompt',
                prompt: 'Process the following: {{input}}',
                model: 'gpt-3.5',
                displayText: ''
            },
            'data-transform': {
                label: 'Data Transform',
                // Target data type defines what the input should be converted to: text, table, or image.
                targetType: 'text',
                // Optional text to display to the user during the transformation step.
                displayText: '',
                // Legacy transformation field for backwards compatibility (not used in new UI)
                transformation: 'custom'
            },
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
            , 'table': 'Table'
            , 'data-source': 'Data Source'
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
        // Provide a custom property editor for file-upload so users can
        // configure accept types, source mode, multiple selection and
        // preselected file.  This overrides any static template.
        if (component.type === 'file-upload') {
            this.renderFileUploadProperties(container);
            return;
        }
        // Provide a custom property editor for canvas components
        if (component.type === 'canvas') {
            this.renderCanvasProperties(container);
            return;
        }
        // Provide custom property editor for table components
        if (component.type === 'table') {
            this.renderTableProperties(container);
            return;
        }
        // Provide a custom property editor for rich text components
        if (component.type === 'rich-text') {
            this.renderRichTextProperties(container);
            return;
        }
        // Provide a custom property editor for data source components
        if (component.type === 'data-source') {
            this.renderDataSourceProperties(container);
            return;
        }
        // Provide a custom property editor for data transform components
        if (component.type === 'data-transform') {
            this.renderDataTransformProperties(container);
            return;
        }
        // Provide a custom property editor for AI prompt components
        if (component.type === 'ai-prompt') {
            this.renderAiPromptProperties(container);
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
            <!-- Data source controls -->
            <div class="form-group">
                <label>Allow Import</label>
                <input type="checkbox" class="config-allowImport" />
            </div>
            <div class="form-group">
                <label>Allow Export</label>
                <input type="checkbox" class="config-allowExport" />
            </div>
        `;
        container.appendChild(form);
        // Populate fields from config and attach listeners
        this.populateConfig(container);
        this.attachConfigListeners(container);
    }

    /**
     * Render custom properties UI for the file upload component.  This
     * includes fields for label, accept types, source mode (upload, existing
     * or both), multiple selection, required toggle and a preselected file
     * identifier.  After building the form the existing populateConfig and
     * attachConfigListeners methods are invoked to bind values.
     */
    renderFileUploadProperties(container) {
        container.innerHTML = '';
        const form = document.createElement('div');
        form.className = 'config-form';
        form.innerHTML = `
            <div class="form-group">
                <label>Label</label>
                <input type="text" class="config-label" />
            </div>
            <div class="form-group">
                <label>Accept (e.g. .png,.jpg,application/pdf)</label>
                <input type="text" class="config-accept" />
            </div>
            <div class="form-group">
                <label>Source Mode</label>
                <select class="config-source">
                    <option value="upload">Upload Only</option>
                    <option value="existing">Existing Only</option>
                    <option value="both">Both</option>
                </select>
            </div>
            <div class="form-group">
                <label>Allow Multiple</label>
                <input type="checkbox" class="config-multiple" />
            </div>
            <div class="form-group">
                <label>Required</label>
                <input type="checkbox" class="config-required" />
            </div>
            <div class="form-group">
                <label>Preselected File ID (optional)</label>
                <input type="text" class="config-fileId" />
            </div>
        `;
        container.appendChild(form);
        // Populate fields from config and attach listeners
        this.populateConfig(container);
        this.attachConfigListeners(container);
    }

    /**
     * Render custom properties UI for the canvas component.  This includes
     * fields for label, dimensions, editable toggle, brush controls, brush
     * size and color, taskbar toggle and AI prompt list.  The AI prompts
     * field accepts a comma-separated string which is stored directly on
     * the component config (it will be parsed at runtime).  After building
     * the form the existing populateConfig and attachConfigListeners
     * methods are invoked to bind values.
     */
    renderCanvasProperties(container) {
        container.innerHTML = '';
        const form = document.createElement('div');
        form.className = 'config-form';
        form.innerHTML = `
            <div class="form-group">
                <label>Label</label>
                <input type="text" class="config-label" />
            </div>
            <div class="form-group" style="display:flex; gap:10px;">
                <div style="flex:1;">
                    <label>Width</label>
                    <input type="number" min="50" class="config-width" />
                </div>
                <div style="flex:1;">
                    <label>Height</label>
                    <input type="number" min="50" class="config-height" />
                </div>
            </div>
            <div class="form-group">
                <label>Editable</label>
                <input type="checkbox" class="config-editable" />
            </div>
            <div class="form-group">
                <label>Show Brush Controls</label>
                <input type="checkbox" class="config-showBrushControls" />
            </div>
            <div class="form-group" style="display:flex; gap:10px;">
                <div style="flex:1;">
                    <label>Brush Size (default)</label>
                    <input type="number" min="1" max="50" class="config-brushSize" />
                </div>
                <div style="flex:1;">
                    <label>Brush Color (default)</label>
                    <input type="color" class="config-brushColor" />
                </div>
            </div>
            <div class="form-group">
                <label>Show Taskbar</label>
                <input type="checkbox" class="config-showTaskbar" />
            </div>
            <div class="form-group">
                <label>AI Options</label>
                <div id="ai-options-list" style="margin-top:4px;"></div>
                <button type="button" id="add-ai-option" class="btn-secondary" style="margin-top:6px;">+ Add AI Option</button>
                <small style="font-size:11px; color: rgba(255,255,255,0.6); display:block; margin-top:2px;">Configure up to 10 AI actions. Each action includes a button label, a system prompt and an icon.</small>
            </div>
            <div class="form-group">
                <label>Show Fill Tool</label>
                <input type="checkbox" class="config-showFill" />
            </div>
            <div class="form-group">
                <label>Show Erase Tool</label>
                <input type="checkbox" class="config-showErase" />
            </div>
            <!-- Data source controls -->
            <div class="form-group">
                <label>Allow Import</label>
                <input type="checkbox" class="config-allowImport" />
            </div>
            <div class="form-group">
                <label>Allow Export</label>
                <input type="checkbox" class="config-allowExport" />
            </div>
        `;
        container.appendChild(form);
        // Populate fields from config and attach listeners for built-in canvas settings
        this.populateConfig(container);
        this.attachConfigListeners(container);
        // Handle AI options list rendering and interactions
        const { component } = this.selectedComponentRef;
        // Ensure aiOptions is an array
        if (!Array.isArray(component.config.aiOptions)) {
            component.config.aiOptions = [];
        }
        const listContainer = form.querySelector('#ai-options-list');
        const addBtn = form.querySelector('#add-ai-option');
        const renderAiOptions = () => {
            listContainer.innerHTML = '';
            const options = component.config.aiOptions;
            options.forEach((opt, index) => {
                const row = document.createElement('div');
                row.className = 'ai-option-row';
                row.style.marginBottom = '8px';
                row.innerHTML = `
                    <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px;">
                        <input type="text" class="ai-label" placeholder="Button label" value="${opt.label || ''}" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); border-radius:4px; color:#fff; padding:4px;" />
                        <button type="button" class="ai-icon-btn" title="Select icon" style="padding:4px 6px; background:rgba(255,255,255,0.1); border:none; border-radius:4px; color:#fff;"><i class="${opt.icon || 'fas fa-magic'}"></i></button>
                        <button type="button" class="ai-remove-btn" title="Remove" style="padding:4px 6px; background:rgba(255,67,54,0.8); border:none; border-radius:4px; color:#fff;">&times;</button>
                    </div>
                    <textarea class="ai-prompt" placeholder="System prompt..." rows="2" style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); border-radius:4px; color:#fff; padding:4px;">${opt.prompt || ''}</textarea>
                `;
                listContainer.appendChild(row);
                const iconBtn = row.querySelector('.ai-icon-btn');
                const removeBtn = row.querySelector('.ai-remove-btn');
                const labelInput = row.querySelector('.ai-label');
                const promptInput = row.querySelector('.ai-prompt');
                // Create a hidden container for the icon picker
                const iconContainer = document.createElement('div');
                iconContainer.style.display = 'none';
                iconContainer.style.position = 'relative';
                row.appendChild(iconContainer);
                const picker = new IconPicker(iconContainer, opt.icon || 'fas fa-magic', (icon) => {
                    opt.icon = icon;
                    iconBtn.innerHTML = `<i class="${icon}"></i>`;
                    iconContainer.style.display = 'none';
                });
                iconBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    // Toggle picker visibility
                    iconContainer.style.display = iconContainer.style.display === 'none' ? 'block' : 'none';
                });
                removeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    component.config.aiOptions.splice(index, 1);
                    renderAiOptions();
                });
                labelInput.addEventListener('input', () => {
                    opt.label = labelInput.value;
                });
                promptInput.addEventListener('input', () => {
                    opt.prompt = promptInput.value;
                });
            });
        };
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (component.config.aiOptions.length >= 10) {
                NotificationManager && NotificationManager.error && NotificationManager.error('Maximum of 10 AI options allowed');
                return;
            }
            component.config.aiOptions.push({ label: '', prompt: '', icon: 'fas fa-magic' });
            renderAiOptions();
        });
        // Initial render of AI options
        renderAiOptions();
    }

    /**
     * Render custom properties UI for the table component.  This includes
     * fields for label, columns (comma‑separated), number of rows and
     * editable toggle.  These values are bound to the component config.
     */
    renderTableProperties(container) {
        container.innerHTML = '';
        const form = document.createElement('div');
        form.className = 'config-form';
        form.innerHTML = `
            <div class="form-group">
                <label>Label</label>
                <input type="text" class="config-label" />
            </div>
            <div class="form-group">
                <label>Columns (comma-separated)</label>
                <input type="text" class="config-columns" />
            </div>
            <div class="form-group">
                <label>Initial Rows</label>
                <input type="number" min="0" class="config-rows" />
            </div>
            <div class="form-group">
                <label>Editable</label>
                <input type="checkbox" class="config-editable" />
            </div>
            <div class="form-group">
                <label>Show Taskbar</label>
                <input type="checkbox" class="config-showTaskbar" />
            </div>
            <div class="form-group">
                <label>AI Options</label>
                <div id="table-ai-options-list" style="margin-top:4px;"></div>
                <button type="button" id="add-table-ai-option" class="btn-secondary" style="margin-top:6px;">+ Add AI Option</button>
                <small style="font-size:11px; color: rgba(255,255,255,0.6); display:block; margin-top:2px;">Configure up to 10 AI actions. Each action includes a button label, a system prompt and an icon.</small>
            </div>
            <!-- Data source controls -->
            <div class="form-group">
                <label>Allow Import</label>
                <input type="checkbox" class="config-allowImport" />
            </div>
            <div class="form-group">
                <label>Allow Export</label>
                <input type="checkbox" class="config-allowExport" />
            </div>
        `;
        container.appendChild(form);
        this.populateConfig(container);
        this.attachConfigListeners(container);
        // Handle AI options for table
        const { component } = this.selectedComponentRef;
        if (!Array.isArray(component.config.aiOptions)) {
            component.config.aiOptions = [];
        }
        const listContainer = form.querySelector('#table-ai-options-list');
        const addBtn = form.querySelector('#add-table-ai-option');
        const renderAiOptions = () => {
            listContainer.innerHTML = '';
            const options = component.config.aiOptions;
            options.forEach((opt, index) => {
                const row = document.createElement('div');
                row.className = 'ai-option-row';
                row.style.marginBottom = '8px';
                row.innerHTML = `
                    <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px;">
                        <input type="text" class="ai-label" placeholder="Button label" value="${opt.label || ''}" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); border-radius:4px; color:#fff; padding:4px;" />
                        <button type="button" class="ai-icon-btn" title="Select icon" style="padding:4px 6px; background:rgba(255,255,255,0.1); border:none; border-radius:4px; color:#fff;"><i class="${opt.icon || 'fas fa-magic'}"></i></button>
                        <button type="button" class="ai-remove-btn" title="Remove" style="padding:4px 6px; background:rgba(255,67,54,0.8); border:none; border-radius:4px; color:#fff;">&times;</button>
                    </div>
                    <textarea class="ai-prompt" placeholder="System prompt..." rows="2" style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); border-radius:4px; color:#fff; padding:4px;">${opt.prompt || ''}</textarea>
                `;
                listContainer.appendChild(row);
                const iconBtn = row.querySelector('.ai-icon-btn');
                const removeBtn = row.querySelector('.ai-remove-btn');
                const labelInput = row.querySelector('.ai-label');
                const promptInput = row.querySelector('.ai-prompt');
                // Hidden container for icon picker
                const iconContainer = document.createElement('div');
                iconContainer.style.display = 'none';
                iconContainer.style.position = 'relative';
                row.appendChild(iconContainer);
                const picker = new IconPicker(iconContainer, opt.icon || 'fas fa-magic', (icon) => {
                    opt.icon = icon;
                    iconBtn.innerHTML = `<i class="${icon}"></i>`;
                    iconContainer.style.display = 'none';
                });
                iconBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    iconContainer.style.display = iconContainer.style.display === 'none' ? 'block' : 'none';
                });
                removeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    component.config.aiOptions.splice(index, 1);
                    renderAiOptions();
                });
                labelInput.addEventListener('input', () => {
                    opt.label = labelInput.value;
                });
                promptInput.addEventListener('input', () => {
                    opt.prompt = promptInput.value;
                });
            });
        };
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (component.config.aiOptions.length >= 10) {
                NotificationManager && NotificationManager.error && NotificationManager.error('Maximum of 10 AI options allowed');
                return;
            }
            component.config.aiOptions.push({ label: '', prompt: '', icon: 'fas fa-magic' });
            renderAiOptions();
        });
        renderAiOptions();
    }

    /**
     * Render custom properties UI for the rich text component.  This includes
     * fields for label, placeholder, height, toolbar options and default
     * value.  Toolbar options are entered as a comma-separated list.
     */
    renderRichTextProperties(container) {
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
                <label>Height (px)</label>
                <input type="number" min="50" class="config-height" />
            </div>
            <div class="form-group">
                <label>Toolbar Options (comma-separated)</label>
                <input type="text" class="config-toolbarOptions" />
                <small style="font-size:11px; color: rgba(255,255,255,0.6);">e.g. bold,italic,underline,bullet,numbered,link</small>
            </div>
            <div class="form-group">
                <label>Default Value (HTML)</label>
                <textarea rows="4" class="config-defaultValue"></textarea>
            </div>
            <div class="form-group">
                <label>Show Taskbar</label>
                <input type="checkbox" class="config-showTaskbar" />
            </div>
            <div class="form-group">
                <label>AI Options</label>
                <div id="rt-ai-options-list" style="margin-top:4px;"></div>
                <button type="button" id="add-rt-ai-option" class="btn-secondary" style="margin-top:6px;">+ Add AI Option</button>
                <small style="font-size:11px; color: rgba(255,255,255,0.6); display:block; margin-top:2px;">Configure up to 10 AI actions. Each action includes a button label, a system prompt and an icon.</small>
            </div>
            <!-- Data source controls -->
            <div class="form-group">
                <label>Allow Import</label>
                <input type="checkbox" class="config-allowImport" />
            </div>
            <div class="form-group">
                <label>Allow Export</label>
                <input type="checkbox" class="config-allowExport" />
            </div>
        `;
        container.appendChild(form);
        this.populateConfig(container);
        this.attachConfigListeners(container);
        // Handle AI options for rich text
        const { component } = this.selectedComponentRef;
        if (!Array.isArray(component.config.aiOptions)) {
            component.config.aiOptions = [];
        }
        const listContainer = form.querySelector('#rt-ai-options-list');
        const addBtn = form.querySelector('#add-rt-ai-option');
        const renderAiOptions = () => {
            listContainer.innerHTML = '';
            const options = component.config.aiOptions;
            options.forEach((opt, index) => {
                const row = document.createElement('div');
                row.className = 'ai-option-row';
                row.style.marginBottom = '8px';
                row.innerHTML = `
                    <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px;">
                        <input type="text" class="ai-label" placeholder="Button label" value="${opt.label || ''}" style="flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); border-radius:4px; color:#fff; padding:4px;" />
                        <button type="button" class="ai-icon-btn" title="Select icon" style="padding:4px 6px; background:rgba(255,255,255,0.1); border:none; border-radius:4px; color:#fff;"><i class="${opt.icon || 'fas fa-magic'}"></i></button>
                        <button type="button" class="ai-remove-btn" title="Remove" style="padding:4px 6px; background:rgba(255,67,54,0.8); border:none; border-radius:4px; color:#fff;">&times;</button>
                    </div>
                    <textarea class="ai-prompt" placeholder="System prompt..." rows="2" style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.2); border-radius:4px; color:#fff; padding:4px;">${opt.prompt || ''}</textarea>
                `;
                listContainer.appendChild(row);
                const iconBtn = row.querySelector('.ai-icon-btn');
                const removeBtn = row.querySelector('.ai-remove-btn');
                const labelInput = row.querySelector('.ai-label');
                const promptInput = row.querySelector('.ai-prompt');
                // Hidden container for icon picker
                const iconContainer = document.createElement('div');
                iconContainer.style.display = 'none';
                iconContainer.style.position = 'relative';
                row.appendChild(iconContainer);
                const picker = new IconPicker(iconContainer, opt.icon || 'fas fa-magic', (icon) => {
                    opt.icon = icon;
                    iconBtn.innerHTML = `<i class="${icon}"></i>`;
                    iconContainer.style.display = 'none';
                });
                iconBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    // Toggle picker visibility
                    iconContainer.style.display = iconContainer.style.display === 'none' ? 'block' : 'none';
                });
                removeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    component.config.aiOptions.splice(index, 1);
                    renderAiOptions();
                });
                labelInput.addEventListener('input', () => {
                    opt.label = labelInput.value;
                });
                promptInput.addEventListener('input', () => {
                    opt.prompt = promptInput.value;
                });
            });
        };
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (component.config.aiOptions.length >= 10) {
                NotificationManager && NotificationManager.error && NotificationManager.error('Maximum of 10 AI options allowed');
                return;
            }
            component.config.aiOptions.push({ label: '', prompt: '', icon: 'fas fa-magic' });
            renderAiOptions();
        });
        renderAiOptions();
    }

    /**
     * Render custom properties UI for the data source component.  Allows
     * selection of a JSON file from the file system and specification of
     * how the data should be interpreted (auto, text, image, table).  If
     * fileSystem is available, the file dropdown is populated automatically;
     * otherwise users can manually enter the file identifier.
     */
    renderDataSourceProperties(container) {
        container.innerHTML = '';
        const form = document.createElement('div');
        form.className = 'config-form';
        form.innerHTML = `
            <div class="form-group">
                <label>Label</label>
                <input type="text" class="config-label" />
            </div>
            <div class="form-group">
                <label>Select File</label>
                <select class="config-fileId">
                    <option value="">-- Select file --</option>
                </select>
                <small style="font-size:11px; color: rgba(255,255,255,0.6); display:block; margin-top:4px;">If no files appear, enter the file ID manually below.</small>
            </div>
            <div class="form-group">
                <label>File ID (manual)</label>
                <input type="text" class="config-fileId-manual" placeholder="Enter file ID" />
            </div>
            <div class="form-group">
                <label>Data Type</label>
                <select class="config-dataType">
                    <option value="auto">Auto</option>
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                    <option value="table">Table</option>
                </select>
            </div>
        `;
        container.appendChild(form);
        // Populate file dropdown if fileSystem is available
        const fileSelect = form.querySelector('.config-fileId');
        const manualInput = form.querySelector('.config-fileId-manual');
        const populateFiles = () => {
            let files = [];
            try {
                if (typeof fileSystem !== 'undefined') {
                    if (typeof fileSystem.listFiles === 'function') {
                        files = fileSystem.listFiles();
                    } else if (typeof fileSystem.getFiles === 'function') {
                        files = fileSystem.getFiles();
                    } else if (Array.isArray(fileSystem.files)) {
                        files = fileSystem.files;
                    }
                }
            } catch (err) {
                console.warn('Failed to list files', err);
            }
            if (!Array.isArray(files) || files.length === 0) return;
            fileSelect.innerHTML = '<option value="">-- Select file --</option>';
            files.forEach(f => {
                const value = typeof f === 'string' ? f : (f.id || f.name || '');
                const name = typeof f === 'string' ? f : (f.name || f.label || value);
                const option = document.createElement('option');
                option.value = value;
                option.textContent = name;
                fileSelect.appendChild(option);
            });
        };
        populateFiles();
        // When file is selected from dropdown, update manual field to match
        fileSelect.addEventListener('change', () => {
            const val = fileSelect.value;
            if (val) {
                manualInput.value = val;
            }
        });
        // When manual field is changed, also update select if matches
        manualInput.addEventListener('input', () => {
            const val = manualInput.value;
            // Select matching option if exists
            const opt = Array.from(fileSelect.options).find(o => o.value === val);
            if (opt) {
                fileSelect.value = val;
            } else {
                fileSelect.value = '';
            }
            // Update config-fileId value on the form (config-fileId) hidden behind two elements
        });
        // Use populateConfig and attachConfigListeners to bind values
        this.populateConfig(container);
        this.attachConfigListeners(container);
        // We need custom binding for fileId because there are two inputs (dropdown + manual)
        const { component } = this.selectedComponentRef;
        // Set initial values: populate both fields from config
        const cfg = component.config;
        if (cfg.fileId) {
            fileSelect.value = cfg.fileId;
            manualInput.value = cfg.fileId;
        }
        // Listen for changes on both to update config
        fileSelect.addEventListener('change', () => {
            component.config.fileId = fileSelect.value;
            manualInput.value = fileSelect.value;
        });
        manualInput.addEventListener('change', () => {
            component.config.fileId = manualInput.value;
        });
    }

    /**
     * Render custom properties UI for the data transform component.  Allows
     * setting the label, selecting a target data type (text, table, image)
     * and specifying optional display text shown during runtime.  The
     * transformation is applied automatically at runtime when the user
     * continues past this step.
     */
    renderDataTransformProperties(container) {
        container.innerHTML = '';
        const form = document.createElement('div');
        form.className = 'config-form';
        form.innerHTML = `
            <div class="form-group">
                <label>Label</label>
                <input type="text" class="config-label" />
            </div>
            <div class="form-group">
                <label>Target Data Type</label>
                <select class="config-targetType">
                    <option value="text">Text</option>
                    <option value="table">Table</option>
                    <option value="image">Image</option>
                </select>
                <small style="font-size:11px; color: rgba(255,255,255,0.6); display:block; margin-top:2px;">Select the desired output format. Data will be converted heuristically.</small>
            </div>
            <div class="form-group">
                <label>Display Text</label>
                <textarea rows="3" class="config-displayText" placeholder="Optional text to display during transformation"></textarea>
                <small style="font-size:11px; color: rgba(255,255,255,0.6); display:block; margin-top:2px;">This text will be shown to the user while the transformation occurs.</small>
            </div>
        `;
        container.appendChild(form);
        // Bind values to config
        this.populateConfig(container);
        this.attachConfigListeners(container);
        // Populate additional user‑defined types from files app
        const select = form.querySelector('.config-targetType');
        if (select) {
            const builtIn = new Set(['text', 'table', 'image']);
            const addOption = (typeName) => {
                if (!typeName || builtIn.has(typeName)) return;
                // Avoid duplicates
                if (Array.from(select.options).some(opt => opt.value === typeName)) return;
                const opt = document.createElement('option');
                opt.value = typeName;
                opt.textContent = typeName.charAt(0).toUpperCase() + typeName.slice(1);
                select.appendChild(opt);
            };
            try {
                let files = [];
                if (typeof fileSystem !== 'undefined') {
                    if (typeof fileSystem.listFiles === 'function') {
                        files = fileSystem.listFiles();
                    } else if (typeof fileSystem.getFiles === 'function') {
                        files = fileSystem.getFiles();
                    } else if (Array.isArray(fileSystem.files)) {
                        files = fileSystem.files;
                    }
                }
                files.forEach(f => {
                    let content;
                    let id;
                    if (typeof f === 'string') {
                        id = f;
                    } else {
                        id = f.id || f.name;
                    }
                    // Read file content
                    try {
                        if (typeof fileSystem.readFile === 'function') {
                            content = fileSystem.readFile(id);
                        } else if (typeof fileSystem.getFileContent === 'function') {
                            content = fileSystem.getFileContent(id);
                        } else if (typeof fileSystem.getFile === 'function') {
                            const fileObj = fileSystem.getFile(id);
                            content = fileObj ? (fileObj.content || fileObj.data || fileObj.body) : null;
                        }
                        if (content && typeof content === 'string') {
                            try {
                                const json = JSON.parse(content);
                                if (json && typeof json.type === 'string') {
                                    addOption(json.type);
                                }
                            } catch {}
                        } else if (content && typeof content === 'object' && typeof content.type === 'string') {
                            addOption(content.type);
                        }
                    } catch {}
                });
            } catch (err) {
                console.warn('Failed to populate user types', err);
            }
        }
    }

    /**
     * Render custom properties UI for the AI prompt component.  Allows
     * editing of the label, system prompt, target model and optional
     * display text for the end user.  Uses existing form-group styling
     * for consistency.  After building the form the existing populateConfig
     * and attachConfigListeners are invoked to bind values.
     */
    renderAiPromptProperties(container) {
        container.innerHTML = '';
        const form = document.createElement('div');
        form.className = 'config-form';
        form.innerHTML = `
            <div class="form-group">
                <label>Label</label>
                <input type="text" class="config-label" />
            </div>
            <div class="form-group">
                <label>System Prompt</label>
                <textarea rows="4" class="config-prompt" placeholder="Enter system prompt..."></textarea>
            </div>
            <div class="form-group">
                <label>Model</label>
                <select class="config-model">
                    <option value="gpt-3.5">gpt-3.5</option>
                    <option value="gpt-4">gpt-4</option>
                    <option value="custom">Custom (enter manually)</option>
                </select>
                <input type="text" class="config-model-custom" placeholder="Custom model name" style="display:none; margin-top:4px;" />
            </div>
            <div class="form-group">
                <label>Display Text (shown to user)</label>
                <textarea rows="3" class="config-displayText" placeholder="Optional text to display during this step..."></textarea>
            </div>
        `;
        container.appendChild(form);
        // Show/hide custom model input based on selection
        const modelSelect = form.querySelector('.config-model');
        const modelCustom = form.querySelector('.config-model-custom');
        const updateModelVisibility = () => {
            if (modelSelect.value === 'custom') {
                modelCustom.style.display = 'block';
                // When entering custom model, update config-model
            } else {
                modelCustom.style.display = 'none';
            }
        };
        modelSelect.addEventListener('change', () => {
            updateModelVisibility();
            const { component } = this.selectedComponentRef;
            if (modelSelect.value === 'custom') {
                // Use custom field value
                component.config.model = modelCustom.value || '';
            } else {
                component.config.model = modelSelect.value;
            }
        });
        modelCustom.addEventListener('input', () => {
            const { component } = this.selectedComponentRef;
            if (modelSelect.value === 'custom') {
                component.config.model = modelCustom.value;
            }
        });
        // Populate form values from config and attach default listeners
        this.populateConfig(container);
        this.attachConfigListeners(container);
        // After populating config, adjust model input for custom values
        const { component } = this.selectedComponentRef;
        // If the config.model is not one of the predefined options, treat it as custom
        if (component.config.model && !['gpt-3.5','gpt-4'].includes(component.config.model)) {
            modelSelect.value = 'custom';
            modelCustom.style.display = 'block';
            modelCustom.value = component.config.model;
        } else {
            modelSelect.value = component.config.model || 'gpt-3.5';
            modelCustom.style.display = 'none';
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