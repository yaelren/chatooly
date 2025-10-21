/* 
 * Bg Gradient Tool - Main Logic
 * Author: Guy Garibian
 * 
 * Implements an animated, loopable multi-color radial-gradient-like background
 * drawn on HTML5 Canvas, compliant with Chatooly export & resize rules.
 */

// Canvas references
const canvas = document.getElementById('chatooly-canvas');
const ctx = canvas.getContext('2d');

// Tool state
const gradientState = {
    isInitialized: false,
    isPlaying: true,
    startTimeMs: performance.now(),
    loopDurationSec: 5,
    speedFactor: 0.5, // retained for compatibility (not used in wiggle)
    movementStyle: 'wiggle',
    blendMode: 'source-over',
    blurPx: 20,
    shapeType: 'circle',
    ellipseRatio: 1.20,
    randomPath: { points: [], maxRadiusNorm: 1, vertexCount: 6, bezier: false },
    // Loop closure control: integer cycles per loop for each blob/mode
    cyclesPerLoop: 1,
    // Each blob: { color, baseRadius, orbitRadius, angle, angularSpeed, centerX, centerY, wigglePhaseX, wigglePhaseY }
    blobs: [],
    // Track previous canvas size for background manager and potential future scaling
    previousCanvasSize: { width: canvas.width, height: canvas.height }
};

// Initialize background manager wiring and UI controls
function init() {
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.init(canvas);
        // Set default background to white on init
        const bgColorInput = document.getElementById('bg-color');
        const transparentCb = document.getElementById('transparent-bg');
        if (bgColorInput) {
            window.Chatooly.backgroundManager.setTransparent(transparentCb ? !!transparentCb.checked : false);
            window.Chatooly.backgroundManager.setBackgroundColor(bgColorInput.value || '#ffffff');
        }
    }

    // Ensure UI reflects default blend mode
    const blendModeSelect = document.getElementById('blend-mode');
    if (blendModeSelect) {
        blendModeSelect.value = 'source-over';
    }

    // Default blobs/colors (synced with UI defaults)
    const defaultColors = ['#ff6b6b', '#4d96ff', '#ffd93d'];
    createBlobs(defaultColors);

    setupEventListeners();
    gradientState.isInitialized = true;
    requestAnimationFrame(tick);
}

function createBlobs(colors) {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    gradientState.blobs = colors.map((color, i) => {
        const baseRadius = Math.min(w, h) * 0.45;
        const orbitRadius = Math.min(w, h) * (0.15 + 0.1 * i);
        const angle = (i / colors.length) * Math.PI * 2;
        const angularSpeed = 0.4 + 0.1 * i; // radians/sec baseline
        // Phase offsets to decorrelate wiggles per blob
        const wigglePhaseX = i * 1.2345;
        const wigglePhaseY = i * 2.3456;
        return { color, baseRadius, orbitRadius, angle, angularSpeed, centerX: cx, centerY: cy, wigglePhaseX, wigglePhaseY };
    });
}

function setupEventListeners() {
    document.addEventListener('chatooly:canvas-resized', (e) => onCanvasResized(e));

    const durationInput = document.getElementById('loop-duration');
    if (durationInput) {
        durationInput.addEventListener('input', (e) => {
            const val = Math.max(1, Math.min(60, Number(e.target.value) || 5));
            gradientState.loopDurationSec = val;
        });
    }

    // Speed control removed (wiggle uses frequency/amplitude)

    const movementSelect = document.getElementById('movement-style');
    if (movementSelect) {
        movementSelect.addEventListener('change', (e) => {
            gradientState.movementStyle = e.target.value;
            render();
        });
    }

    const wiggleFreq = document.getElementById('wiggle-freq');
    const wiggleAmp = document.getElementById('wiggle-amp');
    const wiggleAmpNum = document.getElementById('wiggle-amp-num');
    if (wiggleFreq) {
        wiggleFreq.addEventListener('input', (e) => {
            const val = Math.max(0.1, Math.min(5, Number(e.target.value) || 0.6));
            gradientState.wiggleHz = val;
            render();
        });
        gradientState.wiggleHz = Number(wiggleFreq.value) || 0.6;
    } else {
        gradientState.wiggleHz = 0.6;
    }
    if (wiggleAmp || wiggleAmpNum) {
        const setAmp = (val) => {
            const clamped = Math.max(0, Math.min(1200, Number(val) || 160));
            gradientState.wiggleAmp = clamped;
            if (wiggleAmp && wiggleAmp.value !== String(clamped)) wiggleAmp.value = String(clamped);
            if (wiggleAmpNum && wiggleAmpNum.value !== String(clamped)) wiggleAmpNum.value = String(clamped);
            render();
        };
        if (wiggleAmp) wiggleAmp.addEventListener('input', (e) => setAmp(e.target.value));
        if (wiggleAmpNum) wiggleAmpNum.addEventListener('input', (e) => setAmp(e.target.value));
        setAmp((wiggleAmpNum && wiggleAmpNum.value) || (wiggleAmp && wiggleAmp.value) || 160);
    } else {
        gradientState.wiggleAmp = 160;
    }

    const blendModeSelect = document.getElementById('blend-mode');
    if (blendModeSelect) {
        blendModeSelect.addEventListener('change', (e) => {
            gradientState.blendMode = e.target.value;
            render();
        });
    }

    const blurSlider = document.getElementById('blur-amount');
    const shapeSelect = document.getElementById('shape-type');
    const ellipseRatio = document.getElementById('ellipse-ratio');
    const randomPoints = document.getElementById('random-points');
    const randomBezier = document.getElementById('random-bezier');
    const randomizeBtn = document.getElementById('randomize-path');
    if (shapeSelect) {
        shapeSelect.addEventListener('change', (e) => {
            gradientState.shapeType = e.target.value;
            if (gradientState.shapeType === 'random') {
                regenerateRandomPath();
            }
            render();
        });
    }
    if (ellipseRatio) {
        ellipseRatio.addEventListener('input', (e) => {
            const val = Math.max(0.5, Math.min(2, Number(e.target.value) || 1));
            gradientState.ellipseRatio = val;
            render();
        });
    }
    if (randomPoints) {
        randomPoints.addEventListener('input', (e) => {
            const val = Math.max(3, Math.min(12, Number(e.target.value) || 6));
            gradientState.randomPath.vertexCount = val;
            regenerateRandomPath();
            render();
        });
        gradientState.randomPath.vertexCount = Number(randomPoints.value) || 6;
    }
    if (randomBezier) {
        randomBezier.addEventListener('change', (e) => {
            gradientState.randomPath.bezier = !!e.target.checked;
            render();
        });
        gradientState.randomPath.bezier = !!randomBezier.checked;
    }
    if (randomizeBtn) {
        randomizeBtn.addEventListener('click', () => {
            regenerateRandomPath();
            render();
        });
    }
    if (blurSlider) {
        blurSlider.addEventListener('input', (e) => {
            const raw = Math.max(0, Math.min(100, Number(e.target.value) || 0));
            gradientState.blurPx = raw;
            render();
        });
    }

    const colorsList = document.getElementById('colors-list');
    const addBtn = document.getElementById('add-color');
    const removeBtn = document.getElementById('remove-color');
    if (addBtn && colorsList) {
        addBtn.addEventListener('click', () => {
            const row = document.createElement('div');
            row.className = 'color-row';
            const color = document.createElement('input');
            color.type = 'color';
            color.className = 'color-stop';
            color.value = '#ffffff';
            row.appendChild(color);
            colorsList.appendChild(row);
            syncColorsFromUI();
        });
    }
    if (removeBtn && colorsList) {
        removeBtn.addEventListener('click', () => {
            const rows = colorsList.querySelectorAll('.color-row');
            if (rows.length > 1) {
                rows[rows.length - 1].remove();
                syncColorsFromUI();
            }
        });
    }
    if (colorsList) {
        colorsList.addEventListener('input', () => syncColorsFromUI());
    }

    const playPause = document.getElementById('play-pause');
    if (playPause) {
        playPause.addEventListener('click', () => {
            gradientState.isPlaying = !gradientState.isPlaying;
            playPause.textContent = gradientState.isPlaying ? 'Pause' : 'Play';
            // Reset start time for seamless loop resumption
            gradientState.startTimeMs = performance.now();
        });
    }

    // Background controls wiring (START_HERE Step 4.5)
    const transparentCb = document.getElementById('transparent-bg');
    const bgColorGroup = document.getElementById('bg-color-group');
    const bgColor = document.getElementById('bg-color');
    const bgImage = document.getElementById('bg-image');
    const clearBg = document.getElementById('clear-bg-image');
    const bgFitGroup = document.getElementById('bg-fit-group');
    const bgFit = document.getElementById('bg-fit');

    if (transparentCb) {
        transparentCb.addEventListener('change', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setTransparent(e.target.checked);
            }
            if (bgColorGroup) bgColorGroup.style.display = e.target.checked ? 'none' : 'block';
            render();
        });
    }
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

// Generate a closed random path normalized to unit radius
function regenerateRandomPath() {
    const count = Math.max(3, Math.min(64, gradientState.randomPath.vertexCount || 6));
    const pts = [];
    for (let i = 0; i < count; i++) {
        const baseAngle = (i / count) * Math.PI * 2;
        const jitter = (Math.random() - 0.5) * (Math.PI / count); // small angular jitter
        const angle = baseAngle + jitter;
        const r = 0.6 + Math.random() * 0.4; // 0.6..1.0 normalized
        pts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
    }
    gradientState.randomPath.points = pts;
}

function drawRandomPath(targetCtx, cx, cy, radius, randomPath) {
    const pts = randomPath.points && randomPath.points.length >= 3 ? randomPath.points : null;
    if (!pts) return;
    targetCtx.beginPath();
    if (randomPath.bezier) {
        // Midpoint smoothing: start at midpoint and curve through each vertex
        const n = pts.length;
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
        targetCtx.closePath();
        targetCtx.fill();
    } else {
        targetCtx.moveTo(cx + pts[0].x * radius, cy + pts[0].y * radius);
        for (let i = 1; i < pts.length; i++) {
            targetCtx.lineTo(cx + pts[i].x * radius, cy + pts[i].y * radius);
        }
        targetCtx.closePath();
        targetCtx.fill();
    }
}

function syncColorsFromUI() {
    const rows = Array.from(document.querySelectorAll('#colors-list .color-row'));
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const data = rows.map((row, i) => {
        const color = row.querySelector('input.color-stop')?.value || '#ffffff';
        return { color };
    });
    gradientState.blobs = data.map((d, i) => {
        const baseRadius = Math.min(w, h) * 0.45;
        const orbitRadius = Math.min(w, h) * (0.15 + 0.1 * i);
        const angle = (i / Math.max(1, data.length)) * Math.PI * 2;
        const angularSpeed = 0.4 + 0.1 * i;
        const wigglePhaseX = i * 1.2345;
        const wigglePhaseY = i * 2.3456;
        return { color: d.color, baseRadius, orbitRadius, angle, angularSpeed, centerX: cx, centerY: cy, wigglePhaseX, wigglePhaseY };
    });
}

function onCanvasResized(e) {
    // Update stored size and re-layout blobs proportionally
    const oldW = gradientState.previousCanvasSize.width;
    const oldH = gradientState.previousCanvasSize.height;
    const newW = e.detail.canvas.width;
    const newH = e.detail.canvas.height;

    if (!oldW || !oldH) {
        gradientState.previousCanvasSize = { width: newW, height: newH };
        render();
        return;
    }

    const scaleX = newW / oldW;
    const scaleY = newH / oldH;
    const scaleMin = Math.min(scaleX, scaleY);
    gradientState.blobs.forEach(b => {
        b.centerX *= scaleX;
        b.centerY *= scaleY;
        b.baseRadius *= scaleMin;
        b.orbitRadius *= scaleMin;
    });

    gradientState.previousCanvasSize = { width: newW, height: newH };
    render();
}

function tick(nowMs) {
    if (gradientState.isPlaying) {
        render(nowMs);
    }
    requestAnimationFrame(tick);
}

function getLoopT(nowMs) {
    const durationMs = Math.max(1, gradientState.loopDurationSec) * 1000;
    const elapsed = (nowMs ?? performance.now()) - gradientState.startTimeMs;
    // Perfect loop parameter in [0,1)
    return (elapsed % durationMs) / durationMs;
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

    const t = getLoopT(nowMs);
    const twoPi = Math.PI * 2;

    // Apply blur via filter and set blend mode
    const prevFilter = ctx.filter;
    ctx.filter = gradientState.blurPx > 0 ? `blur(${gradientState.blurPx}px)` : 'none';
    const prevComposite = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = gradientState.blendMode;

    gradientState.blobs.forEach((b, i) => {
        const speedScale = 0.25 + gradientState.speedFactor * 1.5; // widen practical range
        // Force integer cycle closure by quantizing angularSpeed to cyclesPerLoop
        const cycles = Math.max(1, gradientState.cyclesPerLoop);
        const theta = b.angle + (cycles * twoPi) * t * speedScale; // exact closure each loop

        let x, y;
        if (gradientState.movementStyle === 'float') {
            // Lissajous-like float (global center)
            const ax = 1 + 0.2 * i;
            const ay = 1.2 + 0.15 * i;
            x = b.centerX + Math.cos(theta * ax) * b.orbitRadius;
            y = b.centerY + Math.sin(theta * ay) * b.orbitRadius;
        } else if (gradientState.movementStyle === 'wiggle') {
            // AE-style wiggle with loop closure: sin/cos with integer cycles
            const cycles = Math.max(1, gradientState.cyclesPerLoop);
            const phase = t * cycles * 2 * Math.PI;
            const amp = gradientState.wiggleAmp;
            const freq = gradientState.wiggleHz; // Hz across loop duration; phase already loop-locked
            // Use per-blob phase offsets to decorrelate motion
            x = b.centerX + Math.sin(phase + b.wigglePhaseX) * amp;
            y = b.centerY + Math.cos(phase + b.wigglePhaseY) * amp;
        } else {
            // orbit
            x = b.centerX + Math.cos(theta) * b.orbitRadius;
            y = b.centerY + Math.sin(theta) * b.orbitRadius;
        }

        const radius = b.baseRadius;
        if (gradientState.shapeType === 'ellipse') {
            // Draw radial gradient and scale Y to make ellipse
            const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
            grd.addColorStop(0, hexToRgba(b.color, 0.85));
            grd.addColorStop(1, hexToRgba(b.color, 0.0));
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1, gradientState.ellipseRatio);
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, twoPi);
            ctx.fill();
            ctx.restore();
        } else if (gradientState.shapeType === 'square') {
            const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
            grd.addColorStop(0, hexToRgba(b.color, 0.85));
            grd.addColorStop(1, hexToRgba(b.color, 0.0));
            ctx.fillStyle = grd;
            const side = radius * 2;
            ctx.fillRect(x - radius, y - radius, side, side);
        } else if (gradientState.shapeType === 'random') {
            const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
            grd.addColorStop(0, hexToRgba(b.color, 0.85));
            grd.addColorStop(1, hexToRgba(b.color, 0.0));
            ctx.fillStyle = grd;
            drawRandomPath(ctx, x, y, radius, gradientState.randomPath);
        } else {
            const grd = ctx.createRadialGradient(x, y, 0, x, y, radius);
            grd.addColorStop(0, hexToRgba(b.color, 0.85));
            grd.addColorStop(1, hexToRgba(b.color, 0.0));
            ctx.fillStyle = grd;
            ctx.beginPath();
            if (gradientState.shapeType === 'square') {
                ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
            } else {
                ctx.arc(x, y, radius, 0, twoPi); // circle
            }
            ctx.fill();
        }
    });

    // Restore filter and composite
    ctx.globalCompositeOperation = prevComposite || 'source-over';
    ctx.filter = prevFilter || 'none';
}

function hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// High-res export: re-render at target scale
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
        // Draw at 1:1 logical size, then scale context for our content
        exportCtx.save();
        exportCtx.scale(scale, scale);
        window.Chatooly.backgroundManager.drawToCanvas(exportCtx, canvas.width, canvas.height);
        exportCtx.restore();
    } else {
        exportCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    }

    // Scale up and re-run the same rendering using logical coordinates
    exportCtx.save();
    exportCtx.scale(scale, scale);

    // Emulate one frame render at the current loop-locked time
    const renderedNow = performance.now();
    const cachedComposite = ctx.globalCompositeOperation;

    // Apply requested blend and blur in export context
    const prevFilter = exportCtx.filter;
    exportCtx.filter = gradientState.blurPx > 0 ? `blur(${gradientState.blurPx * scale}px)` : 'none';
    const prevComposite = exportCtx.globalCompositeOperation;
    exportCtx.globalCompositeOperation = gradientState.blendMode;
    const twoPi = Math.PI * 2;
    const t = getLoopT(renderedNow);
    gradientState.blobs.forEach((b, i) => {
        const speedScale = 0.25 + gradientState.speedFactor * 1.5;
        const cycles = Math.max(1, gradientState.cyclesPerLoop);
        const theta = b.angle + (cycles * twoPi) * t * speedScale;
        let x, y;
        if (gradientState.movementStyle === 'float') {
            const ax = 1 + 0.2 * i;
            const ay = 1.2 + 0.15 * i;
            x = b.centerX + Math.cos(theta * ax) * b.orbitRadius;
            y = b.centerY + Math.sin(theta * ay) * b.orbitRadius;
        } else if (gradientState.movementStyle === 'wiggle') {
            const cycles = Math.max(1, gradientState.cyclesPerLoop);
            const phase = t * cycles * 2 * Math.PI;
            const amp = gradientState.wiggleAmp;
            x = b.centerX + Math.sin(phase + b.wigglePhaseX) * amp;
            y = b.centerY + Math.cos(phase + b.wigglePhaseY) * amp;
        } else {
            x = b.centerX + Math.cos(theta) * b.orbitRadius;
            y = b.centerY + Math.sin(theta) * b.orbitRadius;
        }
        const radius = b.baseRadius;
        if (gradientState.shapeType === 'linear') {
            const ang = (gradientState.linearAngleDeg % 360) * Math.PI / 180;
            const dx = Math.cos(ang) * radius;
            const dy = Math.sin(ang) * radius;
            const grd = exportCtx.createLinearGradient(x - dx, y - dy, x + dx, y + dy);
            grd.addColorStop(0, hexToRgba(b.color, 0.85));
            grd.addColorStop(1, hexToRgba(b.color, 0.0));
            exportCtx.fillStyle = grd;
            exportCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        } else if (gradientState.shapeType === 'ellipse') {
            const grd = exportCtx.createRadialGradient(x, y, 0, x, y, radius);
            grd.addColorStop(0, hexToRgba(b.color, 0.85));
            grd.addColorStop(1, hexToRgba(b.color, 0.0));
            exportCtx.save();
            exportCtx.translate(x, y);
            exportCtx.scale(1, gradientState.ellipseRatio);
            exportCtx.fillStyle = grd;
            exportCtx.beginPath();
            exportCtx.arc(0, 0, radius, 0, twoPi);
            exportCtx.fill();
            exportCtx.restore();
        } else {
            const grd = exportCtx.createRadialGradient(x, y, 0, x, y, radius);
            grd.addColorStop(0, hexToRgba(b.color, 0.85));
            grd.addColorStop(1, hexToRgba(b.color, 0.0));
            exportCtx.fillStyle = grd;
            exportCtx.beginPath();
            exportCtx.arc(x, y, radius, 0, twoPi);
            exportCtx.fill();
        }
    });
    exportCtx.globalCompositeOperation = prevComposite || 'source-over';
    exportCtx.filter = prevFilter || 'none';

    exportCtx.restore();

    // Restore original canvas state composite (local only)
    ctx.globalCompositeOperation = cachedComposite;
};

// Kick off after DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}