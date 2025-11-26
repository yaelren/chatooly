/*
 * 3D Model Viewer - UI Controls
 * Author: Claude Code
 *
 * Handles UI-specific functionality including:
 * - Model upload and material controls
 * - Environment and lighting controls
 * - Animation controls and mode switching
 * - Background system integration
 */

// Wait for both DOM and viewer to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for viewer to be initialized
    const initUI = () => {
        if (window.viewer) {
            setupModelControls();
            setupEnvironmentControls();
            setupLightingControls();
            setupAnimationControls();
            setupBackgroundControls();
            setupSliderValueUpdates();
            console.log('3D Viewer UI initialized');
        } else {
            setTimeout(initUI, 100);
        }
    };

    initUI();
});

// ========== MODEL CONTROLS ==========
function setupModelControls() {
    // Model Upload
    const modelUpload = document.getElementById('model-upload');
    if (modelUpload) {
        modelUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                await window.viewer.loadModel(file);
                console.log('Model loaded successfully');
            } catch (error) {
                alert(`Failed to load model: ${error.message}`);
                console.error('Model load error:', error);
            }
        });
    }

    // Material Presets
    const materialPreset = document.getElementById('material-preset');
    if (materialPreset) {
        materialPreset.addEventListener('change', (e) => {
            window.viewer.applyMaterialPreset(e.target.value);
        });
    }

    // Model Transform Controls
    const modelScale = document.getElementById('model-scale');
    if (modelScale) {
        modelScale.addEventListener('input', (e) => {
            const scale = parseFloat(e.target.value);
            if (window.viewer.modelContainer) {
                window.viewer.modelContainer.scale.setScalar(scale);
            }
        });
    }

    const modelPosX = document.getElementById('model-pos-x');
    if (modelPosX) {
        modelPosX.addEventListener('input', (e) => {
            const posX = parseFloat(e.target.value);
            if (window.viewer.modelContainer) {
                window.viewer.modelContainer.position.x = posX;
            }
        });
    }

    const modelPosY = document.getElementById('model-pos-y');
    if (modelPosY) {
        modelPosY.addEventListener('input', (e) => {
            const posY = parseFloat(e.target.value);
            if (window.viewer.modelContainer) {
                window.viewer.modelContainer.position.y = posY;
            }
        });
    }
}

// ========== ENVIRONMENT CONTROLS ==========
function setupEnvironmentControls() {
    // HDRI Preset
    const hdriPreset = document.getElementById('hdri-preset');
    if (hdriPreset) {
        hdriPreset.addEventListener('change', async (e) => {
            try {
                await window.viewer.loadHDRI(e.target.value);
            } catch (error) {
                console.error('Failed to load HDRI:', error);
            }
        });
    }

    // HDRI Intensity
    const hdriIntensity = document.getElementById('hdri-intensity');
    if (hdriIntensity) {
        hdriIntensity.addEventListener('input', (e) => {
            const intensity = parseFloat(e.target.value);
            window.viewer.hdriIntensity = intensity;
            window.viewer.renderer.toneMappingExposure = intensity;
        });
    }

    // HDRI Rotation with debouncing for performance
    const hdriRotation = document.getElementById('hdri-rotation');
    if (hdriRotation) {
        let rotationTimeout;
        hdriRotation.addEventListener('input', (e) => {
            const rotation = parseInt(e.target.value);
            window.viewer.hdriRotation = rotation;

            // Debounce expensive rotation update
            clearTimeout(rotationTimeout);
            rotationTimeout = setTimeout(() => {
                if (window.viewer.originalHDRITexture) {
                    window.viewer.generateRotatedEnvironment(
                        window.viewer.originalHDRITexture,
                        rotation * Math.PI / 180
                    );
                }
            }, 300);
        });
    }

    // Show HDRI Background Toggle
    const hdriBackground = document.getElementById('hdri-background');
    if (hdriBackground) {
        hdriBackground.addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            e.target.setAttribute('aria-pressed', newState);

            window.viewer.hdriBackgroundVisible = newState;

            if (newState && window.viewer.currentHDRI) {
                window.viewer.scene.background = window.viewer.currentHDRI;
            } else {
                window.viewer.updateBackground(); // Use Chatooly background system
            }
        });
    }
}

// ========== LIGHTING CONTROLS ==========
function setupLightingControls() {
    // Sun Light Enable
    const sunEnabled = document.getElementById('sun-enabled');
    if (sunEnabled) {
        sunEnabled.addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            e.target.setAttribute('aria-pressed', newState);

            window.viewer.sunEnabled = newState;
            window.viewer.sunLight.visible = newState;
        });
    }

    // Sun Intensity
    const sunIntensity = document.getElementById('sun-intensity');
    if (sunIntensity) {
        sunIntensity.addEventListener('input', (e) => {
            const intensity = parseFloat(e.target.value);
            window.viewer.sunIntensity = intensity;
            window.viewer.sunLight.intensity = intensity;
        });
    }

    // Sun Azimuth
    const sunAzimuth = document.getElementById('sun-azimuth');
    if (sunAzimuth) {
        sunAzimuth.addEventListener('input', (e) => {
            const azimuth = parseInt(e.target.value);
            window.viewer.sunAzimuth = azimuth;
            window.viewer.updateSunLightPosition();
        });
    }

    // Sun Elevation
    const sunElevation = document.getElementById('sun-elevation');
    if (sunElevation) {
        sunElevation.addEventListener('input', (e) => {
            const elevation = parseInt(e.target.value);
            window.viewer.sunElevation = elevation;
            window.viewer.updateSunLightPosition();
        });
    }

    // Sun Color
    const sunColor = document.getElementById('sun-color');
    if (sunColor) {
        sunColor.addEventListener('input', (e) => {
            const color = e.target.value;
            window.viewer.sunColor = color;
            window.viewer.sunLight.color.setHex(color.replace('#', '0x'));
        });
    }

    // Shadow Quality
    const shadowQuality = document.getElementById('shadow-quality');
    if (shadowQuality) {
        shadowQuality.addEventListener('change', (e) => {
            const quality = parseInt(e.target.value);
            window.viewer.shadowQuality = quality;

            // Update shadow map size
            window.viewer.sunLight.shadow.mapSize.width = quality;
            window.viewer.sunLight.shadow.mapSize.height = quality;

            // Force shadow map update
            window.viewer.sunLight.shadow.map = null;
            window.viewer.sunLight.shadow.needsUpdate = true;
        });
    }

    // Shadow Softness
    const shadowSoftness = document.getElementById('shadow-softness');
    if (shadowSoftness) {
        shadowSoftness.addEventListener('input', (e) => {
            const softness = parseInt(e.target.value);
            window.viewer.shadowSoftness = softness;
            window.viewer.sunLight.shadow.radius = softness;
        });
    }

    // Shadow Intensity
    const shadowIntensity = document.getElementById('shadow-intensity');
    if (shadowIntensity) {
        shadowIntensity.addEventListener('input', (e) => {
            const intensity = parseFloat(e.target.value);
            window.viewer.shadowIntensity = intensity;
            window.viewer.sunLight.shadow.bias = -0.0001 * intensity;
        });
    }
}

// ========== ANIMATION CONTROLS ==========
function setupAnimationControls() {
    // Master Animation Toggle
    const animationEnabled = document.getElementById('animation-enabled');
    if (animationEnabled) {
        animationEnabled.addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            e.target.setAttribute('aria-pressed', newState);

            if (newState) {
                window.viewer.startAnimation();
            } else {
                window.viewer.stopAnimation();
            }
        });
    }

    // Animation Mode
    const animationMode = document.getElementById('animation-mode');
    if (animationMode) {
        animationMode.addEventListener('change', (e) => {
            const mode = e.target.value;
            window.viewer.animationMode = mode;

            // Show/hide appropriate control groups
            showAnimationControls(mode);

            // Reset sine time when switching to sine mode
            if (mode === 'sine') {
                window.viewer.sineTime = 0;
                window.viewer.rotationBeforeAnimation.copy(window.viewer.modelContainer.rotation);
            }
        });
    }

    // Turntable Controls
    setupTurntableControls();
    setupSineControls();
    setupLightRotationControls();

    // Initialize with default mode
    showAnimationControls('turntable');
}

function showAnimationControls(mode) {
    // Hide all control groups first
    const turntableControls = document.getElementById('turntable-controls');
    const sineControls = document.getElementById('sine-controls');
    const lightRotationControls = document.getElementById('light-rotation-controls');

    if (turntableControls) turntableControls.style.display = 'none';
    if (sineControls) sineControls.style.display = 'none';
    if (lightRotationControls) lightRotationControls.style.display = 'none';

    // Show selected mode controls
    switch (mode) {
        case 'turntable':
            if (turntableControls) turntableControls.style.display = 'block';
            break;
        case 'sine':
            if (sineControls) sineControls.style.display = 'block';
            break;
        case 'light-rotation':
            if (lightRotationControls) lightRotationControls.style.display = 'block';
            break;
    }
}

function setupTurntableControls() {
    // Turntable Speed Controls
    const speedX = document.getElementById('turntable-speed-x');
    if (speedX) {
        speedX.addEventListener('input', (e) => {
            window.viewer.turntableSpeedX = parseFloat(e.target.value);
        });
    }

    const speedY = document.getElementById('turntable-speed-y');
    if (speedY) {
        speedY.addEventListener('input', (e) => {
            window.viewer.turntableSpeedY = parseFloat(e.target.value);
        });
    }

    const speedZ = document.getElementById('turntable-speed-z');
    if (speedZ) {
        speedZ.addEventListener('input', (e) => {
            window.viewer.turntableSpeedZ = parseFloat(e.target.value);
        });
    }
}

function setupSineControls() {
    // Sine Wave Amplitude Controls
    const amplitudeX = document.getElementById('sine-amplitude-x');
    if (amplitudeX) {
        amplitudeX.addEventListener('input', (e) => {
            window.viewer.sineAmplitudeX = parseInt(e.target.value);
        });
    }

    const amplitudeY = document.getElementById('sine-amplitude-y');
    if (amplitudeY) {
        amplitudeY.addEventListener('input', (e) => {
            window.viewer.sineAmplitudeY = parseInt(e.target.value);
        });
    }

    const amplitudeZ = document.getElementById('sine-amplitude-z');
    if (amplitudeZ) {
        amplitudeZ.addEventListener('input', (e) => {
            window.viewer.sineAmplitudeZ = parseInt(e.target.value);
        });
    }

    // Sine Wave Frequency Controls
    const frequencyX = document.getElementById('sine-frequency-x');
    if (frequencyX) {
        frequencyX.addEventListener('input', (e) => {
            window.viewer.sineFrequencyX = parseFloat(e.target.value);
        });
    }

    const frequencyY = document.getElementById('sine-frequency-y');
    if (frequencyY) {
        frequencyY.addEventListener('input', (e) => {
            window.viewer.sineFrequencyY = parseFloat(e.target.value);
        });
    }

    const frequencyZ = document.getElementById('sine-frequency-z');
    if (frequencyZ) {
        frequencyZ.addEventListener('input', (e) => {
            window.viewer.sineFrequencyZ = parseFloat(e.target.value);
        });
    }
}

function setupLightRotationControls() {
    const lightAnimationSpeed = document.getElementById('light-animation-speed');
    if (lightAnimationSpeed) {
        lightAnimationSpeed.addEventListener('input', (e) => {
            window.viewer.lightAnimationSpeed = parseFloat(e.target.value);
        });
    }
}

// ========== BACKGROUND SYSTEM INTEGRATION ==========
function setupBackgroundControls() {
    // CRITICAL: Connect all background controls to Chatooly.backgroundManager

    // Transparent Background
    const transparentBg = document.getElementById('transparent-bg');
    if (transparentBg) {
        transparentBg.addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            e.target.setAttribute('aria-pressed', newState);

            // Update Chatooly background manager
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setTransparent(newState);
            }

            // Hide color picker when transparent
            const bgColorGroup = document.getElementById('bg-color-group');
            if (bgColorGroup) {
                bgColorGroup.style.display = newState ? 'none' : 'block';
            }

            // Update Three.js background
            window.viewer.updateBackground();
        });
    }

    // Background Color
    const bgColor = document.getElementById('bg-color');
    if (bgColor) {
        bgColor.addEventListener('input', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setBackgroundColor(e.target.value);
            }
            window.viewer.updateBackground();
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
                    await window.Chatooly.backgroundManager.setBackgroundImage(file);
                }

                // Show controls
                const clearBtn = document.getElementById('clear-bg-image');
                const fitGroup = document.getElementById('bg-fit-group');
                if (clearBtn) clearBtn.style.display = 'block';
                if (fitGroup) fitGroup.style.display = 'block';

                window.viewer.updateBackground();
            } catch (error) {
                alert('Failed to load background image: ' + error.message);
            }
        });
    }

    // Clear Background Image
    const clearBgImage = document.getElementById('clear-bg-image');
    if (clearBgImage) {
        clearBgImage.addEventListener('click', () => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.clearBackgroundImage();
            }

            // Hide controls
            clearBgImage.style.display = 'none';
            const fitGroup = document.getElementById('bg-fit-group');
            if (fitGroup) fitGroup.style.display = 'none';

            const bgImageInput = document.getElementById('bg-image');
            if (bgImageInput) bgImageInput.value = '';

            window.viewer.updateBackground();
        });
    }

    // Background Image Fit
    const bgFit = document.getElementById('bg-fit');
    if (bgFit) {
        bgFit.addEventListener('change', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setFit(e.target.value);
            }
            window.viewer.updateBackground();
        });
    }
}

// ========== SLIDER VALUE UPDATES ==========
function setupSliderValueUpdates() {
    // Helper function to update slider value display
    const updateSliderValue = (sliderId, valueId, suffix = '') => {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);

        if (slider && valueDisplay) {
            slider.addEventListener('input', (e) => {
                valueDisplay.textContent = e.target.value + suffix;
            });
        }
    };

    // Model controls
    updateSliderValue('model-scale', 'model-scale-value');
    updateSliderValue('model-pos-x', 'model-pos-x-value');
    updateSliderValue('model-pos-y', 'model-pos-y-value');

    // Environment controls
    updateSliderValue('hdri-intensity', 'hdri-intensity-value');
    updateSliderValue('hdri-rotation', 'hdri-rotation-value', '°');

    // Lighting controls
    updateSliderValue('sun-intensity', 'sun-intensity-value');
    updateSliderValue('sun-azimuth', 'sun-azimuth-value', '°');
    updateSliderValue('sun-elevation', 'sun-elevation-value', '°');
    updateSliderValue('shadow-softness', 'shadow-softness-value');
    updateSliderValue('shadow-intensity', 'shadow-intensity-value');

    // Animation controls - Turntable
    updateSliderValue('turntable-speed-x', 'turntable-speed-x-value');
    updateSliderValue('turntable-speed-y', 'turntable-speed-y-value');
    updateSliderValue('turntable-speed-z', 'turntable-speed-z-value');

    // Animation controls - Sine Wave
    updateSliderValue('sine-amplitude-x', 'sine-amplitude-x-value', '°');
    updateSliderValue('sine-amplitude-y', 'sine-amplitude-y-value', '°');
    updateSliderValue('sine-amplitude-z', 'sine-amplitude-z-value', '°');

    // Frequency values with Hz suffix
    const updateFrequencyValue = (sliderId, valueId) => {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);

        if (slider && valueDisplay) {
            slider.addEventListener('input', (e) => {
                valueDisplay.textContent = e.target.value + ' Hz';
            });
        }
    };

    updateFrequencyValue('sine-frequency-x', 'sine-frequency-x-value');
    updateFrequencyValue('sine-frequency-y', 'sine-frequency-y-value');
    updateFrequencyValue('sine-frequency-z', 'sine-frequency-z-value');

    // Light rotation
    updateSliderValue('light-animation-speed', 'light-animation-speed-value');
}