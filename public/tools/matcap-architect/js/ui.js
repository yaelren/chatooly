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
});
