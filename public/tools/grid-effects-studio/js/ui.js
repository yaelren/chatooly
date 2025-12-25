/**
 * 3D Grid Points Generator - UI Controller
 * Handles UI interactions and slider value displays
 */

class GridPoints3DUIController {
    constructor() {
        this.init();
    }

    init() {
        this.setupSliders();
    }

    setupSliders() {
        const sliders = [
            { id: 'grid-spacing', valueId: 'grid-spacing-value' },
            { id: 'grid-size', valueId: 'grid-size-value' },
            { id: 'point-size', valueId: 'point-size-value' },
            { id: 'animation-speed', valueId: 'animation-speed-value' },
            { id: 'movement-intensity', valueId: 'movement-intensity-value' },
            { id: 'metalness', valueId: 'metalness-value' },
            { id: 'roughness', valueId: 'roughness-value' },
            { id: 'shininess', valueId: 'shininess-value' },
            { id: 'camera-distance', valueId: 'camera-distance-value' },
            { id: 'depth-effect', valueId: 'depth-effect-value' }
        ];

        sliders.forEach(({ id, valueId }) => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(valueId);

            if (slider && valueDisplay) {
                // Update display on input (main.js handles the actual logic)
                slider.addEventListener('input', (e) => {
                    valueDisplay.textContent = e.target.value;
                });

                // Set initial display value
                valueDisplay.textContent = slider.value;
            }
        });
    }
}

// Initialize UI controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.gridPoints3DUIController = new GridPoints3DUIController();
    }, 150);
});
