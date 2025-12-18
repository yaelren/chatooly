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

// Setup toggle button functionality for transparent background
document.addEventListener('DOMContentLoaded', () => {
    const transparentToggle = document.getElementById('transparent-bg');

    if (transparentToggle) {
        // Initialize toggle button click handler
        transparentToggle.addEventListener('click', () => {
            const isPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;

            // Update toggle button state
            transparentToggle.setAttribute('aria-pressed', newState);

            // Show/hide background color picker based on toggle state
            const bgColorGroup = document.getElementById('bg-color-group');
            if (bgColorGroup) {
                bgColorGroup.style.display = newState ? 'none' : 'block';
            }
        });
    }

    // Setup toggle button functionality for show stroke
    const showStrokeToggle = document.getElementById('show-stroke');

    if (showStrokeToggle) {
        // Initialize toggle button click handler
        showStrokeToggle.addEventListener('click', () => {
            const isPressed = showStrokeToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;

            // Update toggle button state
            showStrokeToggle.setAttribute('aria-pressed', newState);

            // Show/hide stroke controls based on toggle state
            const strokeColorGroup = document.getElementById('stroke-color-group');
            const strokeWidthGroup = document.getElementById('stroke-width-group');
            if (strokeColorGroup) {
                strokeColorGroup.style.display = newState ? 'block' : 'none';
            }
            if (strokeWidthGroup) {
                strokeWidthGroup.style.display = newState ? 'block' : 'none';
            }

            // Update the showStroke variable in main.js if it exists
            if (typeof window.updateShowStroke === 'function') {
                window.updateShowStroke(newState);
            }
        });
    }
});
