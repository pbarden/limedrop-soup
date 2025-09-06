// File Manager Component
class FileManager {
    constructor(windowEl) {
        this.windowEl = windowEl;
        this.selectedFile = null;
        this.selectedType = 'default';
        this.init();
    }

    init() {
        this.renderFileTypes();
        this.renderFiles();
        this.attachEvents();
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
            label: type.name
        }));
        
        const modal = modalManager.createModal('Create New File');
        const body = modal.querySelector('.modal-body');
        
        // Create custom form with icon picker
        body.innerHTML = `
            <div class="modal-content">
                <form class="modal-form">
                    <div class="modal-form-group">
                        <label>File Name</label>
                        <input type="text" name="name" placeholder="Enter file name" required>
                    </div>
                    <div class="modal-form-group">
                        <label>File Type</label>
                        <select name="type">
                            ${types.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="modal-form-group">
                        <label>Initial Content (JSON)</label>
                        <textarea name="content" rows="5" placeholder='{\n  "key": "value"\n}'>{\n  \n}</textarea>
                    </div>
                </form>
            </div>
            <div class="modal-actions">
                <button class="btn-secondary modal-cancel">Cancel</button>
                <button class="btn-primary modal-submit">Create</button>
            </div>
        `;
        
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
                    NotificationManager.error('File name is required');
                    return;
                }
                
                try {
                    const content = JSON.parse(data.content);
                    const fileId = fileSystem.createFile(data.name, data.type, content);
                    this.selectedType = data.type;
                    this.renderFileTypes();
                    this.renderFiles();
                    NotificationManager.success(`File "${data.name}" created successfully`);
                    modalManager.closeModal(modal);
                    resolve(data);
                } catch (error) {
                    NotificationManager.error('Invalid JSON data. Please check your input.');
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
        
        // Create custom form with icon picker
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
                        <textarea name="description" rows="3" placeholder="Describe this file type..."></textarea>
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
                
                data.icon = iconPicker.getValue();
                
                modalManager.closeModal(modal);
                
                const typeId = data.name.toLowerCase().replace(/\s+/g, '-');
                
                fileSystem.registerType(typeId, {
                    name: data.name,
                    icon: data.icon,
                    description: data.description,
                    schema: {}
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
