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
});
