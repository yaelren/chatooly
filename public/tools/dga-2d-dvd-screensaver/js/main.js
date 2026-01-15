/*
 * 2D DVD Screensaver Tool - Main Logic
 * Author: Claude Code
 *
 * Classic DVD screensaver with bouncing 2D images/videos.
 * Features: bounce physics, speed burst, predictive rotation, trails.
 * Uses pure Canvas 2D API (no Three.js dependency).
 */

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');
const ctx = canvas.getContext('2d');

// Offscreen canvas for trail effects
let trailCanvas = null;
let trailCtx = null;

// ========== SETTINGS ==========
const settings = {
    // === Media Source ===
    objectSize: 100,                // pixels

    // === Movement ===
    initialSpeed: 3.0,              // pixels per frame (scaled by 60fps)
    startPosition: 'random',        // 'random' | 'center'
    bounceAngleVariation: 15,       // degrees of random angle variation on bounce (0 = perfect reflection)

    // === Speed Burst (NEW - replaces permanent speed increase) ===
    speedBurstEnabled: false,
    burstMultiplier: 2.0,           // 1.5x - 5x
    burstDuration: 0.5,             // seconds
    burstFadeCurve: 'ease-out',     // 'linear' | 'ease-out' | 'exponential'

    // === Split ===
    splitEnabled: false,
    splitMaxObjects: 100,

    // === Spin on Hit (random rotation) ===
    rotationOnHitEnabled: false,
    spinLerpEnabled: false,         // smooth transition to random angle
    spinLerpSpeed: 5.0,

    // === Simple Rotate (constant spin) ===
    simpleRotateEnabled: false,
    spinSpeed: 90,                  // degrees per second

    // === Aligned Hit Side (NEW - predictive rotation) ===
    alignedHitEnabled: false,
    hitSide: 'bottom',              // 'top' | 'bottom' | 'left' | 'right'
    alignedHitSpinDirection: 'shortest',  // 'shortest' | 'clockwise' | 'counterclockwise'

    // === Trail System ===
    trailEnabled: false,
    trailStyle: 'ghost',            // 'ghost' | 'solid'

    // Ghost trail
    ghostOpacityFade: 0.04,         // Alpha reduction per frame
    ghostScaleFade: 0.98,           // Scale multiplier per frame

    // Solid trail
    solidTrailSpacing: 30,          // pixels between copies
    solidTrailMaxCopies: 50,
    solidTrailLifespan: 0,          // seconds (0 = infinite)

    // === Background ===
    bgTransparent: false,
    bgColor: '#000000',
    bgImageURL: null,
    bgFit: 'cover',

    // === Debug ===
    debugBoundsVisible: false,
    debugColliderVisible: false
};

// ========== STATE ==========
let objects = [];
let mediaManager = null;
let boundsManager = null;
let trailManager = null;
let lastTime = 0;
let isReady = false;

// Background image element
let bgImage = null;

// Default DVD logo (embedded SVG data URL)
const DEFAULT_DVD_LOGO = 'data:image/svg+xml;base64,' + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
  <rect width="200" height="100" fill="#1a1a2e"/>
  <text x="100" y="60" font-family="Arial Black, sans-serif" font-size="36" font-weight="bold" fill="#e94560" text-anchor="middle">DVD</text>
  <text x="100" y="85" font-family="Arial, sans-serif" font-size="12" fill="#ffffff" text-anchor="middle">VIDEO</text>
</svg>
`);

// ========== CANVAS SIZE HANDLING ==========
function setCanvasDimensions() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        canvas.cssWidth = rect.width;
        canvas.cssHeight = rect.height;
    } else {
        canvas.width = 1920;
        canvas.height = 1080;
        canvas.cssWidth = 1920;
        canvas.cssHeight = 1080;
    }

    // Scale context for high DPI
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Update trail canvas
    if (trailCanvas) {
        trailCanvas.width = canvas.width;
        trailCanvas.height = canvas.height;
        trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    console.log('2D DVD Screensaver: Canvas dimensions set to', canvas.cssWidth, 'x', canvas.cssHeight, '(DPR:', dpr, ')');
}

// ========== MEDIA MANAGER CLASS ==========
class MediaManager {
    constructor() {
        this.media = null;
        this.mediaType = 'image';       // 'image' | 'video' | 'gif'
        this.isReady = false;
        this.naturalWidth = 0;
        this.naturalHeight = 0;
        this.blobURL = null;

        // For animated GIFs - we'll treat them as videos
        this.gifCanvas = null;
        this.gifCtx = null;

        // Video frame cache for performance (avoids multiple decodes per frame)
        this.frameCache = null;
        this.frameCacheCtx = null;
    }

    async loadImage(file) {
        this.dispose();

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.media = img;
                this.mediaType = 'image';
                this.naturalWidth = img.naturalWidth;
                this.naturalHeight = img.naturalHeight;
                this.isReady = true;
                resolve({ width: img.naturalWidth, height: img.naturalHeight, name: file.name });
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            this.blobURL = URL.createObjectURL(file);
            img.src = this.blobURL;
        });
    }

    async loadVideo(file) {
        this.dispose();

        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.crossOrigin = 'anonymous';

            video.onloadedmetadata = () => {
                this.media = video;
                this.mediaType = 'video';
                this.naturalWidth = video.videoWidth;
                this.naturalHeight = video.videoHeight;
                video.play().then(() => {
                    this.isReady = true;
                    resolve({ width: video.videoWidth, height: video.videoHeight, name: file.name });
                }).catch(reject);
            };
            video.onerror = () => reject(new Error('Failed to load video'));
            this.blobURL = URL.createObjectURL(file);
            video.src = this.blobURL;
        });
    }

    async loadGIF(file) {
        // For animated GIFs, we load them as images but they'll animate naturally
        // The browser handles GIF animation when we draw them to canvas
        return this.loadImage(file);
    }

    async loadDefault() {
        this.dispose();

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.media = img;
                this.mediaType = 'image';
                this.naturalWidth = img.naturalWidth;
                this.naturalHeight = img.naturalHeight;
                this.isReady = true;
                resolve({ width: img.naturalWidth, height: img.naturalHeight, name: 'DVD Logo' });
            };
            img.onerror = () => reject(new Error('Failed to load default image'));
            img.src = DEFAULT_DVD_LOGO;
        });
    }

    draw(targetCtx, x, y, width, height, rotation = 0) {
        if (!this.isReady || !this.media) return;

        targetCtx.save();
        targetCtx.translate(x + width / 2, y + height / 2);
        targetCtx.rotate(rotation);

        if (this.mediaType === 'video') {
            // Only draw if video is playing
            if (!this.media.paused && !this.media.ended) {
                // Use cached frame if available (much faster for multiple draws)
                const source = this.frameCache || this.media;
                targetCtx.drawImage(source, -width / 2, -height / 2, width, height);
            }
        } else {
            targetCtx.drawImage(this.media, -width / 2, -height / 2, width, height);
        }

        targetCtx.restore();
    }

    getAspectRatio() {
        if (this.naturalWidth && this.naturalHeight) {
            return this.naturalWidth / this.naturalHeight;
        }
        return 1;
    }

    updateFrameCache() {
        if (this.mediaType !== 'video' || !this.isReady || !this.media) return;
        if (this.media.paused || this.media.ended) return;

        // Create or resize cache canvas if needed
        if (!this.frameCache ||
            this.frameCache.width !== this.naturalWidth ||
            this.frameCache.height !== this.naturalHeight) {
            this.frameCache = document.createElement('canvas');
            this.frameCache.width = this.naturalWidth;
            this.frameCache.height = this.naturalHeight;
            this.frameCacheCtx = this.frameCache.getContext('2d');
        }

        // Draw current video frame to cache (single decode per frame)
        this.frameCacheCtx.drawImage(this.media, 0, 0);
    }

    dispose() {
        if (this.blobURL) {
            URL.revokeObjectURL(this.blobURL);
            this.blobURL = null;
        }
        if (this.media && this.mediaType === 'video') {
            this.media.pause();
            this.media.src = '';
        }
        this.media = null;
        this.isReady = false;
        this.frameCache = null;
        this.frameCacheCtx = null;
    }
}

// ========== DVD OBJECT CLASS ==========
class DVDObject {
    constructor(index, position, velocity) {
        this.index = index;
        this.position = { x: position.x, y: position.y };
        this.velocity = { x: velocity.x, y: velocity.y };
        this.rotation = 0;                  // radians
        this.scale = 1.0;

        // Base speed (for reference)
        this.baseSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);

        // Speed Burst state
        this.burstActive = false;
        this.burstStartTime = 0;
        this.currentSpeedMultiplier = 1.0;

        // Aligned Hit Side state
        this.angularVelocity = 0;           // degrees per second
        this.targetAngle = 0;               // degrees

        // Trail tracking
        this.trailHistory = [];             // For ghost trail
        this.lastTrailPosition = { x: position.x, y: position.y };
        this.accumulatedDistance = 0;       // For solid trail

        // Bounce cooldown
        this.lastBounceTime = 0;

        // Hit rotation offset (for rotation-on-hit feature)
        this.hitRotationOffset = 0;
    }

    // Get effective velocity considering speed burst
    getEffectiveVelocity() {
        const multiplier = this.currentSpeedMultiplier;
        return {
            x: this.velocity.x * multiplier,
            y: this.velocity.y * multiplier
        };
    }
}

// ========== BOUNDS MANAGER CLASS ==========
class BoundsManager {
    constructor() {
        this.bounds = { left: 0, right: 0, top: 0, bottom: 0 };
        this.updateBounds();
    }

    updateBounds() {
        const width = canvas.cssWidth || canvas.width;
        const height = canvas.cssHeight || canvas.height;
        this.bounds = {
            left: 0,
            right: width,
            top: 0,
            bottom: height
        };
    }

    // Get the four corners of a rotated rectangle
    getRotatedCorners(centerX, centerY, halfWidth, halfHeight, rotation) {
        const corners = [
            { x: -halfWidth, y: -halfHeight },  // top-left
            { x: halfWidth, y: -halfHeight },   // top-right
            { x: halfWidth, y: halfHeight },    // bottom-right
            { x: -halfWidth, y: halfHeight }    // bottom-left
        ];

        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        return corners.map(corner => ({
            x: centerX + corner.x * cos - corner.y * sin,
            y: centerY + corner.x * sin + corner.y * cos
        }));
    }

    checkBounce(object, radiusX, radiusY, rotation = 0) {
        const result = {
            bounced: false,
            hitEdge: null,
            newPosition: { x: object.position.x, y: object.position.y },
            newVelocity: { x: object.velocity.x, y: object.velocity.y }
        };

        // Get all four rotated corners
        const corners = this.getRotatedCorners(
            object.position.x, object.position.y,
            radiusX, radiusY, rotation
        );

        // Find the extreme points of the rotated rectangle
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (const corner of corners) {
            minX = Math.min(minX, corner.x);
            maxX = Math.max(maxX, corner.x);
            minY = Math.min(minY, corner.y);
            maxY = Math.max(maxY, corner.y);
        }

        // Check each edge and calculate push-back distance
        // Left edge
        if (minX <= this.bounds.left) {
            result.bounced = true;
            result.hitEdge = 'left';
            const pushBack = this.bounds.left - minX;
            result.newPosition.x = object.position.x + pushBack;
            result.newVelocity.x = Math.abs(object.velocity.x);
        }
        // Right edge
        else if (maxX >= this.bounds.right) {
            result.bounced = true;
            result.hitEdge = 'right';
            const pushBack = maxX - this.bounds.right;
            result.newPosition.x = object.position.x - pushBack;
            result.newVelocity.x = -Math.abs(object.velocity.x);
        }

        // Top edge
        if (minY <= this.bounds.top) {
            result.bounced = true;
            result.hitEdge = 'top';
            const pushBack = this.bounds.top - minY;
            result.newPosition.y = object.position.y + pushBack;
            result.newVelocity.y = Math.abs(object.velocity.y);
        }
        // Bottom edge
        else if (maxY >= this.bounds.bottom) {
            result.bounced = true;
            result.hitEdge = 'bottom';
            const pushBack = maxY - this.bounds.bottom;
            result.newPosition.y = object.position.y - pushBack;
            result.newVelocity.y = -Math.abs(object.velocity.y);
        }

        // Apply random bounce angle variation
        if (result.bounced && settings.bounceAngleVariation > 0) {
            const speed = Math.sqrt(
                result.newVelocity.x ** 2 + result.newVelocity.y ** 2
            );
            const currentAngle = Math.atan2(result.newVelocity.y, result.newVelocity.x);
            const variation = (Math.random() - 0.5) * 2 * settings.bounceAngleVariation * Math.PI / 180;
            const newAngle = currentAngle + variation;
            result.newVelocity.x = Math.cos(newAngle) * speed;
            result.newVelocity.y = Math.sin(newAngle) * speed;
        }

        return result;
    }

    getHitAngle(edge) {
        // Returns angle in radians that points away from the wall
        switch (edge) {
            case 'left': return 0;              // Points right
            case 'right': return Math.PI;       // Points left
            case 'top': return Math.PI / 2;     // Points down
            case 'bottom': return -Math.PI / 2; // Points up
            default: return 0;
        }
    }

    drawDebug(ctx) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            this.bounds.left,
            this.bounds.top,
            this.bounds.right - this.bounds.left,
            this.bounds.bottom - this.bounds.top
        );
    }
}

// ========== TRAIL MANAGER CLASS ==========
class TrailManager {
    constructor() {
        this.solidCopies = [];  // For solid trail: {x, y, rotation, scale, age, targetX, targetY, targetRotation}
        this.solidLerpSpeed = 8.0;  // How fast copies lerp to their target position
        this.pathHistory = [];  // Store the actual path the object traveled
        this.maxPathPoints = 500;  // Maximum path points to store
    }

    initGhostCanvas() {
        if (!trailCanvas) {
            trailCanvas = document.createElement('canvas');
            trailCanvas.width = canvas.width;
            trailCanvas.height = canvas.height;
            trailCtx = trailCanvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    }

    updateGhost(objects, mediaManager) {
        if (!trailCanvas) this.initGhostCanvas();

        const width = canvas.cssWidth || canvas.width;
        const height = canvas.cssHeight || canvas.height;

        // Fade existing content
        trailCtx.globalCompositeOperation = 'destination-out';
        trailCtx.fillStyle = `rgba(0, 0, 0, ${settings.ghostOpacityFade})`;
        trailCtx.fillRect(0, 0, width, height);
        trailCtx.globalCompositeOperation = 'source-over';

        // Draw each object at current position
        const aspectRatio = mediaManager.getAspectRatio();
        objects.forEach(obj => {
            let w = settings.objectSize;
            let h = settings.objectSize / aspectRatio;
            w *= settings.ghostScaleFade;
            h *= settings.ghostScaleFade;
            mediaManager.draw(trailCtx, obj.position.x - w / 2, obj.position.y - h / 2, w, h, obj.rotation);
        });
    }

    renderGhostToMain(mainCtx) {
        if (!trailCanvas) return;
        mainCtx.drawImage(trailCanvas, 0, 0, canvas.cssWidth, canvas.cssHeight);
    }

    // Record position to path history (called every frame)
    recordPath(position, rotation) {
        this.pathHistory.push({
            x: position.x,
            y: position.y,
            rotation: rotation
        });

        // Trim old path points
        if (this.pathHistory.length > this.maxPathPoints) {
            this.pathHistory.shift();
        }
    }

    // Find position along the recorded path at a given distance behind the current position
    getPositionAlongPath(distanceBehind) {
        if (this.pathHistory.length < 2) {
            return this.pathHistory.length > 0 ? this.pathHistory[this.pathHistory.length - 1] : null;
        }

        let accumulatedDist = 0;

        // Walk backwards through path history
        for (let i = this.pathHistory.length - 1; i > 0; i--) {
            const curr = this.pathHistory[i];
            const prev = this.pathHistory[i - 1];

            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const segmentDist = Math.sqrt(dx * dx + dy * dy);

            if (accumulatedDist + segmentDist >= distanceBehind) {
                // Interpolate within this segment
                const remaining = distanceBehind - accumulatedDist;
                const t = segmentDist > 0 ? remaining / segmentDist : 0;

                return {
                    x: curr.x - dx * t,
                    y: curr.y - dy * t,
                    rotation: curr.rotation + (prev.rotation - curr.rotation) * t
                };
            }

            accumulatedDist += segmentDist;
        }

        // If we've run out of path, return the oldest point
        return this.pathHistory[0];
    }

    // Initialize all solid copies at once (called when trail is enabled)
    initSolidCopies(position, rotation) {
        this.solidCopies = [];
        for (let i = 0; i < settings.solidTrailMaxCopies; i++) {
            this.solidCopies.push({
                x: position.x,
                y: position.y,
                rotation: rotation,
                scale: 1.0,
                age: 0
            });
        }
    }

    updateSolid(delta) {
        // Ensure we have the right number of copies
        while (this.solidCopies.length < settings.solidTrailMaxCopies) {
            const lastCopy = this.solidCopies.length > 0
                ? this.solidCopies[this.solidCopies.length - 1]
                : (this.pathHistory.length > 0 ? this.pathHistory[this.pathHistory.length - 1] : { x: 0, y: 0, rotation: 0 });
            this.solidCopies.push({
                x: lastCopy.x,
                y: lastCopy.y,
                rotation: lastCopy.rotation,
                scale: 1.0,
                age: 0
            });
        }
        while (this.solidCopies.length > settings.solidTrailMaxCopies) {
            this.solidCopies.pop();
        }

        // Position each copy at exact distance along the recorded path
        for (let i = 0; i < this.solidCopies.length; i++) {
            const copy = this.solidCopies[i];

            // Get target position along the recorded path
            const targetDistance = (i + 1) * settings.solidTrailSpacing;
            const pathPos = this.getPositionAlongPath(targetDistance);

            if (pathPos) {
                // Snap to exact position for consistent spacing
                copy.x = pathPos.x;
                copy.y = pathPos.y;
                copy.rotation = pathPos.rotation;
            }
        }

        // Age copies and remove expired ones (if lifespan is set)
        if (settings.solidTrailLifespan > 0) {
            this.solidCopies.forEach(copy => {
                copy.age += delta;
            });
        }
    }

    renderSolidToMain(mainCtx, mediaManager) {
        const aspectRatio = mediaManager.getAspectRatio();
        // Render back to front (last copy first, so closer copies are on top)
        for (let i = this.solidCopies.length - 1; i >= 0; i--) {
            const copy = this.solidCopies[i];
            const w = settings.objectSize * copy.scale;
            const h = (settings.objectSize / aspectRatio) * copy.scale;
            mediaManager.draw(mainCtx, copy.x - w / 2, copy.y - h / 2, w, h, copy.rotation);
        }
    }

    clear() {
        this.solidCopies = [];
        this.pathHistory = [];
        if (trailCtx) {
            const width = canvas.cssWidth || canvas.width;
            const height = canvas.cssHeight || canvas.height;
            trailCtx.clearRect(0, 0, width, height);
        }
    }
}

// ========== ALIGNED HIT SIDE (PREDICTIVE ROTATION) ==========
function predictNextWall(position, velocity, bounds, radiusX, radiusY) {
    // Note: velocity is in "pixels per frame at 60fps"
    // Position updates use: position += velocity * delta * 60
    // So actual velocity in pixels/second = velocity * 60
    // Time = distance / (velocity * 60) = distance / velocity / 60 (in seconds)

    const times = {};

    if (velocity.x > 0) {
        times.right = (bounds.right - radiusX - position.x) / velocity.x / 60;
    } else if (velocity.x < 0) {
        times.left = (bounds.left + radiusX - position.x) / velocity.x / 60;
    }

    if (velocity.y > 0) {
        times.bottom = (bounds.bottom - radiusY - position.y) / velocity.y / 60;
    } else if (velocity.y < 0) {
        times.top = (bounds.top + radiusY - position.y) / velocity.y / 60;
    }

    let minTime = Infinity;
    let hitWall = null;

    for (const [wall, time] of Object.entries(times)) {
        if (time > 0.001 && time < minTime) {  // Small epsilon to avoid division issues
            minTime = time;
            hitWall = wall;
        }
    }

    return { wall: hitWall, timeUntilHit: minTime };
}

function getTargetAngleForAlignment(hitWall, hitSide) {
    // Wall direction (where the wall normal points INTO the canvas)
    // This is the direction the chosen side should point to face the wall
    const wallDirections = {
        right: 180,  // right wall, normal points left
        left: 0,     // left wall, normal points right
        bottom: 270, // bottom wall, normal points up (270 = -90)
        top: 90      // top wall, normal points down
    };

    // Image side's direction when image is at rotation=0 (upright)
    // At rotation=0: top points up (90), right points right (0), bottom points down (270), left points left (180)
    const sideDirections = {
        top: 90,
        right: 0,
        bottom: 270,
        left: 180
    };

    if (!hitWall) return 0;

    // We want: rotate image so that `hitSide` points toward the wall
    // targetAngle = wallDirection - sideDirection
    // Example: bottom wall (270) with top side (90) = 270-90 = 180 (flip upside down)
    const target = (wallDirections[hitWall] - sideDirections[hitSide] + 360) % 360;
    return target;
}

function getRotationForDirection(currentAngle, targetAngle, direction) {
    // Normalize to 0-360
    currentAngle = ((currentAngle % 360) + 360) % 360;
    targetAngle = ((targetAngle % 360) + 360) % 360;

    let delta = targetAngle - currentAngle;

    if (direction === 'clockwise') {
        // Always positive rotation (clockwise in canvas = positive)
        if (delta <= 0) delta += 360;
    } else if (direction === 'counterclockwise') {
        // Always negative rotation
        if (delta >= 0) delta -= 360;
    } else {
        // Shortest path (default behavior)
        if (delta > 180) {
            delta = delta - 360;
        } else if (delta < -180) {
            delta = delta + 360;
        }
    }

    return delta;
}

// Keep old function for backwards compatibility
function getShortestRotation(currentAngle, targetAngle) {
    return getRotationForDirection(currentAngle, targetAngle, 'shortest');
}

function calculateAngularVelocity(currentAngle, targetAngle, timeUntilHit, direction = 'shortest') {
    if (timeUntilHit <= 0.001) return 0;  // Prevent huge velocities

    const rotationNeeded = getRotationForDirection(currentAngle, targetAngle, direction);
    const angularVelocity = rotationNeeded / timeUntilHit;

    // Cap at max rotation speed (720 deg/s)
    const maxAngularVelocity = 720;
    return Math.max(-maxAngularVelocity, Math.min(maxAngularVelocity, angularVelocity));
}

function updateAlignedHitSide(object, delta) {
    if (!settings.alignedHitEnabled) return;

    // Predict next wall using rectangular bounds
    const effectiveVelocity = object.getEffectiveVelocity();
    const aspectRatio = mediaManager.getAspectRatio();
    const radiusX = settings.objectSize / 2;
    const radiusY = (settings.objectSize / aspectRatio) / 2;
    const prediction = predictNextWall(
        object.position,
        effectiveVelocity,
        boundsManager.bounds,
        radiusX,
        radiusY
    );

    if (prediction.wall) {
        // Calculate target angle
        const currentAngleDeg = (object.rotation * 180 / Math.PI);
        const targetAngleDeg = getTargetAngleForAlignment(prediction.wall, settings.hitSide);

        // Calculate required angular velocity (respecting spin direction preference)
        object.angularVelocity = calculateAngularVelocity(
            currentAngleDeg,
            targetAngleDeg,
            prediction.timeUntilHit,
            settings.alignedHitSpinDirection
        );
    }

    // Apply angular velocity
    object.rotation += (object.angularVelocity * delta) * Math.PI / 180;
}

// ========== SPEED BURST HANDLING ==========
function updateSpeedBurst(object, currentTime) {
    if (!object.burstActive) return;

    const elapsed = (currentTime - object.burstStartTime) / 1000; // Convert to seconds
    const progress = Math.min(elapsed / settings.burstDuration, 1.0);

    // Apply fade curve
    let fadeProgress;
    switch (settings.burstFadeCurve) {
        case 'linear':
            fadeProgress = progress;
            break;
        case 'ease-out':
            fadeProgress = 1 - Math.pow(1 - progress, 2);
            break;
        case 'exponential':
            fadeProgress = 1 - Math.pow(1 - progress, 3);
            break;
        default:
            fadeProgress = progress;
    }

    // Interpolate from burst multiplier back to 1.0
    object.currentSpeedMultiplier = settings.burstMultiplier +
        (1.0 - settings.burstMultiplier) * fadeProgress;

    if (progress >= 1.0) {
        object.burstActive = false;
        object.currentSpeedMultiplier = 1.0;
    }
}

function triggerSpeedBurst(object, currentTime) {
    if (!settings.speedBurstEnabled) return;

    object.burstActive = true;
    object.burstStartTime = currentTime;
    object.currentSpeedMultiplier = settings.burstMultiplier;
}

// ========== BOUNCE EFFECTS ==========
function handleSplit(parentObject, bounceResult) {
    if (!settings.splitEnabled || objects.length >= settings.splitMaxObjects) return;

    // Get bounce velocity direction
    const speed = Math.sqrt(
        bounceResult.newVelocity.x * bounceResult.newVelocity.x +
        bounceResult.newVelocity.y * bounceResult.newVelocity.y
    );
    const baseAngle = Math.atan2(bounceResult.newVelocity.y, bounceResult.newVelocity.x);

    // Divergence angle
    const divergeAngle = (20 + Math.random() * 10) * Math.PI / 180;

    // Child velocity
    const childAngle = baseAngle - divergeAngle;
    const childVelocity = {
        x: Math.cos(childAngle) * speed,
        y: Math.sin(childAngle) * speed
    };

    // Parent velocity
    const parentAngle = baseAngle + divergeAngle;
    parentObject.velocity = {
        x: Math.cos(parentAngle) * speed,
        y: Math.sin(parentAngle) * speed
    };

    // Spawn child
    spawnDVDObject(bounceResult.newPosition, childVelocity);
}

function handleRotationOnHit(object) {
    if (!settings.rotationOnHitEnabled) return;

    // Generate random target angle
    const targetAngle = Math.random() * Math.PI * 2;

    if (settings.spinLerpEnabled) {
        // Store target for smooth lerp (handled in update loop)
        object.targetRotationOffset = targetAngle;
    } else {
        // Instant snap to random angle
        object.hitRotationOffset = targetAngle;
    }
}

// ========== OBJECT SPAWNING ==========
function spawnDVDObject(position = null, velocity = null) {
    const width = canvas.cssWidth || canvas.width;
    const height = canvas.cssHeight || canvas.height;

    // Calculate start position
    let startPos;
    if (position) {
        startPos = { x: position.x, y: position.y };
    } else if (settings.startPosition === 'center') {
        startPos = { x: width / 2, y: height / 2 };
    } else {
        // Random position
        const margin = settings.objectSize;
        startPos = {
            x: margin + Math.random() * (width - margin * 2),
            y: margin + Math.random() * (height - margin * 2)
        };
    }

    // Calculate velocity
    let startVelocity;
    if (velocity) {
        startVelocity = { x: velocity.x, y: velocity.y };
    } else {
        // Random direction
        const angle = Math.random() * Math.PI * 2;
        const speed = settings.initialSpeed;
        startVelocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
    }

    const dvdObject = new DVDObject(objects.length, startPos, startVelocity);
    dvdObject.lastBounceTime = performance.now();
    objects.push(dvdObject);

    return dvdObject;
}

// ========== UPDATE LOOP ==========
function updateObjects(delta, currentTime) {
    const bounceCooldown = 100; // ms
    const objectsToSplit = [];

    objects.forEach(object => {
        // Update spin lerp (smooth transition to target rotation)
        if (settings.spinLerpEnabled && object.targetRotationOffset !== undefined) {
            const currentAngle = object.hitRotationOffset;
            const targetAngle = object.targetRotationOffset;
            const angleDiff = targetAngle - currentAngle;
            const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
            object.hitRotationOffset += normalizedDiff * settings.spinLerpSpeed * delta;

            // Clear target when close enough
            if (Math.abs(normalizedDiff) < 0.01) {
                object.hitRotationOffset = targetAngle;
                delete object.targetRotationOffset;
            }
        }

        // Update speed burst
        updateSpeedBurst(object, currentTime);

        // Get effective velocity (with burst multiplier)
        const effectiveVelocity = object.getEffectiveVelocity();

        // Update position
        object.position.x += effectiveVelocity.x * delta * 60; // Normalize to 60fps
        object.position.y += effectiveVelocity.y * delta * 60;

        // Check for bounces using rectangular bounds (rotation-aware)
        const aspectRatio = mediaManager.getAspectRatio();
        const radiusX = settings.objectSize / 2;
        const radiusY = (settings.objectSize / aspectRatio) / 2;
        const finalRotation = object.rotation + object.hitRotationOffset;
        const canBounce = (currentTime - object.lastBounceTime) >= bounceCooldown;
        const bounceResult = canBounce
            ? boundsManager.checkBounce(object, radiusX, radiusY, finalRotation)
            : { bounced: false };

        if (bounceResult.bounced) {
            object.lastBounceTime = currentTime;
            object.position = bounceResult.newPosition;
            object.velocity = bounceResult.newVelocity;

            // Trigger speed burst
            triggerSpeedBurst(object, currentTime);

            // Queue split
            if (settings.splitEnabled) {
                objectsToSplit.push({ object, bounceResult });
            }

            // Spin on hit
            handleRotationOnHit(object);

            // Recalculate aligned hit side after bounce
            if (settings.alignedHitEnabled) {
                // Force recalculation by resetting angular velocity
                object.angularVelocity = 0;
            }
        }

        // Update rotation behaviors
        if (settings.alignedHitEnabled) {
            updateAlignedHitSide(object, delta);
        } else if (settings.simpleRotateEnabled) {
            object.rotation += (settings.spinSpeed * delta) * Math.PI / 180;
        }

        // Add hit rotation offset
        if (settings.rotationOnHitEnabled) {
            // hitRotationOffset is already applied via rotation
        }

    });

    // Process splits
    objectsToSplit.forEach(({ object, bounceResult }) => {
        handleSplit(object, bounceResult);
    });
}

// ========== RENDER LOOP ==========
function render() {
    const width = canvas.cssWidth || canvas.width;
    const height = canvas.cssHeight || canvas.height;

    // Update video frame cache once per render (performance optimization)
    if (mediaManager && mediaManager.mediaType === 'video') {
        mediaManager.updateFrameCache();
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    if (!settings.bgTransparent) {
        if (bgImage && settings.bgImageURL) {
            // Draw background image
            drawBackgroundImage(ctx, width, height);
        } else {
            ctx.fillStyle = settings.bgColor;
            ctx.fillRect(0, 0, width, height);
        }
    }

    // Draw trails
    if (settings.trailEnabled) {
        if (settings.trailStyle === 'ghost') {
            trailManager.renderGhostToMain(ctx);
        } else {
            trailManager.renderSolidToMain(ctx, mediaManager);
        }
    }

    // Draw objects
    if (mediaManager && mediaManager.isReady) {
        const aspectRatio = mediaManager.getAspectRatio();
        objects.forEach(obj => {
            const w = settings.objectSize;
            const h = settings.objectSize / aspectRatio;
            const finalRotation = obj.rotation + obj.hitRotationOffset;
            mediaManager.draw(ctx, obj.position.x - w / 2, obj.position.y - h / 2, w, h, finalRotation);
        });
    }

    // Draw debug bounds
    if (settings.debugBoundsVisible && boundsManager) {
        boundsManager.drawDebug(ctx);
    }

    // Draw debug colliders for each object
    if (settings.debugColliderVisible && mediaManager && mediaManager.isReady) {
        const aspectRatio = mediaManager.getAspectRatio();
        const radiusX = settings.objectSize / 2;
        const radiusY = (settings.objectSize / aspectRatio) / 2;

        objects.forEach(obj => {
            const finalRotation = obj.rotation + obj.hitRotationOffset;

            // Get the rotated corners (what's actually used for collision)
            const corners = boundsManager.getRotatedCorners(
                obj.position.x, obj.position.y,
                radiusX, radiusY, finalRotation
            );

            // Draw rotated collision box - CYAN
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            for (let i = 1; i < corners.length; i++) {
                ctx.lineTo(corners[i].x, corners[i].y);
            }
            ctx.closePath();
            ctx.stroke();

            // Draw corner points - GREEN
            ctx.fillStyle = '#00ff00';
            for (const corner of corners) {
                ctx.beginPath();
                ctx.arc(corner.x, corner.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw center point - YELLOW
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(obj.position.x, obj.position.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw legend
        ctx.font = '12px monospace';
        ctx.fillStyle = '#00ffff';
        ctx.fillText('CYAN = Collision Box (rotates with image)', 10, 20);
        ctx.fillStyle = '#00ff00';
        ctx.fillText('GREEN = Corner points (trigger bounce)', 10, 36);
        ctx.fillStyle = '#ffff00';
        ctx.fillText('YELLOW = Center Point', 10, 52);
    }
}

function drawBackgroundImage(ctx, width, height) {
    if (!bgImage) return;

    const imgWidth = bgImage.naturalWidth;
    const imgHeight = bgImage.naturalHeight;

    let drawWidth, drawHeight, offsetX, offsetY;

    switch (settings.bgFit) {
        case 'cover':
            const coverRatio = Math.max(width / imgWidth, height / imgHeight);
            drawWidth = imgWidth * coverRatio;
            drawHeight = imgHeight * coverRatio;
            offsetX = (width - drawWidth) / 2;
            offsetY = (height - drawHeight) / 2;
            break;
        case 'contain':
            const containRatio = Math.min(width / imgWidth, height / imgHeight);
            drawWidth = imgWidth * containRatio;
            drawHeight = imgHeight * containRatio;
            offsetX = (width - drawWidth) / 2;
            offsetY = (height - drawHeight) / 2;
            // Fill background color behind contained image
            ctx.fillStyle = settings.bgColor;
            ctx.fillRect(0, 0, width, height);
            break;
        case 'fill':
            drawWidth = width;
            drawHeight = height;
            offsetX = 0;
            offsetY = 0;
            break;
        default:
            drawWidth = width;
            drawHeight = height;
            offsetX = 0;
            offsetY = 0;
    }

    ctx.drawImage(bgImage, offsetX, offsetY, drawWidth, drawHeight);
}

// ========== ANIMATION LOOP ==========
function animate(currentTime) {
    requestAnimationFrame(animate);

    // Calculate delta time
    const delta = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Skip large deltas (tab was inactive)
    if (delta > 0.1) return;

    // Update objects
    updateObjects(delta, currentTime);

    // Update ghost trail
    if (settings.trailEnabled && settings.trailStyle === 'ghost') {
        trailManager.updateGhost(objects, mediaManager);
    }

    // Update solid trail (lerping along recorded path)
    if (settings.trailEnabled && settings.trailStyle === 'solid') {
        if (objects.length > 0) {
            const leadObj = objects[0];
            const finalRotation = leadObj.rotation + leadObj.hitRotationOffset;
            // Record the current position to the path history
            trailManager.recordPath(leadObj.position, finalRotation);
        }
        trailManager.updateSolid(delta);
    }

    // Render
    render();
}

// ========== RESIZE HANDLER ==========
function handleResize() {
    setCanvasDimensions();

    if (boundsManager) {
        boundsManager.updateBounds();
    }

    // Reinitialize trail canvas at new size
    if (settings.trailEnabled && settings.trailStyle === 'ghost') {
        trailManager.initGhostCanvas();
    }

    console.log('2D DVD Screensaver: Resized to', canvas.cssWidth, 'x', canvas.cssHeight);
}

// ========== INITIALIZATION ==========
async function init() {
    console.log('2D DVD Screensaver: Initializing...');

    setCanvasDimensions();

    // Initialize managers
    mediaManager = new MediaManager();
    boundsManager = new BoundsManager();
    trailManager = new TrailManager();

    // Load default DVD logo
    try {
        await mediaManager.loadDefault();
        console.log('2D DVD Screensaver: Default DVD logo loaded');
    } catch (err) {
        console.error('Failed to load default image:', err);
    }

    // Spawn first object
    spawnDVDObject();

    // Handle resize
    window.addEventListener('resize', handleResize);

    // ResizeObserver for container
    if (typeof ResizeObserver !== 'undefined') {
        let resizeTimeout = null;
        const debouncedResize = () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(handleResize, 50);
        };

        const resizeObserver = new ResizeObserver(debouncedResize);
        resizeObserver.observe(canvas);
        if (canvas.parentElement) {
            resizeObserver.observe(canvas.parentElement);
        }
    }

    // Initialize background system
    initBackgroundSystem();

    isReady = true;
    console.log('2D DVD Screensaver: Initialization complete');

    // Start animation loop
    lastTime = performance.now();
    requestAnimationFrame(animate);
}

// ========== BACKGROUND SYSTEM ==========
function initBackgroundSystem() {
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.init(canvas);
    }
}

async function setBackgroundImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            bgImage = img;
            settings.bgImageURL = URL.createObjectURL(file);
            resolve();
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

function clearBackgroundImage() {
    bgImage = null;
    settings.bgImageURL = null;
}

// ========== UTILITY FUNCTIONS ==========
function clearCanvas() {
    objects = [];
    trailManager.clear();
}

function resetToDefaults() {
    clearCanvas();
    spawnDVDObject();
}

function toggleTrail(enabled) {
    settings.trailEnabled = enabled;
    if (enabled && settings.trailStyle === 'ghost') {
        trailManager.initGhostCanvas();
    } else {
        trailManager.clear();
    }

    // Reset tracking for all objects
    objects.forEach(obj => {
        obj.accumulatedDistance = 0;
        obj.lastTrailPosition = { x: obj.position.x, y: obj.position.y };
    });
}

function setTrailStyle(style) {
    settings.trailStyle = style;
    trailManager.clear();

    if (settings.trailEnabled) {
        if (style === 'ghost') {
            trailManager.initGhostCanvas();
        }
    }

    // Reset tracking for all objects
    objects.forEach(obj => {
        obj.accumulatedDistance = 0;
        obj.lastTrailPosition = { x: obj.position.x, y: obj.position.y };
    });
}

function updateAllObjectSpeeds(newSpeed) {
    settings.initialSpeed = newSpeed;
    objects.forEach(obj => {
        const currentSpeed = Math.sqrt(obj.velocity.x * obj.velocity.x + obj.velocity.y * obj.velocity.y);
        if (currentSpeed > 0) {
            const scale = newSpeed / currentSpeed;
            obj.velocity.x *= scale;
            obj.velocity.y *= scale;
            obj.baseSpeed = newSpeed;
        }
    });
}

function toggleDebugBounds(visible) {
    settings.debugBoundsVisible = visible;
}

function toggleDebugCollider(visible) {
    settings.debugColliderVisible = visible;
}

// ========== HIGH-RES EXPORT ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!isReady) {
        console.warn('Not ready for export');
        return;
    }

    const exportCtx = targetCanvas.getContext('2d');
    const exportWidth = targetCanvas.width;
    const exportHeight = targetCanvas.height;

    // Draw background
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.drawToCanvas(exportCtx, exportWidth, exportHeight);
    } else if (!settings.bgTransparent) {
        if (bgImage && settings.bgImageURL) {
            // Draw background image scaled
            const imgWidth = bgImage.naturalWidth;
            const imgHeight = bgImage.naturalHeight;
            const ratio = Math.max(exportWidth / imgWidth, exportHeight / imgHeight);
            const drawWidth = imgWidth * ratio;
            const drawHeight = imgHeight * ratio;
            const offsetX = (exportWidth - drawWidth) / 2;
            const offsetY = (exportHeight - drawHeight) / 2;
            exportCtx.drawImage(bgImage, offsetX, offsetY, drawWidth, drawHeight);
        } else {
            exportCtx.fillStyle = settings.bgColor;
            exportCtx.fillRect(0, 0, exportWidth, exportHeight);
        }
    }

    // Draw trails (scaled)
    if (settings.trailEnabled && trailCanvas) {
        exportCtx.drawImage(trailCanvas, 0, 0, exportWidth, exportHeight);
    }

    // Draw objects (scaled)
    if (mediaManager && mediaManager.isReady) {
        const aspectRatio = mediaManager.getAspectRatio();
        const scaleX = exportWidth / (canvas.cssWidth || canvas.width);
        const scaleY = exportHeight / (canvas.cssHeight || canvas.height);

        objects.forEach(obj => {
            const w = settings.objectSize * scaleX;
            const h = (settings.objectSize / aspectRatio) * scaleY;
            const x = obj.position.x * scaleX;
            const y = obj.position.y * scaleY;
            const finalRotation = obj.rotation + obj.hitRotationOffset;
            mediaManager.draw(exportCtx, x - w / 2, y - h / 2, w, h, finalRotation);
        });
    }
};

// ========== EXPORT TO GLOBAL SCOPE ==========
window.dvdScreensaver = {
    settings,
    mediaManager: null,  // Will be set after init
    clearCanvas,
    resetToDefaults,
    spawnDVDObject,
    toggleTrail,
    setTrailStyle,
    toggleDebugBounds,
    toggleDebugCollider,
    updateAllObjectSpeeds,
    setBackgroundImage,
    clearBackgroundImage,
    renderHighResolution: window.renderHighResolution,
    get objects() { return objects; },
    get isReady() { return isReady; }
};

// ========== INITIALIZE ON LOAD ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Update mediaManager reference after init
setTimeout(() => {
    window.dvdScreensaver.mediaManager = mediaManager;
}, 100);
