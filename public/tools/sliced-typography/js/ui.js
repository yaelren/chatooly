/*
 * Chatooly UI Controls
 * Handles UI-specific functionality like collapsible sections,
 * control visibility toggles, and other interface interactions.
 */

// Setup toggle button functionality
document.addEventListener('DOMContentLoaded', () => {
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
                controls.style.display = newState ? 'none' : 'block';
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
    
    // Circle stroke toggle
    const circleStrokeToggle = document.getElementById('circle-stroke-toggle');
    if (circleStrokeToggle) {
        circleStrokeToggle.addEventListener('click', () => {
            const isPressed = circleStrokeToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            circleStrokeToggle.setAttribute('aria-pressed', newState);
            
            const controls = document.getElementById('circle-stroke-controls');
            if (controls) {
                controls.style.display = newState ? 'none' : 'block';
            }
        });
    }
    
    // Slice mode change handler
    const sliceModeSelect = document.getElementById('slice-mode');
    if (sliceModeSelect) {
        sliceModeSelect.addEventListener('change', () => {
            const mode = sliceModeSelect.value;
            const circleControlsSection = document.getElementById('circle-controls-section');
            if (circleControlsSection) {
                circleControlsSection.style.display = mode === 'circles' ? 'block' : 'none';
            }
        });
    }
});
