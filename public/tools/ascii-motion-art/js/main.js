/*
 * ASCII Motion Art - Main Logic
 * Author: EinavR
 *
 * Create abstract ASCII art with motion effects and mouse interactions from text input
 */

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');
canvas.width = 1920;   // HD resolution width (1920x1080)
canvas.height = 1080;  // HD resolution height
const ctx = canvas.getContext('2d');

// ========== ASCII MOTION ART SYSTEM ==========

class ASCIIMotionArt {
    constructor() {
        this.canvas = canvas;
        this.ctx = ctx;
        this.textElements = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.animationId = null;
        this.time = 0;
        this.previousCanvasSize = { width: 1920, height: 1080 };
        this.isInitialized = false;

        // Tool settings
        this.settings = {
            text: 'MOTION',
            color: '#00ff88',
            density: 50,
            spread: 100,
            layoutPattern: 'grid',
            motionEnabled: true,
            motionType: 'float',
            motionSpeed: 50,
            motionIntensity: 30,
            mouseEnabled: true,
            mouseEffect: 'attract',
            mouseRadius: 100,
            mouseStrength: 50
        };

        this.init();
    }

    init() {
        // Initialize background system
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            window.Chatooly.backgroundManager.init(this.canvas);
        }

        this.setupEventListeners();
        this.generateTextElements();
        this.startAnimation();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Canvas resize handling
        document.addEventListener('chatooly:canvas-resized', (e) => this.onCanvasResized(e));

        // Mouse tracking
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseenter', () => this.mouseEnabled = true);
        this.canvas.addEventListener('mouseleave', () => this.mouseEnabled = false);

        // Background controls (MANDATORY)
        this.setupBackgroundControls();
    }

    setupBackgroundControls() {
        // Transparent background toggle
        const transparentBg = document.getElementById('transparent-bg');
        if (transparentBg) {
            transparentBg.addEventListener('change', (e) => {
                if (window.Chatooly && window.Chatooly.backgroundManager) {
                    window.Chatooly.backgroundManager.setTransparent(e.target.checked);
                    document.getElementById('bg-color-group').style.display = e.target.checked ? 'none' : 'block';
                }
            });
        }

        // Background color
        const bgColor = document.getElementById('bg-color');
        if (bgColor) {
            bgColor.addEventListener('input', (e) => {
                if (window.Chatooly && window.Chatooly.backgroundManager) {
                    window.Chatooly.backgroundManager.setBackgroundColor(e.target.value);
                }
            });
        }

        // Background image upload
        const bgImage = document.getElementById('bg-image');
        if (bgImage) {
            bgImage.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file || !window.Chatooly || !window.Chatooly.backgroundManager) return;

                try {
                    await window.Chatooly.backgroundManager.setBackgroundImage(file);
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
                if (window.Chatooly && window.Chatooly.backgroundManager) {
                    window.Chatooly.backgroundManager.clearBackgroundImage();
                    document.getElementById('clear-bg-image').style.display = 'none';
                    document.getElementById('bg-fit-group').style.display = 'none';
                    document.getElementById('bg-image').value = '';
                }
            });
        }

        // Background image fit
        const bgFit = document.getElementById('bg-fit');
        if (bgFit) {
            bgFit.addEventListener('change', (e) => {
                if (window.Chatooly && window.Chatooly.backgroundManager) {
                    window.Chatooly.backgroundManager.setFit(e.target.value);
                }
            });
        }
    }

    onCanvasResized(e) {
        const oldWidth = this.previousCanvasSize.width;
        const oldHeight = this.previousCanvasSize.height;
        const newWidth = e.detail.canvas.width;
        const newHeight = e.detail.canvas.height;

        if (oldWidth === 0 || oldHeight === 0) {
            this.previousCanvasSize = { width: newWidth, height: newHeight };
            this.generateTextElements();
            return;
        }

        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;

        // Scale all text elements
        this.textElements.forEach(element => {
            element.originX *= scaleX;
            element.originY *= scaleY;
            element.x *= scaleX;
            element.y *= scaleY;
        });

        this.previousCanvasSize = { width: newWidth, height: newHeight };
        this.generateTextElements();
    }

    onMouseMove(e) {
        if (window.Chatooly && window.Chatooly.utils) {
            const coords = window.Chatooly.utils.mapMouseToCanvas(e, this.canvas);
            this.mouseX = coords.x;
            this.mouseY = coords.y;
        } else {
            const rect = this.canvas.getBoundingClientRect();
            const displayX = e.clientX - rect.left;
            const displayY = e.clientY - rect.top;
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouseX = displayX * scaleX;
            this.mouseY = displayY * scaleY;
        }
    }

    generateTextElements() {
        this.textElements = [];
        const text = this.settings.text;
        const chars = text.split('');
        if (chars.length === 0) return;

        const numElements = Math.floor(this.settings.density * 2);
        const spread = this.settings.spread;

        for (let i = 0; i < numElements; i++) {
            const char = chars[i % chars.length];
            let position = this.calculatePosition(i, numElements, spread);

            const element = {
                char: char,
                originX: position.x,
                originY: position.y,
                x: position.x,
                y: position.y,
                vx: 0,
                vy: 0,
                phase: Math.random() * Math.PI * 2,
                size: 12 + Math.random() * 20,
                rotation: 0,
                opacity: 0.7 + Math.random() * 0.3
            };

            this.textElements.push(element);
        }
    }

    calculatePosition(index, total, spread) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        switch (this.settings.layoutPattern) {
            case 'grid':
                const cols = Math.ceil(Math.sqrt(total));
                const col = index % cols;
                const row = Math.floor(index / cols);
                return {
                    x: centerX + (col - cols/2) * spread,
                    y: centerY + (row - Math.ceil(total/cols)/2) * spread
                };

            case 'spiral':
                const angle = index * 0.5;
                const radius = index * 3;
                return {
                    x: centerX + Math.cos(angle) * radius,
                    y: centerY + Math.sin(angle) * radius
                };

            case 'wave':
                const waveX = (index / total) * this.canvas.width;
                const waveY = centerY + Math.sin((index / total) * Math.PI * 4) * spread;
                return { x: waveX, y: waveY };

            case 'circle':
                const circleAngle = (index / total) * Math.PI * 2;
                return {
                    x: centerX + Math.cos(circleAngle) * spread,
                    y: centerY + Math.sin(circleAngle) * spread
                };

            case 'random':
            default:
                return {
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height
                };
        }
    }

    updateMotion() {
        this.time += 0.016 * (this.settings.motionSpeed / 50);

        this.textElements.forEach((element, i) => {
            const intensity = this.settings.motionIntensity;

            if (this.settings.motionEnabled) {
                switch (this.settings.motionType) {
                    case 'float':
                        element.x = element.originX + Math.sin(this.time + element.phase) * intensity * 0.5;
                        element.y = element.originY + Math.cos(this.time * 0.7 + element.phase) * intensity * 0.3;
                        break;

                    case 'wave':
                        element.y = element.originY + Math.sin(this.time * 2 + element.originX * 0.01) * intensity;
                        break;

                    case 'slide':
                        element.x = element.originX + Math.sin(this.time + element.phase) * intensity;
                        break;

                    case 'bounce':
                        element.y = element.originY + Math.abs(Math.sin(this.time * 3 + element.phase)) * intensity;
                        break;

                    case 'rotate':
                        element.rotation = this.time + element.phase;
                        break;

                    case 'pulse':
                        const pulse = Math.sin(this.time * 4 + element.phase);
                        element.size = (12 + Math.random() * 20) + pulse * 5;
                        element.opacity = 0.7 + pulse * 0.3;
                        break;
                }
            }

            // Mouse interaction
            if (this.settings.mouseEnabled && this.mouseX && this.mouseY) {
                const dx = element.x - this.mouseX;
                const dy = element.y - this.mouseY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.settings.mouseRadius) {
                    const force = (1 - distance / this.settings.mouseRadius) * this.settings.mouseStrength * 0.1;
                    const angle = Math.atan2(dy, dx);

                    switch (this.settings.mouseEffect) {
                        case 'attract':
                            element.vx += -Math.cos(angle) * force;
                            element.vy += -Math.sin(angle) * force;
                            break;

                        case 'repel':
                            element.vx += Math.cos(angle) * force;
                            element.vy += Math.sin(angle) * force;
                            break;

                        case 'spread':
                            if (distance < this.settings.mouseRadius * 0.5) {
                                element.vx += Math.cos(angle) * force * 2;
                                element.vy += Math.sin(angle) * force * 2;
                            }
                            break;

                        case 'follow':
                            element.vx += -Math.cos(angle) * force * 0.5;
                            element.vy += -Math.sin(angle) * force * 0.5;
                            break;

                        case 'turbulence':
                            const turbulence = Math.sin(this.time * 5 + distance * 0.1) * force;
                            element.vx += Math.cos(angle + Math.PI/2) * turbulence;
                            element.vy += Math.sin(angle + Math.PI/2) * turbulence;
                            break;
                    }
                }
            }

            // Apply velocity and damping
            element.x += element.vx;
            element.y += element.vy;
            element.vx *= 0.95;
            element.vy *= 0.95;

            // Return to origin slowly
            element.vx += (element.originX - element.x) * 0.01;
            element.vy += (element.originY - element.y) * 0.01;
        });
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background FIRST
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            window.Chatooly.backgroundManager.drawToCanvas(this.ctx, this.canvas.width, this.canvas.height);
        }

        // Set text style
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = this.settings.color;

        // Draw text elements
        this.textElements.forEach(element => {
            this.ctx.save();

            this.ctx.globalAlpha = element.opacity;
            this.ctx.font = `${element.size}px 'Courier New', monospace`;

            if (element.rotation) {
                this.ctx.translate(element.x, element.y);
                this.ctx.rotate(element.rotation);
                this.ctx.fillText(element.char, 0, 0);
            } else {
                this.ctx.fillText(element.char, element.x, element.y);
            }

            this.ctx.restore();
        });
    }

    startAnimation() {
        const animate = () => {
            this.updateMotion();
            this.render();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    // Update settings methods
    updateText(text) {
        this.settings.text = text;
        this.generateTextElements();
    }

    updateColor(color) {
        this.settings.color = color;
    }

    updateDensity(density) {
        this.settings.density = density;
        this.generateTextElements();
    }

    updateSpread(spread) {
        this.settings.spread = spread;
        this.generateTextElements();
    }

    updateLayoutPattern(pattern) {
        this.settings.layoutPattern = pattern;
        this.generateTextElements();
    }

    updateMotionSettings(enabled, type, speed, intensity) {
        this.settings.motionEnabled = enabled;
        this.settings.motionType = type;
        this.settings.motionSpeed = speed;
        this.settings.motionIntensity = intensity;
    }

    updateMouseSettings(enabled, effect, radius, strength) {
        this.settings.mouseEnabled = enabled;
        this.settings.mouseEffect = effect;
        this.settings.mouseRadius = radius;
        this.settings.mouseStrength = strength;
    }
}

// Initialize the ASCII Motion Art system
let asciiArt;

// Wait for CDN to load, then initialize
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        asciiArt = new ASCIIMotionArt();
        // Make it globally accessible for UI controls
        window.asciiArt = asciiArt;
    }, 100);
});

// High-resolution export function (MANDATORY)
window.renderHighResolution = function(targetCanvas, scale) {
    if (!asciiArt || !asciiArt.isInitialized) {
        console.warn('ASCII Art not ready for high-res export');
        return;
    }

    const exportCtx = targetCanvas.getContext('2d');
    targetCanvas.width = canvas.width * scale;
    targetCanvas.height = canvas.height * scale;
    exportCtx.scale(scale, scale);

    // Clear canvas
    exportCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background at export resolution
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.drawToCanvas(exportCtx, canvas.width, canvas.height);
    }

    // Draw ASCII elements at high resolution
    exportCtx.textAlign = 'center';
    exportCtx.textBaseline = 'middle';
    exportCtx.fillStyle = asciiArt.settings.color;

    asciiArt.textElements.forEach(element => {
        exportCtx.save();
        exportCtx.globalAlpha = element.opacity;
        exportCtx.font = `${element.size}px 'Courier New', monospace`;

        if (element.rotation) {
            exportCtx.translate(element.x, element.y);
            exportCtx.rotate(element.rotation);
            exportCtx.fillText(element.char, 0, 0);
        } else {
            exportCtx.fillText(element.char, element.x, element.y);
        }

        exportCtx.restore();
    });

    console.log(`High-res ASCII art export completed at ${scale}x resolution`);
};