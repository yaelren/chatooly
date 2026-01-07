/*
 * 3D Trail Tool - UI Controls
 * Author: Claude Code
 *
 * Handles UI interactions for the 3D Trail tool.
 * Connects HTML controls to the settings object in main.js.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Wait for main.js to initialize
    setTimeout(() => {
        initUIControls();
    }, 100);
});

function initUIControls() {
    const settings = window.trailTool ? window.trailTool.settings : null;
    if (!settings) {
        console.warn('3D Trail: Settings not found, retrying...');
        setTimeout(initUIControls, 100);
        return;
    }

    // ========== MODEL UPLOAD ==========
    const modelUpload = document.getElementById('model-upload');
    const modelInfo = document.getElementById('model-info');
    const modelName = document.getElementById('model-name');
    const clearModel = document.getElementById('clear-model');

    if (modelUpload) {
        modelUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                modelName.textContent = 'Loading...';
                modelInfo.style.display = 'block';

                await window.trailTool.loadGLBModel(file);

                modelName.textContent = file.name;
            } catch (error) {
                alert('Failed to load GLB: ' + error.message);
                modelInfo.style.display = 'none';
                modelUpload.value = '';
            }
        });
    }

    if (clearModel) {
        clearModel.addEventListener('click', () => {
            window.trailTool.clearModel();
            modelInfo.style.display = 'none';
            modelUpload.value = '';
        });
    }

    // ========== PARTICLE APPEARANCE ==========
    setupSlider('density', 'density', settings);
    setupSlider('size', 'size', settings);
    setupSlider('size-min', 'sizeMin', settings);
    setupSlider('size-max', 'sizeMax', settings);
    setupSlider('lifespan', 'lifespan', settings);
    setupSlider('exit-duration', 'exitDuration', settings);

    // Size control visibility logic
    function updateSizeControlsVisibility() {
        const singleGroup = document.getElementById('size-single-group');
        const rangeGroup = document.getElementById('size-range-group');
        const showRange = settings.randomSize || settings.sizeBySpeed;

        if (singleGroup) singleGroup.style.display = showRange ? 'none' : 'block';
        if (rangeGroup) rangeGroup.style.display = showRange ? 'block' : 'none';
    }

    // Random Size toggle
    const randomSizeToggle = document.getElementById('random-size');
    if (randomSizeToggle) {
        randomSizeToggle.addEventListener('click', () => {
            const isPressed = randomSizeToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            randomSizeToggle.setAttribute('aria-pressed', newState);
            settings.randomSize = newState;
            updateSizeControlsVisibility();
        });
    }

    // Size by Speed toggle
    const sizeBySpeedToggle = document.getElementById('size-by-speed');
    if (sizeBySpeedToggle) {
        sizeBySpeedToggle.addEventListener('click', () => {
            const isPressed = sizeBySpeedToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            sizeBySpeedToggle.setAttribute('aria-pressed', newState);
            settings.sizeBySpeed = newState;
            updateSizeControlsVisibility();
        });
    }

    // Initialize size controls visibility
    updateSizeControlsVisibility();

    // Disappear mode dropdown
    const disappearMode = document.getElementById('disappear-mode');
    if (disappearMode) {
        disappearMode.addEventListener('change', (e) => {
            settings.disappearMode = e.target.value;
        });
    }

    // ========== MOVEMENT ==========
    setupToggle('float-enabled', 'floatEnabled', settings, 'float-controls-group');
    setupSlider('float-amplitude', 'floatAmplitude', settings);

    // Float style dropdown
    const floatStyle = document.getElementById('float-style');
    if (floatStyle) {
        floatStyle.addEventListener('change', (e) => {
            settings.floatStyle = e.target.value;
        });
    }

    setupToggle('follow-enabled', 'followEnabled', settings, 'follow-strength-group');
    setupSlider('follow-strength', 'followStrength', settings);

    // ========== OBJECT FACING ==========
    const facingMode = document.getElementById('facing-mode');
    const fixedAngleControls = document.getElementById('fixed-angle-controls');

    if (facingMode) {
        facingMode.addEventListener('change', (e) => {
            settings.facingMode = e.target.value;
            if (fixedAngleControls) {
                fixedAngleControls.style.display = e.target.value === 'fixed' ? 'block' : 'none';
            }
        });
    }

    setupSlider('angle-x', 'fixedAngleX', settings);
    setupSlider('angle-y', 'fixedAngleY', settings);
    setupSlider('angle-z', 'fixedAngleZ', settings);

    // ========== PHYSICS ==========
    setupToggle('gravity-enabled', 'gravityEnabled', settings, 'gravity-controls-group');
    setupSlider('gravity-strength', 'gravityStrength', settings);
    setupSlider('bounce-amount', 'bounceAmount', settings);
    setupToggle('spin-enabled', 'spinEnabled', settings, 'spin-speed-group');
    setupSlider('spin-speed', 'spinSpeed', settings);
    setupToggle('tumble-enabled', 'tumbleEnabled', settings, 'tumble-speed-group');
    setupSlider('tumble-speed', 'tumbleSpeed', settings);

    // ========== CAMERA CONTROLS ==========
    // Camera position sliders
    setupSlider('camera-x', 'cameraX', settings, (value) => {
        if (window.trailTool?.setCameraPosition) {
            window.trailTool.setCameraPosition(value, undefined, undefined);
        }
    });
    setupSlider('camera-y', 'cameraY', settings, (value) => {
        if (window.trailTool?.setCameraPosition) {
            window.trailTool.setCameraPosition(undefined, value, undefined);
        }
    });
    setupSlider('camera-z', 'cameraZ', settings, (value) => {
        if (window.trailTool?.setCameraPosition) {
            window.trailTool.setCameraPosition(undefined, undefined, value);
        }
    });
    setupSlider('camera-fov', 'cameraFOV', settings, (value) => {
        if (window.trailTool?.setCameraFOV) {
            window.trailTool.setCameraFOV(value);
        }
    });

    // Camera preset buttons
    document.querySelectorAll('.camera-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            if (window.trailTool?.setCameraPreset) {
                window.trailTool.setCameraPreset(view);
                // Update sliders to reflect new position
                const newSettings = window.trailTool.settings;
                updateSliderUI('camera-x', newSettings.cameraX);
                updateSliderUI('camera-y', newSettings.cameraY);
                updateSliderUI('camera-z', newSettings.cameraZ);
            }
        });
    });

    // Helper to update slider UI after preset
    function updateSliderUI(sliderId, value) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(sliderId + '-value');
        if (slider) slider.value = value;
        if (valueDisplay) valueDisplay.textContent = value;
    }

    // ========== BACKGROUND (handled in main.js but UI toggle here) ==========
    const transparentToggle = document.getElementById('transparent-bg');
    if (transparentToggle) {
        transparentToggle.addEventListener('click', () => {
            const isPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            transparentToggle.setAttribute('aria-pressed', newState);

            const bgColorGroup = document.getElementById('bg-color-group');
            if (bgColorGroup) {
                bgColorGroup.style.display = newState ? 'none' : 'block';
            }
        });
    }

    // ========== MATERIAL (MATCAP) CONTROLS ==========
    const materialToggle = document.getElementById('material-enabled');
    if (materialToggle) {
        materialToggle.addEventListener('click', () => {
            const isPressed = materialToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            materialToggle.setAttribute('aria-pressed', newState);

            const controlsGroup = document.getElementById('material-controls-group');
            if (controlsGroup) controlsGroup.style.display = newState ? 'block' : 'none';

            if (window.trailTool?.toggleMaterialMode) {
                window.trailTool.toggleMaterialMode(newState);
            }

            // Update preview when enabling
            if (newState) {
                setTimeout(updateMaterialPreview, 100);
            }
        });
    }

    // Track which gradient is currently expanded in UI
    let expandedGradientIndex = 0;

    // Update material preview for a specific gradient
    function updateMaterialPreview(gradientIndex = null) {
        if (!settings.materialEnabled) return;

        // Update the specific gradient's preview canvas
        const idx = gradientIndex !== null ? gradientIndex : settings.activeGradientIndex;
        const gradient = settings.gradientSets[idx];
        if (!gradient) return;

        const previewCanvas = document.querySelector(`#gradient-item-${idx} .gradient-preview-canvas`);
        if (previewCanvas && window.trailTool?.generateMatcapPreview) {
            const previewTexture = window.trailTool.generateMatcapPreview(gradient.stops, gradient.type);
            if (previewTexture) {
                const ctx = previewCanvas.getContext('2d');
                ctx.clearRect(0, 0, 80, 80);
                ctx.drawImage(previewTexture, 0, 0, 80, 80);
            }
        }

        // Also update header strip preview
        updateGradientStripPreview(idx);

        // Update the actual material if this is the active gradient
        if (idx === settings.activeGradientIndex && window.trailTool?.updateMaterial) {
            window.trailTool.updateMaterial();
        }
    }

    // Update the gradient strip preview in the header
    function updateGradientStripPreview(index) {
        const gradient = settings.gradientSets[index];
        if (!gradient) return;

        const strip = document.querySelector(`#gradient-item-${index} .gradient-strip-preview`);
        if (strip) {
            const colors = gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ');
            strip.style.background = `linear-gradient(to right, ${colors})`;
        }
    }

    // Build the gradients list UI
    function rebuildGradientsListUI() {
        const container = document.getElementById('gradients-list-container');
        if (!container) return;

        container.innerHTML = '';

        settings.gradientSets.forEach((gradient, index) => {
            const item = createGradientListItem(gradient, index);
            container.appendChild(item);
        });

        // Show/hide multi-gradient section based on gradient count
        const multiSection = document.getElementById('multi-gradient-section');
        if (multiSection) {
            multiSection.style.display = settings.gradientSets.length >= 2 ? 'block' : 'none';
        }

        // Update previews after DOM is ready
        setTimeout(() => {
            settings.gradientSets.forEach((_, idx) => updateMaterialPreview(idx));
        }, 50);
    }

    // Create a single gradient list item with collapsible body
    function createGradientListItem(gradient, index) {
        const isExpanded = index === expandedGradientIndex;
        const colors = gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ');

        const item = document.createElement('div');
        item.className = 'gradient-list-item';
        item.id = `gradient-item-${index}`;
        item.style.cssText = 'border: 1px solid var(--chatooly-color-border, #444); border-radius: 6px; margin-bottom: 8px; overflow: hidden;';

        item.innerHTML = `
            <!-- Gradient Header (always visible) -->
            <div class="gradient-header" style="display: flex; align-items: center; gap: 8px; padding: 8px; cursor: pointer; background: var(--chatooly-color-surface, #2a2a2a);">
                <span class="gradient-expand-arrow" style="font-size: 10px; transition: transform 0.2s; color: var(--chatooly-color-text, #fff);">${isExpanded ? '▼' : '▶'}</span>
                <div class="gradient-strip-preview" style="flex: 1; height: 20px; border-radius: 4px; background: linear-gradient(to right, ${colors});"></div>
                <span style="font-size: 11px; min-width: 70px; color: var(--chatooly-color-text, #fff);">${gradient.name}</span>
                ${index > 0 ? `<button class="gradient-delete-btn chatooly-btn" style="padding: 2px 6px; min-width: auto; font-size: 12px;">×</button>` : ''}
            </div>
            <!-- Gradient Body (collapsible) -->
            <div class="gradient-body" style="display: ${isExpanded ? 'block' : 'none'}; padding: 12px; background: var(--chatooly-color-surface, #2a2a2a);">
                <!-- Gradient Type -->
                <div class="chatooly-input-group" style="margin-bottom: 12px;">
                    <label class="chatooly-input-label" style="color: var(--chatooly-color-text, #fff);">Gradient Type</label>
                    <select class="chatooly-select gradient-type-select">
                        <option value="radial" ${gradient.type === 'radial' ? 'selected' : ''}>Radial</option>
                        <option value="linear" ${gradient.type === 'linear' ? 'selected' : ''}>Linear</option>
                    </select>
                </div>
                <!-- Color Stops -->
                <div class="gradient-stops-container">
                    <label class="chatooly-input-label" style="color: var(--chatooly-color-text, #fff);">Color Stops</label>
                    ${gradient.stops.map((stop, stopIdx) => `
                        <div class="gradient-stop" data-stop-index="${stopIdx}" style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
                            <input type="color" class="gradient-color" value="${stop.color}" style="width: 40px; height: 30px;">
                            <input type="range" class="chatooly-slider gradient-position" min="0" max="100" value="${stop.position}" style="flex: 1;">
                            <span class="gradient-position-value" style="min-width: 35px; color: var(--chatooly-color-text, #fff);">${stop.position}%</span>
                        </div>
                    `).join('')}
                </div>
                <!-- Add/Remove Stop Buttons -->
                <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                    <button class="chatooly-btn add-stop-btn" style="flex: 1;">+ Add</button>
                    <button class="chatooly-btn remove-stop-btn" style="flex: 1;">- Remove</button>
                </div>
                <!-- MatCap Preview -->
                <div style="text-align: center;">
                    <canvas class="gradient-preview-canvas" width="80" height="80" style="border-radius: 50%; border: 1px solid var(--chatooly-color-border);"></canvas>
                </div>
            </div>
        `;

        // Setup event handlers
        setupGradientItemEvents(item, index);

        return item;
    }

    // Setup events for a gradient list item
    function setupGradientItemEvents(item, index) {
        // Header click - toggle expand/collapse (accordion style with toggle)
        const header = item.querySelector('.gradient-header');
        header.addEventListener('click', (e) => {
            // Don't toggle if clicking delete button
            if (e.target.classList.contains('gradient-delete-btn')) return;

            const body = item.querySelector('.gradient-body');
            const arrow = item.querySelector('.gradient-expand-arrow');
            const isCurrentlyExpanded = body.style.display !== 'none';

            if (isCurrentlyExpanded) {
                // Collapse this one (toggle off)
                body.style.display = 'none';
                arrow.textContent = '▶';
                expandedGradientIndex = -1; // No gradient expanded
            } else {
                // Collapse previously expanded (if any)
                if (expandedGradientIndex >= 0 && expandedGradientIndex !== index) {
                    const prevItem = document.getElementById(`gradient-item-${expandedGradientIndex}`);
                    if (prevItem) {
                        prevItem.querySelector('.gradient-body').style.display = 'none';
                        prevItem.querySelector('.gradient-expand-arrow').textContent = '▶';
                    }
                }
                // Expand this one
                expandedGradientIndex = index;
                body.style.display = 'block';
                arrow.textContent = '▼';

                // Update active gradient for rendering
                settings.activeGradientIndex = index;
                if (window.trailTool?.updateMaterial) {
                    window.trailTool.updateMaterial();
                }

                // Update preview after expanding
                setTimeout(() => updateMaterialPreview(index), 50);
            }
        });

        // Delete button
        const deleteBtn = item.querySelector('.gradient-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (settings.gradientSets.length <= 1) return; // Keep at least 1
                settings.gradientSets.splice(index, 1);

                // Adjust expanded/active index if needed
                if (expandedGradientIndex >= settings.gradientSets.length) {
                    expandedGradientIndex = settings.gradientSets.length - 1;
                }
                if (settings.activeGradientIndex >= settings.gradientSets.length) {
                    settings.activeGradientIndex = settings.gradientSets.length - 1;
                }

                rebuildGradientsListUI();

                // Reinitialize pools when gradients are removed
                if (settings.materialEnabled && window.trailTool?.toggleMaterialMode) {
                    window.trailTool.toggleMaterialMode(false);
                    window.trailTool.toggleMaterialMode(true);
                }
            });
        }

        // Gradient type select
        const typeSelect = item.querySelector('.gradient-type-select');
        typeSelect.addEventListener('change', (e) => {
            settings.gradientSets[index].type = e.target.value;
            updateMaterialPreview(index);
        });

        // Color stops
        item.querySelectorAll('.gradient-stop').forEach((stopEl) => {
            const stopIdx = parseInt(stopEl.dataset.stopIndex);
            const colorInput = stopEl.querySelector('.gradient-color');
            const posInput = stopEl.querySelector('.gradient-position');
            const posValue = stopEl.querySelector('.gradient-position-value');

            colorInput.addEventListener('input', (e) => {
                settings.gradientSets[index].stops[stopIdx].color = e.target.value;
                updateMaterialPreview(index);
            });

            posInput.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                settings.gradientSets[index].stops[stopIdx].position = val;
                posValue.textContent = val + '%';
                updateMaterialPreview(index);
            });
        });

        // Add stop button
        const addStopBtn = item.querySelector('.add-stop-btn');
        addStopBtn.addEventListener('click', () => {
            if (settings.gradientSets[index].stops.length >= 6) return; // Max 6 stops
            settings.gradientSets[index].stops.push({ color: '#888888', position: 50 });
            rebuildGradientsListUI();
        });

        // Remove stop button
        const removeStopBtn = item.querySelector('.remove-stop-btn');
        removeStopBtn.addEventListener('click', () => {
            if (settings.gradientSets[index].stops.length <= 2) return; // Min 2 stops
            settings.gradientSets[index].stops.pop();
            rebuildGradientsListUI();
        });
    }

    // Add gradient button
    const addGradientBtn = document.getElementById('add-gradient-btn');
    if (addGradientBtn) {
        addGradientBtn.addEventListener('click', () => {
            if (settings.gradientSets.length >= 5) return; // Max 5 gradients
            const newIndex = settings.gradientSets.length + 1;
            settings.gradientSets.push({
                name: 'Gradient ' + newIndex,
                stops: [
                    { color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'), position: 0 },
                    { color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'), position: 50 },
                    { color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'), position: 100 }
                ],
                type: 'radial'
            });
            // Expand the new gradient
            expandedGradientIndex = settings.gradientSets.length - 1;
            settings.activeGradientIndex = expandedGradientIndex;
            rebuildGradientsListUI();

            // Reinitialize pools when gradients are added (for random mode)
            if (settings.materialEnabled && settings.multiGradientMode === 'random' && window.trailTool?.toggleMaterialMode) {
                window.trailTool.toggleMaterialMode(false);
                window.trailTool.toggleMaterialMode(true);
            }
        });
    }

    // Initialize the gradients list on page load
    rebuildGradientsListUI();

    // Light color picker
    const lightColor = document.getElementById('light-color');
    if (lightColor) {
        lightColor.addEventListener('input', (e) => {
            settings.lightColor = e.target.value;
            updateMaterialPreview();
        });
    }

    // Light position slider
    setupSlider('light-position', 'lightPosition', settings);
    const lightPosSlider = document.getElementById('light-position');
    if (lightPosSlider) {
        lightPosSlider.addEventListener('input', updateMaterialPreview);
    }

    // Light intensity slider
    setupSlider('light-intensity', 'lightIntensity', settings);
    const lightIntSlider = document.getElementById('light-intensity');
    if (lightIntSlider) {
        lightIntSlider.addEventListener('input', updateMaterialPreview);
    }

    // Rim light toggle
    setupToggle('rim-enabled', 'rimEnabled', settings, 'rim-controls');
    const rimToggle = document.getElementById('rim-enabled');
    if (rimToggle) {
        rimToggle.addEventListener('click', () => {
            setTimeout(updateMaterialPreview, 0);
        });
    }

    // Rim intensity slider
    setupSlider('rim-intensity', 'rimIntensity', settings);
    const rimIntSlider = document.getElementById('rim-intensity');
    if (rimIntSlider) {
        rimIntSlider.addEventListener('input', updateMaterialPreview);
    }

    // Rim color picker
    const rimColor = document.getElementById('rim-color');
    if (rimColor) {
        rimColor.addEventListener('input', (e) => {
            settings.rimColor = e.target.value;
            updateMaterialPreview();
        });
    }

    // Shader mode dropdown
    const shaderMode = document.getElementById('shader-mode');
    if (shaderMode) {
        shaderMode.addEventListener('change', (e) => {
            settings.shaderMode = e.target.value;
            // Need to recreate material for flatShading change
            if (settings.materialEnabled && window.trailTool?.toggleMaterialMode) {
                window.trailTool.toggleMaterialMode(false);
                window.trailTool.toggleMaterialMode(true);
            }
        });
    }

    // ========== MULTI-GRADIENT MODE CONTROLS ==========
    // Multi-gradient mode dropdown (only visible when 2+ gradients)
    const multiGradientMode = document.getElementById('multi-gradient-mode');
    if (multiGradientMode) {
        multiGradientMode.addEventListener('change', (e) => {
            settings.multiGradientMode = e.target.value;
            const cycleSpeedGroup = document.getElementById('cycle-speed-group');
            if (cycleSpeedGroup) {
                cycleSpeedGroup.style.display = e.target.value === 'time' ? 'block' : 'none';
            }

            // Reinitialize multi-gradient pools when mode changes
            if (settings.materialEnabled && window.trailTool?.toggleMaterialMode) {
                window.trailTool.toggleMaterialMode(false);
                window.trailTool.toggleMaterialMode(true);
            }
        });
    }

    // Gradient cycle speed slider
    setupSlider('gradient-cycle-speed', 'gradientCycleSpeed', settings);
}

// ========== HELPER FUNCTIONS ==========

function setupSlider(elementId, settingsKey, settings, callback = null) {
    const slider = document.getElementById(elementId);
    const valueDisplay = document.getElementById(`${elementId}-value`);

    if (!slider) return;

    slider.addEventListener('input', () => {
        const value = parseFloat(slider.value);
        settings[settingsKey] = value;
        if (valueDisplay) {
            valueDisplay.textContent = value;
        }
        if (callback) {
            callback(value);
        }
    });
}

function setupToggle(elementId, settingsKey, settings, showHideId = null) {
    const toggle = document.getElementById(elementId);
    if (!toggle) return;

    toggle.addEventListener('click', () => {
        const isPressed = toggle.getAttribute('aria-pressed') === 'true';
        const newState = !isPressed;

        toggle.setAttribute('aria-pressed', newState);
        settings[settingsKey] = newState;

        if (showHideId) {
            const element = document.getElementById(showHideId);
            if (element) {
                element.style.display = newState ? 'block' : 'none';
            }
        }
    });
}
