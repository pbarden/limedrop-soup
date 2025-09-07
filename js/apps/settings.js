// Settings Component
class Settings {
    constructor(windowEl) {
        this.windowEl = windowEl;
        this.dropdowns = {};
        this.isInitializing = true; // Add initialization flag
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
        let settingsEl = content.querySelector('.settings');
        if (!settingsEl) {
            console.warn('Settings template not found, using existing content');
            // Settings template should always be there, but continue anyway
        }

        this.initializeColorTheme();
        this.initializeGradientPreviews();
        this.initializeDropdowns();
        this.initializeWindowControlSettings();
        this.attachColorEvents();
        this.loadSettings();
        this.isInitializing = false; 
    }

    initializeColorTheme() {
        // Set up CSS custom properties for theming
        const root = document.documentElement;
        
        // Default values
        root.style.setProperty('--font-color', '#ffffff');
        root.style.setProperty('--primary-button-style', 'solid');
        root.style.setProperty('--primary-button-color', '#667eea');
        root.style.setProperty('--primary-gradient-start', '#667eea');
        root.style.setProperty('--primary-gradient-end', '#764ba2');
        root.style.setProperty('--primary-button-text', '#ffffff');
        root.style.setProperty('--secondary-button-bg', '#ffffff');
        root.style.setProperty('--secondary-button-opacity', '0.1');
        root.style.setProperty('--secondary-button-text', '#ffffff');
        root.style.setProperty('--secondary-button-border', '#ffffff');
        root.style.setProperty('--secondary-border-opacity', '0.2');
        root.style.setProperty('--window-tint-color', '#ffffff');
        root.style.setProperty('--window-tint-rgb', '255, 255, 255');
        root.style.setProperty('--glass-opacity', '0.8');
        root.style.setProperty('--glass-blur', '10px');
        root.style.setProperty('--window-header-color', '#ffffff');
        root.style.setProperty('--window-header-rgb', '255, 255, 255');
        root.style.setProperty('--window-header-opacity', '0.15');
        root.style.setProperty('--window-header-text', '#ffffff');
        root.style.setProperty('--window-header-border-opacity', '0.1');
    }

    initializeGradientPreviews() {
        // Set up gradient previews for background options
        const gradientPreviews = this.windowEl.querySelectorAll('.gradient-preview');
        gradientPreviews.forEach(preview => {
            const gradient = preview.dataset.gradient;
            preview.style.background = gradient;
        });
    }

    initializeDropdowns() {
        // Initialize background dropdown
        this.dropdowns.background = this.initializeModuleDropdown('background-dropdown', (value) => {
            this.changeBackground(value);
        });
        
        // Initialize button style dropdown
        this.dropdowns.buttonStyle = this.initializeModuleDropdown('button-style-dropdown', (value) => {
            this.changePrimaryButtonStyle(value);
        });

        this.dropdowns.animationStyle = this.initializeModuleDropdown('animation-style-dropdown', (value) => {
            this.changeAnimationStyle(value);
        });
    }

    attachColorEvents() {
        // Color pickers
        const fontColorPicker = this.windowEl.querySelector('#font-color');
        const primaryColorPicker = this.windowEl.querySelector('#primary-button-color');
        const primaryGradientStart = this.windowEl.querySelector('#primary-gradient-start');
        const primaryGradientEnd = this.windowEl.querySelector('#primary-gradient-end');
        const primaryTextPicker = this.windowEl.querySelector('#primary-button-text');
        const secondaryBgPicker = this.windowEl.querySelector('#secondary-button-bg');
        const secondaryOpacitySlider = this.windowEl.querySelector('#secondary-button-opacity');
        const secondaryTextPicker = this.windowEl.querySelector('#secondary-button-text');
        const secondaryBorderPicker = this.windowEl.querySelector('#secondary-button-border');
        const secondaryBorderOpacity = this.windowEl.querySelector('#secondary-border-opacity');
        const windowTintColorPicker = this.windowEl.querySelector('#window-tint-color');
        const autoSaveCheck = this.windowEl.querySelector('#auto-save');
        const showIconsCheck = this.windowEl.querySelector('#show-icons');
        const clearBtn = this.windowEl.querySelector('.clear-storage');
        const colorResetBtns = this.windowEl.querySelectorAll('.color-reset');
        const windowHeaderColorPicker = this.windowEl.querySelector('#window-header-color');
        const windowHeaderOpacitySlider = this.windowEl.querySelector('#window-header-opacity');
        const windowHeaderTextPicker = this.windowEl.querySelector('#window-header-text');
        const windowHeaderBorderOpacity = this.windowEl.querySelector('#window-header-border-opacity');

        // Font color
        fontColorPicker.addEventListener('input', (e) => {
            this.changeFontColor(e.target.value);
        });

        // Primary button controls
        primaryColorPicker.addEventListener('input', (e) => {
            this.changePrimaryButtonColor(e.target.value);
        });

        primaryGradientStart.addEventListener('input', (e) => {
            this.changePrimaryGradient();
        });

        primaryGradientEnd.addEventListener('input', (e) => {
            this.changePrimaryGradient();
        });

        primaryTextPicker.addEventListener('input', (e) => {
            this.changePrimaryButtonText(e.target.value);
        });

        // Secondary button controls
        secondaryBgPicker.addEventListener('input', (e) => {
            this.changeSecondaryButtonBg();
        });

        secondaryOpacitySlider.addEventListener('input', (e) => {
            this.changeSecondaryButtonBg();
        });

        secondaryTextPicker.addEventListener('input', (e) => {
            this.changeSecondaryButtonText(e.target.value);
        });

        secondaryBorderPicker.addEventListener('input', (e) => {
            this.changeSecondaryButtonBorder();
        });

        secondaryBorderOpacity.addEventListener('input', (e) => {
            this.changeSecondaryButtonBorder();
        });

        // Window tint
        windowTintColorPicker.addEventListener('input', (e) => {
            this.changeWindowTint(e.target.value);
        });

        // Window header color
        if (windowHeaderColorPicker) {
            windowHeaderColorPicker.addEventListener('input', (e) => {
                this.changeWindowHeaderColor(e.target.value);
            });
        }

        // Window header opacity
        if (windowHeaderOpacitySlider) {
            const opacityValue = windowHeaderOpacitySlider.parentElement.querySelector('.opacity-value');
            
            windowHeaderOpacitySlider.addEventListener('input', (e) => {
                const value = e.target.value;
                if (opacityValue) {
                    opacityValue.textContent = value + '%';
                }
                this.changeWindowHeaderOpacity(value);
            });
        }

        // Window header text color
        if (windowHeaderTextPicker) {
            windowHeaderTextPicker.addEventListener('input', (e) => {
                this.changeWindowHeaderText(e.target.value);
            });
        }

        // Window header border opacity
        if (windowHeaderBorderOpacity) {
            const borderOpacityValue = windowHeaderBorderOpacity.parentElement.querySelector('.opacity-value');
            
            windowHeaderBorderOpacity.addEventListener('input', (e) => {
                const value = e.target.value;
                if (borderOpacityValue) {
                    borderOpacityValue.textContent = value + '%';
                }
                this.changeWindowHeaderBorderOpacity(value);
            });
        }

        // System settings
        autoSaveCheck.addEventListener('change', (e) => {
            this.toggleAutoSave(e.target.checked);
        });

        showIconsCheck.addEventListener('change', (e) => {
            this.toggleDesktopIcons(e.target.checked);
        });

        const backgroundAnimationCheck = this.windowEl.querySelector('#background-animation');

        backgroundAnimationCheck.addEventListener('change', (e) => {
            this.toggleBackgroundAnimation(e.target.checked);
        });

        // Color reset buttons
        colorResetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.target.dataset.target;
                const defaultValue = e.target.dataset.default;
                const resetType = e.target.dataset.type;
                
                if (resetType === 'gradient-reset') {
                    const startColor = e.target.dataset.start;
                    const endColor = e.target.dataset.end;
                    this.windowEl.querySelector('#primary-gradient-start').value = startColor;
                    this.windowEl.querySelector('#primary-gradient-end').value = endColor;
                    this.changePrimaryGradient();
                } else if (targetId) {
                    const targetInput = this.windowEl.querySelector(`#${targetId}`);
                    if (targetInput) {
                        targetInput.value = defaultValue;
                        targetInput.dispatchEvent(new Event('input'));
                    }
                    
                    // Handle opacity resets
                    if (e.target.dataset.opacity) {
                        const opacitySlider = this.windowEl.querySelector('#secondary-button-opacity');
                        if (opacitySlider) {
                            opacitySlider.value = e.target.dataset.opacity;
                            this.changeSecondaryButtonBg();
                        }
                    }
                    
                    if (e.target.dataset.borderOpacity) {
                        const borderOpacitySlider = this.windowEl.querySelector('#secondary-border-opacity');
                        if (borderOpacitySlider) {
                            borderOpacitySlider.value = e.target.dataset.borderOpacity;
                            this.changeSecondaryButtonBorder();
                        }
                    }
                }
            });
        });

        // Clear all data
        clearBtn.addEventListener('click', async () => {
            const confirmed = await modalManager.confirm(
                'This will delete all apps, files, and settings. This action cannot be undone.',
                'Clear All Data'
            );
            
            if (confirmed) {
                const loadingModal = modalManager.loading('Clearing all data...');
                
                setTimeout(() => {
                    localStorage.clear();
                    loadingModal.update('Data cleared. Reloading...');
                    
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                }, 500);
            }
        });
    }

    initializeModuleDropdown(dropdownId, onSelect) {
        const dropdown = this.windowEl.querySelector(`#${dropdownId}`);
        const toggle = dropdown.querySelector('.module-dropdown-toggle');
        const menu = dropdown.querySelector('.module-dropdown-menu');
        const options = dropdown.querySelectorAll('.module-option');
        const selectedText = toggle.querySelector('.dropdown-selected-text');

        // Toggle dropdown
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = !menu.classList.contains('hide');
            
            // Close all other dropdowns
            this.windowEl.querySelectorAll('.module-dropdown-menu').forEach(m => {
                if (m !== menu) m.classList.add('hide');
            });
            
            // Toggle this dropdown
            menu.classList.toggle('hide', isOpen);
        });

        // Handle option selection
        options.forEach(option => {
            option.addEventListener('click', () => {
                this.selectDropdownOption(dropdownId, option.dataset.value, onSelect);
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                menu.classList.add('hide');
            }
        });

        // Return an object with methods to control this dropdown
        return {
            setValue: (value) => this.setDropdownValue(dropdownId, value, onSelect),
            getValue: () => this.getDropdownValue(dropdownId)
        };
    }

    selectDropdownOption(dropdownId, value, onSelect) {
        const dropdown = this.windowEl.querySelector(`#${dropdownId}`);
        const options = dropdown.querySelectorAll('.module-option');
        const selectedText = dropdown.querySelector('.dropdown-selected-text');
        const menu = dropdown.querySelector('.module-dropdown-menu');
        
        // Find the option and update UI
        options.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.value === value) {
                option.classList.add('selected');
                const optionName = option.querySelector('.module-option-name');
                if (optionName) {
                    selectedText.textContent = optionName.textContent;
                }
            }
        });
        
        // Close dropdown
        menu.classList.add('hide');
        
        // Call the callback and save settings
        if (onSelect) {
            onSelect(value);
        }
    }

    setDropdownValue(dropdownId, value, onSelect) {
        const dropdown = this.windowEl.querySelector(`#${dropdownId}`);
        const options = dropdown.querySelectorAll('.module-option');
        const selectedText = dropdown.querySelector('.dropdown-selected-text');
        
        // Find and select the option
        let found = false;
        options.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.value === value) {
                option.classList.add('selected');
                const optionName = option.querySelector('.module-option-name');
                if (optionName) {
                    selectedText.textContent = optionName.textContent;
                }
                found = true;
            }
        });
        
        // If value was found and we have a callback, call it
        if (found && onSelect) {
            onSelect(value);
        }
        
        return found;
    }

    getDropdownValue(dropdownId) {
        const dropdown = this.windowEl.querySelector(`#${dropdownId}`);
        const selectedOption = dropdown.querySelector('.module-option.selected');
        return selectedOption ? selectedOption.dataset.value : null;
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('limedrop-settings') || '{}');
        
        // Load background setting
        const backgroundValue = settings.background || 'gradient1';
        this.dropdowns.background.setValue(backgroundValue);
        
        // Load button style setting
        const buttonStyleValue = settings.primaryButtonStyle || 'solid';
        this.dropdowns.buttonStyle.setValue(buttonStyleValue);
        
        // Font color
        if (settings.fontColor) {
            this.windowEl.querySelector('#font-color').value = settings.fontColor;
            this.changeFontColor(settings.fontColor);
        }
        
        // Primary button color
        if (settings.primaryButtonColor) {
            this.windowEl.querySelector('#primary-button-color').value = settings.primaryButtonColor;
            this.changePrimaryButtonColor(settings.primaryButtonColor);
        }
        
        // Primary button gradient
        if (settings.primaryGradientStart) {
            this.windowEl.querySelector('#primary-gradient-start').value = settings.primaryGradientStart;
        }
        
        if (settings.primaryGradientEnd) {
            this.windowEl.querySelector('#primary-gradient-end').value = settings.primaryGradientEnd;
        }
        
        if (settings.primaryGradientStart || settings.primaryGradientEnd) {
            this.changePrimaryGradient();
        }
        
        // Primary button text
        if (settings.primaryButtonText) {
            this.windowEl.querySelector('#primary-button-text').value = settings.primaryButtonText;
            this.changePrimaryButtonText(settings.primaryButtonText);
        }
        
        // Secondary button background
        if (settings.secondaryButtonBg) {
            this.windowEl.querySelector('#secondary-button-bg').value = settings.secondaryButtonBg;
        }
        
        if (settings.secondaryButtonOpacity !== undefined) {
            this.windowEl.querySelector('#secondary-button-opacity').value = settings.secondaryButtonOpacity;
        }
        
        if (settings.secondaryButtonBg || settings.secondaryButtonOpacity !== undefined) {
            this.changeSecondaryButtonBg();
        }
        
        // Secondary button text
        if (settings.secondaryButtonText) {
            this.windowEl.querySelector('#secondary-button-text').value = settings.secondaryButtonText;
            this.changeSecondaryButtonText(settings.secondaryButtonText);
        }
        
        // Secondary button border
        if (settings.secondaryButtonBorder) {
            this.windowEl.querySelector('#secondary-button-border').value = settings.secondaryButtonBorder;
        }
        
        if (settings.secondaryBorderOpacity !== undefined) {
            this.windowEl.querySelector('#secondary-border-opacity').value = settings.secondaryBorderOpacity;
        }
        
        if (settings.secondaryButtonBorder || settings.secondaryBorderOpacity !== undefined) {
            this.changeSecondaryButtonBorder();
        }

        // Window tint
        if (settings.windowTintColor) {
            this.windowEl.querySelector('#window-tint-color').value = settings.windowTintColor;
            this.changeWindowTint(settings.windowTintColor);
        }

        // Window header settings
        if (settings.windowHeaderColor) {
            this.windowEl.querySelector('#window-header-color').value = settings.windowHeaderColor;
            this.changeWindowHeaderColor(settings.windowHeaderColor);
        }

        if (settings.windowHeaderOpacity !== undefined) {
            const slider = this.windowEl.querySelector('#window-header-opacity');
            const valueDisplay = slider.parentElement.querySelector('.opacity-value');
            slider.value = settings.windowHeaderOpacity;
            if (valueDisplay) {
                valueDisplay.textContent = settings.windowHeaderOpacity + '%';
            }
            this.changeWindowHeaderOpacity(settings.windowHeaderOpacity);
        }

        if (settings.windowHeaderText) {
            this.windowEl.querySelector('#window-header-text').value = settings.windowHeaderText;
            this.changeWindowHeaderText(settings.windowHeaderText);
        }

        if (settings.windowHeaderBorderOpacity !== undefined) {
            const slider = this.windowEl.querySelector('#window-header-border-opacity');
            const valueDisplay = slider.parentElement.querySelector('.opacity-value');
            slider.value = settings.windowHeaderBorderOpacity;
            if (valueDisplay) {
                valueDisplay.textContent = settings.windowHeaderBorderOpacity + '%';
            }
            this.changeWindowHeaderBorderOpacity(settings.windowHeaderBorderOpacity);
        }

        // System settings
        if (settings.autoSave !== undefined) {
            this.windowEl.querySelector('#auto-save').checked = settings.autoSave;
        }

        if (settings.showIcons !== undefined) {
            this.windowEl.querySelector('#show-icons').checked = settings.showIcons;
            this.toggleDesktopIcons(settings.showIcons);
        }

        // Animation settings
        const animationEnabled = settings.backgroundAnimation !== false; // default true
        this.windowEl.querySelector('#background-animation').checked = animationEnabled;
        this.toggleBackgroundAnimation(animationEnabled);

        if (settings.animationStyle) {
            this.dropdowns.animationStyle.setValue(settings.animationStyle);
        }

        this.loadWindowControlSettings();
    }

        saveSettings() {
        if (this.isInitializing) {
            return;
        }
        
        const settings = {
            background: this.dropdowns.background.getValue() || 'gradient1',
            fontColor: this.windowEl.querySelector('#font-color').value,
            primaryButtonStyle: this.dropdowns.buttonStyle.getValue() || 'solid',
            primaryButtonColor: this.windowEl.querySelector('#primary-button-color').value,
            primaryGradientStart: this.windowEl.querySelector('#primary-gradient-start').value,
            primaryGradientEnd: this.windowEl.querySelector('#primary-gradient-end').value,
            primaryButtonText: this.windowEl.querySelector('#primary-button-text').value,
            secondaryButtonBg: this.windowEl.querySelector('#secondary-button-bg').value,
            secondaryButtonOpacity: this.windowEl.querySelector('#secondary-button-opacity').value,
            secondaryButtonText: this.windowEl.querySelector('#secondary-button-text').value,
            secondaryButtonBorder: this.windowEl.querySelector('#secondary-button-border').value,
            secondaryBorderOpacity: this.windowEl.querySelector('#secondary-border-opacity').value,
            windowTintColor: this.windowEl.querySelector('#window-tint-color').value,
            autoSave: this.windowEl.querySelector('#auto-save').checked,
            showIcons: this.windowEl.querySelector('#show-icons').checked,
            backgroundAnimation: this.windowEl.querySelector('#background-animation').checked,
            animationStyle: this.dropdowns.animationStyle.getValue() || 'gradient-flow',
            windowHeaderColor: this.windowEl.querySelector('#window-header-color').value,
            windowHeaderOpacity: this.windowEl.querySelector('#window-header-opacity').value,
            windowHeaderText: this.windowEl.querySelector('#window-header-text').value,
            windowHeaderBorderOpacity: this.windowEl.querySelector('#window-header-border-opacity').value,
        };

        // Save window control settings - FIXED
        if (this.dropdowns.windowControlStyle) {
            settings.windowControlStyle = this.dropdowns.windowControlStyle.getValue() || 'circle';
        }
        
        if (this.minimizePicker) settings.minimizeIcon = this.minimizePicker.getValue();
        if (this.maximizePicker) settings.maximizeIcon = this.maximizePicker.getValue();
        if (this.closePicker) settings.closeIcon = this.closePicker.getValue();
        
        localStorage.setItem('limedrop-settings', JSON.stringify(settings));
        
        // Debug log to verify saving
        console.log('Settings saved:', settings);
    }

    changeBackground(style) {
        const desktop = document.querySelector('.desktop-background');
        const gradients = {
            gradient1: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
            gradient2: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e8ba3 100%)',
            gradient3: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 50%, #f29400 100%)',
            gradient4: 'linear-gradient(135deg, #2f2f2f 0%, #4a4a4a 35%, #8f8f8f 70%, #dedede 100%)',
            gradient5: 'linear-gradient(135deg, #4e2a12 0%, #8a4f2d 35%, #d29b6e 70%, #f6eadc 100%)',
            gradient6: 'linear-gradient(135deg, #1f4d27 0%, #4f7f3f 35%, #8fbd6b 70%, #eef6e7 100%)',
            gradient7: 'linear-gradient(135deg, #5f4da8 0%, #8c76c9 35%, #c7b5e6 70%, #f1ecff 100%)',
            gradient8: 'linear-gradient(135deg, #c74a00 0%, #f07f2f 35%, #ffc78e 70%, #fff3df 100%)',
            gradient9: 'linear-gradient(135deg, #4a3324 0%, #7a5a3e 35%, #b69576 70%, #efe3d1 100%)',
            gradient10: 'linear-gradient(135deg, #5c3622 0%, #8a5533 35%, #d09a59 70%, #f2e7cf 100%)',
            gradient11: 'linear-gradient(135deg, #d8263f 0%, #ff6b6b 35%, #ff9fb1 70%, #ffe3ec 100%)',
            gradient12: 'linear-gradient(135deg, #ff8a00 0%, #ffb84d 35%, #ffd27f 70%, #fff0cc 100%)',
            gradient13: 'linear-gradient(135deg, #fff7f7 0%, #fbdde2 35%, #f2b6c3 70%, #d68098 100%)',
            gradient14: 'linear-gradient(135deg, #ffd24d 0%, #ffb300 35%, #ff8c00 70%, #5a381e 100%)',
            gradient15: 'linear-gradient(135deg, #452a7a 0%, #6b44b8 35%, #a78bdc 70%, #f2eaff 100%)',
            gradient16: 'linear-gradient(135deg, #ffffff 0%, #f7fbf9 35%, #e6f3f0 70%, #d5ece8 100%)',
            gradient17: 'linear-gradient(135deg, #0d1b12 0%, #1a2b22 35%, #2e3c33 70%, #49564c 100%)',
            gradient18: 'linear-gradient(135deg, #1b0f07 0%, #3b2416 35%, #6b4b31 70%, #a67854 100%)',
            gradient19: 'linear-gradient(135deg, #7f864f 0%, #b1b873 35%, #dfe6b0 70%, #f7f5e6 100%)',
            gradient20: 'linear-gradient(135deg, #7f4f2d 0%, #a4673b 35%, #d59a64 70%, #f4e6d5 100%)',
            gradient21: 'linear-gradient(135deg, #ffe94a 0%, #ffb400 35%, #ff6a00 70%, #7a1e5c 100%)',
            gradient22: 'linear-gradient(135deg, #5a0f1b 0%, #8d2b34 35%, #b85a63 70%, #f0d2cf 100%)',
            gradient23: 'linear-gradient(135deg, #1e8a44 0%, #56b870 35%, #a6dfbf 70%, #ffffff 100%)',
            gradient24: 'linear-gradient(135deg, #ffffff 0%, #8b4a2b 33%, #3b2314 66%, #a0522d 100%)',
            gradient25: 'linear-gradient(135deg, #fff7fa 0%, #ff7891 22%, #ffdbe6 45%, #b3e6a0 72%, #3e7e3b 100%)',
            gradient26: 'linear-gradient(135deg, #fffaf2 0%, #b7d7a8 25%, #3e6b2e 50%, #2b1e14 75%, #f1e6d0 100%)',
            gradient27: 'linear-gradient(135deg, #ffffff 0%, #f0e6cf 22%, #d6a15a 45%, #9c5a1d 72%, #3a2515 100%)',
            gradient28: 'linear-gradient(135deg, #fff5e6 0%, #f1d3b3 22%, #d1925a 45%, #8a4f2b 72%, #2f1b0a 100%)',
            gradient29: 'linear-gradient(135deg, #fff5f8 0%, #ffd1e8 22%, #ff9ec7 45%, #f15bb5 72%, #ffe6f1 100%)',
            gradient30: 'linear-gradient(135deg, #0f0f0f 0%, #2e2e2e 22%, #777777 45%, #c9b8a4 72%, #f1ece4 100%)',
            gradient31: 'linear-gradient(135deg, #1e3a8a 0%, #3f6bd1 22%, #7fd3f7 45%, #ffd166 72%, #fff7cc 100%)',
            gradient32: 'linear-gradient(135deg, #eaffea 0%, #c8f7c5 22%, #8bd48a 45%, #5ca86e 72%, #3b6b47 100%)',
            gradient33: 'linear-gradient(135deg, #fff9f6 0%, #ff2e85 22%, #ff6fb0 45%, #ffd166 72%, #fff1d6 100%)',
            gradient34: 'linear-gradient(135deg, #f2fff2 0%, #ccf4d1 22%, #a2e6b3 45%, #79c596 72%, #eaffea 100%)',
            gradient35: 'linear-gradient(135deg, #ffffff 0%, #eaeaea 22%, #c2c2c2 45%, #6e5b4b 72%, #2f251e 100%)',
            gradient36: 'linear-gradient(135deg, #fff8e7 0%, #e6d2b5 22%, #c9a27a 45%, #6f4e37 72%, #3b2e2a 100%)',
            gradient37: 'linear-gradient(135deg, #fff7e3 0%, #ffe0a3 22%, #ffc371 45%, #c96b2c 72%, #6b3e2e 100%)',
            gradient38: 'linear-gradient(135deg, #ffe3ec 0%, #f7b6c6 22%, #f0dee1 45%, #9fd3a8 72%, #5b8c5a 100%)',
            gradient39: 'linear-gradient(135deg, #ffffff 0%, #f5e6c8 22%, #d4a373 45%, #8b5e34 72%, #2e1b0f 100%)',
            gradient40: 'linear-gradient(135deg, #f7f5ff 0%, #dcd7ff 22%, #b7b5e8 45%, #6a78a8 72%, #3d4a78 100%)',
            gradient41: 'linear-gradient(135deg, #fff0e1 0%, #ffc49c 22%, #f77f00 45%, #a3663f 72%, #fff7e9 100%)',
            gradient42: 'linear-gradient(135deg, #fff5f7 0%, #ffd3de 22%, #ff6b81 45%, #ff3d3d 72%, #ffecee 100%)',
            gradient43: 'linear-gradient(135deg, #ffffff 0%, #f4efe7 22%, #e2d7c5 45%, #c7b8a1 72%, #8a7a63 100%)',
            gradient44: 'linear-gradient(135deg, #ffe4ec 0%, #ff6f91 25%, #2dd4bf 50%, #111827 75%, #f5f5f5 100%)',
            gradient45: 'linear-gradient(135deg, #fff1e6 0%, #00c6ff 25%, #1e3a8a 50%, #ff4dcf 75%, #ffe5d1 100%)',
            gradient46: 'linear-gradient(135deg, #fff36d 0%, #8bc34a 25%, #1b5e20 50%, #0b0f10 75%, #f5f7fa 100%)',
            gradient47: 'linear-gradient(135deg, #fffced 0%, #ff6685 22%, #0e9f6e 50%, #111827 72%, #a7f3d0 100%)',
            gradient48: 'linear-gradient(135deg, #fff0ea 0%, #ff6b6b 25%, #5b32b4 50%, #86b6ff 75%, #f2e9ff 100%)',
            gradient49: 'linear-gradient(135deg, #4e342e 0%, #86efac 25%, #ec4899 50%, #f9a8d4 75%, #fff1f2 100%)',
            gradient50: 'linear-gradient(135deg, #fff1cc 0%, #ffb700 25%, #6d28d9 50%, #2e1065 75%, #0f172a 100%)',
            gradient51: 'linear-gradient(135deg, #fff8f0 0%, #84cc16 25%, #ef4444 50%, #ffe4e6 75%, #fff8f0 100%)',
            gradient52: 'linear-gradient(135deg, #ffffff 0%, #ff0db0 25%, #84cc16 50%, #111827 75%, #f5f5f5 100%)',
            gradient53: 'linear-gradient(135deg, #ff7a00 0%, #ffd29c 25%, #b3a08a 50%, #2f2f2f 75%, #fffaf2 100%)'
        };
        
        desktop.style.background = gradients[style] || gradients.gradient1;
        this.saveSettings();
    }

    changeFontColor(color) {
        document.documentElement.style.setProperty('--font-color', color);
        this.saveSettings();
    }

    changePrimaryButtonStyle(style) {
        document.documentElement.style.setProperty('--primary-button-style', style);
        
        const solidControls = this.windowEl.querySelector('#primary-solid-controls');
        const gradientControls = this.windowEl.querySelector('#primary-gradient-controls');
        
        if (style === 'gradient') {
            solidControls.style.display = 'none';
            gradientControls.style.display = 'flex';
            document.body.classList.add('gradient-buttons');
            this.changePrimaryGradient();
        } else {
            solidControls.style.display = 'flex';
            gradientControls.style.display = 'none';
            document.body.classList.remove('gradient-buttons');
            this.changePrimaryButtonColor();
        }
        
        this.saveSettings();
    }

    changePrimaryButtonColor(color) {
        if (!color) color = this.windowEl.querySelector('#primary-button-color').value;
        document.documentElement.style.setProperty('--primary-button-color', color);
        this.saveSettings();
    }

    changePrimaryGradient() {
        const startColor = this.windowEl.querySelector('#primary-gradient-start').value;
        const endColor = this.windowEl.querySelector('#primary-gradient-end').value;
        
        document.documentElement.style.setProperty('--primary-gradient-start', startColor);
        document.documentElement.style.setProperty('--primary-gradient-end', endColor);
        this.saveSettings();
    }

    changePrimaryButtonText(color) {
        document.documentElement.style.setProperty('--primary-button-text', color);
        this.saveSettings();
    }

    changeSecondaryButtonBg() {
        const color = this.windowEl.querySelector('#secondary-button-bg').value;
        const opacity = this.windowEl.querySelector('#secondary-button-opacity').value / 100;
        
        const rgb = this.hexToRgb(color);
        if (rgb) {
            document.documentElement.style.setProperty('--secondary-button-bg', color);
            document.documentElement.style.setProperty('--secondary-button-opacity', opacity);
            document.documentElement.style.setProperty('--secondary-button-bg-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
        this.saveSettings();
    }

    changeSecondaryButtonText(color) {
        document.documentElement.style.setProperty('--secondary-button-text', color);
        this.saveSettings();
    }

    changeSecondaryButtonBorder() {
        const color = this.windowEl.querySelector('#secondary-button-border').value;
        const opacity = this.windowEl.querySelector('#secondary-border-opacity').value / 100;
        
        const rgb = this.hexToRgb(color);
        if (rgb) {
            document.documentElement.style.setProperty('--secondary-button-border', color);
            document.documentElement.style.setProperty('--secondary-border-opacity', opacity);
            document.documentElement.style.setProperty('--secondary-button-border-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
        this.saveSettings();
    }

    changeWindowTint(color) {
        const rgb = this.hexToRgb(color);
        if (rgb) {
            document.documentElement.style.setProperty('--window-tint-color', color);
            document.documentElement.style.setProperty('--window-tint-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
        this.saveSettings();
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    toggleAutoSave(enabled) {
        // Auto-save is always on in this implementation
        this.saveSettings();
    }

    toggleDesktopIcons(show) {
        const icons = document.querySelector('.desktop-icons');
        icons.style.display = show ? 'flex' : 'none';
        this.saveSettings();
    }

    // Enhanced animation methods for Settings class
    toggleBackgroundAnimation(enabled) {
        const desktop = document.querySelector('.desktop-background');
        if (enabled) {
            desktop.classList.add('animated');
            this.windowEl.querySelector('#animation-style-controls').style.display = 'flex';
            // Apply current animation style
            const currentStyle = this.dropdowns.animationStyle.getValue() || 'gradient-flow';
            this.changeAnimationStyle(currentStyle);
            
            // Show a brief notification that animations are enabled
            if (window.notificationManager) {
                window.notificationManager.show({
                    title: 'Animations Enabled',
                    message: 'Background animations are now active. Watch the background!',
                    type: 'info',
                    duration: 3000
                });
            }
        } else {
            desktop.classList.remove('animated', 'gradient-flow', 'floating-orbs', 'breathing', 
                                    'pulse-waves', 'color-shift', 'shimmer', 'particle-flow');
            this.windowEl.querySelector('#animation-style-controls').style.display = 'none';
            
            if (window.notificationManager) {
                window.notificationManager.show({
                    title: 'Animations Disabled',
                    message: 'Background animations are now turned off.',
                    type: 'info',
                    duration: 2000
                });
            }
        }
        this.saveSettings();
    }

    changeAnimationStyle(style) {
        const desktop = document.querySelector('.desktop-background');
        
        // Remove all animation classes
        desktop.classList.remove('gradient-flow', 'floating-orbs', 'breathing', 
                                'pulse-waves', 'color-shift', 'shimmer', 'particle-flow');
        
        // Add the selected animation class if animations are enabled
        if (desktop.classList.contains('animated')) {
            desktop.classList.add(style);
            
            // Show notification about the animation change
            const animationNames = {
                'gradient-flow': 'Gradient Flow',
                'floating-orbs': 'Floating Orbs',
                'breathing': 'Breathing',
                'pulse-waves': 'Pulse Waves',
                'color-shift': 'Color Shift',
                'shimmer': 'Shimmer',
                'particle-flow': 'Particle Flow'
            };
            
            if (window.notificationManager) {
                window.notificationManager.show({
                    title: 'Animation Changed',
                    message: `Now showing: ${animationNames[style] || style}`,
                    type: 'info',
                    duration: 2500
                });
            }
        }
        
        this.saveSettings();
    }

    // Enhanced animation preview method
    previewAnimation(style) {
        const desktop = document.querySelector('.desktop-background');
        
        // Temporarily apply the animation for preview
        desktop.classList.add('animated', style);
        
        // Remove preview after 3 seconds
        setTimeout(() => {
            if (!this.windowEl.querySelector('#background-animation').checked) {
                desktop.classList.remove('animated', style);
            }
        }, 3000);
        
        if (window.notificationManager) {
            window.notificationManager.show({
                title: 'Animation Preview',
                message: `Previewing ${style} for 3 seconds...`,
                type: 'info',
                duration: 3000
            });
        }
    }

initializeWindowControlSettings() {
    console.log('Initializing window control settings...');
    
    const minimizeContainer = this.windowEl.querySelector('#minimize-icon-picker');
    const maximizeContainer = this.windowEl.querySelector('#maximize-icon-picker');
    const closeContainer = this.windowEl.querySelector('#close-icon-picker');
    
    console.log('Containers found:', {
        minimize: !!minimizeContainer,
        maximize: !!maximizeContainer,
        close: !!closeContainer
    });
    
    if (minimizeContainer) {
        this.minimizePicker = new IconPicker(
            minimizeContainer,
            'fas fa-minus',
            (iconClass) => this.applyControlIcon('minimize', iconClass)
        );
        console.log('Created minimize picker:', !!this.minimizePicker);
    }
    
    if (maximizeContainer) {
        this.maximizePicker = new IconPicker(
            maximizeContainer,
            'fas fa-square',
            (iconClass) => this.applyControlIcon('maximize', iconClass)
        );
        console.log('Created maximize picker:', !!this.maximizePicker);
    }
    
    if (closeContainer) {
        this.closePicker = new IconPicker(
            closeContainer,
            'fas fa-times',
            (iconClass) => this.applyControlIcon('close', iconClass)
        );
        console.log('Created close picker:', !!this.closePicker);
    }
}

applyControlIcon(controlType, iconClass) {
    // Apply to all existing windows
    const windows = document.querySelectorAll('.window');
    windows.forEach(window => {
        const control = window.querySelector(`.window-control.${controlType}`);
        if (control) {
            control.innerHTML = `<i class="${iconClass}"></i>`;
        }
    });
    
    // Store the value directly
    const settings = JSON.parse(localStorage.getItem('limedrop-settings') || '{}');
    settings[`${controlType}Icon`] = iconClass;
    localStorage.setItem('limedrop-settings', JSON.stringify(settings));
}

initializeWindowControlIconPickers() {
    const iconSets = {
        minimize: [
            { icon: 'fa-minus', name: 'Minus' },
            { icon: 'fa-window-minimize', name: 'Window Minimize' },
            { icon: 'fa-chevron-down', name: 'Chevron Down' },
            { icon: 'fa-angle-down', name: 'Angle Down' },
            { icon: 'fa-compress', name: 'Compress' },
            { icon: 'fa-compress-alt', name: 'Compress Alt' },
            { icon: 'fa-caret-down', name: 'Caret Down' },
            { icon: 'fa-underscore', name: 'Underscore' }
        ],
        maximize: [
            { icon: 'fa-square', name: 'Square' },
            { icon: 'fa-window-maximize', name: 'Window Maximize' },
            { icon: 'fa-expand', name: 'Expand' },
            { icon: 'fa-expand-alt', name: 'Expand Alt' },
            { icon: 'fa-external-link-alt', name: 'External Link' },
            { icon: 'fa-arrows-alt', name: 'Arrows Alt' },
            { icon: 'fa-plus', name: 'Plus' },
            { icon: 'fa-clone', name: 'Clone' }
        ],
        close: [
            { icon: 'fa-times', name: 'Times' },
            { icon: 'fa-window-close', name: 'Window Close' },
            { icon: 'fa-times-circle', name: 'Times Circle' },
            { icon: 'fa-ban', name: 'Ban' },
            { icon: 'fa-stop', name: 'Stop' },
            { icon: 'fa-power-off', name: 'Power Off' },
            { icon: 'fa-trash', name: 'Trash' },
            { icon: 'fa-door-open', name: 'Door Open' }
        ]
    };

    Object.keys(iconSets).forEach(controlType => {
        this.initializeControlIconPicker(controlType, iconSets[controlType]);
    });
}

initializeControlIconPicker(controlType, icons) {
    const pickerId = `${controlType}-icon-picker`;
    const picker = this.windowEl.querySelector(`#${pickerId}`);
    if (!picker) {
        console.warn(`Icon picker not found: ${pickerId}`);
        return;
    }

    const toggle = picker.querySelector('.icon-picker-toggle');
    const dropdown = picker.querySelector('.icon-picker-dropdown');
    const grid = picker.querySelector('.icon-picker-grid');
    const searchInput = picker.querySelector('.icon-search-input');

    if (!toggle || !dropdown || !grid) {
        console.warn(`Required elements not found for ${pickerId}`);
        return;
    }

    // Populate icon grid
    this.populateIconGrid(grid, icons, controlType);

    // Toggle dropdown
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hide');
        
        // Close all icon picker dropdowns
        this.windowEl.querySelectorAll('.icon-picker-dropdown').forEach(d => {
            d.classList.add('hide');
        });
        
        // Toggle this dropdown
        if (!isOpen) {
            dropdown.classList.remove('hide');
        }
    });

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            this.filterIcons(grid, e.target.value, icons, controlType);
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!picker.contains(e.target)) {
            dropdown.classList.add('hide');
        }
    });
}

populateIconGrid(grid, icons, controlType) {
    if (!grid) {
        console.warn(`Grid not found for ${controlType}`);
        return;
    }
    
    grid.innerHTML = '';
    
    // Add default option
    const defaultItem = document.createElement('div');
    defaultItem.className = 'icon-picker-item default-option selected'; // Add selected by default
    defaultItem.dataset.iconClass = 'default';
    defaultItem.dataset.iconName = 'Default';
    defaultItem.innerHTML = `<span class="default-icon">${this.getDefaultSymbol(controlType)}</span>`;
    defaultItem.addEventListener('click', () => {
        this.selectControlIcon(controlType, 'default', 'Default', defaultItem);
    });
    grid.appendChild(defaultItem);

    // Add icon options
    icons.forEach(iconData => {
        const item = document.createElement('div');
        item.className = 'icon-picker-item';
        item.dataset.iconClass = iconData.icon;
        item.dataset.iconName = iconData.name;
        item.innerHTML = `<i class="fas ${iconData.icon}"></i>`;
        item.addEventListener('click', () => {
            this.selectControlIcon(controlType, iconData.icon, iconData.name, item);
        });
        grid.appendChild(item);
    });
}

filterIcons(grid, query, icons, controlType) {
    const items = grid.querySelectorAll('.icon-picker-item');
    const searchTerm = query.toLowerCase();
    
    items.forEach(item => {
        const iconName = item.dataset.iconName.toLowerCase();
        const iconClass = item.dataset.iconClass.toLowerCase();
        const matches = iconName.includes(searchTerm) || iconClass.includes(searchTerm);
        item.style.display = matches ? 'flex' : 'none';
    });
}

selectControlIcon(controlType, iconClass, iconName, itemElement) {
    const pickerId = `${controlType}-icon-picker`;
    const picker = this.windowEl.querySelector(`#${pickerId}`);
    if (!picker) return;

    const selectedPreview = picker.querySelector('.selected-icon-preview');
    const selectedName = picker.querySelector('.selected-icon-name');
    const dropdown = picker.querySelector('.icon-picker-dropdown');

    // Update picker display
    if (iconClass === 'default') {
        selectedPreview.innerHTML = `<span class="default-icon">${this.getDefaultSymbol(controlType)}</span>`;
    } else {
        selectedPreview.innerHTML = `<i class="fas ${iconClass}"></i>`;
    }
    selectedName.textContent = iconName;

    // Update selected state in grid
    picker.querySelectorAll('.icon-picker-item').forEach(item => {
        item.classList.remove('selected');
    });
    itemElement.classList.add('selected');

    // Close dropdown
    dropdown.classList.add('hide');

    // Apply to all windows and preview
    this.applyControlIcon(controlType, iconClass);
    this.updatePreview();
    this.saveSettings();
}

applyControlIcon(controlType, iconClass) {
    // Apply to all existing windows
    const windows = document.querySelectorAll('.window');
    windows.forEach(window => {
        const control = window.querySelector(`.window-control.${controlType}`);
        if (control) {
            this.updateControlIcon(control, iconClass, controlType);
        }
    });

    // Update window template for future windows
    this.updateWindowTemplate(controlType, iconClass);
}

updateControlIcon(control, iconClass, controlType) {
    // Clear existing content
    control.innerHTML = '';
    control.classList.remove('has-icon');

    if (iconClass === 'default') {
        // Use default symbol
        control.classList.remove('has-icon');
    } else {
        // Use Font Awesome icon
        control.innerHTML = `<i class="fas ${iconClass}"></i>`;
        control.classList.add('has-icon');
    }
}

updateWindowTemplate(controlType, iconClass) {
    const template = document.querySelector('#window-template');
    if (!template) return;

    const control = template.content.querySelector(`.window-control.${controlType}`);
    if (control) {
        this.updateControlIcon(control, iconClass, controlType);
    }
}

changeWindowControlStyle(style) {
    // Apply style to all existing windows
    const windows = document.querySelectorAll('.window');
    windows.forEach(window => {
        const controls = window.querySelectorAll('.window-control');
        controls.forEach(control => {
            // Remove existing style classes
            control.classList.remove('style-circle', 'style-square', 'style-rounded', 'style-minimal');
            // Add new style class
            if (style !== 'circle') {
                control.classList.add(`style-${style}`);
            }
        });
    });

    // Update preview
    this.updatePreview();
    this.saveSettings();
}

updatePreview() {
    const preview = this.windowEl.querySelector('.preview-controls');
    if (!preview) return;

    const controls = preview.querySelectorAll('.window-control');
    const style = this.dropdowns.windowControlStyle.getValue() || 'circle';

    controls.forEach(control => {
        // Apply style
        control.classList.remove('style-circle', 'style-square', 'style-rounded', 'style-minimal');
        if (style !== 'circle') {
            control.classList.add(`style-${style}`);
        }

        // Apply custom icons
        const controlType = control.classList.contains('minimize') ? 'minimize' :
                          control.classList.contains('maximize') ? 'maximize' : 'close';
        
        const settings = JSON.parse(localStorage.getItem('limedrop-settings') || '{}');
        const iconClass = settings[`${controlType}Icon`] || 'default';
        
        this.updateControlIcon(control, iconClass, controlType);
    });
}

resetWindowControlsToDefault() {
    // Reset all icon pickers
    ['minimize', 'maximize', 'close'].forEach(controlType => {
        this.selectControlIcon(controlType, 'default', 'Default', 
            this.windowEl.querySelector(`#${controlType}-icon-picker .default-option`));
    });

    // Reset style
    this.dropdowns.windowControlStyle.setValue('circle');
    this.changeWindowControlStyle('circle');

    // Show notification
    if (window.notificationManager) {
        window.notificationManager.show({
            title: 'Window Controls Reset',
            message: 'All window controls have been reset to default.',
            type: 'info',
            duration: 2000
        });
    }
}

getDefaultSymbol(controlType) {
    const symbols = {
        minimize: '−',
        maximize: '□',
        close: '×'
    };
    return symbols[controlType] || '?';
}

loadWindowControlSettings() {
    const settings = JSON.parse(localStorage.getItem('limedrop-settings') || '{}');
    
    // Apply saved icons directly to windows
    ['minimize', 'maximize', 'close'].forEach(controlType => {
        const iconClass = settings[`${controlType}Icon`];
        if (iconClass) {
            const windows = document.querySelectorAll('.window');
            windows.forEach(window => {
                const control = window.querySelector(`.window-control.${controlType}`);
                if (control) {
                    control.innerHTML = `<i class="${iconClass}"></i>`;
                }
            });
        }
    });
}

// Save window control settings (update existing saveSettings method)
saveWindowControlSettings() {
    const settings = JSON.parse(localStorage.getItem('limedrop-settings') || '{}');
    
    // Save control style
    settings.windowControlStyle = this.dropdowns.windowControlStyle.getValue() || 'circle';
    
    // Save individual icons
    ['minimize', 'maximize', 'close'].forEach(controlType => {
        const picker = this.windowEl.querySelector(`#${controlType}-icon-picker`);
        if (picker) {
            const selectedItem = picker.querySelector('.icon-picker-item.selected');
            if (selectedItem) {
                settings[`${controlType}Icon`] = selectedItem.dataset.iconClass;
                settings[`${controlType}IconName`] = selectedItem.dataset.iconName;
            }
        }
    });
    
    localStorage.setItem('limedrop-settings', JSON.stringify(settings));
}

changeWindowHeaderColor(color) {
    const rgb = this.hexToRgb(color);
    if (rgb) {
        document.documentElement.style.setProperty('--window-header-color', color);
        document.documentElement.style.setProperty('--window-header-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
    this.saveSettings();
}

changeWindowHeaderOpacity(opacity) {
    const opacityValue = opacity / 100;
    document.documentElement.style.setProperty('--window-header-opacity', opacityValue);
    this.saveSettings();
}

changeWindowHeaderText(color) {
    document.documentElement.style.setProperty('--window-header-text', color);
    this.saveSettings();
}

changeWindowHeaderBorderOpacity(opacity) {
    const opacityValue = opacity / 100;
    document.documentElement.style.setProperty('--window-header-border-opacity', opacityValue);
    this.saveSettings();
}
}

function applyWindowControlSettings(windowElement) {
    const settings = JSON.parse(localStorage.getItem('limedrop-settings') || '{}');
    
    // Apply styles and icons
    const style = settings.windowControlStyle || 'circle';
    const controls = windowElement.querySelectorAll('.window-control');
    
    controls.forEach(control => {
        control.className = control.className.replace(/style-\w+/g, '');
        if (style !== 'circle') {
            control.classList.add(`style-${style}`);
        }
    });
}

// Watch for new windows and auto-apply settings
new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.classList && node.classList.contains('window')) {
                applyWindowControlSettings(node);
            }
        });
    });
}).observe(document.body, { childList: true, subtree: true });
