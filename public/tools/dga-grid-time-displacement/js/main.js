/**
 * Grid Time Displacement - Main Logic
 *
 * Core video processing, displacement mapping, and canvas rendering.
 * Each grid cell displays the video at a different time offset based on
 * displacement maps (noise, linear gradient, or circular gradient).
 */

// ============================================
// Global State
// ============================================

const canvas = document.getElementById('chatooly-canvas');
const ctx = canvas.getContext('2d');
const sourceVideo = document.getElementById('source-video');

// Set canvas dimensions (1920x1080)
canvas.width = 1920;
canvas.height = 1080;

// Offscreen canvas for double buffering (prevents tearing/flashing)
const offscreenCanvas = document.createElement('canvas');
offscreenCanvas.width = 1920;
offscreenCanvas.height = 1080;
const offscreenCtx = offscreenCanvas.getContext('2d');

// Frame buffer for smooth playback
let frameBuffer = [];
let frameRate = 30;
let totalFrames = 0;
let isBuffering = false;
let bufferProgress = 0;

// Displacement map (2D array of values 0-1)
let displacementMap = [];

// Noise animation state
let noiseTime = 0;
let noiseSeed = Math.random() * 1000;

// Animation state
let animationId = null;
let lastTime = 0;
let currentFrame = 0;

// Video dimensions after letterboxing
let videoRect = { x: 0, y: 0, width: 1920, height: 1080 };

// ============================================
// Settings Object
// ============================================

const settings = {
    // Grid
    gridCols: 8,
    gridRows: 6,

    // Grid appearance
    showGrid: false,
    gridColor: '#ffffff',
    gridWidth: 1,

    // Displacement mode
    displacementMode: 'random',

    // Random mode
    noiseSize: 1.0,
    noiseContrast: 1.0,
    noiseAnimated: false,
    noiseAnimationSpeed: 0.5,

    // Linear mode
    linearDirection: 'horizontal',
    linearFromCenter: false,

    // Circular mode
    circularCenterX: 0.5,
    circularCenterY: 0.5,

    // Playback
    maxFrameOffset: 30,
    isPlaying: true,

    // Video loaded state
    videoLoaded: false
};

// Expose settings globally for ui.js
window.settings = settings;

// ============================================
// Simplex Noise Implementation
// ============================================

// Simple 2D noise function based on permutation table
const permutation = [];
for (let i = 0; i < 256; i++) permutation[i] = i;

function shufflePermutation(seed) {
    const rng = seedRandom(seed);
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
    }
}

function seedRandom(seed) {
    return function() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
}

function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a, b, t) {
    return a + t * (b - a);
}

function grad(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = fade(x);
    const v = fade(y);

    const p = permutation;
    const A = p[X] + Y;
    const B = p[X + 1] + Y;

    return lerp(
        lerp(grad(p[A], x, y), grad(p[B], x - 1, y), u),
        lerp(grad(p[A + 1], x, y - 1), grad(p[B + 1], x - 1, y - 1), u),
        v
    );
}

// ============================================
// Displacement Map Generators
// ============================================

/**
 * Generate noise-based displacement map
 */
function generateNoiseMap(cols, rows, size, contrast, time = 0) {
    shufflePermutation(noiseSeed);
    const map = [];

    for (let row = 0; row < rows; row++) {
        map[row] = [];
        for (let col = 0; col < cols; col++) {
            // Sample noise at cell center
            const nx = (col + 0.5) / cols * size + time;
            const ny = (row + 0.5) / rows * size;

            // Get noise value (-1 to 1) and normalize to (0 to 1)
            let value = (noise2D(nx, ny) + 1) / 2;

            // Apply contrast
            value = Math.pow(value, 1 / contrast);
            value = Math.max(0, Math.min(1, value));

            map[row][col] = value;
        }
    }

    return map;
}

/**
 * Generate linear gradient displacement map
 */
function generateLinearMap(cols, rows, direction, fromCenter) {
    const map = [];

    for (let row = 0; row < rows; row++) {
        map[row] = [];
        for (let col = 0; col < cols; col++) {
            let value;

            if (direction === 'horizontal') {
                value = (col + 0.5) / cols;
            } else {
                value = (row + 0.5) / rows;
            }

            if (fromCenter) {
                // Transform 0-1 to distance from center (0 at edges, 1 at center)
                value = 1 - Math.abs(value - 0.5) * 2;
            }

            map[row][col] = value;
        }
    }

    return map;
}

/**
 * Generate circular gradient displacement map
 */
function generateCircularMap(cols, rows, centerX, centerY) {
    const map = [];

    // Calculate max distance for normalization
    const maxDist = Math.sqrt(
        Math.max(centerX, 1 - centerX) ** 2 +
        Math.max(centerY, 1 - centerY) ** 2
    );

    for (let row = 0; row < rows; row++) {
        map[row] = [];
        for (let col = 0; col < cols; col++) {
            // Cell center in normalized coordinates
            const cx = (col + 0.5) / cols;
            const cy = (row + 0.5) / rows;

            // Distance from center point
            const dx = cx - centerX;
            const dy = cy - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Normalize distance (0 at center, 1 at furthest point)
            const value = dist / maxDist;

            map[row][col] = Math.min(1, value);
        }
    }

    return map;
}

/**
 * Update displacement map based on current settings
 */
function updateDisplacementMap() {
    const { gridCols, gridRows, displacementMode } = settings;

    switch (displacementMode) {
        case 'random':
            displacementMap = generateNoiseMap(
                gridCols, gridRows,
                settings.noiseSize,
                settings.noiseContrast,
                settings.noiseAnimated ? noiseTime : 0
            );
            break;

        case 'linear':
            displacementMap = generateLinearMap(
                gridCols, gridRows,
                settings.linearDirection,
                settings.linearFromCenter
            );
            break;

        case 'circular':
            displacementMap = generateCircularMap(
                gridCols, gridRows,
                settings.circularCenterX,
                settings.circularCenterY
            );
            break;
    }
}

// Expose for UI
window.updateDisplacementMap = updateDisplacementMap;

/**
 * Regenerate noise with new seed
 */
function regenerateNoise() {
    noiseSeed = Math.random() * 1000;
    updateDisplacementMap();
}

window.regenerateNoise = regenerateNoise;

// ============================================
// Video Loading and Frame Extraction
// ============================================

/**
 * Calculate letterbox dimensions for video
 */
function calculateVideoRect(videoWidth, videoHeight) {
    const canvasAspect = canvas.width / canvas.height;
    const videoAspect = videoWidth / videoHeight;

    let width, height, x, y;

    if (videoAspect > canvasAspect) {
        // Video is wider - fit to width
        width = canvas.width;
        height = canvas.width / videoAspect;
        x = 0;
        y = (canvas.height - height) / 2;
    } else {
        // Video is taller - fit to height
        height = canvas.height;
        width = canvas.height * videoAspect;
        x = (canvas.width - width) / 2;
        y = 0;
    }

    return { x, y, width, height };
}

/**
 * Load video file and extract frames
 */
async function loadVideo(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        sourceVideo.src = url;

        sourceVideo.onloadedmetadata = () => {
            // Calculate frame info
            frameRate = 30; // Assume 30fps, could detect from video
            totalFrames = Math.floor(sourceVideo.duration * frameRate);

            // Calculate letterbox dimensions
            videoRect = calculateVideoRect(sourceVideo.videoWidth, sourceVideo.videoHeight);

            // Update UI with video info
            document.getElementById('video-name').textContent = file.name;
            document.getElementById('video-duration').textContent =
                `${sourceVideo.duration.toFixed(2)}s`;
            document.getElementById('video-frames').textContent = totalFrames;
            document.getElementById('video-info').style.display = 'block';

            // Hide upload area, show video info
            document.getElementById('video-upload-area').style.display = 'none';

            // Wait for video data to be ready before buffering
            const startBuffering = () => {
                bufferFrames().then(() => {
                    settings.videoLoaded = true;
                    resolve();
                }).catch(reject);
            };

            // Check if video is already ready to play
            if (sourceVideo.readyState >= 3) {
                startBuffering();
            } else {
                // Wait for canplay event
                sourceVideo.oncanplay = () => {
                    sourceVideo.oncanplay = null; // Clear handler
                    startBuffering();
                };
            }
        };

        sourceVideo.onerror = () => {
            reject(new Error('Failed to load video'));
        };
    });
}

window.loadVideo = loadVideo;

/**
 * Extract all frames from video into buffer using ImageBitmap (GPU-accelerated)
 */
async function bufferFrames() {
    isBuffering = true;

    // Clean up any existing bitmaps
    clearFrameBuffer();

    // Create temporary canvas for frame capture (reuse for all frames)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = sourceVideo.videoWidth;
    tempCanvas.height = sourceVideo.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Capture frames: seek -> draw to canvas -> create bitmap
    for (let i = 0; i < totalFrames; i++) {
        await seekToFrame(i);

        // Draw current video frame to temp canvas
        tempCtx.drawImage(sourceVideo, 0, 0);

        try {
            // Create ImageBitmap from canvas (faster than from video element)
            const bitmap = await createImageBitmap(tempCanvas);
            frameBuffer.push(bitmap);

        } catch (err) {
            console.error(`Failed to create bitmap for frame ${i}:`, err);
            frameBuffer.push(null);
        }

        bufferProgress = (i + 1) / totalFrames;

        // Yield to UI every 10 frames
        if (i % 10 === 0) {
            await new Promise(r => setTimeout(r, 0));
        }
    }

    // Validate frame buffer - fill any gaps with adjacent frames
    const missingFrames = frameBuffer.filter(b => !b).length;
    if (missingFrames > 0) {
        console.warn(`${missingFrames} frames failed to buffer, filling gaps...`);
        for (let i = 0; i < frameBuffer.length; i++) {
            if (!frameBuffer[i]) {
                frameBuffer[i] = frameBuffer[(i + 1) % totalFrames]
                              || frameBuffer[(i - 1 + totalFrames) % totalFrames];
            }
        }
    }

    isBuffering = false;
}

/**
 * Clean up frame buffer and release GPU memory
 */
function clearFrameBuffer() {
    for (const bitmap of frameBuffer) {
        if (bitmap && typeof bitmap.close === 'function') {
            bitmap.close();
        }
    }
    frameBuffer = [];
}

/**
 * Seek video to specific frame
 */
function seekToFrame(frameIndex) {
    return new Promise((resolve) => {
        const time = frameIndex / frameRate;

        // For frame 0, don't skip even if currentTime is already 0
        // The video might not be truly ready to draw yet
        if (frameIndex !== 0 && Math.abs(sourceVideo.currentTime - time) < 0.001) {
            resolve();
            return;
        }

        // Shorter timeout - seeks should be fast
        const timeout = setTimeout(() => {
            sourceVideo.removeEventListener('seeked', onSeeked);
            console.warn(`Seek to frame ${frameIndex} timed out`);
            resolve();
        }, 500);

        const onSeeked = () => {
            clearTimeout(timeout);
            resolve();
        };

        sourceVideo.addEventListener('seeked', onSeeked, { once: true });
        sourceVideo.currentTime = time;
    });
}

/**
 * Clear loaded video and release GPU memory
 */
function clearVideo() {
    sourceVideo.src = '';

    // Clean up ImageBitmaps to free GPU memory
    clearFrameBuffer();

    totalFrames = 0;
    settings.videoLoaded = false;
    currentFrame = 0;

    document.getElementById('video-info').style.display = 'none';
    document.getElementById('video-upload-area').style.display = 'flex';
    document.getElementById('video-upload').value = '';
}

window.clearVideo = clearVideo;

// ============================================
// Rendering
// ============================================

/**
 * Main render function - uses double buffering to prevent tearing
 */
function render() {
    // Draw everything to offscreen canvas first
    const renderCtx = offscreenCtx;

    // Always draw a black background first as base
    renderCtx.fillStyle = '#000000';
    renderCtx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw custom background on top if available
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.drawToCanvas(renderCtx, canvas.width, canvas.height);
    }

    // Show buffering progress during frame extraction (includes initial load)
    if (isBuffering) {
        drawBufferingProgressToCtx(renderCtx);
        ctx.drawImage(offscreenCanvas, 0, 0);
        return;
    }

    // If no video loaded, show placeholder
    if (!settings.videoLoaded || frameBuffer.length === 0) {
        drawPlaceholderToCtx(renderCtx);
        ctx.drawImage(offscreenCanvas, 0, 0);
        return;
    }

    // Draw grid cells with time displacement
    drawDisplacedGridToCtx(renderCtx);

    // Draw grid lines if enabled
    if (settings.showGrid) {
        drawGridLinesToCtx(renderCtx);
    }

    // Copy completed frame to visible canvas in one atomic operation
    ctx.drawImage(offscreenCanvas, 0, 0);
}

window.render = render;

/**
 * Draw buffering progress indicator
 */
function drawBufferingProgressToCtx(targetCtx) {
    // Ensure dark background for text visibility
    targetCtx.fillStyle = '#000000';
    targetCtx.fillRect(0, 0, canvas.width, canvas.height);

    targetCtx.fillStyle = '#ffffff';
    targetCtx.font = '24px monospace';
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
    targetCtx.fillText(
        `Buffering frames... ${Math.round(bufferProgress * 100)}%`,
        canvas.width / 2,
        canvas.height / 2
    );

    // Progress bar
    const barWidth = 400;
    const barHeight = 20;
    const barX = (canvas.width - barWidth) / 2;
    const barY = canvas.height / 2 + 40;

    targetCtx.strokeStyle = '#ffffff';
    targetCtx.lineWidth = 2;
    targetCtx.strokeRect(barX, barY, barWidth, barHeight);

    targetCtx.fillStyle = '#ffffff';
    targetCtx.fillRect(barX, barY, barWidth * bufferProgress, barHeight);
}

/**
 * Draw placeholder when no video is loaded
 */
function drawPlaceholderToCtx(targetCtx) {
    // Ensure dark background for text visibility
    targetCtx.fillStyle = '#000000';
    targetCtx.fillRect(0, 0, canvas.width, canvas.height);

    targetCtx.fillStyle = '#333333';
    targetCtx.font = '32px monospace';
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
    targetCtx.fillText('Upload a video to begin', canvas.width / 2, canvas.height / 2);
}

/**
 * Draw grid cells with time displacement effect
 * Optimized: Uses ImageBitmap directly (GPU-accelerated, no putImageData)
 */
function drawDisplacedGridToCtx(targetCtx) {
    const { gridCols, gridRows, maxFrameOffset } = settings;

    // Safety check - ensure we have frames to draw
    if (frameBuffer.length === 0) {
        console.warn('drawDisplacedGrid called with empty frameBuffer');
        if (window._debugLoopFrame) window._debugLoopFrame = false;
        return;
    }

    // Source video dimensions
    const srcWidth = sourceVideo.videoWidth;
    const srcHeight = sourceVideo.videoHeight;

    // Safety check - ensure video dimensions are valid
    if (!srcWidth || !srcHeight) {
        console.warn(`drawDisplacedGrid: invalid video dimensions (${srcWidth}x${srcHeight}), readyState=${sourceVideo.readyState}`);
        if (window._debugLoopFrame) window._debugLoopFrame = false;
        return;
    }

    // Source cell dimensions
    const srcCellWidth = srcWidth / gridCols;
    const srcCellHeight = srcHeight / gridRows;

    // Destination cell dimensions (accounting for letterbox)
    const dstCellWidth = videoRect.width / gridCols;
    const dstCellHeight = videoRect.height / gridRows;

    // Draw each cell - ImageBitmap allows direct drawImage (no temp canvas needed!)
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            // Get displacement value for this cell
            const displacement = displacementMap[row]?.[col] ?? 0;

            // Calculate frame offset
            const frameOffset = Math.floor(displacement * maxFrameOffset);

            // Calculate raw target frame (may exceed totalFrames)
            const rawTargetFrame = Math.floor(currentFrame) + frameOffset;

            // Source rectangle (from video frame)
            const sx = col * srcCellWidth;
            const sy = row * srcCellHeight;

            // Destination rectangle (on canvas, accounting for letterbox)
            const dx = videoRect.x + col * dstCellWidth;
            const dy = videoRect.y + row * dstCellHeight;

            // Calculate target frame with proper wrapping
            const bufferLen = frameBuffer.length;
            let targetFrame = rawTargetFrame % bufferLen;
            if (targetFrame < 0) targetFrame += bufferLen;

            let bitmap = frameBuffer[targetFrame];

            // Fallback: if target frame missing, try adjacent frames
            if (!bitmap) {
                bitmap = frameBuffer[(targetFrame + 1) % bufferLen]
                      || frameBuffer[(targetFrame - 1 + bufferLen) % bufferLen]
                      || frameBuffer[0];
            }

            if (bitmap) {
                targetCtx.drawImage(bitmap, sx, sy, srcCellWidth, srcCellHeight, dx, dy, dstCellWidth, dstCellHeight);
            }
        }
    }

}

/**
 * Draw grid lines overlay
 */
function drawGridLinesToCtx(targetCtx) {
    const { gridCols, gridRows, gridColor, gridWidth } = settings;

    targetCtx.strokeStyle = gridColor;
    targetCtx.lineWidth = gridWidth;

    const cellWidth = videoRect.width / gridCols;
    const cellHeight = videoRect.height / gridRows;

    targetCtx.beginPath();

    // Vertical lines
    for (let col = 0; col <= gridCols; col++) {
        const x = videoRect.x + col * cellWidth;
        targetCtx.moveTo(x, videoRect.y);
        targetCtx.lineTo(x, videoRect.y + videoRect.height);
    }

    // Horizontal lines
    for (let row = 0; row <= gridRows; row++) {
        const y = videoRect.y + row * cellHeight;
        targetCtx.moveTo(videoRect.x, y);
        targetCtx.lineTo(videoRect.x + videoRect.width, y);
    }

    targetCtx.stroke();
}

// ============================================
// Animation Loop
// ============================================

/**
 * Main animation loop
 */
function animate(timestamp) {
    animationId = requestAnimationFrame(animate);

    // Calculate delta time
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Update animated noise if enabled
    if (settings.noiseAnimated && settings.displacementMode === 'random') {
        noiseTime += (deltaTime / 1000) * settings.noiseAnimationSpeed;
        updateDisplacementMap();
    }

    // Advance frame if playing and video is loaded
    if (settings.isPlaying && settings.videoLoaded && !isBuffering && frameBuffer.length > 0) {
        const framesToAdvance = (deltaTime / 1000) * frameRate;
        currentFrame = (currentFrame + framesToAdvance) % frameBuffer.length;
    }

    // Render
    render();
}

/**
 * Start animation loop
 */
function startAnimation() {
    if (!animationId) {
        lastTime = performance.now();
        animationId = requestAnimationFrame(animate);
    }
}

/**
 * Stop animation loop
 */
function stopAnimation() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

/**
 * Toggle play/pause
 */
function togglePlayback() {
    settings.isPlaying = !settings.isPlaying;
    return settings.isPlaying;
}

window.togglePlayback = togglePlayback;

/**
 * Restart playback from beginning
 */
function restartPlayback() {
    currentFrame = 0;
}

window.restartPlayback = restartPlayback;

// ============================================
// High Resolution Export
// ============================================

/**
 * Render at high resolution for export
 */
window.renderHighResolution = function(targetCanvas, scale) {
    const exportCtx = targetCanvas.getContext('2d');

    targetCanvas.width = canvas.width * scale;
    targetCanvas.height = canvas.height * scale;

    // Draw background
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.drawToCanvas(exportCtx, canvas.width, canvas.height);
    }

    exportCtx.scale(scale, scale);

    // If no video, just draw placeholder
    if (!settings.videoLoaded || frameBuffer.length === 0) {
        exportCtx.fillStyle = '#333333';
        exportCtx.font = '32px monospace';
        exportCtx.textAlign = 'center';
        exportCtx.textBaseline = 'middle';
        exportCtx.fillText('No video loaded', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Draw the current frame state using ImageBitmap (optimized)
    const { gridCols, gridRows, maxFrameOffset } = settings;

    const srcWidth = sourceVideo.videoWidth;
    const srcHeight = sourceVideo.videoHeight;
    const srcCellWidth = srcWidth / gridCols;
    const srcCellHeight = srcHeight / gridRows;

    const dstCellWidth = videoRect.width / gridCols;
    const dstCellHeight = videoRect.height / gridRows;

    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const displacement = displacementMap[row]?.[col] ?? 0;
            const frameOffset = Math.floor(displacement * maxFrameOffset);
            const rawTargetFrame = Math.floor(currentFrame) + frameOffset;

            const sx = col * srcCellWidth;
            const sy = row * srcCellHeight;

            const dx = videoRect.x + col * dstCellWidth;
            const dy = videoRect.y + row * dstCellHeight;

            // Calculate target frame with wrap-around
            let targetFrame = rawTargetFrame % totalFrames;
            if (targetFrame < 0) targetFrame += totalFrames;

            let bitmap = frameBuffer[targetFrame];

            // Fallback: if target frame missing, try adjacent frames
            if (!bitmap) {
                bitmap = frameBuffer[(targetFrame + 1) % totalFrames]
                      || frameBuffer[(targetFrame - 1 + totalFrames) % totalFrames];
            }

            if (bitmap) {
                exportCtx.drawImage(bitmap, sx, sy, srcCellWidth, srcCellHeight, dx, dy, dstCellWidth, dstCellHeight);
            }
        }
    }

    // Draw grid lines if enabled
    if (settings.showGrid) {
        const { gridColor, gridWidth } = settings;
        const cellWidth = videoRect.width / gridCols;
        const cellHeight = videoRect.height / gridRows;

        exportCtx.strokeStyle = gridColor;
        exportCtx.lineWidth = gridWidth;

        exportCtx.beginPath();

        for (let col = 0; col <= gridCols; col++) {
            const x = videoRect.x + col * cellWidth;
            exportCtx.moveTo(x, videoRect.y);
            exportCtx.lineTo(x, videoRect.y + videoRect.height);
        }

        for (let row = 0; row <= gridRows; row++) {
            const y = videoRect.y + row * cellHeight;
            exportCtx.moveTo(videoRect.x, y);
            exportCtx.lineTo(videoRect.x + videoRect.width, y);
        }

        exportCtx.stroke();
    }

    console.log(`High-res export at ${scale}x completed`);
};

// ============================================
// Canvas Resize Handling
// ============================================

document.addEventListener('chatooly:canvas-resized', (e) => {
    // Update video rect if needed
    if (settings.videoLoaded) {
        videoRect = calculateVideoRect(sourceVideo.videoWidth, sourceVideo.videoHeight);
    }
    render();
});

// ============================================
// Initialization
// ============================================

function init() {
    // Initialize background manager
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.init(canvas);
    }

    // Generate initial displacement map
    updateDisplacementMap();

    // Start animation loop
    startAnimation();

    console.log('Grid Time Displacement initialized');
}

// Wait for DOM and Chatooly to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // Small delay to ensure Chatooly CDN is loaded
    setTimeout(init, 100);
}
