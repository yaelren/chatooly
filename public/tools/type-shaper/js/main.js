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
    fontSize: 72,
    shapeColor: '#000000',
    previousCanvasSize: { width: 0, height: 0 },
    isAnimating: false,
    animationSpeed: 1.0,
    animationTime: 0,
    hoverEffectEnabled: false,
    hoverRadius: 150,
    hoverIntensity: 2.0,
    mouseX: null,
    mouseY: null
};

// Cache for text points (recalculated when text/size changes)
let cachedPoints = null;
let animationFrameId = null;
let tileImage = null;  // Loaded image for tiling
let hoverAnimationFrameId = null;  // For hover effect continuous rendering

// ========== BACKGROUND SYSTEM ==========
// Initialize background manager
window.addEventListener('DOMContentLoaded', () => {
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.init(canvas);
        
        // Connect background controls
        document.getElementById('transparent-bg').addEventListener('change', (e) => {
            Chatooly.backgroundManager.setTransparent(e.target.checked);
            document.getElementById('bg-color-group').style.display = e.target.checked ? 'none' : 'block';
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

// Get all points along the text outline
function getTextPoints(text, fontSize, spacing) {
    const points = [];
    
    // Create a temporary canvas to measure and draw text
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    // Set font
    tempCtx.font = `bold ${fontSize}px Arial, sans-serif`;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillStyle = '#FFFFFF';
    
    // Measure text
    const metrics = tempCtx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;
    
    // Center the text
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Fill text to get shape
    tempCtx.fillText(text, centerX, centerY);
    
    // Sample pixels from the filled text
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    
    // Sample points based on spacing
    const step = spacing;
    
    for (let y = centerY - textHeight / 2; y < centerY + textHeight / 2; y += step) {
        for (let x = centerX - textWidth / 2; x < centerX + textWidth / 2; x += step) {
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

// Calculate scale factor based on distance to mouse
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
    // Using smooth easing function for gradual effect
    const normalizedDistance = distance / radius;
    let scale;
    
    if (intensity >= 1.0) {
        // Positive magnification: scale from 1.0 up to intensity
        scale = 1.0 + (intensity - 1.0) * (1 - normalizedDistance);
    } else {
        // Negative magnification: scale from 1.0 down (shrinks)
        // intensity = -5 means shrink to ~0.15, intensity = 0 means shrink to 0.5
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
    // Text input
    document.getElementById('text-input').addEventListener('input', (e) => {
        textData.text = e.target.value || ' ';
        cachedPoints = null; // Force recalculation
        if (textData.isAnimating) {
            render(textData.animationTime);
        } else {
            render();
        }
    });
    
    // Fill mode (shapes vs image)
    const fillModeSelect = document.getElementById('fill-mode');
    const shapeTypeGroup = document.getElementById('shape-type-group');
    const imageUploadGroup = document.getElementById('image-upload-group');
    
    fillModeSelect.addEventListener('change', (e) => {
        textData.fillMode = e.target.value;
        
        // Show/hide relevant controls
        if (textData.fillMode === 'image') {
            shapeTypeGroup.style.display = 'none';
            imageUploadGroup.style.display = 'block';
        } else {
            shapeTypeGroup.style.display = 'block';
            imageUploadGroup.style.display = 'none';
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
    
    // Animation toggle
    const animateCheckbox = document.getElementById('animate-shapes');
    const animationSpeedGroup = document.getElementById('animation-speed-group');
    animateCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
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
    
    // Hover effect toggle
    const hoverEffectCheckbox = document.getElementById('hover-effect');
    const hoverEffectGroup = document.getElementById('hover-effect-group');
    const hoverIntensityGroup = document.getElementById('hover-intensity-group');
    
    hoverEffectCheckbox.addEventListener('change', (e) => {
        textData.hoverEffectEnabled = e.target.checked;
        
        if (textData.hoverEffectEnabled) {
            hoverEffectGroup.style.display = 'block';
            hoverIntensityGroup.style.display = 'block';
            if (window.startHoverRendering) {
                window.startHoverRendering();
            }
        } else {
            hoverEffectGroup.style.display = 'none';
            hoverIntensityGroup.style.display = 'none';
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
        if (!textData.hoverEffectEnabled) return;
        
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
        textData.mouseX = null;
        textData.mouseY = null;
        if (textData.hoverEffectEnabled && !textData.isAnimating) {
            render();
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
    
    // Get points at high resolution
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    tempCtx.font = `bold ${textData.fontSize}px Arial, sans-serif`;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillStyle = '#FFFFFF';
    
    const metrics = tempCtx.measureText(textData.text);
    const textWidth = metrics.width;
    const textHeight = textData.fontSize;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    tempCtx.fillText(textData.text, centerX, centerY);
    
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    
    const step = textData.shapeSize * textData.spacing;
    const points = [];
    
    for (let y = centerY - textHeight / 2; y < centerY + textHeight / 2; y += step) {
        for (let x = centerX - textWidth / 2; x < centerX + textWidth / 2; x += step) {
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
    // For high-res export, drawImage will handle scaling automatically
    drawShapes(exportCtx, points, textData.fillMode, textData.shapeType, scaledShapeSize, textData.shapeColor, 0);
    
    console.log(`High-res export completed at ${scale}x resolution`);
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    render();
});