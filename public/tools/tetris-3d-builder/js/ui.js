/**
 * 3D Tetris Block Builder - UI Controller
 * Handles all UI interactions, toggle buttons, sliders, and control updates
 */

class TetrisUIController {
    constructor() {
        this.init();
    }

    init() {
        this.setupToggleButtons();
        this.setupSliders();
        this.setupColorModeToggle();
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
                    bgColorGroup.style.display = !isPressed ? 'none' : 'block';
                }
            });
        }
    }

    setupSliders() {
        const sliders = [
            { id: 'block-spacing', valueId: 'block-spacing-value' },
            { id: 'block-size', valueId: 'block-size-value' },
            { id: 'letter-spacing', valueId: 'letter-spacing-value' },
            { id: 'depth', valueId: 'depth-value' },
            { id: 'perspective', valueId: 'perspective-value' },
            { id: 'rotation-x', valueId: 'rotation-x-value' },
            { id: 'rotation-y', valueId: 'rotation-y-value' },
            { id: 'rotation-speed', valueId: 'rotation-speed-value' },
            { id: 'camera-distance', valueId: 'camera-distance-value' },
            { id: 'lighting', valueId: 'lighting-value' }
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

    setupColorModeToggle() {
        const colorMode = document.getElementById('color-mode');
        const customColorGroup = document.getElementById('custom-color-group');

        if (colorMode && customColorGroup) {
            colorMode.addEventListener('change', (e) => {
                customColorGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
            });
        }
    }

    handleToggleChange(toggleId, isEnabled) {
        if (!window.tetrisBuilder) return;

        switch (toggleId) {
            case 'auto-rotate':
                window.tetrisBuilder.animationState.autoRotate = isEnabled;
                break;
            case 'floating-animation':
                window.tetrisBuilder.animationState.floatingAnimation = isEnabled;
                break;
        }
    }
}

// Initialize UI controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.tetrisUIController = new TetrisUIController();
    }, 150);
});
