/*
 * ASCII Shader Studio - UI Controls
 * Author: Claude Code
 *
 * This file handles UI-specific functionality like collapsible sections,
 * toggle button states, and conditional visibility controls.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Setup toggle button functionality for all toggles
    setupToggleButtons();

    // Setup conditional visibility controls
    setupConditionalVisibility();

    // Setup drag and drop functionality
    setupDragAndDrop();

    // Setup slider value updates
    setupSliderValueUpdates();

    // Setup custom character set handling
    setupCustomCharacterSet();
});

function setupToggleButtons() {
    // Get all toggle buttons
    const toggleButtons = document.querySelectorAll('.chatooly-toggle');

    toggleButtons.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const isPressed = toggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;

            // Update toggle button state
            toggle.setAttribute('aria-pressed', newState);

            // Handle specific toggle behaviors
            if (toggle.id === 'transparent-bg') {
                // Show/hide background color picker based on toggle state
                const bgColorGroup = document.getElementById('bg-color-group');
                if (bgColorGroup) {
                    bgColorGroup.style.display = newState ? 'none' : 'block';
                }
            } else if (toggle.id === 'auto-contrast') {
                // Auto contrast toggle - visual feedback
                handleAutoContrastToggle(newState);
            } else if (toggle.id === 'big-type-enabled') {
                // Big type mode toggle - show/hide related controls
                handleBigTypeToggle(newState);
            } else if (toggle.id === 'animate-characters') {
                // Animation toggle - show/hide speed control
                handleAnimationToggle(newState);
            }

            // The main logic for these toggles is handled in main.js
            // This just ensures the UI state is properly updated
        });
    });
}

function setupConditionalVisibility() {
    // Character set dropdown - show custom input for custom set
    const characterSetSelect = document.getElementById('character-set');
    const customCharsGroup = document.getElementById('custom-chars-group');

    if (characterSetSelect && customCharsGroup) {
        characterSetSelect.addEventListener('change', (e) => {
            customCharsGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });
        // Initialize visibility
        customCharsGroup.style.display = characterSetSelect.value === 'custom' ? 'block' : 'none';
    }

    // Color mode dropdown - show relevant color controls
    const colorModeSelect = document.getElementById('color-mode');
    const monoColorGroup = document.getElementById('mono-color-group');
    const gradientColorsGroup = document.getElementById('gradient-colors-group');

    if (colorModeSelect && monoColorGroup && gradientColorsGroup) {
        colorModeSelect.addEventListener('change', (e) => {
            const mode = e.target.value;

            // Show monochrome color for monochrome and tinted modes
            monoColorGroup.style.display = ['monochrome', 'tinted'].includes(mode) ? 'block' : 'none';

            // Show gradient colors only for gradient mode
            gradientColorsGroup.style.display = mode === 'gradient' ? 'block' : 'none';
        });

        // Initialize visibility
        const initialMode = colorModeSelect.value;
        monoColorGroup.style.display = ['monochrome', 'tinted'].includes(initialMode) ? 'block' : 'none';
        gradientColorsGroup.style.display = initialMode === 'gradient' ? 'block' : 'none';
    }

    // Big type mode - show/hide all related controls
    const bigTypeToggle = document.getElementById('big-type-enabled');
    updateBigTypeVisibility(bigTypeToggle?.getAttribute('aria-pressed') === 'true');

    // Animation - show/hide speed control
    const animateToggle = document.getElementById('animate-characters');
    updateAnimationVisibility(animateToggle?.getAttribute('aria-pressed') === 'true');
}

function setupDragAndDrop() {
    const uploadArea = document.querySelector('.chatooly-upload-area');
    const fileInput = document.getElementById('source-image');

    if (!uploadArea || !fileInput) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('chatooly-upload-dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('chatooly-upload-dragover');
        }, false);
    });

    // Handle dropped files
    uploadArea.addEventListener('drop', handleDrop, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                // Update the file input
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;

                // Trigger change event
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }
}

function setupSliderValueUpdates() {
    // Setup all sliders to update their display values
    const sliders = document.querySelectorAll('.chatooly-slider');

    sliders.forEach(slider => {
        const valueSpan = document.getElementById(slider.id + '-value');
        if (valueSpan) {
            slider.addEventListener('input', (e) => {
                let value = e.target.value;
                let suffix = '';

                // Add appropriate suffixes
                if (slider.id.includes('size') || slider.id === 'brightness') {
                    if (slider.id === 'brightness') {
                        suffix = '%';
                    } else {
                        suffix = 'px';
                    }
                } else if (slider.id.includes('percentage') || slider.id.includes('strength') || slider.id === 'contrast') {
                    suffix = '%';
                } else if (slider.id === 'animation-speed') {
                    suffix = 'x';
                    value = parseFloat(value).toFixed(1);
                }

                valueSpan.textContent = value + suffix;
            });
        }
    });
}

function setupCustomCharacterSet() {
    const customInput = document.getElementById('custom-chars');
    if (!customInput) return;

    // Real-time validation and preview
    customInput.addEventListener('input', (e) => {
        const value = e.target.value;

        // Visual feedback for character count
        if (value.length < 3) {
            customInput.style.borderColor = 'var(--error-color, #ff4444)';
            customInput.title = 'At least 3 characters needed for good ASCII range';
        } else if (value.length > 50) {
            customInput.style.borderColor = 'var(--warning-color, #ffaa00)';
            customInput.title = 'Too many characters may affect performance';
        } else {
            customInput.style.borderColor = '';
            customInput.title = 'Enter characters from darkest to lightest';
        }
    });

    // Provide some helpful presets
    const presetButtons = createPresetButtons();
    if (presetButtons) {
        customInput.parentNode.appendChild(presetButtons);
    }
}

function createPresetButtons() {
    const presets = [
        { name: 'Minimal', chars: ' .-+*#' },
        { name: 'Binary', chars: ' 01' },
        { name: 'Dots', chars: ' .·•●' },
        { name: 'Lines', chars: ' |-+#' }
    ];

    const container = document.createElement('div');
    container.className = 'custom-presets';
    container.style.marginTop = '8px';
    container.style.display = 'flex';
    container.style.gap = '4px';

    presets.forEach(preset => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chatooly-btn-small';
        button.textContent = preset.name;
        button.style.fontSize = '10px';
        button.style.padding = '2px 6px';
        button.title = `Use preset: ${preset.chars}`;

        button.addEventListener('click', () => {
            const customInput = document.getElementById('custom-chars');
            if (customInput) {
                customInput.value = preset.chars;
                customInput.dispatchEvent(new Event('input'));
            }
        });

        container.appendChild(button);
    });

    return container;
}

function handleAutoContrastToggle(enabled) {
    const brightnessGroup = document.querySelector('#brightness').closest('.chatooly-slider-group');
    if (brightnessGroup) {
        brightnessGroup.style.opacity = enabled ? '0.6' : '1';
        const slider = brightnessGroup.querySelector('input');
        if (slider) {
            slider.disabled = enabled;
        }
    }
}

function handleBigTypeToggle(enabled) {
    updateBigTypeVisibility(enabled);

    // Visual feedback
    const section = document.querySelector('[data-section="big-type"]');
    if (section) {
        if (enabled) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    }
}

function handleAnimationToggle(enabled) {
    updateAnimationVisibility(enabled);
}

function updateBigTypeVisibility(enabled) {
    const groups = [
        'big-type-text-group',
        'text-position-group',
        'text-size-group',
        'flow-algorithm-group',
        'flow-strength-group'
    ];

    groups.forEach(groupId => {
        const group = document.getElementById(groupId);
        if (group) {
            group.style.display = enabled ? 'block' : 'none';
        }
    });
}

function updateAnimationVisibility(enabled) {
    const speedGroup = document.getElementById('animation-speed-group');
    if (speedGroup) {
        speedGroup.style.display = enabled ? 'block' : 'none';
    }
}

// Live preview for character density
function setupCharacterDensityPreview() {
    const densitySlider = document.getElementById('char-density');
    if (!densitySlider) return;

    densitySlider.addEventListener('input', (e) => {
        const density = e.target.value;

        // Create visual feedback showing approximate grid
        const preview = document.createElement('div');
        preview.style.fontSize = '8px';
        preview.style.color = 'var(--text-2)';
        preview.style.marginTop = '4px';

        const cols = Math.floor(density / 2);
        const rows = Math.floor(density / 4);
        preview.textContent = `≈${cols}×${rows} characters`;

        // Update or add preview
        const existingPreview = densitySlider.parentNode.querySelector('.density-preview');
        if (existingPreview) {
            existingPreview.replaceWith(preview);
        } else {
            preview.className = 'density-preview';
            densitySlider.parentNode.appendChild(preview);
        }
    });
}

// Character set preview
function setupCharacterSetPreview() {
    const characterSetSelect = document.getElementById('character-set');
    if (!characterSetSelect) return;

    const previewContainer = document.createElement('div');
    previewContainer.className = 'character-set-preview';
    previewContainer.style.cssText = `
        font-family: monospace;
        font-size: 12px;
        color: var(--text-2);
        margin-top: 4px;
        padding: 4px;
        border: 1px solid var(--border-color);
        border-radius: 2px;
        white-space: nowrap;
        overflow: hidden;
    `;

    characterSetSelect.parentNode.appendChild(previewContainer);

    function updatePreview() {
        const sets = {
            classic: ' .,:;i1tfLCG08@',
            dense: ' ░▒▓█▉▊▋▌▍▎▏',
            minimal: ' .-+*#',
            symbols: ' ○◐◑●◔◕⬤',
            braille: ' ⠀⠂⠄⠆⠇⠏⠟⠿',
            tech: ' 01Ⅰ|░▒▓█',
            amiga: ' .·▪▫▬▭■□▣▤▦▧▨▩',
            atascii: ' ♠♣♥♦♪☺☻○◘◙♂♀♫',
            ansi: ' ░▒▓█▄▀▌▐▖▗▘▝▚▞'
        };

        const setName = characterSetSelect.value;
        const chars = sets[setName] || sets.classic;
        previewContainer.textContent = `Preview: ${chars}`;
    }

    characterSetSelect.addEventListener('change', updatePreview);
    updatePreview();
}

// Initialize additional UI features
document.addEventListener('DOMContentLoaded', () => {
    setupCharacterDensityPreview();
    setupCharacterSetPreview();
});

// Export utility functions for main.js if needed
window.ASCIIUI = {
    updateCharacterSetPreview: function(chars) {
        const preview = document.querySelector('.character-set-preview');
        if (preview) {
            preview.textContent = `Preview: ${chars}`;
        }
    },

    showUploadFeedback: function(message, type = 'info') {
        const uploadArea = document.querySelector('.chatooly-upload-area');
        if (!uploadArea) return;

        const feedback = document.createElement('div');
        feedback.className = `upload-feedback ${type}`;
        feedback.textContent = message;
        feedback.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-1);
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 10;
            border: 1px solid var(--border-color);
        `;

        uploadArea.appendChild(feedback);

        setTimeout(() => {
            feedback.remove();
        }, 2000);
    },

    updateFlowPreview: function(algorithm, strength) {
        const algorithmSelect = document.getElementById('flow-algorithm');
        if (!algorithmSelect) return;

        const descriptions = {
            wrap: 'Characters flow around text edges',
            displace: 'Characters are pushed away from text',
            cluster: 'Characters cluster near text boundaries',
            align: 'Characters align with text shape'
        };

        const preview = algorithmSelect.parentNode.querySelector('.flow-preview');
        const description = descriptions[algorithm] || '';

        if (preview) {
            preview.textContent = `${description} (${strength}% strength)`;
        } else if (description) {
            const newPreview = document.createElement('div');
            newPreview.className = 'flow-preview';
            newPreview.style.cssText = `
                font-size: 10px;
                color: var(--text-2);
                margin-top: 4px;
            `;
            newPreview.textContent = `${description} (${strength}% strength)`;
            algorithmSelect.parentNode.appendChild(newPreview);
        }
    }
};