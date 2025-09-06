// App Runtime for executing user apps
class AppRuntime {
    constructor(appDefinition, container) {
        this.app = appDefinition;
        this.container = container;
        this.state = {};
        this.currentStep = 0;
    }

    render() {
        this.container.innerHTML = `
            <div class="app-runtime">
                <div class="runtime-header">
                    <h3>${this.app.name}</h3>
                    <div class="runtime-progress">
                        Step ${this.currentStep + 1} of ${this.app.components.length}
                    </div>
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

    attachEvents() {
        const backBtn = this.container.querySelector('#runtime-back');
        const nextBtn = this.container.querySelector('#runtime-next');
        
        backBtn.addEventListener('click', () => this.previousStep());
        nextBtn.addEventListener('click', () => this.nextStep());
    }

    renderCurrentStep() {
        const content = this.container.querySelector('#runtime-content');
        const component = this.app.components[this.currentStep];
        
        if (!component) {
            content.innerHTML = '<p>App completed!</p>';
            return;
        }
        
        content.innerHTML = this.renderComponent(component);
        
        // Update button states
        const backBtn = this.container.querySelector('#runtime-back');
        const nextBtn = this.container.querySelector('#runtime-next');
        
        backBtn.disabled = this.currentStep === 0;
        nextBtn.textContent = this.currentStep === this.app.components.length - 1 ? 'Finish' : 'Next';
        
        // Update progress
        const progress = this.container.querySelector('.runtime-progress');
        progress.textContent = `Step ${this.currentStep + 1} of ${this.app.components.length}`;
    }

    renderComponent(component) {
        switch (component.type) {
            case 'text-input':
                return `
                    <div class="runtime-component">
                        <label>${component.config.label || 'Text Input'}</label>
                        <input type="text"
