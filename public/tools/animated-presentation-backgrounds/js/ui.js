/**
 * Animated Presentation Backgrounds - UI Controller
 * Handles all UI interactions, toggle buttons, sliders, and control updates
 */

class AnimatedBackgroundUIController {
    constructor() {
        this.init();
    }

    init() {
        this.setupToggleButtons();
        this.setupSliders();
    }

    setupToggleButtons() {
        const toggleButtons = document.querySelectorAll('.chatooly-toggle');

        toggleButtons.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const isPressed = toggle.getAttribute('aria-pressed') === 'true';
                const newState = !isPressed;
                toggle.setAttribute('aria-pressed', newState);

                this.handleToggleChange(toggle.id, newState);
            });
        });

        // Special handling for transparent background
        const transparentToggle = document.getElementById('transparent-bg');
        if (transparentToggle) {
            transparentToggle.addEventListener('click', () => {
                const isPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
                const bgColorGroup = document.getElementById('bg-color-group');
                if (bgColorGroup) {
                    bgColorGroup.style.display = !isPressed ? 'block' : 'none';
                }
            });
        }
    }

    setupSliders() {
        const sliders = [
            { id: 'animation-speed', valueId: 'animation-speed-value' },
            { id: 'animation-intensity', valueId: 'animation-intensity-value' },
            { id: 'complexity', valueId: 'complexity-value' },
            { id: 'density', valueId: 'density-value' },
            { id: 'blur', valueId: 'blur-value' },
            { id: 'opacity', valueId: 'opacity-value' }
        ];

        sliders.forEach(({ id, valueId }) => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(valueId);

            if (slider && valueDisplay) {
                slider.addEventListener('input', (e) => {
                    valueDisplay.textContent = e.target.value;
                });

                valueDisplay.textContent = slider.value;
            }
        });
    }

    handleToggleChange(toggleId, isEnabled) {
        if (!window.animatedBackground) return;

        switch (toggleId) {
            case 'animation-enabled':
                window.animatedBackground.config.animationEnabled = isEnabled;
                break;
        }
    }
}

// Initialize UI controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.animatedBackgroundUIController = new AnimatedBackgroundUIController();
    }, 150);
});
