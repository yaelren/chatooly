/*
 * Bg Gradient Tool - Main Logic
 * Author: Guy Garibian
 *
 * Implements an animated, loopable multi-color gradient background
 * drawn on HTML5 Canvas, compliant with Chatooly export & resize rules.
 */

// Canvas references
const canvas = document.getElementById('chatooly-canvas');
const ctx = canvas.getContext('2d');

// Tool state
const gradientState = {
    isInitialized: false,
    isPlaying: true,
    loopDurationSec: 5,
    blendMode: 'source-over',
    blurPx: 20,
    movementSpeed: 0.6,
    spacing: 160,
    // Global shape settings
    shapeType: 'circle',  // 'circle', 'polygon', 'random'
    polygonSides: 6,
    randomCurved: true,  // true = bezier curves, false = sharp edges
    // Grain effect
    grainEnabled: false,
    grainAmount: 30,
    grainTexture: null,  // Pre-generated static grain texture
    // Shapes array - each shape has color, scale, and unique random path
    shapes: [],
    // Track previous canvas size
    previousCanvasSize: { width: canvas.width, height: canvas.height }
};

// Default colors
const defaultColors = ['#BAB6FF', '#E1FF97', '#B6D3FE'];

// Initialize background manager wiring and UI controls
function init() {
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.init(canvas);
        const bgColorInput = document.getElementById('bg-color');
        const transparentToggle = document.getElementById('transparent-bg-toggle');
        const isTransparent = transparentToggle ? transparentToggle.getAttribute('aria-pressed') === 'true' : false;
        if (bgColorInput) {
            window.Chatooly.backgroundManager.setTransparent(isTransparent);
            window.Chatooly.backgroundManager.setBackgroundColor(bgColorInput.value || '#ffffff');
        }
    }

    // Ensure UI reflects default blend mode
    const blendModeSelect = document.getElementById('blend-mode');
    if (blendModeSelect) {
        blendModeSelect.value = 'source-over';
    }

    setupEventListeners();

    // Create initial shapes data
    createInitialShapes();

    // Generate static grain texture
    generateGrainTexture();

    gradientState.isInitialized = true;
    requestAnimationFrame(tick);
}

/**
 * Generate a static grain texture that doesn't change per frame
 */
function generateGrainTexture() {
    const w = canvas.width;
    const h = canvas.height;
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = w;
    grainCanvas.height = h;
    const grainCtx = grainCanvas.getContext('2d');
    const imageData = grainCtx.createImageData(w, h);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 255;
        data[i] = 128 + noise;     // R
        data[i + 1] = 128 + noise; // G
        data[i + 2] = 128 + noise; // B
        data[i + 3] = 255;         // A
    }

    grainCtx.putImageData(imageData, 0, 0);
    gradientState.grainTexture = grainCanvas;
}

/**
 * Create initial shapes with default colors
 */
function createInitialShapes() {
    defaultColors.forEach((color, index) => {
        const shapeId = `shape-init-${index}`;
        const shape = createShapeData(shapeId, color, 1);
        gradientState.shapes.push(shape);
    });

    // Tell UI to create the cards (after a small delay to ensure DOM is ready)
    setTimeout(() => {
        if (window.createInitialShapeCards) {
            const uiShapeIds = window.createInitialShapeCards(defaultColors);
            // Sync the UI-generated IDs with our shapes array
            if (uiShapeIds && uiShapeIds.length === gradientState.shapes.length) {
                uiShapeIds.forEach((uiId, index) => {
                    if (gradientState.shapes[index]) {
                        gradientState.shapes[index].id = uiId;
                    }
                });
            }
        }
    }, 0);
}

/**
 * Create a new shape object with all properties
 */
function createShapeData(id, color, scale) {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const shapeIndex = gradientState.shapes.length;

    return {
        id: id,
        color: color,
        scale: scale,
        baseRadius: Math.min(w, h) * 0.45,
        centerX: cx,
        centerY: cy,
        // Animation phase offsets (unique per shape) - spread them out more
        wigglePhaseX: shapeIndex * 2.094 + Math.random() * 0.3, // ~120 degrees apart
        wigglePhaseY: shapeIndex * 2.094 + Math.PI / 2 + Math.random() * 0.3,
        // Random path (unique per shape)
        randomPath: generateRandomPath()
    };
}

/**
 * Generate a unique random path for a shape
 */
function generateRandomPath(vertexCount = 6) {
    const count = Math.max(3, Math.min(12, vertexCount));
    const pts = [];
    for (let i = 0; i < count; i++) {
        const baseAngle = (i / count) * Math.PI * 2;
        const jitter = (Math.random() - 0.5) * (Math.PI / count);
        const angle = baseAngle + jitter;
        const r = 0.5 + Math.random() * 0.5;
        pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    return { points: pts, vertexCount: count };
}

function setupEventListeners() {
    document.addEventListener('chatooly:canvas-resized', (e) => onCanvasResized(e));

    // Listen for shape events from ui.js
    document.addEventListener('shape-added', (e) => {
        const { id, color, scale } = e.detail;
        const shape = createShapeData(id, color, scale);
        gradientState.shapes.push(shape);
        render();
    });

    document.addEventListener('shape-removed', (e) => {
        const { id } = e.detail;
        gradientState.shapes = gradientState.shapes.filter(s => s.id !== id);
        render();
    });

    document.addEventListener('shape-updated', (e) => {
        const { id, property, value } = e.detail;
        // Find shape by ID - check both init shapes and dynamically added ones
        let shapeIndex = gradientState.shapes.findIndex(s => s.id === id);

        // If not found by exact ID, try matching by index for init shapes
        if (shapeIndex === -1) {
            // Get the index from the UI
            const shapeCards = document.querySelectorAll('#shapes-list .shape-card');
            const cardIndex = Array.from(shapeCards).findIndex(card => card.getAttribute('data-shape-id') === id);
            if (cardIndex !== -1 && cardIndex < gradientState.shapes.length) {
                shapeIndex = cardIndex;
            }
        }

        if (shapeIndex === -1) return;

        const shape = gradientState.shapes[shapeIndex];
        if (!shape) return;

        if (property === 'color') {
            shape.color = value;
        } else if (property === 'scale') {
            shape.scale = value;
        }
        render();
    });

    // Global shape type change
    document.addEventListener('global-shape-type-change', (e) => {
        gradientState.shapeType = e.detail.type;
        // Regenerate random paths when switching to random
        if (e.detail.type === 'random') {
            gradientState.shapes.forEach(shape => {
                shape.randomPath = generateRandomPath();
            });
        }
        render();
    });

    // Global polygon sides change
    document.addEventListener('global-polygon-sides-change', (e) => {
        gradientState.polygonSides = e.detail.sides;
        render();
    });

    // Randomize all shapes
    document.addEventListener('randomize-all-shapes', () => {
        gradientState.shapes.forEach(shape => {
            shape.randomPath = generateRandomPath();
        });
        render();
    });

    // Random curved/sharp toggle
    document.addEventListener('toggle-change', (e) => {
        const { id, value } = e.detail;
        if (id === 'transparent-bg') {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setTransparent(value);
            }
            render();
        } else if (id === 'grain') {
            gradientState.grainEnabled = value;
            // Regenerate grain texture when toggled on
            if (value) {
                generateGrainTexture();
            }
            render();
        } else if (id === 'random-curved') {
            gradientState.randomCurved = value;
            render();
        }
    });

    const durationInput = document.getElementById('loop-duration');
    if (durationInput) {
        durationInput.addEventListener('input', (e) => {
            const val = Math.max(1, Math.min(60, Number(e.target.value) || 5));
            gradientState.loopDurationSec = val;
        });
    }

    const movementSpeedSlider = document.getElementById('movement-speed');
    const spacingSlider = document.getElementById('spacing');
    const grainAmountSlider = document.getElementById('grain-amount');

    if (movementSpeedSlider) {
        movementSpeedSlider.addEventListener('input', (e) => {
            const val = Math.max(0.1, Math.min(5, Number(e.target.value) || 0.6));
            gradientState.movementSpeed = val;
            render();
        });
        gradientState.movementSpeed = Number(movementSpeedSlider.value) || 0.6;
    }

    if (spacingSlider) {
        spacingSlider.addEventListener('input', (e) => {
            const val = Math.max(0, Math.min(1200, Number(e.target.value) || 160));
            gradientState.spacing = val;
            render();
        });
        gradientState.spacing = Number(spacingSlider.value) || 160;
    }

    if (grainAmountSlider) {
        grainAmountSlider.addEventListener('input', (e) => {
            const val = Math.max(5, Math.min(100, Number(e.target.value) || 30));
            gradientState.grainAmount = val;
            render();
        });
        gradientState.grainAmount = Number(grainAmountSlider.value) || 30;
    }

    const blendModeSelect = document.getElementById('blend-mode');
    if (blendModeSelect) {
        blendModeSelect.addEventListener('change', (e) => {
            gradientState.blendMode = e.target.value;
            render();
        });
    }

    const blurSlider = document.getElementById('blur-amount');
    if (blurSlider) {
        blurSlider.addEventListener('input', (e) => {
            const raw = Math.max(0, Math.min(100, Number(e.target.value) || 0));
            gradientState.blurPx = raw;
            render();
        });
    }

    const playPause = document.getElementById('play-pause');
    if (playPause) {
        playPause.addEventListener('click', () => {
            gradientState.isPlaying = !gradientState.isPlaying;
            playPause.textContent = gradientState.isPlaying ? 'Pause' : 'Play';
        });
    }

    // Background controls
    const bgColor = document.getElementById('bg-color');
    const bgImage = document.getElementById('bg-image');
    const clearBg = document.getElementById('clear-bg-image');
    const bgFitGroup = document.getElementById('bg-fit-group');
    const bgFit = document.getElementById('bg-fit');

    if (bgColor) {
        bgColor.addEventListener('input', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setBackgroundColor(e.target.value);
            }
            render();
        });
    }

    if (bgImage && clearBg && bgFitGroup) {
        bgImage.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (file && window.Chatooly && window.Chatooly.backgroundManager) {
                await window.Chatooly.backgroundManager.setBackgroundImage(file);
                clearBg.style.display = 'block';
                bgFitGroup.style.display = 'block';
                render();
            }
        });
        clearBg.addEventListener('click', () => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.clearBackgroundImage();
            }
            clearBg.style.display = 'none';
            bgFitGroup.style.display = 'none';
            if (bgImage) bgImage.value = '';
            render();
        });
    }

    if (bgFit) {
        bgFit.addEventListener('change', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setFit(e.target.value);
            }
            render();
        });
    }
}

/**
 * Draw a polygon with n sides
 */
function drawPolygon(targetCtx, cx, cy, radius, sides) {
    targetCtx.beginPath();
    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) {
            targetCtx.moveTo(x, y);
        } else {
            targetCtx.lineTo(x, y);
        }
    }
    targetCtx.closePath();
    targetCtx.fill();
}

/**
 * Draw a random path shape - curved (bezier) or sharp (linear)
 */
function drawRandomPath(targetCtx, cx, cy, radius, randomPath, curved = true) {
    const pts = randomPath && randomPath.points && randomPath.points.length >= 3 ? randomPath.points : null;
    if (!pts) return;

    targetCtx.beginPath();
    const n = pts.length;

    if (curved) {
        // Smooth bezier curves
        const p0 = pts[0];
        const p1 = pts[1 % n];
        const startMidX = (p0.x + p1.x) * 0.5;
        const startMidY = (p0.y + p1.y) * 0.5;
        targetCtx.moveTo(cx + startMidX * radius, cy + startMidY * radius);

        for (let i = 1; i <= n; i++) {
            const curr = pts[i % n];
            const next = pts[(i + 1) % n];
            const midX = (curr.x + next.x) * 0.5;
            const midY = (curr.y + next.y) * 0.5;
            targetCtx.quadraticCurveTo(
                cx + curr.x * radius,
                cy + curr.y * radius,
                cx + midX * radius,
                cy + midY * radius
            );
        }
    } else {
        // Sharp edges - straight lines
        targetCtx.moveTo(cx + pts[0].x * radius, cy + pts[0].y * radius);
        for (let i = 1; i < n; i++) {
            targetCtx.lineTo(cx + pts[i].x * radius, cy + pts[i].y * radius);
        }
    }

    targetCtx.closePath();
    targetCtx.fill();
}

function onCanvasResized(e) {
    const oldW = gradientState.previousCanvasSize.width;
    const oldH = gradientState.previousCanvasSize.height;
    const newW = e.detail.canvas.width;
    const newH = e.detail.canvas.height;

    if (!oldW || !oldH) {
        gradientState.previousCanvasSize = { width: newW, height: newH };
        generateGrainTexture(); // Regenerate grain for new size
        render();
        return;
    }

    const scaleX = newW / oldW;
    const scaleY = newH / oldH;
    const scaleMin = Math.min(scaleX, scaleY);

    gradientState.shapes.forEach(s => {
        s.centerX *= scaleX;
        s.centerY *= scaleY;
        s.baseRadius *= scaleMin;
    });

    gradientState.previousCanvasSize = { width: newW, height: newH };
    generateGrainTexture(); // Regenerate grain for new size
    render();
}

function tick(nowMs) {
    if (gradientState.isPlaying) {
        render(nowMs);
    }
    requestAnimationFrame(tick);
}

/**
 * Get continuous time value - no snapping/looping
 */
function getContinuousTime(nowMs) {
    const elapsed = (nowMs ?? performance.now()) / 1000; // Time in seconds
    return elapsed;
}

function render(nowMs) {
    const w = canvas.width;
    const h = canvas.height;

    // Draw background first
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.drawToCanvas(ctx, w, h);
    } else {
        ctx.clearRect(0, 0, w, h);
    }

    const time = getContinuousTime(nowMs);
    const twoPi = Math.PI * 2;

    // Apply blur via filter
    const prevFilter = ctx.filter;
    ctx.filter = gradientState.blurPx > 0 ? `blur(${gradientState.blurPx}px)` : 'none';
    const prevComposite = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = gradientState.blendMode;

    gradientState.shapes.forEach((shape, i) => {
        // Continuous sinusoidal movement - no snapping
        const speed = gradientState.movementSpeed;
        const amp = gradientState.spacing;

        // Use continuous time with per-shape phase offsets
        const phaseX = time * speed + shape.wigglePhaseX;
        const phaseY = time * speed + shape.wigglePhaseY;

        const x = shape.centerX + Math.sin(phaseX) * amp;
        const y = shape.centerY + Math.cos(phaseY) * amp;

        const radius = shape.baseRadius * remapScale(shape.scale);

        // Create radial gradient - sharper with less falloff
        const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grd.addColorStop(0, hexToRgba(shape.color, 1.0));
        grd.addColorStop(0.7, hexToRgba(shape.color, 0.9));
        grd.addColorStop(0.9, hexToRgba(shape.color, 0.4));
        grd.addColorStop(1, hexToRgba(shape.color, 0.0));
        ctx.fillStyle = grd;

        // Draw based on global shape type
        if (gradientState.shapeType === 'circle') {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, twoPi);
            ctx.fill();
        } else if (gradientState.shapeType === 'polygon') {
            drawPolygon(ctx, x, y, radius, gradientState.polygonSides);
        } else if (gradientState.shapeType === 'random') {
            if (shape.randomPath) {
                drawRandomPath(ctx, x, y, radius, shape.randomPath, gradientState.randomCurved);
            } else {
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, twoPi);
                ctx.fill();
            }
        }
    });

    // Restore filter and composite
    ctx.globalCompositeOperation = prevComposite || 'source-over';
    ctx.filter = prevFilter || 'none';

    // Apply static grain overlay if enabled
    if (gradientState.grainEnabled && gradientState.grainTexture) {
        applyStaticGrainOverlay(ctx, w, h, gradientState.grainAmount);
    }
}

/**
 * Apply static grain overlay using pre-generated texture
 */
function applyStaticGrainOverlay(targetCtx, w, h, amount) {
    if (!gradientState.grainTexture) return;

    const intensity = amount / 100;
    targetCtx.save();
    targetCtx.globalAlpha = intensity * 0.5; // Scale opacity
    targetCtx.globalCompositeOperation = 'overlay';
    targetCtx.drawImage(gradientState.grainTexture, 0, 0, w, h);
    targetCtx.restore();
}

function hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Remap scale value: UI value of 1 = actual scale of 0.4
 * So actual = uiValue * 0.4
 */
function remapScale(uiValue) {
    return uiValue * 0.4;
}

// High-res export
window.renderHighResolution = function(targetCanvas, scale) {
    if (!gradientState.isInitialized) {
        console.warn('Tool not ready for high-res export');
        return;
    }
    const exportCtx = targetCanvas.getContext('2d');
    targetCanvas.width = canvas.width * scale;
    targetCanvas.height = canvas.height * scale;

    // Background first
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        exportCtx.save();
        exportCtx.scale(scale, scale);
        window.Chatooly.backgroundManager.drawToCanvas(exportCtx, canvas.width, canvas.height);
        exportCtx.restore();
    } else {
        exportCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    }

    exportCtx.save();
    exportCtx.scale(scale, scale);

    const renderedNow = performance.now();
    const prevFilter = exportCtx.filter;
    exportCtx.filter = gradientState.blurPx > 0 ? `blur(${gradientState.blurPx * scale}px)` : 'none';
    const prevComposite = exportCtx.globalCompositeOperation;
    exportCtx.globalCompositeOperation = gradientState.blendMode;

    const twoPi = Math.PI * 2;
    const time = getContinuousTime(renderedNow);

    gradientState.shapes.forEach((shape, i) => {
        const speed = gradientState.movementSpeed;
        const amp = gradientState.spacing;

        const phaseX = time * speed + shape.wigglePhaseX;
        const phaseY = time * speed + shape.wigglePhaseY;

        const x = shape.centerX + Math.sin(phaseX) * amp;
        const y = shape.centerY + Math.cos(phaseY) * amp;
        const radius = shape.baseRadius * remapScale(shape.scale);

        const grd = exportCtx.createRadialGradient(x, y, 0, x, y, radius);
        grd.addColorStop(0, hexToRgba(shape.color, 1.0));
        grd.addColorStop(0.7, hexToRgba(shape.color, 0.9));
        grd.addColorStop(0.9, hexToRgba(shape.color, 0.4));
        grd.addColorStop(1, hexToRgba(shape.color, 0.0));
        exportCtx.fillStyle = grd;

        if (gradientState.shapeType === 'circle') {
            exportCtx.beginPath();
            exportCtx.arc(x, y, radius, 0, twoPi);
            exportCtx.fill();
        } else if (gradientState.shapeType === 'polygon') {
            drawPolygon(exportCtx, x, y, radius, gradientState.polygonSides);
        } else if (gradientState.shapeType === 'random') {
            if (shape.randomPath) {
                drawRandomPath(exportCtx, x, y, radius, shape.randomPath, gradientState.randomCurved);
            } else {
                exportCtx.beginPath();
                exportCtx.arc(x, y, radius, 0, twoPi);
                exportCtx.fill();
            }
        }
    });

    exportCtx.globalCompositeOperation = prevComposite || 'source-over';
    exportCtx.filter = prevFilter || 'none';
    exportCtx.restore();

    // Apply static grain overlay if enabled (generate at export resolution)
    if (gradientState.grainEnabled) {
        // Generate grain at export resolution
        const exportGrainCanvas = document.createElement('canvas');
        exportGrainCanvas.width = targetCanvas.width;
        exportGrainCanvas.height = targetCanvas.height;
        const grainCtx = exportGrainCanvas.getContext('2d');
        const imageData = grainCtx.createImageData(targetCanvas.width, targetCanvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 255;
            data[i] = 128 + noise;
            data[i + 1] = 128 + noise;
            data[i + 2] = 128 + noise;
            data[i + 3] = 255;
        }
        grainCtx.putImageData(imageData, 0, 0);

        const intensity = gradientState.grainAmount / 100;
        exportCtx.save();
        exportCtx.globalAlpha = intensity * 0.5;
        exportCtx.globalCompositeOperation = 'overlay';
        exportCtx.drawImage(exportGrainCanvas, 0, 0);
        exportCtx.restore();
    }
};

// Kick off after DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
