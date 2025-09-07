// File System Manager
class FileSystem {
    constructor() {
        this.files = new Map();
        this.fileTypes = new Map();
        this.loadFromStorage();
        this.initDefaultTypes();
    }

    initDefaultTypes() {
        if (!this.fileTypes.has('default')) {
            this.registerType('default', {
                name: 'Default',
                icon: 'fas fa-file',
                schema: {}
            });
        }
        
        this.registerType('app', {
            name: 'Application',
            icon: 'fas fa-rocket',
            schema: {
                name: 'string',
                icon: 'string',
                components: 'array'
            }
        });
        
        this.registerType('text', {
            name: 'Text Document',
            icon: 'fas fa-file-alt',
            schema: {
                content: 'string'
            }
        });
        
        this.registerType('canvas', {
            name: 'Canvas Drawing',
            icon: 'fas fa-paint-brush',
            schema: {
                imageData: 'string',
                width: 'number',
                height: 'number'
            }
        });
    }

    registerType(typeId, typeDefinition) {
        this.fileTypes.set(typeId, typeDefinition);
        this.saveToStorage();
    }

    createFile(name, type, data) {
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const file = {
            id: fileId,
            name: name,
            type: type,
            data: data,
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };
        
        this.files.set(fileId, file);
        this.saveToStorage();
        eventBus.emit('file-created', file);
        return fileId;
    }

    updateFile(fileId, data) {
        const file = this.files.get(fileId);
        if (!file) return false;
        
        file.data = data;
        file.modified = new Date().toISOString();
        this.saveToStorage();
        eventBus.emit('file-updated', file);
        return true;
    }

    deleteFile(fileId) {
        const file = this.files.get(fileId);
        if (!file) return false;
        
        this.files.delete(fileId);
        this.saveToStorage();
        eventBus.emit('file-deleted', file);
        return true;
    }

    getFile(fileId) {
        return this.files.get(fileId);
    }

    getFilesByType(type) {
        return Array.from(this.files.values()).filter(file => file.type === type);
    }

    getAllFiles() {
        return Array.from(this.files.values());
    }

    validateData(type, data) {
        const typeDefinition = this.fileTypes.get(type);
        if (!typeDefinition || !typeDefinition.schema) return true;
        
        for (const [key, expectedType] of Object.entries(typeDefinition.schema)) {
            if (!(key in data)) return false;
            
            const actualType = Array.isArray(data[key]) ? 'array' : typeof data[key];
            if (actualType !== expectedType) return false;
        }
        
        return true;
    }

    exportFile(fileId) {
        const file = this.files.get(fileId);
        if (!file) return null;
        
        const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file.name}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importFile(fileData) {
        try {
            const file = JSON.parse(fileData);
            if (!file.name || !file.type || !file.data) {
                throw new Error('Invalid file format');
            }
            
            if (!this.validateData(file.type, file.data)) {
                throw new Error('File data does not match type schema');
            }
            
            return this.createFile(file.name, file.type, file.data);
        } catch (error) {
            console.error('Import failed:', error);
            return null;
        }
    }

    saveToStorage() {
        try {
            const data = {
                files: Array.from(this.files.entries()),
                fileTypes: Array.from(this.fileTypes.entries())
            };
            const serialized = JSON.stringify(data);
            localStorage.setItem('limedrop-filesystem', serialized);
        } catch (error) {
            console.error('Failed to save filesystem to storage:', error);
            // Try to save a simplified version
            try {
                const simpleData = {
                    files: [],
                    fileTypes: Array.from(this.fileTypes.entries())
                };
                localStorage.setItem('limedrop-filesystem', JSON.stringify(simpleData));
                console.warn('Saved simplified filesystem data');
            } catch (fallbackError) {
                console.error('Failed to save even simplified data:', fallbackError);
            }
        }
    }

    // In file-system.js, improve loadFromStorage method:
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('limedrop-filesystem');
            if (stored) {
                const data = JSON.parse(stored);
                
                // Validate data structure
                if (data && typeof data === 'object') {
                    if (Array.isArray(data.files)) {
                        this.files = new Map(data.files);
                    } else {
                        console.warn('Invalid files data in storage');
                        this.files = new Map();
                    }
                    
                    if (Array.isArray(data.fileTypes)) {
                        this.fileTypes = new Map(data.fileTypes);
                    } else {
                        console.warn('Invalid fileTypes data in storage');
                        // Keep current fileTypes if invalid
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load filesystem from storage:', error);
            // Initialize with defaults
            this.files = new Map();
            // Don't reset fileTypes as they might have been initialized
        }
    }
}

// App Registry
