/*
 * Chatooly UI Controls
 * Author: Yael Renous - Studio Video
 *
 * This file handles UI-specific functionality like collapsible sections,
 * control visibility toggles, and other interface interactions.
 *
 * 🤖 AI AGENTS: Put UI control logic here, NOT in main.js
 * - Collapsible sections
 * - Show/hide control groups
 * - Button interactions that don't affect canvas
 * - Form validation and UI state management
 */

// Setup collapsible sections
document.addEventListener('DOMContentLoaded', () => {
    const backgroundHeader = document.getElementById('background-header');
    const backgroundSection = document.getElementById('background-section');
    const gradientHeader = document.getElementById('gradient-header');
    const gradientSection = document.getElementById('gradient-section');

    if (backgroundHeader && backgroundSection) {
        backgroundHeader.style.cursor = 'pointer';

        backgroundHeader.addEventListener('click', () => {
            const isOpen = backgroundSection.style.display !== 'none';
            backgroundSection.style.display = isOpen ? 'none' : 'block';

            const toggle = backgroundHeader.querySelector('.section-toggle');
            if (toggle) {
                toggle.textContent = isOpen ? '▶' : '▼';
            }
        });
    }

    if (gradientHeader && gradientSection) {
        gradientHeader.style.cursor = 'pointer';

        gradientHeader.addEventListener('click', () => {
            const isOpen = gradientSection.style.display !== 'none';
            gradientSection.style.display = isOpen ? 'none' : 'block';

            const toggle = gradientHeader.querySelector('.section-toggle');
            if (toggle) {
                toggle.textContent = isOpen ? '▶' : '▼';
            }
        });
    }

    // Shape-dependent control visibility
    const shapeSelect = document.getElementById('shape-type');
    const ellipseGroup = document.getElementById('ellipse-group');
    const randomGroup = document.getElementById('random-path-group');
    if (shapeSelect) {
        const updateVisibility = () => {
            const val = shapeSelect.value;
            if (ellipseGroup) ellipseGroup.style.display = (val === 'ellipse') ? 'block' : 'none';
            if (randomGroup) randomGroup.style.display = (val === 'random') ? 'block' : 'none';
        };
        shapeSelect.addEventListener('change', updateVisibility);
        updateVisibility();
    }
});

// Cleanup: removed per-blob X/Y inputs logic
