/*
 * 3D Bar Chart Reimaginator - UI Controls
 * Author: Claude Code
 *
 * Handles all UI control interactions, collapsible sections,
 * and interface state management for the bar chart tool
 */

// ========== UI STATE ==========
let currentMaterial = 'standard';
let currentAnimationType = 'none';
let currentChartType = 'vertical';

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    setupToggleButtons();
    setupSliders();
    setupDropdowns();
    setupFileUpload();
    setupButtons();
});

// ========== TOGGLE BUTTONS ==========
function setupToggleButtons() {
    // Create generic toggle handler
    const toggleButtons = document.querySelectorAll('.chatooly-toggle');

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const isPressed = button.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            button.setAttribute('aria-pressed', newState);

            // Handle specific toggle logic
            handleToggleAction(button.id, newState);
        });
    });
}

function handleToggleAction(toggleId, isEnabled) {
    switch (toggleId) {
        case 'transparent-bg':
            const bgColorGroup = document.getElementById('bg-color-group');
            if (bgColorGroup) {
                bgColorGroup.style.display = isEnabled ? 'none' : 'block';
            }
            break;

        case 'view-mode-3d':
            if (window.toggleViewMode) {
                window.toggleViewMode(isEnabled);
            }
            // Show/hide 3D controls
            const threeDControls = document.getElementById('3d-controls');
            if (threeDControls) {
                threeDControls.style.opacity = isEnabled ? '1' : '0.5';
                threeDControls.style.pointerEvents = isEnabled ? 'auto' : 'none';
            }
            break;

        case 'point-light-enabled':
            if (window.updatePointLight) {
                window.updatePointLight(isEnabled);
            }
            break;

        case 'randomize-colors':
            if (window.randomizeBarColors) {
                window.randomizeBarColors(isEnabled);
            }
            break;

        case 'auto-rotate':
            // Auto-rotate is handled in main.js animation loop
            break;
    }
}

// ========== SLIDERS ==========
function setupSliders() {
    const sliders = document.querySelectorAll('.chatooly-slider');

    sliders.forEach(slider => {
        const valueDisplay = document.getElementById(slider.id + '-value');

        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);

            // Update display
            if (valueDisplay) {
                valueDisplay.textContent = value.toFixed(1);
            }

            // Handle slider action
            handleSliderAction(slider.id, value);
        });

        // Initialize display
        if (valueDisplay) {
            valueDisplay.textContent = parseFloat(slider.value).toFixed(1);
        }
    });
}

function handleSliderAction(sliderId, value) {
    switch (sliderId) {
        case 'bar-depth':
            if (window.updateBarDepth) {
                window.updateBarDepth(value);
            }
            break;

        case 'bar-spacing':
            if (window.updateBarSpacing) {
                window.updateBarSpacing(value);
            }
            break;

        case 'extrusion-mult':
            if (window.updateExtrusionMultiplier) {
                window.updateExtrusionMultiplier(value);
            }
            break;

        case 'camera-distance':
            if (window.updateCameraDistance) {
                window.updateCameraDistance(value);
            }
            break;

        case 'camera-angle-x':
            if (window.updateCameraAngle) {
                window.updateCameraAngle('x', value);
            }
            break;

        case 'camera-angle-y':
            if (window.updateCameraAngle) {
                window.updateCameraAngle('y', value);
            }
            break;

        case 'roughness':
            if (window.updateMaterialProperty) {
                window.updateMaterialProperty('roughness', value);
            }
            break;

        case 'metalness':
            if (window.updateMaterialProperty) {
                window.updateMaterialProperty('metalness', value);
            }
            break;

        case 'opacity':
            if (window.updateMaterialProperty) {
                window.updateMaterialProperty('opacity', value);
            }
            break;

        case 'emission-intensity':
            if (window.updateMaterialProperty) {
                window.updateMaterialProperty('emissionIntensity', value);
            }
            break;

        case 'ambient-intensity':
            if (window.updateLighting) {
                window.updateLighting('ambient', 'intensity', value);
            }
            break;

        case 'directional-intensity':
            if (window.updateLighting) {
                window.updateLighting('directional', 'intensity', value);
            }
            break;

        case 'point-intensity':
            if (window.updateLighting) {
                window.updateLighting('point', 'intensity', value);
            }
            break;

        case 'animation-speed':
            if (window.updateAnimationProperty) {
                window.updateAnimationProperty('speed', value);
            }
            break;

        case 'animation-intensity':
            if (window.updateAnimationProperty) {
                window.updateAnimationProperty('intensity', value);
            }
            break;
    }
}

// ========== DROPDOWNS ==========
function setupDropdowns() {
    // Chart Type
    const chartType = document.getElementById('chart-type');
    if (chartType) {
        chartType.addEventListener('change', (e) => {
            currentChartType = e.target.value;
            if (window.updateChartType) {
                window.updateChartType(currentChartType);
            }
        });
    }

    // Material Type
    const materialType = document.getElementById('material-type');
    if (materialType) {
        materialType.addEventListener('change', (e) => {
            currentMaterial = e.target.value;
            if (window.applyMaterialPreset) {
                window.applyMaterialPreset(currentMaterial);
            }
        });
    }

    // Animation Type
    const animationType = document.getElementById('animation-type');
    if (animationType) {
        animationType.addEventListener('change', (e) => {
            currentAnimationType = e.target.value;
            if (window.applyAnimationPreset) {
                window.applyAnimationPreset(currentAnimationType);
            }
        });
    }
}

// ========== COLOR PICKERS ==========
function setupColorPickers() {
    const colorPickers = document.querySelectorAll('.chatooly-color-input');

    colorPickers.forEach(picker => {
        picker.addEventListener('input', (e) => {
            const color = e.target.value;
            handleColorChange(picker.id, color);
        });
    });
}

function handleColorChange(pickerId, color) {
    switch (pickerId) {
        case 'ambient-color':
            if (window.updateLighting) {
                window.updateLighting('ambient', 'color', color);
            }
            break;

        case 'directional-color':
            if (window.updateLighting) {
                window.updateLighting('directional', 'color', color);
            }
            break;

        case 'point-color':
            if (window.updateLighting) {
                window.updateLighting('point', 'color', color);
            }
            break;
    }
}

// ========== FILE UPLOAD ==========
function setupFileUpload() {
    const chartUpload = document.getElementById('chart-upload');
    const parseButton = document.getElementById('parse-chart');

    if (chartUpload) {
        chartUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                // Enable parse button
                if (parseButton) {
                    parseButton.disabled = false;
                    parseButton.textContent = '🔍 Parse Chart';
                }

                // Preview the image (optional)
                previewChartImage(file);
            } else {
                if (parseButton) {
                    parseButton.disabled = true;
                    parseButton.textContent = '🔍 Parse Chart';
                }
            }
        });
    }

    if (parseButton) {
        parseButton.addEventListener('click', () => {
            console.log('Parse Chart button clicked!');
            const file = chartUpload?.files[0];
            console.log('Selected file:', file ? file.name : 'No file selected');

            if (file) {
                console.log('Starting chart parsing process...');
                parseButton.textContent = '⏳ Parsing...';
                parseButton.disabled = true;

                // Process immediately without delay for better UX
                try {
                    processChartImage(file);
                    setTimeout(() => {
                        parseButton.textContent = '✅ Parsed!';
                        setTimeout(() => {
                            parseButton.textContent = '🔍 Parse Chart';
                            parseButton.disabled = false;
                        }, 2000);
                    }, 500);
                } catch (error) {
                    console.error('Error processing chart:', error);
                    parseButton.textContent = '❌ Error';
                    setTimeout(() => {
                        parseButton.textContent = '🔍 Parse Chart';
                        parseButton.disabled = false;
                    }, 2000);
                }
            } else {
                console.log('No file selected for parsing');
            }
        });
    } else {
        console.error('Parse button not found!');
    }
}

function previewChartImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        // Could add a small preview image here if desired
        console.log('Chart image loaded for preview');
    };
    reader.readAsDataURL(file);
}

function processChartImage(file) {
    console.log('Processing chart image file:', file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            console.log('Image loaded, dimensions:', img.naturalWidth, 'x', img.naturalHeight);
            console.log('Checking for chart parsing functions...');
            console.log('window.parseChartImage:', typeof window.parseChartImage);
            console.log('window.create3DBars:', typeof window.create3DBars);

            if (window.parseChartImage && window.create3DBars) {
                console.log('Parsing chart image...');
                const parsedData = window.parseChartImage(img);
                console.log('Parsed data:', parsedData);

                // Update global chart data
                window.chartData = parsedData;

                // Create 3D bars from parsed data
                window.create3DBars(parsedData);

                console.log('Chart processing complete!');
            } else {
                console.error('Chart parsing functions not available!');
                console.error('parseChartImage available:', !!window.parseChartImage);
                console.error('create3DBars available:', !!window.create3DBars);
            }
        };
        img.onerror = () => {
            console.error('Failed to load image');
            alert('Failed to load image. Please try a different file.');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ========== BUTTONS ==========
function setupButtons() {
    // Reset Styling Button
    const resetStyling = document.getElementById('reset-styling');
    if (resetStyling) {
        resetStyling.addEventListener('click', () => {
            resetStylingToDefaults();
        });
    }

    // Reset All Button
    const resetAll = document.getElementById('reset-all');
    if (resetAll) {
        resetAll.addEventListener('click', () => {
            resetEverything();
        });
    }
}

function resetStylingToDefaults() {
    // Reset material controls
    document.getElementById('material-type').value = 'standard';
    document.getElementById('roughness').value = '0.5';
    document.getElementById('metalness').value = '0.0';
    document.getElementById('opacity').value = '1.0';
    document.getElementById('emission-intensity').value = '0.0';

    // Reset animation controls
    document.getElementById('animation-type').value = 'none';
    document.getElementById('animation-speed').value = '1.0';
    document.getElementById('animation-intensity').value = '0.5';
    document.getElementById('auto-rotate').setAttribute('aria-pressed', 'false');

    // Reset lighting
    document.getElementById('ambient-intensity').value = '0.4';
    document.getElementById('directional-intensity').value = '0.8';
    document.getElementById('point-intensity').value = '0.5';
    document.getElementById('point-light-enabled').setAttribute('aria-pressed', 'false');

    // Reset 3D controls
    document.getElementById('bar-depth').value = '1.0';
    document.getElementById('bar-spacing').value = '0.1';
    document.getElementById('extrusion-mult').value = '1.0';

    // Update all slider displays
    updateAllSliderDisplays();

    // Apply changes to the scene
    if (window.resetMaterials) {
        window.resetMaterials();
    }
    if (window.resetAnimations) {
        window.resetAnimations();
    }
    if (window.resetLighting) {
        window.resetLighting();
    }
}

function resetEverything() {
    // Reset styling first
    resetStylingToDefaults();

    // Reset chart upload
    const chartUpload = document.getElementById('chart-upload');
    const parseButton = document.getElementById('parse-chart');

    if (chartUpload) {
        chartUpload.value = '';
    }
    if (parseButton) {
        parseButton.disabled = true;
        parseButton.textContent = '🔍 Parse Chart';
    }

    // Reset to demo chart
    if (window.generateDemoChart && window.create3DBars) {
        const demoData = window.generateDemoChart();
        window.chartData = demoData;
        window.create3DBars(demoData);
    }

    // Reset camera position
    if (window.resetCamera) {
        window.resetCamera();
    }
}

function updateAllSliderDisplays() {
    const sliders = document.querySelectorAll('.chatooly-slider');
    sliders.forEach(slider => {
        const valueDisplay = document.getElementById(slider.id + '-value');
        if (valueDisplay) {
            valueDisplay.textContent = parseFloat(slider.value).toFixed(1);
        }
    });
}

// ========== INITIALIZATION ==========
// Set up color pickers after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    setupColorPickers();
});

// Export functions for use in main.js
window.UIControls = {
    resetStylingToDefaults,
    resetEverything,
    updateAllSliderDisplays
};