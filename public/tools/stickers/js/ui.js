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
    // Helper function to setup collapsible section
    function setupCollapsible(headerId, sectionId) {
        const header = document.getElementById(headerId);
        const section = document.getElementById(sectionId);

        if (header && section) {
            header.style.cursor = 'pointer';

            header.addEventListener('click', () => {
                const isOpen = section.style.display !== 'none';
                section.style.display = isOpen ? 'none' : 'block';

                const toggle = header.querySelector('.section-toggle');
                if (toggle) {
                    toggle.textContent = isOpen ? '▶' : '▼';
                }
            });
        }
    }

    // Setup all collapsible sections
    setupCollapsible('text-header', 'text-section');
    setupCollapsible('colors-header', 'colors-section');
    setupCollapsible('shape-header', 'shape-section');
    setupCollapsible('effects-header', 'effects-section');
    setupCollapsible('background-header', 'background-section');
});
