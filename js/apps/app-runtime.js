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
            this.setupDataSource(component);
        } else if (component.type === 'text-input') {
            this.setupTextInput(component);
            this.setupDataSource(component);
        } else if (component.type === 'rich-text') {
            this.setupRichTextEditor(component);
            // AI actions for rich text
            this.setupRichTextAi(component);
            this.setupDataSource(component);
        } else if (component.type === 'table') {
            this.setupTable(component);
            // AI actions for tables
            this.setupTableAi(component);
            this.setupDataSource(component);
        }
        // Automatically complete data source steps without user interaction
        if (component.type === 'data-source') {
            this.autoCompleteDataSource(component);
            return;
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
                    ${this.getDataSourceHtml(component)}
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
            case 'canvas': {
                // Build a canvas UI with optional brush controls and taskbar
                const cfg = component.config || {};
                const canvasLabel = cfg.label || 'Drawing Canvas';
                const editable = cfg.editable !== false;
                const controls = cfg.showBrushControls !== false;
                // Determine AI options; support legacy aiPrompts string
                let options = [];
                if (Array.isArray(cfg.aiOptions)) {
                    options = cfg.aiOptions;
                } else if (typeof cfg.aiPrompts === 'string' && cfg.aiPrompts.trim().length > 0) {
                    options = cfg.aiPrompts.split(',').map(s => s.trim()).filter(Boolean).map(p => ({ label: p, prompt: p, icon: 'fas fa-magic' }));
                }
                const showBar = cfg.showTaskbar || (options.length > 0) || cfg.showFill || cfg.showErase;
                const brushControls = controls ? `
                    <div id="canvas-controls" style="margin:8px 0; display:flex; gap:10px; align-items:center;">
                        <label style="font-size:12px;">Brush size: <input type="range" id="brush-size" min="1" max="20" value="${cfg.brushSize || 5}" style="vertical-align:middle; margin-left:4px;"/></label>
                        <label style="font-size:12px;">Color: <input type="color" id="brush-color" value="${cfg.brushColor || '#000000'}" style="vertical-align:middle; margin-left:4px;"/></label>
                    </div>
                ` : '';
                // Build AI option buttons
                const aiButtons = options.map((opt, i) => {
                    const icon = opt.icon || 'fas fa-magic';
                    const label = opt.label || '';
                    // Use icon and optional label
                    return `<button class="ai-filter-btn" data-filter-index="${i}" title="${label}" style="margin-right:4px;"><i class="${icon}"></i> ${label}</button>`;
                }).join('');
                // Fill and erase buttons
                const fillBtn = cfg.showFill ? `<button id="fill-btn" class="canvas-tool-btn" title="Fill" style="margin-right:4px;"><i class="fas fa-fill-drip"></i></button>` : '';
                const eraseBtn = cfg.showErase ? `<button id="erase-btn" class="canvas-tool-btn" title="Erase" style="margin-right:4px;"><i class="fas fa-eraser"></i></button>` : '';
                const taskbarHtml = showBar ? `
                    <div id="canvas-taskbar" style="margin:8px 0;">
                        ${aiButtons}
                        ${fillBtn}
                        ${eraseBtn}
                        <button id="undo-btn" style="margin-left:4px;">Undo</button>
                        <button id="redo-btn" style="margin-left:4px;">Redo</button>
                    </div>
                ` : '';
                return `
                    ${this.getDataSourceHtml(component)}
                    <label>${canvasLabel}</label><br/>
                    <canvas id="runtime-canvas" width="${cfg.width || 400}" height="${cfg.height || 300}" style="border:1px solid #ccc;"></canvas><br/>
                    ${editable ? '<small>Use your mouse to draw.</small><br/>' : ''}
                    ${brushControls}
                    ${taskbarHtml}
                    <button class="btn-primary" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                `;
            }
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
                // Build AI options buttons for rich text
                let aiOptions = [];
                if (Array.isArray(cfg.aiOptions)) {
                    aiOptions = cfg.aiOptions;
                } else if (typeof cfg.aiPrompts === 'string' && cfg.aiPrompts.trim().length > 0) {
                    aiOptions = cfg.aiPrompts.split(',').map(s => s.trim()).filter(Boolean).map(p => ({ label: p, prompt: p, icon: 'fas fa-magic' }));
                }
                const showAiBar = cfg.showTaskbar || (aiOptions.length > 0);
                const aiButtons = aiOptions.map((opt, i) => {
                    const icon = opt.icon || 'fas fa-magic';
                    const lbl = opt.label || '';
                    return `<button class="rich-ai-btn" data-ai-index="${i}" title="${lbl}" style="margin-right:4px;"><i class="${icon}"></i> ${lbl}</button>`;
                }).join('');
                const aiBarHtml = showAiBar ? `<div id="rich-ai-taskbar" style="margin:8px 0;">${aiButtons}</div>` : '';
                // Placeholder styling: we'll rely on a data-placeholder attribute and CSS inserted once
                return `
                    ${this.getDataSourceHtml(component)}
                    <label>${label}</label><br/>
                    <div id="rich-text-toolbar" style="margin-bottom:6px;">${buttonHtml}</div>
                    <div id="runtime-rich-editor" contenteditable="true" data-placeholder="${cfg.placeholder || ''}" style="min-height:${height}px; border:1px solid rgba(255,255,255,0.2); border-radius:6px; padding:8px; background: rgba(255,255,255,0.05); color:#fff; overflow-y:auto;"></div>
                    ${aiBarHtml}
                    <div id="runtime-rich-error" style="color:rgba(255,67,54,0.8);font-size:12px;margin-top:4px;min-height:16px;"></div>
                    <button class="btn-primary" id="runtime-rich-continue" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                `;
            }
            case 'ai-prompt': {
                const cfg = component.config || {};
                const displayText = cfg.displayText || '';
                const displayHtml = displayText ? `<p style="margin-bottom:8px;">${displayText}</p>` : '';
                return `
                    ${displayHtml}
                    <p>Processing...</p>
                    <button class="btn-primary" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                `;
            }
            case 'data-transform':
                {
                    const cfg = component.config || {};
                    const display = cfg.displayText || '';
                    const displayHtml = display ? `<p style="margin-bottom:8px;">${display}</p>` : '';
                    return `
                        ${displayHtml}
                        <p>Transforming data to <strong>${cfg.targetType || 'text'}</strong>...</p>
                        <button class="btn-primary" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                    `;
                }
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
                // Build AI options for table
                let aiOptions = [];
                if (Array.isArray(cfg.aiOptions)) {
                    aiOptions = cfg.aiOptions;
                } else if (typeof cfg.aiPrompts === 'string' && cfg.aiPrompts.trim().length > 0) {
                    aiOptions = cfg.aiPrompts.split(',').map(s => s.trim()).filter(Boolean).map(p => ({ label: p, prompt: p, icon: 'fas fa-magic' }));
                }
                const showAiBar = cfg.showTaskbar || (aiOptions.length > 0);
                const aiButtons = aiOptions.map((opt, i) => {
                    const icon = opt.icon || 'fas fa-magic';
                    const lbl = opt.label || '';
                    return `<button class="table-ai-btn" data-ai-index="${i}" title="${lbl}" style="margin-right:4px;"><i class="${icon}"></i> ${lbl}</button>`;
                }).join('');
                const aiBarHtml = showAiBar ? `<div id="table-ai-taskbar" style="margin:8px 0;">${aiButtons}</div>` : '';
                return `
                    ${this.getDataSourceHtml(component)}
                    <label>${label}</label><br/>
                    <div style="overflow-x:auto; border:1px solid rgba(255,255,255,0.2); border-radius:6px; background:rgba(255,255,255,0.05);">
                        <table id="runtime-table" style="width:100%; border-collapse:collapse;">
                            <thead><tr>${headerCells}</tr></thead>
                            <tbody>
                                ${bodyHtml}
                            </tbody>
                        </table>
                    </div>
                    ${editable ? addRowBtn : ''}
                    ${aiBarHtml}
                    <button class="btn-primary" id="runtime-table-continue" onclick="__runtimeInstance.completeCurrentStep()" style="margin-top:8px;">Continue</button>
                `;
            }
            case 'data-source': {
                // Data source component is not shown to the end user.  The
                // actual import occurs automatically in renderCurrentStep().
                // Return an empty string so the runtime UI remains clean.
                return '';
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
            case 'data-transform': {
                const cfg = component.config || {};
                // Determine the previous value from the last step
                let prevValue = null;
                if (this.currentIndex > 0) {
                    const prevEntry = this.sequence[this.currentIndex - 1];
                    if (prevEntry && prevEntry.component) {
                        prevValue = this.state[prevEntry.component.id];
                    }
                }
                const target = (cfg.targetType || 'text').toLowerCase();
                // Helper functions to detect value types
                const isImage = (val) => typeof val === 'string' && /^data:image\//i.test(val);
                const isTable = (val) => Array.isArray(val);
                // If the value is an object with a type field, extract data accordingly
                const extractTypedData = (val) => {
                    if (val && typeof val === 'object' && val.type) {
                        const t = val.type.toLowerCase();
                        if (t === 'canvas' || t === 'image') {
                            return val.data || val.image || val.value;
                        }
                        if (t === 'table') {
                            return val.data || val.rows || val.table || val.value;
                        }
                        if (t === 'text' || t === 'rich-text') {
                            return val.data || val.text || val.value;
                        }
                    }
                    return val;
                };
                const toCSV = (rows) => {
                    if (!Array.isArray(rows)) return '';
                    // Determine if rows are array of objects or arrays
                    if (rows.length === 0) return '';
                    let keys;
                    if (Array.isArray(rows[0])) {
                        return rows.map(row => row.join(',')).join('\n');
                    } else if (typeof rows[0] === 'object') {
                        keys = Object.keys(rows[0]);
                        const header = keys.join(',');
                        const lines = rows.map(obj => keys.map(k => obj[k]).join(','));
                        return [header].concat(lines).join('\n');
                    }
                    return '';
                };
                // Extract data if value has type property
                const rawPrev = extractTypedData(prevValue);
                // Transformations
                let newValue = rawPrev;
                if (target === 'text') {
                    if (isTable(rawPrev)) {
                        newValue = toCSV(rawPrev);
                    } else if (isImage(rawPrev)) {
                        // For images, we cannot convert to text easily; embed as notice
                        newValue = `[Image data: ${rawPrev.slice(0, 20)}...]`;
                    } else {
                        // Default: stringify
                        if (typeof rawPrev === 'object') {
                            try { newValue = JSON.stringify(rawPrev); } catch { newValue = String(rawPrev); }
                        }
                    }
                } else if (target === 'table') {
                    if (isTable(rawPrev)) {
                        newValue = rawPrev;
                    } else if (typeof rawPrev === 'string') {
                        // Try to parse JSON or CSV
                        let tableRows = [];
                        try {
                            const parsed = JSON.parse(prevValue);
                            if (Array.isArray(parsed)) {
                                if (parsed.length && (Array.isArray(parsed[0]) || typeof parsed[0] === 'object')) {
                                    tableRows = parsed;
                                }
                            }
                        } catch {
                            // Try CSV: split lines by newline and commas
                            const lines = rawPrev.split(/\r?\n/).filter(l => l.trim().length > 0);
                            if (lines.length > 0) {
                                tableRows = lines.map(line => line.split(','));
                            }
                        }
                        // Convert array of arrays to array of objects with generic column names
                        if (Array.isArray(tableRows) && tableRows.length > 0) {
                            if (Array.isArray(tableRows[0])) {
                                // Use Row1 as header if all strings
                                const header = tableRows[0];
                                const body = tableRows.slice(1).map(row => {
                                    const obj = {};
                                    header.forEach((key, idx) => {
                                        obj[key] = row[idx] != null ? row[idx] : '';
                                    });
                                    return obj;
                                });
                                newValue = body;
                            } else {
                                newValue = tableRows;
                            }
                        } else {
                            // Fallback: create table with single column 'Value'
                            newValue = [{ Value: rawPrev }];
                        }
                    } else if (isImage(rawPrev)) {
                        newValue = [{ Image: rawPrev }];
                    }
                } else if (target === 'image') {
                    if (isImage(rawPrev)) {
                        newValue = rawPrev;
                    } else {
                        // Create an image with text/table content drawn onto a canvas
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = 400;
                            canvas.height = 200;
                            const ctx = canvas.getContext('2d');
                            ctx.fillStyle = '#fff';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            ctx.fillStyle = '#000';
                            ctx.font = '14px sans-serif';
                            ctx.textBaseline = 'top';
                            let text = '';
                            if (isTable(rawPrev)) {
                                text = toCSV(rawPrev);
                            } else if (typeof rawPrev === 'object') {
                                try { text = JSON.stringify(rawPrev, null, 2); } catch { text = String(rawPrev); }
                            } else {
                                text = String(rawPrev || '');
                            }
                            // Split text into lines to avoid overflow
                            const lines = text.split(/\r?\n/);
                            const maxWidth = canvas.width - 20;
                            let y = 10;
                            lines.forEach(line => {
                                // Wrap line if necessary
                                let current = '';
                                line.split(/\s+/).forEach(word => {
                                    const test = current + word + ' ';
                                    if (ctx.measureText(test).width > maxWidth) {
                                        ctx.fillText(current.trim(), 10, y);
                                        y += 16;
                                        current = word + ' ';
                                    } else {
                                        current = test;
                                    }
                                });
                                ctx.fillText(current.trim(), 10, y);
                                y += 16;
                            });
                            newValue = canvas.toDataURL();
                        } catch (err) {
                            console.warn('Failed to create image from text', err);
                            newValue = prevValue;
                        }
                    }
                }
                // If target is a custom pseudo‑type, wrap previous value into an object
                if (!['text','table','image'].includes(target)) {
                    newValue = { type: target, data: prevValue };
                }
                value = newValue;
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
        let eraseMode = false;
        let fillMode = false;
        const startDrawing = (e) => {
            drawing = true;
            ctx.beginPath();
            ctx.moveTo(e.offsetX, e.offsetY);
        };
        const draw = (e) => {
            if (!drawing) return;
            ctx.lineTo(e.offsetX, e.offsetY);
            // Set composite operation based on erase mode
            ctx.globalCompositeOperation = eraseMode ? 'destination-out' : 'source-over';
            ctx.strokeStyle = eraseMode ? 'rgba(0,0,0,1)' : brushColor;
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
        // Canvas tool buttons and AI option handlers
        // Undo and redo buttons exist whenever the taskbar is shown
        const undoBtn = this.container.querySelector('#undo-btn');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    restoreState(this.historyIndex);
                }
            });
        }
        const redoBtn = this.container.querySelector('#redo-btn');
        if (redoBtn) {
            redoBtn.addEventListener('click', () => {
                if (this.historyIndex < this.canvasHistory.length - 1) {
                    this.historyIndex++;
                    restoreState(this.historyIndex);
                }
            });
        }
        // AI option buttons
        const aiButtons = this.container.querySelectorAll('.ai-filter-btn');
        if (aiButtons && aiButtons.length > 0) {
            aiButtons.forEach((btn) => {
                const index = parseInt(btn.getAttribute('data-filter-index'), 10);
                btn.addEventListener('click', () => {
                    // Determine options (support legacy aiPrompts)
                    let options = [];
                    if (Array.isArray(cfg.aiOptions)) {
                        options = cfg.aiOptions;
                    } else if (typeof cfg.aiPrompts === 'string' && cfg.aiPrompts.trim().length > 0) {
                        options = cfg.aiPrompts.split(',').map(s => s.trim()).filter(Boolean).map(p => ({ label: p, prompt: p, icon: 'fas fa-magic' }));
                    }
                    const opt = options[index];
                    if (!opt) return;
                    try {
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const data = imageData.data;
                        const label = (opt.label || '') + ' ' + (opt.prompt || '');
                        for (let i = 0; i < data.length; i += 4) {
                            const r = data[i];
                            const g = data[i + 1];
                            const b = data[i + 2];
                            if (/watercolor/i.test(label)) {
                                data[i] = Math.min(255, r * 1.1);
                                data[i + 1] = Math.min(255, g * 1.1);
                                data[i + 2] = Math.min(255, b * 1.1);
                            } else if (/sketch|grayscale/i.test(label)) {
                                const avg = (r + g + b) / 3;
                                data[i] = data[i + 1] = data[i + 2] = avg;
                            } else {
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
        // Fill button (toggle). When active, clicking on the canvas will flood fill
        const fillBtn = this.container.querySelector('#fill-btn');
        if (fillBtn) {
            fillBtn.addEventListener('click', () => {
                // toggle fill mode
                fillMode = !fillMode;
                // ensure erase mode off
                if (fillMode && eraseMode) {
                    eraseMode = false;
                    const eb = this.container.querySelector('#erase-btn');
                    if (eb) eb.classList.remove('active');
                }
                // update button states
                if (fillMode) {
                    fillBtn.classList.add('active');
                } else {
                    fillBtn.classList.remove('active');
                }
            });
        }
        // Erase button (toggle). When active, drawing acts as eraser
        const eraseBtn = this.container.querySelector('#erase-btn');
        if (eraseBtn) {
            eraseBtn.addEventListener('click', () => {
                eraseMode = !eraseMode;
                // disable fill mode if toggling erase
                if (eraseMode && fillMode) {
                    fillMode = false;
                    if (fillBtn) fillBtn.classList.remove('active');
                }
                // Visually indicate toggle state
                if (eraseMode) {
                    eraseBtn.classList.add('active');
                } else {
                    eraseBtn.classList.remove('active');
                }
            });
        }

        // Flood fill function used when fillMode is active and canvas clicked
        function floodFill(x, y, fillColor) {
            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const width = canvas.width;
                const height = canvas.height;
                // Helper to get index in data array
                const indexOf = (x, y) => (y * width + x) * 4;
                // Convert fillColor to RGB
                const hexToRgb = (hex) => {
                    hex = hex.replace('#', '');
                    if (hex.length === 3) {
                        hex = hex.split('').map(c => c + c).join('');
                    }
                    const num = parseInt(hex, 16);
                    return {
                        r: (num >> 16) & 255,
                        g: (num >> 8) & 255,
                        b: num & 255
                    };
                };
                const targetColor = {
                    r: data[indexOf(x, y)],
                    g: data[indexOf(x, y) + 1],
                    b: data[indexOf(x, y) + 2]
                };
                const replacement = hexToRgb(fillColor);
                // If target equals replacement, nothing to fill
                if (targetColor.r === replacement.r && targetColor.g === replacement.g && targetColor.b === replacement.b) {
                    return;
                }
                const matchColor = (i) => {
                    return data[i] === targetColor.r && data[i + 1] === targetColor.g && data[i + 2] === targetColor.b;
                };
                const queue = [];
                queue.push({ x, y });
                while (queue.length > 0) {
                    const { x: cx, y: cy } = queue.pop();
                    let idx = indexOf(cx, cy);
                    // Skip if not match
                    if (!matchColor(idx)) continue;
                    // Move west until color mismatch
                    let west = cx;
                    while (west >= 0 && matchColor(indexOf(west, cy))) {
                        west--;
                    }
                        west++;
                    // Move east until color mismatch
                    let east = cx;
                    while (east < width && matchColor(indexOf(east, cy))) {
                        east++;
                    }
                    east--;
                    // Fill span
                    for (let i = west; i <= east; i++) {
                        const pos = indexOf(i, cy);
                        data[pos] = replacement.r;
                        data[pos + 1] = replacement.g;
                        data[pos + 2] = replacement.b;
                    }
                    // Check neighboring rows
                    for (let nx = west; nx <= east; nx++) {
                        if (cy > 0 && matchColor(indexOf(nx, cy - 1))) {
                            queue.push({ x: nx, y: cy - 1 });
                        }
                        if (cy < height - 1 && matchColor(indexOf(nx, cy + 1))) {
                            queue.push({ x: nx, y: cy + 1 });
                        }
                    }
                }
                ctx.putImageData(imageData, 0, 0);
            } catch (err) {
                console.warn('Failed to perform flood fill', err);
            }
        }

        // When fillMode is active, clicking on canvas triggers flood fill
        canvas.addEventListener('click', (e) => {
            if (!fillMode) return;
            const rect = canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
            const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));
            floodFill(x, y, brushColor);
            saveState();
        });
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
        // After basic rich text setup, configure AI option buttons if present
        this.setupRichTextAi(component);
    }

    /**
     * Setup AI buttons for rich text.  This attaches click handlers to AI
     * buttons defined in the component configuration.  Each button applies
     * a simple transformation to the editor's content based on keywords in
     * the option's label or prompt.  Currently supported operations include
     * uppercase, lowercase, bold, italic, underline, summarize, reverse, and
     * invert case.  If no keyword matches, invert case is used as fallback.
     */
    setupRichTextAi(component) {
        const cfg = component.config || {};
        // Determine AI options
        let options = [];
        if (Array.isArray(cfg.aiOptions)) {
            options = cfg.aiOptions;
        } else if (typeof cfg.aiPrompts === 'string' && cfg.aiPrompts.trim().length > 0) {
            options = cfg.aiPrompts.split(',').map(s => s.trim()).filter(Boolean).map(p => ({ label: p, prompt: p, icon: 'fas fa-magic' }));
        }
        if (!options || options.length === 0) return;
        const editor = this.container.querySelector('#runtime-rich-editor');
        if (!editor) return;
        const btns = this.container.querySelectorAll('.rich-ai-btn');
        if (!btns || btns.length === 0) return;
        btns.forEach(btn => {
            const idx = parseInt(btn.getAttribute('data-ai-index'), 10);
            const opt = options[idx];
            if (!opt) return;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // Extract plain text (loses HTML formatting)
                let content = editor.textContent || '';
                const combined = `${opt.label || ''} ${opt.prompt || ''}`.toLowerCase();
                let newContent = content;
                if (/uppercase/.test(combined)) {
                    newContent = content.toUpperCase();
                } else if (/lowercase/.test(combined)) {
                    newContent = content.toLowerCase();
                } else if (/bold/.test(combined)) {
                    // Bold: wrap entire content in <strong>
                    newContent = `<strong>${content}</strong>`;
                    editor.innerHTML = newContent;
                    return;
                } else if (/italic/.test(combined)) {
                    newContent = `<em>${content}</em>`;
                    editor.innerHTML = newContent;
                    return;
                } else if (/underline/.test(combined)) {
                    newContent = `<u>${content}</u>`;
                    editor.innerHTML = newContent;
                    return;
                } else if (/summarize|summary/.test(combined)) {
                    const words = content.trim().split(/\s+/);
                    const half = Math.max(1, Math.ceil(words.length * 0.5));
                    newContent = words.slice(0, half).join(' ');
                } else if (/reverse/.test(combined)) {
                    newContent = content.split('').reverse().join('');
                } else {
                    // Invert case
                    newContent = content.split('').map(ch => {
                        const lower = ch.toLowerCase();
                        const upper = ch.toUpperCase();
                        if (ch === lower) {
                            return upper;
                        } else {
                            return lower;
                        }
                    }).join('');
                }
                // Update content (strip formatting)
                editor.textContent = newContent;
            });
        });
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
     * Setup AI buttons for the table component.  Attaches click handlers
     * that perform simple transformations on the table data based on
     * keywords found in the option's label or prompt.  Supported actions
     * include sort (ascending), reverse row order, uppercase, lowercase,
     * and invert case.  If a keyword is not recognised, invert case is used.
     */
    setupTableAi(component) {
        const cfg = component.config || {};
        let options = [];
        if (Array.isArray(cfg.aiOptions)) {
            options = cfg.aiOptions;
        } else if (typeof cfg.aiPrompts === 'string' && cfg.aiPrompts.trim().length > 0) {
            options = cfg.aiPrompts.split(',').map(s => s.trim()).filter(Boolean).map(p => ({ label: p, prompt: p, icon: 'fas fa-magic' }));
        }
        if (!options || options.length === 0) return;
        const tableBody = this.container.querySelector('#runtime-table tbody');
        if (!tableBody) return;
        const btns = this.container.querySelectorAll('.table-ai-btn');
        if (!btns || btns.length === 0) return;
        // Helper to get current table data as array of arrays
        const getTableRows = () => {
            const rows = [];
            const trEls = tableBody.querySelectorAll('tr');
            trEls.forEach(tr => {
                const row = [];
                tr.querySelectorAll('td').forEach((td, ci) => {
                    const input = td.querySelector('input.table-cell-input');
                    if (input) {
                        row.push(input.value);
                    } else {
                        const span = td.querySelector('span.table-cell-display');
                        row.push(span ? span.textContent : '');
                    }
                });
                rows.push(row);
            });
            return rows;
        };
        const setTableRows = (rows) => {
            // Clear existing rows
            tableBody.innerHTML = '';
            const editable = cfg.editable !== false;
            const cols = Array.isArray(cfg.columns) ? cfg.columns : (typeof cfg.columns === 'string' ? cfg.columns.split(',').map(c => c.trim()).filter(Boolean) : []);
            rows.forEach(row => {
                const tr = document.createElement('tr');
                const cells = cols.map((col, ci) => {
                    const val = row[ci] != null ? row[ci] : '';
                    return `<td style="padding:4px 6px; border-bottom:1px solid rgba(255,255,255,0.05);">
                        ${editable ? `<input type="text" class="table-cell-input" data-col="${ci}" style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:4px 6px; border-radius:4px;" value="${val}" />` : `<span class="table-cell-display">${val}</span>`}
                    </td>`;
                }).join('');
                tr.innerHTML = cells;
                tableBody.appendChild(tr);
            });
        };
        btns.forEach(btn => {
            const idx = parseInt(btn.getAttribute('data-ai-index'), 10);
            const opt = options[idx];
            if (!opt) return;
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const combined = `${opt.label || ''} ${opt.prompt || ''}`.toLowerCase();
                let rows = getTableRows();
                if (/sort/.test(combined)) {
                    // Sort ascending by first column
                    rows.sort((a, b) => {
                        const aVal = (a[0] || '').toString().toLowerCase();
                        const bVal = (b[0] || '').toString().toLowerCase();
                        if (aVal < bVal) return -1;
                        if (aVal > bVal) return 1;
                        return 0;
                    });
                } else if (/reverse/.test(combined)) {
                    rows.reverse();
                } else if (/uppercase/.test(combined)) {
                    rows = rows.map(row => row.map(val => (val || '').toString().toUpperCase()));
                } else if (/lowercase/.test(combined)) {
                    rows = rows.map(row => row.map(val => (val || '').toString().toLowerCase()));
                } else {
                    // Invert case for all strings
                    rows = rows.map(row => row.map(val => {
                        const str = (val || '').toString();
                        return str.split('').map(ch => {
                            const lower = ch.toLowerCase();
                            const upper = ch.toUpperCase();
                            return ch === lower ? upper : lower;
                        }).join('');
                    }));
                }
                setTableRows(rows);
            });
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
     * Generate HTML for the data source import/export interface for a component.
     * The IDs include the component id to uniquely identify inputs.  This
     * section allows selecting a JSON file to import data from and exporting
     * the input back to a file.
     */
    getDataSourceHtml(component) {
        const id = component.id;
        const cfg = component.config || {};
        const allowImport = cfg.allowImport !== false;
        const allowExport = cfg.allowExport !== false;
        // If neither import nor export is allowed, omit the data source UI entirely.
        if (!allowImport && !allowExport) return '';
        // Build import and export sections conditionally.
        let importSection = '';
        let exportSection = '';
        if (allowImport) {
            importSection = `
                <select id="import-select-${id}" style="margin-right:4px; background:rgba(255,255,255,0.05); color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:4px;">
                    <option value="">-- Select file --</option>
                </select>
                <button class="btn-secondary" id="import-btn-${id}" style="margin-right:4px;">Import</button><br/>
            `;
        }
        if (allowExport) {
            exportSection = `
                <input type="text" id="export-name-${id}" placeholder="Export filename..." style="margin-top:4px; width:60%; background:rgba(255,255,255,0.05); color:#fff; border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:4px;" />
                <button class="btn-secondary" id="export-btn-${id}" style="margin-left:4px;">Export</button>
            `;
        }
        return `
            <div class="data-source" id="data-source-${id}" style="margin-bottom:8px; font-size:12px;">
                <label style="color: rgba(255,255,255,0.8);">Data Source</label><br/>
                ${importSection}
                ${exportSection}
            </div>
        `;
    }

    /**
     * Setup data import and export for input components.  This method
     * populates the import dropdown with available JSON files, applies
     * heuristics to import data into the component, and exports the
     * component's data to a new JSON file when requested.  The heuristics
     * attempt to extract appropriate data types from the JSON based on the
     * component type.
     */
    setupDataSource(component) {
        const id = component.id;
        const importSelect = this.container.querySelector(`#import-select-${id}`);
        const importBtn = this.container.querySelector(`#import-btn-${id}`);
        const exportBtn = this.container.querySelector(`#export-btn-${id}`);
        const exportName = this.container.querySelector(`#export-name-${id}`);
        // If neither import nor export sections exist, do nothing
        if (!importSelect && !exportBtn) return;
        // Populate available JSON files into the import dropdown, if present
        const populateFileList = () => {
            if (!importSelect) return;
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
            if (!Array.isArray(files)) return;
            importSelect.innerHTML = '<option value="">-- Select file --</option>';
            files.forEach(f => {
                // Accept any file; rely on heuristics to parse
                const value = typeof f === 'string' ? f : (f.id || f.name || '');
                const name = typeof f === 'string' ? f : (f.name || f.label || value);
                const option = document.createElement('option');
                option.value = value;
                option.textContent = name;
                importSelect.appendChild(option);
            });
        };
        populateFileList();
        // Helper functions for heuristics
        const findString = (obj) => {
            if (obj == null) return null;
            if (typeof obj === 'string') return obj;
            if (Array.isArray(obj)) {
                for (const v of obj) {
                    const found = findString(v);
                    if (found) return found;
                }
            } else if (typeof obj === 'object') {
                for (const key in obj) {
                    const found = findString(obj[key]);
                    if (found) return found;
                }
            }
            return null;
        };
        const findImageData = (obj) => {
            if (obj == null) return null;
            if (typeof obj === 'string' && /^data:image\//i.test(obj)) return obj;
            if (Array.isArray(obj)) {
                for (const v of obj) {
                    const found = findImageData(v);
                    if (found) return found;
                }
            } else if (typeof obj === 'object') {
                for (const key in obj) {
                    const val = obj[key];
                    if (typeof val === 'string' && /^data:image\//i.test(val)) return val;
                    const found = findImageData(val);
                    if (found) return found;
                }
            }
            return null;
        };
        const findTableData = (obj) => {
            if (Array.isArray(obj) && obj.length > 0 && (Array.isArray(obj[0]) || typeof obj[0] === 'object')) {
                return obj;
            }
            if (typeof obj === 'object' && obj !== null) {
                for (const key in obj) {
                    const found = findTableData(obj[key]);
                    if (found) return found;
                }
            }
            return null;
        };
        // Load JSON file content by file id
        const readJsonFile = (fileId) => {
            if (!fileId) return null;
            try {
                let content;
                if (typeof fileSystem.readFile === 'function') {
                    content = fileSystem.readFile(fileId);
                } else if (typeof fileSystem.getFileContent === 'function') {
                    content = fileSystem.getFileContent(fileId);
                } else if (typeof fileSystem.getFile === 'function') {
                    const f = fileSystem.getFile(fileId);
                    content = f ? (f.content || f.data || f.body) : null;
                } else if (Array.isArray(fileSystem.files)) {
                    const f = fileSystem.files.find(item => (typeof item === 'string' ? item === fileId : (item.id || item.name) === fileId));
                    content = f && typeof f !== 'string' ? (f.content || f.data || f.body) : null;
                }
                if (!content) return null;
                if (typeof content === 'string') {
                    try {
                        return JSON.parse(content);
                    } catch (err) {
                        console.warn('Invalid JSON content');
                        return null;
                    }
                }
                return content;
            } catch (err) {
                console.warn('Failed to read file', err);
                return null;
            }
        };
        // Import handler
        if (importBtn && importSelect) {
            importBtn.addEventListener('click', () => {
                const fileId = importSelect.value;
                if (!fileId) return;
                const data = readJsonFile(fileId);
                if (!data) return;
                // Determine target element and apply data based on type
                switch (component.type) {
                    case 'text-input': {
                        const value = findString(data);
                        const inputEl = this.container.querySelector('#runtime-text-input');
                        if (value && inputEl) inputEl.value = value;
                        break;
                    }
                    case 'rich-text': {
                        const value = findString(data);
                        const editor = this.container.querySelector('#runtime-rich-editor');
                        if (editor && value) editor.innerHTML = value;
                        break;
                    }
                    case 'canvas': {
                        const imgData = findImageData(data);
                        const canvas = this.container.querySelector('#runtime-canvas');
                        if (imgData && canvas) {
                            const ctx = canvas.getContext('2d');
                            const img = new Image();
                            img.onload = () => {
                                ctx.clearRect(0, 0, canvas.width, canvas.height);
                                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                // Save state for undo/redo if available
                                if (typeof this.canvasHistory !== 'undefined') {
                                    try {
                                        const dataURL = canvas.toDataURL();
                                        this.canvasHistory = [dataURL];
                                        this.historyIndex = 0;
                                    } catch {}
                                }
                            };
                            img.src = imgData;
                        }
                        break;
                    }
                    case 'table': {
                        const tableData = findTableData(data);
                        const tableBody = this.container.querySelector('#runtime-table tbody');
                        if (tableData && tableBody) {
                            // Clear existing rows
                            tableBody.innerHTML = '';
                            const cols = Array.isArray(component.config.columns) ? component.config.columns : (typeof component.config.columns === 'string' ? component.config.columns.split(',').map(c => c.trim()).filter(Boolean) : []);
                            tableData.forEach(row => {
                                const tr = document.createElement('tr');
                                // Determine if row is an array or object
                                if (Array.isArray(row)) {
                                    cols.forEach((col, ci) => {
                                        const cell = document.createElement('td');
                                        cell.style.padding = '4px 6px';
                                        cell.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                                        const value = row[ci] != null ? row[ci] : '';
                                        if (component.config.editable !== false) {
                                            cell.innerHTML = `<input type="text" class="table-cell-input" data-col="${ci}" style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:4px 6px; border-radius:4px;" value="${value}" />`;
                                        } else {
                                            cell.textContent = value;
                                        }
                                        tr.appendChild(cell);
                                    });
                                } else if (typeof row === 'object') {
                                    cols.forEach((col, ci) => {
                                        const cell = document.createElement('td');
                                        cell.style.padding = '4px 6px';
                                        cell.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                                        const value = row[col] != null ? row[col] : '';
                                        if (component.config.editable !== false) {
                                            cell.innerHTML = `<input type="text" class="table-cell-input" data-col="${ci}" style="width:100%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:#fff; padding:4px 6px; border-radius:4px;" value="${value}" />`;
                                        } else {
                                            cell.textContent = value;
                                        }
                                        tr.appendChild(cell);
                                    });
                                }
                                tableBody.appendChild(tr);
                            });
                        }
                        break;
                    }
                }
            });
        }
        // Export handler
        if (exportBtn && exportName) {
            exportBtn.addEventListener('click', () => {
                const filename = exportName.value.trim();
                if (!filename) {
                    NotificationManager && NotificationManager.error && NotificationManager.error('Please enter a filename for export');
                    return;
                }
                let data = null;
                switch (component.type) {
                    case 'text-input': {
                        const inputEl = this.container.querySelector('#runtime-text-input');
                        data = { text: inputEl ? inputEl.value : '' };
                        break;
                    }
                    case 'rich-text': {
                        const editor = this.container.querySelector('#runtime-rich-editor');
                        data = { html: editor ? editor.innerHTML : '' };
                        break;
                    }
                    case 'canvas': {
                        const canvas = this.container.querySelector('#runtime-canvas');
                        data = { image: canvas ? canvas.toDataURL() : '' };
                        break;
                    }
                    case 'table': {
                        const cfg = component.config || {};
                        const table = this.container.querySelector('#runtime-table');
                        const cols = Array.isArray(cfg.columns) ? cfg.columns : (typeof cfg.columns === 'string' ? cfg.columns.split(',').map(c => c.trim()).filter(Boolean) : []);
                        const rows = [];
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
                                rows.push(rowObj);
                            });
                        }
                        data = rows;
                        break;
                    }
                }
                if (data == null) return;
                try {
                    const fileContent = JSON.stringify(data);
                    if (typeof fileSystem !== 'undefined' && typeof fileSystem.createFile === 'function') {
                        fileSystem.createFile(filename, 'json', fileContent);
                        NotificationManager && NotificationManager.success && NotificationManager.success(`Exported data to ${filename}`);
                    }
                } catch (err) {
                    console.warn('Failed to export file', err);
                    NotificationManager && NotificationManager.error && NotificationManager.error('Failed to export data');
                }
            });
        }
    }

    /**
     * Automatically import data from a selected JSON file for data source
     * components.  This reads the file specified in component.config.fileId
     * using the fileSystem API, applies heuristics based on dataType (auto,
     * text, image, table) and stores the resulting value in the state.  Once
     * complete, the runtime advances to the next step without user input.
     */
    autoCompleteDataSource(component) {
        const cfg = component.config || {};
        const fileId = cfg.fileId;
        if (!fileId) {
            // Nothing to import; skip step
            this.state[component.id] = null;
            this.currentIndex++;
            this.renderCurrentStep();
            return;
        }
        // Define heuristics similar to setupDataSource
        const findString = (obj) => {
            if (obj == null) return null;
            if (typeof obj === 'string') return obj;
            if (Array.isArray(obj)) {
                for (const v of obj) {
                    const found = findString(v);
                    if (found) return found;
                }
            } else if (typeof obj === 'object') {
                for (const key in obj) {
                    const found = findString(obj[key]);
                    if (found) return found;
                }
            }
            return null;
        };
        const findImageData = (obj) => {
            if (obj == null) return null;
            if (typeof obj === 'string' && /^data:image\//i.test(obj)) return obj;
            if (Array.isArray(obj)) {
                for (const v of obj) {
                    const found = findImageData(v);
                    if (found) return found;
                }
            } else if (typeof obj === 'object') {
                for (const key in obj) {
                    const val = obj[key];
                    if (typeof val === 'string' && /^data:image\//i.test(val)) return val;
                    const found = findImageData(val);
                    if (found) return found;
                }
            }
            return null;
        };
        const findTableData = (obj) => {
            if (Array.isArray(obj) && obj.length > 0 && (Array.isArray(obj[0]) || typeof obj[0] === 'object')) {
                return obj;
            }
            if (typeof obj === 'object' && obj !== null) {
                for (const key in obj) {
                    const found = findTableData(obj[key]);
                    if (found) return found;
                }
            }
            return null;
        };
        // Read JSON file content similar to setupDataSource
        const readJsonFile = (fileId) => {
            if (!fileId) return null;
            try {
                let content;
                if (typeof fileSystem !== 'undefined') {
                    if (typeof fileSystem.readFile === 'function') {
                        content = fileSystem.readFile(fileId);
                    } else if (typeof fileSystem.getFileContent === 'function') {
                        content = fileSystem.getFileContent(fileId);
                    } else if (typeof fileSystem.getFile === 'function') {
                        const f = fileSystem.getFile(fileId);
                        content = f ? (f.content || f.data || f.body) : null;
                    } else if (Array.isArray(fileSystem.files)) {
                        const f = fileSystem.files.find(item => (typeof item === 'string' ? item === fileId : (item.id || item.name) === fileId));
                        content = f && typeof f !== 'string' ? (f.content || f.data || f.body) : null;
                    }
                }
                if (!content) return null;
                if (typeof content === 'string') {
                    try {
                        return JSON.parse(content);
                    } catch (err) {
                        console.warn('Invalid JSON content');
                        return null;
                    }
                }
                return content;
            } catch (err) {
                console.warn('Failed to read file', err);
                return null;
            }
        };
        const data = readJsonFile(fileId);
        let value = null;
        if (data != null) {
            const type = cfg.dataType || 'auto';
            if (type === 'text') {
                value = findString(data);
            } else if (type === 'image') {
                value = findImageData(data);
            } else if (type === 'table') {
                value = findTableData(data);
            } else {
                // auto: try string, then image, then table
                value = findString(data);
                if (!value) value = findImageData(data);
                if (!value) value = findTableData(data);
                if (!value) value = data;
            }
        }
        // Store value in state
        this.state[component.id] = value;
        // Advance to next step
        this.currentIndex++;
        this.renderCurrentStep();
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