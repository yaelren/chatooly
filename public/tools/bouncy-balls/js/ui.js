/*
 * Bouncy Balls - UI Controls
 * Author: Claude Code
 *
 * Handles UI control interactions for the bouncy balls tool.
 * Connects sliders, buttons, and toggles to the physics engine.
 */

// Setup all UI controls when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupBallControls();
    setupPhysicsControls();
    setupBackgroundToggle();
    setupUtilityButtons();
});

// ========== BALL PROPERTY CONTROLS ==========
function setupBallControls() {
    // Ball Color Control
    const ballColorInput = document.getElementById('ball-color');
    if (ballColorInput) {
        ballColorInput.addEventListener('input', (e) => {
            if (window.ballsEngine) {
                window.ballsEngine.updateSettings({ ballColor: e.target.value });
            }
        });
    }

    // Ball Size Control
    const ballSizeSlider = document.getElementById('ball-size');
    const ballSizeValue = document.getElementById('ball-size-value');
    if (ballSizeSlider && ballSizeValue) {
        ballSizeSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            ballSizeValue.textContent = value;
            if (window.ballsEngine) {
                window.ballsEngine.updateSettings({ ballSize: value });
            }
        });

        // Initialize display value
        ballSizeValue.textContent = ballSizeSlider.value;
    }

    // Ball Speed Control
    const ballSpeedSlider = document.getElementById('ball-speed');
    const ballSpeedValue = document.getElementById('ball-speed-value');
    if (ballSpeedSlider && ballSpeedValue) {
        ballSpeedSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            ballSpeedValue.textContent = value;
            if (window.ballsEngine) {
                window.ballsEngine.updateSettings({ ballSpeed: value });
            }
        });

        // Initialize display value
        ballSpeedValue.textContent = ballSpeedSlider.value;
    }
}

// ========== PHYSICS CONTROLS ==========
function setupPhysicsControls() {
    // Gravity Control
    const gravitySlider = document.getElementById('gravity');
    const gravityValue = document.getElementById('gravity-value');
    if (gravitySlider && gravityValue) {
        gravitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            gravityValue.textContent = value;
            if (window.ballsEngine) {
                window.ballsEngine.updateSettings({ gravity: value });
            }
        });

        // Initialize display value
        gravityValue.textContent = gravitySlider.value;
    }

    // Bounce Damping Control
    const bounceDampingSlider = document.getElementById('bounce-damping');
    const bounceDampingValue = document.getElementById('bounce-damping-value');
    if (bounceDampingSlider && bounceDampingValue) {
        bounceDampingSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            bounceDampingValue.textContent = value;
            if (window.ballsEngine) {
                window.ballsEngine.updateSettings({ bounceDamping: value });
            }
        });

        // Initialize display value
        bounceDampingValue.textContent = bounceDampingSlider.value;
    }
}

// ========== BACKGROUND TOGGLE ==========
function setupBackgroundToggle() {
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

            // Create a custom event for the transparent background change
            // The main.js backgroundManager will handle this via its own event listener
            const changeEvent = new Event('change');
            transparentToggle.checked = newState;
            transparentToggle.dispatchEvent(changeEvent);
        });
    }
}

// ========== UTILITY BUTTONS ==========
function setupUtilityButtons() {
    // Clear All Balls Button
    const clearBallsBtn = document.getElementById('clear-balls');
    if (clearBallsBtn) {
        clearBallsBtn.addEventListener('click', () => {
            if (window.ballsEngine) {
                window.ballsEngine.clearAllBalls();
            }
        });
    }
}

// ========== SECTION COLLAPSIBILITY ==========
// This is handled automatically by the Chatooly CDN for elements with .chatooly-section-card

// ========== HELPER FUNCTIONS ==========
function updateSliderValue(sliderId, valueId) {
    const slider = document.getElementById(sliderId);
    const valueSpan = document.getElementById(valueId);

    if (slider && valueSpan) {
        valueSpan.textContent = slider.value;
    }
}

// Initialize all slider values on load
document.addEventListener('DOMContentLoaded', () => {
    updateSliderValue('ball-size', 'ball-size-value');
    updateSliderValue('ball-speed', 'ball-speed-value');
    updateSliderValue('gravity', 'gravity-value');
    updateSliderValue('bounce-damping', 'bounce-damping-value');
});