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
        this.processingTypes = ['ai-prompt', 'data-transform', 'custom-buttons'];
        this.outputTypes = ['display', 'summary-output', 'chart', 'export'];
        this.init();

        // Cache of user-defined data types extracted from files app.
        // This improves performance by avoiding repeated scans of the
        // file system when rendering the Data Transform panel.  The
        // signature tracks the list of files to detect changes.
        this.cachedUserTypes = null;
        this.cachedFileListSignature = '';
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
        // Inject new processing and output component items for custom buttons and summary output
        this.injectCustomButtonsComponentItem();
        this.injectSummaryOutputComponentItem();
        // After injecting sidebar items, normalize their labels for consistent casing
        this.normalizeSidebarItems();
        // Ensure at least one module exists
        if (this.modules.length === 0) {
            this.addModule();
        }
    }

    /**
     * Show a custom input modal to prompt the user for a module name.  This
     * replaces the native browser prompt and uses the app's styling for a
     * cohesive appearance.  Returns a promise that resolves to the string
     * entered or null if the user cancelled.  The modal is inserted into
     * the DOM and removed after completion.
     *
     * @param {string} defaultName The initial value for the input field
     */
    promptModuleName(defaultName = '') {
        return new Promise((resolve) => {
            // Create overlay and modal container
            const overlay = document.createElement('div');
            overlay.className = 'custom-modal-overlay';
            overlay.innerHTML = `
                <div class="custom-modal">
                    <h3 style="margin:0 0 12px 0; font-size:18px;">Edit Module Name</h3>
                    <input type="text" class="custom-modal-input" value="${defaultName.replace(/"/g, '&quot;')}" />
                    <div class="custom-modal-actions">
                        <button class="btn-secondary custom-modal-cancel">Cancel</button>
                        <button class="btn-primary custom-modal-confirm">Save</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            const input = overlay.querySelector('.custom-modal-input');
            const confirmBtn = overlay.querySelector('.custom-modal-confirm');
            const cancelBtn = overlay.querySelector('.custom-modal-cancel');
            // Focus input on open
            setTimeout(() => { input.focus(); input.select(); }, 50);
            const cleanup = () => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            };
            confirmBtn.addEventListener('click', () => {
                const val = input.value.trim();
                cleanup();
                resolve(val || null);
            });
            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(null);
            });
            // Close on overlay click outside modal
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(null);
                }
            });
        });
    }

    /**
     * Move a module from one index to another.  Updates the modules
     * array, selectedModuleIndex and re-renders the module list and
     * workflow.  Attempts to move outside the bounds are ignored.
     *
     * @param {number} from Index of the module to move
     * @param {number} to Desired index after move
     */
    moveModule(from, to) {
        if (from === to) return;
        if (from < 0 || from >= this.modules.length) return;
        if (to < 0 || to >= this.modules.length) return;
        const [mod] = this.modules.splice(from, 1);
        this.modules.splice(to, 0, mod);
        // Adjust selected module index
        if (this.selectedModuleIndex === from) {
            this.selectedModuleIndex = to;
        } else if (this.selectedModuleIndex > from && this.selectedModuleIndex <= to) {
            this.selectedModuleIndex -= 1;
        } else if (this.selectedModuleIndex < from && this.selectedModuleIndex >= to) {
            this.selectedModuleIndex += 1;
        }
        // Re-render modules and workflow to reflect new order
        this.renderModules();
        this.renderWorkflow();
    }

    /**
     * Load an existing app definition into the builder.  This resets
     * the current modules to those defined in the provided definition
     * and re-renders the module list and workflow.  Useful for
     * editing previously created apps.  The definition should follow
     * the same structure used when saving (i.e. containing a modules
     * array with components and their configs).
     *
     * @param {Object} def The app definition object to load
     */
    loadAppDefinition(def) {
        if (!def || !Array.isArray(def.modules)) return;
        // Deep clone modules and components to avoid mutating the
        // original definition.  Assign new ids where missing.
        const cloneModule = (mod) => {
            return {
                id: mod.id || crypto.randomUUID(),
                name: mod.name || 'Module',
                components: (mod.components || []).map(comp => {
                    return {
                        id: comp.id || crypto.randomUUID(),
                        type: comp.type,
                        config: JSON.parse(JSON.stringify(comp.config || {}))
                    };
                })
            };
        };
        this.modules = def.modules.map(cloneModule);
        this.selectedModuleIndex = 0;
        this.selectedComponentRef = null;
        this.renderModules();
        this.renderWorkflow();
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
        
        // Find the input components container
        const inputCategory = this.windowEl.querySelector('.component-category');
        if (!inputCategory) return;
        
        const item = document.createElement('div');
        item.className = 'component-item';
        item.setAttribute('draggable', 'true');
        item.dataset.type = 'table';
        
        // Proper icon + text structure
        item.innerHTML = `
        <span class="component-icon">
            <i class="fas fa-table"></i>
        </span>
        <span>Table</span>
    `;
        
        inputCategory.appendChild(item);
        this.attachComponentEvents(item);
    }

    /**
     * Insert a new component item for the data source input with proper structure.
     */
    injectDataSourceComponentItem() {
        if (this.windowEl.querySelector('.component-item[data-type="data-source"]')) {
            return;
        }
        
        const inputCategory = this.windowEl.querySelector('.component-category');
        if (!inputCategory) return;
        
        const item = document.createElement('div');
        item.className = 'component-item';
        item.setAttribute('draggable', 'true');
        item.dataset.type = 'data-source';
        
        item.innerHTML = `
        <span class="component-icon">
            <i class="fas fa-database"></i>
        </span>
        <span>Data Source</span>
    `;
        
        inputCategory.appendChild(item);
        this.attachComponentEvents(item);
    }

    /**
     * Insert custom buttons component into processing category.
     */
    injectCustomButtonsComponentItem() {
        if (this.windowEl.querySelector('.component-item[data-type="custom-buttons"]')) {
            return;
        }
        
        // Find processing category
        const categories = this.windowEl.querySelectorAll('.component-category');
        let processingCategory = null;
        categories.forEach(cat => {
            const header = cat.querySelector('h4');
            if (header && header.textContent.trim() === 'Processing') {
                processingCategory = cat;
            }
        });
        
        if (!processingCategory) return;
        
        const item = document.createElement('div');
        item.className = 'component-item';
        item.setAttribute('draggable', 'true');
        item.dataset.type = 'custom-buttons';
        
        item.innerHTML = `
            <span class="component-icon">
                <i class="fas fa-th-list"></i>
            </span>
            <span>Custom Buttons</span>
        `;
        
        processingCategory.appendChild(item);
        this.attachComponentEvents(item);
    }

    /**
     * Insert summary output component into output category.
     */
    injectSummaryOutputComponentItem() {
        if (this.windowEl.querySelector('.component-item[data-type="summary-output"]')) {
            return;
        }
        
        // Find output category
        const categories = this.windowEl.querySelectorAll('.component-category');
        let outputCategory = null;
        categories.forEach(cat => {
            const header = cat.querySelector('h4');
            if (header && header.textContent.trim() === 'Output Components') {
                outputCategory = cat;
            }
        });
        
        if (!outputCategory) return;
        
        const item = document.createElement('div');
        item.className = 'component-item';
        item.setAttribute('draggable', 'true');
        item.dataset.type = 'summary-output';
        
        item.innerHTML = `
            <span class="component-icon">
                <i class="fas fa-info-circle"></i>
            </span>
            <span>Summary Output</span>
        `;
        
        outputCategory.appendChild(item);
        this.attachComponentEvents(item);
    }

    /**
     * Helper method to attach drag events to component items
     */
    attachComponentEvents(item) {
        const type = item.dataset.type;
        
        // Define icon mappings
        const iconMap = {
            'text-input': 'fas fa-keyboard',
            'file-upload': 'fas fa-upload',
            'canvas': 'fas fa-paint-brush',
            'rich-text': 'fas fa-file-alt',
            'table': 'fas fa-table',
            'data-source': 'fas fa-database',
            'ai-prompt': 'fas fa-robot',
            'data-transform': 'fas fa-exchange-alt',
            'custom-buttons': 'fas fa-th-list',
            'display': 'fas fa-tv',
            'summary-output': 'fas fa-info-circle',
            'chart': 'fas fa-chart-bar',
            'export': 'fas fa-download'
        };
        
        const labelMap = {
            'text-input': 'Text Input',
            'file-upload': 'File Upload', 
            'canvas': 'Drawing Canvas',
            'rich-text': 'Rich Text Editor',
            'table': 'Table',
            'data-source': 'Data Source',
            'ai-prompt': 'AI Prompt',
            'data-transform': 'Data Transform',
            'custom-buttons': 'Custom Buttons',
            'display': 'Display Output',
            'summary-output': 'Summary Output',
            'chart': 'Chart',
            'export': 'Export Data'
        };
        
        const iconClass = iconMap[type] || 'fas fa-cube';
        const labelText = labelMap[type] || type;
        
        // Ensure proper structure
        item.innerHTML = `
            <span class="component-icon">
                <i class="${iconClass}"></i>
            </span>
            <span>${labelText}</span>
        `;
        
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('component-type', item.dataset.type);
            item.classList.add('dragging');
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });
    }

    /**
     * Normalize all component items to ensure consistent structure
     */
    normalizeSidebarItems() {
        const items = this.windowEl.querySelectorAll('.component-item');
        items.forEach(item => {
            const type = item.dataset.type;
            if (!type) return;
            
            // Define icon mappings
            const iconMap = {
                'text-input': 'fas fa-keyboard',
                'file-upload': 'fas fa-upload',
                'canvas': 'fas fa-paint-brush',
                'rich-text': 'fas fa-file-alt',
                'table': 'fas fa-table',
                'data-source': 'fas fa-database',
                'ai-prompt': 'fas fa-robot',
                'data-transform': 'fas fa-exchange-alt',
                'custom-buttons': 'fas fa-th-list',
                'display': 'fas fa-tv',
                'summary-output': 'fas fa-info-circle',
                'chart': 'fas fa-chart-bar',
                'export': 'fas fa-download'
            };
            
            // Define label mappings
            const labelMap = {
                'text-input': 'Text Input',
                'file-upload': 'File Upload',
                'canvas': 'Drawing Canvas',
                'rich-text': 'Rich Text Editor',
                'table': 'Table',
                'data-source': 'Data Source',
                'ai-prompt': 'AI Prompt',
                'data-transform': 'Data Transform',
                'custom-buttons': 'Custom Buttons',
                'display': 'Display Output',
                'summary-output': 'Summary Output',
                'chart': 'Chart',
                'export': 'Export Data'
            };
            
            const iconClass = iconMap[type] || 'fas fa-cube';
            const labelText = labelMap[type] || type;
            
            // Always rebuild with proper structure to ensure consistency
            item.innerHTML = `
                <span class="component-icon">
                    <i class="${iconClass}"></i>
                </span>
                <span>${labelText}</span>
            `;
            
            // Ensure draggable attributes are set
            item.setAttribute('draggable', 'true');
            
            // Re-attach drag events if needed
            if (!item.hasAttribute('data-events-attached')) {
                item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('component-type', type);
                    item.classList.add('dragging');
                });
                
                item.addEventListener('dragend', () => {
                    item.classList.remove('dragging');
                });
                
                item.setAttribute('data-events-attached', 'true');
            }
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
     * Insert a new component item for the custom buttons processing component
     * into the processing components list.  It clones an existing
     * processing component item (e.g. AI Prompt) to maintain styling.  If
     * a custom-buttons item already exists, this method does nothing.
     */
    injectCustomButtonsComponentItem() {
        // Check if item already exists
        if (this.windowEl.querySelector('.component-item[data-type="custom-buttons"]')) {
            return;
        }
        // Find a reference processing component (AI prompt) to clone styles
        const reference = this.windowEl.querySelector('.component-item[data-type="ai-prompt"]');
        if (!reference) return;
        const parent = reference.parentElement;
        if (!parent) return;
        const item = document.createElement('div');
        item.className = reference.className;
        item.setAttribute('draggable', 'true');
        item.dataset.type = 'custom-buttons';
        // Use a generic icon for custom actions
        // Label uses Title Case to match other components
        item.innerHTML = `<i class="fas fa-th-list" style="margin-right:8px;"></i><span>Custom Buttons</span>`;
        parent.appendChild(item);
        // Attach drag events
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('component-type', 'custom-buttons');
            item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });
    }

    /**
     * Insert a new component item for the summary output component into
     * the output components list.  It clones an existing output component
     * item (display) to maintain styling.  If a summary-output item
     * already exists, this method does nothing.
     */
    injectSummaryOutputComponentItem() {
        if (this.windowEl.querySelector('.component-item[data-type="summary-output"]')) {
            return;
        }
        // Find reference output component (display) to clone
        const reference = this.windowEl.querySelector('.component-item[data-type="display"]');
        if (!reference) return;
        const parent = reference.parentElement;
        if (!parent) return;
        const item = document.createElement('div');
        item.className = reference.className;
        item.setAttribute('draggable', 'true');
        item.dataset.type = 'summary-output';
        // Use a descriptive label to match casing of other components
        item.innerHTML = `<i class="fas fa-info-circle" style="margin-right:8px;"></i><span>Summary Output</span>`;
        parent.appendChild(item);
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('component-type', 'summary-output');
            item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });
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
            'display': {
                label: 'Output Display',
                // Optional text to display to the user during this step
                displayText: '',
                // Target component id for in‑place output.  Leave empty to show output in its own area.
                targetComponentId: ''
            },
            // Custom button processing component allows the creator to
            // define multiple buttons, each with its own label, icon
            // and JavaScript expression to transform the previous value.
            'custom-buttons': {
                label: 'Buttons',
                // List of button definitions { label, icon, code }
                buttons: [],
                // Optional text to display to the user above the buttons
                displayText: ''
            },
            // Summary output displays a concise summary of the previous
            // value.  The summaryType determines the heuristic used to
            // generate the summary.  displayText is optional text
            // shown to the user and targetComponentId allows in‑place
            // updating of another component.
            'summary-output': {
                label: 'Summary',
                summaryType: 'auto',
                displayText: '',
                targetComponentId: ''
            },
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
                    <button class="module-option-up" title="Move Up">↑</button>
                    <button class="module-option-down" title="Move Down">↓</button>
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
            // Move module up
            const upBtn = option.querySelector('.module-option-up');
            if (upBtn) {
                upBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.moveModule(index, index - 1);
                });
                // Hide up button for the first module
                if (index === 0) {
                    upBtn.style.visibility = 'hidden';
                } else {
                    upBtn.style.visibility = 'visible';
                }
            }
            // Move module down
            const downBtn = option.querySelector('.module-option-down');
            if (downBtn) {
                downBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.moveModule(index, index + 1);
                });
                // Hide down button for the last module
                if (index === this.modules.length - 1) {
                    downBtn.style.visibility = 'hidden';
                } else {
                    downBtn.style.visibility = 'visible';
                }
            }
            // Rename module using custom input modal
            const editBtn = option.querySelector('.module-option-edit');
            if (editBtn) {
                editBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const newName = await this.promptModuleName(module.name);
                    if (newName && newName.trim()) {
                        module.name = newName.trim();
                        this.renderModules();
                    }
                });
            }
            // Delete module
            const deleteBtn = option.querySelector('.module-option-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const confirmed = await modalManager.confirm(`Remove ${module.name}?`, 'Remove Module');
                    if (confirmed) {
                        this.removeModule(module.id);
                        menu.classList.add('hide');
                    }
                });
            }
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
            , 'custom-buttons': 'Custom Buttons'
            , 'summary-output': 'Summary Output'
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
        // Provide a custom property editor for custom buttons processing components
        if (component.type === 'custom-buttons') {
            this.renderCustomButtonsProperties(container);
            return;
        }
        // Provide a custom property editor for summary output components
        if (component.type === 'summary-output') {
            this.renderSummaryOutputProperties(container);
            return;
        }

        // Provide a custom property editor for display output components
        if (component.type === 'display') {
            this.renderDisplayProperties(container);
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
            <div class="form-group checkbox-group">
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
            <div class="form-group checkbox-group">
                <label>Allow Import</label>
                <input type="checkbox" class="config-allowImport" />
            </div>
            <div class="form-group checkbox-group">
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
            <div class="form-group checkbox-group">
                <label>Allow Multiple</label>
                <input type="checkbox" class="config-multiple" />
            </div>
            <div class="form-group checkbox-group">
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
            <div class="form-group checkbox-group">
                <label>Editable</label>
                <input type="checkbox" class="config-editable" />
            </div>
            <div class="form-group checkbox-group">
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
            <div class="form-group checkbox-group">
                <label>Show Taskbar</label>
                <input type="checkbox" class="config-showTaskbar" />
            </div>
            <div class="form-group">
                <label>AI Options</label>
                <div id="ai-options-list" style="margin-top:4px;"></div>
                <button type="button" id="add-ai-option" class="btn-secondary" style="margin-top:6px;">+ Add AI Option</button>
                <small style="font-size:11px; color: rgba(255,255,255,0.6); display:block; margin-top:2px;">Configure up to 10 AI actions. Each action includes a button label, a system prompt and an icon.</small>
            </div>
            <div class="form-group checkbox-group">
                <label>Show Fill Tool</label>
                <input type="checkbox" class="config-showFill" />
            </div>
            <div class="form-group checkbox-group">
                <label>Show Erase Tool</label>
                <input type="checkbox" class="config-showErase" />
            </div>
            <!-- Data source controls -->
            <div class="form-group checkbox-group">
                <label>Allow Import</label>
                <input type="checkbox" class="config-allowImport" />
            </div>
            <div class="form-group checkbox-group">
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
            <div class="form-group checkbox-group">
                <label>Editable</label>
                <input type="checkbox" class="config-editable" />
            </div>
            <div class="form-group checkbox-group">
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
            <div class="form-group checkbox-group">
                <label>Allow Import</label>
                <input type="checkbox" class="config-allowImport" />
            </div>
            <div class="form-group checkbox-group">
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
            <div class="form-group checkbox-group">
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
            <div class="form-group checkbox-group">
                <label>Allow Import</label>
                <input type="checkbox" class="config-allowImport" />
            </div>
            <div class="form-group checkbox-group">
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
        // Populate additional user‑defined types using a cached list from the files app.
        const select = form.querySelector('.config-targetType');
        if (select) {
            const builtIn = new Set(['text', 'table', 'image']);
            const addOption = (typeName) => {
                if (!typeName || builtIn.has(typeName)) return;
                if (Array.from(select.options).some(opt => opt.value === typeName)) return;
                const opt = document.createElement('option');
                opt.value = typeName;
                opt.textContent = typeName.charAt(0).toUpperCase() + typeName.slice(1);
                select.appendChild(opt);
            };
            try {
                const types = this.fetchUserTypes();
                types.forEach(t => addOption(t));
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
     * Render custom properties UI for the display output component.  This
     * includes fields for label, optional display text shown to the user
     * during the step, and a dropdown to select a target component within
     * the current module.  If a target is selected, the runtime will
     * insert the output into that component instead of showing it in a
     * separate area.  After building the form, populateConfig and
     * attachConfigListeners are invoked to bind config values and
     * listeners.  The target component list is constructed dynamically
     * from the current module's components and includes only those
     * components capable of displaying data (text inputs, rich text,
     * canvas and table).
     */
    renderDisplayProperties(container) {
        container.innerHTML = '';
        const form = document.createElement('div');
        form.className = 'config-form';
        form.innerHTML = `
            <div class="form-group">
                <label>Label</label>
                <input type="text" class="config-label" />
            </div>
            <div class="form-group">
                <label>Display Text</label>
                <textarea rows="3" class="config-displayText" placeholder="Optional text to display during this step..."></textarea>
                <small style="font-size:11px; color: rgba(255,255,255,0.6); display:block; margin-top:2px;">This text is shown to the user when this step is reached.</small>
            </div>
            <div class="form-group">
                <label>Target Component</label>
                <select class="config-targetComponentId">
                    <option value="">-- Show in New Section --</option>
                </select>
                <small style="font-size:11px; color: rgba(255,255,255,0.6); display:block; margin-top:2px;">Choose an existing component to display the output in-place.</small>
            </div>
        `;
        container.appendChild(form);
        // Bind base config fields
        this.populateConfig(container);
        this.attachConfigListeners(container);
        // Populate the target component dropdown with eligible components
        const select = form.querySelector('.config-targetComponentId');
        if (select) {
            const module = this.modules[this.selectedModuleIndex];
            if (module && Array.isArray(module.components)) {
                module.components.forEach((comp) => {
                    const type = comp.type;
                    if (['text-input','rich-text','canvas','table'].includes(type)) {
                        const opt = document.createElement('option');
                        opt.value = comp.id;
                        const lbl = (comp.config && comp.config.label) ? comp.config.label : this.getComponentLabel(comp);
                        opt.textContent = `${lbl}`;
                        select.appendChild(opt);
                    }
                });
            }
        }
    }

    /**
     * Render custom properties UI for the custom buttons processing component.
     * Allows editing the label, an optional display text, and adding up to
     * 10 button definitions.  Each button has a label, icon class and
     * JavaScript code to transform the previous value.  The code should
     * return a new value when executed.  Buttons can be added and
     * removed dynamically.  This form mirrors the style of other
     * components and uses populateConfig/attachConfigListeners for
     * base fields.  Button definitions are stored directly on
     * component.config.buttons.
     */
    renderCustomButtonsProperties(container) {
        container.innerHTML = '';
        const form = document.createElement('div');
        form.className = 'config-form';
        form.innerHTML = `
            <div class="form-group">
                <label>Label</label>
                <input type="text" class="config-label" />
            </div>
            <div class="form-group">
                <label>Display Text</label>
                <textarea rows="3" class="config-displayText" placeholder="Optional text to display above the buttons..."></textarea>
            </div>
            <div class="form-group">
                <label>Buttons</label>
                <div id="custom-btns-list" style="display:flex; flex-direction:column; gap:8px;"></div>
                <button type="button" id="add-custom-btn" class="btn-secondary" style="margin-top:6px;">Add Button</button>
                <small style="font-size:11px; color: rgba(255,255,255,0.6); display:block; margin-top:2px;">Define up to 10 buttons.  Each button's code is executed with <code>prevValue</code> as input and should return a new value.</small>
            </div>
        `;
        container.appendChild(form);
        // Populate base fields from config and attach listeners
        this.populateConfig(container);
        this.attachConfigListeners(container);
        const listEl = form.querySelector('#custom-btns-list');
        const addBtnEl = form.querySelector('#add-custom-btn');
        const { component } = this.selectedComponentRef;
        const cfg = component.config;
        if (!Array.isArray(cfg.buttons)) {
            cfg.buttons = [];
        }
        // Function to rebuild the buttons list UI
        const refreshList = () => {
            listEl.innerHTML = '';
            cfg.buttons.forEach((btn, index) => {
                const row = document.createElement('div');
                row.className = 'custom-btn-row';
                row.style.display = 'flex';
                row.style.gap = '8px';
                row.style.alignItems = 'flex-start';
                row.innerHTML = `
                    <input type="text" placeholder="Label" class="btn-label" style="flex:1; padding:4px;" />
                    <input type="text" placeholder="Icon class" class="btn-icon" style="flex:1; padding:4px;" />
                    <textarea rows="2" placeholder="JavaScript code" class="btn-code" style="flex:2; padding:4px;"></textarea>
                    <button type="button" class="btn-remove" title="Remove">×</button>
                `;
                listEl.appendChild(row);
                const labelInput = row.querySelector('.btn-label');
                const iconInput = row.querySelector('.btn-icon');
                const codeInput = row.querySelector('.btn-code');
                const removeBtn = row.querySelector('.btn-remove');
                labelInput.value = btn.label || '';
                iconInput.value = btn.icon || '';
                codeInput.value = btn.code || '';
                labelInput.addEventListener('input', () => {
                    cfg.buttons[index].label = labelInput.value;
                });
                iconInput.addEventListener('input', () => {
                    cfg.buttons[index].icon = iconInput.value;
                });
                codeInput.addEventListener('input', () => {
                    cfg.buttons[index].code = codeInput.value;
                });
                removeBtn.addEventListener('click', () => {
                    cfg.buttons.splice(index, 1);
                    refreshList();
                });
            });
        };
        addBtnEl.addEventListener('click', () => {
            if (cfg.buttons.length >= 10) {
                alert('Maximum of 10 buttons allowed');
                return;
            }
            cfg.buttons.push({ label: 'Button', icon: '', code: '' });
            refreshList();
        });
        // Initial render
        refreshList();
    }

    /**
     * Render custom properties UI for the summary output component.  Allows
     * editing of the label, an optional display text, selecting the
     * summary type (auto, text, table, image) and choosing an
     * optional target component for in‑place display.  Uses existing
     * styles for consistency.  After building the form populateConfig
     * and attachConfigListeners are invoked to bind values.
     */
    renderSummaryOutputProperties(container) {
        container.innerHTML = '';
        const form = document.createElement('div');
        form.className = 'config-form';
        form.innerHTML = `
            <div class="form-group">
                <label>Label</label>
                <input type="text" class="config-label" />
            </div>
            <div class="form-group">
                <label>Display Text</label>
                <textarea rows="3" class="config-displayText" placeholder="Optional text to display during this step..."></textarea>
            </div>
            <div class="form-group">
                <label>Summary Type</label>
                <select class="config-summaryType">
                    <option value="auto">Auto</option>
                    <option value="text">Text</option>
                    <option value="table">Table</option>
                    <option value="image">Image</option>
                </select>
            </div>
            <div class="form-group">
                <label>Target Component</label>
                <select class="config-targetComponentId">
                    <option value="">-- Show in New Section --</option>
                </select>
                <small style="font-size:11px; color: rgba(255,255,255,0.6); display:block; margin-top:2px;">Choose an existing component to display the summary in-place.</small>
            </div>
        `;
        container.appendChild(form);
        // Populate base fields
        this.populateConfig(container);
        this.attachConfigListeners(container);
        // Populate target options
        const select = form.querySelector('.config-targetComponentId');
        if (select) {
            const module = this.modules[this.selectedModuleIndex];
            if (module && Array.isArray(module.components)) {
                module.components.forEach((comp) => {
                    const type = comp.type;
                    if (['text-input','rich-text','canvas','table'].includes(type)) {
                        const opt = document.createElement('option');
                        opt.value = comp.id;
                        const lbl = (comp.config && comp.config.label) ? comp.config.label : this.getComponentLabel(comp);
                        opt.textContent = `${lbl}`;
                        select.appendChild(opt);
                    }
                });
            }
        }
    }

    /**
     * Retrieve the list of custom type strings defined in JSON files.
     * This method reads the file system only when necessary and caches
     * the results along with a simple signature of the file list.  If
     * the signature has not changed, the cached list is returned to
     * improve performance when the Data Transform panel is opened
     * repeatedly.
     *
     * @returns {string[]} array of custom type names
     */
    fetchUserTypes() {
        const builtIn = new Set(['text', 'table', 'image']);
        // Helper to compute a simple signature for file list
        const computeSignature = (list) => {
            if (!Array.isArray(list)) return '';
            return list.map(f => (typeof f === 'string' ? f : (f.id || f.name || ''))).sort().join('|');
        };
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
        } catch {
            files = [];
        }
        const signature = computeSignature(files);
        if (this.cachedUserTypes && this.cachedFileListSignature === signature) {
            return this.cachedUserTypes.slice();
        }
        const types = [];
        const addType = (t) => {
            if (!t || builtIn.has(t)) return;
            if (!types.includes(t)) types.push(t);
        };
        files.forEach((f) => {
            let id;
            if (typeof f === 'string') {
                id = f;
            } else {
                id = f.id || f.name;
            }
            try {
                let content;
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
                            addType(json.type);
                        }
                    } catch {}
                } else if (content && typeof content === 'object' && typeof content.type === 'string') {
                    addType(content.type);
                }
            } catch {}
        });
        this.cachedUserTypes = types;
        this.cachedFileListSignature = signature;
        return types.slice();
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
            if (!container) {
        console.warn('Workflow container not found');
            return;
        }
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