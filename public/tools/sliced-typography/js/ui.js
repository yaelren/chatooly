/*
 * Chatooly UI Controls
 * Handles UI-specific functionality like collapsible sections,
 * control visibility toggles, and other interface interactions.
 */

// Setup toggle button functionality
document.addEventListener('DOMContentLoaded', () => {
    // Setup collapsible section cards
    setupSectionCards();
    // Transparent background toggle
    const transparentToggle = document.getElementById('transparent-bg');
    if (transparentToggle) {
        transparentToggle.addEventListener('click', () => {
            const isPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            transparentToggle.setAttribute('aria-pressed', newState);
            
            // Show/hide background color picker based on toggle state
            const bgColorGroup = document.getElementById('bg-color-group');
            if (bgColorGroup) {
                bgColorGroup.style.display = newState ? 'none' : 'block';
            }
        });
    }
    
    // Drop shadow toggle
    const dropShadowToggle = document.getElementById('drop-shadow-toggle');
    if (dropShadowToggle) {
        dropShadowToggle.addEventListener('click', () => {
            const isPressed = dropShadowToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            dropShadowToggle.setAttribute('aria-pressed', newState);

            const controls = document.getElementById('drop-shadow-controls');
            if (controls) {
                controls.style.display = newState ? 'block' : 'none';
            }
        });
    }
    
    // Show image toggle
    const showImageToggle = document.getElementById('show-image-toggle');
    if (showImageToggle) {
        showImageToggle.addEventListener('click', () => {
            const isPressed = showImageToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            showImageToggle.setAttribute('aria-pressed', newState);
        });
    }
});

/**
 * Setup collapsible section cards
 */
function setupSectionCards() {
    const sectionHeaders = document.querySelectorAll('.chatooly-section-header[data-target]');

    sectionHeaders.forEach(header => {
        header.addEventListener('click', () => toggleSection(header));
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSection(header);
            }
        });
    });
}

/**
 * Toggle a section's visibility
 */
function toggleSection(header) {
    const targetId = header.getAttribute('data-target');
    const content = document.getElementById(targetId);
    if (!content) return;

    const isExpanded = header.getAttribute('aria-expanded') === 'true';
    header.setAttribute('aria-expanded', !isExpanded);
    content.style.display = isExpanded ? 'none' : 'block';

    const toggle = header.querySelector('.section-toggle');
    if (toggle) {
        toggle.textContent = isExpanded ? '▶' : '▼';
    }
}
