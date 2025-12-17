/*
 * Liquid Typography Tool - UI Controls
 * Handles all UI interactions and control updates
 */

document.addEventListener('DOMContentLoaded', () => {
    // ========== UI ELEMENTS ==========
    const textInput = document.getElementById('textInput');
    const fontSelector = document.getElementById('fontSelector');
    const localFontInput = document.getElementById('localFontInput');
    const pngSequenceButton = document.getElementById('pngSequenceButton');
    const exportDurationInput = document.getElementById('exportDuration');
    
    // Sliders
    const particleSpacingSlider = document.getElementById('particleSpacing');
    const particleSizeSlider = document.getElementById('particleSize');
    const fontSizeSlider = document.getElementById('fontSize');
    const letterSpacingSlider = document.getElementById('letterSpacing');
    const lineHeightSlider = document.getElementById('lineHeight');
    const returnForceSlider = document.getElementById('returnForce');
    const fieldStrengthSlider = document.getElementById('fieldStrength');
    const noiseScaleSlider = document.getElementById('noiseScale');
    const mouseRepelSlider = document.getElementById('mouseRepel');
    const xOffsetSlider = document.getElementById('xOffset');
    const yOffsetSlider = document.getElementById('yOffset');

    // Value displays
    const fontSizeValue = document.getElementById('fontSize-value');
    const letterSpacingValue = document.getElementById('letterSpacing-value');
    const lineHeightValue = document.getElementById('lineHeight-value');
    const particleSpacingValue = document.getElementById('particleSpacing-value');
    const particleSizeValue = document.getElementById('particleSize-value');
    const returnForceValue = document.getElementById('returnForce-value');
    const fieldStrengthValue = document.getElementById('fieldStrength-value');
    const noiseScaleValue = document.getElementById('noiseScale-value');
    const mouseRepelValue = document.getElementById('mouseRepel-value');
    const xOffsetValue = document.getElementById('xOffset-value');
    const yOffsetValue = document.getElementById('yOffset-value');

    // Font color
    const fontColorInput = document.getElementById('font-color');
    
    // Background controls
    const transparentToggle = document.getElementById('transparent-bg');
    const bgColorInput = document.getElementById('bg-color');
    const bgImageInput = document.getElementById('bg-image');
    const clearBgImageBtn = document.getElementById('clear-bg-image');
    const bgFitSelect = document.getElementById('bg-fit');
    const bgColorGroup = document.getElementById('bg-color-group');
    const bgFitGroup = document.getElementById('bg-fit-group');

    // Foreground controls
    const fgImageInput = document.getElementById('fg-image');
    const clearFgImageBtn = document.getElementById('clear-fg-image');
    const fgFitSelect = document.getElementById('fg-fit');
    const fgFitGroup = document.getElementById('fg-fit-group');
    const fgOpacitySlider = document.getElementById('fg-opacity');
    const fgOpacityValue = document.getElementById('fg-opacity-value');
    const fgOpacityGroup = document.getElementById('fg-opacity-group');
    
    // Get settings object from main.js
    const settings = window.liquidTypographySettings;
    
    if (!settings) {
        console.error('Settings object not found');
        return;
    }
    
    // ========== BACKGROUND SYSTEM WIRING ==========
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        const canvas = document.getElementById('chatooly-canvas');
        
        // Transparent background toggle
        if (transparentToggle) {
            transparentToggle.addEventListener('click', (e) => {
                const isPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
                const newState = !isPressed;
                transparentToggle.setAttribute('aria-pressed', newState);
                
                window.Chatooly.backgroundManager.setTransparent(newState);
                
                // Show/hide background color picker
                if (bgColorGroup) {
                    bgColorGroup.style.display = newState ? 'none' : 'block';
                }
            });
        }
        
        // Background color
        if (bgColorInput) {
            bgColorInput.addEventListener('input', (e) => {
                window.Chatooly.backgroundManager.setBackgroundColor(e.target.value);
            });
        }
        
        // Background image upload
        if (bgImageInput) {
            bgImageInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await window.Chatooly.backgroundManager.setBackgroundImage(file);
                    if (clearBgImageBtn) clearBgImageBtn.style.display = 'block';
                    if (bgFitGroup) bgFitGroup.style.display = 'block';
                }
            });
        }
        
        // Clear background image
        if (clearBgImageBtn) {
            clearBgImageBtn.addEventListener('click', () => {
                window.Chatooly.backgroundManager.clearBackgroundImage();
                clearBgImageBtn.style.display = 'none';
                if (bgFitGroup) bgFitGroup.style.display = 'none';
                if (bgImageInput) bgImageInput.value = '';
            });
        }
        
        // Background fit mode
        if (bgFitSelect) {
            bgFitSelect.addEventListener('change', (e) => {
                window.Chatooly.backgroundManager.setFit(e.target.value);
            });
        }
    }

    // ========== FOREGROUND IMAGE SYSTEM ==========
    // Foreground image upload
    if (fgImageInput) {
        fgImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        settings.foregroundImage = img;
                        if (clearFgImageBtn) clearFgImageBtn.style.display = 'block';
                        if (fgFitGroup) fgFitGroup.style.display = 'block';
                        if (fgOpacityGroup) fgOpacityGroup.style.display = 'block';
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Clear foreground image
    if (clearFgImageBtn) {
        clearFgImageBtn.addEventListener('click', () => {
            settings.foregroundImage = null;
            clearFgImageBtn.style.display = 'none';
            if (fgFitGroup) fgFitGroup.style.display = 'none';
            if (fgOpacityGroup) fgOpacityGroup.style.display = 'none';
            if (fgImageInput) fgImageInput.value = '';
        });
    }

    // Foreground fit mode
    if (fgFitSelect) {
        fgFitSelect.addEventListener('change', (e) => {
            settings.foregroundFit = e.target.value;
        });
    }

    // Foreground opacity slider
    if (fgOpacitySlider) {
        fgOpacitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            settings.foregroundOpacity = value / 100; // Convert 0-100 to 0-1
            updateSliderValue(fgOpacitySlider, fgOpacityValue);
        });
        updateSliderValue(fgOpacitySlider, fgOpacityValue);
    }

    // ========== SLIDER UPDATES ==========
    function updateSliderValue(slider, valueDisplay, formatFn = (v) => v) {
        if (valueDisplay) {
            valueDisplay.textContent = formatFn(parseFloat(slider.value));
        }
    }

    // ========== PHYSICS VALUE MAPPING (1-10 to actual values) ==========
    // Maps user-friendly 1-10 scale to actual physics values
    function mapReturnForce(v) {
        // 1 → 0.001, 5 → ~0.014, 10 → 0.2 (exponential)
        return 0.001 * Math.pow(1.7, v - 1);
    }
    function mapFieldStrength(v) {
        // 1 → 0, 5 → ~0.9, 10 → 2 (linear)
        return (v - 1) * 0.22;
    }
    function mapNoise(v) {
        // 1 → 0.0001, 5 → ~0.002, 10 → 0.01 (exponential)
        return 0.0001 * Math.pow(2.15, v - 1);
    }
    function mapMouseRepel(v) {
        // 1 → 0, 5 → ~8.9, 10 → 20 (linear)
        return (v - 1) * 2.22;
    }
    function mapParticleDensity(v) {
        // 1 → 12 (few particles), 4 → 6, 7 → 3 (many particles)
        // Inverted: higher slider = more particles = lower spacing
        // Minimum spacing of 3 to prevent browser freeze
        return Math.max(3, Math.round(12 - (v - 1) * 1.5));
    }
    
    // Font size slider
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            settings.fontSize = value;
            updateSliderValue(fontSizeSlider, fontSizeValue);
            // Re-initialize particles
            if (window.init) {
                window.init();
            } else {
                // Trigger re-init from main.js
                const event = new CustomEvent('liquidTypography:reinit');
                document.dispatchEvent(event);
            }
        });
        updateSliderValue(fontSizeSlider, fontSizeValue);
    }
    
    // Letter spacing slider
    if (letterSpacingSlider) {
        letterSpacingSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            settings.letterSpacing = value;
            updateSliderValue(letterSpacingSlider, letterSpacingValue);
            const event = new CustomEvent('liquidTypography:reinit');
            document.dispatchEvent(event);
        });
        updateSliderValue(letterSpacingSlider, letterSpacingValue);
    }
    
    // Line height slider
    if (lineHeightSlider) {
        lineHeightSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            settings.lineHeight = value;
            updateSliderValue(lineHeightSlider, lineHeightValue, (v) => v.toFixed(1));
            const event = new CustomEvent('liquidTypography:reinit');
            document.dispatchEvent(event);
        });
        updateSliderValue(lineHeightSlider, lineHeightValue, (v) => v.toFixed(1));
    }
    
    // Particle density slider (1-7 scale, mapped to spacing)
    if (particleSpacingSlider) {
        particleSpacingSlider.addEventListener('input', (e) => {
            const sliderValue = parseFloat(e.target.value);
            settings.particleSpacing = mapParticleDensity(sliderValue);
            updateSliderValue(particleSpacingSlider, particleSpacingValue);
            const event = new CustomEvent('liquidTypography:reinit');
            document.dispatchEvent(event);
        });
        // Initialize with mapped value
        settings.particleSpacing = mapParticleDensity(parseFloat(particleSpacingSlider.value));
        updateSliderValue(particleSpacingSlider, particleSpacingValue);
    }
    
    // Particle size slider
    if (particleSizeSlider) {
        particleSizeSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            settings.particleSize = value;
            updateSliderValue(particleSizeSlider, particleSizeValue, (v) => v.toFixed(1));
            // Update existing particles
            if (window.particlesArray) {
                window.particlesArray.forEach(p => {
                    p.size = value;
                });
            }
        });
        updateSliderValue(particleSizeSlider, particleSizeValue, (v) => v.toFixed(1));
    }
    
    // Return force slider (1-10 scale)
    if (returnForceSlider) {
        returnForceSlider.addEventListener('input', (e) => {
            const sliderValue = parseFloat(e.target.value);
            settings.returnForce = mapReturnForce(sliderValue);
            updateSliderValue(returnForceSlider, returnForceValue);
        });
        // Initialize with mapped value
        settings.returnForce = mapReturnForce(parseFloat(returnForceSlider.value));
        updateSliderValue(returnForceSlider, returnForceValue);
    }

    // Field strength slider (1-10 scale)
    if (fieldStrengthSlider) {
        fieldStrengthSlider.addEventListener('input', (e) => {
            const sliderValue = parseFloat(e.target.value);
            settings.fieldStrength = mapFieldStrength(sliderValue);
            updateSliderValue(fieldStrengthSlider, fieldStrengthValue);
        });
        // Initialize with mapped value
        settings.fieldStrength = mapFieldStrength(parseFloat(fieldStrengthSlider.value));
        updateSliderValue(fieldStrengthSlider, fieldStrengthValue);
    }

    // Noise scale slider (1-10 scale)
    if (noiseScaleSlider) {
        noiseScaleSlider.addEventListener('input', (e) => {
            const sliderValue = parseFloat(e.target.value);
            settings.noiseScale = mapNoise(sliderValue);
            updateSliderValue(noiseScaleSlider, noiseScaleValue);
        });
        // Initialize with mapped value
        settings.noiseScale = mapNoise(parseFloat(noiseScaleSlider.value));
        updateSliderValue(noiseScaleSlider, noiseScaleValue);
    }

    // Mouse repel slider (1-10 scale)
    if (mouseRepelSlider) {
        mouseRepelSlider.addEventListener('input', (e) => {
            const sliderValue = parseFloat(e.target.value);
            settings.mouseRepel = mapMouseRepel(sliderValue);
            updateSliderValue(mouseRepelSlider, mouseRepelValue);
        });
        // Initialize with mapped value
        settings.mouseRepel = mapMouseRepel(parseFloat(mouseRepelSlider.value));
        updateSliderValue(mouseRepelSlider, mouseRepelValue);
    }

    // X Offset slider
    if (xOffsetSlider) {
        xOffsetSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            settings.xOffset = value;
            updateSliderValue(xOffsetSlider, xOffsetValue);
            const event = new CustomEvent('liquidTypography:reinit');
            document.dispatchEvent(event);
        });
        updateSliderValue(xOffsetSlider, xOffsetValue);
    }

    // Y Offset slider
    if (yOffsetSlider) {
        yOffsetSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            settings.yOffset = value;
            updateSliderValue(yOffsetSlider, yOffsetValue);
            const event = new CustomEvent('liquidTypography:reinit');
            document.dispatchEvent(event);
        });
        updateSliderValue(yOffsetSlider, yOffsetValue);
    }

    // Font color picker
    if (fontColorInput) {
        fontColorInput.addEventListener('input', (e) => {
            settings.fontColor = e.target.value;
            // Update existing particles
            if (window.particlesArray) {
                window.particlesArray.forEach(p => {
                    p.color = settings.fontColor;
                });
            }
        });
    }
    
    // ========== TEXT INPUT ==========
    if (textInput) {
        let debounceTimer;
        textInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                settings.text = e.target.value;
                const event = new CustomEvent('liquidTypography:reinit');
                document.dispatchEvent(event);
            }, 300);
        });
    }
    
    // ========== FONT SELECTOR ==========
    if (fontSelector) {
        fontSelector.addEventListener('change', (e) => {
            settings.fontFamily = e.target.value;
            const event = new CustomEvent('liquidTypography:reinit');
            document.dispatchEvent(event);
        });
    }
    
    // ========== CUSTOM FONT UPLOAD ==========
    if (localFontInput) {
        localFontInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                const fontDataUrl = event.target.result;
                const fontName = "UploadedFont";

                // Create @font-face rule
                const newStyle = document.createElement('style');
                newStyle.textContent = `@font-face { font-family: '${fontName}'; src: url(${fontDataUrl}); }`;
                document.head.appendChild(newStyle);

                // Add to font selector
                if (fontSelector) {
                    const option = document.createElement('option');
                    option.value = fontName;
                    option.textContent = file.name;
                    fontSelector.appendChild(option);
                    fontSelector.value = fontName;
                    settings.fontFamily = fontName;

                    // Wait for font to actually load before reinitializing
                    try {
                        await document.fonts.load(`bold ${settings.fontSize}px ${fontName}`);
                    } catch (err) {
                        console.warn('Font load warning:', err);
                    }

                    // Trigger reinit after font is loaded
                    const reinitEvent = new CustomEvent('liquidTypography:reinit');
                    document.dispatchEvent(reinitEvent);
                }
            };
            reader.readAsDataURL(file);
        });
    }
    
    // ========== PNG SEQUENCE EXPORT ==========
    if (pngSequenceButton) {
        pngSequenceButton.addEventListener('click', () => {
            if (window.exportPngSequence) {
                window.exportPngSequence();
            } else {
                console.error('Export function not available');
            }
        });
    }
    
    // ========== RE-INIT EVENT LISTENER ==========
    // Listen for re-init events from UI controls
    document.addEventListener('liquidTypography:reinit', () => {
        if (window.init) {
            window.init(() => {
                // Restart animation after re-init
                if (window.animate) {
                    window.animate(0);
                }
            });
        }
    });

    // ========== COLLAPSIBLE SECTION CARDS ==========
    const sectionHeaders = document.querySelectorAll('.chatooly-section-header[role="button"]');
    sectionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            const sectionCard = header.closest('.chatooly-section-card');

            header.setAttribute('aria-expanded', !isExpanded);

            if (isExpanded) {
                sectionCard.classList.add('collapsed');
            } else {
                sectionCard.classList.remove('collapsed');
            }
        });

        // Keyboard support
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                header.click();
            }
        });
    });

    // ========== RESET POSITION BUTTON (combined X & Y) ==========
    const resetPositionBtn = document.getElementById('reset-position');

    if (resetPositionBtn && xOffsetSlider && yOffsetSlider) {
        resetPositionBtn.addEventListener('click', () => {
            // Reset X
            xOffsetSlider.value = 0;
            settings.xOffset = 0;
            updateSliderValue(xOffsetSlider, xOffsetValue);

            // Reset Y
            yOffsetSlider.value = 0;
            settings.yOffset = 0;
            updateSliderValue(yOffsetSlider, yOffsetValue);

            const event = new CustomEvent('liquidTypography:reinit');
            document.dispatchEvent(event);
        });
    }

    // ========== TEXT ALIGNMENT BUTTONS ==========
    const alignmentBtns = document.querySelectorAll('.alignment-btn[data-align]');
    alignmentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all alignment buttons only
            alignmentBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');
            // Update setting
            settings.textAlign = btn.dataset.align;
            // Reinit
            const event = new CustomEvent('liquidTypography:reinit');
            document.dispatchEvent(event);
        });
    });

    // ========== INTERACTION MODE TOGGLE ==========
    const modeBtns = document.querySelectorAll('[data-mode]');
    const autoModeControls = document.getElementById('auto-mode-controls');
    const cursorDot = document.querySelector('.cursor-dot');

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all mode buttons
            modeBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');
            // Update setting
            settings.interactionMode = btn.dataset.mode;

            // Show/hide auto controls
            if (autoModeControls) {
                autoModeControls.style.display = settings.interactionMode === 'auto' ? 'block' : 'none';
            }

            // Show/hide cursor dot based on mode
            if (cursorDot) {
                cursorDot.style.display = settings.interactionMode === 'auto' ? 'none' : 'block';
            }

            // Reset mouse position when switching to mouse mode
            if (settings.interactionMode === 'mouse' && window.mouse) {
                // Mouse position will be updated on next mousemove
            }
        });
    });

    // ========== AUTO PATTERN SELECTOR ==========
    const autoPatternSelect = document.getElementById('autoPattern');
    if (autoPatternSelect) {
        autoPatternSelect.addEventListener('change', (e) => {
            settings.autoPattern = e.target.value;
        });
    }

    // ========== AUTO SPEED SLIDER ==========
    const autoSpeedSlider = document.getElementById('autoSpeed');
    const autoSpeedValue = document.getElementById('autoSpeed-value');
    if (autoSpeedSlider) {
        autoSpeedSlider.addEventListener('input', (e) => {
            settings.autoSpeed = parseFloat(e.target.value);
            updateSliderValue(autoSpeedSlider, autoSpeedValue);
        });
        updateSliderValue(autoSpeedSlider, autoSpeedValue);
    }

    // ========== AUTO SIZE SLIDER ==========
    const autoSizeSlider = document.getElementById('autoSize');
    const autoSizeValue = document.getElementById('autoSize-value');
    if (autoSizeSlider) {
        autoSizeSlider.addEventListener('input', (e) => {
            settings.autoSize = parseFloat(e.target.value);
            updateSliderValue(autoSizeSlider, autoSizeValue);
        });
        updateSliderValue(autoSizeSlider, autoSizeValue);
    }

    // ========== AUTO DEBUG TOGGLE ==========
    const autoDebugToggle = document.getElementById('autoDebug');
    if (autoDebugToggle) {
        autoDebugToggle.addEventListener('click', () => {
            const isPressed = autoDebugToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            autoDebugToggle.setAttribute('aria-pressed', newState);
            settings.autoDebug = newState;
        });
    }
});
