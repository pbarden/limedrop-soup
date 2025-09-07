// Settings helper functions and initialization
class SettingsHelpers {
    static initializeAnimationControls() {
        document.addEventListener('DOMContentLoaded', function() {
            const intensitySlider = document.getElementById('animation-intensity');
            const intensityValue = document.querySelector('.intensity-value');
            const previewBtn = document.getElementById('preview-current-animation');
            
            if (intensitySlider && intensityValue) {
                intensitySlider.addEventListener('input', function() {
                    const value = this.value;
                    intensityValue.textContent = value + '%';
                    
                    const desktop = document.querySelector('.desktop-background');
                    if (desktop) {
                        const intensity = value / 100;
                        desktop.style.setProperty('--animation-intensity', intensity);
                        desktop.style.animationDuration = `${Math.max(2, 15 / intensity)}s`;
                    }
                });
            }
            
            if (previewBtn) {
                previewBtn.addEventListener('click', function() {
                    const dropdown = document.getElementById('animation-style-dropdown');
                    const selectedOption = dropdown.querySelector('.module-option.selected');
                    const currentStyle = selectedOption ? selectedOption.dataset.value : 'gradient-flow';
                    
                    this.classList.add('previewing');
                    this.innerHTML = '<i class="fas fa-spinner"></i> Previewing...';
                    
                    const desktop = document.querySelector('.desktop-background');
                    const wasAnimated = desktop.classList.contains('animated');
                    
                    if (!wasAnimated) {
                        desktop.classList.add('animated');
                    }
                    
                    desktop.className = desktop.className.replace(/\b(gradient-flow|floating-orbs|breathing|pulse-waves|color-shift|shimmer|particle-flow)\b/g, '');
                    desktop.classList.add(currentStyle);
                    
                    if (window.notificationManager) {
                        window.notificationManager.show({
                            title: 'Animation Preview',
                            message: `Previewing ${currentStyle.replace('-', ' ')} animation...`,
                            type: 'info',
                            duration: 3000
                        });
                    }
                    
                    setTimeout(() => {
                        this.classList.remove('previewing');
                        this.innerHTML = '<i class="fas fa-eye"></i> Preview';
                        
                        const animationCheckbox = document.getElementById('background-animation');
                        if (!animationCheckbox.checked && !wasAnimated) {
                            desktop.classList.remove('animated', currentStyle);
                        }
                    }, 3000);
                });
            }
        });
    }

    static getBackgroundGradients() {
        return [
            { value: 'gradient1', name: 'Raspberry Lemonade', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)' },
            { value: 'gradient2', name: 'Blue Java', gradient: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e8ba3 100%)' },
            { value: 'gradient3', name: 'Mango Sherbert', gradient: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 50%, #f29400 100%)' },
            { value: 'gradient4', name: 'Black Sesame', gradient: 'linear-gradient(135deg, #2f2f2f 0%, #4a4a4a 35%, #8f8f8f 70%, #dedede 100%)' },
            { value: 'gradient5', name: 'Brown Sugar Milk', gradient: 'linear-gradient(135deg, #4e2a12 0%, #8a4f2d 35%, #d29b6e 70%, #f6eadc 100%)' }
        ];
    }

    static getAnimationOptions() {
        return [
            { value: 'gradient-flow', name: '🌊 Gradient Flow', desc: 'Smooth color transitions' },
            { value: 'floating-orbs', name: '🔮 Floating Orbs', desc: 'Glowing spheres drift across' },
            { value: 'breathing', name: '💨 Breathing', desc: 'Gentle pulsing effect' },
            { value: 'pulse-waves', name: '〰️ Pulse Waves', desc: 'Ripples from center' },
            { value: 'color-shift', name: '🌈 Color Shift', desc: 'Cycles through color spectrum' },
            { value: 'shimmer', name: '✨ Shimmer', desc: 'Light waves sweep across' },
            { value: 'particle-flow', name: '⭐ Particle Flow', desc: 'Moving light particles' }
        ];
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    SettingsHelpers.initializeAnimationControls();
});