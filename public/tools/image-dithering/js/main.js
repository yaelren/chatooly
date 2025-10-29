/*
 * Moving Thither - Dithering Tool
 * Author: Yael Renous - Studio Video
 *
 * Transforms images into animated dither art using custom characters
 */

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');
canvas.width = 800;
canvas.height = 600;
const ctx = canvas.getContext('2d');

// ========== STATE ==========
let originalImage = null;
let imageData = null;
let ditherData = null; // Store brightness map
let animationFrame = 0;
let animationId = null;
let previousCanvasSize = { width: canvas.width, height: canvas.height };
let animatedCells = new Set(); // Track which cells should be randomly animated

// ========== SETTINGS ==========
const settings = {
    characters: '@#!@$&^&',
    cellSize: 8,
    monochrome: false, // Default to color mode
    colorLight: '#FFFFFF',
    colorDark: '#000000',
    colors: ['#000000', '#FFFFFF'], // Multi-color palette (default)
    animated: false,
    animationSpeed: 50,
    animationPercentage: 10, // Percentage of cells that change randomly each frame
    imageFit: 'contain', // 'contain', 'cover', or 'fill' (for source image processing)
    ditherFillMode: 'contain', // How dithered output fits canvas: 'contain', 'cover', or 'fill'
    brightness: 0, // -100 to 100
    contrast: 0, // -100 to 100
    ditherIntensity: 0.3 // How much dithering affects brightness (0-1)
};

// ========== BACKGROUND SYSTEM ==========
// Initialize background manager
if (window.Chatooly && window.Chatooly.backgroundManager) {
    window.Chatooly.backgroundManager.init(canvas);
    // Set default background color to black
    window.Chatooly.backgroundManager.setBackgroundColor('#000000');
}

// ========== DITHERING ALGORITHM ==========
// Bayer matrix for ordered dithering
const bayerMatrix = [
    [0, 32, 8, 40, 2, 34, 10, 42],
    [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38],
    [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41],
    [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37],
    [63, 31, 55, 23, 61, 29, 53, 21]
];

function getDitherThreshold(x, y) {
    const matrixSize = 8;
    return bayerMatrix[y % matrixSize][x % matrixSize] / 64;
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                processImage();
                resolve(img);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function calculateImageDimensions(fitMode, imgWidth, imgHeight, canvasWidth, canvasHeight) {
    const canvasAspect = canvasWidth / canvasHeight;
    const imageAspect = imgWidth / imgHeight;
    
    let drawWidth, drawHeight, drawX, drawY, sourceX, sourceY, sourceWidth, sourceHeight;
    
    if (fitMode === 'fill') {
        // Stretch to fill exactly - no aspect ratio preservation
        drawWidth = canvasWidth;
        drawHeight = canvasHeight;
        drawX = 0;
        drawY = 0;
        sourceX = 0;
        sourceY = 0;
        sourceWidth = imgWidth;
        sourceHeight = imgHeight;
    } else if (fitMode === 'cover') {
        // Fill canvas, maintain aspect ratio, crop if needed
        if (imageAspect > canvasAspect) {
            // Image is wider - fit height, crop width
            drawHeight = canvasHeight;
            drawWidth = canvasHeight * imageAspect;
            drawX = (canvasWidth - drawWidth) / 2;
            drawY = 0;
            // Crop from sides
            sourceWidth = imgWidth;
            sourceHeight = imgHeight;
            sourceX = (imgWidth - (imgHeight * canvasAspect)) / 2;
            sourceY = 0;
            sourceWidth = imgHeight * canvasAspect;
        } else {
            // Image is taller - fit width, crop height
            drawWidth = canvasWidth;
            drawHeight = canvasWidth / imageAspect;
            drawX = 0;
            drawY = (canvasHeight - drawHeight) / 2;
            // Crop from top/bottom
            sourceWidth = imgWidth;
            sourceHeight = imgWidth / canvasAspect;
            sourceX = 0;
            sourceY = (imgHeight - sourceHeight) / 2;
        }
    } else { // 'contain' - default
        // Fit entire image, maintain aspect ratio, may have empty space
        if (imageAspect > canvasAspect) {
            drawWidth = canvasWidth;
            drawHeight = canvasWidth / imageAspect;
            drawX = 0;
            drawY = (canvasHeight - drawHeight) / 2;
        } else {
            drawWidth = canvasHeight * imageAspect;
            drawHeight = canvasHeight;
            drawX = (canvasWidth - drawWidth) / 2;
            drawY = 0;
        }
        sourceX = 0;
        sourceY = 0;
        sourceWidth = imgWidth;
        sourceHeight = imgHeight;
    }
    
    return {
        drawWidth: Math.floor(drawWidth),
        drawHeight: Math.floor(drawHeight),
        drawX: Math.floor(drawX),
        drawY: Math.floor(drawY),
        sourceX: Math.floor(sourceX),
        sourceY: Math.floor(sourceY),
        sourceWidth: Math.floor(sourceWidth),
        sourceHeight: Math.floor(sourceHeight)
    };
}

function processImage() {
    if (!originalImage) return;

    // Calculate dimensions based on fit mode
    const dims = calculateImageDimensions(
        settings.imageFit,
        originalImage.width,
        originalImage.height,
        canvas.width,
        canvas.height
    );

    // Draw image to temporary canvas for processing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = dims.drawWidth;
    tempCanvas.height = dims.drawHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (settings.imageFit === 'cover') {
        // Draw cropped portion of image
        tempCtx.drawImage(
            originalImage,
            dims.sourceX, dims.sourceY, dims.sourceWidth, dims.sourceHeight,
            0, 0, dims.drawWidth, dims.drawHeight
        );
    } else {
        // Draw full image scaled to dimensions
        tempCtx.drawImage(originalImage, 0, 0, dims.drawWidth, dims.drawHeight);
    }
    
    // Get image data
    imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Store brightness map for dithering
    ditherData = {
        width: tempCanvas.width,
        height: tempCanvas.height,
        pixels: []
    };

    // Apply brightness and contrast adjustments
    for (let y = 0; y < tempCanvas.height; y++) {
        for (let x = 0; x < tempCanvas.width; x++) {
            const idx = (y * tempCanvas.width + x) * 4;
            let r = imageData.data[idx];
            let g = imageData.data[idx + 1];
            let b = imageData.data[idx + 2];
            
            // Apply brightness (-100 to 100, maps to -1 to 1)
            const brightnessAdj = settings.brightness / 100;
            r = Math.max(0, Math.min(255, r + (brightnessAdj * 255)));
            g = Math.max(0, Math.min(255, g + (brightnessAdj * 255)));
            b = Math.max(0, Math.min(255, b + (brightnessAdj * 255)));
            
            // Apply contrast (-100 to 100)
            const contrastAdj = settings.contrast / 100;
            const factor = (259 * (contrastAdj * 255 + 255)) / (255 * (259 - contrastAdj * 255));
            r = Math.max(0, Math.min(255, factor * (r - 128) + 128));
            g = Math.max(0, Math.min(255, factor * (g - 128) + 128));
            b = Math.max(0, Math.min(255, factor * (b - 128) + 128));
            
            // Calculate brightness (luminance formula)
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            ditherData.pixels.push({
                x: x,
                y: y,
                brightness: brightness / 255,
                r: Math.round(r),
                g: Math.round(g),
                b: Math.round(b)
            });
        }
    }

    render();
}

function render() {
    if (!ditherData) return;

    // Draw background first
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.drawToCanvas(ctx, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const chars = settings.characters || '░';
    const numChars = chars.length;
    const cellSize = settings.cellSize;
    
    // Calculate drawing area based on fill mode
    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = ditherData.width / ditherData.height;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (settings.ditherFillMode === 'fill') {
        // Stretch to fill exactly - no aspect ratio preservation
        drawWidth = canvas.width;
        drawHeight = canvas.height;
        drawX = 0;
        drawY = 0;
    } else if (settings.ditherFillMode === 'cover') {
        // Fill canvas, maintain aspect ratio, may crop
        if (imageAspect > canvasAspect) {
            // Image is wider - fit height, extend width
            drawHeight = canvas.height;
            drawWidth = canvas.height * imageAspect;
            drawX = (canvas.width - drawWidth) / 2;
            drawY = 0;
        } else {
            // Image is taller - fit width, extend height
            drawWidth = canvas.width;
            drawHeight = canvas.width / imageAspect;
            drawX = 0;
            drawY = (canvas.height - drawHeight) / 2;
        }
    } else { // 'contain' - default
        // Fit entire image, maintain aspect ratio, may have empty space
        if (imageAspect > canvasAspect) {
            drawWidth = canvas.width;
            drawHeight = canvas.width / imageAspect;
            drawX = 0;
            drawY = (canvas.height - drawHeight) / 2;
        } else {
            drawWidth = canvas.height * imageAspect;
            drawHeight = canvas.height;
            drawX = (canvas.width - drawWidth) / 2;
            drawY = 0;
        }
    }

    const scaleX = drawWidth / ditherData.width;
    const scaleY = drawHeight / ditherData.height;

    // Calculate cells
    const cols = Math.ceil(drawWidth / cellSize);
    const rows = Math.ceil(drawHeight / cellSize);
    const totalCells = rows * cols;
    
    const fontSize = cellSize * 0.9;
    ctx.font = `${fontSize}px monospace`;

    // For animation: randomly update cells based on percentage setting
    if (settings.animated && numChars > 1) {
        // Clear previous animated cells
        animatedCells.clear();
        
        // Select percentage of cells to randomize
        const percentage = settings.animationPercentage / 100;
        const numToAnimate = Math.max(1, Math.floor(totalCells * percentage));
        const cellIndices = Array.from({ length: totalCells }, (_, i) => i);
        
        // Shuffle and select random cells
        for (let i = cellIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cellIndices[i], cellIndices[j]] = [cellIndices[j], cellIndices[i]];
        }
        
        // Add selected cells to animated set
        for (let i = 0; i < numToAnimate; i++) {
            animatedCells.add(cellIndices[i]);
        }
    } else {
        animatedCells.clear();
    }

    let cellIndex = 0;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const pixelX = Math.floor((col * cellSize) / scaleX);
            const pixelY = Math.floor((row * cellSize) / scaleY);
            
            if (pixelX >= ditherData.width || pixelY >= ditherData.height) {
                cellIndex++;
                continue;
            }

            const pixel = ditherData.pixels[pixelY * ditherData.width + pixelX];
            if (!pixel) {
                cellIndex++;
                continue;
            }

            // Apply dithering threshold with intensity control
            const threshold = getDitherThreshold(pixelX, pixelY);
            const ditheredBrightness = pixel.brightness + (threshold - 0.5) * settings.ditherIntensity;
            const clampedBrightness = Math.max(0, Math.min(1, ditheredBrightness));

            // Select character index
            let charIndex;
            
            // If animated and this cell is in the random set, use random character
            if (settings.animated && animatedCells.has(cellIndex) && numChars > 1) {
                charIndex = Math.floor(Math.random() * numChars);
            } else {
                // Normal brightness-based character selection
                charIndex = Math.floor(clampedBrightness * numChars);
                if (charIndex >= numChars) charIndex = numChars - 1;
            }
            
            cellIndex++;

            // Get color
            if (settings.monochrome) {
                ctx.fillStyle = '#FFFFFF';
            } else if (settings.colors.length > 1) {
                // Multi-color interpolation across color palette
                const brightness = clampedBrightness;
                const colorCount = settings.colors.length;
                const segmentSize = 1 / (colorCount - 1);
                const segmentIndex = Math.min(Math.floor(brightness / segmentSize), colorCount - 2);
                const segmentProgress = (brightness - segmentIndex * segmentSize) / segmentSize;
                
                const color1 = settings.colors[segmentIndex];
                const color2 = settings.colors[segmentIndex + 1];
                
                const r1 = parseInt(color1.slice(1, 3), 16);
                const g1 = parseInt(color1.slice(3, 5), 16);
                const b1 = parseInt(color1.slice(5, 7), 16);
                const r2 = parseInt(color2.slice(1, 3), 16);
                const g2 = parseInt(color2.slice(3, 5), 16);
                const b2 = parseInt(color2.slice(5, 7), 16);
                
                const r = Math.round(r1 + (r2 - r1) * segmentProgress);
                const g = Math.round(g1 + (g2 - g1) * segmentProgress);
                const b = Math.round(b1 + (b2 - b1) * segmentProgress);
                
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            } else {
                // Interpolate between dark and light colors based on brightness
                const brightness = clampedBrightness;
                const r1 = parseInt(settings.colorDark.slice(1, 3), 16);
                const g1 = parseInt(settings.colorDark.slice(3, 5), 16);
                const b1 = parseInt(settings.colorDark.slice(5, 7), 16);
                const r2 = parseInt(settings.colorLight.slice(1, 3), 16);
                const g2 = parseInt(settings.colorLight.slice(3, 5), 16);
                const b2 = parseInt(settings.colorLight.slice(5, 7), 16);
                
                const r = Math.round(r1 + (r2 - r1) * brightness);
                const g = Math.round(g1 + (g2 - g1) * brightness);
                const b = Math.round(b1 + (b2 - b1) * brightness);
                
                ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            }

            // Draw character
            const x = drawX + col * cellSize + cellSize / 2;
            const y = drawY + row * cellSize + cellSize / 2;
            
            ctx.fillText(chars[charIndex], x, y);
        }
    }
}

function animate() {
    if (settings.animated) {
        animationFrame++;
        // Control animation speed: 1 = slowest, 100 = fastest
        // Convert speed to milliseconds between updates
        const speed = settings.animationSpeed;
        const minDelay = 5; // fastest update (5ms = ~200fps)
        const maxDelay = 500; // slowest update (500ms = 2fps)
        const delay = maxDelay - ((speed / 100) * (maxDelay - minDelay));
        
        // Use time-based animation instead of frame skipping
        const now = Date.now();
        if (!animate.lastUpdate) animate.lastUpdate = now;
        
        if (now - animate.lastUpdate >= delay) {
            render();
            animate.lastUpdate = now;
        }
        
        animationId = requestAnimationFrame(animate);
    } else {
        animate.lastUpdate = null;
    }
}

function stopAnimation() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
    // Image upload
    const imageUpload = document.getElementById('image-upload');
    if (imageUpload) {
        imageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                loadImage(file);
            }
        });
    }

    // Character input
    const charactersInput = document.getElementById('characters');
    if (charactersInput) {
        charactersInput.addEventListener('input', (e) => {
            settings.characters = e.target.value || '░';
            render();
        });
    }

    // Monochrome toggle
    const monochromeToggle = document.getElementById('monochrome');
    if (monochromeToggle) {
        monochromeToggle.addEventListener('change', (e) => {
            settings.monochrome = e.target.checked;
            render();
        });
    }

    // Color pickers
    const colorLight = document.getElementById('color-light');
    if (colorLight) {
        colorLight.addEventListener('input', (e) => {
            settings.colorLight = e.target.value;
            render();
        });
    }

    const colorDark = document.getElementById('color-dark');
    if (colorDark) {
        colorDark.addEventListener('input', (e) => {
            settings.colorDark = e.target.value;
            render();
        });
    }

    // Animation toggle
    const animatedToggle = document.getElementById('animated');
    if (animatedToggle) {
        animatedToggle.addEventListener('change', (e) => {
            settings.animated = e.target.checked;
            stopAnimation();
            if (settings.animated) {
                animationFrame = 0;
                animate.lastUpdate = null; // Reset timing
                animate();
            } else {
                animate.lastUpdate = null;
                render();
            }
        });
    }

    // Animation speed
    const animationSpeed = document.getElementById('animation-speed');
    if (animationSpeed) {
        animationSpeed.addEventListener('input', (e) => {
            settings.animationSpeed = parseInt(e.target.value);
        });
    }

    // Animation percentage
    const animationPercentage = document.getElementById('animation-percentage');
    if (animationPercentage) {
        animationPercentage.addEventListener('input', (e) => {
            settings.animationPercentage = parseInt(e.target.value);
        });
    }

    // Cell size
    const cellSize = document.getElementById('cell-size');
    if (cellSize) {
        cellSize.addEventListener('input', (e) => {
            settings.cellSize = parseInt(e.target.value);
            render();
        });
    }

    // Dither fill mode
    const ditherFillMode = document.getElementById('dither-fill-mode');
    if (ditherFillMode) {
        ditherFillMode.addEventListener('change', (e) => {
            settings.ditherFillMode = e.target.value;
            render();
        });
    }

    // Brightness
    const brightness = document.getElementById('brightness');
    if (brightness) {
        brightness.addEventListener('input', (e) => {
            settings.brightness = parseInt(e.target.value);
            if (originalImage) {
                processImage();
            }
        });
    }

    // Contrast
    const contrast = document.getElementById('contrast');
    if (contrast) {
        contrast.addEventListener('input', (e) => {
            settings.contrast = parseInt(e.target.value);
            if (originalImage) {
                processImage();
            }
        });
    }

    // Dither intensity
    const ditherIntensity = document.getElementById('dither-intensity');
    if (ditherIntensity) {
        ditherIntensity.addEventListener('input', (e) => {
            settings.ditherIntensity = parseInt(e.target.value) / 100;
            render();
        });
    }

    // Color palette management
    const colorPaletteList = document.getElementById('color-palette-list');
    const addColorBtn = document.getElementById('add-color-btn');
    
    function renderColorPalette() {
        if (!colorPaletteList) return;
        colorPaletteList.innerHTML = '';
        
        settings.colors.forEach((color, index) => {
            const colorItem = document.createElement('div');
            colorItem.style.display = 'flex';
            colorItem.style.alignItems = 'center';
            colorItem.style.gap = '8px';
            colorItem.style.marginBottom = '4px';
            
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = color;
            colorInput.addEventListener('change', (e) => {
                settings.colors[index] = e.target.value;
                render();
            });
            
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.type = 'button';
            removeBtn.style.padding = '2px 6px';
            removeBtn.addEventListener('click', () => {
                if (settings.colors.length > 2) {
                    settings.colors.splice(index, 1);
                    renderColorPalette();
                    render();
                }
            });
            
            colorItem.appendChild(colorInput);
            colorItem.appendChild(removeBtn);
            colorPaletteList.appendChild(colorItem);
        });
    }

    if (addColorBtn) {
        addColorBtn.addEventListener('click', () => {
            // Add a new color - pick a random color or use the last color
            const lastColor = settings.colors[settings.colors.length - 1];
            settings.colors.push(lastColor || '#808080');
            renderColorPalette();
            render();
        });
    }

    // Initialize color palette
    if (colorPaletteList) {
        renderColorPalette();
    }

    // Background controls
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        const transparentBg = document.getElementById('transparent-bg');
        const bgColor = document.getElementById('bg-color');
        const bgImage = document.getElementById('bg-image');
        const clearBgImage = document.getElementById('clear-bg-image');
        const bgFit = document.getElementById('bg-fit');

        if (transparentBg) {
            transparentBg.addEventListener('change', (e) => {
                window.Chatooly.backgroundManager.setTransparent(e.target.checked);
                const bgColorGroup = document.getElementById('bg-color-group');
                if (bgColorGroup) {
                    bgColorGroup.style.display = e.target.checked ? 'none' : 'block';
                }
                render();
            });
        }

        if (bgColor) {
            bgColor.addEventListener('input', (e) => {
                window.Chatooly.backgroundManager.setBackgroundColor(e.target.value);
                render();
            });
        }

        if (bgImage) {
            bgImage.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await window.Chatooly.backgroundManager.setBackgroundImage(file);
                    if (clearBgImage) clearBgImage.style.display = 'block';
                    const bgFitGroup = document.getElementById('bg-fit-group');
                    if (bgFitGroup) bgFitGroup.style.display = 'block';
                    render();
                }
            });
        }

        if (clearBgImage) {
            clearBgImage.addEventListener('click', () => {
                window.Chatooly.backgroundManager.clearBackgroundImage();
                clearBgImage.style.display = 'none';
                const bgFitGroup = document.getElementById('bg-fit-group');
                if (bgFitGroup) bgFitGroup.style.display = 'none';
                if (bgImage) bgImage.value = '';
                render();
            });
        }

        if (bgFit) {
            bgFit.addEventListener('change', (e) => {
                window.Chatooly.backgroundManager.setFit(e.target.value);
                render();
            });
        }
    }

    // Canvas resize handling
    document.addEventListener('chatooly:canvas-resized', (e) => {
        if (!ditherData) return;
        
        const oldWidth = previousCanvasSize.width;
        const oldHeight = previousCanvasSize.height;
        const newWidth = e.detail.canvas.width;
        const newHeight = e.detail.canvas.height;
        
        previousCanvasSize = { width: newWidth, height: newHeight };
        render();
    });

    // Pause animation when page is hidden to save resources
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && settings.animated) {
            stopAnimation();
        } else if (!document.hidden && settings.animated && !animationId) {
            animate();
        }
    });
});

// ========== HIGH-RESOLUTION EXPORT ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!ditherData || !originalImage) {
        console.warn('No image loaded for high-res export');
        return;
    }

    const exportCtx = targetCanvas.getContext('2d');
    const scaledWidth = canvas.width * scale;
    const scaledHeight = canvas.height * scale;
    targetCanvas.width = scaledWidth;
    targetCanvas.height = scaledHeight;

    // Scale context first, then draw everything in scaled coordinates
    exportCtx.scale(scale, scale);

    // Draw background first
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.drawToCanvas(exportCtx, canvas.width, canvas.height);
    } else {
        exportCtx.fillStyle = '#1a1a1a';
        exportCtx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const chars = settings.characters || '░';
    const numChars = chars.length;
    const cellSize = settings.cellSize;
    
    // Calculate drawing area based on fill mode (same logic as render)
    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = ditherData.width / ditherData.height;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (settings.ditherFillMode === 'fill') {
        drawWidth = canvas.width;
        drawHeight = canvas.height;
        drawX = 0;
        drawY = 0;
    } else if (settings.ditherFillMode === 'cover') {
        if (imageAspect > canvasAspect) {
            drawHeight = canvas.height;
            drawWidth = canvas.height * imageAspect;
            drawX = (canvas.width - drawWidth) / 2;
            drawY = 0;
        } else {
            drawWidth = canvas.width;
            drawHeight = canvas.width / imageAspect;
            drawX = 0;
            drawY = (canvas.height - drawHeight) / 2;
        }
    } else { // 'contain'
        if (imageAspect > canvasAspect) {
            drawWidth = canvas.width;
            drawHeight = canvas.width / imageAspect;
            drawX = 0;
            drawY = (canvas.height - drawHeight) / 2;
        } else {
            drawWidth = canvas.height * imageAspect;
            drawHeight = canvas.height;
            drawX = (canvas.width - drawWidth) / 2;
            drawY = 0;
        }
    }

    const scaleX = drawWidth / ditherData.width;
    const scaleY = drawHeight / ditherData.height;

    const cols = Math.ceil(drawWidth / cellSize);
    const rows = Math.ceil(drawHeight / cellSize);
    
    const fontSize = cellSize * 0.9;
    exportCtx.font = `${fontSize}px monospace`;
    exportCtx.textAlign = 'center';
    exportCtx.textBaseline = 'middle';
    exportCtx.fillStyle = settings.monochrome ? '#FFFFFF' : (settings.useMultiColor && settings.colors.length > 0 ? settings.colors[0] : settings.colorLight);

    // No animation offset for static export
    const animOffset = 0;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const pixelX = Math.floor((col * settings.cellSize) / scaleX);
            const pixelY = Math.floor((row * settings.cellSize) / scaleY);
            
            if (pixelX >= ditherData.width || pixelY >= ditherData.height) continue;

            const pixel = ditherData.pixels[pixelY * ditherData.width + pixelX];
            if (!pixel) continue;

            const threshold = getDitherThreshold(pixelX, pixelY);
            const ditheredBrightness = pixel.brightness + (threshold - 0.5) * settings.ditherIntensity;
            const clampedBrightness = Math.max(0, Math.min(1, ditheredBrightness));

            let charIndex = Math.floor(clampedBrightness * numChars);
            if (charIndex >= numChars) charIndex = numChars - 1;
            charIndex = (charIndex + animOffset) % numChars;

            if (settings.monochrome) {
                exportCtx.fillStyle = '#FFFFFF';
            } else if (settings.colors.length > 1) {
                // Multi-color interpolation across color palette
                const brightness = clampedBrightness;
                const colorCount = settings.colors.length;
                const segmentSize = 1 / (colorCount - 1);
                const segmentIndex = Math.min(Math.floor(brightness / segmentSize), colorCount - 2);
                const segmentProgress = (brightness - segmentIndex * segmentSize) / segmentSize;
                
                const color1 = settings.colors[segmentIndex];
                const color2 = settings.colors[segmentIndex + 1];
                
                const r1 = parseInt(color1.slice(1, 3), 16);
                const g1 = parseInt(color1.slice(3, 5), 16);
                const b1 = parseInt(color1.slice(5, 7), 16);
                const r2 = parseInt(color2.slice(1, 3), 16);
                const g2 = parseInt(color2.slice(3, 5), 16);
                const b2 = parseInt(color2.slice(5, 7), 16);
                
                const r = Math.round(r1 + (r2 - r1) * segmentProgress);
                const g = Math.round(g1 + (g2 - g1) * segmentProgress);
                const b = Math.round(b1 + (b2 - b1) * segmentProgress);
                
                exportCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            } else {
                const brightness = clampedBrightness;
                const r1 = parseInt(settings.colorDark.slice(1, 3), 16);
                const g1 = parseInt(settings.colorDark.slice(3, 5), 16);
                const b1 = parseInt(settings.colorDark.slice(5, 7), 16);
                const r2 = parseInt(settings.colorLight.slice(1, 3), 16);
                const g2 = parseInt(settings.colorLight.slice(3, 5), 16);
                const b2 = parseInt(settings.colorLight.slice(5, 7), 16);
                
                const r = Math.round(r1 + (r2 - r1) * brightness);
                const g = Math.round(g1 + (g2 - g1) * brightness);
                const b = Math.round(b1 + (b2 - b1) * brightness);
                
                exportCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            }

            const x = drawX + col * cellSize + cellSize / 2;
            const y = drawY + row * cellSize + cellSize / 2;
            
            exportCtx.fillText(chars[charIndex], x, y);
        }
    }

    console.log(`High-res export completed at ${scale}x resolution`);
};
