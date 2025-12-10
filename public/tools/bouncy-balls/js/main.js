/*
 * Bouncy Balls - Main Logic
 * Author: Claude Code
 *
 * Interactive physics simulation with bouncing balls.
 * Click to add balls with customizable properties.
 */

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');
canvas.width = 1920;   // HD resolution width (1920x1080)
canvas.height = 1080;  // HD resolution height
const ctx = canvas.getContext('2d');

// ========== BACKGROUND SYSTEM ==========
// Initialize background manager
if (window.Chatooly && window.Chatooly.backgroundManager) {
    Chatooly.backgroundManager.init(canvas);
}

// ========== BALL PHYSICS ENGINE ==========
class Ball {
    constructor(x, y, radius, color, vx, vy) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.vx = vx;
        this.vy = vy;
        this.gravity = 0.5;
        this.bounceDamping = 0.8;
    }

    update() {
        // Apply gravity
        this.vy += this.gravity;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x - this.radius <= 0 || this.x + this.radius >= canvas.width) {
            this.vx *= -this.bounceDamping;
            this.x = this.x - this.radius <= 0 ? this.radius : canvas.width - this.radius;
        }

        if (this.y - this.radius <= 0 || this.y + this.radius >= canvas.height) {
            this.vy *= -this.bounceDamping;
            this.y = this.y - this.radius <= 0 ? this.radius : canvas.height - this.radius;
        }

        // Air resistance
        this.vx *= 0.999;
        this.vy *= 0.999;
    }

    draw(context) {
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        context.fillStyle = this.color;
        context.fill();

        // Add subtle shadow/gradient effect
        const gradient = context.createRadialGradient(
            this.x - this.radius * 0.3,
            this.y - this.radius * 0.3,
            0,
            this.x,
            this.y,
            this.radius
        );
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, this.adjustBrightness(this.color, -30));

        context.fillStyle = gradient;
        context.fill();
    }

    adjustBrightness(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `rgb(${r}, ${g}, ${b})`;
    }
}

// ========== GAME STATE ==========
class BouncyBallsEngine {
    constructor() {
        this.balls = [];
        this.isRunning = false;
        this.previousCanvasSize = { width: canvas.width, height: canvas.height };
        this.hasContent = false;

        // Default settings
        this.settings = {
            ballColor: '#4a90d9',
            ballSize: 20,
            ballSpeed: 5,
            gravity: 0.5,
            bounceDamping: 0.8
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.start();
    }

    setupEventListeners() {
        // Canvas click handler
        canvas.addEventListener('click', (e) => this.onCanvasClick(e));

        // Canvas resize handler
        document.addEventListener('chatooly:canvas-resized', (e) => this.onCanvasResized(e));

        // Background control event listeners
        this.setupBackgroundControls();
    }

    setupBackgroundControls() {
        if (!window.Chatooly || !window.Chatooly.backgroundManager) return;

        // Transparent background toggle
        const transparentBg = document.getElementById('transparent-bg');
        if (transparentBg) {
            transparentBg.addEventListener('change', (e) => {
                Chatooly.backgroundManager.setTransparent(e.target.checked);
                document.getElementById('bg-color-group').style.display =
                    e.target.checked ? 'none' : 'block';
            });
        }

        // Background color picker
        const bgColor = document.getElementById('bg-color');
        if (bgColor) {
            bgColor.addEventListener('input', (e) => {
                Chatooly.backgroundManager.setBackgroundColor(e.target.value);
            });
        }

        // Background image upload
        const bgImage = document.getElementById('bg-image');
        if (bgImage) {
            bgImage.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    await Chatooly.backgroundManager.setBackgroundImage(file);
                    document.getElementById('clear-bg-image').style.display = 'block';
                    document.getElementById('bg-fit-group').style.display = 'block';
                } catch (error) {
                    alert('Failed to load image: ' + error.message);
                }
            });
        }

        // Clear background image
        const clearBgImage = document.getElementById('clear-bg-image');
        if (clearBgImage) {
            clearBgImage.addEventListener('click', () => {
                Chatooly.backgroundManager.clearBackgroundImage();
                document.getElementById('clear-bg-image').style.display = 'none';
                document.getElementById('bg-fit-group').style.display = 'none';
                document.getElementById('bg-image').value = '';
            });
        }

        // Background image fit mode
        const bgFit = document.getElementById('bg-fit');
        if (bgFit) {
            bgFit.addEventListener('change', (e) => {
                Chatooly.backgroundManager.setFit(e.target.value);
            });
        }
    }

    onCanvasClick(e) {
        const coords = window.Chatooly && window.Chatooly.utils ?
            window.Chatooly.utils.mapMouseToCanvas(e, canvas) :
            this.fallbackMouseMapping(e);

        const x = coords.x;
        const y = coords.y;

        // Create random velocity based on settings
        const speed = this.settings.ballSpeed;
        const vx = (Math.random() - 0.5) * speed * 2;
        const vy = (Math.random() - 0.5) * speed * 2;

        const ball = new Ball(
            x, y,
            this.settings.ballSize,
            this.settings.ballColor,
            vx, vy
        );

        // Update ball physics settings
        ball.gravity = this.settings.gravity;
        ball.bounceDamping = this.settings.bounceDamping;

        this.balls.push(ball);
        this.hasContent = true;
    }

    fallbackMouseMapping(e) {
        const rect = canvas.getBoundingClientRect();
        const displayX = e.clientX - rect.left;
        const displayY = e.clientY - rect.top;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: displayX * scaleX, y: displayY * scaleY };
    }

    onCanvasResized(e) {
        if (!this.hasContent) return;

        const oldWidth = this.previousCanvasSize.width;
        const oldHeight = this.previousCanvasSize.height;
        const newWidth = e.detail.canvas.width;
        const newHeight = e.detail.canvas.height;

        if (oldWidth === 0 || oldHeight === 0) {
            this.previousCanvasSize = { width: newWidth, height: newHeight };
            return;
        }

        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;

        // Scale all ball positions and sizes
        this.balls.forEach(ball => {
            ball.x *= scaleX;
            ball.y *= scaleY;
            ball.radius *= Math.min(scaleX, scaleY);
        });

        this.previousCanvasSize = { width: newWidth, height: newHeight };
    }

    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);

        // Update existing balls physics
        this.balls.forEach(ball => {
            ball.gravity = this.settings.gravity;
            ball.bounceDamping = this.settings.bounceDamping;
        });
    }

    clearAllBalls() {
        this.balls = [];
        this.hasContent = false;
    }

    update() {
        // Update all balls
        this.balls.forEach(ball => ball.update());

        // Remove balls that are too slow and settled
        this.balls = this.balls.filter(ball => {
            const isMoving = Math.abs(ball.vx) > 0.1 || Math.abs(ball.vy) > 0.1;
            const isInBounds = ball.y < canvas.height - ball.radius + 5; // Allow settling on bottom
            return isMoving || !isInBounds || this.balls.length <= 50; // Keep max 50 balls
        });

        if (this.balls.length === 0) {
            this.hasContent = false;
        }
    }

    render() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background FIRST
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            Chatooly.backgroundManager.drawToCanvas(ctx, canvas.width, canvas.height);
        }

        // Draw all balls
        this.balls.forEach(ball => ball.draw(ctx));

        // Draw instructions if no balls
        if (this.balls.length === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Click anywhere to drop a bouncy ball!', canvas.width / 2, canvas.height / 2);
        }
    }

    gameLoop() {
        if (!this.isRunning) return;

        this.update();
        this.render();

        requestAnimationFrame(() => this.gameLoop());
    }

    start() {
        this.isRunning = true;
        this.gameLoop();
    }

    stop() {
        this.isRunning = false;
    }
}

// ========== INITIALIZE ENGINE ==========
const ballsEngine = new BouncyBallsEngine();

// ========== HIGH-RES EXPORT FUNCTION ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!ballsEngine || !ballsEngine.hasContent) {
        console.warn('Balls engine not ready for high-res export');
        return;
    }

    const exportCtx = targetCanvas.getContext('2d');
    targetCanvas.width = canvas.width * scale;
    targetCanvas.height = canvas.height * scale;
    exportCtx.scale(scale, scale);

    // Clear export canvas
    exportCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background at export resolution
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.drawToCanvas(exportCtx, canvas.width, canvas.height);
    }

    // Draw all balls at export resolution
    ballsEngine.balls.forEach(ball => ball.draw(exportCtx));

    console.log(`High-res export completed at ${scale}x resolution`);
};

// ========== GLOBAL ACCESS ==========
window.ballsEngine = ballsEngine;