/*
 * Live Portrait Artist - Main Logic
 * Author: Claude Code
 *
 * This tool transforms realistic portraits into live illustration performances
 * with drawing techniques and playback controls.
 */

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 1920;   // HD resolution width (1920x1080)
canvas.height = 1080;  // HD resolution height

// ========== LIVE PORTRAIT ARTIST SYSTEM ==========
class LivePortraitArtist {
    constructor() {
        this.portraitImage = null;
        this.edgeData = null;
        this.strokePaths = [];
        this.isDrawingActive = false;

        // Drawing parameters
        this.drawingStyle = 'pencil';
        this.lineWeight = 2;
        this.detailLevel = 70;
        this.strokeMessiness = 40;
        this.textureIntensity = 60;

        // Playback parameters
        this.drawingProgress = 0;
        this.playbackSpeed = 1.0;
        this.drawingDuration = 30;
        this.showReference = false;
        this.isPlaying = false;
        this.animationStartTime = 0;
        this.totalStrokes = 0;

        // Typography parameters
        this.enableTypography = false;
        this.mainText = '';
        this.subtitleText = '';
        this.fontFamily = 'sans-serif';
        this.fontSize = 48;
        this.textX = 50; // percentage
        this.textY = 15; // percentage
        this.textColor = '#333333';
        this.textOpacity = 90;
        this.textAlign = 'center';
        this.textStyle = 'normal';
        this.textShadow = false;

        // Advanced typography parameters
        this.textEffect = 'none';
        this.textAnimation = 'none';
        this.letterSpacing = 0;
        this.textRotation = 0;
        this.textCurve = 0;
        this.animationStartTime = 0;
        this.textAnimationDuration = 2000;

        // Artistic enhancement parameters
        this.illustrationMode = 'realistic';
        this.colorPalette = 'monochrome';
        this.filterIntensity = 0;
        this.edgeEnhancement = 50;
        this.showCompositionGuides = false;

        // Creative performance parameters
        this.performanceMode = 'standard';
        this.emotionIntensity = 50;
        this.dynamicLayers = false;
        this.audioVisualization = false;
        this.gestureSensitivity = 30;
        this.emotionState = 'neutral';

        // Canvas resize tracking
        this.previousCanvasSize = { width: canvas.width, height: canvas.height };

        this.init();
    }

    init() {
        // Initialize background manager
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            Chatooly.backgroundManager.init(canvas);
            this.setupBackgroundControls();
        }

        this.setupEventListeners();
        this.render();
    }

    // ========== BACKGROUND SYSTEM INTEGRATION (MANDATORY) ==========
    setupBackgroundControls() {
        // Transparent background toggle
        const transparentToggle = document.getElementById('transparent-bg');
        transparentToggle.addEventListener('click', () => {
            const isPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
            Chatooly.backgroundManager.setTransparent(isPressed);

            // Show/hide color picker
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

    // ========== EVENT LISTENERS ==========
    setupEventListeners() {
        // Canvas resize handling
        document.addEventListener('chatooly:canvas-resized', (e) => this.onCanvasResized(e));

        // Portrait upload
        document.getElementById('portrait-upload').addEventListener('change', (e) => {
            this.loadPortrait(e.target.files[0]);
        });

        // Generate drawing button
        document.getElementById('generate-drawing').addEventListener('click', () => {
            this.generateDrawing();
        });

        // Drawing style controls
        document.getElementById('drawing-style').addEventListener('change', (e) => {
            this.drawingStyle = e.target.value;
            if (this.strokePaths.length > 0) {
                this.render();
            }
        });

        // Artistic parameter sliders
        this.setupSliderControl('line-weight', (value) => {
            this.lineWeight = parseFloat(value);
            if (this.strokePaths.length > 0) {
                this.render();
            }
        });

        this.setupSliderControl('detail-level', (value) => {
            this.detailLevel = parseFloat(value);
        });

        this.setupSliderControl('stroke-messiness', (value) => {
            this.strokeMessiness = parseFloat(value);
        });

        this.setupSliderControl('texture-intensity', (value) => {
            this.textureIntensity = parseFloat(value);
            if (this.strokePaths.length > 0) {
                this.render();
            }
        });

        // Playback controls
        document.getElementById('play-pause-btn').addEventListener('click', () => {
            this.togglePlayback();
        });

        this.setupSliderControl('drawing-progress', (value) => {
            this.drawingProgress = parseFloat(value) / 100;
            this.render();
        });

        this.setupSliderControl('playback-speed', (value) => {
            this.playbackSpeed = parseFloat(value);
            // Update display to show one decimal place
            document.getElementById('playback-speed-value').textContent = parseFloat(value).toFixed(1) + 'x';
        });

        this.setupSliderControl('drawing-duration', (value) => {
            this.drawingDuration = parseFloat(value);
        });

        // Show reference toggle
        document.getElementById('show-reference').addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            this.showReference = isPressed;
            this.render();
        });

        // Reset drawing button
        document.getElementById('reset-drawing').addEventListener('click', () => {
            this.resetDrawing();
        });

        // Typography controls
        document.getElementById('enable-typography').addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            this.enableTypography = isPressed;

            // Show/hide typography controls
            const typographyControls = document.getElementById('typography-controls');
            typographyControls.style.display = isPressed ? 'block' : 'none';

            this.render();
        });

        // Text input controls
        document.getElementById('main-text').addEventListener('input', (e) => {
            this.mainText = e.target.value;
            this.render();
        });

        document.getElementById('subtitle-text').addEventListener('input', (e) => {
            this.subtitleText = e.target.value;
            this.render();
        });

        // Font family
        document.getElementById('font-family').addEventListener('change', (e) => {
            this.fontFamily = e.target.value;
            this.render();
        });

        // Text positioning and styling
        this.setupSliderControl('font-size', (value) => {
            this.fontSize = parseFloat(value);
            this.render();
        });

        this.setupSliderControl('text-x', (value) => {
            this.textX = parseFloat(value);
            this.render();
        });

        this.setupSliderControl('text-y', (value) => {
            this.textY = parseFloat(value);
            this.render();
        });

        this.setupSliderControl('text-opacity', (value) => {
            this.textOpacity = parseFloat(value);
            this.render();
        });

        // Text color
        document.getElementById('text-color').addEventListener('input', (e) => {
            this.textColor = e.target.value;
            this.render();
        });

        // Text alignment
        document.getElementById('text-align').addEventListener('change', (e) => {
            this.textAlign = e.target.value;
            this.render();
        });

        // Text style
        document.getElementById('text-style').addEventListener('change', (e) => {
            this.textStyle = e.target.value;
            this.render();
        });

        // Text shadow
        document.getElementById('text-shadow').addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            this.textShadow = isPressed;
            this.render();
        });

        // Advanced typography controls
        document.getElementById('text-effect').addEventListener('change', (e) => {
            this.textEffect = e.target.value;
            this.render();
        });

        document.getElementById('text-animation').addEventListener('change', (e) => {
            this.textAnimation = e.target.value;
            this.animationStartTime = performance.now();
            this.render();
        });

        this.setupSliderControl('letter-spacing', (value) => {
            this.letterSpacing = parseFloat(value);
            this.render();
        });

        this.setupSliderControl('text-rotation', (value) => {
            this.textRotation = parseFloat(value);
            this.render();
        });

        this.setupSliderControl('text-curve', (value) => {
            this.textCurve = parseFloat(value);
            this.render();
        });

        // Artistic enhancement controls
        document.getElementById('illustration-mode').addEventListener('change', (e) => {
            this.illustrationMode = e.target.value;
            if (this.strokePaths.length > 0) {
                this.render();
            }
        });

        document.getElementById('color-palette').addEventListener('change', (e) => {
            this.colorPalette = e.target.value;
            if (this.strokePaths.length > 0) {
                this.render();
            }
        });

        this.setupSliderControl('filter-intensity', (value) => {
            this.filterIntensity = parseFloat(value);
            if (this.strokePaths.length > 0) {
                this.render();
            }
        });

        this.setupSliderControl('edge-enhancement', (value) => {
            this.edgeEnhancement = parseFloat(value);
            // Edge enhancement affects stroke generation, so regenerate if needed
        });

        document.getElementById('composition-guides').addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            this.showCompositionGuides = isPressed;
            this.render();
        });

        // Creative performance controls
        document.getElementById('performance-mode').addEventListener('change', (e) => {
            this.performanceMode = e.target.value;
            this.applyPerformanceMode();
            if (this.strokePaths.length > 0) {
                this.render();
            }
        });

        this.setupSliderControl('emotion-intensity', (value) => {
            this.emotionIntensity = parseFloat(value);
            this.updateEmotionState();
            if (this.strokePaths.length > 0) {
                this.render();
            }
        });

        document.getElementById('dynamic-layers').addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            this.dynamicLayers = isPressed;
            this.render();
        });

        document.getElementById('audio-visualization').addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            this.audioVisualization = isPressed;
            if (isPressed) {
                this.initAudioVisualization();
            }
        });

        this.setupSliderControl('gesture-sensitivity', (value) => {
            this.gestureSensitivity = parseFloat(value);
        });
    }

    setupSliderControl(sliderId, callback) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(sliderId + '-value');

        slider.addEventListener('input', (e) => {
            const value = e.target.value;
            let displayValue = value;

            // Format display value based on control type
            if (sliderId.includes('level') || sliderId.includes('messiness') ||
                sliderId.includes('intensity') || sliderId.includes('progress') ||
                sliderId.includes('curve')) {
                displayValue = value + '%';
            } else if (sliderId.includes('weight') || sliderId.includes('size') ||
                      sliderId.includes('spacing')) {
                displayValue = value + 'px';
            } else if (sliderId.includes('duration')) {
                displayValue = value + 's';
            } else if (sliderId.includes('speed')) {
                displayValue = parseFloat(value).toFixed(1) + 'x';
            } else if (sliderId.includes('rotation')) {
                displayValue = value + '°';
            }

            valueDisplay.textContent = displayValue;
            callback(value);
        });
    }

    // ========== PORTRAIT LOADING ==========
    loadPortrait(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.portraitImage = img;

                // Enable generate button
                document.getElementById('generate-drawing').disabled = false;

                this.render();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ========== EDGE DETECTION AND STROKE GENERATION ==========
    generateDrawing() {
        if (!this.portraitImage) return;

        // Show processing
        document.getElementById('generate-drawing').textContent = 'Processing...';
        document.getElementById('generate-drawing').disabled = true;

        // Process image in next frame to allow UI update
        setTimeout(() => {
            this.processPortraitEdges();
            this.generateStrokePaths();
            this.enablePlaybackControls();

            document.getElementById('generate-drawing').textContent = 'Generate Drawing';
            document.getElementById('generate-drawing').disabled = false;

            this.render();
        }, 100);
    }

    processPortraitEdges() {
        // Create temporary canvas for edge detection
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        // Scale image to fit canvas while maintaining aspect ratio
        const scale = Math.min(canvas.width / this.portraitImage.width,
                              canvas.height / this.portraitImage.height);
        const scaledWidth = this.portraitImage.width * scale;
        const scaledHeight = this.portraitImage.height * scale;

        tempCanvas.width = scaledWidth;
        tempCanvas.height = scaledHeight;

        // Draw scaled image
        tempCtx.drawImage(this.portraitImage, 0, 0, scaledWidth, scaledHeight);

        // Get image data for edge detection
        const imageData = tempCtx.getImageData(0, 0, scaledWidth, scaledHeight);
        this.edgeData = this.detectEdges(imageData);

        // Store processed dimensions
        this.processedWidth = scaledWidth;
        this.processedHeight = scaledHeight;
    }

    detectEdges(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const edges = new Uint8Array(width * height);

        // Sobel edge detection
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;

                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);

                        gx += gray * sobelX[kernelIdx];
                        gy += gray * sobelY[kernelIdx];
                    }
                }

                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const enhancedMagnitude = magnitude * (this.edgeEnhancement / 50); // 50% = normal
                const threshold = 255 * (this.detailLevel / 100);
                edges[y * width + x] = enhancedMagnitude > threshold ? 255 : 0;
            }
        }

        return { data: edges, width, height };
    }

    generateStrokePaths() {
        if (!this.edgeData) return;

        this.strokePaths = [];
        const { data, width, height } = this.edgeData;

        // Generate stroke paths based on edges
        const visited = new Set();
        const centerX = (canvas.width - this.processedWidth) / 2;
        const centerY = (canvas.height - this.processedHeight) / 2;

        // Drawing layers (order matters for realistic drawing)
        const layers = [
            { name: 'outline', priority: 1, minLength: 20 },
            { name: 'features', priority: 2, minLength: 10 },
            { name: 'details', priority: 3, minLength: 5 }
        ];

        layers.forEach(layer => {
            for (let y = 0; y < height; y += 3) {
                for (let x = 0; x < width; x += 3) {
                    const idx = y * width + x;

                    if (data[idx] > 0 && !visited.has(idx)) {
                        const path = this.traceStrokePath(x, y, data, width, height, visited);

                        if (path.length >= layer.minLength) {
                            // Convert to canvas coordinates
                            const canvasPath = path.map(point => ({
                                x: point.x + centerX,
                                y: point.y + centerY
                            }));

                            this.strokePaths.push({
                                points: this.smoothPath(canvasPath),
                                layer: layer.name,
                                priority: layer.priority
                            });
                        }
                    }
                }
            }
        });

        // Sort paths by drawing priority
        this.strokePaths.sort((a, b) => a.priority - b.priority);
        this.totalStrokes = this.strokePaths.length;
    }

    traceStrokePath(startX, startY, data, width, height, visited) {
        const path = [];
        const queue = [{ x: startX, y: startY }];

        while (queue.length > 0 && path.length < 100) {
            const current = queue.shift();
            const idx = current.y * width + current.x;

            if (visited.has(idx)) continue;

            visited.add(idx);
            path.push(current);

            // Find connected edge pixels
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;

                    const nx = current.x + dx;
                    const ny = current.y + dy;
                    const nidx = ny * width + nx;

                    if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
                        data[nidx] > 0 && !visited.has(nidx)) {
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
        }

        return path;
    }

    smoothPath(path) {
        if (path.length < 3) return path;

        const smoothed = [path[0]];

        for (let i = 1; i < path.length - 1; i++) {
            const prev = path[i - 1];
            const current = path[i];
            const next = path[i + 1];

            // Apply smoothing and messiness
            const smoothAmount = 1 - (this.strokeMessiness / 100) * 0.5;

            const smoothX = prev.x * 0.25 + current.x * 0.5 + next.x * 0.25;
            const smoothY = prev.y * 0.25 + current.y * 0.5 + next.y * 0.25;

            // Add random variation for messiness
            const variation = (this.strokeMessiness / 100) * 3;
            const randomX = (Math.random() - 0.5) * variation;
            const randomY = (Math.random() - 0.5) * variation;

            smoothed.push({
                x: smoothX * smoothAmount + current.x * (1 - smoothAmount) + randomX,
                y: smoothY * smoothAmount + current.y * (1 - smoothAmount) + randomY
            });
        }

        smoothed.push(path[path.length - 1]);
        return smoothed;
    }

    enablePlaybackControls() {
        document.getElementById('play-pause-btn').disabled = false;
        document.getElementById('drawing-progress').disabled = false;
        document.getElementById('reset-drawing').disabled = false;
    }

    // ========== PLAYBACK CONTROLS ==========
    togglePlayback() {
        if (!this.strokePaths.length) return;

        this.isPlaying = !this.isPlaying;

        if (this.isPlaying) {
            document.getElementById('play-pause-btn').textContent = '⏸ Pause Drawing';
            this.animationStartTime = performance.now();
            this.animate();
        } else {
            document.getElementById('play-pause-btn').textContent = '▶ Play Drawing';
        }
    }

    animate() {
        if (!this.isPlaying) return;

        const elapsed = (performance.now() - this.animationStartTime) / 1000 * this.playbackSpeed;
        const progress = Math.min(elapsed / this.drawingDuration, 1);

        this.drawingProgress = progress;

        // Update progress slider
        const slider = document.getElementById('drawing-progress');
        const valueDisplay = document.getElementById('drawing-progress-value');
        slider.value = progress * 100;
        valueDisplay.textContent = Math.round(progress * 100) + '%';

        this.render();

        if (progress < 1 && this.isPlaying) {
            requestAnimationFrame(() => this.animate());
        } else if (progress >= 1) {
            this.isPlaying = false;
            document.getElementById('play-pause-btn').textContent = '▶ Play Drawing';
        }
    }

    resetDrawing() {
        this.isPlaying = false;
        this.drawingProgress = 0;

        // Reset UI
        document.getElementById('play-pause-btn').textContent = '▶ Play Drawing';
        document.getElementById('drawing-progress').value = 0;
        document.getElementById('drawing-progress-value').textContent = '0%';

        this.render();
    }

    // ========== CANVAS RESIZE HANDLING ==========
    onCanvasResized(e) {
        const oldWidth = this.previousCanvasSize.width;
        const oldHeight = this.previousCanvasSize.height;
        const newWidth = e.detail.canvas.width;
        const newHeight = e.detail.canvas.height;

        if (this.strokePaths.length > 0) {
            const scaleX = newWidth / oldWidth;
            const scaleY = newHeight / oldHeight;

            // Scale stroke paths
            this.strokePaths.forEach(stroke => {
                stroke.points.forEach(point => {
                    point.x *= scaleX;
                    point.y *= scaleY;
                });
            });
        }

        this.previousCanvasSize = { width: newWidth, height: newHeight };
        this.render();
    }

    // ========== RENDERING SYSTEM ==========
    render() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background FIRST (mandatory)
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            Chatooly.backgroundManager.drawToCanvas(ctx, canvas.width, canvas.height);
        }

        // Show reference photo if enabled
        if (this.showReference && this.portraitImage) {
            this.drawReferenceImage();
        }

        // Draw illustration strokes
        if (this.strokePaths.length > 0) {
            this.drawIllustration();
        }

        // Draw typography overlay
        if (this.enableTypography) {
            this.drawTypography();

            // Request next frame for continuous animations
            if (this.textAnimation === 'wave' || this.textAnimation === 'glitch') {
                requestAnimationFrame(() => this.render());
            }
        }

        // Request next frame for dynamic features
        if (this.dynamicLayers || this.audioVisualization) {
            requestAnimationFrame(() => this.render());
        }

        // Draw composition guides if enabled
        if (this.showCompositionGuides) {
            this.drawCompositionGuides();
        }

        // Draw placeholder text if no portrait
        if (!this.portraitImage) {
            ctx.fillStyle = '#666';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Upload a portrait to begin illustration', canvas.width / 2, canvas.height / 2);
        }
    }

    drawReferenceImage() {
        ctx.save();
        ctx.globalAlpha = 0.3;

        // Draw reference image scaled to fit
        const scale = Math.min(canvas.width / this.portraitImage.width,
                              canvas.height / this.portraitImage.height);
        const scaledWidth = this.portraitImage.width * scale;
        const scaledHeight = this.portraitImage.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;

        ctx.drawImage(this.portraitImage, x, y, scaledWidth, scaledHeight);
        ctx.restore();
    }

    drawIllustration() {
        const strokesToShow = Math.floor(this.drawingProgress * this.strokePaths.length);

        ctx.save();

        // Apply illustration mode filters
        this.applyIllustrationMode();
        this.setDrawingStyle();

        // Apply dynamic layer blending if enabled
        if (this.dynamicLayers) {
            this.applyDynamicLayerBlending();
        }

        for (let i = 0; i < strokesToShow; i++) {
            const stroke = this.strokePaths[i];
            this.drawStroke(stroke);
        }

        // Draw partial stroke if in progress
        if (strokesToShow < this.strokePaths.length) {
            const currentStroke = this.strokePaths[strokesToShow];
            const strokeProgress = (this.drawingProgress * this.strokePaths.length) - strokesToShow;
            const pointsToShow = Math.floor(strokeProgress * currentStroke.points.length);

            if (pointsToShow > 1) {
                const partialStroke = {
                    ...currentStroke,
                    points: currentStroke.points.slice(0, pointsToShow)
                };
                this.drawStroke(partialStroke);
            }
        }

        // Apply artistic filters if enabled
        if (this.filterIntensity > 0) {
            this.applyArtisticFilters();
        }

        ctx.restore();
    }

    applyIllustrationMode() {
        const intensity = this.filterIntensity / 100;

        switch (this.illustrationMode) {
            case 'cartoon':
                // Cartoon style - thicker outlines, flatter colors
                this.lineWeight *= (1 + intensity * 0.5);
                break;

            case 'abstract':
                // Abstract style - add randomness to stroke paths
                ctx.globalCompositeOperation = intensity > 0.3 ? 'multiply' : 'normal';
                break;

            case 'minimalist':
                // Minimalist - reduce stroke density and simplify
                ctx.globalAlpha = 1 - (intensity * 0.3);
                break;

            case 'expressionist':
                // Expressionist - bolder, more dramatic strokes
                this.lineWeight *= (1 + intensity);
                ctx.globalCompositeOperation = 'overlay';
                break;

            case 'pop-art':
                // Pop art - high contrast, bold colors
                ctx.filter = `contrast(${100 + intensity * 100}%) saturate(${100 + intensity * 200}%)`;
                break;

            case 'sketch-book':
                // Sketch book - softer, more organic feel
                ctx.globalAlpha = 0.8;
                ctx.filter = `blur(${intensity * 0.5}px)`;
                break;

            case 'digital-painting':
                // Digital painting - smoother, blended strokes
                ctx.filter = `blur(${intensity * 1}px)`;
                ctx.globalCompositeOperation = 'multiply';
                break;

            default:
                // Realistic - no modifications
                break;
        }
    }

    applyArtisticFilters() {
        // This would be applied as a post-process step
        const intensity = this.filterIntensity / 100;

        // Create a temporary canvas for filter effects
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;

        // Copy current canvas content
        tempCtx.drawImage(canvas, 0, 0);

        // Apply artistic filters based on illustration mode
        if (this.illustrationMode === 'abstract' && intensity > 0.5) {
            this.addAbstractNoise(tempCtx, intensity);
        } else if (this.illustrationMode === 'expressionist') {
            this.addExpressionistTexture(tempCtx, intensity);
        }
    }

    addAbstractNoise(ctx, intensity) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * intensity * 50;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));     // Red
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // Green
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // Blue
        }

        ctx.putImageData(imageData, 0, 0);
    }

    addExpressionistTexture(ctx, intensity) {
        ctx.save();
        ctx.globalAlpha = intensity * 0.2;
        ctx.globalCompositeOperation = 'multiply';

        // Add dramatic texture strokes
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.lineWidth = Math.random() * 5 + 1;
            ctx.stroke();
        }

        ctx.restore();
    }

    setDrawingStyle() {
        ctx.lineWidth = this.lineWeight;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Get base color from palette
        const baseColor = this.getPaletteColor();

        switch (this.drawingStyle) {
            case 'pencil':
                ctx.strokeStyle = this.applyColorPalette(baseColor, 0.8);
                break;
            case 'pen':
                ctx.strokeStyle = this.applyColorPalette(baseColor, 0.9);
                ctx.lineWidth = this.lineWeight * 0.8;
                break;
            case 'charcoal':
                ctx.strokeStyle = this.applyColorPalette(baseColor, 0.7);
                ctx.lineWidth = this.lineWeight * 1.5;
                break;
            case 'watercolor':
                ctx.strokeStyle = this.applyColorPalette(baseColor, 0.6);
                ctx.lineWidth = this.lineWeight * 1.2;
                break;
            case 'ink-wash':
                ctx.strokeStyle = this.applyColorPalette(baseColor, 0.8);
                ctx.lineWidth = this.lineWeight * 1.3;
                break;
            case 'marker':
                ctx.strokeStyle = this.applyColorPalette(baseColor, 0.75);
                ctx.lineWidth = this.lineWeight * 2;
                ctx.lineCap = 'square';
                break;
            case 'brush-pen':
                ctx.strokeStyle = this.applyColorPalette(baseColor, 0.85);
                ctx.lineWidth = this.lineWeight * 1.8;
                break;
            case 'conte':
                ctx.strokeStyle = this.applyColorPalette(baseColor, 0.7);
                ctx.lineWidth = this.lineWeight * 1.2;
                break;
            case 'pastel':
                ctx.strokeStyle = this.applyColorPalette(baseColor, 0.6);
                ctx.lineWidth = this.lineWeight * 2.5;
                break;
            case 'oil-paint':
                ctx.strokeStyle = this.applyColorPalette(baseColor, 0.9);
                ctx.lineWidth = this.lineWeight * 2;
                ctx.lineJoin = 'miter';
                break;
            case 'acrylic':
                ctx.strokeStyle = this.applyColorPalette(baseColor, 0.85);
                ctx.lineWidth = this.lineWeight * 1.5;
                break;
            case 'dry-brush':
                ctx.strokeStyle = this.applyColorPalette(baseColor, 0.6);
                ctx.lineWidth = this.lineWeight * 0.7;
                break;
            case 'chalk':
                ctx.strokeStyle = this.applyColorPalette(baseColor, 0.8);
                ctx.lineWidth = this.lineWeight * 3;
                break;
            case 'stipple':
                ctx.strokeStyle = this.applyColorPalette(baseColor, 0.9);
                ctx.lineWidth = this.lineWeight * 0.3;
                ctx.lineCap = 'round';
                break;
            case 'crosshatch':
                ctx.strokeStyle = this.applyColorPalette(baseColor, 0.8);
                ctx.lineWidth = this.lineWeight * 0.5;
                ctx.lineCap = 'square';
                break;
        }
    }

    getPaletteColor() {
        switch (this.colorPalette) {
            case 'monochrome':
                return { r: 60, g: 60, b: 60 };
            case 'sepia':
                return { r: 139, g: 69, b: 19 };
            case 'cool':
                return { r: 70, g: 130, b: 180 };
            case 'warm':
                return { r: 160, g: 82, b: 45 };
            case 'vibrant':
                return { r: 220, g: 20, b: 60 };
            case 'pastel':
                return { r: 180, g: 160, b: 200 };
            case 'neon':
                return { r: 57, g: 255, b: 20 };
            case 'vintage':
                return { r: 100, g: 60, b: 40 };
            default:
                return { r: 60, g: 60, b: 60 };
        }
    }

    applyColorPalette(baseColor, alpha) {
        return `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${alpha})`;
    }

    drawStroke(stroke) {
        if (stroke.points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        // Draw smooth curves between points
        for (let i = 1; i < stroke.points.length - 1; i++) {
            const cp1x = (stroke.points[i - 1].x + stroke.points[i].x) / 2;
            const cp1y = (stroke.points[i - 1].y + stroke.points[i].y) / 2;
            const cp2x = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
            const cp2y = (stroke.points[i].y + stroke.points[i + 1].y) / 2;

            ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, cp2x, cp2y);
        }

        // Draw to final point
        if (stroke.points.length > 1) {
            const lastPoint = stroke.points[stroke.points.length - 1];
            ctx.lineTo(lastPoint.x, lastPoint.y);
        }

        ctx.stroke();

        // Add texture if enabled
        if (this.textureIntensity > 0) {
            this.addTexture(stroke);
        }
    }

    addTexture(stroke) {
        const intensity = this.textureIntensity / 100;
        ctx.save();
        ctx.globalAlpha = intensity * 0.3;

        // Add subtle texture dots along the stroke
        for (let i = 0; i < stroke.points.length; i += 3) {
            const point = stroke.points[i];
            const size = Math.random() * 2 + 1;

            ctx.beginPath();
            ctx.arc(point.x + (Math.random() - 0.5) * 3,
                   point.y + (Math.random() - 0.5) * 3,
                   size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    drawTypography() {
        if (!this.mainText && !this.subtitleText) return;

        ctx.save();

        // Apply text transformation
        const textX = (this.textX / 100) * canvas.width;
        const textY = (this.textY / 100) * canvas.height;

        ctx.translate(textX, textY);
        if (this.textRotation !== 0) {
            ctx.rotate((this.textRotation * Math.PI) / 180);
        }

        // Set text properties
        let fontWeight = 'normal';
        let fontStyle = 'normal';

        switch (this.textStyle) {
            case 'bold':
                fontWeight = 'bold';
                break;
            case 'italic':
                fontStyle = 'italic';
                break;
            case 'bold-italic':
                fontWeight = 'bold';
                fontStyle = 'italic';
                break;
        }

        const font = `${fontStyle} ${fontWeight} ${this.fontSize}px ${this.fontFamily}`;
        ctx.font = font;
        ctx.textAlign = this.textAlign;
        ctx.textBaseline = 'top';

        // Apply letter spacing
        if (this.letterSpacing !== 0) {
            ctx.letterSpacing = `${this.letterSpacing}px`;
        }

        // Calculate animation progress
        const animationProgress = this.textAnimation !== 'none' ?
            this.calculateAnimationProgress() : 1;

        // Set base opacity with animation
        const baseOpacity = (this.textOpacity / 100) * animationProgress;

        // Draw main text
        if (this.mainText) {
            this.drawStyledText(this.mainText, 0, 0, baseOpacity, this.fontSize);
        }

        // Draw subtitle
        if (this.subtitleText) {
            const subtitleSize = this.fontSize * 0.6;
            const subtitleY = this.fontSize + 10;
            this.drawStyledText(this.subtitleText, 0, subtitleY, baseOpacity * 0.8, subtitleSize);
        }

        ctx.restore();
    }

    calculateAnimationProgress() {
        if (this.textAnimation === 'none') return 1;

        const elapsed = performance.now() - this.animationStartTime;
        const progress = Math.min(elapsed / this.textAnimationDuration, 1);

        switch (this.textAnimation) {
            case 'fade-in':
                return progress;
            case 'slide-up':
                return progress;
            case 'typewriter':
                return progress;
            case 'bounce':
                return progress <= 0.5 ?
                    1 - Math.cos(progress * Math.PI * 4) * 0.3 : 1;
            case 'wave':
                return 0.5 + 0.5 * Math.sin(elapsed * 0.005);
            case 'glitch':
                return 0.7 + 0.3 * Math.random();
            default:
                return 1;
        }
    }

    drawStyledText(text, x, y, opacity, fontSize) {
        ctx.save();

        // Update font size for this text
        let fontWeight = 'normal';
        let fontStyle = 'normal';
        switch (this.textStyle) {
            case 'bold': fontWeight = 'bold'; break;
            case 'italic': fontStyle = 'italic'; break;
            case 'bold-italic': fontWeight = 'bold'; fontStyle = 'italic'; break;
        }
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${this.fontFamily}`;

        // Apply text curve
        let displayText = text;
        let textPositions = [];

        if (this.textCurve !== 0 && text.length > 1) {
            textPositions = this.calculateCurvedTextPositions(text, fontSize);
        } else {
            textPositions = [{ char: text, x: x, y: y }];
        }

        // Apply text animation transformations
        if (this.textAnimation === 'slide-up') {
            const slideOffset = (1 - opacity) * 50;
            y += slideOffset;
        } else if (this.textAnimation === 'glitch') {
            x += (Math.random() - 0.5) * 4;
            y += (Math.random() - 0.5) * 4;
        }

        // Apply text effects
        switch (this.textEffect) {
            case 'outline':
                this.drawOutlineText(textPositions, opacity);
                break;
            case 'glow':
                this.drawGlowText(textPositions, opacity);
                break;
            case 'emboss':
                this.drawEmbossText(textPositions, opacity);
                break;
            case 'gradient':
                this.drawGradientText(textPositions, opacity);
                break;
            case 'vintage':
                this.drawVintageText(textPositions, opacity);
                break;
            case 'neon':
                this.drawNeonText(textPositions, opacity);
                break;
            case 'carved':
                this.drawCarvedText(textPositions, opacity);
                break;
            default:
                this.drawNormalText(textPositions, opacity);
                break;
        }

        ctx.restore();
    }

    calculateCurvedTextPositions(text, fontSize) {
        const positions = [];
        const curveIntensity = this.textCurve / 100;
        const radius = 200 / Math.abs(curveIntensity);
        const totalWidth = ctx.measureText(text).width;
        const angleSpan = (totalWidth / radius) * (curveIntensity > 0 ? 1 : -1);

        let currentAngle = -angleSpan / 2;
        let currentX = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const charWidth = ctx.measureText(char).width;

            if (Math.abs(curveIntensity) > 0.1) {
                const x = Math.sin(currentAngle) * radius;
                const y = (1 - Math.cos(currentAngle)) * radius * Math.sign(curveIntensity);
                positions.push({ char, x: x + currentX, y: y });
                currentAngle += (charWidth / radius);
            } else {
                positions.push({ char, x: currentX, y: 0 });
            }
            currentX += charWidth + this.letterSpacing;
        }

        return positions;
    }

    drawNormalText(textPositions, opacity) {
        const color = this.hexToRgba(this.textColor, opacity);
        ctx.fillStyle = color;

        // Draw text shadow if enabled
        if (this.textShadow) {
            ctx.save();
            ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.5})`;
            for (const pos of textPositions) {
                if (pos.char.trim()) {
                    ctx.fillText(pos.char, pos.x + 3, pos.y + 3);
                }
            }
            ctx.restore();
        }

        // Draw main text
        ctx.fillStyle = color;
        for (const pos of textPositions) {
            ctx.fillText(pos.char, pos.x, pos.y);
        }
    }

    drawOutlineText(textPositions, opacity) {
        // Draw outline
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 3;
        for (const pos of textPositions) {
            ctx.strokeText(pos.char, pos.x, pos.y);
        }

        // Draw fill
        const color = this.hexToRgba(this.textColor, opacity);
        ctx.fillStyle = color;
        for (const pos of textPositions) {
            ctx.fillText(pos.char, pos.x, pos.y);
        }
    }

    drawGlowText(textPositions, opacity) {
        const color = this.hexToRgba(this.textColor, opacity);

        // Draw glow effect
        ctx.save();
        ctx.shadowColor = this.textColor;
        ctx.shadowBlur = 20;
        ctx.fillStyle = color;
        for (const pos of textPositions) {
            ctx.fillText(pos.char, pos.x, pos.y);
        }
        ctx.restore();

        // Draw main text
        ctx.fillStyle = color;
        for (const pos of textPositions) {
            ctx.fillText(pos.char, pos.x, pos.y);
        }
    }

    drawEmbossText(textPositions, opacity) {
        // Draw shadow (darker)
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.5})`;
        for (const pos of textPositions) {
            ctx.fillText(pos.char, pos.x + 2, pos.y + 2);
        }

        // Draw highlight (lighter)
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
        for (const pos of textPositions) {
            ctx.fillText(pos.char, pos.x - 1, pos.y - 1);
        }

        // Draw main text
        const color = this.hexToRgba(this.textColor, opacity);
        ctx.fillStyle = color;
        for (const pos of textPositions) {
            ctx.fillText(pos.char, pos.x, pos.y);
        }
    }

    drawGradientText(textPositions, opacity) {
        // Create gradient
        const gradient = ctx.createLinearGradient(0, -this.fontSize, 0, 0);
        const r = parseInt(this.textColor.slice(1, 3), 16);
        const g = parseInt(this.textColor.slice(3, 5), 16);
        const b = parseInt(this.textColor.slice(5, 7), 16);

        gradient.addColorStop(0, `rgba(${Math.min(r + 50, 255)}, ${Math.min(g + 50, 255)}, ${Math.min(b + 50, 255)}, ${opacity})`);
        gradient.addColorStop(1, `rgba(${Math.max(r - 50, 0)}, ${Math.max(g - 50, 0)}, ${Math.max(b - 50, 0)}, ${opacity})`);

        ctx.fillStyle = gradient;
        for (const pos of textPositions) {
            ctx.fillText(pos.char, pos.x, pos.y);
        }
    }

    drawVintageText(textPositions, opacity) {
        // Vintage sepia effect
        ctx.fillStyle = `rgba(139, 69, 19, ${opacity})`;
        for (const pos of textPositions) {
            ctx.fillText(pos.char, pos.x, pos.y);
        }

        // Add texture overlay
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = `rgba(160, 82, 45, ${opacity * 0.3})`;
        for (const pos of textPositions) {
            ctx.fillText(pos.char, pos.x + 1, pos.y + 1);
        }
        ctx.restore();
    }

    drawNeonText(textPositions, opacity) {
        const color = this.hexToRgba(this.textColor, opacity);

        // Draw multiple glow layers for neon effect
        for (let i = 5; i >= 1; i--) {
            ctx.save();
            ctx.shadowColor = this.textColor;
            ctx.shadowBlur = i * 8;
            ctx.fillStyle = color;
            for (const pos of textPositions) {
                ctx.fillText(pos.char, pos.x, pos.y);
            }
            ctx.restore();
        }

        // Draw bright core
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        for (const pos of textPositions) {
            ctx.fillText(pos.char, pos.x, pos.y);
        }
    }

    drawCarvedText(textPositions, opacity) {
        // Draw deep shadow
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.8})`;
        for (const pos of textPositions) {
            ctx.fillText(pos.char, pos.x + 3, pos.y + 3);
        }

        // Draw intermediate shadow
        ctx.fillStyle = `rgba(100, 100, 100, ${opacity * 0.6})`;
        for (const pos of textPositions) {
            ctx.fillText(pos.char, pos.x + 1, pos.y + 1);
        }

        // Draw carved edge highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
        for (const pos of textPositions) {
            ctx.fillText(pos.char, pos.x - 1, pos.y - 1);
        }
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Enhanced stroke drawing for special brush styles
    drawStroke(stroke) {
        if (stroke.points.length < 2) return;

        // Special rendering for stipple and crosshatch
        if (this.drawingStyle === 'stipple') {
            this.drawStippleStroke(stroke);
            return;
        } else if (this.drawingStyle === 'crosshatch') {
            this.drawCrosshatchStroke(stroke);
            return;
        }

        // Standard stroke drawing
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        // Draw smooth curves between points
        for (let i = 1; i < stroke.points.length - 1; i++) {
            const cp1x = (stroke.points[i - 1].x + stroke.points[i].x) / 2;
            const cp1y = (stroke.points[i - 1].y + stroke.points[i].y) / 2;
            const cp2x = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
            const cp2y = (stroke.points[i].y + stroke.points[i + 1].y) / 2;

            ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, cp2x, cp2y);
        }

        // Draw to final point
        if (stroke.points.length > 1) {
            const lastPoint = stroke.points[stroke.points.length - 1];
            ctx.lineTo(lastPoint.x, lastPoint.y);
        }

        ctx.stroke();

        // Add texture if enabled
        if (this.textureIntensity > 0) {
            this.addTexture(stroke);
        }
    }

    drawStippleStroke(stroke) {
        // Draw stipple effect with dots
        ctx.save();
        for (let i = 0; i < stroke.points.length; i += 2) {
            const point = stroke.points[i];
            const size = Math.random() * 2 + 0.5;

            ctx.beginPath();
            ctx.arc(point.x + (Math.random() - 0.5) * 2,
                   point.y + (Math.random() - 0.5) * 2,
                   size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    drawCrosshatchStroke(stroke) {
        // Draw crosshatch pattern
        ctx.save();

        // Draw main stroke
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();

        // Draw perpendicular crosshatch lines
        for (let i = 0; i < stroke.points.length - 1; i += 3) {
            const current = stroke.points[i];
            const next = stroke.points[i + 1] || current;

            // Calculate perpendicular direction
            const dx = next.x - current.x;
            const dy = next.y - current.y;
            const length = Math.sqrt(dx * dx + dy * dy);

            if (length > 0) {
                const perpX = -dy / length * 3;
                const perpY = dx / length * 3;

                ctx.beginPath();
                ctx.moveTo(current.x - perpX, current.y - perpY);
                ctx.lineTo(current.x + perpX, current.y + perpY);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    applyPerformanceMode() {
        switch (this.performanceMode) {
            case 'live-performance':
                // Increase animation speed and add more dramatic effects
                this.playbackSpeed = Math.max(this.playbackSpeed, 1.5);
                this.textureIntensity = Math.max(this.textureIntensity, 70);
                break;

            case 'storytelling':
                // Slower, more deliberate pacing with emphasis on composition
                this.playbackSpeed = Math.min(this.playbackSpeed, 0.7);
                this.showCompositionGuides = true;
                break;

            case 'kinetic-portrait':
                // Dynamic movement and energy in the drawing
                this.strokeMessiness = Math.max(this.strokeMessiness, 60);
                this.dynamicLayers = true;
                break;

            case 'emotional-journey':
                // Color and style changes based on emotion
                this.updateEmotionState();
                break;

            default:
                // Standard mode - no modifications
                break;
        }
    }

    updateEmotionState() {
        const intensity = this.emotionIntensity;

        if (intensity < 20) {
            this.emotionState = 'melancholy';
            this.colorPalette = 'cool';
        } else if (intensity < 40) {
            this.emotionState = 'contemplative';
            this.colorPalette = 'sepia';
        } else if (intensity < 60) {
            this.emotionState = 'neutral';
            this.colorPalette = 'monochrome';
        } else if (intensity < 80) {
            this.emotionState = 'uplifting';
            this.colorPalette = 'warm';
        } else {
            this.emotionState = 'energetic';
            this.colorPalette = 'vibrant';
        }

        // Apply emotion-based style modifications
        if (this.performanceMode === 'emotional-journey') {
            this.applyEmotionalStyle();
        }
    }

    applyEmotionalStyle() {
        switch (this.emotionState) {
            case 'melancholy':
                this.lineWeight = Math.max(this.lineWeight, 3);
                this.strokeMessiness = Math.min(this.strokeMessiness, 20);
                break;

            case 'contemplative':
                this.textureIntensity = Math.max(this.textureIntensity, 40);
                break;

            case 'uplifting':
                this.strokeMessiness = Math.max(this.strokeMessiness, 30);
                break;

            case 'energetic':
                this.lineWeight = Math.max(this.lineWeight, 4);
                this.strokeMessiness = Math.max(this.strokeMessiness, 70);
                this.textureIntensity = Math.max(this.textureIntensity, 80);
                break;
        }
    }

    initAudioVisualization() {
        // Initialize Web Audio API for reactive drawing
        if (!navigator.mediaDevices) return;

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const analyser = audioContext.createAnalyser();
                const microphone = audioContext.createMediaStreamSource(stream);

                analyser.fftSize = 256;
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);

                microphone.connect(analyser);

                this.audioAnalyser = analyser;
                this.audioDataArray = dataArray;
                this.audioStream = stream;

                this.startAudioReactiveDrawing();
            })
            .catch(err => {
                console.warn('Audio visualization not available:', err);
                // Disable audio visualization
                document.getElementById('audio-visualization').setAttribute('aria-pressed', 'false');
                this.audioVisualization = false;
            });
    }

    startAudioReactiveDrawing() {
        if (!this.audioVisualization || !this.audioAnalyser) return;

        this.audioAnalyser.getByteFrequencyData(this.audioDataArray);

        // Calculate average audio level
        let sum = 0;
        for (let i = 0; i < this.audioDataArray.length; i++) {
            sum += this.audioDataArray[i];
        }
        const average = sum / this.audioDataArray.length;

        // Apply audio reactivity to drawing parameters
        const audioIntensity = average / 255;
        this.lineWeight = 1 + (audioIntensity * 5);
        this.strokeMessiness = Math.min(100, 20 + (audioIntensity * 60));

        // Continue animation if audio visualization is enabled
        if (this.audioVisualization) {
            requestAnimationFrame(() => this.startAudioReactiveDrawing());
        }

        // Trigger render if there are strokes to show
        if (this.strokePaths.length > 0) {
            this.render();
        }
    }

    applyDynamicLayerBlending() {
        // Create time-based dynamic blending effects
        const time = performance.now() * 0.001;
        const intensity = this.emotionIntensity / 100;

        // Cycle through different blend modes
        const blendModes = ['normal', 'multiply', 'screen', 'overlay', 'soft-light'];
        const currentMode = blendModes[Math.floor(time * 0.5) % blendModes.length];

        ctx.globalCompositeOperation = currentMode;
        ctx.globalAlpha = 0.7 + (Math.sin(time * 2) * 0.3 * intensity);
    }

    drawCompositionGuides() {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        // Rule of thirds lines
        const thirdX = canvas.width / 3;
        const thirdY = canvas.height / 3;

        // Vertical thirds
        ctx.beginPath();
        ctx.moveTo(thirdX, 0);
        ctx.lineTo(thirdX, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(thirdX * 2, 0);
        ctx.lineTo(thirdX * 2, canvas.height);
        ctx.stroke();

        // Horizontal thirds
        ctx.beginPath();
        ctx.moveTo(0, thirdY);
        ctx.lineTo(canvas.width, thirdY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, thirdY * 2);
        ctx.lineTo(canvas.width, thirdY * 2);
        ctx.stroke();

        // Center lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.setLineDash([2, 8]);

        // Vertical center
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();

        // Horizontal center
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        // Golden ratio spiral guide (simplified)
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 2;

        const goldenRatio = 1.618;
        const spiralCenterX = canvas.width / goldenRatio;
        const spiralCenterY = canvas.height / goldenRatio;

        ctx.beginPath();
        ctx.arc(spiralCenterX, spiralCenterY, Math.min(canvas.width, canvas.height) / 4, 0, Math.PI / 2);
        ctx.stroke();

        ctx.restore();
    }
}

// ========== HIGH-RESOLUTION EXPORT FUNCTION (MANDATORY) ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!window.livePortraitArtist) {
        console.warn('Live Portrait Artist not ready for export');
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

    const artist = window.livePortraitArtist;

    // Temporarily switch context for export
    const originalCtx = ctx;
    ctx = exportCtx;

    // Draw reference if enabled
    if (artist.showReference && artist.portraitImage) {
        artist.drawReferenceImage();
    }

    // Draw illustration
    if (artist.strokePaths.length > 0) {
        artist.drawIllustration();
    }

    // Draw typography
    if (artist.enableTypography) {
        artist.drawTypography();
    }

    // Restore original context
    ctx = originalCtx;

    console.log(`High-res portrait illustration export completed at ${scale}x resolution`);
};

// ========== INITIALIZE TOOL ==========
document.addEventListener('DOMContentLoaded', () => {
    window.livePortraitArtist = new LivePortraitArtist();
});