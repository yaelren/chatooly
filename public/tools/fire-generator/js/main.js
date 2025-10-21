/* 
 * Fire Generator - Main Logic
 * Author: Amnon
 * 
 * Creates an 8-bit fire/flame animation with customizable effects
 */

class FireGenerator {
    constructor() {
        this.canvas = document.getElementById('chatooly-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Canvas dimensions
        this.width = 800;
        this.height = 600;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Fire buffer (pixel array for fire effect)
        this.pixelSize = 6; // 8-bit style pixel size (increased for reference style)
        this.bufferWidth = Math.floor(this.width / this.pixelSize);
        this.bufferHeight = Math.floor(this.height / this.pixelSize);
        this.fireBuffer = new Array(this.bufferWidth * this.bufferHeight).fill(0);
        
        // Ember particles for campfire effect
        this.embers = [];
        
        // Animation control
        this.frameCounter = 0;
        this.animationSpeed = 1.0;
        this.targetFPS = 8; // 8 FPS for retro feel
        this.frameInterval = 1000 / this.targetFPS; // ~125ms per frame
        this.lastFrameTime = 0;
        
        // Settings
        this.settings = {
            fireStyle: 'flame',
            fireSize: 'medium',
            intensity: 1.0,
            flameHeight: 3,
            pixelSize: 6,
            animationSpeed: 1.0,
            turbulence: 30,
            wind: 0,
            smoke: true,
            colorPalette: 'classic'
        };
        
        // Color palettes (8-bit style)
        this.palettes = {
            classic: this.generatePalette([
                [0, 0, 0],       // Black
                [50, 0, 0],      // Dark red
                [150, 0, 0],     // Red
                [255, 50, 0],    // Orange-red
                [255, 150, 0],   // Orange
                [255, 200, 0],   // Yellow-orange
                [255, 255, 0],   // Yellow
                [255, 255, 100], // Bright yellow
                [255, 255, 200]  // White-yellow
            ]),
            blue: this.generatePalette([
                [0, 0, 0],
                [0, 0, 50],
                [0, 0, 150],
                [0, 50, 255],
                [50, 100, 255],
                [100, 150, 255],
                [150, 200, 255],
                [200, 230, 255],
                [230, 240, 255]
            ]),
            green: this.generatePalette([
                [0, 0, 0],
                [0, 50, 0],
                [0, 100, 0],
                [50, 150, 0],
                [100, 200, 50],
                [150, 255, 100],
                [200, 255, 150],
                [230, 255, 200],
                [240, 255, 230]
            ]),
            purple: this.generatePalette([
                [0, 0, 0],
                [30, 0, 50],
                [80, 0, 150],
                [150, 0, 200],
                [200, 50, 255],
                [220, 100, 255],
                [240, 150, 255],
                [250, 200, 255],
                [255, 230, 255]
            ]),
            white: this.generatePalette([
                [0, 0, 0],
                [50, 50, 50],
                [100, 100, 100],
                [150, 150, 150],
                [180, 180, 180],
                [210, 210, 210],
                [230, 230, 230],
                [245, 245, 245],
                [255, 255, 255]
            ])
        };
        
        // Animation
        this.animationFrame = null;
        this.isRunning = false;
        
        this.init();
    }
    
    generatePalette(keyColors) {
        const palette = [];
        const steps = Math.floor(256 / (keyColors.length - 1));
        
        for (let i = 0; i < keyColors.length - 1; i++) {
            const start = keyColors[i];
            const end = keyColors[i + 1];
            
            for (let j = 0; j < steps; j++) {
                const t = j / steps;
                palette.push([
                    Math.floor(start[0] + (end[0] - start[0]) * t),
                    Math.floor(start[1] + (end[1] - start[1]) * t),
                    Math.floor(start[2] + (end[2] - start[2]) * t)
                ]);
            }
        }
        
        // Fill remaining slots
        while (palette.length < 256) {
            palette.push(keyColors[keyColors.length - 1]);
        }
        
        return palette;
    }
    
    init() {
        // Initialize background manager
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            window.Chatooly.backgroundManager.init(this.canvas);
        }
        
        this.setupEventListeners();
        this.initializeFireBuffer();
        this.start();
    }
    
    setupEventListeners() {
        // Fire style
        document.getElementById('fire-style').addEventListener('change', (e) => {
            this.settings.fireStyle = e.target.value;
            this.initializeFireBuffer();
        });
        
        // Fire size
        document.getElementById('fire-size').addEventListener('change', (e) => {
            this.settings.fireSize = e.target.value;
            this.initializeFireBuffer();
        });
        
        // Fire intensity
        document.getElementById('fire-intensity').addEventListener('input', (e) => {
            this.settings.intensity = parseFloat(e.target.value);
            document.getElementById('intensity-value').textContent = e.target.value;
        });
        
        // Animation speed
        document.getElementById('animation-speed').addEventListener('input', (e) => {
            this.settings.animationSpeed = parseFloat(e.target.value);
            this.animationSpeed = parseFloat(e.target.value);
            document.getElementById('animation-speed-value').textContent = e.target.value + 'x';
        });
        
        // Flame height
        document.getElementById('flame-height').addEventListener('input', (e) => {
            this.settings.flameHeight = parseFloat(e.target.value);
            document.getElementById('flame-height-value').textContent = e.target.value;
        });
        
        // Pixel size
        document.getElementById('pixel-size').addEventListener('input', (e) => {
            const newPixelSize = parseInt(e.target.value);
            this.settings.pixelSize = newPixelSize;
            document.getElementById('pixel-size-value').textContent = e.target.value;
            
            // Recalculate buffer dimensions when pixel size changes
            this.pixelSize = newPixelSize;
            this.bufferWidth = Math.floor(this.width / this.pixelSize);
            this.bufferHeight = Math.floor(this.height / this.pixelSize);
            this.fireBuffer = new Array(this.bufferWidth * this.bufferHeight).fill(0);
            this.embers = [];
        });
        
        // Turbulence
        document.getElementById('turbulence').addEventListener('input', (e) => {
            this.settings.turbulence = parseInt(e.target.value);
            document.getElementById('turbulence-value').textContent = e.target.value;
        });
        
        // Wind
        document.getElementById('wind').addEventListener('input', (e) => {
            this.settings.wind = parseInt(e.target.value);
            document.getElementById('wind-value').textContent = e.target.value;
        });
        
        // Smoke toggle
        document.getElementById('smoke-toggle').addEventListener('change', (e) => {
            this.settings.smoke = e.target.checked;
        });
        
        // Color palette
        document.getElementById('color-palette').addEventListener('change', (e) => {
            this.settings.colorPalette = e.target.value;
        });
        
        // Reset button
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetToDefault();
        });
        
        // Background controls
        document.getElementById('transparent-bg').addEventListener('change', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setTransparent(e.target.checked);
            }
            document.getElementById('bg-color-group').style.display = e.target.checked ? 'none' : 'block';
        });
        
        document.getElementById('bg-color').addEventListener('input', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setBackgroundColor(e.target.value);
            }
        });
        
        document.getElementById('bg-image').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file && window.Chatooly && window.Chatooly.backgroundManager) {
                await window.Chatooly.backgroundManager.setBackgroundImage(file);
                document.getElementById('clear-bg-image').style.display = 'block';
                document.getElementById('bg-fit-group').style.display = 'block';
            }
        });
        
        document.getElementById('clear-bg-image').addEventListener('click', () => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.clearBackgroundImage();
            }
            document.getElementById('clear-bg-image').style.display = 'none';
            document.getElementById('bg-fit-group').style.display = 'none';
            document.getElementById('bg-image').value = '';
        });
        
        document.getElementById('bg-fit').addEventListener('change', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setFit(e.target.value);
            }
        });
    }
    
    resetToDefault() {
        this.settings = {
            fireStyle: 'flame',
            fireSize: 'medium',
            intensity: 1.0,
            flameHeight: 3,
            pixelSize: 6,
            animationSpeed: 1.0,
            turbulence: 30,
            wind: 0,
            smoke: true,
            colorPalette: 'classic'
        };
        
        // Update UI
        document.getElementById('fire-style').value = 'flame';
        document.getElementById('fire-size').value = 'medium';
        document.getElementById('fire-intensity').value = '1.0';
        document.getElementById('intensity-value').textContent = '1.0';
        document.getElementById('animation-speed').value = '1.0';
        document.getElementById('animation-speed-value').textContent = '1.0x';
        document.getElementById('flame-height').value = '3';
        document.getElementById('flame-height-value').textContent = '3';
        document.getElementById('pixel-size').value = '6';
        document.getElementById('pixel-size-value').textContent = '6';
        document.getElementById('turbulence').value = '30';
        document.getElementById('turbulence-value').textContent = '30';
        document.getElementById('wind').value = '0';
        document.getElementById('wind-value').textContent = '0';
        document.getElementById('smoke-toggle').checked = true;
        document.getElementById('color-palette').value = 'classic';
        
        // Reset buffer with default pixel size
        this.pixelSize = 6;
        this.animationSpeed = 1.0;
        this.bufferWidth = Math.floor(this.width / this.pixelSize);
        this.bufferHeight = Math.floor(this.height / this.pixelSize);
        this.fireBuffer = new Array(this.bufferWidth * this.bufferHeight).fill(0);
        this.embers = [];
    }
    
    initializeFireBuffer() {
        this.fireBuffer.fill(0);
        this.embers = [];
    }
    
    createLogs() {
        // Draw wood logs at the bottom of the fire
        const logColor = [80, 50, 20]; // Brown wood color
        const burntColor = [40, 25, 10]; // Darker burnt wood
        
        const centerX = this.bufferWidth / 2;
        const baseY = this.bufferHeight - 12; // Moved logs lower
        
        // Log dimensions based on fire size (made larger)
        const logSizes = {
            small: { length: 30, thickness: 5 },
            medium: { length: 45, thickness: 6 },
            large: { length: 60, thickness: 8 }
        };
        
        const logSize = logSizes[this.settings.fireSize];
        
        return {
            // Left log (angled)
            log1: {
                x1: centerX - logSize.length / 2,
                y1: baseY,
                x2: centerX - 2,
                y2: baseY - 3,
                thickness: logSize.thickness
            },
            // Right log (angled)
            log2: {
                x1: centerX + 2,
                y1: baseY - 3,
                x2: centerX + logSize.length / 2,
                y2: baseY,
                thickness: logSize.thickness
            },
            // Bottom log (horizontal)
            log3: {
                x1: centerX - logSize.length / 3,
                y1: baseY + 2,
                x2: centerX + logSize.length / 3,
                y2: baseY + 2,
                thickness: logSize.thickness - 1
            }
        };
    }
    
    updateEmbers() {
        // Create new ember particles
        if (Math.random() < 0.3 * this.settings.intensity) {
            const fireWidth = {
                small: this.bufferWidth * 0.2,
                medium: this.bufferWidth * 0.3,
                large: this.bufferWidth * 0.4
            }[this.settings.fireSize];
            
            const centerX = this.bufferWidth / 2;
            const startX = centerX - fireWidth / 2 + Math.random() * fireWidth;
            
            this.embers.push({
                x: startX,
                y: this.bufferHeight - 18, // Start embers from log area
                vx: (Math.random() - 0.5) * 0.5 + this.settings.wind / 100,
                vy: -(Math.random() * 2 + 1),
                life: 255,
                size: Math.random() > 0.7 ? 2 : 1
            });
        }
        
        // Update existing embers
        this.embers = this.embers.filter(ember => {
            ember.x += ember.vx;
            ember.y += ember.vy;
            ember.vy -= 0.05; // Gravity/rise
            ember.life -= 3;
            
            // Add turbulence
            ember.x += (Math.random() - 0.5) * this.settings.turbulence / 50;
            
            return ember.life > 0 && ember.y > 0;
        });
    }
    
    updateFire() {
        // Advance frame counter based on animation speed
        this.frameCounter += this.animationSpeed;
        
        // Update ember particles
        this.updateEmbers();
        
        const centerX = Math.floor(this.bufferWidth / 2);
        const centerY = Math.floor(this.bufferHeight * 0.7); // Center flame vertically lower
        const baseIntensity = 255 * this.settings.intensity;
        
        // Fire dimensions based on size and style
        const sizeDimensions = {
            small: { width: 25, height: 35 },
            medium: { width: 40, height: 55 },
            large: { width: 60, height: 75 }
        };
        const dims = sizeDimensions[this.settings.fireSize];
        
        if (this.settings.fireStyle === 'flame') {
            // Teardrop flame shape (like emoji)
            this.createFlameShape(centerX, centerY, dims, baseIntensity);
        } else if (this.settings.fireStyle === 'fireball') {
            // Round fireball shape
            this.createFireballShape(centerX, centerY, dims, baseIntensity);
        } else {
            // Campfire style (original)
            this.createCampfireShape(centerX, dims, baseIntensity);
        }
        
    }
    
    createFlameShape(centerX, centerY, dims, baseIntensity) {
        // Create teardrop/flame-shaped fire source
        const flameWidth = dims.width;
        const flameHeight = dims.height;
        
        for (let i = 0; i < 80; i++) {
            // Create flame shape: wide at bottom, narrow at top
            const heightRatio = Math.random();
            const y = Math.floor(centerY - flameHeight * heightRatio * this.settings.flameHeight / 3);
            
            // Teardrop shape: wider at middle-bottom, narrow at top
            let widthAtHeight;
            if (heightRatio < 0.3) {
                // Bottom: start narrow
                widthAtHeight = flameWidth * 0.3 * (heightRatio / 0.3);
            } else if (heightRatio < 0.6) {
                // Middle: widest part
                widthAtHeight = flameWidth * 0.3 + (flameWidth * 0.4) * ((heightRatio - 0.3) / 0.3);
            } else {
                // Top: taper to point
                widthAtHeight = flameWidth * 0.7 * (1 - (heightRatio - 0.6) / 0.4);
            }
            
            const x = Math.floor(centerX + (Math.random() - 0.5) * widthAtHeight);
            
            if (x >= 0 && x < this.bufferWidth && y >= 0 && y < this.bufferHeight) {
                // Hottest in center, cooler at edges
                const distFromCenter = Math.abs(x - centerX) / (widthAtHeight / 2);
                const intensity = baseIntensity * (1.2 - distFromCenter * 0.5) * (1 - heightRatio * 0.3);
                const index = y * this.bufferWidth + x;
                this.fireBuffer[index] = Math.min(255, Math.max(this.fireBuffer[index], intensity));
            }
        }
    }
    
    createFireballShape(centerX, centerY, dims, baseIntensity) {
        // Create round fireball with flames on top
        const radius = dims.width * 0.4;
        
        for (let i = 0; i < 100; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            
            const x = Math.floor(centerX + Math.cos(angle) * dist);
            const y = Math.floor(centerY + Math.sin(angle) * dist * 0.8); // Slightly oval
            
            if (x >= 0 && x < this.bufferWidth && y >= 0 && y < this.bufferHeight) {
                const distRatio = dist / radius;
                const intensity = baseIntensity * (1.3 - distRatio);
                const index = y * this.bufferWidth + x;
                this.fireBuffer[index] = Math.min(255, Math.max(this.fireBuffer[index], intensity));
            }
        }
        
        // Add flames shooting up from top
        for (let i = 0; i < 40; i++) {
            const heightOffset = Math.random() * dims.height * 0.6;
            const x = Math.floor(centerX + (Math.random() - 0.5) * radius * (1 - heightOffset / (dims.height * 0.6)));
            const y = Math.floor(centerY - radius * 0.8 - heightOffset);
            
            if (x >= 0 && x < this.bufferWidth && y >= 0 && y < this.bufferHeight) {
                const intensity = baseIntensity * (1 - heightOffset / (dims.height * 0.6));
                const index = y * this.bufferWidth + x;
                this.fireBuffer[index] = Math.min(255, Math.max(this.fireBuffer[index], intensity));
            }
        }
    }
    
    createCampfireShape(centerX, dims, baseIntensity) {
        // Original campfire style
        const fireWidth = dims.width;
        const baseY = this.bufferHeight - 15;
        
        const firePoints = [
            { x: centerX - fireWidth / 3, strength: 1.0 },
            { x: centerX, strength: 1.2 },
            { x: centerX + fireWidth / 3, strength: 1.0 }
        ];
        
        for (const point of firePoints) {
            for (let i = 0; i < 5; i++) {
                const x = Math.floor(point.x + (Math.random() - 0.5) * fireWidth / 3);
                const y = baseY + Math.floor(Math.random() * 3);
                
                if (x >= 0 && x < this.bufferWidth && y >= 0 && y < this.bufferHeight) {
                    const intensity = Math.random() > 0.2 ? baseIntensity * point.strength : baseIntensity * 0.6;
                    const index = y * this.bufferWidth + x;
                    this.fireBuffer[index] = Math.min(255, intensity);
                }
            }
        }
    }
    
    propagateFire() {
        // Propagate fire upward with cooling, turbulence, and natural tapering
        for (let y = 0; y < this.bufferHeight - 1; y++) {
            for (let x = 0; x < this.bufferWidth; x++) {
                const index = y * this.bufferWidth + x;
                
                // Get surrounding pixels
                let sum = 0;
                let count = 0;
                
                // Sample pixels below (fire rises)
                for (let dy = 1; dy <= 2; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const sx = x + dx + Math.floor((Math.random() - 0.5) * this.settings.turbulence / 50);
                        const sy = y + dy;
                        
                        if (sx >= 0 && sx < this.bufferWidth && sy >= 0 && sy < this.bufferHeight) {
                            const sampleIndex = sy * this.bufferWidth + sx;
                            sum += this.fireBuffer[sampleIndex];
                            count++;
                        }
                    }
                }
                
                if (count === 0) continue;
                
                // Calculate new value with cooling
                let newValue = sum / count;
                
                // Cool down fire as it rises - adjustable with flame height setting
                const baseCooling = this.settings.smoke ? 1.8 : 2.5;
                const cooling = baseCooling / this.settings.flameHeight;
                newValue -= Math.random() * cooling * 1.5;
                
                // Apply wind effect
                const windShift = Math.floor(this.settings.wind / 25);
                let targetX = x + windShift;
                targetX = Math.max(0, Math.min(this.bufferWidth - 1, targetX));
                
                const targetIndex = y * this.bufferWidth + targetX;
                this.fireBuffer[targetIndex] = Math.max(0, newValue);
            }
        }
    }
    
    render() {
        // Draw background first
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            window.Chatooly.backgroundManager.drawToCanvas(this.ctx, this.width, this.height);
        } else {
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
        
        // Get current palette
        const palette = this.palettes[this.settings.colorPalette];
        
        // Draw fire buffer as 8-bit pixels
        for (let y = 0; y < this.bufferHeight; y++) {
            for (let x = 0; x < this.bufferWidth; x++) {
                const index = y * this.bufferWidth + x;
                const value = Math.floor(this.fireBuffer[index]);
                
                if (value > 0) {
                    const colorIndex = Math.min(255, Math.max(0, value));
                    const color = palette[colorIndex];
                    
                    // Add transparency for smoke effect
                    let alpha = 1.0;
                    if (this.settings.smoke && value < 80) {
                        alpha = value / 80;
                    }
                    
                    this.ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
                    this.ctx.fillRect(
                        x * this.pixelSize,
                        y * this.pixelSize,
                        this.pixelSize,
                        this.pixelSize
                    );
                }
            }
        }
        
        // Draw campfire logs at the bottom (only for campfire style)
        if (this.settings.fireStyle === 'campfire') {
            this.drawLogs();
        }
        
        // Draw ember particles on top
        this.drawEmbers(palette);
    }
    
    drawLogs() {
        const logs = this.createLogs();
        const logColor = 'rgba(80, 50, 20, 1)';
        const burntColor = 'rgba(40, 25, 10, 1)';
        const glowColor = 'rgba(255, 100, 0, 0.3)';
        
        this.ctx.strokeStyle = logColor;
        this.ctx.lineCap = 'round';
        
        // Draw each log with glow effect
        for (const [key, log] of Object.entries(logs)) {
            // Glow effect
            this.ctx.strokeStyle = glowColor;
            this.ctx.lineWidth = (log.thickness + 2) * this.pixelSize;
            this.ctx.beginPath();
            this.ctx.moveTo(log.x1 * this.pixelSize, log.y1 * this.pixelSize);
            this.ctx.lineTo(log.x2 * this.pixelSize, log.y2 * this.pixelSize);
            this.ctx.stroke();
            
            // Main log
            this.ctx.strokeStyle = logColor;
            this.ctx.lineWidth = log.thickness * this.pixelSize;
            this.ctx.beginPath();
            this.ctx.moveTo(log.x1 * this.pixelSize, log.y1 * this.pixelSize);
            this.ctx.lineTo(log.x2 * this.pixelSize, log.y2 * this.pixelSize);
            this.ctx.stroke();
            
            // Burnt edges
            this.ctx.strokeStyle = burntColor;
            this.ctx.lineWidth = (log.thickness * 0.6) * this.pixelSize;
            this.ctx.beginPath();
            this.ctx.moveTo(log.x1 * this.pixelSize, log.y1 * this.pixelSize);
            this.ctx.lineTo(log.x2 * this.pixelSize, log.y2 * this.pixelSize);
            this.ctx.stroke();
        }
    }
    
    drawEmbers(palette) {
        for (const ember of this.embers) {
            const colorIndex = Math.floor(ember.life);
            const color = palette[Math.min(255, colorIndex)];
            const alpha = ember.life / 255;
            
            this.ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
            this.ctx.fillRect(
                ember.x * this.pixelSize,
                ember.y * this.pixelSize,
                ember.size * this.pixelSize,
                ember.size * this.pixelSize
            );
            
            // Add glow to bright embers
            if (ember.life > 200) {
                this.ctx.fillStyle = `rgba(255, 255, 100, ${alpha * 0.5})`;
                this.ctx.fillRect(
                    (ember.x - 0.5) * this.pixelSize,
                    (ember.y - 0.5) * this.pixelSize,
                    (ember.size + 1) * this.pixelSize,
                    (ember.size + 1) * this.pixelSize
                );
            }
        }
    }
    
    animate(currentTime = 0) {
        if (this.isRunning) {
            this.animationFrame = requestAnimationFrame((time) => this.animate(time));
        }
        
        // Calculate time since last frame
        const deltaTime = currentTime - this.lastFrameTime;
        
        // Adjust frame interval based on animation speed setting
        const adjustedInterval = this.frameInterval / this.animationSpeed;
        
        // Only update fire simulation at target FPS (8 FPS default)
        if (deltaTime >= adjustedInterval) {
            this.lastFrameTime = currentTime - (deltaTime % adjustedInterval);
            
            this.updateFire();
            this.propagateFire();
        }
        
        // Always render (smooth rendering even if simulation is slower)
        this.render();
    }
    
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }
    
    stop() {
        this.isRunning = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}

// High-resolution export function
window.renderHighResolution = function(targetCanvas, scale) {
    if (!fireGenerator) return;
    
    const ctx = targetCanvas.getContext('2d');
    const scaledWidth = fireGenerator.width * scale;
    const scaledHeight = fireGenerator.height * scale;
    
    targetCanvas.width = scaledWidth;
    targetCanvas.height = scaledHeight;
    
    // Scale the context
    ctx.scale(scale, scale);
    
    // Draw background
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.drawToCanvas(ctx, fireGenerator.width, fireGenerator.height);
    } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, fireGenerator.width, fireGenerator.height);
    }
    
    // Get current palette
    const palette = fireGenerator.palettes[fireGenerator.settings.colorPalette];
    
    // Draw fire buffer at high resolution
    for (let y = 0; y < fireGenerator.bufferHeight; y++) {
        for (let x = 0; x < fireGenerator.bufferWidth; x++) {
            const index = y * fireGenerator.bufferWidth + x;
            const value = Math.floor(fireGenerator.fireBuffer[index]);
            
            if (value > 0) {
                const colorIndex = Math.min(255, Math.max(0, value));
                const color = palette[colorIndex];
                
                let alpha = 1.0;
                if (fireGenerator.settings.smoke && value < 80) {
                    alpha = value / 80;
                }
                
                ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
                ctx.fillRect(
                    x * fireGenerator.pixelSize,
                    y * fireGenerator.pixelSize,
                    fireGenerator.pixelSize,
                    fireGenerator.pixelSize
                );
            }
        }
    }
    
    // Draw campfire logs
    const logs = fireGenerator.createLogs();
    const logColor = 'rgba(80, 50, 20, 1)';
    const burntColor = 'rgba(40, 25, 10, 1)';
    const glowColor = 'rgba(255, 100, 0, 0.3)';
    
    ctx.lineCap = 'round';
    
    for (const [key, log] of Object.entries(logs)) {
        // Glow effect
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = (log.thickness + 2) * fireGenerator.pixelSize;
        ctx.beginPath();
        ctx.moveTo(log.x1 * fireGenerator.pixelSize, log.y1 * fireGenerator.pixelSize);
        ctx.lineTo(log.x2 * fireGenerator.pixelSize, log.y2 * fireGenerator.pixelSize);
        ctx.stroke();
        
        // Main log
        ctx.strokeStyle = logColor;
        ctx.lineWidth = log.thickness * fireGenerator.pixelSize;
        ctx.beginPath();
        ctx.moveTo(log.x1 * fireGenerator.pixelSize, log.y1 * fireGenerator.pixelSize);
        ctx.lineTo(log.x2 * fireGenerator.pixelSize, log.y2 * fireGenerator.pixelSize);
        ctx.stroke();
        
        // Burnt edges
        ctx.strokeStyle = burntColor;
        ctx.lineWidth = (log.thickness * 0.6) * fireGenerator.pixelSize;
        ctx.beginPath();
        ctx.moveTo(log.x1 * fireGenerator.pixelSize, log.y1 * fireGenerator.pixelSize);
        ctx.lineTo(log.x2 * fireGenerator.pixelSize, log.y2 * fireGenerator.pixelSize);
        ctx.stroke();
    }
    
    // Draw embers
    for (const ember of fireGenerator.embers) {
        const colorIndex = Math.floor(ember.life);
        const color = palette[Math.min(255, colorIndex)];
        const alpha = ember.life / 255;
        
        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
        ctx.fillRect(
            ember.x * fireGenerator.pixelSize,
            ember.y * fireGenerator.pixelSize,
            ember.size * fireGenerator.pixelSize,
            ember.size * fireGenerator.pixelSize
        );
        
        if (ember.life > 200) {
            ctx.fillStyle = `rgba(255, 255, 100, ${alpha * 0.5})`;
            ctx.fillRect(
                (ember.x - 0.5) * fireGenerator.pixelSize,
                (ember.y - 0.5) * fireGenerator.pixelSize,
                (ember.size + 1) * fireGenerator.pixelSize,
                (ember.size + 1) * fireGenerator.pixelSize
            );
        }
    }
    
    console.log(`High-res campfire export completed at ${scale}x resolution`);
};

// Initialize fire generator when DOM is ready
let fireGenerator;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        fireGenerator = new FireGenerator();
    });
} else {
    fireGenerator = new FireGenerator();
}
