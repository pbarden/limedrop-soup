// Extended App Runtime for executing user apps with modules
//
// The AppRuntime class is responsible for rendering an application created
// in the AppBuilder and driving the user through each step.  The original
// implementation supported a single list of components.  This version adds
// support for applications composed of multiple modules, each containing its
// own ordered set of components.  At run time the modules are flattened
// into a single sequence while still tracking module and step boundaries to
// provide contextual progress information.

class AppRuntime {
    constructor(appDefinition, container) {
        this.app = appDefinition;
        this.container = container;
        // Internal state captured from user input keyed by component id
        this.state = {};
        // Flatten modules into a sequence of {moduleIndex, component, componentIndex}
        this.sequence = [];
        if (Array.isArray(this.app.modules) && this.app.modules.length > 0) {
            this.app.modules.forEach((mod, moduleIndex) => {
                mod.components.forEach((component, componentIndex) => {
                    this.sequence.push({ moduleIndex, component, componentIndex });
                });
            });
        } else if (Array.isArray(this.app.components)) {
            // Fallback for legacy apps with no modules defined
            this.app.components.forEach((component, idx) => {
                this.sequence.push({ moduleIndex: 0, component: component, componentIndex: idx });
            });
        }
        this.currentIndex = 0;
    }

    /**
     * Render the runtime UI and the first step.
     */
    render() {
        // Build the shell
        this.container.innerHTML = `
            <div class="app-runtime">
                <div class="runtime-header">
                    <h3>${this.app.name}</h3>
                    <div class="runtime-progress"></div>
                </div>
                <div class="runtime-body">
                    <div class="runtime-content" id="runtime-content"></div>
                    <div class="runtime-controls">
                        <button class="btn-secondary" id="runtime-back">Back</button>
                        <button class="btn-primary" id="runtime-next">Next</button>
                    </div>
                </div>
            </div>
        `;
        this.attachEvents();
        this.renderCurrentStep();
    }

    /**
     * Wire up the Back and Next buttons.  Handlers update the current
     * sequence index and re-render the content.
     */
    attachEvents() {
        const backBtn = this.container.querySelector('#runtime-back');
        const nextBtn = this.container.querySelector('#runtime-next');
        backBtn.addEventListener('click', () => this.previousStep());
        nextBtn.addEventListener('click', () => this.nextStep());
    }

    /**
     * Render the content for the current step or show a completion message
     * when all steps have been executed.
     */
    renderCurrentStep() {
        const content = this.container.querySelector('#runtime-content');
        if (!content) return;
        if (this.currentIndex >= this.sequence.length) {
            content.innerHTML = '<p>App completed!</p>';
            // Disable controls on completion
            this.updateControlsState(true);
            // Clear progress text
            const progress = this.container.querySelector('.runtime-progress');
            if (progress) progress.textContent = '';
            return;
        }
        const entry = this.sequence[this.currentIndex];
        const { moduleIndex, component, componentIndex } = entry;
        content.innerHTML = this.renderComponent(component);
        // After rendering, perform component-specific setup.  Some
        // components require dynamic UI such as file selection or canvas
        // drawing.  We call helper methods here to attach listeners and
        // populate options.
        if (component.type === 'file-upload') {
            this.setupFileUpload(component);
        } else if (component.type === 'canvas') {
            this.setupCanvas(component);
        } else if (component.type === 'text-input') {
            this.setupTextInput(component);
        } else if (component.type === 'rich-text') {
            this.setupRichTextEditor(component);
        } else if (component.type === 'table') {
            this.setupTable(component);
        }
        // Update back and next button state and labels
        this.updateControlsState(false);
        const backBtn = this.container.querySelector('#runtime-back');
        const nextBtn = this.container.querySelector('#runtime-next');
        backBtn.disabled = this.currentIndex === 0;
        nextBtn.textContent = this.currentIndex === this.sequence.length - 1 ? 'Finish' : 'Next';
        // Update progress display
        const progress = this.container.querySelector('.runtime-progress');
        if (progress) {
            const module = this.app.modules ? this.app.modules[moduleIndex] : { name: 'Module', components: this.app.components };
            const totalStepsInModule = module && module.components ? module.components.length : this.sequence.length;
            progress.textContent = `Module ${moduleIndex + 1} • Step ${componentIndex + 1} of ${totalStepsInModule}`;
        }
    }

    /**
     * Helper to enable/disable navigation controls.  When completed both
     * buttons are disabled.  Otherwise the handlers for Back and Next are
     * managed in renderCurrentStep().
     */
    updateControlsState(disabled) {
        const backBtn = this.container.querySelector('#runtime-back');
        const nextBtn = this.container.querySelector('#runtime-next');
        backBtn.disabled = disabled || this.currentIndex === 0;
        nextBtn.disabled = disabled;
    }

    /**
     * Render an individual component into an HTML string.  Each case
     * corresponds to a component type defined in the builder.  The
     * continue/call‑to‑action button calls `completeCurrentStep()` to capture
     * data and advance the sequence.  Additional component types can be
     * integrated here with minimal effort.
     */
    renderComponent(component) {
        switch (component.type) {
            case 'text-input': {
                // Build a robust text input with validation based on config
                const cfg = component.config || {};
                const type = cfg.inputType || 'text';
                const placeholder = cfg.placeholder || '';
                const requiredAttr = cfg.required ? 'required' : '';
                const minAttr = cfg.minLength && cfg.minLength > 0 ? `minlength="${cfg.minLength}"` : '';
                const maxAttr = cfg.maxLength != null ? `maxlength="${cfg.maxLength}"` : '';
                const patternAttr = cfg.pattern ? `pattern="${cfg.pattern}"` : '';
                const valueAttr = cfg.defaultValue ? `value="${cfg.defaultValue}"` : '';
                const label = cfg.label || 'Text Input';
                return `
                    <label>${label}</label><br/>
                    <input type="${type}" id="runtime-text-input" placeholder="${placeholder}" ${requiredAttr} ${minAttr} ${maxAttr} ${patternAttr} ${valueAttr}/><br/>
                    <div id="runtime-text-error" style="color:rgba(255,67,54,0.8);font-size:12px;margin-top:4px;min-height:16px;"></div>
                    <button class="btn-primary" id="runtime-text-continue" onclick="__runtimeInstance.completeCurrentStep()" disabled>Continue</button>
                `;
            }
            case 'file-upload': {
                // Build a file upload UI based on configuration.  Source can be
                // 'upload', 'existing' or 'both'.  The accept and multiple
                // attributes are applied to the file input.  Required fields
                // will be validated before continuing.
                const cfg = component.config || {};
                const source = cfg.source || 'both';
                const acceptAttr = cfg.accept ? cfg.accept : '*';
                const multipleAttr = cfg.multiple ? 'multiple' : '';
                const label = cfg.label || 'Upload File';
                // Determine which sections to render
                const showUpload = source === 'upload' || source === 'both';
                const showExisting = source === 'existing' || source === 'both';
                // Radio selection is needed only when both options are available
                const radioHtml = source === 'both' ? `
                    <div class="file-upload-source" style="margin-bottom:8px;">
                        <label><input type="radio" name="fileSource" value="upload" checked/> Upload new</label>
                        <label style="margin-left: 10px;"><input type="radio" name="fileSource" value="existing"/> Select existing</label>
                    </div>
                ` : '';
                const uploadWrapperDisplay = source === 'upload' ? '' : 'display:none;';
                const existingWrapperDisplay = source === 'existing' ? '' : 'display:none;';
                // Build HTML
                return `
                    <label>${label}</label><br/>
                    ${radioHtml}
                    ${showUpload ? `<div id="file-upload-wrapper" style="margin-bottom:8px; ${uploadWrapperDisplay}">
                        <input type="file" id="runtime-file-upload" accept="${acceptAttr}" ${multipleAttr} />
                    </div>` : ''}
                    ${showExisting ? `<div id="file-select-wrapper" style="margin-bottom:8px; ${existingWrapperDisplay}">
                        <select id="runtime-file-select"><option value="">-- Select file --</option></select>
                    </div>` : ''}
                    <ul id="file-preview-list" style="list-style:none; padding-left:0; margin:0 0 8px 0;"></ul>
                    <button class="btn-primary" id="runtime-file-continue" onclick="__runtimeInstance.completeCurrentStep()" disabled>Continue</button>
                `;
            }
            case 'canvas':
                // Build a canvas UI with optional brush controls and taskbar
                const cfg = component.config || {};
                const canvasLabel = cfg.label || 'Drawing Canvas';
                const editable = cfg.editable !== false;
                const controls = cfg.showBrushControls !== false;
                const taskbar = cfg.showTaskbar === true;
                const brushControls = controls ? `
                    <div id="canvas-controls" style="margin:8px 0; display:flex; gap:10px; align-items:center;">
                        <label style="font-size:12px;">Brush size: <input type="range" id="brush-size" min="1" max="20" value="${cfg.brushSize || 5}" style="vertical-align:middle; margin-left:4px;"/></label>
                        <label style="font-size:12px;">Color: <input type="color" id="brush-color" value="${cfg.brushColor || '#000000'}" style="vertical-align:middle; margin-left:4px;"/></label>
                    </div>
                ` : '';
                // Parse AI prompts: allow comma-separated string or array
                const prompts = Array.isArray(cfg.aiPrompts)
                    ? cfg.aiPrompts
                    : (typeof cfg.aiPrompts === 'string' ? cfg.aiPrompts.split(',').map(s => s.trim()).filter(Boolean) : []);
                const promptButtons = prompts.length > 0
                    ? prompts.map((p, i) => `<button class="ai-filter-btn" data-filter-index="${i}" style="margin-right:4px;">${p}</button>`).join('')
                    : '';
                const taskbarHtml = taskbar ? `
                    <div id="canvas-taskbar" style="margin:8px 0;">
                        ${promptButtons}
                        <button id="undo-btn" style="margin-left:4px;">Undo</button>
                        <button id="redo-btn" style="margin-left:4px;">Redo</button>
                    </div>
                ` : '';
                return `
                    <label>${canvasLabel}</label><br/>
                    <canvas id="runtime-canvas" width="${cfg.width || 400}" height="${cfg.height || 300}" style="border:1px solid #ccc;"></canvas><br/>
                    ${editable ? '<small>Use your mouse to draw.</small><br/>' : ''}
                    ${brushControls}
                    ${taskbarHtml}
                    <button class="btn-primary" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                `;
            case 'rich-text': {
                // Build a rich text editor with configurable toolbar and dimensions
                const cfg = component.config || {};
                const label = cfg.label || 'Rich Text Editor';
                const height = cfg.height || 200;
                // Parse toolbar options: allow comma-separated string or array
                const options = Array.isArray(cfg.toolbarOptions) ? cfg.toolbarOptions : (typeof cfg.toolbarOptions === 'string' ? cfg.toolbarOptions.split(',').map(o => o.trim()).filter(Boolean) : []);
                // Build toolbar buttons
                const buttonHtml = options.map(opt => {
                    let display = opt;
                    switch (opt) {
                        case 'bold': display = '<b>B</b>'; break;
                        case 'italic': display = '<i>I</i>'; break;
                        case 'underline': display = '<u>U</u>'; break;
                        case 'bullet': display = '•'; break;
                        case 'numbered': display = '1.'; break;
                        case 'link': display = '🔗'; break;
                    }
                    return `<button class="rich-btn btn-secondary" data-action="${opt}" title="${opt.charAt(0).toUpperCase() + opt.slice(1)}" style="margin-right:4px;">${display}</button>`;
                }).join('');
                // Placeholder styling: we'll rely on a data-placeholder attribute and CSS inserted once
                return `
                    <label>${label}</label><br/>
                    <div id="rich-text-toolbar" style="margin-bottom:6px;">${buttonHtml}</div>
                    <div id="runtime-rich-editor" contenteditable="true" data-placeholder="${cfg.placeholder || ''}" style="min-height:${height}px; border:1px solid rgba(255,255,255,0.2); border-radius:6px; padding:8px; background: rgba(255,255,255,0.05); color:#fff; overflow-y:auto;"></div>
                    <div id="runtime-rich-error" style="color:rgba(255,67,54,0.8);font-size:12px;margin-top:4px;min-height:16px;"></div>
                    <button class="btn-primary" id="runtime-rich-continue" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                `;
            }
            case 'ai-prompt':
                return `
                    <p>Processing...</p>
                    <button class="btn-primary" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                `;
            case 'data-transform':
                return `
                    <p>Data Transformation: ${component.config.transformation}</p>
                    <button class="btn-primary" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                `;
            case 'display':
                return `
                    <label>${component.config.label || 'Display Output'}</label><br/>
                    <pre id="runtime-display-output"></pre><br/>
                    <button class="btn-primary" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                `;
            case 'chart':
                return `
                    <p>${component.config.title || 'Chart'}</p>
                    <div id="runtime-chart" style="height:200px; border:1px solid #ccc;"></div><br/>
                    <button class="btn-primary" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                `;
            case 'export':
                return `
                    <p>Export format: ${component.config.format}</p>
                    <button class="btn-primary" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                `;
            case 'table': {
                const cfg = component.config || {};
                const label = cfg.label || 'Table';
                const cols = Array.isArray(cfg.columns) ? cfg.columns : (typeof cfg.columns === 'string' ? cfg.columns.split(',').map(c => c.trim()).filter(Boolean) : []);
                const numRows = parseInt(cfg.rows, 10);
                const rows = !isNaN(numRows) && numRows >= 0 ? numRows : 0;
                const editable = cfg.editable !== false;
                // Build table headers
                const headerCells = cols.map(col => `<th style="padding:6px 8px; border-bottom:1px solid rgba(255,255,255,0.1); text-align:left;">${col}</th>`).join('');
                // Build initial rows
                let bodyHtml = '';
                for (let r = 0; r < rows; r++) {
                    const cells = cols.map((col, ci) => {
                        return `<td style="padding:4px 6px; border-bottom:1px solid rgba(255,255,255,0.05);">
                            ${editable ? `<input type="text" class="table-cell-input" data-col="${ci}" style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:4px 6px; border-radius:4px;" />` : `<span class="table-cell-display"></span>`}
                        </td>`;
                    }).join('');
                    bodyHtml += `<tr>${cells}</tr>`;
                }
                const addRowBtn = editable ? `<button id="table-add-row" class="btn-secondary" style="margin-top:8px;">Add Row</button>` : '';
                return `
                    <label>${label}</label><br/>
                    <div style="overflow-x:auto; border:1px solid rgba(255,255,255,0.2); border-radius:6px; background:rgba(255,255,255,0.05);">
                        <table id="runtime-table" style="width:100%; border-collapse:collapse;">
                            <thead><tr>${headerCells}</tr></thead>
                            <tbody>
                                ${bodyHtml}
                            </tbody>
                        </table>
                    </div>
                    ${addRowBtn}
                    <button class="btn-primary" id="runtime-table-continue" onclick="__runtimeInstance.completeCurrentStep()" style="margin-top:8px;">Continue</button>
                `;
            }
            default:
                return `
                    <p>Unknown component type: ${component.type}</p>
                    <button class="btn-primary" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                `;
        }
    }

    /**
     * Capture any data entered on the current step and advance the
     * sequence index.  Values are stored in this.state keyed by component
     * id.  For file uploads a File object is stored; for other inputs a
     * string is stored.  After capturing data the next step is rendered.
     */
    completeCurrentStep() {
        if (this.currentIndex >= this.sequence.length) return;
        const { component } = this.sequence[this.currentIndex];
        let value = null;
        switch (component.type) {
            case 'text-input':
                const textEl = document.getElementById('runtime-text-input');
                value = textEl ? textEl.value : null;
                break;
            case 'file-upload':
                // Determine whether the user chose to upload or select an existing file
                {
                    const cfg = component.config || {};
                    const srcRadio = document.querySelector('input[name="fileSource"]:checked');
                    let selectedSource = cfg.source || 'both';
                    if (cfg.source === 'both' && srcRadio) {
                        selectedSource = srcRadio.value;
                    }
                    if (selectedSource === 'upload' || (cfg.source === 'upload' && !srcRadio)) {
                        const fileInput = document.getElementById('runtime-file-upload');
                        if (fileInput && fileInput.files) {
                            if (cfg.multiple) {
                                value = Array.from(fileInput.files);
                            } else {
                                value = fileInput.files.length > 0 ? fileInput.files[0] : null;
                            }
                        } else {
                            value = null;
                        }
                    } else {
                        const selectEl = document.getElementById('runtime-file-select');
                        value = selectEl ? selectEl.value : null;
                    }
                    break;
                }
            case 'canvas':
                const canvasEl = document.getElementById('runtime-canvas');
                value = canvasEl ? canvasEl.toDataURL() : null;
                break;
            case 'rich-text': {
                const richEditor = document.getElementById('runtime-rich-editor');
                value = richEditor ? richEditor.innerHTML : null;
                break;
            }
            case 'table': {
                const cfg = component.config || {};
                const table = document.getElementById('runtime-table');
                const cols = Array.isArray(cfg.columns) ? cfg.columns : (typeof cfg.columns === 'string' ? cfg.columns.split(',').map(c => c.trim()).filter(Boolean) : []);
                const dataRows = [];
                if (table) {
                    const trEls = table.querySelectorAll('tbody tr');
                    trEls.forEach(tr => {
                        const rowObj = {};
                        cols.forEach((col, ci) => {
                            const cellInput = tr.querySelector(`input.table-cell-input[data-col="${ci}"]`);
                            if (cellInput) {
                                rowObj[col] = cellInput.value;
                            } else {
                                const span = tr.querySelector('span.table-cell-display');
                                rowObj[col] = span ? span.textContent : '';
                            }
                        });
                        dataRows.push(rowObj);
                    });
                }
                value = dataRows;
                break;
            }
            default:
                value = null;
        }
        this.state[component.id] = value;
        this.currentIndex++;
        this.renderCurrentStep();
    }

    /**
     * Setup the file upload UI.  This method populates the existing file
     * dropdown and toggles between upload/select modes based on the
     * selected radio button.  It reads available files from the global
     * fileSystem if available; otherwise the select remains empty.  The
     * component's config determines the initial mode.
     */
    setupFileUpload(component) {
        const cfg = component.config || {};
        const source = cfg.source || 'both';
        const uploadWrapper = this.container.querySelector('#file-upload-wrapper');
        const selectWrapper = this.container.querySelector('#file-select-wrapper');
        const radios = this.container.querySelectorAll('input[name="fileSource"]');
        const fileInput = this.container.querySelector('#runtime-file-upload');
        const select = this.container.querySelector('#runtime-file-select');
        const previewList = this.container.querySelector('#file-preview-list');
        const continueBtn = this.container.querySelector('#runtime-file-continue');
        if (!continueBtn) return;
        // Apply attributes to file input if present
        if (fileInput) {
            fileInput.accept = cfg.accept || '*';
            if (cfg.multiple) {
                fileInput.setAttribute('multiple', 'multiple');
            } else {
                fileInput.removeAttribute('multiple');
            }
        }
        // Populate existing files into select
        const populateFiles = () => {
            if (!select) return;
            select.innerHTML = '<option value="">-- Select file --</option>';
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
                console.warn('Failed to retrieve file list', err);
            }
            if (Array.isArray(files)) {
                files.forEach(f => {
                    const option = document.createElement('option');
                    if (typeof f === 'string') {
                        option.value = f;
                        option.textContent = f;
                    } else {
                        option.value = f.id || f.name || '';
                        option.textContent = f.name || f.label || option.value;
                    }
                    select.appendChild(option);
                });
            }
            // Preselect if config.fileId provided
            if (cfg.fileId && select) {
                select.value = cfg.fileId;
            }
        };
        populateFiles();
        // Helper to show/hide wrappers based on selected source in radio buttons (only for both)
        const updateVisibility = () => {
            if (!uploadWrapper || !selectWrapper) return;
            let selected = source;
            // When both options are available, read from radio
            if (source === 'both' && radios && radios.length > 0) {
                const checkedRadio = Array.from(radios).find(r => r.checked);
                selected = checkedRadio ? checkedRadio.value : 'upload';
            }
            if (selected === 'upload') {
                if (uploadWrapper) uploadWrapper.style.display = '';
                if (selectWrapper) selectWrapper.style.display = 'none';
            } else if (selected === 'existing') {
                if (uploadWrapper) uploadWrapper.style.display = 'none';
                if (selectWrapper) selectWrapper.style.display = '';
            }
            validate();
        };
        // File preview for upload
        const updatePreview = () => {
            if (!previewList || !fileInput) return;
            previewList.innerHTML = '';
            if (fileInput.files && fileInput.files.length > 0) {
                Array.from(fileInput.files).forEach(file => {
                    const li = document.createElement('li');
                    li.textContent = file.name;
                    previewList.appendChild(li);
                });
            }
        };
        // Validation: enable continue only if required conditions are met
        const validate = () => {
            let valid = true;
            // Determine current mode
            let selected = source;
            if (source === 'both' && radios && radios.length > 0) {
                const checkedRadio = Array.from(radios).find(r => r.checked);
                selected = checkedRadio ? checkedRadio.value : 'upload';
            }
            if (selected === 'upload') {
                if (cfg.required) {
                    valid = fileInput && fileInput.files && fileInput.files.length > 0;
                }
            } else {
                // existing
                if (cfg.required) {
                    valid = select && select.value;
                }
            }
            continueBtn.disabled = !valid;
        };
        // Attach listeners
        if (radios && radios.length > 0) {
            radios.forEach(r => {
                r.addEventListener('change', () => {
                    updateVisibility();
                });
            });
        }
        if (fileInput) {
            fileInput.addEventListener('change', () => {
                updatePreview();
                validate();
            });
        }
        if (select) {
            select.addEventListener('change', validate);
        }
        // Initial visibility and validation
        updateVisibility();
        updatePreview();
        validate();
    }

    /**
     * Setup the canvas for drawing, brush controls, AI filters and
     * undo/redo functionality.  Drawing is enabled only when
     * component.config.editable is true.  Brush size and color pickers
     * update the drawing context.  AI filter buttons apply simple
     * transformations to the image.  Undo and redo are implemented via
     * an array of data URLs stored on the runtime instance.
     */
    setupCanvas(component) {
        const cfg = component.config || {};
        const canvas = this.container.querySelector('#runtime-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        // Initialise history stack for undo/redo
        this.canvasHistory = [];
        this.historyIndex = -1;
        const saveState = () => {
            try {
                const dataURL = canvas.toDataURL();
                // Trim any redo states
                this.canvasHistory = this.canvasHistory.slice(0, this.historyIndex + 1);
                this.canvasHistory.push(dataURL);
                this.historyIndex = this.canvasHistory.length - 1;
            } catch (err) {
                console.warn('Failed to save canvas state', err);
            }
        };
        const restoreState = (index) => {
            if (index < 0 || index >= this.canvasHistory.length) return;
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = this.canvasHistory[index];
        };
        // Save initial blank state
        saveState();
        // Drawing variables
        let drawing = false;
        let brushSize = cfg.brushSize || 5;
        let brushColor = cfg.brushColor || '#000000';
        const startDrawing = (e) => {
            drawing = true;
            ctx.beginPath();
            ctx.moveTo(e.offsetX, e.offsetY);
        };
        const draw = (e) => {
            if (!drawing) return;
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        };
        const stopDrawing = () => {
            if (drawing) {
                drawing = false;
                ctx.closePath();
                saveState();
            }
        };
        if (cfg.editable !== false) {
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseout', stopDrawing);
        }
        // Brush controls
        if (cfg.showBrushControls !== false) {
            const sizeInput = this.container.querySelector('#brush-size');
            const colorInput = this.container.querySelector('#brush-color');
            if (sizeInput) {
                sizeInput.addEventListener('input', (e) => {
                    brushSize = parseInt(e.target.value, 10) || 1;
                });
            }
            if (colorInput) {
                colorInput.addEventListener('input', (e) => {
                    brushColor = e.target.value || '#000000';
                });
            }
        }
        // AI filter buttons and undo/redo
        if (cfg.showTaskbar === true) {
            // Undo
            const undoBtn = this.container.querySelector('#undo-btn');
            if (undoBtn) {
                undoBtn.addEventListener('click', () => {
                    if (this.historyIndex > 0) {
                        this.historyIndex--;
                        restoreState(this.historyIndex);
                    }
                });
            }
            // Redo
            const redoBtn = this.container.querySelector('#redo-btn');
            if (redoBtn) {
                redoBtn.addEventListener('click', () => {
                    if (this.historyIndex < this.canvasHistory.length - 1) {
                        this.historyIndex++;
                        restoreState(this.historyIndex);
                    }
                });
            }
            // AI filters
            const filterButtons = this.container.querySelectorAll('.ai-filter-btn');
            filterButtons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    const filterName = btn.textContent.trim();
                    // Apply filter
                    try {
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const data = imageData.data;
                        for (let i = 0; i < data.length; i += 4) {
                            const r = data[i];
                            const g = data[i + 1];
                            const b = data[i + 2];
                            if (/watercolor/i.test(filterName)) {
                                // Lighten colors slightly for watercolor effect
                                data[i] = Math.min(255, r * 1.1);
                                data[i + 1] = Math.min(255, g * 1.1);
                                data[i + 2] = Math.min(255, b * 1.1);
                            } else if (/sketch/i.test(filterName)) {
                                // Convert to grayscale for sketch effect
                                const avg = (r + g + b) / 3;
                                data[i] = data[i + 1] = data[i + 2] = avg;
                            } else {
                                // Default effect: invert colors
                                data[i] = 255 - r;
                                data[i + 1] = 255 - g;
                                data[i + 2] = 255 - b;
                            }
                        }
                        ctx.putImageData(imageData, 0, 0);
                        saveState();
                    } catch (err) {
                        console.warn('Failed to apply filter', err);
                    }
                });
            });
        }
    }

    /**
     * Setup validation for text input.  This method attaches an input
     * handler to enforce required, minLength, maxLength and pattern rules
     * defined in the component's configuration.  It also disables the
     * continue button until the input is valid and displays an error
     * message when validation fails.
     */
    setupTextInput(component) {
        const inputEl = this.container.querySelector('#runtime-text-input');
        const errorEl = this.container.querySelector('#runtime-text-error');
        const continueBtn = this.container.querySelector('#runtime-text-continue');
        if (!inputEl || !continueBtn || !errorEl) return;
        const cfg = component.config || {};
        const validate = () => {
            let error = '';
            const value = inputEl.value || '';
            if (cfg.required && value.trim() === '') {
                error = 'This field is required.';
            } else if (cfg.minLength && value.length < cfg.minLength) {
                error = `Please enter at least ${cfg.minLength} characters.`;
            } else if (cfg.maxLength != null && cfg.maxLength >= 0 && value.length > cfg.maxLength) {
                error = `Please enter no more than ${cfg.maxLength} characters.`;
            } else if (cfg.pattern) {
                try {
                    const regex = new RegExp(cfg.pattern);
                    if (value && !regex.test(value)) {
                        error = 'Invalid format.';
                    }
                } catch (err) {
                    console.warn('Invalid regex pattern', err);
                }
            }
            errorEl.textContent = error;
            continueBtn.disabled = error !== '';
        };
        inputEl.addEventListener('input', validate);
        // Initial validation
        validate();
    }

    /**
     * Initialise the rich text editor.  This method populates the editor
     * with the default content, attaches toolbar actions to formatting
     * commands and optionally handles placeholder styling.  The editor
     * content is stored as HTML when the step is completed.
     */
    setupRichTextEditor(component) {
        const cfg = component.config || {};
        // Inject placeholder styles once per page
        this.injectRichTextStyles();
        const editor = this.container.querySelector('#runtime-rich-editor');
        const toolbar = this.container.querySelector('#rich-text-toolbar');
        const continueBtn = this.container.querySelector('#runtime-rich-continue');
        const errorEl = this.container.querySelector('#runtime-rich-error');
        if (!editor) return;
        // Initialise content
        editor.innerHTML = cfg.defaultValue || '';
        // Set placeholder attribute if provided
        if (cfg.placeholder) {
            editor.setAttribute('data-placeholder', cfg.placeholder);
        }
        // Attach click handlers to toolbar buttons
        if (toolbar) {
            const buttons = toolbar.querySelectorAll('button.rich-btn');
            buttons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const action = btn.getAttribute('data-action');
                    editor.focus();
                    try {
                        switch (action) {
                            case 'bold':
                            case 'italic':
                            case 'underline':
                                document.execCommand(action);
                                break;
                            case 'bullet':
                                document.execCommand('insertUnorderedList');
                                break;
                            case 'numbered':
                                document.execCommand('insertOrderedList');
                                break;
                            case 'link': {
                                const url = prompt('Enter URL', '');
                                if (url) {
                                    document.execCommand('createLink', false, url);
                                }
                                break;
                            }
                            default:
                                break;
                        }
                    } catch (err) {
                        console.warn('Rich text command failed', err);
                    }
                });
            });
        }
        // Always enable continue for rich text
        if (continueBtn) {
            continueBtn.disabled = false;
        }
        // Clear any previous error
        if (errorEl) {
            errorEl.textContent = '';
        }
    }

    /**
     * Setup table behaviours such as adding new rows.  Only executed when
     * the table is editable.  New rows replicate the configured columns.
     */
    setupTable(component) {
        const cfg = component.config || {};
        const editable = cfg.editable !== false;
        if (!editable) return;
        const addRowBtn = this.container.querySelector('#table-add-row');
        const tableBody = this.container.querySelector('#runtime-table tbody');
        if (!addRowBtn || !tableBody) return;
        // Parse columns into array
        const cols = Array.isArray(cfg.columns) ? cfg.columns : (typeof cfg.columns === 'string' ? cfg.columns.split(',').map(c => c.trim()).filter(Boolean) : []);
        addRowBtn.addEventListener('click', () => {
            // Build a new row with editable inputs
            const rowCells = cols.map((col, ci) => {
                return `<td style="padding:4px 6px; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <input type="text" class="table-cell-input" data-col="${ci}" style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:4px 6px; border-radius:4px;" />
                </td>`;
            }).join('');
            const newRow = document.createElement('tr');
            newRow.innerHTML = rowCells;
            tableBody.appendChild(newRow);
        });
    }

    /**
     * Inject CSS for the rich text placeholder if not already present.
     */
    injectRichTextStyles() {
        const styleId = 'rich-text-placeholder-style';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            #runtime-rich-editor[data-placeholder]:empty:before {
                content: attr(data-placeholder);
                color: rgba(255, 255, 255, 0.5);
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Move to the next step when the Next button is clicked.  If the
     * current component's UI includes its own continue button (rendered via
     * renderComponent) this handler simply calls completeCurrentStep().
     */
    nextStep() {
        // When user clicks Next we treat it the same as completing the
        // current step.  If the component includes its own continue
        // button this call may be redundant but safe.
        this.completeCurrentStep();
    }

    /**
     * Navigate backwards through the sequence.  Restores the previous
     * component's value to the input controls where possible.  Values
     * captured in this.state are preserved.
     */
    previousStep() {
        if (this.currentIndex === 0) return;
        this.currentIndex--;
        this.renderCurrentStep();
        // Restore previously entered value if applicable
        const { component } = this.sequence[this.currentIndex];
        const value = this.state[component.id];
        switch (component.type) {
            case 'text-input':
                const textEl = document.getElementById('runtime-text-input');
                if (textEl && typeof value === 'string') textEl.value = value;
                break;
            case 'rich-text':
                const richEl = document.getElementById('runtime-rich-text');
                if (richEl && typeof value === 'string') richEl.value = value;
                break;
            // Other component types do not support restoration in this simple implementation
        }
    }
}

// The runtime instance is exposed globally so that inline onclick handlers
// can call completeCurrentStep() without binding context.  Each launch
// creates a fresh AppRuntime which overrides this variable.
window.__runtimeInstance = null;