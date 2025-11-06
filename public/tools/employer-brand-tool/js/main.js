/*
 * Sticker Tool - Main Logic
 * Click anywhere to add animated stickers from text or images
 */

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 1920;
canvas.height = 1080;

// ========== STICKER DATA STRUCTURE ==========
class Sticker {
    constructor(x, y, type, data) {
        this.x = x;
        this.y = y;
        this.type = type; // 'text' or 'image'
        this.data = data; // text string or image element
        this.scale = 0; // Start at 0 for pop animation
        this.targetScale = 1;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1; // Random rotation
        this.bouncePhase = 0; // For bounce animation
        this.animationDuration = 400; // ms
        this.animationStart = Date.now();
        this.isAnimating = true;
        
        // Store settings at creation time
        if (type === 'text') {
            this.text = data;
            this.fontSize = parseInt(document.getElementById('font-size').value);
            this.textColor = document.getElementById('text-color').value;
            this.bgColor = document.getElementById('bg-color-sticker').value;
            this.showBg = document.getElementById('text-bg-toggle').getAttribute('aria-pressed') === 'true';
        } else {
            this.image = data;
            this.size = parseInt(document.getElementById('image-size').value);
        }
    }

    update() {
        if (!this.isAnimating) return;

        const elapsed = Date.now() - this.animationStart;
        const progress = Math.min(elapsed / this.animationDuration, 1);

        // Pop animation: scale from 0 to 1 with bounce
        if (progress < 1) {
            // Ease-out bounce effect
            const easeOutBounce = (t) => {
                if (t < 1 / 2.75) {
                    return 7.5625 * t * t;
                } else if (t < 2 / 2.75) {
                    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
                } else if (t < 2.5 / 2.75) {
                    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
                } else {
                    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
                }
            };
            
            this.scale = easeOutBounce(progress);
            this.rotation = this.rotationSpeed * progress * 360;
        } else {
            this.scale = 1;
            this.rotation = 0;
            this.isAnimating = false;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.scale(this.scale, this.scale);

        if (this.type === 'text') {
            // Draw text sticker
            ctx.font = `bold ${this.fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Measure text for background
            const metrics = ctx.measureText(this.text);
            const textWidth = metrics.width;
            const textHeight = this.fontSize;
            const padding = 10;

            if (this.showBg) {
                // Draw background
                ctx.fillStyle = this.bgColor;
                ctx.fillRect(
                    -textWidth / 2 - padding,
                    -textHeight / 2 - padding,
                    textWidth + padding * 2,
                    textHeight + padding * 2
                );
            }

            // Draw text
            ctx.fillStyle = this.textColor;
            ctx.fillText(this.text, 0, 0);
        } else {
            // Draw image sticker
            const size = this.size;
            ctx.drawImage(this.image, -size / 2, -size / 2, size, size);
        }

        ctx.restore();
    }
}

// ========== STICKER MANAGER ==========
class StickerManager {
    constructor() {
        this.stickers = [];
        this.previousCanvasSize = { width: canvas.width, height: canvas.height };
        this.isInitialized = false;
        this.currentStickerImage = null; // For image stickers
    }

    init() {
        this.setupEventListeners();
        this.setupBackgroundSystem();
        this.startRenderLoop();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Canvas click handler
        canvas.addEventListener('click', (e) => this.onCanvasClick(e));
        
        // Canvas resize handler
        document.addEventListener('chatooly:canvas-resized', (e) => this.onCanvasResized(e));
        
        // Clear all button
        document.getElementById('clear-all').addEventListener('click', () => {
            this.stickers = [];
            this.render();
        });

        // Image upload handler
        document.getElementById('sticker-image').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        this.currentStickerImage = img;
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    setupBackgroundSystem() {
        // Initialize background manager
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            window.Chatooly.backgroundManager.init(canvas);

            // Connect transparent background toggle
            document.getElementById('transparent-bg').addEventListener('click', (e) => {
                const isPressed = e.target.getAttribute('aria-pressed') === 'true';
                window.Chatooly.backgroundManager.setTransparent(isPressed);
                this.render();
            });

            // Connect background color
            document.getElementById('bg-color').addEventListener('input', (e) => {
                window.Chatooly.backgroundManager.setBackgroundColor(e.target.value);
                this.render();
            });

            // Connect background image upload
            document.getElementById('bg-image').addEventListener('change', async (e) => {
                if (e.target.files[0]) {
                    await window.Chatooly.backgroundManager.setBackgroundImage(e.target.files[0]);
                    document.getElementById('clear-bg-image').style.display = 'block';
                    document.getElementById('bg-fit-group').style.display = 'block';
                    this.render();
                }
            });

            // Connect clear button
            document.getElementById('clear-bg-image').addEventListener('click', () => {
                window.Chatooly.backgroundManager.clearBackgroundImage();
                document.getElementById('clear-bg-image').style.display = 'none';
                document.getElementById('bg-fit-group').style.display = 'none';
                document.getElementById('bg-image').value = '';
                this.render();
            });

            // Connect fit mode
            document.getElementById('bg-fit').addEventListener('change', (e) => {
                window.Chatooly.backgroundManager.setFit(e.target.value);
                this.render();
            });
        }
    }

    onCanvasClick(e) {
        // Get mouse coordinates mapped to canvas
        const coords = window.Chatooly && window.Chatooly.utils ?
            window.Chatooly.utils.mapMouseToCanvas(e, canvas) :
            this.fallbackMouseMapping(e);

        const stickerType = document.getElementById('sticker-type').value;

        if (stickerType === 'text') {
            const text = document.getElementById('sticker-text').value || '✨';
            this.addSticker(coords.x, coords.y, 'text', text);
        } else {
            if (this.currentStickerImage) {
                this.addSticker(coords.x, coords.y, 'image', this.currentStickerImage);
            } else {
                alert('Please upload an image first!');
            }
        }
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
        if (this.stickers.length === 0) {
            this.previousCanvasSize = { width: e.detail.canvas.width, height: e.detail.canvas.height };
            return;
        }

        const oldWidth = this.previousCanvasSize.width;
        const oldHeight = this.previousCanvasSize.height;
        const newWidth = e.detail.canvas.width;
        const newHeight = e.detail.canvas.height;

        if (oldWidth === 0 || oldHeight === 0) {
            this.previousCanvasSize = { width: newWidth, height: newHeight };
            this.render();
            return;
        }

        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;

        // Scale all sticker positions
        this.stickers.forEach(sticker => {
            sticker.x *= scaleX;
            sticker.y *= scaleY;
        });

        this.previousCanvasSize = { width: newWidth, height: newHeight };
        this.render();
    }

    addSticker(x, y, type, data) {
        const sticker = new Sticker(x, y, type, data);
        this.stickers.push(sticker);
        this.render();
    }

    render() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background FIRST
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            window.Chatooly.backgroundManager.drawToCanvas(ctx, canvas.width, canvas.height);
        }

        // Update and draw all stickers
        this.stickers.forEach(sticker => {
            sticker.update();
            sticker.draw(ctx);
        });
    }

    startRenderLoop() {
        const animate = () => {
            // Check if any stickers are animating
            const hasAnimating = this.stickers.some(s => s.isAnimating);
            
            if (hasAnimating) {
                this.render();
            }
            
            requestAnimationFrame(animate);
        };
        animate();
    }
}

// ========== INITIALIZE TOOL ==========
let stickerManager;

// Wait for DOM and CDN to load
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for CDN to initialize
    setTimeout(() => {
        stickerManager = new StickerManager();
        stickerManager.init();
        stickerManager.render();
    }, 100);
});

// ========== HIGH-RESOLUTION EXPORT ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!stickerManager || !stickerManager.isInitialized) {
        console.warn('Sticker tool not ready for high-res export');
        return;
    }

    const exportCtx = targetCanvas.getContext('2d');
    targetCanvas.width = canvas.width * scale;
    targetCanvas.height = canvas.height * scale;

    // Clear canvas
    exportCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    // Scale context
    exportCtx.scale(scale, scale);

    // Draw background FIRST
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.drawToCanvas(exportCtx, canvas.width, canvas.height);
    }

    // Draw all stickers at high resolution
    stickerManager.stickers.forEach(sticker => {
        exportCtx.save();
        exportCtx.translate(sticker.x, sticker.y);
        exportCtx.rotate((sticker.rotation * Math.PI) / 180);
        exportCtx.scale(sticker.scale, sticker.scale);

        if (sticker.type === 'text') {
            // Draw text sticker at high resolution
            exportCtx.font = `bold ${sticker.fontSize}px Arial`;
            exportCtx.textAlign = 'center';
            exportCtx.textBaseline = 'middle';

            const metrics = exportCtx.measureText(sticker.text);
            const textWidth = metrics.width;
            const textHeight = sticker.fontSize;
            const padding = 10;

            if (sticker.showBg) {
                exportCtx.fillStyle = sticker.bgColor;
                exportCtx.fillRect(
                    -textWidth / 2 - padding,
                    -textHeight / 2 - padding,
                    textWidth + padding * 2,
                    textHeight + padding * 2
                );
            }

            exportCtx.fillStyle = sticker.textColor;
            exportCtx.fillText(sticker.text, 0, 0);
        } else {
            // Draw image sticker at high resolution
            const size = sticker.size;
            exportCtx.drawImage(sticker.image, -size / 2, -size / 2, size, size);
        }

        exportCtx.restore();
    });

    console.log(`High-res export completed at ${scale}x resolution`);
};
