/* 
 * homriki - Text Array in Motion (Intertwined Splines)
 * Author: homri
 * 
 * Renders words distributed along multiple intertwined B-splines that move in
 * opposite directions. Number of splines is derived from the number of words.
 * Includes: resize handling, background manager integration, high-res export.
 */

(function() {
    const canvas = document.getElementById('chatooly-canvas');
    const ctx = canvas.getContext('2d');

    // Background manager integration
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.init(canvas);
    }

    // State
    const state = {
        words: ["homriki", "text", "array", "in", "motion"],
        speed: 1,
        curviness: 0.6,
        fontSize: 24,
        previousCanvasSize: { width: canvas.width || 800, height: canvas.height || 600 },
        isInitialized: false,
        t: 0,
        splines: [],
        wordPlacements: []
    };

    // Utilities
    function createRandom(seed) {
        let s = seed >>> 0;
        return function() {
            // xorshift32
            s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
            return (s >>> 0) / 0xFFFFFFFF;
        };
    }

    function lerp(a, b, t) { return a + (b - a) * t; }

    function bspline(points, t, k = 3) {
        // De Boor algorithm for uniform B-spline (degree k)
        const n = points.length - 1;
        const degree = Math.min(k, n);
        const domain = [degree, n + 1];
        const u = lerp(domain[0], domain[1], t);

        const i = Math.floor(u) - 1;
        const d = [];
        for (let j = 0; j <= degree; j++) {
            const idx = Math.max(0, Math.min(n, i - degree + 1 + j));
            d[j] = { x: points[idx].x, y: points[idx].y };
        }
        for (let r = 1; r <= degree; r++) {
            for (let j = degree; j >= r; j--) {
                const a = (u - (i - degree + j)) / (degree - r + 1);
                d[j].x = (1 - a) * d[j - 1].x + a * d[j].x;
                d[j].y = (1 - a) * d[j - 1].y + a * d[j].y;
            }
        }
        return d[degree];
    }

    function generateSplines(wordCount, width, height, curviness) {
        const numSplines = Math.max(2, Math.min(8, Math.ceil(wordCount / 4)));
        const rng = createRandom(wordCount * 1337 + Math.floor(curviness * 1000));
        const splines = [];
        for (let s = 0; s < numSplines; s++) {
            const controlPoints = [];
            const cx = width * 0.5;
            const cy = height * 0.5;
            const radius = Math.min(width, height) * (0.25 + 0.35 * rng());
            const knots = 8; // Fixed for smooth looping
            const phase = rng() * Math.PI * 2;
            
            // Create closed loop spline
            for (let k = 0; k < knots; k++) {
                const ang = phase + (k / knots) * Math.PI * 2;
                const r = radius * (0.8 + 0.4 * rng());
                controlPoints.push({
                    x: cx + Math.cos(ang) * r,
                    y: cy + Math.sin(ang) * r,
                    baseX: cx + Math.cos(ang) * r,
                    baseY: cy + Math.sin(ang) * r
                });
            }
            
            // Duplicate first few points at end for smooth loop
            for (let k = 0; k < 3; k++) {
                controlPoints.push({
                    x: controlPoints[k].x,
                    y: controlPoints[k].y,
                    baseX: controlPoints[k].baseX,
                    baseY: controlPoints[k].baseY
                });
            }
            
            splines.push({ 
                controlPoints, 
                direction: s % 2 === 0 ? 1 : -1,
                basePhase: phase,
                radius: radius
            });
        }
        return splines;
    }

    function layoutWordsOnSplines(words, splines) {
        const placements = [];
        const perSpline = Math.ceil(words.length / splines.length);
        let w = 0;
        for (let i = 0; i < splines.length; i++) {
            for (let j = 0; j < perSpline && w < words.length; j++, w++) {
                const t = (j + 0.5) / Math.max(1, perSpline);
                placements.push({ word: words[w], splineIndex: i, t });
            }
        }
        return placements;
    }

    function rebuild() {
        const width = canvas.width || 800;
        const height = canvas.height || 600;
        state.splines = generateSplines(state.words.length, width, height, state.curviness);
        state.wordPlacements = layoutWordsOnSplines(state.words, state.splines);
    }

    function drawBackground() {
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            const bm = window.Chatooly.backgroundManager;
            bm.drawToCanvas(ctx, canvas.width, canvas.height);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    function render(time) {
        state.t = (time || 0) * 0.001 * state.speed;

        drawBackground();

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        // Smooth continuous motion - animate splines with gentle breathing effect
        for (let s = 0; s < state.splines.length; s++) {
            const spline = state.splines[s];
            const cps = spline.controlPoints;
            const breathing = Math.sin(state.t * 0.3) * 0.1 + 1; // Gentle breathing
            
            for (let i = 0; i < cps.length; i++) {
                const cp = cps[i];
                const baseX = cp.baseX || cp.x;
                const baseY = cp.baseY || cp.y;
                
                // Smooth circular motion around base position
                const angle = state.t * 0.2 + i * 0.5;
                const radius = 8 + 4 * state.curviness;
                
                cp.x = baseX + Math.cos(angle) * radius * breathing;
                cp.y = baseY + Math.sin(angle) * radius * breathing;
            }
        }

        // Draw splines with smooth looping
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        for (const spline of state.splines) {
            const cps = spline.controlPoints;
            ctx.beginPath();
            
            // Draw smooth loop - use more points for smoother curves
            const steps = 200;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const p = bspline(cps, t);
                if (i === 0) {
                    ctx.moveTo(p.x, p.y);
                } else {
                    ctx.lineTo(p.x, p.y);
                }
            }
            ctx.stroke();
        }

        // Draw words along splines with smooth continuous motion
        ctx.font = `${state.fontSize}px ${getComputedStyle(document.documentElement).getPropertyValue('--chatooly-font-family') || 'Lucida Console, Monaco, monospace'}`;
        
        for (const placement of state.wordPlacements) {
            const spline = state.splines[placement.splineIndex];
            const dir = spline.direction;
            const cps = spline.controlPoints;
            
            // Smooth continuous motion - words flow along the path
            const tOffset = (state.t * 0.05 * dir) % 1; // Slower, smoother motion
            const t = (placement.t + tOffset + 1) % 1;
            const pos = bspline(cps, t);

            // Calculate smooth tangent for text rotation
            const t1 = (t + 0.001) % 1;
            const t2 = (t - 0.001 + 1) % 1;
            const ahead = bspline(cps, t1);
            const behind = bspline(cps, t2);
            const angle = Math.atan2(ahead.y - behind.y, ahead.x - behind.x);

            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(angle);
            ctx.fillText(placement.word, 0, 0);
            ctx.restore();
        }

        ctx.restore();
        requestAnimationFrame(render);
    }

    function onCanvasResized(e) {
        const oldWidth = state.previousCanvasSize.width;
        const oldHeight = state.previousCanvasSize.height;
        const newWidth = e.detail.canvas.width;
        const newHeight = e.detail.canvas.height;

        if (!oldWidth || !oldHeight) {
            state.previousCanvasSize = { width: newWidth, height: newHeight };
            rebuild();
            return;
        }

        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;

        // Scale control points to preserve layout
        for (const spline of state.splines) {
            for (const cp of spline.controlPoints) {
                cp.x *= scaleX;
                cp.y *= scaleY;
                if (cp.baseX != null) cp.baseX *= scaleX;
                if (cp.baseY != null) cp.baseY *= scaleY;
            }
        }

        state.previousCanvasSize = { width: newWidth, height: newHeight };
        rebuild();
    }

    // UI wiring
    function setupUI() {
        const textInput = document.getElementById('text-input');
        const applyText = document.getElementById('apply-text');
        const presetSelect = document.getElementById('preset-select');
        const applyPreset = document.getElementById('apply-preset');
        const speed = document.getElementById('speed');
        const curviness = document.getElementById('curviness');
        const fontSize = document.getElementById('font-size');

        const presets = {
            intro: 'homriki text array in motion',
            mantra: 'flow breathe focus create explore imagine',
            promo: 'chatooly creative motion generator'
        };

        if (applyPreset && presetSelect && textInput) {
            applyPreset.addEventListener('click', () => {
                const key = presetSelect.value;
                textInput.value = presets[key] || '';
                applyText?.click();
            });
        }

        if (applyText && textInput) {
            applyText.addEventListener('click', () => {
                const raw = textInput.value.trim();
                if (!raw) return;
                const parts = raw.split(/[\s,]+/).filter(Boolean);
                state.words = parts;
                rebuild();
            });
        }

        if (speed) {
            speed.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) state.speed = v;
            });
        }

        if (curviness) {
            curviness.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) {
                    state.curviness = Math.max(0, Math.min(1, v));
                    rebuild();
                }
            });
        }

        if (fontSize) {
            fontSize.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) {
                    state.fontSize = Math.max(8, Math.min(72, v));
                }
            });
        }

        // Background controls per START_HERE.md
        const bm = window.Chatooly?.backgroundManager;
        if (bm) {
            const transparent = document.getElementById('transparent-bg');
            const bgColorGroup = document.getElementById('bg-color-group');
            const bgColor = document.getElementById('bg-color');
            const bgImage = document.getElementById('bg-image');
            const clearBgImage = document.getElementById('clear-bg-image');
            const bgFitGroup = document.getElementById('bg-fit-group');
            const bgFit = document.getElementById('bg-fit');

            transparent?.addEventListener('change', (e) => {
                bm.setTransparent(e.target.checked);
                if (bgColorGroup) bgColorGroup.style.display = e.target.checked ? 'none' : 'block';
            });

            bgColor?.addEventListener('input', (e) => {
                bm.setBackgroundColor(e.target.value);
            });

            bgImage?.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    await bm.setBackgroundImage(file);
                    if (clearBgImage) clearBgImage.style.display = 'block';
                    if (bgFitGroup) bgFitGroup.style.display = 'block';
                }
            });

            clearBgImage?.addEventListener('click', () => {
                bm.clearBackgroundImage();
                if (clearBgImage) clearBgImage.style.display = 'none';
                if (bgFitGroup) bgFitGroup.style.display = 'none';
                if (bgImage) bgImage.value = '';
            });

            bgFit?.addEventListener('change', (e) => {
                bm.setFit(e.target.value);
            });
        }
    }

    // High-res export implementation
    window.renderHighResolution = function(targetCanvas, scale) {
        if (!state) return;
        const exportCtx = targetCanvas.getContext('2d');
        targetCanvas.width = (canvas.width || 800) * scale;
        targetCanvas.height = (canvas.height || 600) * scale;
        exportCtx.scale(scale, scale);

        // Redraw background
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            window.Chatooly.backgroundManager.drawToCanvas(exportCtx, canvas.width, canvas.height);
        } else {
            exportCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        }

        // Rebuild geometry for export scale, but we draw scaled via context
        const splines = generateSplines(state.words.length, canvas.width, canvas.height, state.curviness);
        const placements = layoutWordsOnSplines(state.words, splines);

        // Draw splines
        exportCtx.strokeStyle = 'rgba(255,255,255,0.25)';
        exportCtx.lineWidth = 1;
        for (const spline of splines) {
            const cps = spline.controlPoints;
            let prev = bspline(cps, 0);
            exportCtx.beginPath();
            exportCtx.moveTo(prev.x, prev.y);
            const steps = 180;
            for (let i = 1; i <= steps; i++) {
                const p = bspline(cps, i / steps);
                exportCtx.lineTo(p.x, p.y);
            }
            exportCtx.stroke();
        }

        // Draw words
        exportCtx.font = `${state.fontSize}px ${getComputedStyle(document.documentElement).getPropertyValue('--chatooly-font-family') || 'Lucida Console, Monaco, monospace'}`;
        exportCtx.textAlign = 'center';
        exportCtx.textBaseline = 'middle';

        for (const placement of placements) {
            const spline = splines[placement.splineIndex];
            const cps = spline.controlPoints;
            const pos = bspline(cps, placement.t);
            const ahead = bspline(cps, Math.min(0.999, placement.t + 0.001));
            const angle = Math.atan2(ahead.y - pos.y, ahead.x - pos.x);

            exportCtx.save();
            exportCtx.translate(pos.x, pos.y);
            exportCtx.rotate(angle);
            exportCtx.fillStyle = '#ffffff';
            exportCtx.fillText(placement.word, 0, 0);
            exportCtx.restore();
        }
    };

    function init() {
        setupUI();
        rebuild();
        state.isInitialized = true;
        requestAnimationFrame(render);
    }

    // Resize events
    document.addEventListener('chatooly:canvas-resized', onCanvasResized);

    // Init after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();