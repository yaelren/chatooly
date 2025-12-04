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
let fontSizeSlider, letterSpacingSlider, lineSpacingSlider, stripsSlider;
let fontColorPicker, stripColorPicker;
let fontSizeValueSpan, letterSpacingValueSpan, lineSpacingValueSpan, stripsValueSpan;
let dropShadowToggle, shadowColorPicker, shadowBlurSlider, shadowOffsetXSlider, shadowOffsetYSlider;
let shadowBlurValueSpan, shadowOffsetXValueSpan, shadowOffsetYValueSpan;
let lerpSlider, noiseSpeedSlider, noiseDetailSlider;
let lerpValueSpan, noiseSpeedValueSpan, noiseDetailValueSpan;
let showImageToggle, imageOpacitySlider, imageScaleSlider;
let imageOpacityValueSpan, imageScaleValueSpan;
let sliceModeSelect;
let circleControlsSection, circleScaleSlider, circleStrokeToggle, circleStrokeControls;
let circleStrokeColorPicker, circleStrokeWeightSlider, circleScaleValue, circleStrokeWeightValue;

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
    
    // Create graphics buffer for text rendering
    page = createGraphics(floor(height * 0.9), floor(height * 0.9));
    
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
    
    // Value displays
    fontSizeValueSpan = select('#font-size-value');
    letterSpacingValueSpan = select('#letter-spacing-value');
    lineSpacingValueSpan = select('#line-spacing-value');
    stripsValueSpan = select('#strips-value');
    
    // Slice mode
    sliceModeSelect = select('#slice-mode');
    
    // Circle controls
    circleControlsSection = select('#circle-controls-section');
    circleScaleSlider = select('#circle-scale-slider');
    circleScaleValue = select('#circle-scale-value');
    circleStrokeToggle = select('#circle-stroke-toggle');
    circleStrokeControls = select('#circle-stroke-controls');
    circleStrokeColorPicker = select('#circle-stroke-color-picker');
    circleStrokeWeightSlider = select('#circle-stroke-weight-slider');
    circleStrokeWeightValue = select('#circle-stroke-weight-value');
    
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
    
    // Slice mode change
    sliceModeSelect.changed(() => {
        const mode = sliceModeSelect.value();
        if (mode === 'circles') {
            circleControlsSection.style('display', 'block');
        } else {
            circleControlsSection.style('display', 'none');
        }
        makeStrips();
    });
    
    // Circle controls
    circleScaleSlider.input(() => {
        circleScaleValue.html(circleScaleSlider.value());
    });
    circleStrokeToggle.changed(() => {
        const isPressed = circleStrokeToggle.elt.getAttribute('aria-pressed') === 'true';
        if (isPressed) {
            circleStrokeControls.style('display', 'block');
        } else {
            circleStrokeControls.style('display', 'none');
        }
    });
    circleStrokeWeightSlider.input(() => {
        circleStrokeWeightValue.html(circleStrokeWeightSlider.value());
    });
    
    // Image controls
    showImageToggle.changed(makeStrips);
    imageOpacitySlider.input(() => {
        imageOpacityValueSpan.html(imageOpacitySlider.value());
        makeStrips();
    });
    imageScaleSlider.input(() => {
        imageScaleValueSpan.html(imageScaleSlider.value());
        makeStrips();
    });
    
    // Shadow controls
    dropShadowToggle.changed(() => {
        const isPressed = dropShadowToggle.elt.getAttribute('aria-pressed') === 'true';
        const controls = select('#drop-shadow-controls');
        if (isPressed) {
            controls.style('display', 'block');
        } else {
            controls.style('display', 'none');
        }
    });
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
    
    // File uploads
    document.getElementById('font-upload-input').addEventListener('change', handleFontFile);
    document.getElementById('image-upload-input').addEventListener('change', handleImageFile);
    
    // Canvas resize event (Chatooly)
    document.addEventListener('chatooly:canvas-resized', (e) => {
        const newWidth = e.detail.canvas.width;
        const newHeight = e.detail.canvas.height;
        resizeCanvas(newWidth, newHeight);
        // Ensure canvas ID is preserved after resize
        if (p5Canvas && p5Canvas.elt) {
            p5Canvas.elt.id = 'chatooly-canvas';
        }
        page = createGraphics(floor(height * 0.9), floor(height * 0.9));
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
        page.tint(255, parseInt(imageOpacitySlider.value()));
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
            x: width / 2,
            y: y + page.height / (2 * num) + (height / 2 - page.height / 2),
            img: strip,
            a: 0
        });
    }
}

// Create strips (circular mode)
function makeStripsCircular() {
    const num = int(stripsSlider.value());
    const maxRadius = page.width / 2;
    const ringWidth = maxRadius / num;
    strips = [];
    for (let i = num - 1; i >= 0; i--) {
        const outerRadius = (i + 1) * ringWidth;
        const innerRadius = i * ringWidth;
        let mask = createGraphics(page.width, page.height);
        mask.noStroke();
        mask.fill(255);
        mask.ellipse(page.width / 2, page.height / 2, outerRadius * 2);
        mask.erase();
        mask.ellipse(page.width / 2, page.height / 2, innerRadius * 2);
        mask.noErase();
        let ringImage = page.get();
        ringImage.mask(mask);
        mask.remove();
        strips.push({
            type: 'circle',
            img: ringImage,
            innerRadius: innerRadius,
            outerRadius: outerRadius,
            a: 0,
            s: 1
        });
    }
}

// Main function to create strips
function makeStrips() {
    if (page.width <= 0 || page.height <= 0) return;
    drawTextOnPage();
    const sliceMode = sliceModeSelect.value();
    if (sliceMode === 'strips') {
        makeStripsLinear();
    } else {
        makeStripsCircular();
    }
}

// Draw strips (linear mode)
function drawStripsLinear(params) {
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

// Draw strips (circular mode)
function drawStripsCircular(params) {
    const { lerpFactor, noiseSpeed, noiseDetail } = params;
    const overallScale = parseFloat(circleScaleSlider.value());
    
    strips.forEach((s, i) => {
        s.a = tilt * (0.5 - noise(frameCount / noiseSpeed + s.outerRadius / noiseDetail)) * 2;
        s.s = 1 + (offset / (width * 2)) * (0.5 - noise(frameCount / (noiseSpeed * 2) + s.outerRadius / (noiseDetail * 2)));
    });
    
    for (let s of strips) {
        push();
        translate(width / 2, height / 2);
        scale(s.s * overallScale);
        rotate(s.a);
        image(s.img, 0, 0);
        
        // Add stroke if enabled
        if (circleStrokeToggle.elt.getAttribute('aria-pressed') === 'true') {
            noFill();
            stroke(circleStrokeColorPicker.value());
            strokeWeight(int(circleStrokeWeightSlider.value()));
            ellipse(0, 0, s.outerRadius * 2);
        }
        
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
    
    // Draw strips based on mode
    const animationParams = {
        lerpFactor: lerpFactor,
        noiseSpeed: int(noiseSpeedSlider.value()),
        noiseDetail: int(noiseDetailSlider.value())
    };
    
    const sliceMode = sliceModeSelect.value();
    if (sliceMode === 'strips') {
        drawStripsLinear(animationParams);
    } else {
        drawStripsCircular(animationParams);
    }
    
    // Reset shadow
    drawingContext.shadowBlur = 0;
    drawingContext.shadowOffsetX = 0;
    drawingContext.shadowOffsetY = 0;
    drawingContext.shadowColor = 'rgba(0,0,0,0)';
}

// Mouse movement for animation
function mouseMoved() {
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
            makeStrips();
        });
    }
}

// Handle font file upload
async function handleFontFile(event) {
    const file = event.target.files[0];
    if (fontStyleElement) fontStyleElement.remove();
    if (fontObjectUrl) URL.revokeObjectURL(fontObjectUrl);
    
    if (file && (file.name.toLowerCase().endsWith('.ttf') || file.name.toLowerCase().endsWith('.otf'))) {
        fontObjectUrl = URL.createObjectURL(file);
        const newFontName = 'custom-user-font';
        fontStyleElement = document.createElement('style');
        fontStyleElement.textContent = `@font-face { font-family: '${newFontName}'; src: url('${fontObjectUrl}'); }`;
        document.head.appendChild(fontStyleElement);
        try {
            await document.fonts.load(`10px "${newFontName}"`);
            currentFont = newFontName;
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
    const scaledPage = createGraphics(floor(scaledHeight * 0.9 / scale), floor(scaledHeight * 0.9 / scale));
    
    // Draw text on scaled page
    scaledPage.imageMode(CENTER);
    scaledPage.background(stripColorPicker.value());
    
    if (userImage && showImageToggle.elt.getAttribute('aria-pressed') === 'true') {
        scaledPage.push();
        scaledPage.tint(255, parseInt(imageOpacitySlider.value()));
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
    const sliceMode = sliceModeSelect.value();
    
    if (sliceMode === 'strips') {
        // Linear strips
        for (let i = 0; i < num; i++) {
            let y = i * scaledPage.height / num;
            const stripHeight = floor(scaledPage.height / num);
            if (stripHeight < 1) break;
            let strip = scaledPage.get(0, y, scaledPage.width, stripHeight);
            
            const stripY = y + scaledPage.height / (2 * num) + (height / 2 - scaledPage.height / 2);
            ctx.save();
            ctx.translate(width / 2, stripY);
            ctx.drawImage(strip.canvas, -scaledPage.width / 2, -stripHeight / 2);
            ctx.restore();
        }
    } else {
        // Circular strips
        const maxRadius = scaledPage.width / 2;
        const ringWidth = maxRadius / num;
        const overallScale = parseFloat(circleScaleSlider.value());
        
        for (let i = num - 1; i >= 0; i--) {
            const outerRadius = (i + 1) * ringWidth;
            const innerRadius = i * ringWidth;
            let mask = createGraphics(scaledPage.width, scaledPage.height);
            mask.noStroke();
            mask.fill(255);
            mask.ellipse(scaledPage.width / 2, scaledPage.height / 2, outerRadius * 2);
            mask.erase();
            mask.ellipse(scaledPage.width / 2, scaledPage.height / 2, innerRadius * 2);
            mask.noErase();
            let ringImage = scaledPage.get();
            ringImage.mask(mask);
            mask.remove();
            
            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.scale(overallScale, overallScale);
            ctx.drawImage(ringImage.canvas, -scaledPage.width / 2, -scaledPage.height / 2);
            
            if (circleStrokeToggle.elt.getAttribute('aria-pressed') === 'true') {
                ctx.strokeStyle = circleStrokeColorPicker.value();
                ctx.lineWidth = int(circleStrokeWeightSlider.value()) * scale;
                ctx.beginPath();
                ctx.arc(0, 0, outerRadius, 0, TWO_PI);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }
    
    ctx.restore();
    scaledPage.remove();
    
    console.log(`High-res export completed at ${scale}x resolution`);
};
