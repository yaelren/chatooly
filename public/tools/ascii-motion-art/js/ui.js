/*
 * ASCII Motion Art - UI Controls
 * Author: EinavR
 *
 * This file handles UI-specific functionality for the ASCII Motion Art tool
 */

document.addEventListener('DOMContentLoaded', () => {
    // Wait for the ASCII art system to initialize
    setTimeout(() => {
        if (window.asciiArt) {
            setupUIControls();
        } else {
            // Retry after a bit more time
            setTimeout(() => {
                if (window.asciiArt) setupUIControls();
            }, 200);
        }
    }, 150);
});

function setupUIControls() {
    // ========== TEXT CONTROLS ==========

    // Text input
    const textInput = document.getElementById('ascii-text');
    if (textInput) {
        textInput.addEventListener('input', (e) => {
            if (window.asciiArt) {
                window.asciiArt.updateText(e.target.value || 'MOTION');
            }
        });
    }

    // Text color
    const textColor = document.getElementById('text-color');
    if (textColor) {
        textColor.addEventListener('input', (e) => {
            if (window.asciiArt) {
                window.asciiArt.updateColor(e.target.value);
            }
        });
    }

    // ========== LAYOUT & DENSITY CONTROLS ==========

    // Density slider
    const densitySlider = document.getElementById('density-slider');
    const densityValue = document.getElementById('density-value');
    if (densitySlider && densityValue) {
        densitySlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            densityValue.textContent = value;
            if (window.asciiArt) {
                window.asciiArt.updateDensity(value);
            }
        });
    }

    // Spread slider
    const spreadSlider = document.getElementById('spread-slider');
    const spreadValue = document.getElementById('spread-value');
    if (spreadSlider && spreadValue) {
        spreadSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            spreadValue.textContent = value;
            if (window.asciiArt) {
                window.asciiArt.updateSpread(value);
            }
        });
    }

    // Layout pattern dropdown
    const layoutPattern = document.getElementById('layout-pattern');
    if (layoutPattern) {
        layoutPattern.addEventListener('change', (e) => {
            if (window.asciiArt) {
                window.asciiArt.updateLayoutPattern(e.target.value);
            }
        });
    }

    // ========== MOTION CONTROLS ==========

    // Motion enabled toggle
    const motionEnabled = document.getElementById('motion-enabled');
    if (motionEnabled) {
        motionEnabled.addEventListener('click', () => {
            const isPressed = motionEnabled.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            motionEnabled.setAttribute('aria-pressed', newState);

            if (window.asciiArt) {
                window.asciiArt.updateMotionSettings(
                    newState,
                    window.asciiArt.settings.motionType,
                    window.asciiArt.settings.motionSpeed,
                    window.asciiArt.settings.motionIntensity
                );
            }
        });
    }

    // Motion type dropdown
    const motionType = document.getElementById('motion-type');
    if (motionType) {
        motionType.addEventListener('change', (e) => {
            if (window.asciiArt) {
                window.asciiArt.updateMotionSettings(
                    window.asciiArt.settings.motionEnabled,
                    e.target.value,
                    window.asciiArt.settings.motionSpeed,
                    window.asciiArt.settings.motionIntensity
                );
            }
        });
    }

    // Motion speed slider
    const motionSpeed = document.getElementById('motion-speed');
    const motionSpeedValue = document.getElementById('motion-speed-value');
    if (motionSpeed && motionSpeedValue) {
        motionSpeed.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            motionSpeedValue.textContent = value;
            if (window.asciiArt) {
                window.asciiArt.updateMotionSettings(
                    window.asciiArt.settings.motionEnabled,
                    window.asciiArt.settings.motionType,
                    value,
                    window.asciiArt.settings.motionIntensity
                );
            }
        });
    }

    // Motion intensity slider
    const motionIntensity = document.getElementById('motion-intensity');
    const motionIntensityValue = document.getElementById('motion-intensity-value');
    if (motionIntensity && motionIntensityValue) {
        motionIntensity.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            motionIntensityValue.textContent = value;
            if (window.asciiArt) {
                window.asciiArt.updateMotionSettings(
                    window.asciiArt.settings.motionEnabled,
                    window.asciiArt.settings.motionType,
                    window.asciiArt.settings.motionSpeed,
                    value
                );
            }
        });
    }

    // ========== MOUSE INTERACTION CONTROLS ==========

    // Mouse enabled toggle
    const mouseEnabled = document.getElementById('mouse-enabled');
    if (mouseEnabled) {
        mouseEnabled.addEventListener('click', () => {
            const isPressed = mouseEnabled.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            mouseEnabled.setAttribute('aria-pressed', newState);

            if (window.asciiArt) {
                window.asciiArt.updateMouseSettings(
                    newState,
                    window.asciiArt.settings.mouseEffect,
                    window.asciiArt.settings.mouseRadius,
                    window.asciiArt.settings.mouseStrength
                );
            }
        });
    }

    // Mouse effect dropdown
    const mouseEffect = document.getElementById('mouse-effect');
    if (mouseEffect) {
        mouseEffect.addEventListener('change', (e) => {
            if (window.asciiArt) {
                window.asciiArt.updateMouseSettings(
                    window.asciiArt.settings.mouseEnabled,
                    e.target.value,
                    window.asciiArt.settings.mouseRadius,
                    window.asciiArt.settings.mouseStrength
                );
            }
        });
    }

    // Mouse radius slider
    const mouseRadius = document.getElementById('mouse-radius');
    const mouseRadiusValue = document.getElementById('mouse-radius-value');
    if (mouseRadius && mouseRadiusValue) {
        mouseRadius.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            mouseRadiusValue.textContent = value;
            if (window.asciiArt) {
                window.asciiArt.updateMouseSettings(
                    window.asciiArt.settings.mouseEnabled,
                    window.asciiArt.settings.mouseEffect,
                    value,
                    window.asciiArt.settings.mouseStrength
                );
            }
        });
    }

    // Mouse strength slider
    const mouseStrength = document.getElementById('mouse-strength');
    const mouseStrengthValue = document.getElementById('mouse-strength-value');
    if (mouseStrength && mouseStrengthValue) {
        mouseStrength.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            mouseStrengthValue.textContent = value;
            if (window.asciiArt) {
                window.asciiArt.updateMouseSettings(
                    window.asciiArt.settings.mouseEnabled,
                    window.asciiArt.settings.mouseEffect,
                    window.asciiArt.settings.mouseRadius,
                    value
                );
            }
        });
    }

    // ========== BACKGROUND CONTROLS ==========

    // Transparent background toggle
    const transparentBg = document.getElementById('transparent-bg');
    if (transparentBg) {
        transparentBg.addEventListener('click', () => {
            const isPressed = transparentBg.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            transparentBg.setAttribute('aria-pressed', newState);

            // Show/hide background color picker based on toggle state
            const bgColorGroup = document.getElementById('bg-color-group');
            if (bgColorGroup) {
                bgColorGroup.style.display = newState ? 'none' : 'block';
            }
        });
    }
}
