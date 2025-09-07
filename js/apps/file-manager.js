// File Manager Component
class FileManager {
    constructor(windowEl) {
        this.windowEl = windowEl;
        this.selectedFile = null;
        this.selectedType = 'default';
        this.init();
    }

    init() {
        // Find the content that was loaded from the template
        const content = this.windowEl.querySelector('.window-content');
        if (!content) {
            console.error('No window content found');
            return;
        }

        // Check if content is already populated from template
        let fileManagerEl = content.querySelector('.file-manager');
        if (!fileManagerEl) {
            // Fallback: create content if template didn't load
            console.warn('File Manager template not found, creating content manually');
            this.createContent(content);
            fileManagerEl = content.querySelector('.file-manager');
        }

        if (fileManagerEl) {
            this.renderFileTypes();
            this.renderFiles();
            this.attachEvents();
        }
    }

    createContent(container) {
        // Fallback content creation if template fails
        container.innerHTML = `
            <div class="file-manager">
                <div class="file-manager-header">
                    <h2>File Manager</h2>
                    <div class="file-manager-controls">
                        <button class="btn-secondary new-file">New File</button>
                        <button class="btn-secondary new-type">New Type</button>
                        <button class="btn-secondary import-file">Import</button>
                        <button class="btn-primary export-file">Export</button>
                    </div>
                </div>
                <div class="file-manager-body">
                    <div class="file-types-panel">
                        <h3>File Types</h3>
                        <div class="file-types-list" id="file-types-list"></div>
                    </div>
                    <div class="files-panel">
                        <h3>Files</h3>
                        <div class="files-grid" id="files-grid"></div>
                    </div>
                    <div class="file-preview-panel">
                        <h3>Preview</h3>
                        <div class="file-preview-content" id="file-preview-content">
                            <p class="preview-placeholder">Select a file to preview</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderFileTypes() {
        const container = this.windowEl.querySelector('#file-types-list');
        container.innerHTML = '';
        
        fileSystem.fileTypes.forEach((type, typeId) => {
            const item = document.createElement('div');
            item.className = 'file-type-item';
            if (typeId === this.selectedType) {
                item.classList.add('active');
            }
            item.dataset.type = typeId;
            
            item.innerHTML = `
                <span class="file-type-icon"><i class="${type.icon}"></i></span>
                <span>${type.name}</span>
            `;
            
            item.addEventListener('click', () => {
                this.selectedType = typeId;
                this.renderFileTypes();
                this.renderFiles();
            });
            
            container.appendChild(item);
        });
    }

    renderFiles() {
        const container = this.windowEl.querySelector('#files-grid');
        const files = this.selectedType === 'all' 
            ? fileSystem.getAllFiles() 
            : fileSystem.getFilesByType(this.selectedType);
        
        if (files.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: rgba(255,255,255,0.5);">No files</p>';
            return;
        }
        
        container.innerHTML = '';
        
        files.forEach(file => {
            const item = document.createElement('div');
            item.className = 'file-item';
            if (file.id === this.selectedFile?.id) {
                item.classList.add('selected');
            }
            
            const type = fileSystem.fileTypes.get(file.type);
            item.innerHTML = `
                <div class="file-icon"><i class="${type?.icon || 'fas fa-file'}"></i></div>
                <div class="file-name">${file.name}</div>
            `;
            
            item.addEventListener('click', () => {
                this.selectFile(file);
            });
            
            item.addEventListener('dblclick', () => {
                this.openFile(file);
            });
            
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showFileContextMenu(e, file);
            });
            
            container.appendChild(item);
        });
    }

    selectFile(file) {
        this.selectedFile = file;
        this.renderFiles();
        this.renderPreview();
    }

    renderPreview() {
        const container = this.windowEl.querySelector('#file-preview-content');
        
        if (!this.selectedFile) {
            container.innerHTML = '<p class="preview-placeholder">Select a file to preview</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="file-details">
                <p><strong>Name:</strong> ${this.selectedFile.name}</p>
                <p><strong>Type:</strong> ${this.selectedFile.type}</p>
                <p><strong>Created:</strong> ${new Date(this.selectedFile.created).toLocaleString()}</p>
                <p><strong>Modified:</strong> ${new Date(this.selectedFile.modified).toLocaleString()}</p>
                <hr style="margin: 10px 0; border-color: rgba(255,255,255,0.1);">
                <p><strong>Data:</strong></p>
                <pre>${JSON.stringify(this.selectedFile.data, null, 2)}</pre>
            </div>
        `;
    }

    openFile(file) {
        if (file.type === 'app') {
            // Find or create app
            let appId = null;
            appRegistry.userApps.forEach((app, id) => {
                if (JSON.stringify(app) === JSON.stringify(file.data)) {
                    appId = id;
                }
            });
            
            if (!appId) {
                appId = appRegistry.registerUserApp(file.data);
            }
            
            appRegistry.launchApp(appId);
        }
    }

    attachEvents() {
        const newFileBtn = this.windowEl.querySelector('.new-file');
        const newTypeBtn = this.windowEl.querySelector('.new-type');
        const importBtn = this.windowEl.querySelector('.import-file');
        const exportBtn = this.windowEl.querySelector('.export-file');
        
        newFileBtn.addEventListener('click', () => this.createNewFile());
        newTypeBtn.addEventListener('click', () => this.createNewType());
        importBtn.addEventListener('click', () => this.importFile());
        exportBtn.addEventListener('click', () => this.exportFile());
    }

    async createNewFile() {
        const types = Array.from(fileSystem.fileTypes.entries()).map(([id, type]) => ({
            value: id,
            label: type.name,
            schema: type.schema
        }));
        
        const modal = modalManager.createModal('Create New File');
        const body = modal.querySelector('.modal-body');
        
        body.innerHTML = `
            <div class="modal-content">
                <form class="modal-form">
                    <div class="modal-form-group">
                        <label>File Name</label>
                        <input type="text" name="name" placeholder="Enter file name" required>
                    </div>
                    <div class="modal-form-group">
                        <label>File Type</label>
                        <select name="type" id="file-type-select">
                            ${types.map(t => `<option value="${t.value}" data-schema='${JSON.stringify(t.schema || {})}'>${t.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="modal-form-group">
                        <label>Content</label>
                        <div id="dynamic-content-form">
                            <!-- Dynamic form will be inserted here based on schema -->
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary modal-cancel">Cancel</button>
                <button class="btn-primary modal-submit">Create</button>
            </div>
        `;
        
        const typeSelect = body.querySelector('#file-type-select');
        const dynamicForm = body.querySelector('#dynamic-content-form');
        
        const renderDynamicForm = (schema) => {
            dynamicForm.innerHTML = '';
            
            if (!schema || Object.keys(schema).length === 0) {
                // Default JSON textarea for types without schema
                dynamicForm.innerHTML = `
                    <textarea name="content" rows="5" placeholder='{\n  "key": "value"\n}'>{\n  \n}</textarea>
                `;
                return;
            }
            
            // Create form fields based on schema
            Object.entries(schema).forEach(([fieldName, fieldType]) => {
                const fieldDiv = document.createElement('div');
                fieldDiv.className = 'modal-form-group';
                
                let inputHtml = '';
                switch (fieldType) {
                    case 'text':
                    case 'email':
                    case 'url':
                        inputHtml = `<input type="${fieldType}" name="field_${fieldName}" placeholder="Enter ${fieldName}">`;
                        break;
                    case 'richtext':
                        inputHtml = `<textarea name="field_${fieldName}" rows="4" placeholder="Enter ${fieldName}"></textarea>`;
                        break;
                    case 'number':
                        inputHtml = `<input type="number" name="field_${fieldName}" placeholder="Enter ${fieldName}">`;
                        break;
                    case 'date':
                        inputHtml = `<input type="date" name="field_${fieldName}">`;
                        break;
                    case 'boolean':
                        inputHtml = `<input type="checkbox" name="field_${fieldName}">`;
                        break;
                    case 'image':
                    case 'file':
                        inputHtml = `<input type="file" name="field_${fieldName}" ${fieldType === 'image' ? 'accept="image/*"' : ''}>`;
                        break;
                    default:
                        inputHtml = `<input type="text" name="field_${fieldName}" placeholder="Enter ${fieldName}">`;
                }
                
                fieldDiv.innerHTML = `
                    <label>${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}</label>
                    ${inputHtml}
                `;
                
                dynamicForm.appendChild(fieldDiv);
            });
        };
        
        // Initial render
        const initialOption = typeSelect.options[typeSelect.selectedIndex];
        const initialSchema = JSON.parse(initialOption.dataset.schema || '{}');
        renderDynamicForm(initialSchema);
        
        // Update form when type changes
        typeSelect.addEventListener('change', () => {
            const selectedOption = typeSelect.options[typeSelect.selectedIndex];
            const schema = JSON.parse(selectedOption.dataset.schema || '{}');
            renderDynamicForm(schema);
        });
        
        modalManager.showModal(modal);
        
        return new Promise((resolve) => {
            const submitBtn = body.querySelector('.modal-submit');
            const cancelBtn = body.querySelector('.modal-cancel');
            const form = body.querySelector('.modal-form');
            
            submitBtn.addEventListener('click', () => {
                const formData = new FormData(form);
                const data = {};
                const content = {};
                
                for (let [key, value] of formData.entries()) {
                    if (key.startsWith('field_')) {
                        const fieldName = key.replace('field_', '');
                        // Handle file uploads
                        if (value instanceof File && value.size > 0) {
                            const reader = new FileReader();
                            reader.onload = function(e) {
                                content[fieldName] = e.target.result;
                            };
                            reader.readAsDataURL(value);
                        } else {
                            content[fieldName] = value;
                        }
                    } else {
                        data[key] = value;
                    }
                }
                
                if (!data.name || data.name.trim() === '') {
                    NotificationManager.error('File name is required');
                    return;
                }
                
                // Use schema-based content or fallback to JSON
                const finalContent = Object.keys(content).length > 0 ? content : 
                                    (data.content ? JSON.parse(data.content) : {});
                
                try {
                    const fileId = fileSystem.createFile(data.name, data.type, finalContent);
                    this.selectedType = data.type;
                    this.renderFileTypes();
                    this.renderFiles();
                    NotificationManager.success(`File "${data.name}" created successfully`);
                    modalManager.closeModal(modal);
                    resolve(data);
                } catch (error) {
                    NotificationManager.error('Failed to create file: ' + error.message);
                }
            });
            
            cancelBtn.addEventListener('click', () => {
                modalManager.closeModal(modal);
                resolve(null);
            });
        });
    }

    async createNewType() {
        const modal = modalManager.createModal('Create New File Type');
        const body = modal.querySelector('.modal-body');
        
        // Enhanced form with schema builder
        body.innerHTML = `
            <div class="modal-content">
                <form class="modal-form">
                    <div class="modal-form-group">
                        <label>Type Name</label>
                        <input type="text" name="name" placeholder="e.g., Invoice, Report" required>
                    </div>
                    <div class="modal-form-group">
                        <label>Icon</label>
                        <div id="type-icon-picker"></div>
                    </div>
                    <div class="modal-form-group">
                        <label>Description</label>
                        <textarea name="description" rows="2" placeholder="Describe this file type..."></textarea>
                    </div>
                    <div class="modal-form-group">
                        <label>Fields Schema</label>
                        <div class="schema-builder">
                            <div id="schema-fields"></div>
                            <button type="button" class="schema-add-field">
                                <i class="fas fa-plus"></i>
                                Add Field
                            </button>
                            <div class="schema-preview">
                                <strong>Preview:</strong>
                                <pre id="schema-preview-content">{}</pre>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary modal-cancel">Cancel</button>
                <button class="btn-primary modal-submit">Create</button>
            </div>
        `;
        
        // Initialize icon picker
        const iconPickerContainer = body.querySelector('#type-icon-picker');
        const iconPicker = new IconPicker(iconPickerContainer, 'fas fa-file');
        
        // Schema builder functionality
        const schemaFields = body.querySelector('#schema-fields');
        const addFieldBtn = body.querySelector('.schema-add-field');
        const previewContent = body.querySelector('#schema-preview-content');
        
        let fields = [];
        
        const availableTypes = [
            { value: 'text', label: 'Text' },
            { value: 'richtext', label: 'Rich Text' },
            { value: 'number', label: 'Number' },
            { value: 'boolean', label: 'Boolean' },
            { value: 'date', label: 'Date' },
            { value: 'image', label: 'Image' },
            { value: 'file', label: 'File' },
            { value: 'url', label: 'URL' },
            { value: 'email', label: 'Email' },
            { value: 'array', label: 'Array' },
            { value: 'object', label: 'Object' }
        ];
        
        const renderFields = () => {
            schemaFields.innerHTML = '';
            
            fields.forEach((field, index) => {
                const fieldDiv = document.createElement('div');
                fieldDiv.className = 'schema-field';
                fieldDiv.innerHTML = `
                    <input type="text" 
                        class="schema-field-name" 
                        placeholder="Field name" 
                        value="${field.name}"
                        data-index="${index}">
                    <select class="schema-field-type" data-index="${index}">
                        ${availableTypes.map(type => 
                            `<option value="${type.value}" ${field.type === type.value ? 'selected' : ''}>${type.label}</option>`
                        ).join('')}
                    </select>
                    <button type="button" class="schema-field-remove" data-index="${index}">×</button>
                `;
                schemaFields.appendChild(fieldDiv);
            });
            
            updatePreview();
        };
        
        const updatePreview = () => {
            const schema = {};
            fields.forEach(field => {
                if (field.name.trim()) {
                    schema[field.name] = field.type;
                }
            });
            previewContent.textContent = JSON.stringify(schema, null, 2);
        };
        
        const addField = () => {
            fields.push({ name: '', type: 'text' });
            renderFields();
        };
        
        const removeField = (index) => {
            fields.splice(index, 1);
            renderFields();
        };
        
        const updateField = (index, property, value) => {
            if (fields[index]) {
                fields[index][property] = value;
                updatePreview();
            }
        };
        
        // Event listeners
        addFieldBtn.addEventListener('click', addField);
        
        schemaFields.addEventListener('click', (e) => {
            if (e.target.classList.contains('schema-field-remove')) {
                const index = parseInt(e.target.dataset.index);
                removeField(index);
            }
        });
        
        schemaFields.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (e.target.classList.contains('schema-field-name')) {
                updateField(index, 'name', e.target.value);
            }
        });
        
        schemaFields.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            if (e.target.classList.contains('schema-field-type')) {
                updateField(index, 'type', e.target.value);
            }
        });
        
        // Add some default fields to start
        addField();
        
        modalManager.showModal(modal);
        
        return new Promise((resolve) => {
            const submitBtn = body.querySelector('.modal-submit');
            const cancelBtn = body.querySelector('.modal-cancel');
            const form = body.querySelector('.modal-form');
            
            submitBtn.addEventListener('click', () => {
                const formData = new FormData(form);
                const data = {};
                for (let [key, value] of formData.entries()) {
                    data[key] = value;
                }
                
                if (!data.name || data.name.trim() === '') {
                    NotificationManager.error('Type name is required');
                    return;
                }
                
                if (fields.length === 0 || !fields.some(f => f.name.trim())) {
                    NotificationManager.error('At least one field is required');
                    return;
                }
                
                // Build schema from fields
                const schema = {};
                fields.forEach(field => {
                    if (field.name.trim()) {
                        schema[field.name.trim()] = field.type;
                    }
                });
                
                data.icon = iconPicker.getValue();
                data.schema = schema;
                
                modalManager.closeModal(modal);
                
                const typeId = data.name.toLowerCase().replace(/\s+/g, '-');
                
                fileSystem.registerType(typeId, {
                    name: data.name,
                    icon: data.icon,
                    description: data.description || '',
                    schema: schema
                });
                
                this.renderFileTypes();
                NotificationManager.success(`File type "${data.name}" created successfully`);
                
                resolve(data);
            });
            
            cancelBtn.addEventListener('click', () => {
                modalManager.closeModal(modal);
                resolve(null);
            });
        });
    }

    importFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const fileId = fileSystem.importFile(e.target.result);
                if (fileId) {
                    this.renderFiles();
                    NotificationManager.success('File imported successfully');
                } else {
                    NotificationManager.error('Import failed. Invalid file format.');
                }
            };
            reader.readAsText(file);
        });
        
        input.click();
    }

    async exportFile() {
        if (!this.selectedFile) {
            NotificationManager.warning('Please select a file to export');
            return;
        }
        
        fileSystem.exportFile(this.selectedFile.id);
        NotificationManager.info(`Exported "${this.selectedFile.name}"`);
    }

    async showFileContextMenu(e, file) {
        // Remove any existing context menu
        const existing = document.querySelector('.context-menu.active');
        if (existing) existing.remove();
        
        const menu = document.createElement('div');
        menu.className = 'context-menu active';
        
        const items = [
            { label: 'Open', action: () => this.openFile(file) },
            { label: 'Rename', action: () => this.renameFile(file) },
            { label: 'Duplicate', action: () => this.duplicateFile(file) },
            { separator: true },
            { label: 'Export', action: () => {
                fileSystem.exportFile(file.id);
                NotificationManager.info(`Exported "${file.name}"`);
            }},
            { label: 'Delete', action: () => this.deleteFile(file) }
        ];
        
        items.forEach(item => {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.className = 'context-menu-separator';
                menu.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';
                menuItem.textContent = item.label;
                menuItem.addEventListener('click', () => {
                    menu.remove();
                    item.action();
                });
                menu.appendChild(menuItem);
            }
        });
        
        document.body.appendChild(menu);
        
        // Position menu and ensure it stays on screen
        const rect = menu.getBoundingClientRect();
        let x = e.clientX;
        let y = e.clientY;
        
        if (x + rect.width > window.innerWidth) {
            x = window.innerWidth - rect.width - 10;
        }
        if (y + rect.height > window.innerHeight) {
            y = window.innerHeight - rect.height - 10;
        }
        
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        
        // Close on outside click
        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    }

    async renameFile(file) {
        const newName = await modalManager.prompt(
            'Enter new name for the file:',
            'Rename File',
            file.name
        );
        
        if (newName && newName !== file.name) {
            file.name = newName;
            file.modified = new Date().toISOString();
            fileSystem.saveToStorage();
            this.renderFiles();
            NotificationManager.success(`File renamed to "${newName}"`);
        }
    }

    duplicateFile(file) {
        const newFile = {
            ...file,
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `${file.name} (Copy)`,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        fileSystem.files.set(newFile.id, newFile);
        fileSystem.saveToStorage();
        this.renderFiles();
        NotificationManager.success(`File duplicated as "${newFile.name}"`);
    }

    async deleteFile(file) {
        const confirmed = await modalManager.confirm(
            `Are you sure you want to delete "${file.name}"?`,
            'Delete File'
        );
        
        if (confirmed) {
            fileSystem.deleteFile(file.id);
            if (this.selectedFile?.id === file.id) {
                this.selectedFile = null;
                this.renderPreview();
            }
            this.renderFiles();
            NotificationManager.success('File deleted');
        }
    }
}

// Settings Component
