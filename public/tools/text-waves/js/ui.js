/*
 * Text Waves - UI Controls & Event Handlers
 * All UI element interactions and state management
 */

// Import tool state from main.js (will be available globally)
// tool, isPlaying, animationId, resetEntranceAnimation, etc.

// ===== Color Management UI =====
function renderColorInputs() {
    const container = document.getElementById('text-colors-container');
    container.innerHTML = '';

    tool.textColors.forEach((color, index) => {
        const colorWrapper = document.createElement('div');
        colorWrapper.style.cssText = 'position: relative; display: inline-block;';

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = color;
        colorInput.style.cssText = 'width: 50px; height: 50px; border: 2px solid #555; border-radius: 4px; cursor: pointer;';
        colorInput.addEventListener('input', (e) => {
            tool.textColors[index] = e.target.value;
        });

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.type = 'button';
        removeBtn.style.cssText = 'position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; padding: 0; font-size: 14px; line-height: 18px; background: #ff4444; color: white; border: none; border-radius: 50%; cursor: pointer;';
        removeBtn.addEventListener('click', () => {
            if (tool.textColors.length > 1) {
                tool.textColors.splice(index, 1);
                renderColorInputs();
            }
        });

        colorWrapper.appendChild(colorInput);
        if (tool.textColors.length > 1) {
            colorWrapper.appendChild(removeBtn);
        }
        container.appendChild(colorWrapper);
    });
}

// ===== Preset System Functions =====
function applyPreset(presetName) {
    if (presetName === 'custom') {
        // Custom mode - user has full control
        return;
    }

    const preset = PATTERN_PRESETS[presetName];
    if (!preset) return;

    window.isApplyingPreset = true; // Prevent auto-switch to custom

    // Store base values from preset (before multipliers)
    window.baseAmplitudeX = preset.h.amplitude;
    window.baseAmplitudeY = preset.v.amplitude;
    window.baseSpeedX = preset.h.speed;
    window.baseSpeedY = preset.v.speed;

    // Calculate actual values with multipliers
    const sizeScale = window.patternSizeMultiplier / 50; // 50 is the default base size

    // Apply horizontal wave settings
    tool.waveTypeX = preset.h.type;
    tool.amplitudeX = preset.h.amplitude * sizeScale;
    tool.frequencyX = preset.h.frequency;
    tool.speedX = preset.h.speed * window.overallSpeedMultiplier;

    document.getElementById('wave-type-x').value = preset.h.type;
    document.getElementById('amplitude-x').value = tool.amplitudeX;
    document.getElementById('amplitude-x-input').value = tool.amplitudeX;
    document.getElementById('frequency-x').value = preset.h.frequency;
    document.getElementById('frequency-x-input').value = preset.h.frequency;
    document.getElementById('speed-x').value = tool.speedX;
    document.getElementById('speed-x-input').value = tool.speedX;

    // Apply vertical wave settings
    tool.waveTypeY = preset.v.type;
    tool.amplitudeY = preset.v.amplitude * sizeScale;
    tool.frequencyY = preset.v.frequency;
    tool.speedY = preset.v.speed * window.overallSpeedMultiplier;

    document.getElementById('wave-type-y').value = preset.v.type;
    document.getElementById('amplitude-y').value = tool.amplitudeY;
    document.getElementById('amplitude-y-input').value = tool.amplitudeY;
    document.getElementById('frequency-y').value = preset.v.frequency;
    document.getElementById('frequency-y-input').value = preset.v.frequency;
    document.getElementById('speed-y').value = tool.speedY;
    document.getElementById('speed-y-input').value = tool.speedY;

    setTimeout(() => { window.isApplyingPreset = false; }, 100);
}

function switchToCustom() {
    if (!window.isApplyingPreset) {
        document.getElementById('pattern-preset').value = 'custom';
        // Store current values as base for quick controls
        window.baseAmplitudeX = tool.amplitudeX;
        window.baseAmplitudeY = tool.amplitudeY;
        window.baseSpeedX = tool.speedX;
        window.baseSpeedY = tool.speedY;
    }
}

// ===== Initialize UI =====
function initializeUI() {
    // Initialize color inputs
    renderColorInputs();

    // Apply infinity preset on load
    document.getElementById('pattern-preset').value = 'infinity';
    applyPreset('infinity');

    // Setup all event listeners
    setupControlListeners();
    setupAnimationListeners();
    setupTextListeners();
    setupBackgroundListeners();
    setupWaveGuideListeners();
    setupCollapsibleSections();
}

// ===== Text Control Listeners =====
function setupTextListeners() {
    document.getElementById('text-input').addEventListener('input', (e) => {
        tool.text = e.target.value;
        resetEntranceAnimation();
    });

    document.getElementById('split-mode').addEventListener('change', (e) => {
        tool.splitMode = e.target.value;

        // Update spacing label based on split mode
        const spacingLabel = document.getElementById('spacing-label');
        const labelMap = {
            'character': 'Space Between Characters',
            'word': 'Space Between Words',
            'sentence': 'Space Between Sentences'
        };
        spacingLabel.textContent = labelMap[e.target.value] || 'Space Between Characters';
    });

    document.getElementById('rotate-text').addEventListener('change', (e) => {
        tool.rotateText = e.target.checked;
    });

    // Font Family
    document.getElementById('font-family').addEventListener('change', (e) => {
        if (e.target.value === '__upload__') {
            // Trigger file upload
            document.getElementById('custom-font-upload').click();
            // Reset to previous font until upload completes
            e.target.value = tool.fontFamily;
        } else {
            tool.fontFamily = e.target.value;
        }
    });

    // Custom Font Upload Handler
    document.getElementById('custom-font-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                // Extract font name from filename (without extension)
                const fontName = file.name.replace(/\.(woff|woff2|ttf|otf)$/i, '');

                // Determine font format from file extension
                const extension = file.name.split('.').pop().toLowerCase();
                let format = 'truetype';
                if (extension === 'woff') format = 'woff';
                else if (extension === 'woff2') format = 'woff2';
                else if (extension === 'otf') format = 'opentype';

                // Create @font-face CSS rule
                const fontFace = new FontFace(fontName, `url(${event.target.result})`, {
                    style: 'normal',
                    weight: 'normal'
                });

                // Load the font
                fontFace.load().then((loadedFont) => {
                    // Add font to document
                    document.fonts.add(loadedFont);

                    // Add to font-family dropdown if not already there
                    const fontSelect = document.getElementById('font-family');
                    const optionExists = Array.from(fontSelect.options).some(opt => opt.value === fontName);

                    if (!optionExists) {
                        const option = document.createElement('option');
                        option.value = fontName;
                        option.textContent = fontName + ' (Custom)';
                        // Insert after Wix Madefor fonts
                        fontSelect.insertBefore(option, fontSelect.options[2]);
                    }

                    // Set as selected font
                    fontSelect.value = fontName;
                    tool.fontFamily = fontName;

                    console.log(`✅ Custom font "${fontName}" loaded successfully`);
                }).catch((error) => {
                    console.error('❌ Error loading custom font:', error);
                    alert('Error loading font. Please ensure the file is a valid font format (WOFF, WOFF2, TTF, or OTF).');
                });
            };
            reader.readAsDataURL(file);
        }
    });

    // Font Size
    document.getElementById('font-size').addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        tool.fontSize = value;
        document.getElementById('font-size-input').value = value;
    });
    document.getElementById('font-size-input').addEventListener('input', (e) => {
        const value = parseInt(e.target.value) || 12;
        tool.fontSize = value;
        document.getElementById('font-size').value = value;
    });

    // Bold button toggle
    document.getElementById('bold-btn').addEventListener('click', (e) => {
        tool.fontWeight = tool.fontWeight === 'bold' ? 'normal' : 'bold';
        e.target.style.background = tool.fontWeight === 'bold' ? '#667eea' : '#333';
    });

    // Italic button toggle
    document.getElementById('italic-btn').addEventListener('click', (e) => {
        tool.fontStyle = tool.fontStyle === 'italic' ? 'normal' : 'italic';
        e.target.style.background = tool.fontStyle === 'italic' ? '#667eea' : '#333';
    });

    // Highlight button toggle
    document.getElementById('highlight-btn').addEventListener('click', (e) => {
        tool.textHighlight = !tool.textHighlight;
        e.target.style.background = tool.textHighlight ? '#667eea' : '#333';
        document.getElementById('highlight-color').style.display = tool.textHighlight ? 'block' : 'none';
    });

    document.getElementById('highlight-color').addEventListener('input', (e) => {
        tool.highlightColor = e.target.value;
    });

    // Letter spacing
    document.getElementById('letter-spacing').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        tool.letterSpacing = value;
        document.getElementById('letter-spacing-input').value = value;
    });
    document.getElementById('letter-spacing-input').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value) || 0;
        tool.letterSpacing = value;
        document.getElementById('letter-spacing').value = value;
    });

    // Add color button
    document.getElementById('add-color-btn').addEventListener('click', () => {
        tool.textColors.push('#ffffff');
        renderColorInputs();
    });

    document.getElementById('blend-mode').addEventListener('change', (e) => {
        tool.blendMode = e.target.value;
    });

    // Segment Icon
    document.getElementById('segment-icon').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    tool.segmentIcon = img;
                    document.getElementById('icon-size-group').style.display = 'block';
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            tool.segmentIcon = null;
            document.getElementById('icon-size-group').style.display = 'none';
        }
    });

    // Icon Size
    document.getElementById('icon-size').addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        tool.iconSize = value;
        document.getElementById('icon-size-input').value = value;
    });
    document.getElementById('icon-size-input').addEventListener('input', (e) => {
        const value = parseInt(e.target.value) || 10;
        tool.iconSize = value;
        document.getElementById('icon-size').value = value;
    });

    // Repetitions
    document.getElementById('repetitions').addEventListener('input', (e) => {
        tool.repetitions = parseInt(e.target.value);
        document.getElementById('repetitions-input').value = tool.repetitions;
    });
    document.getElementById('repetitions-input').addEventListener('input', (e) => {
        tool.repetitions = parseInt(e.target.value);
        document.getElementById('repetitions').value = tool.repetitions;
    });
}

// ===== Animation Control Listeners =====
function setupAnimationListeners() {
    // Play/Pause button
    document.getElementById('play-pause-btn').addEventListener('click', (e) => {
        window.isPlaying = !window.isPlaying;
        e.target.textContent = window.isPlaying ? '⏸' : '▶';
        e.target.style.background = window.isPlaying ? 'rgba(255, 255, 255, 0.1)' : 'transparent';

        if (window.isPlaying) {
            animate();
        }
    });

    // Replay button
    document.getElementById('replay-btn').addEventListener('click', () => {
        resetEntranceAnimation();
        if (!window.isPlaying) {
            window.isPlaying = true;
            document.getElementById('play-pause-btn').textContent = '⏸';
            document.getElementById('play-pause-btn').style.background = 'rgba(255, 255, 255, 0.1)';
            animate();
        }
    });

    // Text Flow
    document.getElementById('text-flow').addEventListener('change', (e) => {
        tool.textFlow = e.target.value;

        // Update direction options and label based on text flow
        const directionSelect = document.getElementById('direction');
        const directionLabel = document.getElementById('direction-label');

        if (e.target.value === 'horizontal') {
            directionSelect.innerHTML = `
                <option value="right">Right →</option>
                <option value="left">Left ←</option>
            `;
            directionLabel.textContent = 'Movement Direction';
            tool.direction = 'right';
        } else {
            directionSelect.innerHTML = `
                <option value="down">Down ↓</option>
                <option value="up">Up ↑</option>
            `;
            directionLabel.textContent = 'Movement Direction';
            tool.direction = 'down';
        }
    });

    document.getElementById('direction').addEventListener('change', (e) => {
        tool.direction = e.target.value;
    });

    // Entrance Type Control
    document.getElementById('entrance-type').addEventListener('change', (e) => {
        window.entranceType = e.target.value;
        resetEntranceAnimation();
    });

    // Entrance Easing Control
    document.getElementById('entrance-easing').addEventListener('change', (e) => {
        window.entranceEasing = e.target.value;
        resetEntranceAnimation();
    });

    // Entrance Delay Control
    document.getElementById('entrance-delay').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        window.entranceDelay = value;
        document.getElementById('entrance-delay-input').value = value;
    });
    document.getElementById('entrance-delay-input').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value) || 0;
        window.entranceDelay = value;
        document.getElementById('entrance-delay').value = Math.min(value, 5);
    });

    // Entrance Speed Control
    document.getElementById('entrance-speed').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        window.entranceSpeed = value;
        document.getElementById('entrance-speed-input').value = value;
    });
    document.getElementById('entrance-speed-input').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value) || 0.1;
        window.entranceSpeed = value;
        document.getElementById('entrance-speed').value = value;
    });
}

// ===== Wave Control Listeners =====
function setupControlListeners() {
    // Pattern Preset Selector
    document.getElementById('pattern-preset').addEventListener('change', (e) => {
        const selectedPreset = e.target.value;
        applyPreset(selectedPreset);

        // Show/hide sections based on preset selection
        const presetControlsSection = document.getElementById('preset-controls-section');
        const customAnimationSection = document.getElementById('custom-params-section');

        if (selectedPreset === 'custom') {
            presetControlsSection.style.display = 'none';
            customAnimationSection.style.display = 'block';
            customAnimationSection.classList.remove('collapsed');
        } else {
            presetControlsSection.style.display = 'block';
            customAnimationSection.style.display = 'none';
        }
    });

    // Overall Speed Control
    document.getElementById('overall-speed').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        window.overallSpeedMultiplier = value;
        document.getElementById('overall-speed-input').value = value;

        const currentPreset = document.getElementById('pattern-preset').value;
        if (currentPreset !== 'custom') {
            applyPreset(currentPreset);
        } else {
            tool.speedX = window.baseSpeedX * value;
            tool.speedY = window.baseSpeedY * value;
            document.getElementById('speed-x').value = tool.speedX;
            document.getElementById('speed-x-input').value = tool.speedX;
            document.getElementById('speed-y').value = tool.speedY;
            document.getElementById('speed-y-input').value = tool.speedY;
        }
    });

    document.getElementById('overall-speed-input').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value) || 0;
        window.overallSpeedMultiplier = value;
        document.getElementById('overall-speed').value = value;

        const currentPreset = document.getElementById('pattern-preset').value;
        if (currentPreset !== 'custom') {
            applyPreset(currentPreset);
        } else {
            tool.speedX = window.baseSpeedX * value;
            tool.speedY = window.baseSpeedY * value;
            document.getElementById('speed-x').value = tool.speedX;
            document.getElementById('speed-x-input').value = tool.speedX;
            document.getElementById('speed-y').value = tool.speedY;
            document.getElementById('speed-y-input').value = tool.speedY;
        }
    });

    // Pattern Size Control
    document.getElementById('pattern-size').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        window.patternSizeMultiplier = value;
        document.getElementById('pattern-size-input').value = value;

        const currentPreset = document.getElementById('pattern-preset').value;
        if (currentPreset !== 'custom') {
            applyPreset(currentPreset);
        } else {
            const sizeScale = value / 50;
            tool.amplitudeX = window.baseAmplitudeX * sizeScale;
            tool.amplitudeY = window.baseAmplitudeY * sizeScale;
            document.getElementById('amplitude-x').value = tool.amplitudeX;
            document.getElementById('amplitude-x-input').value = tool.amplitudeX;
            document.getElementById('amplitude-y').value = tool.amplitudeY;
            document.getElementById('amplitude-y-input').value = tool.amplitudeY;
        }
    });

    document.getElementById('pattern-size-input').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value) || 10;
        window.patternSizeMultiplier = value;
        document.getElementById('pattern-size').value = value;

        const currentPreset = document.getElementById('pattern-preset').value;
        if (currentPreset !== 'custom') {
            applyPreset(currentPreset);
        } else {
            const sizeScale = value / 50;
            tool.amplitudeX = window.baseAmplitudeX * sizeScale;
            tool.amplitudeY = window.baseAmplitudeY * sizeScale;
            document.getElementById('amplitude-x').value = tool.amplitudeX;
            document.getElementById('amplitude-x-input').value = tool.amplitudeX;
            document.getElementById('amplitude-y').value = tool.amplitudeY;
            document.getElementById('amplitude-y-input').value = tool.amplitudeY;
        }
    });

    // Wave Type Controls
    document.getElementById('wave-type-x').addEventListener('change', (e) => {
        tool.waveTypeX = e.target.value;
    });

    document.getElementById('wave-type-y').addEventListener('change', (e) => {
        tool.waveTypeY = e.target.value;
    });

    // Amplitude X
    document.getElementById('amplitude-x').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        tool.amplitudeX = value;
        document.getElementById('amplitude-x-input').value = value;
    });
    document.getElementById('amplitude-x-input').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value) || 0;
        tool.amplitudeX = value;
        document.getElementById('amplitude-x').value = value;
    });

    // Amplitude Y
    document.getElementById('amplitude-y').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        tool.amplitudeY = value;
        document.getElementById('amplitude-y-input').value = value;
    });
    document.getElementById('amplitude-y-input').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value) || 0;
        tool.amplitudeY = value;
        document.getElementById('amplitude-y').value = value;
    });

    // Speed X
    document.getElementById('speed-x').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        tool.speedX = value;
        document.getElementById('speed-x-input').value = value;
    });
    document.getElementById('speed-x-input').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value) || 0;
        tool.speedX = value;
        document.getElementById('speed-x').value = value;
    });

    // Speed Y
    document.getElementById('speed-y').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        tool.speedY = value;
        document.getElementById('speed-y-input').value = value;
    });
    document.getElementById('speed-y-input').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value) || 0;
        tool.speedY = value;
        document.getElementById('speed-y').value = value;
    });

    // Frequency X
    document.getElementById('frequency-x').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        tool.frequencyX = value;
        document.getElementById('frequency-x-input').value = value;
    });
    document.getElementById('frequency-x-input').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value) || 0;
        tool.frequencyX = value;
        document.getElementById('frequency-x').value = value;
    });

    // Frequency Y
    document.getElementById('frequency-y').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        tool.frequencyY = value;
        document.getElementById('frequency-y-input').value = value;
    });
    document.getElementById('frequency-y-input').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value) || 0;
        tool.frequencyY = value;
        document.getElementById('frequency-y').value = value;
    });

    // Swap Movement Button
    document.getElementById('swap-movement-btn').addEventListener('click', () => {
        const tempType = tool.waveTypeX;
        const tempAmplitude = tool.amplitudeX;
        const tempFrequency = tool.frequencyX;
        const tempSpeed = tool.speedX;
        const tempBaseAmplitude = window.baseAmplitudeX;
        const tempBaseSpeed = window.baseSpeedX;

        tool.waveTypeX = tool.waveTypeY;
        tool.amplitudeX = tool.amplitudeY;
        tool.frequencyX = tool.frequencyY;
        tool.speedX = tool.speedY;
        window.baseAmplitudeX = window.baseAmplitudeY;
        window.baseSpeedX = window.baseSpeedY;

        tool.waveTypeY = tempType;
        tool.amplitudeY = tempAmplitude;
        tool.frequencyY = tempFrequency;
        tool.speedY = tempSpeed;
        window.baseAmplitudeY = tempBaseAmplitude;
        window.baseSpeedY = tempBaseSpeed;

        document.getElementById('wave-type-x').value = tool.waveTypeX;
        document.getElementById('amplitude-x').value = tool.amplitudeX;
        document.getElementById('amplitude-x-input').value = tool.amplitudeX;
        document.getElementById('frequency-x').value = tool.frequencyX;
        document.getElementById('frequency-x-input').value = tool.frequencyX;
        document.getElementById('speed-x').value = tool.speedX;
        document.getElementById('speed-x-input').value = tool.speedX;

        document.getElementById('wave-type-y').value = tool.waveTypeY;
        document.getElementById('amplitude-y').value = tool.amplitudeY;
        document.getElementById('amplitude-y-input').value = tool.amplitudeY;
        document.getElementById('frequency-y').value = tool.frequencyY;
        document.getElementById('frequency-y-input').value = tool.frequencyY;
        document.getElementById('speed-y').value = tool.speedY;
        document.getElementById('speed-y-input').value = tool.speedY;

        switchToCustom();
    });

    // Auto-switch to Custom on Manual Changes
    const waveControls = [
        'wave-type-x', 'wave-type-y',
        'amplitude-x', 'amplitude-x-input',
        'amplitude-y', 'amplitude-y-input',
        'frequency-x', 'frequency-x-input',
        'frequency-y', 'frequency-y-input',
        'speed-x', 'speed-x-input',
        'speed-y', 'speed-y-input'
    ];

    waveControls.forEach(controlId => {
        const element = document.getElementById(controlId);
        if (element) {
            element.addEventListener('input', switchToCustom);
            element.addEventListener('change', switchToCustom);
        }
    });
}

// ===== Background Control Listeners =====
function setupBackgroundListeners() {
    document.getElementById('transparent-bg').addEventListener('change', (e) => {
        tool.bgTransparent = e.target.checked;
        document.getElementById('bg-color-group').style.display = e.target.checked ? 'none' : 'block';

        if (e.target.checked) {
            canvas.classList.add('transparent-bg');
        } else {
            canvas.classList.remove('transparent-bg');
        }
    });

    document.getElementById('bg-color').addEventListener('input', (e) => {
        tool.bgColor = e.target.value;
    });

    document.getElementById('bg-fit').addEventListener('change', (e) => {
        tool.bgFit = e.target.value;
    });

    document.getElementById('bg-image').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    tool.bgImage = img;
                    document.getElementById('bg-fit-group').style.display = 'block';
                    document.getElementById('clear-bg-image').style.display = 'block';
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            tool.bgImage = null;
            document.getElementById('bg-fit-group').style.display = 'none';
            document.getElementById('clear-bg-image').style.display = 'none';
        }
    });

    document.getElementById('clear-bg-image').addEventListener('click', () => {
        tool.bgImage = null;
        document.getElementById('bg-image').value = '';
        document.getElementById('bg-fit-group').style.display = 'none';
        document.getElementById('clear-bg-image').style.display = 'none';
    });
}

// ===== Wave Guide Control Listeners =====
function setupWaveGuideListeners() {
    document.getElementById('show-wave-path').addEventListener('change', (e) => {
        tool.showWavePath = e.target.checked;
        const waveGuideOptions = document.getElementById('wave-guide-options');
        const waveGuideHeader = document.getElementById('wave-guide-header');

        if (e.target.checked) {
            waveGuideOptions.style.display = 'block';
            waveGuideOptions.style.opacity = '1';
            waveGuideHeader.style.opacity = '1';
        } else {
            waveGuideOptions.style.display = 'none';
            waveGuideHeader.style.opacity = '0.5';
        }
    });

    document.getElementById('wave-shape').addEventListener('change', (e) => {
        tool.waveShape = e.target.value;
    });

    document.getElementById('wave-color').addEventListener('input', (e) => {
        tool.waveColor = e.target.value;
    });

    document.getElementById('wave-opacity').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        tool.waveOpacity = value;
        document.getElementById('wave-opacity-input').value = value;
    });

    document.getElementById('wave-opacity-input').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value) || 0;
        tool.waveOpacity = Math.max(0, Math.min(1, value));
        document.getElementById('wave-opacity').value = tool.waveOpacity;
    });

    document.getElementById('wave-marker-size').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        tool.waveMarkerSize = value;
        document.getElementById('wave-marker-size-input').value = value;
    });
    document.getElementById('wave-marker-size-input').addEventListener('input', (e) => {
        const value = parseFloat(e.target.value) || 2;
        tool.waveMarkerSize = value;
        document.getElementById('wave-marker-size').value = value;
    });
}

// ===== Collapsible Sections =====
function setupCollapsibleSections() {
    // Main sections
    const sectionPairs = [
        { header: 'text-header', content: 'text-section' },
        { header: 'animation-header', content: 'animation-section' },
        { header: 'background-header', content: 'background-section' },
        { header: 'wave-guide-header', content: 'wave-guide-section' }
    ];

    sectionPairs.forEach(pair => {
        const header = document.getElementById(pair.header);
        const content = document.getElementById(pair.content);

        header.addEventListener('click', () => {
            header.classList.toggle('expanded');
            content.classList.toggle('collapsed');
        });
    });

    // Horizontal Movement parameter section
    const horizontalHeader = document.getElementById('horizontal-header');
    const horizontalSection = document.getElementById('horizontal-movement-section');

    horizontalHeader.addEventListener('click', () => {
        horizontalHeader.classList.toggle('expanded');
        horizontalSection.classList.toggle('collapsed');
    });

    // Vertical Movement parameter section
    const verticalHeader = document.getElementById('vertical-header');
    const verticalSection = document.getElementById('vertical-movement-section');

    verticalHeader.addEventListener('click', () => {
        verticalHeader.classList.toggle('expanded');
        verticalSection.classList.toggle('collapsed');
    });

    // Subsection Toggle (Entrance/Wave Animation)
    const entranceAnimationHeader = document.getElementById('entrance-animation-header');
    const entranceAnimationSection = document.getElementById('entrance-animation-section');
    const waveAnimationHeader = document.getElementById('wave-animation-header');
    const waveAnimationSection = document.getElementById('wave-animation-section');

    if (entranceAnimationHeader && entranceAnimationSection) {
        entranceAnimationHeader.addEventListener('click', () => {
            entranceAnimationHeader.classList.toggle('expanded');
            entranceAnimationSection.classList.toggle('collapsed');
        });
    }

    if (waveAnimationHeader && waveAnimationSection) {
        waveAnimationHeader.addEventListener('click', () => {
            waveAnimationHeader.classList.toggle('expanded');
            waveAnimationSection.classList.toggle('collapsed');
        });
    }
}

// ===== Surprise Me Button =====
document.getElementById('surprise-me-btn').addEventListener('click', () => {
    // Color palettes from the images
    const colorPalettes = [
        { bg: '#233B24', text: ['#1C2968', '#643C94', '#4A2930', '#DA3A2E', '#F3AEC6', '#6396FF', '#CCFD50'] },
        { bg: '#0F0E54', text: ['#D9F20C', '#FF5733', '#6A4C93', '#E8E8E8'] },
        { bg: '#20-0199', text: ['#D9F20C', '#FF5733', '#6A4C93', '#E8E8E8'] },
        { bg: '#D6D0C5', text: ['#A6171C', '#F1C045'] },
        { bg: '#A6171C', text: ['#D6D0C5', '#F1C045'] },
        { bg: '#D20001', text: ['#FEC6E9', '#0212EE', '#F3F3E9'] },
        { bg: '#0212EE', text: ['#D20001', '#FEC6E9', '#F3F3E9'] },
        { bg: '#FEC6E9', text: ['#D20001', '#0212EE', '#F3F3E9'] },
        { bg: '#D9F20C', text: ['#0F0E54'] },
        { bg: '#0F0E54', text: ['#D9F20C'] },
        { bg: '#1C2968', text: ['#CCFD50', '#F3AEC6', '#6396FF'] },
        { bg: '#643C94', text: ['#F3AEC6', '#CCFD50', '#6396FF'] },
        { bg: '#000000', text: ['#D9F20C', '#FF5733', '#6A4C93'] },
        { bg: '#E8E8E8', text: ['#A6171C', '#0212EE', '#D20001'] }
    ];

    const palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
    tool.bgColor = palette.bg;
    document.getElementById('bg-color').value = palette.bg;
    tool.textColors = [...palette.text];
    renderColorInputs();

    const splitModes = ['character', 'word', 'sentence'];
    const randomSplitMode = splitModes[Math.floor(Math.random() * splitModes.length)];
    tool.splitMode = randomSplitMode;
    document.getElementById('split-mode').value = randomSplitMode;

    const randomRepetitions = Math.floor(Math.random() * 6 + 1);
    tool.repetitions = randomRepetitions;
    document.getElementById('repetitions').value = randomRepetitions;
    document.getElementById('repetitions-input').value = randomRepetitions;

    document.getElementById('pattern-preset').value = 'custom';
    const presetControlsSection = document.getElementById('preset-controls-section');
    const customAnimationSection = document.getElementById('custom-params-section');
    presetControlsSection.style.display = 'none';
    customAnimationSection.style.display = 'block';
    customAnimationSection.classList.remove('collapsed');

    const horizontalHeader = document.getElementById('horizontal-header');
    const horizontalSection = document.getElementById('horizontal-movement-section');
    const verticalHeader = document.getElementById('vertical-header');
    const verticalSection = document.getElementById('vertical-movement-section');
    horizontalHeader.classList.add('expanded');
    horizontalSection.classList.remove('collapsed');
    verticalHeader.classList.add('expanded');
    verticalSection.classList.remove('collapsed');

    const horizontalTypes = ['sine', 'cosine', 'tangent', 'sine', 'cosine'];
    const randomWaveTypeX = horizontalTypes[Math.floor(Math.random() * horizontalTypes.length)];
    tool.waveTypeX = randomWaveTypeX;
    document.getElementById('wave-type-x').value = randomWaveTypeX;

    const verticalTypes = ['sine', 'cosine', 'tangent', 'sine', 'cosine'];
    const randomWaveTypeY = verticalTypes[Math.floor(Math.random() * verticalTypes.length)];
    tool.waveTypeY = randomWaveTypeY;
    document.getElementById('wave-type-y').value = randomWaveTypeY;

    const randomAmplitudeX = Math.floor(Math.random() * 180 + 20);
    tool.amplitudeX = randomAmplitudeX;
    window.baseAmplitudeX = randomAmplitudeX;
    document.getElementById('amplitude-x').value = randomAmplitudeX;
    document.getElementById('amplitude-x-input').value = randomAmplitudeX;

    const randomAmplitudeY = Math.floor(Math.random() * 180 + 20);
    tool.amplitudeY = randomAmplitudeY;
    window.baseAmplitudeY = randomAmplitudeY;
    document.getElementById('amplitude-y').value = randomAmplitudeY;
    document.getElementById('amplitude-y-input').value = randomAmplitudeY;

    const randomFrequencyX = (Math.random() * 0.045 + 0.005).toFixed(3);
    tool.frequencyX = parseFloat(randomFrequencyX);
    document.getElementById('frequency-x').value = randomFrequencyX;
    document.getElementById('frequency-x-input').value = randomFrequencyX;

    const randomFrequencyY = (Math.random() * 0.045 + 0.005).toFixed(3);
    tool.frequencyY = parseFloat(randomFrequencyY);
    document.getElementById('frequency-y').value = randomFrequencyY;
    document.getElementById('frequency-y-input').value = randomFrequencyY;

    const randomSpeedX = (Math.random() * 2.8 + 0.2).toFixed(1);
    tool.speedX = parseFloat(randomSpeedX);
    window.baseSpeedX = parseFloat(randomSpeedX);
    document.getElementById('speed-x').value = randomSpeedX;
    document.getElementById('speed-x-input').value = randomSpeedX;

    const randomSpeedY = (Math.random() * 2.8 + 0.2).toFixed(1);
    tool.speedY = parseFloat(randomSpeedY);
    window.baseSpeedY = parseFloat(randomSpeedY);
    document.getElementById('speed-y').value = randomSpeedY;
    document.getElementById('speed-y-input').value = randomSpeedY;

    const textFlows = ['horizontal', 'vertical'];
    const randomTextFlow = textFlows[Math.floor(Math.random() * textFlows.length)];
    tool.textFlow = randomTextFlow;
    document.getElementById('text-flow').value = randomTextFlow;

    const directionSelect = document.getElementById('direction');
    if (randomTextFlow === 'horizontal') {
        directionSelect.innerHTML = `
            <option value="right">Right →</option>
            <option value="left">Left ←</option>
        `;
        const horizontalDirections = ['right', 'left'];
        const randomDirection = horizontalDirections[Math.floor(Math.random() * horizontalDirections.length)];
        tool.direction = randomDirection;
        directionSelect.value = randomDirection;
    } else {
        directionSelect.innerHTML = `
            <option value="down">Down ↓</option>
            <option value="up">Up ↑</option>
        `;
        const verticalDirections = ['down', 'up'];
        const randomDirection = verticalDirections[Math.floor(Math.random() * verticalDirections.length)];
        tool.direction = randomDirection;
        directionSelect.value = randomDirection;
    }

    const sizeCategory = Math.random();
    let randomFontSize;
    if (sizeCategory < 0.4) {
        randomFontSize = Math.floor(Math.random() * 29 + 12);
    } else if (sizeCategory < 0.8) {
        randomFontSize = Math.floor(Math.random() * 81 + 120);
    } else {
        randomFontSize = Math.floor(Math.random() * 81 + 40);
    }
    tool.fontSize = randomFontSize;
    document.getElementById('font-size').value = randomFontSize;
    document.getElementById('font-size-input').value = randomFontSize;

    const randomBold = Math.random() > 0.5;
    tool.fontWeight = randomBold ? 'bold' : 'normal';
    document.getElementById('bold-btn').style.background = randomBold ? '#667eea' : '#333';

    const randomItalic = Math.random() > 0.7;
    tool.fontStyle = randomItalic ? 'italic' : 'normal';
    document.getElementById('italic-btn').style.background = randomItalic ? '#667eea' : '#333';

    const randomHighlight = Math.random() < 0.2;
    tool.textHighlight = randomHighlight;
    document.getElementById('highlight-btn').style.background = randomHighlight ? '#667eea' : '#333';
    document.getElementById('highlight-color').style.display = randomHighlight ? 'block' : 'none';

    if (randomHighlight) {
        const hlHue = Math.floor(Math.random() * 360);
        const hlSaturation = Math.floor(Math.random() * 30 + 70);
        const hlLightness = Math.floor(Math.random() * 40 + 40);
        const hlColor = `hsl(${hlHue}, ${hlSaturation}%, ${hlLightness}%)`;
        const tempDiv3 = document.createElement('div');
        tempDiv3.style.color = hlColor;
        document.body.appendChild(tempDiv3);
        const computedHlColor = window.getComputedStyle(tempDiv3).color;
        document.body.removeChild(tempDiv3);
        const hlRgb = computedHlColor.match(/\d+/g);
        if (hlRgb) {
            const hlHex = '#' + hlRgb.map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
            tool.highlightColor = hlHex;
            document.getElementById('highlight-color').value = hlHex;
        }
    }

    const randomSpacing = (Math.random() * 0.9 + 0.3).toFixed(1);
    tool.letterSpacing = parseFloat(randomSpacing);
    document.getElementById('letter-spacing').value = randomSpacing;
    document.getElementById('letter-spacing-input').value = randomSpacing;

    const blendModes = ['source-over', 'difference', 'screen'];
    const randomBlend = blendModes[Math.floor(Math.random() * blendModes.length)];
    tool.blendMode = randomBlend;
    document.getElementById('blend-mode').value = randomBlend;

    const randomRotate = Math.random() > 0.3;
    tool.rotateText = randomRotate;
    document.getElementById('rotate-text').checked = randomRotate;

    const showGuide = Math.random() < 0.4;
    tool.showWavePath = showGuide;
    document.getElementById('show-wave-path').checked = showGuide;

    if (showGuide) {
        const shapes = ['circle', 'square', 'cross', 'rhombus'];
        const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
        tool.waveShape = randomShape;
        document.getElementById('wave-shape').value = randomShape;

        const randomMarkerSize = Math.floor(Math.random() * 78 + 2);
        tool.waveMarkerSize = randomMarkerSize;
        document.getElementById('wave-marker-size').value = randomMarkerSize;
        document.getElementById('wave-marker-size-input').value = randomMarkerSize;

        const guideHue = Math.floor(Math.random() * 360);
        const guideSaturation = Math.floor(Math.random() * 30 + 70);
        const guideLightness = Math.floor(Math.random() * 40 + 40);
        const guideColor = `hsl(${guideHue}, ${guideSaturation}%, ${guideLightness}%)`;
        const tempDiv2 = document.createElement('div');
        tempDiv2.style.color = guideColor;
        document.body.appendChild(tempDiv2);
        const computedGuideColor = window.getComputedStyle(tempDiv2).color;
        document.body.removeChild(tempDiv2);
        const guideRgb = computedGuideColor.match(/\d+/g);
        if (guideRgb) {
            const guideHex = '#' + guideRgb.map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
            tool.waveColor = guideHex;
            document.getElementById('wave-color').value = guideHex;
        }
    }

    resetEntranceAnimation();
    console.log('✦ Surprise! New random configuration applied');
});

// Initialize UI when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUI);
} else {
    initializeUI();
}
