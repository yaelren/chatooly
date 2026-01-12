/*
 * 3D DVD Screensaver Tool - UI Controls
 * Author: Claude Code
 *
 * Handles all UI control event bindings and interactions.
 */

(function() {
    'use strict';

    // Wait for main.js to initialize
    function waitForTool() {
        if (typeof window.dvdScreensaver === 'undefined') {
            setTimeout(waitForTool, 100);
            return;
        }
        initUI();
    }

    function initUI() {
        const { settings } = window.dvdScreensaver;

        console.log('3D DVD Screensaver UI: Initializing controls...');

        // ========== HELPER FUNCTIONS ==========
        function setupSlider(id, settingKey, callback = null, decimals = 1) {
            const element = document.getElementById(id);
            const valueDisplay = document.getElementById(id + '-value');

            if (!element) return;

            element.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                settings[settingKey] = value;
                if (valueDisplay) valueDisplay.textContent = value.toFixed(decimals);
                if (callback) callback(value);
            });
        }

        function setupToggle(id, settingKey, callback = null) {
            const button = document.getElementById(id);
            if (!button) return;

            button.addEventListener('click', () => {
                settings[settingKey] = !settings[settingKey];
                button.setAttribute('aria-pressed', settings[settingKey]);
                if (callback) callback(settings[settingKey]);
            });
        }

        function setupSelect(id, settingKey, callback = null) {
            const element = document.getElementById(id);
            if (!element) return;

            element.addEventListener('change', (e) => {
                settings[settingKey] = e.target.value;
                if (callback) callback(e.target.value);
            });
        }

        function setupColorPicker(id, settingKey, callback = null) {
            const input = document.getElementById(id);
            if (!input) return;

            input.addEventListener('input', (e) => {
                settings[settingKey] = e.target.value;
                if (callback) callback(e.target.value);
            });
        }

        function showElement(id, show = true) {
            const el = document.getElementById(id);
            if (el) el.style.display = show ? 'block' : 'none';
        }

        // ========== SECTION 1: OBJECT SOURCE ==========

        // Primitive Type
        setupSelect('primitive-type', 'primitiveType', (value) => {
            window.dvdScreensaver.changePrimitive(value);
        });

        // GLB Upload
        const modelUpload = document.getElementById('model-upload');
        const modelInfo = document.getElementById('model-info');
        const modelName = document.getElementById('model-name');
        const clearModel = document.getElementById('clear-model');

        if (modelUpload) {
            modelUpload.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        await window.dvdScreensaver.loadGLBModel(file);
                        if (modelInfo) modelInfo.style.display = 'block';
                        if (modelName) modelName.textContent = file.name;
                    } catch (err) {
                        console.error('Failed to load GLB:', err);
                        alert('Failed to load model: ' + err.message);
                    }
                }
            });
        }

        if (clearModel) {
            clearModel.addEventListener('click', () => {
                settings.objectSource = 'primitive';
                window.dvdScreensaver.changePrimitive(settings.primitiveType);
                if (modelInfo) modelInfo.style.display = 'none';
                if (modelUpload) modelUpload.value = '';
            });
        }

        // Object Size
        setupSlider('object-size', 'objectSize', (value) => {
            window.dvdScreensaver.updateObjectSize(value);
        });

        // ========== SECTION 2: MOVEMENT ==========

        setupSelect('start-position', 'startPosition');
        setupSlider('initial-speed', 'initialSpeed', (value) => {
            window.dvdScreensaver.updateAllObjectSpeeds(value);
        });

        // Add Object Button
        const addObjectBtn = document.getElementById('add-object');
        if (addObjectBtn) {
            addObjectBtn.addEventListener('click', () => {
                window.dvdScreensaver.spawnDVDObject();
            });
        }

        // Reset Button
        const resetBtn = document.getElementById('reset-objects');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                window.dvdScreensaver.resetToDefaults();
            });
        }

        // Debug Bounds Toggle
        const debugBoundsToggle = document.getElementById('debug-bounds-enabled');
        if (debugBoundsToggle) {
            debugBoundsToggle.addEventListener('click', () => {
                const isPressed = debugBoundsToggle.getAttribute('aria-pressed') === 'true';
                debugBoundsToggle.setAttribute('aria-pressed', !isPressed);
                window.dvdScreensaver.toggleDebugBounds(!isPressed);
            });
        }

        // ========== SECTION 3: BOUNCE EFFECTS ==========

        // Speed Increase
        setupToggle('speed-increase-enabled', 'speedIncreaseEnabled', (enabled) => {
            showElement('speed-increase-settings', enabled);
        });
        setupSlider('speed-increase-amount', 'speedIncreaseAmount', null, 2);
        setupSlider('speed-max-cap', 'speedMaxCap', null, 0);

        // Split
        setupToggle('split-enabled', 'splitEnabled', (enabled) => {
            showElement('split-settings', enabled);
        });
        setupSlider('split-max-objects', 'splitMaxObjects', null, 0);

        // Rotation on Hit
        setupToggle('rotation-on-hit-enabled', 'rotationOnHitEnabled', (enabled) => {
            showElement('rotation-on-hit-settings', enabled);
        });
        setupSelect('rotation-on-hit-mode', 'rotationOnHitMode', (value) => {
            showElement('rotation-lerp-speed-group', value === 'lerp');
        });
        setupSlider('rotation-lerp-speed', 'rotationLerpSpeed');

        // ========== SECTION 4: TRAIL ==========

        setupToggle('trail-enabled', 'trailEnabled', (enabled) => {
            showElement('trail-settings', enabled);
            window.dvdScreensaver.toggleTrail(enabled);
        });

        // Trail Style selector
        setupSelect('trail-style', 'trailStyle', (value) => {
            showElement('ghost-settings', value === 'ghost');
            showElement('solid-settings', value === 'solid');
            // Motion blur only available for ghost trail
            showElement('postprocess-group', value === 'ghost');
            if (value === 'solid') {
                showElement('postprocess-settings', false);
            }
            window.dvdScreensaver.setTrailStyle(value);
        });

        // Ghost trail sliders
        setupSlider('ghost-length', 'ghostTrailLength', null, 0);
        setupSlider('ghost-opacity', 'ghostOpacityFade', null, 2);
        setupSlider('ghost-scale', 'ghostScaleFade', null, 2);

        // Solid trail sliders
        setupSlider('solid-spacing', 'solidTrailSpacing', null, 2);
        setupSlider('solid-max', 'solidTrailMaxCopies', null, 0);
        setupSlider('solid-lifespan', 'solidTrailLifespan', null, 1);

        // Post-process toggle and settings
        setupToggle('trail-postprocess', 'trailPostProcess', (enabled) => {
            showElement('postprocess-settings', enabled);
        });
        setupSlider('postprocess-damp', 'postProcessDamp', null, 2);

        // ========== SECTION 5: OBJECT BEHAVIOR ==========

        setupSelect('facing-mode', 'facingMode', (value) => {
            showElement('facing-lerp-group', value === 'movement');
            showElement('fixed-angle-group', value === 'fixed');
        });

        setupToggle('facing-lerp-enabled', 'facingLerpEnabled', (enabled) => {
            showElement('facing-lerp-speed-group', enabled);
        });
        setupSlider('facing-lerp-speed', 'facingLerpSpeed');

        setupSlider('fixed-angle-x', 'fixedAngleX', null, 0);
        setupSlider('fixed-angle-y', 'fixedAngleY', null, 0);
        setupSlider('fixed-angle-z', 'fixedAngleZ', null, 0);

        setupToggle('spin-enabled', 'spinEnabled', (enabled) => {
            showElement('spin-settings', enabled);
        });
        setupSlider('spin-speed', 'spinSpeed');

        setupToggle('tumble-enabled', 'tumbleEnabled', (enabled) => {
            showElement('tumble-settings', enabled);
        });
        setupSlider('tumble-speed', 'tumbleSpeed');

        // ========== SECTION 6: MATERIAL ==========

        setupSelect('material-type', 'materialType', (value) => {
            showElement('solid-color-group', value === 'solid');
            showElement('gradient-group', value === 'gradient');
            showElement('matcap-upload-group', value === 'matcapUpload');
            // Only show shader for gradient and matcap modes
            showElement('shader-group', value !== 'solid');
            if (value === 'gradient') {
                rebuildGradientsListUI();
            }
            window.dvdScreensaver.applyCurrentMaterial();
        });

        // Custom Matcap Upload
        const matcapUploadBtn = document.getElementById('upload-matcap-btn');
        const matcapUploadInput = document.getElementById('matcap-upload');
        const matcapPreview = document.getElementById('matcap-preview');
        const matcapFilename = document.getElementById('matcap-filename');

        if (matcapUploadBtn && matcapUploadInput) {
            matcapUploadBtn.addEventListener('click', () => {
                matcapUploadInput.click();
            });

            matcapUploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            // Create texture from image
                            const texture = new THREE.Texture(img);
                            texture.needsUpdate = true;

                            // Store texture globally for createMaterial to use
                            window.uploadedMatcapTexture = texture;

                            // Show preview
                            if (matcapPreview) {
                                matcapPreview.src = event.target.result;
                                matcapPreview.style.display = 'block';
                            }
                            if (matcapFilename) {
                                matcapFilename.textContent = file.name;
                            }

                            // Apply the new material
                            window.dvdScreensaver.applyCurrentMaterial();
                        };
                        img.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        setupColorPicker('solid-color', 'solidColor', () => {
            window.dvdScreensaver.applyCurrentMaterial();
        });

        // ========== DYNAMIC GRADIENT UI ==========
        let expandedGradientIndex = 0;

        function rebuildGradientsListUI() {
            const container = document.getElementById('gradients-list-container');
            if (!container) return;

            container.innerHTML = '';

            settings.gradientSets.forEach((gradient, index) => {
                const item = createGradientListItem(gradient, index);
                container.appendChild(item);
            });

            // Update previews after DOM is ready
            setTimeout(() => {
                settings.gradientSets.forEach((_, idx) => updateMaterialPreview(idx));
            }, 50);
        }

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

            setupGradientItemEvents(item, index);
            return item;
        }

        function setupGradientItemEvents(item, index) {
            // Header click - toggle expand/collapse
            const header = item.querySelector('.gradient-header');
            header.addEventListener('click', (e) => {
                if (e.target.classList.contains('gradient-delete-btn')) return;

                const body = item.querySelector('.gradient-body');
                const arrow = item.querySelector('.gradient-expand-arrow');
                const isCurrentlyExpanded = body.style.display !== 'none';

                if (isCurrentlyExpanded) {
                    body.style.display = 'none';
                    arrow.textContent = '▶';
                    expandedGradientIndex = -1;
                } else {
                    // Collapse previously expanded
                    if (expandedGradientIndex >= 0 && expandedGradientIndex !== index) {
                        const prevItem = document.getElementById(`gradient-item-${expandedGradientIndex}`);
                        if (prevItem) {
                            prevItem.querySelector('.gradient-body').style.display = 'none';
                            prevItem.querySelector('.gradient-expand-arrow').textContent = '▶';
                        }
                    }
                    expandedGradientIndex = index;
                    body.style.display = 'block';
                    arrow.textContent = '▼';

                    settings.activeGradientIndex = index;
                    window.dvdScreensaver.applyCurrentMaterial();

                    setTimeout(() => updateMaterialPreview(index), 50);
                }
            });

            // Delete button
            const deleteBtn = item.querySelector('.gradient-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (settings.gradientSets.length <= 1) return;
                    settings.gradientSets.splice(index, 1);

                    if (expandedGradientIndex >= settings.gradientSets.length) {
                        expandedGradientIndex = settings.gradientSets.length - 1;
                    }
                    if (settings.activeGradientIndex >= settings.gradientSets.length) {
                        settings.activeGradientIndex = settings.gradientSets.length - 1;
                    }

                    rebuildGradientsListUI();
                    window.dvdScreensaver.applyCurrentMaterial();
                });
            }

            // Gradient type select
            const typeSelect = item.querySelector('.gradient-type-select');
            typeSelect.addEventListener('change', (e) => {
                settings.gradientSets[index].type = e.target.value;
                updateMaterialPreview(index);
                if (index === settings.activeGradientIndex) {
                    window.dvdScreensaver.applyCurrentMaterial();
                }
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
                    if (index === settings.activeGradientIndex) {
                        window.dvdScreensaver.applyCurrentMaterial();
                    }
                });

                posInput.addEventListener('input', (e) => {
                    const val = parseInt(e.target.value);
                    settings.gradientSets[index].stops[stopIdx].position = val;
                    posValue.textContent = val + '%';
                    updateMaterialPreview(index);
                    if (index === settings.activeGradientIndex) {
                        window.dvdScreensaver.applyCurrentMaterial();
                    }
                });
            });

            // Add stop button
            const addStopBtn = item.querySelector('.add-stop-btn');
            addStopBtn.addEventListener('click', () => {
                if (settings.gradientSets[index].stops.length >= 6) return;
                settings.gradientSets[index].stops.push({ color: '#888888', position: 50 });
                rebuildGradientsListUI();
                if (index === settings.activeGradientIndex) {
                    window.dvdScreensaver.applyCurrentMaterial();
                }
            });

            // Remove stop button
            const removeStopBtn = item.querySelector('.remove-stop-btn');
            removeStopBtn.addEventListener('click', () => {
                if (settings.gradientSets[index].stops.length <= 2) return;
                settings.gradientSets[index].stops.pop();
                rebuildGradientsListUI();
                if (index === settings.activeGradientIndex) {
                    window.dvdScreensaver.applyCurrentMaterial();
                }
            });
        }

        function updateMaterialPreview(gradientIndex) {
            const item = document.getElementById(`gradient-item-${gradientIndex}`);
            if (!item) return;

            const canvas = item.querySelector('.gradient-preview-canvas');
            if (!canvas) return;

            const gradient = settings.gradientSets[gradientIndex];
            const ctx = canvas.getContext('2d');
            const size = canvas.width;
            const center = size / 2;
            const radius = size / 2 - 2;

            ctx.clearRect(0, 0, size, size);

            // Create gradient based on type
            let grad;
            if (gradient.type === 'radial') {
                grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
            } else {
                grad = ctx.createLinearGradient(0, center, size, center);
            }

            // Sort stops by position and add to gradient
            const sortedStops = [...gradient.stops].sort((a, b) => a.position - b.position);
            sortedStops.forEach(stop => {
                grad.addColorStop(stop.position / 100, stop.color);
            });

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, Math.PI * 2);
            ctx.fill();

            // Update header strip preview
            const header = item.querySelector('.gradient-strip-preview');
            if (header) {
                const colors = gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ');
                header.style.background = `linear-gradient(to right, ${colors})`;
            }
        }

        // Add gradient button
        const addGradientBtn = document.getElementById('add-gradient-btn');
        if (addGradientBtn) {
            addGradientBtn.addEventListener('click', () => {
                if (settings.gradientSets.length >= 5) return;
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
                expandedGradientIndex = settings.gradientSets.length - 1;
                settings.activeGradientIndex = expandedGradientIndex;
                rebuildGradientsListUI();
            });
        }

        // Initialize gradients list on load
        rebuildGradientsListUI();

        setupSelect('shader-mode', 'shaderMode', (value) => {
            showElement('light-controls', value !== 'flat');
            window.dvdScreensaver.applyCurrentMaterial();
        });

        setupSlider('light-position', 'lightPosition', () => {
            window.dvdScreensaver.applyCurrentMaterial();
        }, 2);

        setupColorPicker('light-color', 'lightColor', () => {
            window.dvdScreensaver.applyCurrentMaterial();
        });

        setupSlider('light-intensity', 'lightIntensity', () => {
            window.dvdScreensaver.applyCurrentMaterial();
        });

        setupToggle('rim-enabled', 'rimEnabled', (enabled) => {
            showElement('rim-settings', enabled);
            window.dvdScreensaver.applyCurrentMaterial();
        });

        setupColorPicker('rim-color', 'rimColor', () => {
            window.dvdScreensaver.applyCurrentMaterial();
        });

        setupSlider('rim-intensity', 'rimIntensity', () => {
            window.dvdScreensaver.applyCurrentMaterial();
        });

        // ========== SECTION COLLAPSIBILITY ==========
        setupSectionCollapse();

        console.log('3D DVD Screensaver UI: Controls initialized');
    }

    // Setup collapsible sections
    function setupSectionCollapse() {
        const sectionHeaders = document.querySelectorAll('.chatooly-section-header');

        sectionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.chatooly-section-card');
                const content = section.querySelector('.chatooly-section-content');

                if (content) {
                    const isCollapsed = content.style.display === 'none';
                    content.style.display = isCollapsed ? 'block' : 'none';
                    section.classList.toggle('collapsed', !isCollapsed);
                }
            });
        });
    }

    // Start initialization
    waitForTool();

})();
