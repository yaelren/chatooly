/**
 * Animated Presentation Backgrounds - Main Logic
 * Variety of animated backgrounds for presentations with dramatic, animated, and material styles
 */

class AnimatedBackgroundGenerator {
    constructor() {
        this.canvas = document.getElementById('chatooly-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.animationId = null;
        
        // Canvas resize tracking
        this.previousCanvasSize = { width: 0, height: 0 };
        
        // Configuration
        this.config = {
            style: 'gradient-flow',
            animationEnabled: true,
            animationSpeed: 1.0,
            animationIntensity: 1.0,
            colorScheme: 'ocean',
            primaryColor: '#0066ff',
            secondaryColor: '#ff0066',
            accentColor: '#00ffcc',
            complexity: 50,
            density: 50,
            blur: 0,
            opacity: 100
        };
        
        // Animation state
        this.time = 0;
        this.particles = [];
        this.waves = [];
        
        // Background state
        this.bgTransparent = false;
        this.bgColor = '#000000';
        
        this.init();
    }
    
    init() {
        this.setCanvasSize();
        this.setupEventListeners();
        this.setupBackgroundManager();
        this.generateInitialState();
        this.render();
    }
    
    setCanvasSize() {
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.width = '800px';
        this.canvas.style.height = '600px';
    }
    
    setupEventListeners() {
        // Canvas resize handling
        document.addEventListener('chatooly:canvas-resized', (e) => {
            this.onCanvasResized(e);
        });
        
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const currentWidth = this.canvas.offsetWidth;
                const currentHeight = this.canvas.offsetHeight;
                if (currentWidth !== this.previousCanvasSize.width || 
                    currentHeight !== this.previousCanvasSize.height) {
                    const fakeEvent = {
                        detail: { canvas: this.canvas }
                    };
                    this.onCanvasResized(fakeEvent);
                }
            }, 300);
        });
        
        // Style selection
        document.getElementById('background-style').addEventListener('change', (e) => {
            this.config.style = e.target.value;
            this.generateInitialState();
        });
        
        // Animation controls
        document.getElementById('animation-enabled').addEventListener('click', (e) => {
            const button = e.target.closest('.chatooly-toggle') || e.target;
            const isPressed = button.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            button.setAttribute('aria-pressed', newState);
            this.config.animationEnabled = newState;
        });
        
        document.getElementById('animation-speed').addEventListener('input', (e) => {
            this.config.animationSpeed = parseFloat(e.target.value);
            document.getElementById('animation-speed-value').textContent = e.target.value;
        });
        
        document.getElementById('animation-intensity').addEventListener('input', (e) => {
            this.config.animationIntensity = parseFloat(e.target.value);
            document.getElementById('animation-intensity-value').textContent = e.target.value;
        });
        
        // Color controls
        document.getElementById('color-scheme').addEventListener('change', (e) => {
            this.config.colorScheme = e.target.value;
            this.updateColorScheme();
        });
        
        document.getElementById('primary-color').addEventListener('input', (e) => {
            this.config.primaryColor = e.target.value;
        });
        
        document.getElementById('secondary-color').addEventListener('input', (e) => {
            this.config.secondaryColor = e.target.value;
        });
        
        document.getElementById('accent-color').addEventListener('input', (e) => {
            this.config.accentColor = e.target.value;
        });
        
        // Parameter controls
        document.getElementById('complexity').addEventListener('input', (e) => {
            this.config.complexity = parseInt(e.target.value);
            document.getElementById('complexity-value').textContent = e.target.value;
            this.generateInitialState();
        });
        
        document.getElementById('density').addEventListener('input', (e) => {
            this.config.density = parseInt(e.target.value);
            document.getElementById('density-value').textContent = e.target.value;
            this.generateInitialState();
        });
        
        document.getElementById('blur').addEventListener('input', (e) => {
            this.config.blur = parseInt(e.target.value);
            document.getElementById('blur-value').textContent = e.target.value;
        });
        
        document.getElementById('opacity').addEventListener('input', (e) => {
            this.config.opacity = parseInt(e.target.value);
            document.getElementById('opacity-value').textContent = e.target.value;
        });
    }
    
    setupBackgroundManager() {
        if (!window.Chatooly || !window.Chatooly.backgroundManager) {
            setTimeout(() => this.setupBackgroundManager(), 100);
            return;
        }
        
        Chatooly.backgroundManager.init(this.canvas);
        
        document.getElementById('transparent-bg').addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            e.target.setAttribute('aria-pressed', newState);
            this.bgTransparent = newState;
            Chatooly.backgroundManager.setTransparent(newState);
            document.getElementById('bg-color-group').style.display = newState ? 'none' : 'block';
        });
        
        document.getElementById('bg-color').addEventListener('input', (e) => {
            this.bgColor = e.target.value;
            Chatooly.backgroundManager.setBackgroundColor(e.target.value);
        });
    }
    
    updateColorScheme() {
        const schemes = {
            ocean: { primary: '#0066ff', secondary: '#00ccff', accent: '#00ffcc' },
            sunset: { primary: '#ff6600', secondary: '#ff0066', accent: '#ffcc00' },
            forest: { primary: '#00cc66', secondary: '#66ff00', accent: '#ccff00' },
            neon: { primary: '#ff00ff', secondary: '#00ffff', accent: '#ffff00' },
            royal: { primary: '#6600ff', secondary: '#ff0066', accent: '#00ffcc' },
            fire: { primary: '#ff3300', secondary: '#ff9900', accent: '#ffff00' },
            ice: { primary: '#0099ff', secondary: '#00ccff', accent: '#ffffff' },
            custom: { primary: this.config.primaryColor, secondary: this.config.secondaryColor, accent: this.config.accentColor }
        };
        
        const scheme = schemes[this.config.colorScheme] || schemes.ocean;
        this.config.primaryColor = scheme.primary;
        this.config.secondaryColor = scheme.secondary;
        this.config.accentColor = scheme.accent;
        
        document.getElementById('primary-color').value = scheme.primary;
        document.getElementById('secondary-color').value = scheme.secondary;
        document.getElementById('accent-color').value = scheme.accent;
    }
    
    generateInitialState() {
        this.particles = [];
        this.waves = [];
        
        const density = Math.floor((this.config.density / 100) * 200);
        const complexity = this.config.complexity / 100;
        
        switch (this.config.style) {
            case 'particle-storm':
                for (let i = 0; i < density; i++) {
                    this.particles.push(this.createParticle());
                }
                break;
            case 'matrix-rain':
                const spacing = 20;
                for (let i = 0; i < density; i++) {
                    const particle = this.createParticle();
                    particle.x = Math.floor(Math.random() * (this.canvas.width / spacing)) * spacing;
                    particle.y = Math.random() * this.canvas.height - this.canvas.height;
                    this.particles.push(particle);
                }
                break;
            case 'geometric-waves':
            case 'wave-interference':
                for (let i = 0; i < Math.floor(complexity * 10); i++) {
                    this.waves.push(this.createWave());
                }
                break;
        }
    }
    
    createParticle() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: Math.random() * 3 + 1,
            life: Math.random(),
            maxLife: 1,
            char: String.fromCharCode(0x30A0 + Math.random() * 96)
        };
    }
    
    createWave() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            amplitude: Math.random() * 50 + 20,
            frequency: Math.random() * 0.02 + 0.01,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.5 + 0.2
        };
    }
    
    onCanvasResized(e) {
        const canvas = e.detail.canvas || this.canvas;
        const newWidth = canvas.offsetWidth || canvas.width;
        const newHeight = canvas.offsetHeight || canvas.height;
        
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        this.previousCanvasSize = { width: newWidth, height: newHeight };
        
        this.generateInitialState();
    }
    
    render() {
        if (this.config.animationEnabled) {
            this.time += 0.016 * this.config.animationSpeed;
        }
        
        // Clear canvas
        if (this.bgTransparent) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.fillStyle = this.bgColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Apply blur if needed
        if (this.config.blur > 0) {
            this.ctx.filter = `blur(${this.config.blur}px)`;
        } else {
            this.ctx.filter = 'none';
        }
        
        // Set global alpha
        this.ctx.globalAlpha = this.config.opacity / 100;
        
        // Render based on style
        switch (this.config.style) {
            case 'gradient-flow':
                this.renderGradientFlow();
                break;
            case 'particle-storm':
                this.renderParticleStorm();
                break;
            case 'geometric-waves':
                this.renderGeometricWaves();
                break;
            case 'liquid-morph':
                this.renderLiquidMorph();
                break;
            case 'glass-morphism':
                this.renderGlassMorphism();
                break;
            case 'neon-grid':
                this.renderNeonGrid();
                break;
            case 'cosmic-swirl':
                this.renderCosmicSwirl();
                break;
            case 'material-blob':
                this.renderMaterialBlob();
                break;
            case 'wave-interference':
                this.renderWaveInterference();
                break;
            case 'geometric-tunnel':
                this.renderGeometricTunnel();
                break;
            case 'aurora-borealis':
                this.renderAuroraBorealis();
                break;
            case 'matrix-rain':
                this.renderMatrixRain();
                break;
        }
        
        this.ctx.globalAlpha = 1.0;
        this.ctx.filter = 'none';
        
        this.animationId = requestAnimationFrame(() => this.render());
    }
    
    // Gradient Flow - Flowing gradients with animated circles
    renderGradientFlow() {
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        const t = (Math.sin(this.time) + 1) / 2;
        
        gradient.addColorStop(0, this.config.primaryColor);
        gradient.addColorStop(0.5, this.config.secondaryColor);
        gradient.addColorStop(1, this.config.accentColor);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add flowing circles
        for (let i = 0; i < 5; i++) {
            const x = (this.canvas.width / 2) + Math.cos(this.time + i) * (this.canvas.width * 0.3);
            const y = (this.canvas.height / 2) + Math.sin(this.time * 0.7 + i) * (this.canvas.height * 0.3);
            const radius = 100 + Math.sin(this.time * 2 + i) * 50;
            
            const radialGradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
            radialGradient.addColorStop(0, this.config.accentColor);
            radialGradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = radialGradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    // Particle Storm - Moving particles with trails
    renderParticleStorm() {
        const intensity = this.config.animationIntensity;
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            p.x += p.vx * intensity;
            p.y += p.vy * intensity;
            p.life -= 0.01;
            
            // Wrap around
            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;
            
            // Reset if dead
            if (p.life <= 0) {
                Object.assign(p, this.createParticle());
            }
            
            // Draw particle
            const alpha = p.life;
            this.ctx.fillStyle = this.config.primaryColor;
            this.ctx.globalAlpha = alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw trail
            const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
            gradient.addColorStop(0, this.config.accentColor);
            gradient.addColorStop(1, 'transparent');
            this.ctx.fillStyle = gradient;
            this.ctx.globalAlpha = alpha * 0.3;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    // Geometric Waves - Animated geometric wave patterns
    renderGeometricWaves() {
        const numWaves = Math.floor((this.config.complexity / 100) * 8) + 2;
        
        for (let i = 0; i < numWaves; i++) {
            const y = (this.canvas.height / (numWaves + 1)) * (i + 1);
            const amplitude = 30 + Math.sin(this.time + i) * 20;
            const frequency = 0.01 + (i * 0.005);
            
            this.ctx.strokeStyle = i % 2 === 0 ? this.config.primaryColor : this.config.secondaryColor;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            
            for (let x = 0; x < this.canvas.width; x += 2) {
                const waveY = y + Math.sin(x * frequency + this.time * this.config.animationIntensity) * amplitude;
                if (x === 0) {
                    this.ctx.moveTo(x, waveY);
                } else {
                    this.ctx.lineTo(x, waveY);
                }
            }
            
            this.ctx.stroke();
        }
    }
    
    // Liquid Morph - Morphing liquid blobs
    renderLiquidMorph() {
        const numBlobs = 3;
        const intensity = this.config.animationIntensity;
        
        for (let i = 0; i < numBlobs; i++) {
            const centerX = this.canvas.width / 2 + Math.cos(this.time + i * 2) * (this.canvas.width * 0.2);
            const centerY = this.canvas.height / 2 + Math.sin(this.time * 0.7 + i * 2) * (this.canvas.height * 0.2);
            const radius = 150 + Math.sin(this.time * 2 + i) * 50;
            
            const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            const colors = [this.config.primaryColor, this.config.secondaryColor, this.config.accentColor];
            gradient.addColorStop(0, colors[i % colors.length]);
            gradient.addColorStop(0.7, colors[(i + 1) % colors.length]);
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    // Glass Morphism - Glass morphism panels
    renderGlassMorphism() {
        // Base gradient
        const baseGradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        baseGradient.addColorStop(0, this.config.primaryColor);
        baseGradient.addColorStop(1, this.config.secondaryColor);
        this.ctx.fillStyle = baseGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Glass panels
        const numPanels = 4;
        for (let i = 0; i < numPanels; i++) {
            const x = (this.canvas.width / numPanels) * i + Math.sin(this.time + i) * 20;
            const y = (this.canvas.height / numPanels) * i + Math.cos(this.time + i) * 20;
            const w = this.canvas.width / 3;
            const h = this.canvas.height / 3;
            
            // Glass effect
            this.ctx.fillStyle = `rgba(255, 255, 255, 0.1)`;
            this.ctx.fillRect(x, y, w, h);
            
            // Border
            this.ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, y, w, h);
        }
    }
    
    // Neon Grid - Glowing neon grid
    renderNeonGrid() {
        const spacing = 30 + (this.config.complexity / 100) * 50;
        const intensity = this.config.animationIntensity;
        
        this.ctx.strokeStyle = this.config.primaryColor;
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = this.config.primaryColor;
        
        // Vertical lines
        for (let x = 0; x < this.canvas.width; x += spacing) {
            const offset = Math.sin(this.time + x * 0.01) * 10 * intensity;
            this.ctx.beginPath();
            this.ctx.moveTo(x + offset, 0);
            this.ctx.lineTo(x + offset, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y < this.canvas.height; y += spacing) {
            const offset = Math.cos(this.time + y * 0.01) * 10 * intensity;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y + offset);
            this.ctx.lineTo(this.canvas.width, y + offset);
            this.ctx.stroke();
        }
        
        this.ctx.shadowBlur = 0;
    }
    
    // Cosmic Swirl - Colorful cosmic spiral
    renderCosmicSwirl() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const maxRadius = Math.max(this.canvas.width, this.canvas.height) * 0.6;
        
        for (let i = 0; i < 200; i++) {
            const angle = (i / 200) * Math.PI * 4 + this.time * this.config.animationIntensity;
            const radius = (i / 200) * maxRadius;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            const hue = (angle * 180 / Math.PI + this.time * 50) % 360;
            const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, 5);
            gradient.addColorStop(0, this.config.primaryColor);
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    // Material Blob - Material blob with highlight
    renderMaterialBlob() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(this.canvas.width, this.canvas.height) * 0.4;
        const intensity = this.config.animationIntensity;
        
        this.ctx.beginPath();
        const numPoints = 20;
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const r = radius + Math.sin(angle * 3 + this.time * intensity) * 30;
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, this.config.primaryColor);
        gradient.addColorStop(0.7, this.config.secondaryColor);
        gradient.addColorStop(1, this.config.accentColor);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.4, radius * 0.2, -0.5, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    // Wave Interference - Circular wave interference patterns
    renderWaveInterference() {
        const numWaves = Math.floor((this.config.complexity / 100) * 5) + 2;
        
        for (let i = 0; i < numWaves; i++) {
            const centerX = (this.canvas.width / (numWaves + 1)) * (i + 1);
            const centerY = this.canvas.height / 2;
            const maxRadius = Math.max(this.canvas.width, this.canvas.height);
            
            for (let r = 0; r < maxRadius; r += 10) {
                const wave = Math.sin((r * 0.1) - (this.time * this.config.animationIntensity * 2) + i);
                const alpha = Math.max(0, 1 - (r / maxRadius)) * Math.abs(wave) * 0.5;
                
                this.ctx.strokeStyle = this.config.primaryColor;
                this.ctx.globalAlpha = alpha;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
    }
    
    // Geometric Tunnel - 3D geometric tunnel effect
    renderGeometricTunnel() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const maxRadius = Math.max(this.canvas.width, this.canvas.height) * 0.7;
        const numRings = 30;
        const intensity = this.config.animationIntensity;
        
        for (let i = 0; i < numRings; i++) {
            const t = i / numRings;
            const radius = t * maxRadius;
            const z = 1 - t;
            const size = radius * z;
            const rotation = this.time * intensity + t * Math.PI * 2;
            const sides = 6 + Math.floor(t * 4);
            
            this.ctx.strokeStyle = this.config.primaryColor;
            this.ctx.globalAlpha = z;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            for (let j = 0; j < sides; j++) {
                const angle = (j / sides) * Math.PI * 2 + rotation;
                const x = centerX + Math.cos(angle) * size;
                const y = centerY + Math.sin(angle) * size;
                
                if (j === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }
    
    // Aurora Borealis - Aurora borealis effect
    renderAuroraBorealis() {
        const numLayers = 5;
        const intensity = this.config.animationIntensity;
        
        for (let layer = 0; layer < numLayers; layer++) {
            const y = (this.canvas.height / numLayers) * layer;
            const amplitude = 50 + layer * 10;
            const frequency = 0.005 + layer * 0.002;
            
            const gradient = this.ctx.createLinearGradient(0, y - amplitude, 0, y + amplitude);
            const colors = [this.config.primaryColor, this.config.secondaryColor, this.config.accentColor];
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.5, colors[layer % colors.length] + '80');
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            
            for (let x = 0; x < this.canvas.width; x += 2) {
                const waveY = y + Math.sin(x * frequency + this.time * intensity + layer) * amplitude;
                this.ctx.lineTo(x, waveY);
            }
            
            this.ctx.lineTo(this.canvas.width, this.canvas.height);
            this.ctx.lineTo(0, this.canvas.height);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }
    
    // Matrix Rain - Matrix rain effect
    renderMatrixRain() {
        const spacing = 20;
        const intensity = this.config.animationIntensity;
        
        this.ctx.fillStyle = this.config.primaryColor;
        this.ctx.font = '14px monospace';
        
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            p.y += 2 * intensity;
            if (p.y > this.canvas.height) {
                p.y = -Math.random() * 100;
                p.x = Math.floor(Math.random() * (this.canvas.width / spacing)) * spacing;
                p.char = String.fromCharCode(0x30A0 + Math.random() * 96);
            }
            
            const alpha = Math.max(0.2, 1 - (p.y / this.canvas.height));
            
            this.ctx.globalAlpha = alpha;
            this.ctx.fillText(p.char, p.x, p.y);
        }
    }
    
    // High-resolution export function
    renderHighResolution(targetCanvas, scale) {
        if (!this.canvas || !this.ctx) {
            console.warn('Animated Background Generator not ready for high-res export');
            return;
        }
        
        const originalWidth = this.canvas.width;
        const originalHeight = this.canvas.height;
        const exportWidth = originalWidth * scale;
        const exportHeight = originalHeight * scale;
        
        targetCanvas.width = exportWidth;
        targetCanvas.height = exportHeight;
        const exportCtx = targetCanvas.getContext('2d');
        
        // Save current state
        const savedTime = this.time;
        const savedConfig = { ...this.config };
        
        // Temporarily disable animation for static export
        this.config.animationEnabled = false;
        
        // Render at high resolution
        exportCtx.scale(scale, scale);
        
        // Clear
        if (this.bgTransparent) {
            exportCtx.clearRect(0, 0, originalWidth, originalHeight);
        } else {
            exportCtx.fillStyle = this.bgColor;
            exportCtx.fillRect(0, 0, originalWidth, originalHeight);
        }
        
        // Apply settings
        if (this.config.blur > 0) {
            exportCtx.filter = `blur(${this.config.blur}px)`;
        }
        exportCtx.globalAlpha = this.config.opacity / 100;
        
        // Render based on style (using saved context)
        const originalCtx = this.ctx;
        this.ctx = exportCtx;
        
        switch (this.config.style) {
            case 'gradient-flow':
                this.renderGradientFlow();
                break;
            case 'particle-storm':
                this.renderParticleStorm();
                break;
            case 'geometric-waves':
                this.renderGeometricWaves();
                break;
            case 'liquid-morph':
                this.renderLiquidMorph();
                break;
            case 'glass-morphism':
                this.renderGlassMorphism();
                break;
            case 'neon-grid':
                this.renderNeonGrid();
                break;
            case 'cosmic-swirl':
                this.renderCosmicSwirl();
                break;
            case 'material-blob':
                this.renderMaterialBlob();
                break;
            case 'wave-interference':
                this.renderWaveInterference();
                break;
            case 'geometric-tunnel':
                this.renderGeometricTunnel();
                break;
            case 'aurora-borealis':
                this.renderAuroraBorealis();
                break;
            case 'matrix-rain':
                this.renderMatrixRain();
                break;
        }
        
        // Restore
        this.ctx = originalCtx;
        this.config = savedConfig;
        this.time = savedTime;
        
        exportCtx.globalAlpha = 1.0;
        exportCtx.filter = 'none';
        
        console.log(`High-res Animated Background export completed at ${scale}x resolution`);
    }
}

// Global export function required by Chatooly CDN
window.renderHighResolution = function(targetCanvas, scale) {
    if (window.animatedBackground && window.animatedBackground.renderHighResolution) {
        window.animatedBackground.renderHighResolution(targetCanvas, scale);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.animatedBackground = new AnimatedBackgroundGenerator();
});
