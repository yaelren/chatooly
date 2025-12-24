/*
 * Sliced Typography Tool - Main Logic
 * Converted from original HTML tool to Chatooly format
 * Uses p5.js for creative coding
 */

// Global variables
let page;
let strips = [];
let offset = 0, toff = 0, tilt = 0, ttilt = 0;
let currentFont = 'Arial';
let userImage = null;
let fontStyleElement = null;
let fontObjectUrl = null;
let p5Canvas;

// Control references
let textInput, fontUploader;
let fontSizeSlider, letterSpacingSlider, lineSpacingSlider, stripsSlider, stripSizeSlider;
let fontColorPicker, stripColorPicker;
let fontSizeValueSpan, letterSpacingValueSpan, lineSpacingValueSpan, stripsValueSpan, stripSizeValueSpan;
let dropShadowToggle, shadowColorPicker, shadowBlurSlider, shadowOffsetXSlider, shadowOffsetYSlider;
let shadowBlurValueSpan, shadowOffsetXValueSpan, shadowOffsetYValueSpan;
let lerpSlider, noiseSpeedSlider, noiseDetailSlider;
let lerpValueSpan, noiseSpeedValueSpan, noiseDetailValueSpan;
let showImageToggle, imageOpacitySlider, imageScaleSlider;
let imageOpacityValueSpan, imageScaleValueSpan;

// Motion mode variables
let motionMode = 'mouse'; // 'mouse' or 'automatic'
let motionPattern = 'sine'; // 'sine', 'infinity', 'random'
let motionSpeed = 1.0;
let motionIntensity = 1.0; // 0-1

// Position offset variables
let positionOffsetX = 0; // Pixel offset for X position
let positionOffsetY = 0; // Pixel offset for Y position

// p5.js setup function
function setup() {
    // Clean up any existing canvas in the container (prevent duplicates)
    const container = document.getElementById('p5-container');
    if (container) {
        // Remove any existing canvas elements
        const existingCanvases = container.querySelectorAll('canvas');
        existingCanvases.forEach(canvas => {
            if (canvas.id !== 'chatooly-canvas') {
                canvas.remove();
            }
        });
    }
    
    // Create canvas - p5.js will attach it to the container
    p5Canvas = createCanvas(800, 800);
    p5Canvas.parent('p5-container');
    
    // CRITICAL: Set canvas ID for Chatooly export system
    // The canvas element itself must have id="chatooly-canvas" for export detection
    // p5.js creates the canvas element, we set its ID immediately and with a fallback
    const setCanvasId = () => {
        if (p5Canvas && p5Canvas.elt) {
            // Remove any existing ID conflicts first
            const existingCanvas = document.getElementById('chatooly-canvas');
            if (existingCanvas && existingCanvas !== p5Canvas.elt) {
                existingCanvas.removeAttribute('id');
            }
            // Set the ID on our canvas
            p5Canvas.elt.id = 'chatooly-canvas';
            p5Canvas.elt.setAttribute('id', 'chatooly-canvas');
        }
    };
    
    // Set ID immediately
    setCanvasId();
    
    // Also set it after a brief delay to ensure DOM is ready
    setTimeout(setCanvasId, 0);
    
    // Final check after everything is loaded
    setTimeout(() => {
        setCanvasId();
        // Verify only one canvas with chatooly-canvas ID exists
        const canvases = document.querySelectorAll('#chatooly-canvas');
        if (canvases.length > 1) {
            console.warn('Multiple canvases with chatooly-canvas ID found:', canvases.length);
            // Keep only the p5.js canvas
            canvases.forEach((canvas, index) => {
                if (index > 0 || canvas !== p5Canvas.elt) {
                    canvas.removeAttribute('id');
                }
            });
        }
    }, 200);
    
    // Create graphics buffer for text rendering (size based on strip size slider, default 0.9)
    const initialSize = floor(height * 0.9);
    page = createGraphics(initialSize, initialSize);
    
    // Initialize Chatooly background manager (wait a bit for CDN to load)
    setTimeout(() => {
        if (window.Chatooly && window.Chatooly.backgroundManager && p5Canvas && p5Canvas.elt) {
            Chatooly.backgroundManager.init(p5Canvas.elt);
            setupBackgroundControls();
        }
    }, 100);
    
    // Get control references
    setupControlReferences();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initial render
    makeStrips();
}

// Setup control references
function setupControlReferences() {
    // Text input
    textInput = select('#text-input');
    
    // Color pickers
    fontColorPicker = select('#font-color-picker');
    stripColorPicker = select('#strip-color-picker');
    
    // Sliders
    fontSizeSlider = select('#font-size-slider');
    letterSpacingSlider = select('#letter-spacing-slider');
    lineSpacingSlider = select('#line-spacing-slider');
    stripsSlider = select('#strips-slider');
    stripSizeSlider = select('#strip-size-slider');

    // Value displays
    fontSizeValueSpan = select('#font-size-value');
    letterSpacingValueSpan = select('#letter-spacing-value');
    lineSpacingValueSpan = select('#line-spacing-value');
    stripsValueSpan = select('#strips-value');
    stripSizeValueSpan = select('#strip-size-value');
    
    // Image controls
    showImageToggle = select('#show-image-toggle');
    imageOpacitySlider = select('#image-opacity-slider');
    imageScaleSlider = select('#image-scale-slider');
    imageOpacityValueSpan = select('#image-opacity-value');
    imageScaleValueSpan = select('#image-scale-value');
    
    // Shadow controls
    dropShadowToggle = select('#drop-shadow-toggle');
    shadowColorPicker = select('#shadow-color-picker');
    shadowBlurSlider = select('#shadow-blur-slider');
    shadowOffsetXSlider = select('#shadow-offset-x-slider');
    shadowOffsetYSlider = select('#shadow-offset-y-slider');
    shadowBlurValueSpan = select('#shadow-blur-value');
    shadowOffsetXValueSpan = select('#shadow-offset-x-value');
    shadowOffsetYValueSpan = select('#shadow-offset-y-value');
    
    // Animation controls
    lerpSlider = select('#lerp-slider');
    noiseSpeedSlider = select('#noise-speed-slider');
    noiseDetailSlider = select('#noise-detail-slider');
    lerpValueSpan = select('#lerp-value');
    noiseSpeedValueSpan = select('#noise-speed-value');
    noiseDetailValueSpan = select('#noise-detail-value');
}

// Setup event listeners
function setupEventListeners() {
    // Text input
    textInput.input(makeStrips);
    
    // Color pickers
    fontColorPicker.input(makeStrips);
    stripColorPicker.input(makeStrips);
    
    // Sliders with value updates
    fontSizeSlider.input(() => {
        fontSizeValueSpan.html(fontSizeSlider.value());
        makeStrips();
    });
    letterSpacingSlider.input(() => {
        letterSpacingValueSpan.html(letterSpacingSlider.value());
        makeStrips();
    });
    lineSpacingSlider.input(() => {
        lineSpacingValueSpan.html(lineSpacingSlider.value());
        makeStrips();
    });
    stripsSlider.input(() => {
        stripsValueSpan.html(stripsSlider.value());
        makeStrips();
    });
    stripSizeSlider.input(() => {
        stripSizeValueSpan.html(stripSizeSlider.value());
        // Recreate page buffer with new size
        const newSize = floor(height * parseFloat(stripSizeSlider.value()));
        page = createGraphics(newSize, newSize);
        makeStrips();
    });

    // Image controls
    showImageToggle.changed(makeStrips);
    imageOpacitySlider.input(() => {
        imageOpacityValueSpan.html(imageOpacitySlider.value() + '%');
        makeStrips();
    });
    imageScaleSlider.input(() => {
        imageScaleValueSpan.html(imageScaleSlider.value());
        makeStrips();
    });
    
    // Shadow controls
    // Note: Drop shadow toggle visibility is handled in ui.js
    shadowBlurSlider.input(() => {
        shadowBlurValueSpan.html(shadowBlurSlider.value());
    });
    shadowOffsetXSlider.input(() => {
        shadowOffsetXValueSpan.html(shadowOffsetXSlider.value());
    });
    shadowOffsetYSlider.input(() => {
        shadowOffsetYValueSpan.html(shadowOffsetYSlider.value());
    });
    
    // Animation controls
    lerpSlider.input(() => {
        lerpValueSpan.html(lerpSlider.value());
    });
    noiseSpeedSlider.input(() => {
        noiseSpeedValueSpan.html(noiseSpeedSlider.value());
    });
    noiseDetailSlider.input(() => {
        noiseDetailValueSpan.html(noiseDetailSlider.value());
    });

    // Motion mode toggle
    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            motionMode = btn.dataset.mode;

            const settings = document.getElementById('auto-motion-settings');
            if (settings) {
                settings.style.display = motionMode === 'automatic' ? 'block' : 'none';
            }
        });
    });

    // Motion pattern dropdown
    const motionPatternSelect = document.getElementById('motion-pattern');
    if (motionPatternSelect) {
        motionPatternSelect.addEventListener('change', (e) => {
            motionPattern = e.target.value;
        });
    }

    // Motion speed slider
    const motionSpeedSlider = document.getElementById('motion-speed');
    const motionSpeedValue = document.getElementById('motion-speed-value');
    if (motionSpeedSlider) {
        motionSpeedSlider.addEventListener('input', (e) => {
            motionSpeed = parseFloat(e.target.value);
            if (motionSpeedValue) {
                motionSpeedValue.textContent = motionSpeed.toFixed(1);
            }
        });
    }

    // Motion intensity slider
    const motionIntensitySlider = document.getElementById('motion-intensity');
    const motionIntensityValue = document.getElementById('motion-intensity-value');
    if (motionIntensitySlider) {
        motionIntensitySlider.addEventListener('input', (e) => {
            motionIntensity = parseInt(e.target.value) / 100;
            if (motionIntensityValue) {
                motionIntensityValue.textContent = e.target.value + '%';
            }
        });
    }

    // Position X slider
    const positionXSlider = document.getElementById('position-x-slider');
    const positionXValue = document.getElementById('position-x-value');
    if (positionXSlider) {
        positionXSlider.addEventListener('input', (e) => {
            positionOffsetX = parseInt(e.target.value);
            if (positionXValue) {
                positionXValue.textContent = positionOffsetX;
            }
            makeStrips();
        });
    }

    // Position Y slider
    const positionYSlider = document.getElementById('position-y-slider');
    const positionYValue = document.getElementById('position-y-value');
    if (positionYSlider) {
        positionYSlider.addEventListener('input', (e) => {
            positionOffsetY = parseInt(e.target.value);
            if (positionYValue) {
                positionYValue.textContent = positionOffsetY;
            }
            makeStrips();
        });
    }

    // File uploads
    document.getElementById('font-upload-input').addEventListener('change', handleFontFile);
    document.getElementById('image-upload-input').addEventListener('change', handleImageFile);

    // Clear buttons
    const clearOverlayImageBtn = document.getElementById('clear-overlay-image');
    if (clearOverlayImageBtn) {
        clearOverlayImageBtn.addEventListener('click', clearOverlayImage);
    }

    const clearCustomFontBtn = document.getElementById('clear-custom-font');
    if (clearCustomFontBtn) {
        clearCustomFontBtn.addEventListener('click', clearCustomFont);
    }
    
    // Canvas resize event (Chatooly)
    document.addEventListener('chatooly:canvas-resized', (e) => {
        const newWidth = e.detail.canvas.width;
        const newHeight = e.detail.canvas.height;
        resizeCanvas(newWidth, newHeight);
        // Ensure canvas ID is preserved after resize
        if (p5Canvas && p5Canvas.elt) {
            p5Canvas.elt.id = 'chatooly-canvas';
        }
        const stripSize = stripSizeSlider ? parseFloat(stripSizeSlider.value()) : 0.9;
        page = createGraphics(floor(height * stripSize), floor(height * stripSize));
        makeStrips();
    });
}

// Setup background controls
function setupBackgroundControls() {
    const transparentToggle = document.getElementById('transparent-bg');
    const bgColor = document.getElementById('bg-color');
    const bgImage = document.getElementById('bg-image');
    const clearBgImage = document.getElementById('clear-bg-image');
    const bgFit = document.getElementById('bg-fit');
    
    if (transparentToggle) {
        transparentToggle.addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            Chatooly.backgroundManager.setTransparent(isPressed);
        });
    }
    
    if (bgColor) {
        bgColor.addEventListener('input', (e) => {
            Chatooly.backgroundManager.setBackgroundColor(e.target.value);
        });
    }
    
    if (bgImage) {
        bgImage.addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                await Chatooly.backgroundManager.setBackgroundImage(e.target.files[0]);
                clearBgImage.style.display = 'block';
                document.getElementById('bg-fit-group').style.display = 'block';
            }
        });
    }
    
    if (clearBgImage) {
        clearBgImage.addEventListener('click', () => {
            Chatooly.backgroundManager.clearBackgroundImage();
            clearBgImage.style.display = 'none';
            document.getElementById('bg-fit-group').style.display = 'none';
            bgImage.value = '';
        });
    }
    
    if (bgFit) {
        bgFit.addEventListener('change', (e) => {
            Chatooly.backgroundManager.setFit(e.target.value);
        });
    }
}

// Draw text on page buffer
function drawTextOnPage() {
    page.imageMode(CENTER);
    page.background(stripColorPicker.value());
    
    // Draw user image if available
    if (userImage && showImageToggle.elt.getAttribute('aria-pressed') === 'true') {
        page.push();
        page.tint(255, Math.round(parseInt(imageOpacitySlider.value()) * 2.55));
        const scale = parseFloat(imageScaleSlider.value());
        let imgWidth = userImage.width, imgHeight = userImage.height;
        const pageRatio = page.width / page.height, imgRatio = imgWidth / imgHeight;
        if (imgRatio > pageRatio) {
            imgWidth = page.width;
            imgHeight = page.width / imgRatio;
        } else {
            imgHeight = page.height;
            imgWidth = page.height * imgRatio;
        }
        page.image(userImage, page.width / 2, page.height / 2, imgWidth * scale, imgHeight * scale);
        page.pop();
    }
    
    // Draw text
    const lines = textInput.value().split('\n');
    const numLines = lines.length || 1;
    const ctx = page.drawingContext;
    const fontSize = int(fontSizeSlider.value());
    const fontFamily = currentFont;
    ctx.font = `${fontSize}px "${fontFamily}"`;
    ctx.fillStyle = fontColorPicker.value();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = `${letterSpacingSlider.value()}px`;
    ctx.direction = 'rtl';
    const lineHeight = parseFloat(lineSpacingSlider.value());
    for (let i = 0; i < numLines; i++) {
        const yPos = (page.height / 2) + (i - (numLines - 1) / 2) * fontSize * lineHeight;
        ctx.fillText(lines[i], page.width / 2, yPos);
    }
}

// Create strips (linear mode)
function makeStripsLinear() {
    const num = int(stripsSlider.value());
    rectMode(CENTER);
    strips = [];
    for (let i = 0; i < num; i++) {
        let y = i * page.height / num;
        const stripHeight = floor(page.height / num);
        if (stripHeight < 1) break;
        let strip = page.get(0, y, page.width, stripHeight);
        strips.push({
            type: 'strip',
            x: width / 2 + positionOffsetX,
            y: y + page.height / (2 * num) + (height / 2 - page.height / 2) + positionOffsetY,
            img: strip,
            a: 0
        });
    }
}

// Main function to create strips
function makeStrips() {
    if (page.width <= 0 || page.height <= 0) return;
    drawTextOnPage();
    makeStripsLinear();
}

// Draw strips
function drawStrips(params) {
    const { lerpFactor, noiseSpeed, noiseDetail } = params;
    for (let s of strips) {
        s.a = tilt * (0.5 - noise(frameCount / noiseSpeed + s.y / noiseDetail));
    }
    for (let s of strips) {
        push();
        translate(s.x + offset * (0.5 - noise(frameCount / (noiseSpeed * 3) + s.y / (noiseDetail / 6))), s.y);
        rotate(s.a);
        image(s.img, 0, 0);
        pop();
    }
}

// p5.js draw function
function draw() {
    // Draw background using Chatooly background manager
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        const ctx = p5Canvas.drawingContext;
        Chatooly.backgroundManager.drawToCanvas(ctx, width, height);
    } else {
        background(255);
    }

    // Update motion based on mode
    if (motionMode === 'automatic') {
        updateAutoMotion();
    }

    // Animation interpolation
    const lerpFactor = parseFloat(lerpSlider.value());
    offset = lerp(offset, toff, lerpFactor);
    tilt = lerp(tilt, ttilt, lerpFactor * 1.5);
    imageMode(CENTER);
    
    // Apply drop shadow if enabled
    if (dropShadowToggle.elt.getAttribute('aria-pressed') === 'true') {
        drawingContext.shadowColor = shadowColorPicker.value();
        drawingContext.shadowBlur = int(shadowBlurSlider.value());
        drawingContext.shadowOffsetX = int(shadowOffsetXSlider.value());
        drawingContext.shadowOffsetY = int(shadowOffsetYSlider.value());
    }
    
    // Draw strips
    const animationParams = {
        lerpFactor: lerpFactor,
        noiseSpeed: int(noiseSpeedSlider.value()),
        noiseDetail: int(noiseDetailSlider.value())
    };

    drawStrips(animationParams);
    
    // Reset shadow
    drawingContext.shadowBlur = 0;
    drawingContext.shadowOffsetX = 0;
    drawingContext.shadowOffsetY = 0;
    drawingContext.shadowColor = 'rgba(0,0,0,0)';
}

// Automatic motion patterns
function updateAutoMotion() {
    if (motionMode !== 'automatic') return;

    const t = frameCount * 0.02 * motionSpeed;
    const maxOffset = (height / 2) * motionIntensity;
    const maxTilt = (PI / 4) * motionIntensity;

    switch (motionPattern) {
        case 'sine':
            // Smooth sine wave oscillation
            toff = sin(t) * maxOffset;
            ttilt = cos(t * 0.7) * maxTilt;
            break;

        case 'infinity':
            // Figure-8 / lemniscate pattern
            const scale = 1 / (1 + sin(t) * sin(t) * 0.5);
            toff = sin(t) * maxOffset * scale;
            ttilt = sin(t * 2) * maxTilt * 0.5;
            break;

        case 'random':
            // Smooth noise-based random drift
            toff = map(noise(t * 0.5), 0, 1, -maxOffset, maxOffset);
            ttilt = map(noise(t * 0.5 + 1000), 0, 1, 0, maxTilt);
            break;
    }
}

// Mouse movement for animation
function mouseMoved() {
    if (motionMode !== 'mouse') return; // Skip if in automatic mode

    toff = map(mouseX, width / 8, 7 * width / 8, -height / 2, height / 2, true);
    if (abs(toff) < height / 10) toff = 0;
    ttilt = map(mouseY, height / 8, 7 * height / 8, 0, PI / 4, true);
}

// Handle image file upload
function handleImageFile(event) {
    const file = event.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        loadImage(url, img => {
            userImage = img;
            URL.revokeObjectURL(url);

            // Show clear button, filename, and image controls
            const clearBtn = document.getElementById('clear-overlay-image');
            const fileNameEl = document.getElementById('overlay-image-name');
            const imageControls = document.getElementById('image-controls');
            if (clearBtn) clearBtn.style.display = 'block';
            if (fileNameEl) {
                fileNameEl.textContent = file.name;
                fileNameEl.style.display = 'block';
            }
            if (imageControls) imageControls.style.display = 'block';

            makeStrips();
        });
    }
}

// Clear overlay image
function clearOverlayImage() {
    userImage = null;
    const input = document.getElementById('image-upload-input');
    const clearBtn = document.getElementById('clear-overlay-image');
    const fileNameEl = document.getElementById('overlay-image-name');
    const imageControls = document.getElementById('image-controls');

    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (fileNameEl) {
        fileNameEl.textContent = '';
        fileNameEl.style.display = 'none';
    }
    if (imageControls) imageControls.style.display = 'none';

    makeStrips();
}

// Handle font file upload
async function handleFontFile(event) {
    const file = event.target.files[0];
    if (fontStyleElement) fontStyleElement.remove();
    if (fontObjectUrl) URL.revokeObjectURL(fontObjectUrl);

    const clearBtn = document.getElementById('clear-custom-font');
    const fileNameEl = document.getElementById('custom-font-name');

    if (file && (file.name.toLowerCase().endsWith('.ttf') || file.name.toLowerCase().endsWith('.otf'))) {
        fontObjectUrl = URL.createObjectURL(file);
        const newFontName = 'custom-user-font';
        fontStyleElement = document.createElement('style');
        fontStyleElement.textContent = `@font-face { font-family: '${newFontName}'; src: url('${fontObjectUrl}'); }`;
        document.head.appendChild(fontStyleElement);
        try {
            await document.fonts.load(`10px "${newFontName}"`);
            currentFont = newFontName;

            // Show clear button and filename
            if (clearBtn) clearBtn.style.display = 'block';
            if (fileNameEl) {
                fileNameEl.textContent = file.name;
                fileNameEl.style.display = 'block';
            }
        } catch (error) {
            console.error("Error loading font:", error);
            alert("Error loading font.");
            currentFont = 'Arial';
        }
    } else {
        if (file) alert("Unsupported file type. Please select a .ttf or .otf file.");
        currentFont = 'Arial';
    }
    makeStrips();
}

// Clear custom font
function clearCustomFont() {
    if (fontStyleElement) fontStyleElement.remove();
    if (fontObjectUrl) URL.revokeObjectURL(fontObjectUrl);
    fontStyleElement = null;
    fontObjectUrl = null;
    currentFont = 'Arial';

    const input = document.getElementById('font-upload-input');
    const clearBtn = document.getElementById('clear-custom-font');
    const fileNameEl = document.getElementById('custom-font-name');

    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (fileNameEl) {
        fileNameEl.textContent = '';
        fileNameEl.style.display = 'none';
    }

    makeStrips();
}

// High-resolution export function for Chatooly
window.renderHighResolution = function(targetCanvas, scale) {
    if (!p5Canvas || !page || strips.length === 0) {
        console.warn('Tool not ready for high-res export');
        return;
    }
    
    const ctx = targetCanvas.getContext('2d');
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    targetCanvas.width = scaledWidth;
    targetCanvas.height = scaledHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, scaledWidth, scaledHeight);
    
    // Draw background
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.drawToCanvas(ctx, scaledWidth, scaledHeight);
    } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, scaledWidth, scaledHeight);
    }
    
    // Scale context
    ctx.save();
    ctx.scale(scale, scale);
    
    // Re-create strips at high resolution
    const originalPage = page;
    const stripSize = stripSizeSlider ? parseFloat(stripSizeSlider.value()) : 0.9;
    const scaledPage = createGraphics(floor(scaledHeight * stripSize / scale), floor(scaledHeight * stripSize / scale));
    
    // Draw text on scaled page
    scaledPage.imageMode(CENTER);
    scaledPage.background(stripColorPicker.value());
    
    if (userImage && showImageToggle.elt.getAttribute('aria-pressed') === 'true') {
        scaledPage.push();
        scaledPage.tint(255, Math.round(parseInt(imageOpacitySlider.value()) * 2.55));
        const imgScale = parseFloat(imageScaleSlider.value());
        let imgWidth = userImage.width, imgHeight = userImage.height;
        const pageRatio = scaledPage.width / scaledPage.height, imgRatio = imgWidth / imgHeight;
        if (imgRatio > pageRatio) {
            imgWidth = scaledPage.width;
            imgHeight = scaledPage.width / imgRatio;
        } else {
            imgHeight = scaledPage.height;
            imgWidth = scaledPage.height * imgRatio;
        }
        scaledPage.image(userImage, scaledPage.width / 2, scaledPage.height / 2, imgWidth * imgScale, imgHeight * imgScale);
        scaledPage.pop();
    }
    
    // Draw text at high resolution
    const lines = textInput.value().split('\n');
    const numLines = lines.length || 1;
    const pageCtx = scaledPage.drawingContext;
    const fontSize = int(fontSizeSlider.value());
    pageCtx.font = `${fontSize}px "${currentFont}"`;
    pageCtx.fillStyle = fontColorPicker.value();
    pageCtx.textAlign = 'center';
    pageCtx.textBaseline = 'middle';
    pageCtx.letterSpacing = `${letterSpacingSlider.value()}px`;
    pageCtx.direction = 'rtl';
    const lineHeight = parseFloat(lineSpacingSlider.value());
    for (let i = 0; i < numLines; i++) {
        const yPos = (scaledPage.height / 2) + (i - (numLines - 1) / 2) * fontSize * lineHeight;
        pageCtx.fillText(lines[i], scaledPage.width / 2, yPos);
    }
    
    // Create strips at high resolution
    const num = int(stripsSlider.value());

    for (let i = 0; i < num; i++) {
        let y = i * scaledPage.height / num;
        const stripHeight = floor(scaledPage.height / num);
        if (stripHeight < 1) break;
        let strip = scaledPage.get(0, y, scaledPage.width, stripHeight);

        const stripY = y + scaledPage.height / (2 * num) + (height / 2 - scaledPage.height / 2) + positionOffsetY;
        ctx.save();
        ctx.translate(width / 2 + positionOffsetX, stripY);
        ctx.drawImage(strip.canvas, -scaledPage.width / 2, -stripHeight / 2);
        ctx.restore();
    }
    
    ctx.restore();
    scaledPage.remove();
    
    console.log(`High-res export completed at ${scale}x resolution`);
};
