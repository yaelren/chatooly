/*
 * ASCII Shader Studio - Main Logic
 * WebGL ASCII art generator with intelligent text integration
 * Author: Claude Code
 */

console.log('ASCII Shader Studio script loaded!');

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 1200;
canvas.height = 900;

// Make ctx globally available
window.ctx = ctx;

// ========== ASCII CHARACTER SETS ==========
const ASCII_SETS = {
    classic: ' .,:;i1tfLCG08@',
    dense: ' ░▒▓█▉▊▋▌▍▎▏',
    minimal: ' .-+*#',
    symbols: ' ○◐◑●◔◕⬤',
    braille: ' ⠀⠂⠄⠆⠇⠏⠟⠿',
    tech: ' 01Ⅰ|░▒▓█',
    amiga: ' .·▪▫▬▭■□▣▤▦▧▨▩',
    atascii: ' ♠♣♥♦♪☺☻○◘◙♂♀♫',
    ansi: ' ░▒▓█▄▀▌▐▖▗▘▝▚▞',
    custom: ' .,:;!/>+*%@#'  // Default custom
};

// ========== ASCII SHADER STUDIO CLASS ==========
class ASCIIShaderStudio {
    constructor() {
        this.animationId = null;
        this.time = 0;
        this.sourceImage = null;
        this.sourceCanvas = null;
        this.sourceCtx = null;
        this.characterTextures = new Map();

        // Current settings
        this.settings = {
            // Image settings
            imageFit: 'cover',
            autoContrast: true,
            brightness: 0,
            removeBackground: false,
            backgroundThreshold: 10,
            edgeSmoothing: 2,

            // ASCII aesthetics
            characterSet: 'classic',
            customChars: ' .,:;!/>+*%@#',
            charDensity: 50,
            charSize: 8,
            fontFamily: 'monospace',

            // Big type mode
            bigTypeEnabled: false,
            bigTypeText: 'ASCII',
            textPosition: 'center',
            textSize: 64,
            flowAlgorithm: 'wrap',
            flowStrength: 75,

            // Visual effects
            colorMode: 'monochrome',
            monoColor: '#00ff88',
            gradientDark: '#000066',
            gradientLight: '#00ffaa',
            contrast: 50,
            animateCharacters: false,
            animationSpeed: 1.0,
            ditherEffect: false
        };

        // Big type positioning data
        this.textMask = null;
        this.textBounds = { x: 0, y: 0, width: 0, height: 0 };

        // Canvas zoom and pan state
        this.canvasZoom = 1;
        this.canvasOffsetX = 0;
        this.canvasOffsetY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Background removal state
        this.removeBackground = false;
        this.backgroundThreshold = 10;
        this.edgeSmoothing = 2;

        this.init();
    }

    init() {
        // Initialize background manager
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            Chatooly.backgroundManager.init(canvas);
            this.setupBackgroundControls();
        }

        this.setupEventListeners();
        this.setupCanvasResizeHandling();
        this.setupCanvasZoomAndPan();
        this.createSourceCanvas();
        this.preloadCharacterTextures();
        this.startRenderLoop();
    }

    // ========== BACKGROUND SYSTEM INTEGRATION (MANDATORY) ==========
    setupBackgroundControls() {
        // Transparent background toggle
        const transparentToggle = document.getElementById('transparent-bg');
        transparentToggle.addEventListener('click', () => {
            const isPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
            Chatooly.backgroundManager.setTransparent(isPressed);
            const bgColorGroup = document.getElementById('bg-color-group');
            bgColorGroup.style.display = isPressed ? 'none' : 'block';
            this.render();
        });

        // Background color picker
        document.getElementById('bg-color').addEventListener('input', (e) => {
            Chatooly.backgroundManager.setBackgroundColor(e.target.value);
            this.render();
        });

        // Background image upload
        document.getElementById('bg-image').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                await Chatooly.backgroundManager.setBackgroundImage(file);
                document.getElementById('clear-bg-image').style.display = 'block';
                document.getElementById('bg-fit-group').style.display = 'block';
                this.render();
            } catch (error) {
                alert('Failed to load background image: ' + error.message);
            }
        });

        // Clear background image
        document.getElementById('clear-bg-image').addEventListener('click', () => {
            Chatooly.backgroundManager.clearBackgroundImage();
            document.getElementById('clear-bg-image').style.display = 'none';
            document.getElementById('bg-fit-group').style.display = 'none';
            document.getElementById('bg-image').value = '';
            this.render();
        });

        // Background fit mode
        document.getElementById('bg-fit').addEventListener('change', (e) => {
            Chatooly.backgroundManager.setFit(e.target.value);
            this.render();
        });
    }

    // ========== CANVAS RESIZE HANDLING (REQUIRED) ==========
    setupCanvasResizeHandling() {
        this.previousCanvasSize = { width: canvas.width, height: canvas.height };
        document.addEventListener('chatooly:canvas-resized', (e) => this.onCanvasResized(e));
    }

    onCanvasResized(e) {
        const oldWidth = this.previousCanvasSize.width;
        const oldHeight = this.previousCanvasSize.height;
        const newWidth = e.detail.canvas.width;
        const newHeight = e.detail.canvas.height;

        if (oldWidth === 0 || oldHeight === 0) {
            this.previousCanvasSize = { width: newWidth, height: newHeight };
            this.render();
            return;
        }

        this.previousCanvasSize = { width: newWidth, height: newHeight };
        this.createSourceCanvas(); // Recreate source canvas for new dimensions
        this.render();
    }

    // ========== CANVAS ZOOM AND PAN FUNCTIONALITY ==========
    setupCanvasZoomAndPan() {
        // Mouse wheel for zooming
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
            const newZoom = Math.max(0.1, Math.min(5, this.canvasZoom * zoomFactor));

            // Zoom towards mouse position
            const zoomChange = newZoom / this.canvasZoom;
            this.canvasOffsetX = mouseX - (mouseX - this.canvasOffsetX) * zoomChange;
            this.canvasOffsetY = mouseY - (mouseY - this.canvasOffsetY) * zoomChange;

            this.canvasZoom = newZoom;
            this.updateCanvasTransform();
        });

        // Mouse down for panning
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left mouse button
                this.isDragging = true;
                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;
                canvas.style.cursor = 'grabbing';
            }
        });

        // Mouse move for panning
        canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.lastMouseX;
                const deltaY = e.clientY - this.lastMouseY;

                this.canvasOffsetX += deltaX;
                this.canvasOffsetY += deltaY;

                this.lastMouseX = e.clientX;
                this.lastMouseY = e.clientY;

                this.updateCanvasTransform();
            }
        });

        // Mouse up to stop panning
        document.addEventListener('mouseup', (e) => {
            if (this.isDragging) {
                this.isDragging = false;
                canvas.style.cursor = 'grab';
            }
        });

        // Double click to reset zoom and pan
        canvas.addEventListener('dblclick', (e) => {
            this.resetCanvasTransform();
        });

        // Set initial cursor
        canvas.style.cursor = 'grab';

        // Touch events for mobile support
        let lastTouchDistance = 0;
        let touchStartX = 0;
        let touchStartY = 0;

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();

            if (e.touches.length === 1) {
                // Single touch for panning
                this.isDragging = true;
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                // Two finger pinch for zooming
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                lastTouchDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();

            if (e.touches.length === 1 && this.isDragging) {
                // Single touch panning
                const deltaX = e.touches[0].clientX - touchStartX;
                const deltaY = e.touches[0].clientY - touchStartY;

                this.canvasOffsetX += deltaX;
                this.canvasOffsetY += deltaY;

                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;

                this.updateCanvasTransform();
            } else if (e.touches.length === 2) {
                // Two finger pinch zooming
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const currentDistance = Math.sqrt(
                    Math.pow(touch2.clientX - touch1.clientX, 2) +
                    Math.pow(touch2.clientY - touch1.clientY, 2)
                );

                if (lastTouchDistance > 0) {
                    const zoomFactor = currentDistance / lastTouchDistance;
                    const newZoom = Math.max(0.1, Math.min(5, this.canvasZoom * zoomFactor));

                    // Get center point between fingers
                    const centerX = (touch1.clientX + touch2.clientX) / 2;
                    const centerY = (touch1.clientY + touch2.clientY) / 2;
                    const rect = canvas.getBoundingClientRect();
                    const localCenterX = centerX - rect.left;
                    const localCenterY = centerY - rect.top;

                    // Zoom towards center point
                    const zoomChange = newZoom / this.canvasZoom;
                    this.canvasOffsetX = localCenterX - (localCenterX - this.canvasOffsetX) * zoomChange;
                    this.canvasOffsetY = localCenterY - (localCenterY - this.canvasOffsetY) * zoomChange;

                    this.canvasZoom = newZoom;
                    this.updateCanvasTransform();
                }

                lastTouchDistance = currentDistance;
            }
        });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.isDragging = false;
            lastTouchDistance = 0;
        });
    }

    updateCanvasTransform() {
        canvas.style.transform = `translate(${this.canvasOffsetX}px, ${this.canvasOffsetY}px) scale(${this.canvasZoom})`;
        canvas.style.transformOrigin = '0 0';
    }

    resetCanvasTransform() {
        this.canvasZoom = 1;
        this.canvasOffsetX = 0;
        this.canvasOffsetY = 0;
        this.updateCanvasTransform();

        // Show feedback
        if (window.ASCIIUI) {
            window.ASCIIUI.showUploadFeedback('Canvas zoom reset', 'info');
        }
    }

    // ========== EVENT LISTENERS ==========
    setupEventListeners() {
        // Image input
        document.getElementById('source-image').addEventListener('change', (e) => {
            this.loadSourceImage(e.target.files[0]);
        });

        // Image settings
        this.setupControl('image-fit', 'imageFit', '', (val) => val);
        this.setupToggle('auto-contrast', 'autoContrast');
        this.setupControl('brightness', 'brightness', '%');

        // Background removal settings
        this.setupToggle('remove-background', 'removeBackground', () => {
            this.updateBackgroundRemovalVisibility();
            this.processSourceImage();
            this.render();
        });
        this.setupControl('background-threshold', 'backgroundThreshold');
        this.setupControl('edge-smoothing', 'edgeSmoothing');

        // ASCII aesthetics
        document.getElementById('character-set').addEventListener('change', (e) => {
            this.settings.characterSet = e.target.value;
            this.updateCustomCharactersVisibility();
            this.preloadCharacterTextures();
            this.render();
        });

        document.getElementById('custom-chars').addEventListener('input', (e) => {
            this.settings.customChars = e.target.value;
            if (this.settings.characterSet === 'custom') {
                this.preloadCharacterTextures();
                this.render();
            }
        });

        this.setupControl('char-density', 'charDensity');
        this.setupControl('char-size', 'charSize', 'px');

        document.getElementById('font-family').addEventListener('change', (e) => {
            this.settings.fontFamily = e.target.value;
            this.preloadCharacterTextures();
            this.render();
        });

        // Big type mode
        this.setupToggle('big-type-enabled', 'bigTypeEnabled', () => {
            this.updateBigTypeVisibility();
            this.generateTextMask();
            this.render();
        });

        document.getElementById('big-type-text').addEventListener('input', (e) => {
            this.settings.bigTypeText = e.target.value;
            this.generateTextMask();
            this.render();
        });

        this.setupControl('text-position', 'textPosition', '', (val) => val);
        this.setupControl('text-size', 'textSize', 'px');
        this.setupControl('flow-algorithm', 'flowAlgorithm', '', (val) => val);
        this.setupControl('flow-strength', 'flowStrength', '%');

        // Visual effects
        document.getElementById('color-mode').addEventListener('change', (e) => {
            this.settings.colorMode = e.target.value;
            this.updateColorModeVisibility();
            this.render();
        });

        this.setupControl('mono-color', 'monoColor');
        this.setupControl('gradient-dark', 'gradientDark');
        this.setupControl('gradient-light', 'gradientLight');
        this.setupControl('contrast', 'contrast', '%');

        this.setupToggle('animate-characters', 'animateCharacters', () => {
            this.updateAnimationVisibility();
        });

        this.setupControl('animation-speed', 'animationSpeed', 'x', parseFloat);
        this.setupToggle('dither-effect', 'ditherEffect');

        // Style presets
        document.querySelectorAll('[data-preset]').forEach(button => {
            button.addEventListener('click', (e) => {
                const preset = e.target.dataset.preset;
                this.applyStylePreset(preset);
                this.preloadCharacterTextures();
                this.render();
            });
        });

        // Export ASCII text
        document.getElementById('export-ascii-text').addEventListener('click', () => {
            this.exportASCIIText();
        });

        // Reset image
        document.getElementById('reset-image').addEventListener('click', () => {
            this.resetImage();
        });

        // Reset zoom
        document.getElementById('reset-zoom').addEventListener('click', () => {
            this.resetCanvasTransform();
        });
    }

    setupControl(id, property, suffix = '', parser = parseInt) {
        const element = document.getElementById(id);
        const valueSpan = document.getElementById(id + '-value');

        element.addEventListener('input', (e) => {
            const value = parser(e.target.value);
            this.settings[property] = value;
            if (valueSpan) {
                valueSpan.textContent = value + (suffix || '');
            }
            this.render();
        });
    }

    setupToggle(id, property, callback = null) {
        const toggle = document.getElementById(id);
        toggle.addEventListener('click', () => {
            const isPressed = toggle.getAttribute('aria-pressed') === 'true';
            this.settings[property] = isPressed;
            if (callback) callback();
            this.render();
        });
    }

    updateBackgroundRemovalVisibility() {
        const groups = [
            'background-threshold-group',
            'edge-smoothing-group'
        ];

        groups.forEach(groupId => {
            const group = document.getElementById(groupId);
            if (group) {
                group.style.display = this.settings.removeBackground ? 'block' : 'none';
            }
        });
    }

    updateCustomCharactersVisibility() {
        const customGroup = document.getElementById('custom-chars-group');
        customGroup.style.display = this.settings.characterSet === 'custom' ? 'block' : 'none';
    }

    updateBigTypeVisibility() {
        const groups = [
            'big-type-text-group',
            'text-position-group',
            'text-size-group',
            'flow-algorithm-group',
            'flow-strength-group'
        ];

        groups.forEach(groupId => {
            const group = document.getElementById(groupId);
            group.style.display = this.settings.bigTypeEnabled ? 'block' : 'none';
        });
    }

    updateColorModeVisibility() {
        const monoGroup = document.getElementById('mono-color-group');
        const gradientGroup = document.getElementById('gradient-colors-group');

        monoGroup.style.display = ['monochrome', 'tinted'].includes(this.settings.colorMode) ? 'block' : 'none';
        gradientGroup.style.display = this.settings.colorMode === 'gradient' ? 'block' : 'none';
    }

    updateAnimationVisibility() {
        const speedGroup = document.getElementById('animation-speed-group');
        speedGroup.style.display = this.settings.animateCharacters ? 'block' : 'none';
    }

    // ========== IMAGE PROCESSING ==========
    async loadSourceImage(file) {
        if (!file) return;

        const img = new Image();

        return new Promise((resolve, reject) => {
            img.onload = () => {
                this.sourceImage = img;
                this.processSourceImage();
                this.generateTextMask();
                this.render();
                resolve();
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    createSourceCanvas() {
        this.sourceCanvas = document.createElement('canvas');
        this.sourceCtx = this.sourceCanvas.getContext('2d');
        this.sourceCanvas.width = Math.floor(canvas.width / (this.settings.charSize * 0.6));
        this.sourceCanvas.height = Math.floor(canvas.height / this.settings.charSize);
    }

    processSourceImage() {
        if (!this.sourceImage || !this.sourceCanvas) return;

        // Resize source canvas based on character density
        const cols = Math.floor(canvas.width / (this.settings.charSize * 0.6));
        const rows = Math.floor(canvas.height / this.settings.charSize);
        this.sourceCanvas.width = cols;
        this.sourceCanvas.height = rows;

        // Draw scaled image to source canvas
        this.drawFittedImage();

        // Apply image processing effects
        this.applyImageEffects();

        // Apply background removal if enabled
        if (this.settings.removeBackground) {
            this.applyBackgroundRemoval();
        }
    }

    drawFittedImage() {
        const img = this.sourceImage;
        const canvas = this.sourceCanvas;
        const ctx = this.sourceCtx;

        let drawX = 0, drawY = 0, drawWidth = canvas.width, drawHeight = canvas.height;

        if (this.settings.imageFit === 'cover') {
            const imgRatio = img.width / img.height;
            const canvasRatio = canvas.width / canvas.height;

            if (imgRatio > canvasRatio) {
                drawWidth = canvas.height * imgRatio;
                drawX = (canvas.width - drawWidth) / 2;
            } else {
                drawHeight = canvas.width / imgRatio;
                drawY = (canvas.height - drawHeight) / 2;
            }
        } else if (this.settings.imageFit === 'contain') {
            const imgRatio = img.width / img.height;
            const canvasRatio = canvas.width / canvas.height;

            if (imgRatio > canvasRatio) {
                drawHeight = canvas.width / imgRatio;
                drawY = (canvas.height - drawHeight) / 2;
            } else {
                drawWidth = canvas.height * imgRatio;
                drawX = (canvas.width - drawWidth) / 2;
            }
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }

    applyImageEffects() {
        const imageData = this.sourceCtx.getImageData(0, 0, this.sourceCanvas.width, this.sourceCanvas.height);
        const data = imageData.data;

        // Apply brightness
        if (this.settings.brightness !== 0) {
            const brightness = this.settings.brightness * 2.55; // Convert percentage to 0-255
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.max(0, Math.min(255, data[i] + brightness));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness));
            }
        }

        // Apply auto contrast
        if (this.settings.autoContrast) {
            this.applyAutoContrast(data);
        }

        this.sourceCtx.putImageData(imageData, 0, 0);
    }

    // Background removal using edge detection and color similarity
    applyBackgroundRemoval() {
        const canvas = this.sourceCanvas;
        const ctx = this.sourceCtx;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        // Sample corner pixels to determine background color
        const backgroundColors = this.sampleBackgroundColors(data, width, height);
        const avgBackgroundColor = this.averageColors(backgroundColors);

        // Create alpha mask based on color similarity to background
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Calculate color distance from background
            const distance = this.colorDistance(
                { r, g, b },
                avgBackgroundColor
            );

            // If color is similar to background, make transparent
            if (distance < this.settings.backgroundThreshold) {
                data[i + 3] = 0; // Set alpha to 0 (transparent)
            } else {
                // Apply edge smoothing to avoid harsh edges
                const smoothedAlpha = this.calculateSmoothAlpha(
                    data, i, width, height, distance, avgBackgroundColor
                );
                data[i + 3] = Math.min(255, smoothedAlpha);
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    sampleBackgroundColors(data, width, height) {
        const colors = [];
        const sampleSize = 5; // Sample 5x5 pixels from each corner

        // Sample top-left corner
        for (let y = 0; y < sampleSize; y++) {
            for (let x = 0; x < sampleSize; x++) {
                const i = (y * width + x) * 4;
                colors.push({
                    r: data[i],
                    g: data[i + 1],
                    b: data[i + 2]
                });
            }
        }

        // Sample top-right corner
        for (let y = 0; y < sampleSize; y++) {
            for (let x = width - sampleSize; x < width; x++) {
                const i = (y * width + x) * 4;
                colors.push({
                    r: data[i],
                    g: data[i + 1],
                    b: data[i + 2]
                });
            }
        }

        // Sample bottom-left corner
        for (let y = height - sampleSize; y < height; y++) {
            for (let x = 0; x < sampleSize; x++) {
                const i = (y * width + x) * 4;
                colors.push({
                    r: data[i],
                    g: data[i + 1],
                    b: data[i + 2]
                });
            }
        }

        // Sample bottom-right corner
        for (let y = height - sampleSize; y < height; y++) {
            for (let x = width - sampleSize; x < width; x++) {
                const i = (y * width + x) * 4;
                colors.push({
                    r: data[i],
                    g: data[i + 1],
                    b: data[i + 2]
                });
            }
        }

        return colors;
    }

    averageColors(colors) {
        const sum = colors.reduce((acc, color) => ({
            r: acc.r + color.r,
            g: acc.g + color.g,
            b: acc.b + color.b
        }), { r: 0, g: 0, b: 0 });

        return {
            r: Math.round(sum.r / colors.length),
            g: Math.round(sum.g / colors.length),
            b: Math.round(sum.b / colors.length)
        };
    }

    colorDistance(color1, color2) {
        // Euclidean distance in RGB space
        return Math.sqrt(
            Math.pow(color1.r - color2.r, 2) +
            Math.pow(color1.g - color2.g, 2) +
            Math.pow(color1.b - color2.b, 2)
        );
    }

    calculateSmoothAlpha(data, pixelIndex, width, height, distance, backgroundColor) {
        const smoothingRadius = this.settings.edgeSmoothing;
        const x = (pixelIndex / 4) % width;
        const y = Math.floor(pixelIndex / 4 / width);

        // Sample surrounding pixels for edge smoothing
        let totalAlpha = 0;
        let sampleCount = 0;

        for (let dy = -smoothingRadius; dy <= smoothingRadius; dy++) {
            for (let dx = -smoothingRadius; dx <= smoothingRadius; dx++) {
                const sampleX = x + dx;
                const sampleY = y + dy;

                if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
                    const sampleIndex = (sampleY * width + sampleX) * 4;
                    const sampleColor = {
                        r: data[sampleIndex],
                        g: data[sampleIndex + 1],
                        b: data[sampleIndex + 2]
                    };

                    const sampleDistance = this.colorDistance(sampleColor, backgroundColor);
                    const alpha = Math.max(0, Math.min(255,
                        255 * (sampleDistance - this.settings.backgroundThreshold) /
                        (100 - this.settings.backgroundThreshold)
                    ));

                    totalAlpha += alpha;
                    sampleCount++;
                }
            }
        }

        return sampleCount > 0 ? totalAlpha / sampleCount : 255;
    }

    applyAutoContrast(data) {
        let min = 255, max = 0;

        // Find min/max luminance
        for (let i = 0; i < data.length; i += 4) {
            const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            min = Math.min(min, luminance);
            max = Math.max(max, luminance);
        }

        if (max <= min) return;

        const scale = 255 / (max - min);

        // Apply contrast stretch
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.max(0, Math.min(255, (data[i] - min) * scale));
            data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - min) * scale));
            data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - min) * scale));
        }
    }

    // ========== CHARACTER TEXTURE SYSTEM ==========
    preloadCharacterTextures() {
        this.characterTextures.clear();

        const chars = this.getCharacterSet();
        const fontSize = this.settings.charSize;
        const font = this.getFontString();

        chars.split('').forEach(char => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = fontSize;
            canvas.height = fontSize;

            ctx.font = font;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(char, fontSize / 2, fontSize / 2);

            this.characterTextures.set(char, canvas);
        });
    }

    getCharacterSet() {
        if (this.settings.characterSet === 'custom') {
            return this.settings.customChars || ASCII_SETS.classic;
        }
        return ASCII_SETS[this.settings.characterSet] || ASCII_SETS.classic;
    }

    getFontString() {
        const family = this.settings.fontFamily === 'monospace' ? 'monospace' :
                      this.settings.fontFamily === 'courier' ? 'Courier New, monospace' :
                      this.settings.fontFamily === 'consolas' ? 'Consolas, monospace' :
                      this.settings.fontFamily === 'lucida' ? 'Lucida Console, monospace' :
                      this.settings.fontFamily === 'menlo' ? 'Menlo, monospace' : 'monospace';

        return `${this.settings.charSize}px ${family}`;
    }

    // ========== BIG TYPE TEXT MASK GENERATION ==========
    generateTextMask() {
        if (!this.settings.bigTypeEnabled || !this.settings.bigTypeText.trim()) {
            this.textMask = null;
            return;
        }

        const maskCanvas = document.createElement('canvas');
        const maskCtx = maskCanvas.getContext('2d');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;

        // Set up text rendering
        maskCtx.font = `bold ${this.settings.textSize}px ${this.settings.fontFamily}`;
        maskCtx.textAlign = 'center';
        maskCtx.textBaseline = 'middle';
        maskCtx.fillStyle = '#ffffff';

        // Calculate position
        let textX = canvas.width / 2;
        let textY = canvas.height / 2;

        if (this.settings.textPosition === 'top') {
            textY = this.settings.textSize / 2 + 20;
        } else if (this.settings.textPosition === 'bottom') {
            textY = canvas.height - this.settings.textSize / 2 - 20;
        } else if (this.settings.textPosition === 'left') {
            textX = this.settings.textSize / 2 + 20;
        } else if (this.settings.textPosition === 'right') {
            textX = canvas.width - this.settings.textSize / 2 - 20;
        }

        // Draw text to mask
        maskCtx.fillText(this.settings.bigTypeText, textX, textY);

        // Get text bounds
        const metrics = maskCtx.measureText(this.settings.bigTypeText);
        this.textBounds = {
            x: textX - metrics.width / 2,
            y: textY - this.settings.textSize / 2,
            width: metrics.width,
            height: this.settings.textSize
        };

        // Convert to grayscale mask
        this.textMask = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    }

    // ========== INTELLIGENT FLOW ALGORITHMS ==========
    getCharacterFlow(col, row, baseChar) {
        if (!this.settings.bigTypeEnabled || !this.textMask) {
            return baseChar;
        }

        const x = col * this.settings.charSize * 0.6;
        const y = row * this.settings.charSize;

        // Sample text mask
        const maskIndex = ((Math.floor(y) * canvas.width) + Math.floor(x)) * 4;
        const maskAlpha = this.textMask.data[maskIndex + 3] || 0;
        const isInText = maskAlpha > 128;
        const strength = this.settings.flowStrength / 100;

        if (isInText) {
            // Character is inside text area
            return this.settings.bigTypeText.charAt(Math.floor(Math.random() * this.settings.bigTypeText.length)) || baseChar;
        }

        // Apply flow algorithm
        const distanceToText = this.getDistanceToText(x, y);
        const flowInfluence = Math.max(0, 1 - distanceToText / (this.settings.textSize * 2));

        if (flowInfluence < 0.1) {
            return baseChar; // Too far from text, no influence
        }

        const chars = this.getCharacterSet();
        const baseIndex = chars.indexOf(baseChar);

        switch (this.settings.flowAlgorithm) {
            case 'wrap':
                return this.applyWrapFlow(baseChar, baseIndex, chars, flowInfluence * strength);
            case 'displace':
                return this.applyDisplaceFlow(baseChar, baseIndex, chars, flowInfluence * strength);
            case 'cluster':
                return this.applyClusterFlow(baseChar, baseIndex, chars, flowInfluence * strength);
            case 'align':
                return this.applyAlignFlow(baseChar, baseIndex, chars, flowInfluence * strength);
            default:
                return baseChar;
        }
    }

    getDistanceToText(x, y) {
        const centerX = this.textBounds.x + this.textBounds.width / 2;
        const centerY = this.textBounds.y + this.textBounds.height / 2;
        return Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    }

    applyWrapFlow(baseChar, baseIndex, chars, influence) {
        // Characters wrap around the text, becoming denser near edges
        const targetIndex = Math.floor(chars.length * 0.7 * influence);
        const blendIndex = Math.floor(baseIndex * (1 - influence) + targetIndex * influence);
        return chars[Math.max(0, Math.min(chars.length - 1, blendIndex))];
    }

    applyDisplaceFlow(baseChar, baseIndex, chars, influence) {
        // Characters are pushed away, becoming lighter
        const displacement = Math.floor(influence * 3);
        const newIndex = Math.max(0, baseIndex - displacement);
        return chars[newIndex];
    }

    applyClusterFlow(baseChar, baseIndex, chars, influence) {
        // Characters cluster near text, becoming denser
        const clusterIndex = Math.floor(baseIndex + influence * (chars.length - baseIndex) * 0.5);
        return chars[Math.min(chars.length - 1, clusterIndex)];
    }

    applyAlignFlow(baseChar, baseIndex, chars, influence) {
        // Characters align to text edges with consistent density
        const alignedIndex = Math.floor((baseIndex + chars.length * 0.6) * influence + baseIndex * (1 - influence));
        return chars[Math.max(0, Math.min(chars.length - 1, alignedIndex))];
    }

    // Export ASCII as downloadable text file
    exportASCIIText() {
        if (!this.sourceCanvas || !this.sourceImage) {
            alert('Please upload an image first!');
            return;
        }

        const chars = this.getCharacterSet();
        const imageData = this.sourceCtx.getImageData(0, 0, this.sourceCanvas.width, this.sourceCanvas.height);
        const data = imageData.data;

        let asciiText = '';

        // Generate ASCII text
        for (let row = 0; row < this.sourceCanvas.height; row++) {
            for (let col = 0; col < this.sourceCanvas.width; col++) {
                const pixelIndex = (row * this.sourceCanvas.width + col) * 4;

                const r = data[pixelIndex];
                const g = data[pixelIndex + 1];
                const b = data[pixelIndex + 2];
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

                const charIndex = Math.floor((luminance / 255) * (chars.length - 1));
                let char = chars[charIndex];

                // Apply flow algorithm for big type mode
                char = this.getCharacterFlow(col, row, char);

                asciiText += char;
            }
            asciiText += '\n'; // New line after each row
        }

        // Create and download file
        const blob = new Blob([asciiText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ascii-art-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Show feedback
        if (window.ASCIIUI) {
            window.ASCIIUI.showUploadFeedback('ASCII text exported!', 'success');
        }
    }

    // Reset image and return to placeholder state
    resetImage() {
        this.sourceImage = null;
        this.sourceCanvas = null;
        this.sourceCtx = null;
        this.textMask = null;

        // Clear file input
        const fileInput = document.getElementById('source-image');
        if (fileInput) {
            fileInput.value = '';
        }

        // Recreate source canvas
        this.createSourceCanvas();

        // Reset zoom and pan
        this.resetCanvasTransform();

        // Re-render to show placeholder
        this.render();

        // Show feedback
        if (window.ASCIIUI) {
            window.ASCIIUI.showUploadFeedback('Image reset', 'info');
        }
    }

    // ========== RENDERING SYSTEM ==========
    startRenderLoop() {
        const animate = () => {
            if (this.settings.animateCharacters) {
                this.time += (0.016 * this.settings.animationSpeed);
            }

            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    // ========== CREATIVE EXTRA FEATURES ==========

    // Edge detection enhancement for ASCII conversion
    detectEdges(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const edges = new Uint8ClampedArray(data.length);

        // Sobel edge detection
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;

                // Get surrounding pixel luminances
                const tl = this.getLuminance(data, (y - 1) * width + (x - 1));
                const tm = this.getLuminance(data, (y - 1) * width + x);
                const tr = this.getLuminance(data, (y - 1) * width + (x + 1));
                const ml = this.getLuminance(data, y * width + (x - 1));
                const mr = this.getLuminance(data, y * width + (x + 1));
                const bl = this.getLuminance(data, (y + 1) * width + (x - 1));
                const bm = this.getLuminance(data, (y + 1) * width + x);
                const br = this.getLuminance(data, (y + 1) * width + (x + 1));

                // Sobel operators
                const gx = (-1 * tl) + (1 * tr) + (-2 * ml) + (2 * mr) + (-1 * bl) + (1 * br);
                const gy = (-1 * tl) + (-2 * tm) + (-1 * tr) + (1 * bl) + (2 * bm) + (1 * br);

                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const normalizedMag = Math.min(255, magnitude);

                edges[idx] = normalizedMag;
                edges[idx + 1] = normalizedMag;
                edges[idx + 2] = normalizedMag;
                edges[idx + 3] = 255;
            }
        }

        return new ImageData(edges, width, height);
    }

    getLuminance(data, pixelIndex) {
        const idx = pixelIndex * 4;
        return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // Advanced character selection based on local image features
    getAdvancedCharacter(col, row, baseChar, imageData) {
        const chars = this.getCharacterSet();
        let char = baseChar;

        // Edge-based character selection
        if (this.settings.ditherEffect && this.edgeData) {
            const x = Math.floor(col * (this.edgeData.width / this.sourceCanvas.width));
            const y = Math.floor(row * (this.edgeData.height / this.sourceCanvas.height));
            const edgeIndex = (y * this.edgeData.width + x) * 4;
            const edgeStrength = this.edgeData.data[edgeIndex] / 255;

            if (edgeStrength > 0.5) {
                // Use edge-specific characters for high contrast areas
                const edgeChars = '|/-\\+*#@';
                const edgeIndex = Math.floor(edgeStrength * (edgeChars.length - 1));
                char = edgeChars[edgeIndex];
            }
        }

        // Texture-based character selection
        const localVariance = this.calculateLocalVariance(col, row, imageData);
        if (localVariance > 0.7) {
            // High texture areas get complex characters
            const textureChars = '#@%&*+=~';
            const textureIndex = Math.floor(localVariance * (textureChars.length - 1));
            char = textureChars[textureIndex];
        }

        return char;
    }

    calculateLocalVariance(col, row, imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const kernelSize = 3;
        const halfKernel = Math.floor(kernelSize / 2);

        let sum = 0;
        let sumSquared = 0;
        let count = 0;

        for (let dy = -halfKernel; dy <= halfKernel; dy++) {
            for (let dx = -halfKernel; dx <= halfKernel; dx++) {
                const x = col + dx;
                const y = row + dy;

                if (x >= 0 && x < width && y >= 0 && y < imageData.height) {
                    const idx = (y * width + x) * 4;
                    const luminance = this.getLuminance(data, y * width + x);
                    sum += luminance;
                    sumSquared += luminance * luminance;
                    count++;
                }
            }
        }

        if (count === 0) return 0;

        const mean = sum / count;
        const variance = (sumSquared / count) - (mean * mean);
        return Math.sqrt(variance) / 255; // Normalize to 0-1
    }

    // Dynamic color palette generation
    generateDynamicPalette(imageData) {
        const data = imageData.data;
        const colors = [];
        const step = 4; // Sample every 4th pixel for performance

        // Extract color samples
        for (let i = 0; i < data.length; i += 16 * step) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            if (r !== undefined && g !== undefined && b !== undefined) {
                colors.push({ r, g, b });
            }
        }

        // Simple k-means clustering to find dominant colors
        return this.kMeansColors(colors, 5);
    }

    kMeansColors(colors, k) {
        if (colors.length === 0) return [];

        // Initialize centroids randomly
        const centroids = [];
        for (let i = 0; i < k; i++) {
            const randomIndex = Math.floor(Math.random() * colors.length);
            centroids.push({ ...colors[randomIndex] });
        }

        // Simplified k-means (3 iterations)
        for (let iter = 0; iter < 3; iter++) {
            const clusters = Array(k).fill().map(() => []);

            // Assign colors to nearest centroid
            colors.forEach(color => {
                let minDistance = Infinity;
                let closestCentroid = 0;

                centroids.forEach((centroid, index) => {
                    const distance = Math.sqrt(
                        Math.pow(color.r - centroid.r, 2) +
                        Math.pow(color.g - centroid.g, 2) +
                        Math.pow(color.b - centroid.b, 2)
                    );

                    if (distance < minDistance) {
                        minDistance = distance;
                        closestCentroid = index;
                    }
                });

                clusters[closestCentroid].push(color);
            });

            // Update centroids
            clusters.forEach((cluster, index) => {
                if (cluster.length > 0) {
                    const avgR = cluster.reduce((sum, c) => sum + c.r, 0) / cluster.length;
                    const avgG = cluster.reduce((sum, c) => sum + c.g, 0) / cluster.length;
                    const avgB = cluster.reduce((sum, c) => sum + c.b, 0) / cluster.length;

                    centroids[index] = { r: Math.round(avgR), g: Math.round(avgG), b: Math.round(avgB) };
                }
            });
        }

        return centroids;
    }

    // ASCII art style presets
    applyStylePreset(style) {
        const presets = {
            'classic': {
                characterSet: 'classic',
                colorMode: 'monochrome',
                monoColor: '#00ff00',
                contrast: 60,
                charSize: 8
            },
            'cyberpunk': {
                characterSet: 'tech',
                colorMode: 'gradient',
                gradientDark: '#ff0080',
                gradientLight: '#00ffff',
                contrast: 80,
                charSize: 6,
                animateCharacters: true
            },
            'minimalist': {
                characterSet: 'minimal',
                colorMode: 'monochrome',
                monoColor: '#333333',
                contrast: 30,
                charSize: 12
            },
            'retro': {
                characterSet: 'dense',
                colorMode: 'tinted',
                monoColor: '#ffaa00',
                contrast: 70,
                charSize: 8
            },
            'amiga': {
                characterSet: 'amiga',
                colorMode: 'gradient',
                gradientDark: '#000080',
                gradientLight: '#ff6600',
                contrast: 75,
                charSize: 8,
                ditherEffect: true
            },
            'atascii': {
                characterSet: 'atascii',
                colorMode: 'tinted',
                monoColor: '#40c040',
                contrast: 65,
                charSize: 10,
                fontFamily: 'courier'
            },
            'ansi': {
                characterSet: 'ansi',
                colorMode: 'monochrome',
                monoColor: '#c0c0c0',
                contrast: 85,
                charSize: 8,
                fontFamily: 'consolas'
            }
        };

        const preset = presets[style];
        if (preset) {
            Object.keys(preset).forEach(key => {
                if (this.settings[key] !== undefined) {
                    this.settings[key] = preset[key];
                }
            });
            this.updateUIFromSettings();
        }
    }

    updateUIFromSettings() {
        // Update UI controls to match current settings
        Object.keys(this.settings).forEach(key => {
            const element = document.getElementById(this.getControlId(key));
            if (element) {
                if (element.type === 'range') {
                    element.value = this.settings[key];
                    const valueSpan = document.getElementById(element.id + '-value');
                    if (valueSpan) {
                        valueSpan.textContent = this.settings[key];
                    }
                } else if (element.type === 'color') {
                    element.value = this.settings[key];
                } else if (element.type === 'checkbox') {
                    element.checked = this.settings[key];
                } else if (element.tagName === 'SELECT') {
                    element.value = this.settings[key];
                }
            }
        });
    }

    getControlId(settingKey) {
        // Map settings to control IDs
        const mapping = {
            'characterSet': 'character-set',
            'colorMode': 'color-mode',
            'monoColor': 'mono-color',
            'gradientDark': 'gradient-dark',
            'gradientLight': 'gradient-light',
            'charSize': 'char-size',
            'animateCharacters': 'animate-characters'
        };

        return mapping[settingKey] || settingKey.replace(/([A-Z])/g, '-$1').toLowerCase();
    }

    // Performance optimization: adaptive quality rendering
    shouldUseAdaptiveQuality() {
        const totalPixels = this.sourceCanvas.width * this.sourceCanvas.height;
        return totalPixels > 50000; // Above ~200x250 resolution
    }

    renderASCIIAdaptive() {
        if (this.shouldUseAdaptiveQuality()) {
            // Render every other character for performance, interpolate the rest
            this.renderASCIILowQuality();
        } else {
            this.renderASCII();
        }
    }

    renderASCIILowQuality() {
        if (!this.sourceCanvas) return;

        const chars = this.getCharacterSet();
        const imageData = this.sourceCtx.getImageData(0, 0, this.sourceCanvas.width, this.sourceCanvas.height);
        const data = imageData.data;

        const charWidth = this.settings.charSize * 0.6;
        const charHeight = this.settings.charSize;

        ctx.font = this.getFontString();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Render every 2nd row and column, then fill in
        for (let row = 0; row < this.sourceCanvas.height; row += 2) {
            for (let col = 0; col < this.sourceCanvas.width; col += 2) {
                const pixelIndex = (row * this.sourceCanvas.width + col) * 4;

                const r = data[pixelIndex];
                const g = data[pixelIndex + 1];
                const b = data[pixelIndex + 2];
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

                const charIndex = Math.floor((luminance / 255) * (chars.length - 1));
                let char = chars[charIndex];

                // Apply flow and other effects
                char = this.getCharacterFlow(col, row, char);

                const color = this.getCharacterColor(r, g, b, luminance);
                ctx.fillStyle = color;

                // Draw character and fill adjacent positions
                for (let dr = 0; dr <= 1 && row + dr < this.sourceCanvas.height; dr++) {
                    for (let dc = 0; dc <= 1 && col + dc < this.sourceCanvas.width; dc++) {
                        const x = (col + dc) * charWidth + charWidth / 2;
                        const y = (row + dr) * charHeight + charHeight / 2;
                        ctx.fillText(char, x, y);
                    }
                }
            }
        }
    }

    render() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background FIRST (mandatory)
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            Chatooly.backgroundManager.drawToCanvas(ctx, canvas.width, canvas.height);
        }

        // If no source image, show placeholder
        if (!this.sourceImage) {
            this.drawPlaceholder();
            return;
        }

        // Process source image if needed
        if (this.sourceImage) {
            this.processSourceImage();
        }

        // Render ASCII with adaptive quality
        this.renderASCIIAdaptive();
    }

    drawPlaceholder() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Upload an image to start', canvas.width / 2, canvas.height / 2);
    }

    renderASCII() {
        if (!this.sourceCanvas) return;

        const chars = this.getCharacterSet();
        const imageData = this.sourceCtx.getImageData(0, 0, this.sourceCanvas.width, this.sourceCanvas.height);
        const data = imageData.data;

        const charWidth = this.settings.charSize * 0.6;
        const charHeight = this.settings.charSize;

        ctx.font = this.getFontString();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let row = 0; row < this.sourceCanvas.height; row++) {
            for (let col = 0; col < this.sourceCanvas.width; col++) {
                const pixelIndex = (row * this.sourceCanvas.width + col) * 4;

                // Get luminance and alpha
                const r = data[pixelIndex];
                const g = data[pixelIndex + 1];
                const b = data[pixelIndex + 2];
                const alpha = data[pixelIndex + 3];
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

                // Skip transparent pixels (background removal)
                if (alpha < 10) {
                    continue;
                }

                // Map luminance to character
                const charIndex = Math.floor((luminance / 255) * (chars.length - 1));
                let char = chars[charIndex];

                // Apply flow algorithm for big type mode
                char = this.getCharacterFlow(col, row, char);

                // Apply animation if enabled
                if (this.settings.animateCharacters) {
                    const animOffset = Math.floor(this.time * 10 + row * 0.1 + col * 0.05) % chars.length;
                    const animIndex = (charIndex + animOffset) % chars.length;
                    char = chars[animIndex];
                }

                // Apply dithering if enabled
                if (this.settings.ditherEffect) {
                    const dither = (row + col) % 2 === 0 ? -0.1 : 0.1;
                    const ditheredIndex = Math.max(0, Math.min(chars.length - 1,
                        Math.floor(charIndex + dither * chars.length)));
                    char = chars[ditheredIndex];
                }

                // Calculate color
                const color = this.getCharacterColor(r, g, b, luminance);
                ctx.fillStyle = color;

                // Draw character
                const x = col * charWidth + charWidth / 2;
                const y = row * charHeight + charHeight / 2;
                ctx.fillText(char, x, y);
            }
        }
    }

    getCharacterColor(r, g, b, luminance) {
        const contrast = this.settings.contrast / 100;
        const adjustedLuminance = (luminance - 128) * contrast + 128;
        const alpha = Math.max(0.1, adjustedLuminance / 255);

        switch (this.settings.colorMode) {
            case 'monochrome':
                return this.hexToRgba(this.settings.monoColor, alpha);

            case 'tinted':
                const tintStrength = 0.7;
                const tintColor = this.hexToRgb(this.settings.monoColor);
                const mixedR = Math.floor(r * (1 - tintStrength) + tintColor.r * tintStrength);
                const mixedG = Math.floor(g * (1 - tintStrength) + tintColor.g * tintStrength);
                const mixedB = Math.floor(b * (1 - tintStrength) + tintColor.b * tintStrength);
                return `rgba(${mixedR}, ${mixedG}, ${mixedB}, ${alpha})`;

            case 'original':
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;

            case 'gradient':
                const progress = luminance / 255;
                return this.interpolateColor(this.settings.gradientDark, this.settings.gradientLight, progress, alpha);

            default:
                return this.hexToRgba(this.settings.monoColor, alpha);
        }
    }

    interpolateColor(color1, color2, progress, alpha = 1) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);

        const r = Math.round(c1.r + (c2.r - c1.r) * progress);
        const g = Math.round(c1.g + (c2.g - c1.g) * progress);
        const b = Math.round(c1.b + (c2.b - c1.b) * progress);

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : {r: 0, g: 255, b: 136};
    }

    hexToRgba(hex, alpha = 1) {
        const rgb = this.hexToRgb(hex);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }
}

// ========== HIGH-RESOLUTION EXPORT FUNCTION (MANDATORY) ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!window.asciiStudio) {
        console.warn('ASCII Shader Studio not ready for export');
        return;
    }

    const exportCtx = targetCanvas.getContext('2d');
    targetCanvas.width = canvas.width * scale;
    targetCanvas.height = canvas.height * scale;
    exportCtx.scale(scale, scale);

    // Draw background FIRST
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.drawToCanvas(exportCtx, canvas.width, canvas.height);
    }

    const studio = window.asciiStudio;

    // Temporarily switch context for export
    const originalCtx = window.ctx;
    window.ctx = exportCtx;

    // Render ASCII at high resolution
    studio.render();

    // Restore original context
    window.ctx = originalCtx;

    console.log(`High-res ASCII export completed at ${scale}x resolution`);
};

// ========== INITIALIZE TOOL ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing ASCII Shader Studio...');

    window.asciiStudio = new ASCIIShaderStudio();
    console.log('ASCII Shader Studio initialized:', window.asciiStudio);
});