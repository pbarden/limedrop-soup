// Modal Manager
class ModalManager {
    constructor() {
        this.overlay = document.getElementById('modal-overlay');
        this.activeModal = null;
        this.modalQueue = [];
    }

    alert(message, title = 'Alert', type = 'info') {
        return new Promise((resolve) => {
            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-times-circle',
                warning: 'fas fa-exclamation-triangle',
                info: 'fas fa-info-circle'
            };

            const modal = this.createModal(title);
            const template = document.getElementById('alert-modal-template');
            const content = template.content.cloneNode(true);
            
            const iconEl = content.querySelector('.modal-icon');
            iconEl.innerHTML = `<i class="${icons[type] || icons.info}"></i>`;
            content.querySelector('.modal-message').textContent = message;
            
            const okBtn = content.querySelector('.modal-ok');
            okBtn.addEventListener('click', () => {
                this.closeModal(modal);
                resolve();
            });
            
            modal.querySelector('.modal-body').appendChild(content);
            this.showModal(modal);
        });
    }

    confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const modal = this.createModal(title);
            const template = document.getElementById('confirm-modal-template');
            const content = template.content.cloneNode(true);
            
            content.querySelector('.modal-message').textContent = message;
            
            const confirmBtn = content.querySelector('.modal-confirm');
            const cancelBtn = content.querySelector('.modal-cancel');
            
            confirmBtn.addEventListener('click', () => {
                this.closeModal(modal);
                resolve(true);
            });
            
            cancelBtn.addEventListener('click', () => {
                this.closeModal(modal);
                resolve(false);
            });
            
            modal.querySelector('.modal-body').appendChild(content);
            this.showModal(modal);
        });
    }

    prompt(message, title = 'Input', defaultValue = '', placeholder = '') {
        return new Promise((resolve) => {
            const modal = this.createModal(title);
            const template = document.getElementById('prompt-modal-template');
            const content = template.content.cloneNode(true);
            
            content.querySelector('.modal-message').textContent = message;
            const input = content.querySelector('.modal-input');
            input.value = defaultValue;
            input.placeholder = placeholder || 'Enter value...';
            
            const okBtn = content.querySelector('.modal-ok');
            const cancelBtn = content.querySelector('.modal-cancel');
            
            const submit = () => {
                const value = input.value.trim();
                this.closeModal(modal);
                resolve(value || null);
            };
            
            okBtn.addEventListener('click', submit);
            cancelBtn.addEventListener('click', () => {
                this.closeModal(modal);
                resolve(null);
            });
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') submit();
            });
            
            modal.querySelector('.modal-body').appendChild(content);
            this.showModal(modal);
            
            // Focus input after modal is shown
            setTimeout(() => input.focus(), 100);
        });
    }

    form(title, fields) {
        return new Promise((resolve) => {
            const modal = this.createModal(title);
            const template = document.getElementById('form-modal-template');
            const content = template.content.cloneNode(true);
            const form = content.querySelector('.modal-form');
            
            // Build form fields
            fields.forEach(field => {
                const group = document.createElement('div');
                group.className = 'modal-form-group';
                
                const label = document.createElement('label');
                label.textContent = field.label;
                group.appendChild(label);
                
                let input;
                if (field.type === 'select') {
                    input = document.createElement('select');
                    field.options.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt.value || opt;
                        option.textContent = opt.label || opt;
                        if (field.default === option.value) {
                            option.selected = true;
                        }
                        input.appendChild(option);
                    });
                } else if (field.type === 'textarea') {
                    input = document.createElement('textarea');
                    input.rows = field.rows || 3;
                } else {
                    input = document.createElement('input');
                    input.type = field.type || 'text';
                }
                
                input.name = field.name;
                input.placeholder = field.placeholder || '';
                if (field.default) input.value = field.default;
                if (field.required) input.required = true;
                
                group.appendChild(input);
                
                if (field.hint) {
                    const hint = document.createElement('div');
                    hint.className = 'form-hint';
                    hint.textContent = field.hint;
                    group.appendChild(hint);
                }
                
                form.appendChild(group);
            });
            
            const submitBtn = content.querySelector('.modal-submit');
            const cancelBtn = content.querySelector('.modal-cancel');
            
            submitBtn.addEventListener('click', () => {
                const data = {};
                const formData = new FormData(form);
                for (let [key, value] of formData.entries()) {
                    data[key] = value;
                }
                
                // Validate required fields
                const requiredFields = fields.filter(f => f.required);
                for (let field of requiredFields) {
                    if (!data[field.name] || data[field.name].trim() === '') {
                        NotificationManager.show(`${field.label} is required`, 'error');
                        return;
                    }
                }
                
                this.closeModal(modal);
                resolve(data);
            });
            
            cancelBtn.addEventListener('click', () => {
                this.closeModal(modal);
                resolve(null);
            });
            
            modal.querySelector('.modal-body').appendChild(content);
            this.showModal(modal);
            
            // Focus first input
            setTimeout(() => {
                const firstInput = form.querySelector('input, select, textarea');
                if (firstInput) firstInput.focus();
            }, 100);
        });
    }

    loading(message = 'Loading...', title = 'Please Wait') {
        const modal = this.createModal(title);
        modal.querySelector('.modal-close').style.display = 'none';
        
        const content = document.createElement('div');
        content.className = 'modal-loading';
        content.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="modal-loading-text">${message}</div>
        `;
        
        modal.querySelector('.modal-body').appendChild(content);
        modal.querySelector('.modal-footer').style.display = 'none';
        
        this.showModal(modal);
        
        return {
            update: (newMessage) => {
                content.querySelector('.modal-loading-text').textContent = newMessage;
            },
            close: () => {
                this.closeModal(modal);
            }
        };
    }

    createModal(title) {
        const template = document.getElementById('modal-template');
        const modal = template.content.cloneNode(true).querySelector('.modal');
        
        modal.querySelector('.modal-title').textContent = title;
        modal.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal(modal);
        });
        
        document.body.appendChild(modal);
        return modal;
    }

    showModal(modal) {
        this.activeModal = modal;
        this.overlay.classList.add('active');
        setTimeout(() => modal.classList.add('active'), 10);
        
        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape' && this.activeModal === modal) {
                this.closeModal(modal);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    closeModal(modal) {
        modal.classList.remove('active');
        this.overlay.classList.remove('active');
        
        setTimeout(() => {
            modal.remove();
            this.activeModal = null;
        }, 300);
    }
}

// Notification Manager
