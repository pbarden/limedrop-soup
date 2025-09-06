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
            case 'text-input':
                return `
                    <label>${component.config.label || 'Text Input'}</label><br/>
                    <input type="text" id="runtime-text-input" placeholder="${component.config.placeholder || ''}"/><br/>
                    <button class="btn-primary" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                `;
            case 'file-upload':
                return `
                    <label>${component.config.label || 'Upload File'}</label><br/>
                    <input type="file" id="runtime-file-upload" accept="${component.config.accept || '*'}"/><br/><br/>
                    <button class="btn-primary" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                `;
            case 'canvas':
                return `
                    <label>${component.config.label || 'Drawing Canvas'}</label><br/>
                    <canvas id="runtime-canvas" width="${component.config.width || 400}" height="${component.config.height || 300}" style="border:1px solid #ccc;"></canvas><br/>
                    ${component.config.editable === false ? '' : '<small>Use your mouse to draw.</small><br/>'}
                    <button class="btn-primary" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                `;
            case 'rich-text':
                return `
                    <label>${component.config.label || 'Rich Text Editor'}</label><br/>
                    <textarea id="runtime-rich-text" rows="6"></textarea><br/>
                    <button class="btn-primary" onclick="__runtimeInstance.completeCurrentStep()">Continue</button>
                `;
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
                const fileEl = document.getElementById('runtime-file-upload');
                value = fileEl && fileEl.files && fileEl.files.length > 0 ? fileEl.files[0] : null;
                break;
            case 'canvas':
                const canvasEl = document.getElementById('runtime-canvas');
                value = canvasEl ? canvasEl.toDataURL() : null;
                break;
            case 'rich-text':
                const richEl = document.getElementById('runtime-rich-text');
                value = richEl ? richEl.value : null;
                break;
            default:
                value = null;
        }
        this.state[component.id] = value;
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