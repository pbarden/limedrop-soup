// Icon Picker Component
class IconPicker {
    constructor(container, defaultIcon = 'fas fa-cube', onChange = null) {
        this.container = container;
        this.selectedIcon = defaultIcon;
        this.onChange = onChange;
        this.isOpen = false;
        this.searchTerm = '';
        this.selectedCategory = 'all';
        
        // Curated icon library with categories
        this.icons = {
            files: [
                'fas fa-file', 'fas fa-file-alt', 'fas fa-file-pdf', 'fas fa-file-word',
                'fas fa-file-excel', 'fas fa-file-powerpoint', 'fas fa-file-image', 'fas fa-file-video',
                'fas fa-file-audio', 'fas fa-file-code', 'fas fa-file-archive', 'fas fa-file-csv', 
                'fas fa-file-invoice', 'fas fa-folder', 'fas fa-folder-open', 'fas fa-folder-plus'
            ],
            edit: [
                'fas fa-edit', 'fas fa-pen', 'fas fa-pen-nib', 'fas fa-pencil-alt', 'fas fa-eraser',
                'fas fa-save', 'fas fa-trash', 'fas fa-copy', 'fas fa-paste', 'fas fa-cut',
                'fas fa-undo', 'fas fa-redo', 'fas fa-sticky-note', 'fas fa-book'
            ],
            user: [
                'fas fa-user', 'fas fa-users', 'fas fa-user-secret', 'fas fa-user-circle',
                'fas fa-user-plus', 'fas fa-user-minus', 'fas fa-user-check', 'fas fa-user-times',
                'fas fa-id-card', 'fas fa-id-badge'
            ],
            chat: [
                'fas fa-comment', 'fas fa-comments', 'fas fa-commenting', 'fas fa-envelope',
                'fas fa-paper-plane', 'fas fa-bell', 'fas fa-inbox', 'fas fa-at',
                'fab fa-whatsapp', 'fab fa-telegram', 'fab fa-discord', 'fab fa-slack'
            ],
            code: [
                'fas fa-code', 'fas fa-terminal', 'fas fa-bug', 'fas fa-code-branch',
                'fas fa-laptop-code', 'fab fa-github', 'fas fa-robot', 'fas fa-microchip',
                'fas fa-flask', 'fas fa-sitemap', 'fas fa-circle-nodes'
            ],
            data: [
                'fas fa-database', 'fas fa-server', 'fas fa-hard-drive', 'fas fa-cloud',
                'fas fa-cloud-upload-alt', 'fas fa-cloud-download-alt', 'fas fa-network-wired',
                'fas fa-ethernet', 'fas fa-wifi', 'fas fa-share-nodes'
            ],
            media: [
                'fas fa-image', 'fas fa-images', 'fas fa-camera', 'fas fa-camera-retro',
                'fas fa-video', 'fas fa-film', 'fas fa-photo-video', 'fas fa-music',
                'fas fa-microphone', 'fas fa-headphones', 'fas fa-volume-up', 'fas fa-paint-brush',
                'fas fa-brush', 'fas fa-palette'
            ],
            chart: [
                'fas fa-chart-bar', 'fas fa-chart-line', 'fas fa-chart-pie', 'fas fa-chart-area',
                'fas fa-poll', 'fas fa-project-diagram', 'fas fa-tasks', 'fas fa-clipboard'
            ],
            tool: [
                'fas fa-hammer', 'fas fa-wrench', 'fas fa-screwdriver', 'fas fa-toolbox',
                'fas fa-cog', 'fas fa-cogs', 'fas fa-screwdriver-wrench',
                'fas fa-compass-drafting', 'fas fa-ruler', 'fas fa-calculator'
            ],
            nav: [
                'fas fa-home', 'fas fa-search', 'fas fa-filter', 'fas fa-sort', 'fas fa-bars',
                'fas fa-th', 'fas fa-th-list', 'fas fa-arrow-up', 'fas fa-arrow-down',
                'fas fa-arrow-left', 'fas fa-arrow-right', 'fas fa-crosshairs', 'fas fa-compass'
            ],
            shape: [
                'fas fa-cube', 'fas fa-cubes', 'fas fa-box', 'fas fa-boxes',
                'fas fa-square', 'fas fa-circle', 'fas fa-triangle', 'fas fa-hexagon',
                'fas fa-star', 'fas fa-heart', 'fas fa-diamond'
            ],
            life: [
                'fas fa-tree', 'fas fa-leaf', 'fas fa-seedling', 'fas fa-sun', 'fas fa-moon',
                'fas fa-cloud-sun', 'fas fa-snowflake', 'fas fa-fire', 'fas fa-water',
                'fas fa-mountain', 'fas fa-paw', 'fas fa-recycle'
            ],
            world: [
                'fas fa-map', 'fas fa-map-marker-alt', 'fas fa-location-dot', 'fas fa-globe',
                'fas fa-plane', 'fas fa-car', 'fas fa-ship', 'fas fa-rocket', 'fas fa-space-shuttle',
                'fas fa-road', 'fas fa-umbrella', 'fas fa-institution'
            ],
            fun: [
                'fas fa-gamepad', 'fas fa-puzzle-piece', 'fas fa-trophy', 'fas fa-award',
                'fas fa-medal', 'fas fa-crown', 'fas fa-gift', 'fas fa-birthday-cake',
                'fas fa-magic', 'fas fa-wand-magic-sparkles', 'fas fa-bomb', 'fas fa-lightbulb',
                'fas fa-bolt', 'fas fa-hand-spock', 'fas fa-lemon', 'fas fa-coffee',
                'fas fa-cutlery', 'fas fa-heartbeat', 'fas fa-ticket'
            ],
            lock: [
                'fas fa-lock', 'fas fa-unlock', 'fas fa-key', 'fas fa-shield-alt',
                'fas fa-shield', 'fas fa-user-shield', 'fas fa-fingerprint', 'fas fa-eye',
                'fas fa-eye-slash'
            ],
            brand: [
                'fab fa-facebook', 'fab fa-twitter', 'fab fa-instagram', 'fab fa-linkedin',
                'fab fa-youtube', 'fab fa-reddit', 'fab fa-pinterest', 'fab fa-tiktok',
                'fab fa-spotify', 'fab fa-apple', 'fab fa-google', 'fab fa-amazon'
            ]
        };

        // System reserved icons (cannot be selected by users)
        this.reservedIcons = [
            'fas fa-folder', 'fas fa-folder-open', 'fas fa-cog', 'fas fa-cogs'
        ];

        this.init();
    }
    
    init() {
        const template = document.getElementById('icon-picker-template');
        const content = template.content.cloneNode(true);
        this.container.appendChild(content);
        
        this.elements = {
            picker: this.container.querySelector('.icon-picker'),
            header: this.container.querySelector('.icon-picker-header'),
            toggle: this.container.querySelector('.icon-picker-toggle'),
            dropdown: this.container.querySelector('.icon-picker-dropdown'),
            preview: this.container.querySelector('.selected-icon-preview'),
            search: this.container.querySelector('.icon-search-input'),
            categories: this.container.querySelector('.icon-picker-categories'),
            grid: this.container.querySelector('.icon-picker-grid')
        };
        
        this.attachEvents();
        this.updateSelectedIcon(this.selectedIcon);
        this.renderIcons();
    }
    
    attachEvents() {
        // Toggle dropdown
        this.elements.header.addEventListener('click', () => {
            this.toggle();
        });
        
        // Search functionality
        this.elements.search.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.renderIcons();
        });
        
        // Category buttons
        this.elements.categories.addEventListener('click', (e) => {
            if (e.target.classList.contains('icon-category-btn')) {
                // Update active category
                this.elements.categories.querySelectorAll('.icon-category-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
                
                this.selectedCategory = e.target.dataset.category;
                this.renderIcons();
            }
        });
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target) && this.isOpen) {
                this.close();
            }
        });
    }
    
    renderIcons() {
        this.elements.grid.innerHTML = '';
        
        let iconsToShow = [];
        
        // Get icons based on category
        if (this.selectedCategory === 'all') {
            Object.values(this.icons).forEach(categoryIcons => {
                iconsToShow = iconsToShow.concat(categoryIcons);
            });
        } else {
            iconsToShow = this.icons[this.selectedCategory] || [];
        }
        
        // Filter by search term
        if (this.searchTerm) {
            iconsToShow = iconsToShow.filter(icon => {
                const iconName = icon.split(' ').pop().replace('fa-', '');
                return iconName.includes(this.searchTerm);
            });
        }
        
        // Render icons
        iconsToShow.forEach(iconClass => {
            const item = document.createElement('div');
            item.className = 'icon-picker-item';
            
            // Extract icon name for tooltip
            const iconName = iconClass.split(' ').pop().replace('fa-', '').replace(/-/g, ' ');
            item.setAttribute('data-icon-name', iconName);
            
            if (this.reservedIcons.includes(iconClass)) {
                item.classList.add('reserved');
                item.title = 'System reserved icon';
            }
            
            if (iconClass === this.selectedIcon) {
                item.classList.add('selected');
            }
            
            item.innerHTML = `<i class="${iconClass}"></i>`;
            
            if (!this.reservedIcons.includes(iconClass)) {
                item.addEventListener('click', () => {
                    this.selectIcon(iconClass);
                });
            }
            
            this.elements.grid.appendChild(item);
        });
    }
    
    selectIcon(iconClass) {
        this.selectedIcon = iconClass;
        this.updateSelectedIcon(iconClass);
        this.renderIcons();
        this.close();
        
        if (this.onChange) {
            this.onChange(iconClass);
        }
    }
    
    updateSelectedIcon(iconClass) {
        this.elements.preview.innerHTML = `<i class="${iconClass}"></i>`;
    }
    
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    open() {
        this.isOpen = true;
        this.elements.picker.classList.add('open');
        this.elements.search.focus();
    }
    
    close() {
        this.isOpen = false;
        this.elements.picker.classList.remove('open');
    }
    
    getValue() {
        return this.selectedIcon;
    }
    
    setValue(iconClass) {
        this.selectedIcon = iconClass;
        this.updateSelectedIcon(iconClass);
        this.renderIcons();
    }
}
