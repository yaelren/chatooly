/*
 * Shape Morph Studio - UI Controls
 * Author: Claude Code
 *
 * This file handles UI-specific functionality like collapsible sections,
 * toggle button states, and other interface interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Setup toggle button functionality for all toggles
    setupToggleButtons();
});

function setupToggleButtons() {
    // Get all toggle buttons
    const toggleButtons = document.querySelectorAll('.chatooly-toggle');

    toggleButtons.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const isPressed = toggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;

            // Update toggle button state
            toggle.setAttribute('aria-pressed', newState);

            // Handle specific toggle behaviors
            if (toggle.id === 'transparent-bg') {
                // Show/hide background color picker based on toggle state
                const bgColorGroup = document.getElementById('bg-color-group');
                if (bgColorGroup) {
                    bgColorGroup.style.display = newState ? 'none' : 'block';
                }
            }

            // The main logic for these toggles is handled in main.js
            // This just ensures the UI state is properly updated
        });
    });
}
