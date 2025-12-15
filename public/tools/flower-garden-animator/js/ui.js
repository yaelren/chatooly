/*
 * Flower Garden Animator - UI Controls
 * Author: Claude Code
 *
 * This file handles all UI control interactions including:
 * - Background system integration (MANDATORY)
 * - Flower garden control updates
 * - Toggle buttons and slider value displays
 */

// Initialize all UI controls when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeBackgroundControls();
    initializeFlowerGardenControls();
    initializeToggleButtons();
    initializeSliderValueUpdates();
});

// ========== BACKGROUND CONTROLS (MANDATORY CHATOOLY INTEGRATION) ==========
function initializeBackgroundControls() {
    // Wait for both Chatooly CDN and flowerGarden to be ready
    const waitForDependencies = () => {
        if (window.Chatooly && window.Chatooly.backgroundManager && window.flowerGarden) {
            setupBackgroundEventListeners();
        } else {
            setTimeout(waitForDependencies, 100);
        }
    };
    waitForDependencies();
}

function setupBackgroundEventListeners() {
    // Transparent Background Toggle
    const transparentBg = document.getElementById('transparent-bg');
    if (transparentBg) {
        transparentBg.addEventListener('click', () => {
            const isPressed = transparentBg.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;

            // Update toggle state
            transparentBg.setAttribute('aria-pressed', newState);

            // Update background manager
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                Chatooly.backgroundManager.setTransparent(newState);
            }

            // Hide/show color picker
            const bgColorGroup = document.getElementById('bg-color-group');
            if (bgColorGroup) {
                bgColorGroup.style.display = newState ? 'none' : 'block';
            }

            // Trigger render if flower garden is ready
            if (window.flowerGarden) {
                window.flowerGarden.redrawContent();
            }
        });
    }

    // Background Color Picker
    const bgColor = document.getElementById('bg-color');
    if (bgColor) {
        bgColor.addEventListener('input', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                Chatooly.backgroundManager.setBackgroundColor(e.target.value);
            }
            if (window.flowerGarden) {
                window.flowerGarden.redrawContent();
            }
        });
    }

    // Background Image Upload
    const bgImage = document.getElementById('bg-image');
    if (bgImage) {
        bgImage.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                if (window.Chatooly && window.Chatooly.backgroundManager) {
                    await Chatooly.backgroundManager.setBackgroundImage(file);
                }

                // Show clear button and fit dropdown
                const clearButton = document.getElementById('clear-bg-image');
                const fitGroup = document.getElementById('bg-fit-group');
                if (clearButton) clearButton.style.display = 'block';
                if (fitGroup) fitGroup.style.display = 'block';

                if (window.flowerGarden) {
                    window.flowerGarden.redrawContent();
                }
            } catch (error) {
                alert('Failed to load background image: ' + error.message);
            }
        });
    }

    // Clear Background Image Button
    const clearBgImage = document.getElementById('clear-bg-image');
    if (clearBgImage) {
        clearBgImage.addEventListener('click', () => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                Chatooly.backgroundManager.clearBackgroundImage();
            }

            // Hide clear button and fit dropdown
            clearBgImage.style.display = 'none';
            const fitGroup = document.getElementById('bg-fit-group');
            const bgImageInput = document.getElementById('bg-image');
            if (fitGroup) fitGroup.style.display = 'none';
            if (bgImageInput) bgImageInput.value = '';

            if (window.flowerGarden) {
                window.flowerGarden.redrawContent();
            }
        });
    }

    // Background Image Fit Mode
    const bgFit = document.getElementById('bg-fit');
    if (bgFit) {
        bgFit.addEventListener('change', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                Chatooly.backgroundManager.setFit(e.target.value);
            }
            if (window.flowerGarden) {
                window.flowerGarden.redrawContent();
            }
        });
    }
}

// ========== FLOWER GARDEN CONTROLS ==========
function initializeFlowerGardenControls() {
    // Wait for flowerGarden to be ready
    const waitForGarden = () => {
        if (window.flowerGarden) {
            setupGardenEventListeners();
        } else {
            setTimeout(waitForGarden, 100);
        }
    };
    waitForGarden();
}

function setupGardenEventListeners() {
    // Number of Flowers
    const flowerCountSlider = document.getElementById('flower-count');
    if (flowerCountSlider) {
        flowerCountSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (window.flowerGarden) {
                window.flowerGarden.updateSettings({ flowerCount: value });
            }
        });
    }

    // Garden Style
    const gardenStyle = document.getElementById('garden-style');
    if (gardenStyle) {
        gardenStyle.addEventListener('change', (e) => {
            if (window.flowerGarden) {
                window.flowerGarden.updateSettings({ gardenStyle: e.target.value });
            }
        });
    }

    // Wind Strength
    const windStrength = document.getElementById('wind-strength');
    if (windStrength) {
        windStrength.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (window.flowerGarden) {
                window.flowerGarden.updateSettings({ windStrength: value });
            }
        });
    }

    // Primary Flower Color
    const flowerColorPrimary = document.getElementById('flower-color-primary');
    if (flowerColorPrimary) {
        flowerColorPrimary.addEventListener('input', (e) => {
            if (window.flowerGarden) {
                window.flowerGarden.updateSettings({ flowerColorPrimary: e.target.value });
            }
        });
    }

    // Secondary Flower Color
    const flowerColorSecondary = document.getElementById('flower-color-secondary');
    if (flowerColorSecondary) {
        flowerColorSecondary.addEventListener('input', (e) => {
            if (window.flowerGarden) {
                window.flowerGarden.updateSettings({ flowerColorSecondary: e.target.value });
            }
        });
    }

    // Flower Size
    const flowerSize = document.getElementById('flower-size');
    if (flowerSize) {
        flowerSize.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (window.flowerGarden) {
                window.flowerGarden.updateSettings({ flowerSize: value });
            }
        });
    }

    // Petal Count
    const petalCount = document.getElementById('petal-count');
    if (petalCount) {
        petalCount.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (window.flowerGarden) {
                window.flowerGarden.updateSettings({ petalCount: value });
            }
        });
    }

    // Animation Speed
    const animationSpeed = document.getElementById('animation-speed');
    if (animationSpeed) {
        animationSpeed.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (window.flowerGarden) {
                window.flowerGarden.updateSettings({ animationSpeed: value });
            }
        });
    }
}

// ========== TOGGLE BUTTON FUNCTIONALITY ==========
function initializeToggleButtons() {
    // Butterflies Toggle
    const butterfliesToggle = document.getElementById('butterflies-toggle');
    if (butterfliesToggle) {
        butterfliesToggle.addEventListener('click', () => {
            const isPressed = butterfliesToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;

            butterfliesToggle.setAttribute('aria-pressed', newState);

            if (window.flowerGarden) {
                window.flowerGarden.updateSettings({ butterfliesEnabled: newState });
            }
        });
    }

    // Growing Animation Toggle
    const growingToggle = document.getElementById('growing-toggle');
    if (growingToggle) {
        growingToggle.addEventListener('click', () => {
            const isPressed = growingToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;

            growingToggle.setAttribute('aria-pressed', newState);

            if (window.flowerGarden) {
                window.flowerGarden.updateSettings({ growingAnimation: newState });
                // If enabling growing animation, recreate garden to show the effect
                if (newState) {
                    window.flowerGarden.createGarden();
                }
            }
        });
    }
}

// ========== SLIDER VALUE DISPLAY UPDATES ==========
function initializeSliderValueUpdates() {
    // Function to update slider value display
    function updateSliderValue(sliderId, valueId, formatter = (v) => v) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);

        if (slider && valueDisplay) {
            const updateValue = () => {
                valueDisplay.textContent = formatter(slider.value);
            };

            // Update on input
            slider.addEventListener('input', updateValue);
            // Initialize display
            updateValue();
        }
    }

    // Update all slider value displays
    updateSliderValue('flower-count', 'flower-count-value');
    updateSliderValue('wind-strength', 'wind-strength-value', (v) => parseFloat(v).toFixed(1));
    updateSliderValue('flower-size', 'flower-size-value');
    updateSliderValue('petal-count', 'petal-count-value');
    updateSliderValue('animation-speed', 'animation-speed-value', (v) => parseFloat(v).toFixed(1));
}

// ========== UTILITY FUNCTIONS ==========

// Function to get current toggle state
function getToggleState(toggleId) {
    const toggle = document.getElementById(toggleId);
    return toggle ? toggle.getAttribute('aria-pressed') === 'true' : false;
}

// Function to set toggle state programmatically
function setToggleState(toggleId, state) {
    const toggle = document.getElementById(toggleId);
    if (toggle) {
        toggle.setAttribute('aria-pressed', state.toString());
    }
}

// Export functions for use in other modules
window.UI = {
    getToggleState,
    setToggleState
};