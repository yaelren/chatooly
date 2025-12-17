/*
 * Data-Driven Visual Instrument - UI Controls
 * Author: Claude Code
 *
 * Interface for the data-driven visual instrument.
 * Guides users through data input, parsing confirmation, and visualization control.
 */

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎛️ Initializing Data-Driven Visual Instrument UI...');

    initializeDataInput();
    initializeVisualizationControls();
    initializeBackgroundControls();

    console.log('🎛️ UI initialized');
});

// ========== DATA INPUT & GUIDANCE ==========
function initializeDataInput() {
    const dataInput = document.getElementById('data-input');
    const parseButton = document.getElementById('parse-data-btn');
    const dataStatus = document.getElementById('data-status');
    const generateButton = document.getElementById('generate-viz-btn');
    const csvUpload = document.getElementById('csv-upload');

    // Show format guidance
    showFormatGuidance();

    // Parse button handler
    if (parseButton) {
        parseButton.addEventListener('click', handleDataParse);
    }

    // Generate visualization button
    if (generateButton) {
        generateButton.addEventListener('click', handleGenerateVisualization);
    }

    // CSV file upload
    if (csvUpload) {
        csvUpload.addEventListener('change', handleCSVUpload);
    }

    // Real-time input feedback
    if (dataInput) {
        dataInput.addEventListener('input', () => {
            clearTimeout(dataInput.debounceTimer);
            dataInput.debounceTimer = setTimeout(() => {
                previewDataFormat(dataInput.value);
            }, 500);
        });
    }
}

function showFormatGuidance() {
    const guidance = document.getElementById('format-guidance');
    if (!guidance) return;

    guidance.innerHTML = `
        <div class="guidance-section">
            <h4>📋 Expected Format</h4>
            <p>Enter your data as <strong>label-value pairs</strong>:</p>

            <div class="format-examples">
                <div class="format-option">
                    <strong>Space-separated:</strong>
                    <pre>Alpha     42
Beta      68
Gamma     31</pre>
                </div>

                <div class="format-option">
                    <strong>CSV format:</strong>
                    <pre>Alpha,42
Beta,68
Gamma,31</pre>
                </div>
            </div>

            <div class="guidance-tips">
                <p><strong>Tips:</strong></p>
                <ul>
                    <li>Each line should have a label and a number</li>
                    <li>Use spaces, tabs, or commas as separators</li>
                    <li>Numbers can be integers or decimals</li>
                    <li>Minimum 2 data points required</li>
                </ul>
            </div>
        </div>
    `;
}

function previewDataFormat(text) {
    const preview = document.getElementById('data-preview');
    if (!preview || !text.trim()) {
        if (preview) preview.style.display = 'none';
        return;
    }

    const lines = text.trim().split(/\r?\n/).slice(0, 3); // Show first 3 lines
    let previewHTML = '<div class="data-preview-content"><h5>📝 Preview:</h5>';

    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed) {
            // Try to detect format
            const hasCommas = trimmed.includes(',');
            const separator = hasCommas ? ',' : /\s+/;
            const parts = trimmed.split(separator).map(p => p.trim()).filter(p => p);

            if (parts.length >= 2) {
                const label = parts[0];
                const value = parts[1];
                const isValidNumber = !isNaN(parseFloat(value)) && isFinite(parseFloat(value));

                previewHTML += `
                    <div class="preview-line ${isValidNumber ? 'valid' : 'invalid'}">
                        <span class="label">${label}</span> →
                        <span class="value ${isValidNumber ? '' : 'error'}">${value}</span>
                        ${isValidNumber ? '✓' : '❌'}
                    </div>
                `;
            } else {
                previewHTML += `
                    <div class="preview-line invalid">
                        <span class="error">⚠️ "${trimmed}" - needs label and value</span>
                    </div>
                `;
            }
        }
    });

    if (text.trim().split(/\r?\n/).length > 3) {
        previewHTML += '<div class="preview-more">... and more</div>';
    }

    previewHTML += '</div>';
    preview.innerHTML = previewHTML;
    preview.style.display = 'block';
}

function handleDataParse() {
    const dataInput = document.getElementById('data-input');
    const dataStatus = document.getElementById('data-status');
    const generateButton = document.getElementById('generate-viz-btn');

    if (!dataInput || !dataStatus) return;

    const inputText = dataInput.value.trim();
    if (!inputText) {
        updateDataStatus('error', 'Please enter some data first');
        return;
    }

    console.log('🎼 Parsing data input...');
    updateDataStatus('parsing', 'Parsing your data...');

    // Use the instrument's parsing engine
    const result = window.DataVisualInstrument.parseInput(inputText);

    if (result.success) {
        updateDataStatus('ready', `✅ ${result.message}`, result.stats);
        if (generateButton) {
            generateButton.disabled = false;
            generateButton.classList.add('ready');
        }
        showDataSummary(result.stats);
    } else {
        updateDataStatus('error', result.error);
        if (generateButton) {
            generateButton.disabled = true;
            generateButton.classList.remove('ready');
        }
    }
}

function updateDataStatus(status, message, stats = null) {
    const dataStatus = document.getElementById('data-status');
    if (!dataStatus) return;

    dataStatus.className = `data-status ${status}`;

    let content = `<div class="status-message">${message}</div>`;

    if (stats) {
        content += `
            <div class="status-details">
                <span>${stats.count} data points</span>
                <span>Range: ${stats.min} - ${stats.max}</span>
                <span>Sum: ${stats.sum}</span>
            </div>
        `;
    }

    dataStatus.innerHTML = content;
    dataStatus.style.display = 'block';
}

function showDataSummary(stats) {
    const summary = document.getElementById('data-summary');
    if (!summary) return;

    summary.innerHTML = `
        <div class="summary-content">
            <h4>📊 Data Summary</h4>
            <div class="summary-stats">
                <div class="stat">
                    <span class="stat-label">Data Points:</span>
                    <span class="stat-value">${stats.count}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Value Range:</span>
                    <span class="stat-value">${stats.min} - ${stats.max}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Total Sum:</span>
                    <span class="stat-value">${stats.sum}</span>
                </div>
            </div>
            <div class="ready-indicator">
                🎯 <strong>Data is ready for visualization!</strong>
            </div>
        </div>
    `;
    summary.style.display = 'block';
}

function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📁 Loading CSV file:', file.name);

    const reader = new FileReader();
    reader.onload = function(e) {
        const csvContent = e.target.result;
        const dataInput = document.getElementById('data-input');
        if (dataInput) {
            dataInput.value = csvContent;
            previewDataFormat(csvContent);
        }
    };
    reader.onerror = function() {
        updateDataStatus('error', 'Failed to read the file. Please try again.');
    };
    reader.readAsText(file, 'UTF-8');
}

// ========== VISUALIZATION CONTROLS ==========
function initializeVisualizationControls() {
    initializeChartTypeControls();
    initializeMaterialControls();
    initializeAnimationControls();
    initializeStyleControls();
    initializeCameraControls();
    initializeEffectsControls();
}

function initializeChartTypeControls() {
    const chartButtons = document.querySelectorAll('.chart-type-btn');

    chartButtons.forEach(button => {
        button.addEventListener('click', () => {
            const chartType = button.dataset.chart;
            if (!chartType) return;

            // Update active state
            chartButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Set chart type
            window.DataVisualInstrument.setChartType(chartType);
            console.log('📊 Chart type changed to:', chartType);
        });
    });
}

function initializeMaterialControls() {
    const materialSelect = document.getElementById('material-select');
    if (!materialSelect) return;

    // Populate with available materials
    const materials = window.DataVisualInstrument.getMaterials();
    materialSelect.innerHTML = materials.map(material =>
        `<option value="${material}">${material.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>`
    ).join('');

    materialSelect.addEventListener('change', (e) => {
        window.DataVisualInstrument.setMaterial(e.target.value);
        console.log('🎨 Material changed to:', e.target.value);
    });
}

function initializeAnimationControls() {
    const animationButtons = document.querySelectorAll('.animation-btn');

    animationButtons.forEach(button => {
        button.addEventListener('click', () => {
            const animation = button.dataset.animation;

            // Update active state
            animationButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Set animation
            window.DataVisualInstrument.setAnimation(animation);
            console.log('🎭 Animation changed to:', animation);
        });
    });

    // Animation speed control
    const animationSpeedSlider = document.getElementById('animation-speed-slider');
    if (animationSpeedSlider) {
        animationSpeedSlider.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            document.getElementById('animation-speed-value').textContent = speed.toFixed(1) + '×';
            window.DataVisualInstrument.setAnimationSpeed(speed);
        });
    }
}

function initializeStyleControls() {
    // Style selection
    const styleButtons = document.querySelectorAll('.style-btn');
    styleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const style = button.dataset.style;

            styleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            window.DataVisualInstrument.setStyle(style);
            console.log('🎨 Style changed to:', style);
        });
    });

    // Spacing control
    const spacingSlider = document.getElementById('spacing-slider');
    if (spacingSlider) {
        spacingSlider.addEventListener('input', (e) => {
            const spacing = parseFloat(e.target.value);
            document.getElementById('spacing-value').textContent = spacing.toFixed(1);
            window.DataVisualInstrument.setSpacing(spacing);
        });
    }

    // Depth control
    const depthSlider = document.getElementById('depth-slider');
    if (depthSlider) {
        depthSlider.addEventListener('input', (e) => {
            const depth = parseFloat(e.target.value);
            document.getElementById('depth-value').textContent = depth.toFixed(1);
            window.DataVisualInstrument.setDepth(depth);
        });
    }
}

function initializeCameraControls() {
    // Camera distance
    const distanceSlider = document.getElementById('camera-distance');
    if (distanceSlider) {
        distanceSlider.addEventListener('input', (e) => {
            const distance = parseFloat(e.target.value);
            document.getElementById('camera-distance-value').textContent = distance.toFixed(1);
            window.DataVisualInstrument.setCameraDistance(distance);
        });
    }

    // Camera angle
    const angleSlider = document.getElementById('camera-angle');
    if (angleSlider) {
        angleSlider.addEventListener('input', (e) => {
            const angle = parseInt(e.target.value);
            document.getElementById('camera-angle-value').textContent = angle + '°';
            window.DataVisualInstrument.setCameraAngle(angle);
        });
    }

    // Camera auto-rotate
    const autoRotateToggle = document.getElementById('auto-rotate-toggle');
    const rotationSpeedGroup = document.getElementById('rotation-speed-group');
    const rotationSpeedSlider = document.getElementById('rotation-speed');

    if (autoRotateToggle) {
        autoRotateToggle.addEventListener('click', () => {
            const isPressed = autoRotateToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            autoRotateToggle.setAttribute('aria-pressed', newState);

            // Enable/disable rotation speed control
            if (rotationSpeedGroup && rotationSpeedSlider) {
                rotationSpeedGroup.style.opacity = newState ? '1' : '0.5';
                rotationSpeedSlider.disabled = !newState;
            }

            window.DataVisualInstrument.setCameraAutoRotate(newState);
            console.log('📸 Auto rotate:', newState);
        });
    }

    // Camera auto-rotate speed
    if (rotationSpeedSlider) {
        rotationSpeedSlider.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            document.getElementById('rotation-speed-value').textContent = speed.toFixed(1) + '×';
            window.DataVisualInstrument.setCameraAutoRotateSpeed(speed);
        });
    }
}

function initializeEffectsControls() {
    // Opacity slider
    const opacitySlider = document.getElementById('opacity-slider');
    if (opacitySlider) {
        opacitySlider.addEventListener('input', (e) => {
            const opacity = parseFloat(e.target.value);
            document.getElementById('opacity-value').textContent = opacity + '%';
            window.DataVisualInstrument.setOpacity(opacity / 100);
        });
    }

    // Transparency toggle
    const transparencyToggle = document.getElementById('transparency-toggle');
    if (transparencyToggle) {
        transparencyToggle.addEventListener('click', () => {
            const isPressed = transparencyToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            transparencyToggle.setAttribute('aria-pressed', newState);
            window.DataVisualInstrument.setTransparency(newState);
        });
    }
}

function handleGenerateVisualization() {
    console.log('🎨 Generating visualization...');

    const result = window.DataVisualInstrument.generateVisualization();

    if (result.success) {
        showGenerationSuccess();
        // Enable all controls after successful generation
        enableVisualizationControls();
    } else {
        updateDataStatus('error', `Generation failed: ${result.error}`);
    }
}

function showGenerationSuccess() {
    const successIndicator = document.getElementById('generation-success');
    if (successIndicator) {
        successIndicator.style.display = 'block';
        successIndicator.innerHTML = `
            <div class="success-content">
                🎯 <strong>Visualization Generated!</strong>
                <p>Your data is now rendered on the canvas. Use the controls below to explore different styles and animations.</p>
            </div>
        `;

        // Auto-hide after 3 seconds
        setTimeout(() => {
            successIndicator.style.display = 'none';
        }, 3000);
    }
}

function enableVisualizationControls() {
    // Enable all visualization controls
    const controls = document.querySelectorAll('.chart-type-btn, .animation-btn, #material-select');
    controls.forEach(control => {
        control.disabled = false;
        control.classList.remove('disabled');
    });
}

// ========== BACKGROUND CONTROLS ==========
function initializeBackgroundControls() {
    const transparentToggle = document.getElementById('transparent-bg');
    const bgColorInput = document.getElementById('bg-color');
    const bgImageInput = document.getElementById('bg-image');
    const clearBgImageButton = document.getElementById('clear-bg-image');
    const bgFitSelect = document.getElementById('bg-fit');

    // Transparent background toggle
    if (transparentToggle) {
        transparentToggle.addEventListener('click', () => {
            const isPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            transparentToggle.setAttribute('aria-pressed', newState);

            if (window.Chatooly && window.Chatooly.backgroundManager) {
                Chatooly.backgroundManager.setTransparent(newState);
                window.DataVisualInstrument.updateBackground();
            }
        });
    }

    // Background color picker
    if (bgColorInput) {
        bgColorInput.addEventListener('input', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                Chatooly.backgroundManager.setBackgroundColor(e.target.value);
                window.DataVisualInstrument.updateBackground();
            }
        });
    }

    // Background image upload
    if (bgImageInput) {
        bgImageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                if (window.Chatooly && window.Chatooly.backgroundManager) {
                    await Chatooly.backgroundManager.setBackgroundImage(file);
                    if (clearBgImageButton) clearBgImageButton.style.display = 'block';
                    window.DataVisualInstrument.updateBackground();
                }
            } catch (error) {
                console.error('Failed to load background image:', error);
            }
        });
    }

    // Clear background image
    if (clearBgImageButton) {
        clearBgImageButton.addEventListener('click', () => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                Chatooly.backgroundManager.clearBackgroundImage();
                clearBgImageButton.style.display = 'none';
                if (bgImageInput) bgImageInput.value = '';
                window.DataVisualInstrument.updateBackground();
            }
        });
    }

    // Background fit mode
    if (bgFitSelect) {
        bgFitSelect.addEventListener('change', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                Chatooly.backgroundManager.setFit(e.target.value);
                window.DataVisualInstrument.updateBackground();
            }
        });
    }
}

// ========== UTILITY FUNCTIONS ==========
function resetInstrument() {
    // Clear all inputs and states
    const dataInput = document.getElementById('data-input');
    const dataStatus = document.getElementById('data-status');
    const dataSummary = document.getElementById('data-summary');
    const generateButton = document.getElementById('generate-viz-btn');
    const csvUpload = document.getElementById('csv-upload');

    if (dataInput) dataInput.value = '';
    if (dataStatus) dataStatus.style.display = 'none';
    if (dataSummary) dataSummary.style.display = 'none';
    if (csvUpload) csvUpload.value = '';
    if (generateButton) {
        generateButton.disabled = true;
        generateButton.classList.remove('ready');
    }

    // Reset visualization controls to defaults
    const chartButtons = document.querySelectorAll('.chart-type-btn');
    const animationButtons = document.querySelectorAll('.animation-btn');

    chartButtons.forEach(btn => btn.classList.remove('active'));
    animationButtons.forEach(btn => btn.classList.remove('active'));

    // Set defaults
    const defaultChart = document.querySelector('.chart-type-btn[data-chart="bars"]');
    const defaultAnimation = document.querySelector('.animation-btn[data-animation="none"]');

    if (defaultChart) defaultChart.classList.add('active');
    if (defaultAnimation) defaultAnimation.classList.add('active');

    console.log('🎛️ Instrument reset to initial state');
}

// Export for potential external use
window.InstrumentUI = {
    reset: resetInstrument,
    showFormatGuidance,
    updateDataStatus
};