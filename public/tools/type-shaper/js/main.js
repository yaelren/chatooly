/*
 * Type Shaper - Main Logic
 * Converts text into letters made of geometric shapes
 */

// ========== CANVAS INITIALIZATION ==========
// CRITICAL: Set canvas dimensions BEFORE Chatooly CDN initializes
const canvas = document.getElementById('chatooly-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 1920;   // HD resolution width (1920x1080)
canvas.height = 1080;  // HD resolution height

// ========== STATE MANAGEMENT ==========
let textData = {
    text: 'Type Shaper',
    fillMode: 'shapes',  // 'shapes' or 'image'
    shapeType: 'dots',  // 'dots', 'lines', 'circles'
    shapeSize: 5,
    spacing: 1.0,
    fontSize: 200,
    fontFamily: 'Arial',
    lineHeight: 1.2,
    shapeColor: '#000000',
    textOffsetX: 0,  // X position offset (-50% to +50% of canvas width)
    textOffsetY: 0,  // Y position offset (-50% to +50% of canvas height)
    previousCanvasSize: { width: 0, height: 0 },
    isAnimating: false,
    animationSpeed: 1.0,
    animationTime: 0,
    hoverEffectEnabled: false,
    hoverRadius: 150,
    hoverIntensity: 2.0,
    mouseX: null,
    mouseY: null,
    // Auto mode settings
    interactionMode: 'mouse',  // 'mouse' or 'auto'
    autoPattern: 'infinity',   // 'sine', 'infinity', 'circle', 'random', 'trace'
    autoSpeed: 1,
    autoSize: 5,
    autoDebug: false,
    autoTime: 0
};

// Cache for text points (recalculated when text/size changes)
let cachedPoints = null;
let animationFrameId = null;
let tileImage = null;  // Loaded image for tiling
let hoverAnimationFrameId = null;  // For hover effect continuous rendering

// Random pattern state
let randomTarget = { x: 0, y: 0 };
let randomCurrent = { x: 0, y: 0 };
let randomLastTime = 0;
let randomInitialized = false;

// Trace pattern state
let traceIndex = 0;

// ========== BACKGROUND SYSTEM ==========
// Initialize background manager
window.addEventListener('DOMContentLoaded', () => {
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.init(canvas);

        // Connect background controls - using toggle-change event for the new toggle button
        document.getElementById('transparent-bg').addEventListener('toggle-change', (e) => {
            Chatooly.backgroundManager.setTransparent(e.detail.checked);
            document.getElementById('bg-color-group').style.display = e.detail.checked ? 'none' : 'block';
            render();
        });

        document.getElementById('bg-color').addEventListener('input', (e) => {
            Chatooly.backgroundManager.setBackgroundColor(e.target.value);
            render();
        });

        document.getElementById('bg-image').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await Chatooly.backgroundManager.setBackgroundImage(file);
                document.getElementById('clear-bg-image').style.display = 'block';
                document.getElementById('bg-fit-group').style.display = 'block';
                render();
            }
        });

        document.getElementById('clear-bg-image').addEventListener('click', () => {
            Chatooly.backgroundManager.clearBackgroundImage();
            document.getElementById('clear-bg-image').style.display = 'none';
            document.getElementById('bg-fit-group').style.display = 'none';
            document.getElementById('bg-image').value = '';
            render();
        });

        document.getElementById('bg-fit').addEventListener('change', (e) => {
            Chatooly.backgroundManager.setFit(e.target.value);
            render();
        });
    }
});

// ========== TEXT TO SHAPES RENDERING ==========

// Get all points along the text outline (supports multiline)
function getTextPoints(text, fontSize, spacing) {
    const points = [];

    // Create a temporary canvas to measure and draw text
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Set font with custom font family
    tempCtx.font = `bold ${fontSize}px ${textData.fontFamily}, sans-serif`;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillStyle = '#FFFFFF';

    // Split text into lines
    const lines = text.split('\n');
    const lineHeightPixels = fontSize * textData.lineHeight;

    // Calculate total text height for proper vertical centering
    const totalTextHeight = fontSize + (lines.length - 1) * lineHeightPixels;
    // Apply position offsets (percentage of canvas dimensions)
    const offsetX = (textData.textOffsetX / 100) * canvas.width;
    const offsetY = (textData.textOffsetY / 100) * canvas.height;
    const startY = (canvas.height / 2) - (totalTextHeight / 2) + (fontSize / 2) + offsetY;
    const centerX = (canvas.width / 2) + offsetX;

    // Draw each line
    lines.forEach((line, index) => {
        const y = startY + (index * lineHeightPixels);
        tempCtx.fillText(line, centerX, y);
    });

    // Sample pixels from the filled text
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    // Sample points based on spacing
    const step = spacing;

    // Scan the entire canvas for text pixels
    for (let y = 0; y < tempCanvas.height; y += step) {
        for (let x = 0; x < tempCanvas.width; x += step) {
            const px = Math.floor(x);
            const py = Math.floor(y);

            if (px >= 0 && px < tempCanvas.width && py >= 0 && py < tempCanvas.height) {
                const index = (py * tempCanvas.width + px) * 4;
                const alpha = data[index + 3];

                // If pixel is part of the text (alpha > 0)
                if (alpha > 128) {
                    points.push({ x: px, y: py });
                }
            }
        }
    }

    return points;
}

// ========== AUTO POSITION PATTERNS ==========
function getAutoPosition(time, pattern) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const speed = textData.autoSpeed * 0.0003;
    const t = time * speed;
    const sizeMultiplier = textData.autoSize * 0.1;

    let position = { x: centerX, y: centerY };

    switch (pattern) {
        case 'sine':
            // Horizontal wave with vertical bob
            position = {
                x: centerX + Math.sin(t) * (canvas.width * 0.35 * sizeMultiplier),
                y: centerY + Math.sin(t * 2) * (50 * sizeMultiplier)
            };
            break;

        case 'infinity':
            // Figure-8 / Lissajous curve
            position = {
                x: centerX + Math.sin(t) * (canvas.width * 0.3 * sizeMultiplier),
                y: centerY + Math.sin(t * 2) * (canvas.height * 0.2 * sizeMultiplier)
            };
            break;

        case 'circle':
            // Circular/elliptical motion
            position = {
                x: centerX + Math.cos(t) * (canvas.width * 0.3 * sizeMultiplier),
                y: centerY + Math.sin(t) * (canvas.height * 0.25 * sizeMultiplier)
            };
            break;

        case 'random':
            // Random point-to-point with easing
            const rangeX = canvas.width * 0.4 * sizeMultiplier;
            const rangeY = canvas.height * 0.35 * sizeMultiplier;

            if (!randomInitialized) {
                randomCurrent.x = centerX;
                randomCurrent.y = centerY;
                randomTarget.x = centerX + (Math.random() * 2 - 1) * rangeX;
                randomTarget.y = centerY + (Math.random() * 2 - 1) * rangeY;
                randomInitialized = true;
            }

            // Change target periodically
            const interval = 3000 / textData.autoSpeed;
            if (time - randomLastTime > interval) {
                randomTarget.x = centerX + (Math.random() * 2 - 1) * rangeX;
                randomTarget.y = centerY + (Math.random() * 2 - 1) * rangeY;
                randomLastTime = time;
            }

            // Smooth easing toward target
            const easeSpeed = 0.02 + (textData.autoSpeed * 0.008);
            randomCurrent.x += (randomTarget.x - randomCurrent.x) * easeSpeed;
            randomCurrent.y += (randomTarget.y - randomCurrent.y) * easeSpeed;

            position = {
                x: randomCurrent.x,
                y: randomCurrent.y
            };
            break;

        case 'trace':
            // Follow the letter outlines using cached points
            if (cachedPoints && cachedPoints.length > 0) {
                // Calculate how many points to move through based on speed
                const pointsPerFrame = Math.max(1, Math.floor(textData.autoSpeed * 2));
                traceIndex = (traceIndex + pointsPerFrame) % cachedPoints.length;

                const point = cachedPoints[traceIndex];
                position = { x: point.x, y: point.y };
            }
            break;
    }

    return position;
}

// Calculate scale factor based on distance to mouse/auto position
function getHoverScale(pointX, pointY, mouseX, mouseY, radius, intensity) {
    if (mouseX === null || mouseY === null || !textData.hoverEffectEnabled) {
        return 1.0;
    }

    const dx = pointX - mouseX;
    const dy = pointY - mouseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= radius) {
        return 1.0; // No scaling outside radius
    }

    // Calculate scale factor (1.0 at edge, intensity at center)
    const normalizedDistance = distance / radius;
    let scale;

    if (intensity >= 1.0) {
        // Positive magnification: scale from 1.0 up to intensity
        scale = 1.0 + (intensity - 1.0) * (1 - normalizedDistance);
    } else {
        // Negative magnification: scale from 1.0 down (shrinks)
        const shrinkAmount = Math.abs(intensity);
        const minScale = Math.max(0.1, 1.0 / (shrinkAmount + 1));
        scale = 1.0 - (1.0 - minScale) * (1 - normalizedDistance);
    }

    // Ensure scale never goes below 0.1 to prevent invisible shapes
    return Math.max(0.1, scale);
}

// Draw shapes or image tiles at points with optional rotation
function drawShapes(ctx, points, fillMode, shapeType, shapeSize, color, rotationAngle = 0) {
    if (fillMode === 'image' && tileImage) {
        // Draw image tiles
        const baseTileSize = shapeSize * 2;

        points.forEach((point, index) => {
            // Calculate hover scale
            const hoverScale = getHoverScale(
                point.x, point.y,
                textData.mouseX, textData.mouseY,
                textData.hoverRadius, textData.hoverIntensity
            );
            const tileSize = baseTileSize * hoverScale;

            // Each tile rotates at slightly different phase for variety
            const phase = (index * 0.1) % (Math.PI * 2);
            const angle = rotationAngle + phase;

            ctx.save();
            ctx.translate(point.x, point.y);
            ctx.rotate(angle);

            // Draw image centered
            ctx.drawImage(
                tileImage,
                -tileSize / 2,
                -tileSize / 2,
                tileSize,
                tileSize
            );

            ctx.restore();
        });
    } else {
        // Draw shapes
        ctx.fillStyle = color;
        ctx.strokeStyle = color;

        points.forEach((point, index) => {
            // Calculate hover scale
            const hoverScale = getHoverScale(
                point.x, point.y,
                textData.mouseX, textData.mouseY,
                textData.hoverRadius, textData.hoverIntensity
            );
            const scaledShapeSize = shapeSize * hoverScale;

            // Each shape rotates at slightly different phase for variety
            const phase = (index * 0.1) % (Math.PI * 2);
            const angle = rotationAngle + phase;

            ctx.save();
            ctx.translate(point.x, point.y);

            if (shapeType === 'dots') {
                // Dots rotate around themselves (circular fill)
                ctx.beginPath();
                ctx.arc(0, 0, scaledShapeSize / 2, 0, Math.PI * 2);
                ctx.fill();

                // Add a small marker to show rotation for dots
                if (rotationAngle !== 0) {
                    ctx.beginPath();
                    ctx.moveTo(0, -scaledShapeSize / 2);
                    ctx.lineTo(0, -scaledShapeSize / 2 - 2);
                    ctx.stroke();
                }
            } else if (shapeType === 'lines') {
                // Lines rotate around their center
                const length = scaledShapeSize;
                ctx.rotate(angle);
                ctx.beginPath();
                ctx.moveTo(-length / 2, 0);
                ctx.lineTo(length / 2, 0);
                ctx.lineWidth = 2;
                ctx.stroke();
            } else if (shapeType === 'circles') {
                // Circles rotate around themselves
                ctx.beginPath();
                ctx.arc(0, 0, scaledShapeSize / 2, 0, Math.PI * 2);
                ctx.stroke();

                // Add a marker line to show rotation
                if (rotationAngle !== 0) {
                    ctx.rotate(angle);
                    ctx.beginPath();
                    ctx.moveTo(0, -scaledShapeSize / 2);
                    ctx.lineTo(0, -scaledShapeSize / 2 - 3);
                    ctx.stroke();
                }
            }

            ctx.restore();
        });
    }

    // Draw debug circle for auto mode
    if (textData.autoDebug && textData.interactionMode === 'auto' && textData.mouseX !== null) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(textData.mouseX, textData.mouseY, textData.hoverRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw center dot
        ctx.beginPath();
        ctx.arc(textData.mouseX, textData.mouseY, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fill();
        ctx.restore();
    }
}

// Main render function
function render(rotationAngle = 0) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background FIRST
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.drawToCanvas(ctx, canvas.width, canvas.height);
    }

    // Recalculate points if needed (when text/size changes)
    if (!cachedPoints) {
        cachedPoints = getTextPoints(textData.text, textData.fontSize, textData.shapeSize * textData.spacing);
    }

    // Draw shapes or images with rotation
    drawShapes(ctx, cachedPoints, textData.fillMode, textData.shapeType, textData.shapeSize, textData.shapeColor, rotationAngle);
}

// Animation loop
function animate() {
    if (!textData.isAnimating) {
        animationFrameId = null;
        return;
    }

    // Update animation time
    textData.animationTime += 0.016 * textData.animationSpeed; // ~60fps

    // Update auto position if hover effect is enabled in auto mode
    if (textData.hoverEffectEnabled && textData.interactionMode === 'auto') {
        textData.autoTime += 16; // ~60fps
        const autoPos = getAutoPosition(textData.autoTime, textData.autoPattern);
        textData.mouseX = autoPos.x;
        textData.mouseY = autoPos.y;
    }

    // Render with rotation (hover effect is automatically included in render)
    const rotationAngle = textData.animationTime;
    render(rotationAngle);

    // Continue animation
    animationFrameId = requestAnimationFrame(animate);
}

// Start/stop animation
function startAnimation() {
    if (!textData.isAnimating) {
        // Stop hover rendering when animation starts
        if (window.stopHoverRendering) {
            window.stopHoverRendering();
        }

        textData.isAnimating = true;
        textData.animationTime = 0;
        animate();
    }
}

function stopAnimation() {
    if (textData.isAnimating) {
        textData.isAnimating = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        // Render static frame
        render(0);

        // Resume hover rendering if enabled
        if (textData.hoverEffectEnabled && window.startHoverRendering) {
            window.startHoverRendering();
        }
    }
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Text input (now textarea for multiline)
    document.getElementById('text-input').addEventListener('input', (e) => {
        textData.text = e.target.value || ' ';
        cachedPoints = null; // Force recalculation
        traceIndex = 0; // Reset trace
        if (textData.isAnimating) {
            render(textData.animationTime);
        } else {
            render();
        }
    });

    // Font selector
    const fontSelector = document.getElementById('font-selector');
    if (fontSelector) {
        fontSelector.addEventListener('change', (e) => {
            textData.fontFamily = e.target.value;
            cachedPoints = null;
            traceIndex = 0;
            if (textData.isAnimating) {
                render(textData.animationTime);
            } else {
                render();
            }
        });
    }

    // Custom font upload
    const customFontInput = document.getElementById('custom-font-input');
    if (customFontInput) {
        customFontInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                const fontDataUrl = event.target.result;
                const fontName = 'UploadedFont_' + Date.now();

                // Create @font-face rule dynamically
                const newStyle = document.createElement('style');
                newStyle.textContent = `@font-face { font-family: '${fontName}'; src: url(${fontDataUrl}); }`;
                document.head.appendChild(newStyle);

                // Add to font selector dropdown
                if (fontSelector) {
                    const option = document.createElement('option');
                    option.value = fontName;
                    option.textContent = file.name;
                    fontSelector.appendChild(option);
                    fontSelector.value = fontName;
                    textData.fontFamily = fontName;

                    // Wait for font to load before rendering
                    try {
                        await document.fonts.load(`bold ${textData.fontSize}px ${fontName}`);
                    } catch (err) {
                        console.warn('Font load warning:', err);
                    }

                    cachedPoints = null;
                    traceIndex = 0;
                    if (textData.isAnimating) {
                        render(textData.animationTime);
                    } else {
                        render();
                    }
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Line height
    const lineHeightInput = document.getElementById('line-height');
    const lineHeightValue = document.getElementById('line-height-value');
    if (lineHeightInput) {
        lineHeightInput.addEventListener('input', (e) => {
            textData.lineHeight = parseFloat(e.target.value);
            if (lineHeightValue) lineHeightValue.textContent = textData.lineHeight.toFixed(1);
            cachedPoints = null;
            traceIndex = 0;
            if (textData.isAnimating) {
                render(textData.animationTime);
            } else {
                render();
            }
        });
    }

    // Text position X offset
    const textOffsetXInput = document.getElementById('text-offset-x');
    const textOffsetXValue = document.getElementById('text-offset-x-value');
    if (textOffsetXInput) {
        textOffsetXInput.addEventListener('input', (e) => {
            textData.textOffsetX = parseInt(e.target.value);
            if (textOffsetXValue) textOffsetXValue.textContent = textData.textOffsetX;
            cachedPoints = null;
            traceIndex = 0;
            if (textData.isAnimating) {
                render(textData.animationTime);
            } else {
                render();
            }
        });
    }

    // Text position Y offset
    const textOffsetYInput = document.getElementById('text-offset-y');
    const textOffsetYValue = document.getElementById('text-offset-y-value');
    if (textOffsetYInput) {
        textOffsetYInput.addEventListener('input', (e) => {
            textData.textOffsetY = parseInt(e.target.value);
            if (textOffsetYValue) textOffsetYValue.textContent = textData.textOffsetY;
            cachedPoints = null;
            traceIndex = 0;
            if (textData.isAnimating) {
                render(textData.animationTime);
            } else {
                render();
            }
        });
    }

    // Fill mode (shapes vs image)
    const fillModeSelect = document.getElementById('fill-mode');
    const shapeTypeGroup = document.getElementById('shape-type-group');
    const imageUploadGroup = document.getElementById('image-upload-group');
    const shapeColorGroup = document.getElementById('shape-color-group');

    fillModeSelect.addEventListener('change', (e) => {
        textData.fillMode = e.target.value;

        // Show/hide relevant controls
        if (textData.fillMode === 'image') {
            if (shapeTypeGroup) shapeTypeGroup.style.display = 'none';
            if (imageUploadGroup) imageUploadGroup.style.display = 'block';
            if (shapeColorGroup) shapeColorGroup.style.display = 'none';
        } else {
            if (shapeTypeGroup) shapeTypeGroup.style.display = 'block';
            if (imageUploadGroup) imageUploadGroup.style.display = 'none';
            if (shapeColorGroup) shapeColorGroup.style.display = 'block';
        }

        cachedPoints = null; // Force recalculation
        if (textData.isAnimating) {
            render(textData.animationTime);
        } else {
            render();
        }
    });

    // Shape type
    document.getElementById('shape-type').addEventListener('change', (e) => {
        textData.shapeType = e.target.value;
        cachedPoints = null; // Force recalculation
        if (textData.isAnimating) {
            render(textData.animationTime);
        } else {
            render();
        }
    });

    // Tile image upload
    const tileImageInput = document.getElementById('tile-image');
    const clearTileImageBtn = document.getElementById('clear-tile-image');

    tileImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    tileImage = img;
                    clearTileImageBtn.style.display = 'block';
                    cachedPoints = null; // Force recalculation
                    if (textData.isAnimating) {
                        render(textData.animationTime);
                    } else {
                        render();
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Clear tile image
    clearTileImageBtn.addEventListener('click', () => {
        tileImage = null;
        tileImageInput.value = '';
        clearTileImageBtn.style.display = 'none';
        cachedPoints = null; // Force recalculation
        if (textData.isAnimating) {
            render(textData.animationTime);
        } else {
            render();
        }
    });

    // Shape size
    const shapeSizeInput = document.getElementById('shape-size');
    const shapeSizeValue = document.getElementById('shape-size-value');
    shapeSizeInput.addEventListener('input', (e) => {
        textData.shapeSize = parseInt(e.target.value);
        shapeSizeValue.textContent = textData.shapeSize;
        cachedPoints = null; // Force recalculation
        if (textData.isAnimating) {
            render(textData.animationTime);
        } else {
            render();
        }
    });

    // Spacing
    const spacingInput = document.getElementById('spacing');
    const spacingValue = document.getElementById('spacing-value');
    spacingInput.addEventListener('input', (e) => {
        textData.spacing = parseFloat(e.target.value);
        spacingValue.textContent = textData.spacing.toFixed(1);
        cachedPoints = null; // Force recalculation
        if (textData.isAnimating) {
            render(textData.animationTime);
        } else {
            render();
        }
    });

    // Font size
    const fontSizeInput = document.getElementById('font-size');
    const fontSizeValue = document.getElementById('font-size-value');
    fontSizeInput.addEventListener('input', (e) => {
        textData.fontSize = parseInt(e.target.value);
        fontSizeValue.textContent = textData.fontSize;
        cachedPoints = null; // Force recalculation
        if (textData.isAnimating) {
            render(textData.animationTime);
        } else {
            render();
        }
    });

    // Shape color
    document.getElementById('shape-color').addEventListener('input', (e) => {
        textData.shapeColor = e.target.value;
        if (textData.isAnimating) {
            render(textData.animationTime);
        } else {
            render();
        }
    });

    // Animation toggle - using toggle-change event for the new toggle button
    const animateToggle = document.getElementById('animate-shapes');
    const animationSpeedGroup = document.getElementById('animation-speed-group');
    animateToggle.addEventListener('toggle-change', (e) => {
        if (e.detail.checked) {
            animationSpeedGroup.style.display = 'block';
            startAnimation();
        } else {
            animationSpeedGroup.style.display = 'none';
            stopAnimation();
        }
    });

    // Animation speed
    const animationSpeedInput = document.getElementById('animation-speed');
    const animationSpeedValue = document.getElementById('animation-speed-value');
    animationSpeedInput.addEventListener('input', (e) => {
        textData.animationSpeed = parseFloat(e.target.value);
        animationSpeedValue.textContent = textData.animationSpeed.toFixed(1);
    });

    // Hover effect toggle - using toggle-change event for the new toggle button
    const hoverEffectToggle = document.getElementById('hover-effect');
    const hoverControlsGroup = document.getElementById('hover-controls-group');

    hoverEffectToggle.addEventListener('toggle-change', (e) => {
        textData.hoverEffectEnabled = e.detail.checked;

        if (textData.hoverEffectEnabled) {
            if (hoverControlsGroup) hoverControlsGroup.style.display = 'block';
            if (window.startHoverRendering) {
                window.startHoverRendering();
            }
        } else {
            if (hoverControlsGroup) hoverControlsGroup.style.display = 'none';
            if (window.stopHoverRendering) {
                window.stopHoverRendering();
            }
            // Clear mouse position and re-render
            textData.mouseX = null;
            textData.mouseY = null;
            if (textData.isAnimating) {
                render(textData.animationTime);
            } else {
                render();
            }
        }
    });

    // Interaction mode buttons (Mouse vs Auto)
    const modeMouseBtn = document.getElementById('mode-mouse');
    const modeAutoBtn = document.getElementById('mode-auto');
    const autoModeControls = document.getElementById('auto-mode-controls');

    if (modeMouseBtn && modeAutoBtn) {
        modeMouseBtn.addEventListener('click', () => {
            textData.interactionMode = 'mouse';
            modeMouseBtn.classList.add('active');
            modeAutoBtn.classList.remove('active');
            if (autoModeControls) autoModeControls.style.display = 'none';
            // Reset mouse position
            textData.mouseX = null;
            textData.mouseY = null;
        });

        modeAutoBtn.addEventListener('click', () => {
            textData.interactionMode = 'auto';
            modeAutoBtn.classList.add('active');
            modeMouseBtn.classList.remove('active');
            if (autoModeControls) autoModeControls.style.display = 'block';
            textData.autoTime = 0;
            randomInitialized = false;
            traceIndex = 0;
        });
    }

    // Auto pattern selector
    const autoPatternSelect = document.getElementById('auto-pattern');
    if (autoPatternSelect) {
        autoPatternSelect.addEventListener('change', (e) => {
            textData.autoPattern = e.target.value;
            randomInitialized = false;
            traceIndex = 0;
        });
    }

    // Auto speed (now supports decimal values for slower speeds)
    const autoSpeedInput = document.getElementById('auto-speed');
    const autoSpeedValue = document.getElementById('auto-speed-value');
    if (autoSpeedInput) {
        autoSpeedInput.addEventListener('input', (e) => {
            textData.autoSpeed = parseFloat(e.target.value);
            if (autoSpeedValue) autoSpeedValue.textContent = textData.autoSpeed.toFixed(1);
        });
    }

    // Auto size
    const autoSizeInput = document.getElementById('auto-size');
    const autoSizeValue = document.getElementById('auto-size-value');
    if (autoSizeInput) {
        autoSizeInput.addEventListener('input', (e) => {
            textData.autoSize = parseInt(e.target.value);
            if (autoSizeValue) autoSizeValue.textContent = textData.autoSize;
        });
    }

    // Auto debug toggle
    const autoDebugToggle = document.getElementById('auto-debug');
    if (autoDebugToggle) {
        autoDebugToggle.addEventListener('toggle-change', (e) => {
            textData.autoDebug = e.detail.checked;
        });
    }

    // Hover radius
    const hoverRadiusInput = document.getElementById('hover-radius');
    const hoverRadiusValue = document.getElementById('hover-radius-value');
    hoverRadiusInput.addEventListener('input', (e) => {
        textData.hoverRadius = parseInt(e.target.value);
        hoverRadiusValue.textContent = textData.hoverRadius;
    });

    // Hover intensity
    const hoverIntensityInput = document.getElementById('hover-intensity');
    const hoverIntensityValue = document.getElementById('hover-intensity-value');
    hoverIntensityInput.addEventListener('input', (e) => {
        textData.hoverIntensity = parseFloat(e.target.value);
        hoverIntensityValue.textContent = textData.hoverIntensity.toFixed(1);
    });

    // Mouse tracking for hover effect
    function updateMousePosition(e) {
        if (!textData.hoverEffectEnabled || textData.interactionMode !== 'mouse') return;

        // Use Chatooly's mouse coordinate mapping if available
        const coords = window.Chatooly ?
            window.Chatooly.utils.mapMouseToCanvas(e, canvas) :
            fallbackMouseMapping(e);

        textData.mouseX = coords.x;
        textData.mouseY = coords.y;
    }

    function fallbackMouseMapping(e) {
        const rect = canvas.getBoundingClientRect();
        const displayX = e.clientX - rect.left;
        const displayY = e.clientY - rect.top;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: displayX * scaleX, y: displayY * scaleY };
    }

    canvas.addEventListener('mousemove', updateMousePosition);
    canvas.addEventListener('mouseleave', () => {
        if (textData.interactionMode === 'mouse') {
            textData.mouseX = null;
            textData.mouseY = null;
            if (textData.hoverEffectEnabled && !textData.isAnimating) {
                render();
            }
        }
    });

    // Hover rendering loop (when hover is enabled but animation is not)
    function startHoverRendering() {
        stopHoverRendering(); // Clear any existing loop

        if (textData.hoverEffectEnabled && !textData.isAnimating) {
            function hoverRenderLoop() {
                if (!textData.hoverEffectEnabled || textData.isAnimating) {
                    hoverAnimationFrameId = null;
                    return;
                }

                // Update auto position if in auto mode
                if (textData.interactionMode === 'auto') {
                    textData.autoTime += 16; // ~60fps
                    const autoPos = getAutoPosition(textData.autoTime, textData.autoPattern);
                    textData.mouseX = autoPos.x;
                    textData.mouseY = autoPos.y;
                }

                render();
                hoverAnimationFrameId = requestAnimationFrame(hoverRenderLoop);
            }
            hoverAnimationFrameId = requestAnimationFrame(hoverRenderLoop);
        }
    }

    function stopHoverRendering() {
        if (hoverAnimationFrameId) {
            cancelAnimationFrame(hoverAnimationFrameId);
            hoverAnimationFrameId = null;
        }
    }

    // Store references for animation toggle handlers
    window.startHoverRendering = startHoverRendering;
    window.stopHoverRendering = stopHoverRendering;

    // Canvas resize handling
    document.addEventListener('chatooly:canvas-resized', (e) => {
        if (textData.text && textData.text.trim()) {
            const oldWidth = textData.previousCanvasSize.width;
            const oldHeight = textData.previousCanvasSize.height;
            const newWidth = e.detail.canvas.width;
            const newHeight = e.detail.canvas.height;

            if (oldWidth === 0 || oldHeight === 0) {
                textData.previousCanvasSize = { width: newWidth, height: newHeight };
                cachedPoints = null; // Force recalculation
                if (textData.isAnimating) {
                    render(textData.animationTime);
                } else {
                    render();
                }
                return;
            }

            // Update canvas size tracking
            textData.previousCanvasSize = { width: newWidth, height: newHeight };
            cachedPoints = null; // Force recalculation

            // Re-render (text will auto-center)
            if (textData.isAnimating) {
                render(textData.animationTime);
            } else {
                render();
            }
        }
    });

    // Initial canvas size tracking
    textData.previousCanvasSize = { width: canvas.width, height: canvas.height };
}

// ========== HIGH-RESOLUTION EXPORT ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!textData.text || !textData.text.trim()) {
        console.warn('No text to export');
        return;
    }

    const exportCtx = targetCanvas.getContext('2d');
    const scaledWidth = canvas.width * scale;
    const scaledHeight = canvas.height * scale;

    targetCanvas.width = scaledWidth;
    targetCanvas.height = scaledHeight;

    // Scale context
    exportCtx.scale(scale, scale);

    // Draw background FIRST
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.drawToCanvas(exportCtx, canvas.width, canvas.height);
    }

    // Scale properties for high-res
    const scaledFontSize = textData.fontSize * scale;
    const scaledShapeSize = textData.shapeSize * scale;

    // Get points at high resolution using multiline support
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    tempCtx.font = `bold ${textData.fontSize}px ${textData.fontFamily}, sans-serif`;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillStyle = '#FFFFFF';

    // Split text into lines for multiline support
    const lines = textData.text.split('\n');
    const lineHeightPixels = textData.fontSize * textData.lineHeight;
    const totalTextHeight = textData.fontSize + (lines.length - 1) * lineHeightPixels;
    // Apply position offsets (percentage of canvas dimensions)
    const offsetX = (textData.textOffsetX / 100) * canvas.width;
    const offsetY = (textData.textOffsetY / 100) * canvas.height;
    const startY = (canvas.height / 2) - (totalTextHeight / 2) + (textData.fontSize / 2) + offsetY;
    const centerX = (canvas.width / 2) + offsetX;

    lines.forEach((line, index) => {
        const y = startY + (index * lineHeightPixels);
        tempCtx.fillText(line, centerX, y);
    });

    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    const step = textData.shapeSize * textData.spacing;
    const points = [];

    for (let y = 0; y < tempCanvas.height; y += step) {
        for (let x = 0; x < tempCanvas.width; x += step) {
            const px = Math.floor(x);
            const py = Math.floor(y);

            if (px >= 0 && px < tempCanvas.width && py >= 0 && py < tempCanvas.height) {
                const index = (py * tempCanvas.width + px) * 4;
                const alpha = data[index + 3];

                if (alpha > 128) {
                    points.push({ x: px * scale, y: py * scale });
                }
            }
        }
    }

    // Draw shapes or images at scaled size (static frame - no animation)
    drawShapes(exportCtx, points, textData.fillMode, textData.shapeType, scaledShapeSize, textData.shapeColor, 0);

    console.log(`High-res export completed at ${scale}x resolution`);
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    render();
});
