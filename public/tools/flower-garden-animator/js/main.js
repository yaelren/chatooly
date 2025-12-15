/*
 * Flower Garden Animator - Main Logic
 * Author: Claude Code
 *
 * Creates beautiful animated flower gardens with swaying petals,
 * growing stems, and dancing butterflies.
 */

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 1920;   // HD resolution width
canvas.height = 1080;  // HD resolution height

// ========== BACKGROUND SYSTEM INITIALIZATION ==========
let backgroundInitialized = false;

// Wait for CDN to load before initializing background
function initBackgroundManager() {
    if (window.Chatooly && window.Chatooly.backgroundManager && !backgroundInitialized) {
        Chatooly.backgroundManager.init(canvas);
        backgroundInitialized = true;
        console.log('Background manager initialized');
    }
}

// Initialize immediately if CDN is ready, otherwise wait
if (window.Chatooly) {
    initBackgroundManager();
} else {
    document.addEventListener('DOMContentLoaded', initBackgroundManager);
    // Fallback with timeout
    setTimeout(initBackgroundManager, 1000);
}

// ========== FLOWER GARDEN SYSTEM ==========

class FlowerGarden {
    constructor() {
        this.flowers = [];
        this.butterflies = [];
        this.time = 0;
        this.previousCanvasSize = { width: 0, height: 0 };
        this.hasContent = false;

        // Default settings (will be updated by UI)
        this.settings = {
            flowerCount: 8,
            gardenStyle: 'meadow',
            windStrength: 0.5,
            flowerColorPrimary: '#ff6b9d',
            flowerColorSecondary: '#ffd93d',
            flowerSize: 40,
            petalCount: 8,
            butterfliesEnabled: true,
            animationSpeed: 1.0,
            growingAnimation: false
        };

        this.setupEventListeners();
        this.createGarden();
        this.animate();
    }

    setupEventListeners() {
        // Canvas resize handling
        document.addEventListener('chatooly:canvas-resized', (e) => this.onCanvasResized(e));

        // Mouse interaction for planting new flowers
        canvas.addEventListener('click', (e) => this.onMouseClick(e));
    }

    onCanvasResized(e) {
        if (!this.hasContent) return;

        const oldWidth = this.previousCanvasSize.width;
        const oldHeight = this.previousCanvasSize.height;
        const newWidth = e.detail.canvas.width;
        const newHeight = e.detail.canvas.height;

        if (oldWidth === 0 || oldHeight === 0) {
            this.previousCanvasSize = { width: newWidth, height: newHeight };
            this.redrawContent();
            return;
        }

        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;

        // Scale all flowers and butterflies
        this.flowers.forEach(flower => {
            flower.x *= scaleX;
            flower.y *= scaleY;
            flower.baseY *= scaleY;
        });

        this.butterflies.forEach(butterfly => {
            butterfly.x *= scaleX;
            butterfly.y *= scaleY;
        });

        this.previousCanvasSize = { width: newWidth, height: newHeight };
        this.redrawContent();
    }

    onMouseClick(e) {
        const coords = window.Chatooly ?
            window.Chatooly.utils.mapMouseToCanvas(e, canvas) :
            this.fallbackMouseMapping(e);

        // Plant a new flower at click location
        this.plantFlower(coords.x, coords.y);
    }

    fallbackMouseMapping(e) {
        const rect = canvas.getBoundingClientRect();
        const displayX = e.clientX - rect.left;
        const displayY = e.clientY - rect.top;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: displayX * scaleX, y: displayY * scaleY };
    }

    createGarden() {
        this.flowers = [];
        this.butterflies = [];

        // Create flowers based on garden style
        for (let i = 0; i < this.settings.flowerCount; i++) {
            this.createFlower();
        }

        // Create butterflies if enabled
        if (this.settings.butterfliesEnabled) {
            for (let i = 0; i < Math.floor(this.settings.flowerCount / 3); i++) {
                this.createButterfly();
            }
        }

        this.hasContent = true;
        this.previousCanvasSize = { width: canvas.width, height: canvas.height };
    }

    createFlower() {
        const position = this.getGardenStylePosition();

        const flower = {
            x: position.x,
            y: position.y,
            baseY: 0,
            stemHeight: position.stemHeight,
            size: this.settings.flowerSize * position.sizeVariation,
            petalCount: this.settings.petalCount,
            swayOffset: Math.random() * Math.PI * 2,
            swaySpeed: 0.8 + Math.random() * 0.4,
            growth: this.settings.growingAnimation ? 0 : 1,
            growthSpeed: 0.01 + Math.random() * 0.02,
            petalRotation: Math.random() * Math.PI * 2,
            petalRotationSpeed: 0.005 + Math.random() * 0.01
        };

        flower.baseY = flower.y;
        this.flowers.push(flower);
    }

    getGardenStylePosition() {
        const flowerIndex = this.flowers.length;

        switch(this.settings.gardenStyle) {
            case 'formal':
                // Organized rows with even spacing
                const rowHeight = 120;
                const flowersPerRow = Math.ceil(Math.sqrt(this.settings.flowerCount));
                const row = Math.floor(flowerIndex / flowersPerRow);
                const col = flowerIndex % flowersPerRow;
                const spacing = canvas.width / (flowersPerRow + 1);

                return {
                    x: spacing * (col + 1),
                    y: canvas.height - 80 - (row * rowHeight),
                    stemHeight: 120 + Math.random() * 40,
                    sizeVariation: 0.9 + Math.random() * 0.2
                };

            case 'cottage':
                // Clustered groups with varied heights
                const clusterCount = Math.ceil(this.settings.flowerCount / 3);
                const cluster = Math.floor(flowerIndex / 3);
                const inCluster = flowerIndex % 3;
                const clusterX = (canvas.width / (clusterCount + 1)) * (cluster + 1);

                return {
                    x: clusterX + (Math.random() - 0.5) * 80,
                    y: canvas.height - 30 - Math.random() * 120,
                    stemHeight: 80 + Math.random() * 180,
                    sizeVariation: 0.6 + Math.random() * 0.8
                };

            case 'zen':
                // Asymmetric but balanced placement
                const goldenRatio = 1.618;
                const angle = flowerIndex * (Math.PI * 2 / goldenRatio);
                const radius = Math.min(canvas.width, canvas.height) * 0.3;
                const spiral = flowerIndex * 20;

                return {
                    x: canvas.width * 0.5 + Math.cos(angle) * (spiral % radius),
                    y: canvas.height - 100 + Math.sin(angle) * 80,
                    stemHeight: 100 + Math.sin(flowerIndex) * 80,
                    sizeVariation: 0.8 + Math.random() * 0.4
                };

            case 'meadow':
            default:
                // Wild, random placement
                return {
                    x: Math.random() * canvas.width,
                    y: canvas.height - 50 - Math.random() * 100,
                    stemHeight: 100 + Math.random() * 150,
                    sizeVariation: 0.7 + Math.random() * 0.6
                };
        }
    }

    createButterfly() {
        const butterfly = {
            x: Math.random() * canvas.width,
            y: 100 + Math.random() * (canvas.height - 200),
            targetX: Math.random() * canvas.width,
            targetY: 100 + Math.random() * (canvas.height - 200),
            speed: 0.5 + Math.random() * 1,
            wingPhase: Math.random() * Math.PI * 2,
            wingSpeed: 8 + Math.random() * 4,
            color: Math.random() > 0.5 ? '#ff6b9d' : '#6b9dff',
            size: 8 + Math.random() * 6
        };
        this.butterflies.push(butterfly);
    }

    plantFlower(x, y) {
        const flower = {
            x: x,
            y: Math.max(y, canvas.height - 250),
            baseY: 0,
            stemHeight: 100 + Math.random() * 150,
            size: this.settings.flowerSize * (0.7 + Math.random() * 0.6),
            petalCount: this.settings.petalCount,
            swayOffset: Math.random() * Math.PI * 2,
            swaySpeed: 0.8 + Math.random() * 0.4,
            growth: 0, // Always start with growing animation for planted flowers
            growthSpeed: 0.02 + Math.random() * 0.03,
            petalRotation: Math.random() * Math.PI * 2,
            petalRotationSpeed: 0.005 + Math.random() * 0.01
        };

        flower.baseY = flower.y;
        this.flowers.push(flower);
    }

    updateSettings(newSettings) {
        const oldFlowerCount = this.settings.flowerCount;
        const oldGardenStyle = this.settings.gardenStyle;
        this.settings = { ...this.settings, ...newSettings };

        // Recreate garden if flower count or garden style changed
        if (this.settings.flowerCount !== oldFlowerCount || this.settings.gardenStyle !== oldGardenStyle) {
            this.createGarden();
        }

        // Update butterfly visibility
        if (this.settings.butterfliesEnabled && this.butterflies.length === 0) {
            for (let i = 0; i < Math.floor(this.settings.flowerCount / 3); i++) {
                this.createButterfly();
            }
        } else if (!this.settings.butterfliesEnabled) {
            this.butterflies = [];
        }
    }

    animate() {
        this.time += 0.016 * this.settings.animationSpeed; // Roughly 60fps

        this.updateFlowers();
        this.updateButterflies();
        this.render();

        requestAnimationFrame(() => this.animate());
    }

    updateFlowers() {
        this.flowers.forEach(flower => {
            // Swaying motion from wind
            const swayAmount = this.settings.windStrength * 30;
            flower.y = flower.baseY + Math.sin(this.time * flower.swaySpeed + flower.swayOffset) * swayAmount;
            flower.x += Math.cos(this.time * flower.swaySpeed * 0.5 + flower.swayOffset) * swayAmount * 0.3;

            // Growing animation
            if (flower.growth < 1 && (this.settings.growingAnimation || flower.growth === 0)) {
                flower.growth += flower.growthSpeed;
                flower.growth = Math.min(1, flower.growth);
            }

            // Petal rotation
            flower.petalRotation += flower.petalRotationSpeed;
        });
    }

    updateButterflies() {
        this.butterflies.forEach(butterfly => {
            // Move towards target
            const dx = butterfly.targetX - butterfly.x;
            const dy = butterfly.targetY - butterfly.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 20) {
                // Choose new target
                butterfly.targetX = Math.random() * canvas.width;
                butterfly.targetY = 100 + Math.random() * (canvas.height - 200);
            } else {
                // Move towards target
                butterfly.x += (dx / distance) * butterfly.speed;
                butterfly.y += (dy / distance) * butterfly.speed;
            }

            // Wing animation
            butterfly.wingPhase += butterfly.wingSpeed * 0.1;
        });
    }

    render() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Render background FIRST (mandatory for Chatooly)
        if (backgroundInitialized && window.Chatooly && window.Chatooly.backgroundManager) {
            Chatooly.backgroundManager.drawToCanvas(ctx, canvas.width, canvas.height);
        }

        // Render garden elements
        this.renderFlowers();
        this.renderButterflies();
        this.renderGrass();
    }

    renderFlowers() {
        this.flowers.forEach(flower => {
            const growthScale = this.easeOutCubic(flower.growth);

            ctx.save();
            ctx.translate(flower.x, flower.y);
            ctx.scale(growthScale, growthScale);

            // Draw stem (from ground up to flower)
            ctx.strokeStyle = '#4a7c59';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -flower.stemHeight);
            ctx.stroke();

            // Draw leaves
            ctx.fillStyle = '#4a7c59';
            for (let i = 0; i < 2; i++) {
                const leafY = -flower.stemHeight * (0.3 + i * 0.3);
                const leafSide = i % 2 === 0 ? -1 : 1;
                ctx.save();
                ctx.translate(leafSide * 15, leafY);
                ctx.rotate(leafSide * 0.5);
                this.drawLeaf(ctx, 20, 8);
                ctx.restore();
            }

            // Draw flower head (at the top of the stem)
            ctx.save();
            ctx.translate(0, -flower.stemHeight);
            ctx.rotate(flower.petalRotation);

            // Draw petals
            const angleStep = (Math.PI * 2) / flower.petalCount;
            for (let i = 0; i < flower.petalCount; i++) {
                ctx.save();
                ctx.rotate(i * angleStep);
                ctx.translate(0, -flower.size * 0.3);

                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, flower.size * 0.4);
                gradient.addColorStop(0, this.settings.flowerColorPrimary);
                gradient.addColorStop(1, this.settings.flowerColorSecondary);

                ctx.fillStyle = gradient;
                this.drawPetal(ctx, flower.size * 0.4, flower.size * 0.6);
                ctx.restore();
            }

            // Draw center
            ctx.fillStyle = '#8b4513';
            ctx.beginPath();
            ctx.arc(0, 0, flower.size * 0.15, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
            ctx.restore();
        });
    }

    renderButterflies() {
        if (!this.settings.butterfliesEnabled) return;

        this.butterflies.forEach(butterfly => {
            ctx.save();
            ctx.translate(butterfly.x, butterfly.y);

            // Wing animation
            const wingAngle = Math.sin(butterfly.wingPhase) * 0.5;

            // Draw butterfly body
            ctx.fillStyle = '#2c2c2c';
            ctx.fillRect(-1, -butterfly.size, 2, butterfly.size * 2);

            // Draw wings
            ctx.fillStyle = butterfly.color;
            ctx.globalAlpha = 0.7;

            // Left wing
            ctx.save();
            ctx.rotate(wingAngle);
            ctx.beginPath();
            ctx.ellipse(-butterfly.size * 0.5, 0, butterfly.size * 0.6, butterfly.size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Right wing
            ctx.save();
            ctx.rotate(-wingAngle);
            ctx.beginPath();
            ctx.ellipse(butterfly.size * 0.5, 0, butterfly.size * 0.6, butterfly.size * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.restore();
        });
    }

    renderGrass() {
        const grassHeight = 30;
        const grassCount = canvas.width / 20;

        ctx.strokeStyle = '#4a7c59';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;

        for (let i = 0; i < grassCount; i++) {
            const x = i * 20 + Math.random() * 15;
            const sway = Math.sin(this.time + i) * this.settings.windStrength * 5;

            ctx.beginPath();
            ctx.moveTo(x, canvas.height);
            ctx.quadraticCurveTo(x + sway, canvas.height - grassHeight/2, x + sway * 2, canvas.height - grassHeight);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    drawPetal(ctx, width, height) {
        ctx.beginPath();
        ctx.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    drawLeaf(ctx, width, height) {
        ctx.beginPath();
        ctx.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    redrawContent() {
        // Force a render without waiting for animation frame
        this.render();
    }
}

// ========== HIGH-RESOLUTION EXPORT FUNCTION (MANDATORY) ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!flowerGarden || !flowerGarden.hasContent) {
        console.warn('Flower garden not ready for high-res export');
        return;
    }

    const exportCtx = targetCanvas.getContext('2d');
    targetCanvas.width = canvas.width * scale;
    targetCanvas.height = canvas.height * scale;
    exportCtx.scale(scale, scale);

    // Clear and render background
    exportCtx.clearRect(0, 0, canvas.width, canvas.height);
    if (backgroundInitialized && window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.drawToCanvas(exportCtx, canvas.width, canvas.height);
    }

    // Save original context reference
    const originalCtx = ctx;

    // Temporarily replace the global context with export context
    // This allows the render functions to draw to the export canvas
    window.ctx = exportCtx;

    // Call render functions directly on export context
    flowerGarden.renderFlowers();
    flowerGarden.renderButterflies();
    flowerGarden.renderGrass();

    // Restore original context
    window.ctx = originalCtx;

    console.log(`High-res flower garden export completed at ${scale}x resolution`);
};

// ========== INITIALIZE GARDEN ==========
let flowerGarden;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    flowerGarden = new FlowerGarden();
    window.flowerGarden = flowerGarden; // Make globally accessible for UI controls
});

// Fallback initialization
setTimeout(() => {
    if (!flowerGarden) {
        flowerGarden = new FlowerGarden();
        window.flowerGarden = flowerGarden; // Make globally accessible for UI controls
    }
}, 1000);