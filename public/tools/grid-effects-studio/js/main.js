/**
 * Grid Effects Studio - 2D Only
 * Creates creative 2D grids with advanced effects, behaviors, and interactivity
 */

class GridEffectsStudio {
    constructor() {
        this.canvas = document.getElementById('chatooly-canvas');
        this.isInitialized = false;
        
        // Canvas resize tracking
        this.previousCanvasSize = { width: 0, height: 0 };
        
        // 2D Canvas context
        this.ctx2d = null;
        
        // Configuration
        this.config = {
            gridType: 'rectangular',
            gridSpacing: 40,
            gridSize: 20,
            elementSize: 2.0,
            density: 1.0,
            animationEnabled: true,
            movementType: 'wave',
            animationSpeed: 0.5,
            movementIntensity: 0.5,
            colorScheme: 'single',
            pointColor: '#00ffff',
            secondaryColor: '#ff00ff',
            effectType: 'none',
            effectIntensity: 1.0,
            glowRadius: 10,
            showConnections: false,
            connectionDistance: 50,
            connectionWidth: 1,
            connectionOpacity: 0.3,
            mouseInteraction: true,
            interactionRadius: 100,
            interactionStrength: 1.0
        };
        
        // Grid data
        this.gridPoints = [];
        this.gridData = [];
        this.particleTrails = [];
        
        // Hover and interaction state
        this.hoveredPointIndex = -1;
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Ripple effects
        this.ripples = [];
        
        // Animation state
        this.time = 0;
        this.animationId = null;
        
        // Background state
        this.bgTransparent = false;
        this.bgColor = '#000000';
        
        this.init();
    }
    
    init() {
        this.setCanvasSize();
        this.init2DCanvas();
        this.setupEventListeners();
        this.setupBackgroundManager();
        this.generateGrid();
        this.animate();
        this.isInitialized = true;
    }
    
    setCanvasSize() {
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.width = '800px';
        this.canvas.style.height = '600px';
    }
    
    init2DCanvas() {
        this.ctx2d = this.canvas.getContext('2d');
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
        
        // Grid type
        document.getElementById('grid-type').addEventListener('change', (e) => {
            this.config.gridType = e.target.value;
            this.generateGrid();
        });
        
        // Grid settings
        document.getElementById('grid-spacing').addEventListener('input', (e) => {
            this.config.gridSpacing = parseFloat(e.target.value);
            document.getElementById('grid-spacing-value').textContent = e.target.value;
            this.generateGrid();
        });
        
        document.getElementById('grid-size').addEventListener('input', (e) => {
            this.config.gridSize = parseInt(e.target.value);
            document.getElementById('grid-size-value').textContent = e.target.value;
            this.generateGrid();
        });
        
        document.getElementById('element-size').addEventListener('input', (e) => {
            this.config.elementSize = parseFloat(e.target.value);
            document.getElementById('element-size-value').textContent = e.target.value;
        });
        
        document.getElementById('density').addEventListener('input', (e) => {
            this.config.density = parseFloat(e.target.value);
            document.getElementById('density-value').textContent = e.target.value;
            this.generateGrid();
        });
        
        // Movement controls
        document.getElementById('animation-enabled').addEventListener('click', (e) => {
            const button = e.target.closest('.chatooly-toggle') || e.target;
            const isPressed = button.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            button.setAttribute('aria-pressed', newState);
            this.config.animationEnabled = newState;
        });
        
        document.getElementById('movement-type').addEventListener('change', (e) => {
            this.config.movementType = e.target.value;
        });
        
        document.getElementById('animation-speed').addEventListener('input', (e) => {
            this.config.animationSpeed = parseFloat(e.target.value);
            document.getElementById('animation-speed-value').textContent = e.target.value;
        });
        
        document.getElementById('movement-intensity').addEventListener('input', (e) => {
            this.config.movementIntensity = parseFloat(e.target.value);
            document.getElementById('movement-intensity-value').textContent = e.target.value;
        });
        
        // Color controls
        document.getElementById('color-scheme').addEventListener('change', (e) => {
            this.config.colorScheme = e.target.value;
        });
        
        document.getElementById('point-color').addEventListener('input', (e) => {
            this.config.pointColor = e.target.value;
        });
        
        document.getElementById('secondary-color').addEventListener('input', (e) => {
            this.config.secondaryColor = e.target.value;
        });
        
        // Effects
        document.getElementById('effect-type').addEventListener('change', (e) => {
            this.config.effectType = e.target.value;
            const glowGroup = document.getElementById('glow-radius-group');
            glowGroup.style.display = (e.target.value === 'glow' || e.target.value === 'bloom') ? 'block' : 'none';
        });
        
        document.getElementById('effect-intensity').addEventListener('input', (e) => {
            this.config.effectIntensity = parseFloat(e.target.value);
            document.getElementById('effect-intensity-value').textContent = e.target.value;
        });
        
        document.getElementById('glow-radius').addEventListener('input', (e) => {
            this.config.glowRadius = parseFloat(e.target.value);
            document.getElementById('glow-radius-value').textContent = e.target.value;
        });
        
        // Connections
        document.getElementById('show-connections').addEventListener('click', (e) => {
            const button = e.target.closest('.chatooly-toggle') || e.target;
            const isPressed = button.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            button.setAttribute('aria-pressed', newState);
            this.config.showConnections = newState;
        });
        
        document.getElementById('connection-distance').addEventListener('input', (e) => {
            this.config.connectionDistance = parseFloat(e.target.value);
            document.getElementById('connection-distance-value').textContent = e.target.value;
        });
        
        document.getElementById('connection-width').addEventListener('input', (e) => {
            this.config.connectionWidth = parseFloat(e.target.value);
            document.getElementById('connection-width-value').textContent = e.target.value;
        });
        
        document.getElementById('connection-opacity').addEventListener('input', (e) => {
            this.config.connectionOpacity = parseFloat(e.target.value);
            document.getElementById('connection-opacity-value').textContent = e.target.value;
        });
        
        // Interactivity
        document.getElementById('mouse-interaction').addEventListener('click', (e) => {
            const button = e.target.closest('.chatooly-toggle') || e.target;
            const isPressed = button.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            button.setAttribute('aria-pressed', newState);
            this.config.mouseInteraction = newState;
        });
        
        document.getElementById('interaction-radius').addEventListener('input', (e) => {
            this.config.interactionRadius = parseFloat(e.target.value);
            document.getElementById('interaction-radius-value').textContent = e.target.value;
        });
        
        document.getElementById('interaction-strength').addEventListener('input', (e) => {
            this.config.interactionStrength = parseFloat(e.target.value);
            document.getElementById('interaction-strength-value').textContent = e.target.value;
        });
        
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
            this.createRipple(e);
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredPointIndex = -1;
            this.mouseDown = false;
        });
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
        
        // Convert to canvas coordinates
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const canvasX = this.mouseX * scaleX;
        const canvasY = this.mouseY * scaleY;
        
        // Find closest point
        let minDist = Infinity;
        let closestIndex = -1;
        const hoverRadius = this.config.elementSize * 3;
        
        this.gridData.forEach((point, index) => {
            let x = point.x;
            let y = point.y;
            
            if (this.config.animationEnabled && this.config.movementType !== 'none') {
                const moved = this.apply2DMovement(point, index);
                x = moved.x;
                y = moved.y;
            }
            
            const dist = Math.sqrt(Math.pow(canvasX - x, 2) + Math.pow(canvasY - y, 2));
            if (dist < hoverRadius && dist < minDist) {
                minDist = dist;
                closestIndex = index;
            }
        });
        
        this.hoveredPointIndex = closestIndex;
        
        // Store last mouse position for velocity calculation
        this.lastMouseX = canvasX;
        this.lastMouseY = canvasY;
    }
    
    createRipple(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        this.ripples.push({
            x: x,
            y: y,
            radius: 0,
            maxRadius: 200,
            life: 1.0,
            speed: 3
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
    
    generateGrid() {
        // Clear existing grid
        this.gridPoints = [];
        this.gridData = [];
        this.particleTrails = [];
        
        // Generate grid points based on type
        switch (this.config.gridType) {
            case 'rectangular':
                this.generateRectangularGrid();
                break;
            case 'hexagonal':
                this.generateHexagonalGrid();
                break;
            case 'triangular':
                this.generateTriangularGrid();
                break;
            case 'circular':
                this.generateCircularGrid();
                break;
            case 'spiral':
                this.generateSpiralGrid();
                break;
            case 'organic':
                this.generateOrganicGrid();
                break;
            case 'voronoi':
                this.generateVoronoiGrid();
                break;
            case 'wave':
                this.generateWaveGrid();
                break;
        }
        
        // Convert to 2D grid data
        this.create2DGrid();
    }
    
    generateRectangularGrid() {
        const spacing = this.config.gridSpacing;
        // Cover entire canvas
        const halfWidth = this.canvas.width / 2;
        const halfHeight = this.canvas.height / 2;
        
        // Generate grid that covers the entire canvas
        for (let x = -halfWidth; x <= halfWidth; x += spacing) {
            for (let y = -halfHeight; y <= halfHeight; y += spacing) {
                if (Math.random() < this.config.density) {
                    this.gridPoints.push({
                        x, y, z: 0,
                        originalX: x, originalY: y, originalZ: 0,
                        vx: 0, vy: 0 // velocity for physics
                    });
                }
            }
        }
    }
    
    generateHexagonalGrid() {
        const size = this.config.gridSize;
        const spacing = this.config.gridSpacing;
        const halfSize = (size * spacing) / 2;
        
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const x = (col * spacing * 1.5) - halfSize;
                const y = (row * spacing * Math.sqrt(3)) - halfSize;
                const offsetX = row % 2 === 0 ? 0 : spacing * 0.75;
                
                if (Math.random() < this.config.density) {
                    this.gridPoints.push({
                        x: x + offsetX, y, z: 0,
                        originalX: x + offsetX, originalY: y, originalZ: 0,
                        vx: 0, vy: 0
                    });
                }
            }
        }
    }
    
    generateTriangularGrid() {
        const size = this.config.gridSize;
        const spacing = this.config.gridSpacing;
        const halfSize = (size * spacing) / 2;
        
        for (let row = 0; row < size; row++) {
            for (let col = 0; col <= row; col++) {
                const x = (col * spacing) - (row * spacing * 0.5) - halfSize;
                const y = (row * spacing * Math.sqrt(3) * 0.5) - halfSize;
                
                if (Math.random() < this.config.density) {
                    this.gridPoints.push({
                        x, y, z: 0,
                        originalX: x, originalY: y, originalZ: 0,
                        vx: 0, vy: 0
                    });
                }
            }
        }
    }
    
    generateCircularGrid() {
        const size = this.config.gridSize;
        const spacing = this.config.gridSpacing;
        const maxRadius = (size * spacing) / 2;
        
        // Add center point for symmetry
        if (Math.random() < this.config.density) {
            this.gridPoints.push({
                x: 0, y: 0, z: 0,
                originalX: 0, originalY: 0, originalZ: 0,
                vx: 0, vy: 0
            });
        }
        
        // Generate concentric circles
        for (let r = spacing; r <= maxRadius; r += spacing) {
            const circumference = 2 * Math.PI * r;
            const numPoints = Math.max(6, Math.floor(circumference / spacing));
            
            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                
                if (Math.random() < this.config.density) {
                    this.gridPoints.push({
                        x, y, z: 0,
                        originalX: x, originalY: y, originalZ: 0,
                        vx: 0, vy: 0
                    });
                }
            }
        }
    }
    
    generateSpiralGrid() {
        const size = this.config.gridSize;
        const spacing = this.config.gridSpacing;
        const maxRadius = (size * spacing) / 2;
        const turns = 5;
        
        for (let t = 0; t < turns * Math.PI * 2; t += 0.1) {
            const r = (t / (turns * Math.PI * 2)) * maxRadius;
            const x = Math.cos(t) * r;
            const y = Math.sin(t) * r;
            
            if (Math.random() < this.config.density * 0.5) {
                this.gridPoints.push({
                    x, y, z: 0,
                    originalX: x, originalY: y, originalZ: 0,
                    vx: 0, vy: 0
                });
            }
        }
    }
    
    generateOrganicGrid() {
        const size = this.config.gridSize;
        const spacing = this.config.gridSpacing;
        const halfSize = (size * spacing) / 2;
        
        for (let i = 0; i < size * size * this.config.density; i++) {
            const x = (Math.random() - 0.5) * size * spacing;
            const y = (Math.random() - 0.5) * size * spacing;
            
            // Add noise-based offset
            const noiseX = (Math.sin(x * 0.1) + Math.cos(y * 0.1)) * spacing * 0.3;
            const noiseY = (Math.sin(y * 0.1) + Math.cos(x * 0.1)) * spacing * 0.3;
            
            this.gridPoints.push({
                x: x + noiseX,
                y: y + noiseY,
                z: 0,
                originalX: x, originalY: y, originalZ: 0,
                vx: 0, vy: 0
            });
        }
    }
    
    generateVoronoiGrid() {
        const size = this.config.gridSize;
        const spacing = this.config.gridSpacing;
        const halfSize = (size * spacing) / 2;
        const seeds = [];
        
        // Generate seed points
        for (let i = 0; i < size * 2; i++) {
            seeds.push({
                x: (Math.random() - 0.5) * size * spacing,
                y: (Math.random() - 0.5) * size * spacing
            });
        }
        
        // Create grid points closest to seeds
        for (let x = -halfSize; x <= halfSize; x += spacing * 0.5) {
            for (let y = -halfSize; y <= halfSize; y += spacing * 0.5) {
                let minDist = Infinity;
                for (const seed of seeds) {
                    const dist = Math.sqrt(
                        Math.pow(x - seed.x, 2) +
                        Math.pow(y - seed.y, 2)
                    );
                    if (dist < minDist) minDist = dist;
                }
                
                if (minDist < spacing && Math.random() < this.config.density * 0.3) {
                    this.gridPoints.push({
                        x, y, z: 0,
                        originalX: x, originalY: y, originalZ: 0,
                        vx: 0, vy: 0
                    });
                }
            }
        }
    }
    
    generateWaveGrid() {
        const size = this.config.gridSize;
        const spacing = this.config.gridSpacing;
        const halfSize = (size * spacing) / 2;
        
        for (let x = -halfSize; x <= halfSize; x += spacing) {
            for (let y = -halfSize; y <= halfSize; y += spacing) {
                if (Math.random() < this.config.density) {
                    this.gridPoints.push({
                        x, y, z: 0,
                        originalX: x, originalY: y, originalZ: 0,
                        vx: 0, vy: 0
                    });
                }
            }
        }
    }
    
    create2DGrid() {
        // Store grid data for 2D rendering
        this.gridData = this.gridPoints.map(p => ({
            x: p.x + this.canvas.width / 2,
            y: p.y + this.canvas.height / 2,
            z: p.z,
            originalX: p.originalX,
            originalY: p.originalY,
            originalZ: p.originalZ,
            vx: p.vx,
            vy: p.vy,
            trail: [] // For trail effect
        }));
    }
    
    onCanvasResized(e) {
        const canvas = e.detail.canvas || this.canvas;
        const newWidth = canvas.offsetWidth || canvas.width;
        const newHeight = canvas.offsetHeight || canvas.height;
        
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        this.previousCanvasSize = { width: newWidth, height: newHeight };
        
        // Re-initialize 2D context
        this.ctx2d = this.canvas.getContext('2d');
        // Regenerate grid data with new canvas dimensions
        this.generateGrid();
    }
    
    animate() {
        const animateLoop = () => {
            this.animationId = requestAnimationFrame(animateLoop);
            
            if (this.config.animationEnabled) {
                this.time += 0.016 * this.config.animationSpeed;
            }
            
            this.animate2D();
        };
        
        animateLoop();
    }
    
    animate2D() {
        if (!this.ctx2d) return;
        
        // Clear canvas with fade effect for trails
        if (this.config.effectType === 'trails') {
            this.ctx2d.fillStyle = this.bgTransparent ? 'rgba(0, 0, 0, 0.1)' : this.bgColor + '33';
            this.ctx2d.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx2d.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw background
            if (!this.bgTransparent) {
                this.ctx2d.fillStyle = this.bgColor;
                this.ctx2d.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
        
        // Update ripples
        this.updateRipples();
        
        // Draw connections first (behind points)
        if (this.config.showConnections) {
            this.drawConnections();
        }
        
        // Draw grid points
        this.drawGridPoints();
        
        // Draw ripples
        this.drawRipples();
    }
    
    updateRipples() {
        this.ripples = this.ripples.filter(ripple => {
            ripple.radius += ripple.speed;
            ripple.life -= 0.02;
            return ripple.life > 0 && ripple.radius < ripple.maxRadius;
        });
    }
    
    drawRipples() {
        this.ripples.forEach(ripple => {
            this.ctx2d.strokeStyle = `rgba(255, 255, 255, ${ripple.life * 0.5})`;
            this.ctx2d.lineWidth = 2;
            this.ctx2d.beginPath();
            this.ctx2d.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
            this.ctx2d.stroke();
        });
    }
    
    drawConnections() {
        const ctx = this.ctx2d;
        const connectionDist = this.config.connectionDistance;
        
        ctx.strokeStyle = this.config.pointColor + Math.floor(this.config.connectionOpacity * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = this.config.connectionWidth;
        
        for (let i = 0; i < this.gridData.length; i++) {
            const point1 = this.gridData[i];
            let x1 = point1.x;
            let y1 = point1.y;
            
            if (this.config.animationEnabled && this.config.movementType !== 'none') {
                const moved1 = this.apply2DMovement(point1, i);
                x1 = moved1.x;
                y1 = moved1.y;
            }
            
            for (let j = i + 1; j < this.gridData.length; j++) {
                const point2 = this.gridData[j];
                let x2 = point2.x;
                let y2 = point2.y;
                
                if (this.config.animationEnabled && this.config.movementType !== 'none') {
                    const moved2 = this.apply2DMovement(point2, j);
                    x2 = moved2.x;
                    y2 = moved2.y;
                }
                
                const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                
                if (dist < connectionDist) {
                    const opacity = (1 - dist / connectionDist) * this.config.connectionOpacity;
                    ctx.strokeStyle = this.config.pointColor + Math.floor(opacity * 255).toString(16).padStart(2, '0');
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            }
        }
    }
    
    drawGridPoints() {
        this.gridData.forEach((point, index) => {
            // Apply movement
            let x = point.x;
            let y = point.y;
            
            if (this.config.animationEnabled && this.config.movementType !== 'none') {
                const moved = this.apply2DMovement(point, index);
                x = moved.x;
                y = moved.y;
                
                // Update trail
                if (this.config.effectType === 'trails') {
                    point.trail.push({ x, y });
                    if (point.trail.length > 10) {
                        point.trail.shift();
                    }
                }
            }
            
            // Apply mouse interaction
            if (this.config.mouseInteraction) {
                const interaction = this.applyMouseInteraction(point, x, y);
                x = interaction.x;
                y = interaction.y;
            }
            
            // Check if hovered
            const isHovered = this.hoveredPointIndex === index;
            const size = isHovered ? this.config.elementSize * 2 : this.config.elementSize;
            
            // Get color
            let color = this.get2DColor(point, index);
            if (isHovered) {
                color = this.brightenColor(color);
            }
            
            // Draw trail
            if (this.config.effectType === 'trails' && point.trail.length > 1) {
                this.drawTrail(point.trail, color);
            }
            
            // Apply effects
            if (this.config.effectType === 'glow' || this.config.effectType === 'bloom' || isHovered) {
                this.drawGlow(x, y, color);
            }
            
            if (this.config.effectType === 'pulse-ring') {
                this.drawPulseRing(x, y, color);
            }
            
            // Draw element
            this.ctx2d.fillStyle = color;
            this.ctx2d.strokeStyle = color;
            this.ctx2d.beginPath();
            this.ctx2d.arc(x, y, size, 0, Math.PI * 2);
            this.ctx2d.fill();
            
            if (this.config.effectType === 'outline' || isHovered) {
                this.ctx2d.lineWidth = isHovered ? 3 : 1;
                this.ctx2d.stroke();
            }
        });
    }
    
    drawTrail(trail, color) {
        if (trail.length < 2) return;
        
        const ctx = this.ctx2d;
        ctx.strokeStyle = color;
        
        for (let i = 0; i < trail.length - 1; i++) {
            const opacity = (i / trail.length) * 0.5;
            const rgb = this.hexToRgb(color);
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
            ctx.lineWidth = this.config.elementSize * 0.5;
            ctx.beginPath();
            ctx.moveTo(trail[i].x, trail[i].y);
            ctx.lineTo(trail[i + 1].x, trail[i + 1].y);
            ctx.stroke();
        }
    }
    
    drawPulseRing(x, y, color) {
        const ctx = this.ctx2d;
        const pulse = Math.sin(this.time * 2) * 0.5 + 0.5;
        const radius = this.config.elementSize * 2 + pulse * 20;
        const opacity = (1 - pulse) * 0.5;
        
        const rgb = this.hexToRgb(color);
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    applyMouseInteraction(point, x, y) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const mouseCanvasX = this.mouseX * scaleX;
        const mouseCanvasY = this.mouseY * scaleY;
        
        const dx = mouseCanvasX - x;
        const dy = mouseCanvasY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = this.config.interactionRadius;
        const strength = this.config.interactionStrength;
        
        if (dist < radius && dist > 0) {
            const force = (1 - dist / radius) * strength;
            
            if (this.config.movementType === 'attraction') {
                x += dx * force * 0.1;
                y += dy * force * 0.1;
            } else if (this.config.movementType === 'repulsion') {
                x -= dx * force * 0.1;
                y -= dy * force * 0.1;
            }
        }
        
        return { x, y };
    }
    
    apply2DMovement(point, index) {
        const intensity = this.config.movementIntensity;
        let x = point.x;
        let y = point.y;
        
        switch (this.config.movementType) {
            case 'rotation':
                const angle = this.time * intensity;
                const dist = Math.sqrt(Math.pow(point.originalX, 2) + Math.pow(point.originalY, 2));
                x = point.originalX * Math.cos(angle) - point.originalY * Math.sin(angle) + this.canvas.width / 2;
                y = point.originalX * Math.sin(angle) + point.originalY * Math.cos(angle) + this.canvas.height / 2;
                break;
            
            case 'wave':
                // Gentle wave motion
                const waveX = Math.sin(this.time * intensity * 0.5 + point.originalX * 0.02) * 10 * intensity;
                const waveY = Math.cos(this.time * intensity * 0.5 + point.originalY * 0.02) * 10 * intensity;
                x = point.x + waveX;
                y = point.y + waveY;
                break;
            
            case 'pulse':
                const pulse = Math.sin(this.time * intensity * 2);
                const scale = 1 + pulse * 0.3;
                x = (point.originalX * scale) + this.canvas.width / 2;
                y = (point.originalY * scale) + this.canvas.height / 2;
                break;
            
            case 'spiral':
                const spiralDist = Math.sqrt(Math.pow(point.originalX, 2) + Math.pow(point.originalY, 2));
                const spiralAngle = this.time * intensity + spiralDist * 0.01;
                const spiralRadius = spiralDist + Math.sin(spiralAngle) * 10;
                x = Math.cos(spiralAngle) * spiralRadius + this.canvas.width / 2;
                y = Math.sin(spiralAngle) * spiralRadius + this.canvas.height / 2;
                break;
            
            case 'float':
                x = point.x + Math.sin(this.time * intensity + index * 0.1) * 10;
                y = point.y + Math.cos(this.time * intensity + index * 0.1) * 10;
                break;
            
            case 'morph':
                const morphX = Math.sin(this.time * intensity + point.originalX * 0.05) * 30;
                const morphY = Math.cos(this.time * intensity + point.originalY * 0.05) * 30;
                x = point.x + morphX * intensity;
                y = point.y + morphY * intensity;
                break;
            
            case 'elastic':
                const elastic = Math.sin(this.time * intensity * 3) * 0.5 + 0.5;
                x = point.x + (point.originalX - point.x) * elastic;
                y = point.y + (point.originalY - point.y) * elastic;
                break;
            
            case 'noise':
                const noiseX = (Math.sin(this.time * intensity + point.originalX * 0.1) + 
                               Math.cos(this.time * intensity + point.originalY * 0.1)) * 15;
                const noiseY = (Math.sin(this.time * intensity + point.originalY * 0.1) + 
                               Math.cos(this.time * intensity + point.originalX * 0.1)) * 15;
                x = point.x + noiseX * intensity;
                y = point.y + noiseY * intensity;
                break;
            
            case 'flow':
                // Flow field based on Perlin-like noise
                const flowAngle = Math.sin(point.originalX * 0.01 + this.time) * Math.cos(point.originalY * 0.01 + this.time) * Math.PI * 2;
                const flowSpeed = 5 * intensity;
                x = point.x + Math.cos(flowAngle) * flowSpeed;
                y = point.y + Math.sin(flowAngle) * flowSpeed;
                break;
            
            case 'attraction':
            case 'repulsion':
                // Handled in applyMouseInteraction
                break;
        }
        
        return { x, y };
    }
    
    get2DColor(point, index) {
        switch (this.config.colorScheme) {
            case 'single':
                return this.config.pointColor;
            
            case 'gradient':
                const dist = Math.sqrt(Math.pow(point.originalX, 2) + Math.pow(point.originalY, 2));
                const maxDist = 200;
                const t = dist / maxDist;
                return this.interpolateColor(this.config.pointColor, this.config.secondaryColor, t);
            
            case 'rainbow':
                const hue = (this.time * 0.1 + index * 0.01) % 1;
                return `hsl(${hue * 360}, 100%, 50%)`;
            
            case 'depth':
                const depth = Math.abs(point.z) / 100;
                return this.darkenColor(this.config.pointColor, depth * 0.5);
            
            case 'distance':
                const distance = Math.sqrt(Math.pow(point.originalX, 2) + Math.pow(point.originalY, 2));
                const maxDistance = 200;
                const distT = distance / maxDistance;
                return this.interpolateColor(this.config.pointColor, this.config.secondaryColor, distT);
            
            case 'angle':
                const angle = Math.atan2(point.originalY, point.originalX);
                const angleHue = (angle + Math.PI) / (Math.PI * 2);
                return `hsl(${angleHue * 360}, 100%, 50%)`;
            
            case 'pulse':
                const pulseHue = (this.time * 0.5 + index * 0.01) % 1;
                return `hsl(${pulseHue * 360}, 100%, 50%)`;
            
            default:
                return this.config.pointColor;
        }
    }
    
    brightenColor(color) {
        if (color.startsWith('rgb')) {
            const rgb = this.parseRgbColor(color);
            return `rgb(${Math.min(255, rgb.r + 100)}, ${Math.min(255, rgb.g + 100)}, ${Math.min(255, rgb.b + 100)})`;
        } else if (color.startsWith('hsl')) {
            const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (hslMatch) {
                const h = hslMatch[1];
                const s = hslMatch[2];
                const l = Math.min(100, parseInt(hslMatch[3]) + 20);
                return `hsl(${h}, ${s}%, ${l}%)`;
            }
        } else {
            const rgb = this.hexToRgb(color);
            return `rgb(${Math.min(255, rgb.r + 100)}, ${Math.min(255, rgb.g + 100)}, ${Math.min(255, rgb.b + 100)})`;
        }
        return color;
    }
    
    interpolateColor(color1, color2, t) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        const r = Math.round(c1.r + (c2.r - c1.r) * t);
        const g = Math.round(c1.g + (c2.g - c1.g) * t);
        const b = Math.round(c1.b + (c2.b - c1.b) * t);
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    parseRgbColor(rgb) {
        const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        return match ? {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3])
        } : { r: 0, g: 0, b: 0 };
    }
    
    darkenColor(hex, amount) {
        const rgb = this.hexToRgb(hex);
        const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
        const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
        const b = Math.max(0, Math.round(rgb.b * (1 - amount)));
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    drawGlow(x, y, color) {
        const ctx = this.ctx2d;
        const radius = this.config.glowRadius * this.config.effectIntensity;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        
        let rgb;
        if (color.startsWith('rgb')) {
            rgb = this.parseRgbColor(color);
        } else if (color.startsWith('hsl')) {
            // Convert HSL to RGB for glow
            const hslMatch = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (hslMatch) {
                const h = parseInt(hslMatch[1]) / 360;
                const s = parseInt(hslMatch[2]) / 100;
                const l = parseInt(hslMatch[3]) / 100;
                rgb = this.hslToRgb(h, s, l);
            } else {
                rgb = { r: 0, g: 255, b: 255 };
            }
        } else {
            rgb = this.hexToRgb(color);
        }
        
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`);
        gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
    
    // High-resolution export function
    renderHighResolution(targetCanvas, scale) {
        if (!this.isInitialized) {
            console.warn('Grid Effects Studio not ready for high-res export');
            return;
        }
        
        const originalWidth = this.canvas.width;
        const originalHeight = this.canvas.height;
        const exportWidth = originalWidth * scale;
        const exportHeight = originalHeight * scale;
        
        const ctx = targetCanvas.getContext('2d');
        targetCanvas.width = exportWidth;
        targetCanvas.height = exportHeight;
        ctx.scale(scale, scale);
        
        // Redraw at high resolution
        if (!this.bgTransparent) {
            ctx.fillStyle = this.bgColor;
            ctx.fillRect(0, 0, originalWidth, originalHeight);
        }
        
        // Draw connections
        if (this.config.showConnections) {
            const connectionDist = this.config.connectionDistance;
            ctx.strokeStyle = this.config.pointColor + Math.floor(this.config.connectionOpacity * 255).toString(16).padStart(2, '0');
            ctx.lineWidth = this.config.connectionWidth * scale;
            
            for (let i = 0; i < this.gridData.length; i++) {
                const point1 = this.gridData[i];
                let x1 = point1.x;
                let y1 = point1.y;
                
                if (this.config.animationEnabled && this.config.movementType !== 'none') {
                    const moved1 = this.apply2DMovement(point1, i);
                    x1 = moved1.x;
                    y1 = moved1.y;
                }
                
                for (let j = i + 1; j < this.gridData.length; j++) {
                    const point2 = this.gridData[j];
                    let x2 = point2.x;
                    let y2 = point2.y;
                    
                    if (this.config.animationEnabled && this.config.movementType !== 'none') {
                        const moved2 = this.apply2DMovement(point2, j);
                        x2 = moved2.x;
                        y2 = moved2.y;
                    }
                    
                    const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                    
                    if (dist < connectionDist) {
                        const opacity = (1 - dist / connectionDist) * this.config.connectionOpacity;
                        ctx.strokeStyle = this.config.pointColor + Math.floor(opacity * 255).toString(16).padStart(2, '0');
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.stroke();
                    }
                }
            }
        }
        
        // Draw points
        this.gridData.forEach((point, index) => {
            let x = point.x;
            let y = point.y;
            
            if (this.config.animationEnabled && this.config.movementType !== 'none') {
                const moved = this.apply2DMovement(point, index);
                x = moved.x;
                y = moved.y;
            }
            
            const color = this.get2DColor(point, index);
            ctx.fillStyle = color;
            ctx.strokeStyle = color;
            
            if (this.config.effectType === 'glow' || this.config.effectType === 'bloom') {
                this.drawGlow(x, y, color);
            }
            
            ctx.beginPath();
            ctx.arc(x, y, this.config.elementSize * scale, 0, Math.PI * 2);
            ctx.fill();
            
            if (this.config.effectType === 'outline') {
                ctx.stroke();
            }
        });
        
        console.log(`High-res Grid Effects export completed at ${scale}x resolution`);
    }
}

// Global export function required by Chatooly CDN
window.renderHighResolution = function(targetCanvas, scale) {
    if (window.gridEffectsStudio && window.gridEffectsStudio.renderHighResolution) {
        window.gridEffectsStudio.renderHighResolution(targetCanvas, scale);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.gridEffectsStudio = new GridEffectsStudio();
});
