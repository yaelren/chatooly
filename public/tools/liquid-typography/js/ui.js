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
    
    // Background controls
    const transparentToggle = document.getElementById('transparent-bg');
    const bgColorInput = document.getElementById('bg-color');
    const bgImageInput = document.getElementById('bg-image');
    const clearBgImageBtn = document.getElementById('clear-bg-image');
    const bgFitSelect = document.getElementById('bg-fit');
    const bgColorGroup = document.getElementById('bg-color-group');
    const bgFitGroup = document.getElementById('bg-fit-group');
    
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
    
    // ========== SLIDER UPDATES ==========
    function updateSliderValue(slider, valueDisplay, formatFn = (v) => v) {
        if (valueDisplay) {
            valueDisplay.textContent = formatFn(parseFloat(slider.value));
        }
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
    
    // Particle spacing slider
    if (particleSpacingSlider) {
        particleSpacingSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            settings.particleSpacing = value;
            updateSliderValue(particleSpacingSlider, particleSpacingValue);
            const event = new CustomEvent('liquidTypography:reinit');
            document.dispatchEvent(event);
        });
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
    
    // Return force slider
    if (returnForceSlider) {
        returnForceSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            settings.returnForce = value;
            updateSliderValue(returnForceSlider, returnForceValue, (v) => v.toFixed(3));
        });
        updateSliderValue(returnForceSlider, returnForceValue, (v) => v.toFixed(3));
    }
    
    // Field strength slider
    if (fieldStrengthSlider) {
        fieldStrengthSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            settings.fieldStrength = value;
            updateSliderValue(fieldStrengthSlider, fieldStrengthValue, (v) => v.toFixed(2));
        });
        updateSliderValue(fieldStrengthSlider, fieldStrengthValue, (v) => v.toFixed(2));
    }
    
    // Noise scale slider
    if (noiseScaleSlider) {
        noiseScaleSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            settings.noiseScale = value;
            updateSliderValue(noiseScaleSlider, noiseScaleValue, (v) => v.toFixed(4));
        });
        updateSliderValue(noiseScaleSlider, noiseScaleValue, (v) => v.toFixed(4));
    }
    
    // Mouse repel slider
    if (mouseRepelSlider) {
        mouseRepelSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            settings.mouseRepel = value;
            updateSliderValue(mouseRepelSlider, mouseRepelValue, (v) => v.toFixed(1));
        });
        updateSliderValue(mouseRepelSlider, mouseRepelValue, (v) => v.toFixed(1));
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
            reader.onload = (event) => {
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
                    
                    const event = new CustomEvent('liquidTypography:reinit');
                    document.dispatchEvent(event);
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
});
