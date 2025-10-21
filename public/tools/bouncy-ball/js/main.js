/* 
 * Bouncy Ball 3D - Main Logic
 * Author: Studio Video
 * 
 * Interactive 3D bouncy ball physics simulation with Three.js
 */

class BouncyBall3DTool {
    constructor() {
        this.canvas = document.getElementById('chatooly-canvas');
        
        // Canvas dimensions tracking for resize handling
        this.previousCanvasSize = { width: 0, height: 0 };
        
        // Ball properties
        this.balls = [];
        this.ballMeshes = [];
        this.ballCount = 5;
        this.ballSpeed = 1.0;
        this.ballSize = 1.0;
        this.ballColor = '#ff6b6b';
        this.randomColors = true;
        this.cameraAngle = 45;
        
        // Physics constants
        this.gravity = 0.3;
        this.bounce = 0.8;
        this.friction = 0.99;
        
        // Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.light = null;
        
        // Animation
        this.animationId = null;
        this.isInitialized = false;
        
        this.init();
    }
    
    init() {
        this.setupThreeJS();
        this.setupEventListeners();
        this.setupBackgroundControls();
        this.createBalls();
        this.startAnimation();
        this.isInitialized = true;
    }
    
    setupThreeJS() {
        // Scene setup
        this.scene = new THREE.Scene();
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
        this.camera.position.set(0, 0, 50);
        
        // Renderer setup (CRITICAL: preserveDrawingBuffer for exports)
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: true, 
            preserveDrawingBuffer: true  // ← REQUIRED FOR EXPORTS
        });
        this.renderer.setSize(800, 600);
        this.renderer.setClearColor(0xCCFD50, 1); // Default background color
        
        // Ensure canvas has proper dimensions
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Lighting setup
        this.light = new THREE.DirectionalLight(0xffffff, 1);
        this.light.position.set(10, 10, 5);
        this.scene.add(this.light);
        
        // Ambient light for softer shadows
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        this.previousCanvasSize = { width: 800, height: 600 };
    }
    
    setupEventListeners() {
        // Canvas resize event handling (CRITICAL for Chatooly)
        document.addEventListener('chatooly:canvas-resized', (e) => this.onCanvasResized(e));
        
        // Mouse click to add balls
        this.canvas.addEventListener('click', (e) => this.onMouseClick(e));
        
        // Control event listeners
        document.getElementById('ball-count').addEventListener('input', (e) => {
            this.ballCount = parseInt(e.target.value);
            document.getElementById('ball-count-display').textContent = this.ballCount;
            this.createBalls();
        });
        
        document.getElementById('ball-speed').addEventListener('input', (e) => {
            this.ballSpeed = parseFloat(e.target.value);
            document.getElementById('ball-speed-display').textContent = this.ballSpeed.toFixed(1);
        });
        
        document.getElementById('ball-size').addEventListener('input', (e) => {
            this.ballSize = parseFloat(e.target.value);
            document.getElementById('ball-size-display').textContent = this.ballSize.toFixed(1);
            this.updateBallSizes();
        });
        
        document.getElementById('camera-angle').addEventListener('input', (e) => {
            this.cameraAngle = parseInt(e.target.value);
            document.getElementById('camera-angle-display').textContent = this.cameraAngle + '°';
            this.updateCameraPosition();
        });
        
        document.getElementById('ball-color').addEventListener('input', (e) => {
            this.ballColor = e.target.value;
            if (!this.randomColors) {
                this.updateBallColors();
            }
        });
        
        document.getElementById('random-colors').addEventListener('change', (e) => {
            this.randomColors = e.target.checked;
            this.updateBallColors();
        });
        
        document.getElementById('reset-balls').addEventListener('click', () => {
            this.createBalls();
        });
    }
    
    setupBackgroundControls() {
        // Initialize Background Manager (MANDATORY for Chatooly)
        Chatooly.backgroundManager.init(this.canvas);
        
        // Connect Event Listeners (add these to your initialization)
        document.getElementById('transparent-bg').addEventListener('change', (e) => {
            Chatooly.backgroundManager.setTransparent(e.target.checked);
            document.getElementById('bg-color-group').style.display = e.target.checked ? 'none' : 'block';
            this.render();
        });
        
        document.getElementById('bg-color').addEventListener('input', (e) => {
            Chatooly.backgroundManager.setBackgroundColor(e.target.value);
            // Update Three.js background color
            this.renderer.setClearColor(e.target.value.replace('#', '0x'), 1);
            this.render();
        });
        
        document.getElementById('bg-image').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await Chatooly.backgroundManager.setBackgroundImage(file);
                document.getElementById('clear-bg-image').style.display = 'block';
                document.getElementById('bg-fit-group').style.display = 'block';
                this.render();
            }
        });
        
        document.getElementById('clear-bg-image').addEventListener('click', () => {
            Chatooly.backgroundManager.clearBackgroundImage();
            document.getElementById('clear-bg-image').style.display = 'none';
            document.getElementById('bg-fit-group').style.display = 'none';
            document.getElementById('bg-image').value = '';
            this.render();
        });
        
        document.getElementById('bg-fit').addEventListener('change', (e) => {
            Chatooly.backgroundManager.setFit(e.target.value);
            this.render();
        });
    }
    
    onCanvasResized(e) {
        if (!this.isInitialized) return;
        
        const oldWidth = this.previousCanvasSize.width;
        const oldHeight = this.previousCanvasSize.height;
        const newWidth = e.detail.canvas.width;
        const newHeight = e.detail.canvas.height;
        
        if (oldWidth === 0 || oldHeight === 0) {
            this.previousCanvasSize = { width: newWidth, height: newHeight };
            this.updateRendererSize();
            return;
        }
        
        // Update renderer size
        this.updateRendererSize();
        
        // Scale all ball positions and velocities
        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;
        
        this.balls.forEach(ball => {
            ball.x *= scaleX;
            ball.y *= scaleY;
            ball.vx *= scaleX;
            ball.vy *= scaleY;
            ball.radius *= Math.min(scaleX, scaleY);
        });
        
        this.previousCanvasSize = { width: newWidth, height: newHeight };
    }
    
    updateRendererSize() {
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        this.camera.aspect = this.canvas.width / this.canvas.height;
        this.camera.updateProjectionMatrix();
    }
    
    onMouseClick(e) {
        const coords = window.Chatooly ? 
            window.Chatooly.utils.mapMouseToCanvas(e, this.canvas) :
            this.fallbackMouseMapping(e);
        
        // Add a new ball at click position
        this.addBall(coords.x, coords.y);
    }
    
    fallbackMouseMapping(e) {
        const rect = this.canvas.getBoundingClientRect();
        const displayX = e.clientX - rect.left;
        const displayY = e.clientY - rect.top;
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return { x: displayX * scaleX, y: displayY * scaleY };
    }
    
    createBalls() {
        // Remove existing balls from scene
        this.ballMeshes.forEach(mesh => {
            this.scene.remove(mesh);
        });
        
        this.balls = [];
        this.ballMeshes = [];
        
        for (let i = 0; i < this.ballCount; i++) {
            this.addRandomBall();
        }
    }
    
    addRandomBall() {
        const radius = (15 + Math.random() * 20) * this.ballSize;
        const x = (Math.random() - 0.5) * 60; // 3D space coordinates
        const y = (Math.random() - 0.5) * 40;
        const z = (Math.random() - 0.5) * 20;
        this.addBall(x, y, z, radius);
    }
    
    addBall(x, y, z, radius = null) {
        if (!radius) radius = (15 + Math.random() * 20) * this.ballSize;
        
        // Create 3D sphere geometry
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const material = new THREE.MeshPhongMaterial({ 
            color: this.randomColors ? this.getRandomColor() : this.ballColor,
            shininess: 100
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position the mesh
        mesh.position.set(x, y, z);
        
        // Add to scene
        this.scene.add(mesh);
        this.ballMeshes.push(mesh);
        
        // Store physics data
        const ball = {
            x: x,
            y: y,
            z: z,
            radius: radius,
            vx: (Math.random() - 0.5) * 10 * this.ballSpeed,
            vy: (Math.random() - 0.5) * 10 * this.ballSpeed,
            vz: (Math.random() - 0.5) * 10 * this.ballSpeed,
            color: this.randomColors ? this.getRandomColor() : this.ballColor,
            mesh: mesh
        };
        
        this.balls.push(ball);
    }
    
    getRandomColor() {
        const colors = [
            '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
            '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    updateBallColors() {
        this.balls.forEach(ball => {
            ball.color = this.randomColors ? this.getRandomColor() : this.ballColor;
            ball.mesh.material.color.setHex(ball.color.replace('#', '0x'));
        });
    }
    
    updateBallSizes() {
        this.balls.forEach((ball, index) => {
            const newRadius = (ball.radius / this.ballSize) * this.ballSize;
            ball.radius = newRadius;
            
            // Create new geometry with updated size
            const newGeometry = new THREE.SphereGeometry(newRadius, 32, 32);
            ball.mesh.geometry.dispose();
            ball.mesh.geometry = newGeometry;
        });
    }
    
    updateCameraPosition() {
        const angleRad = (this.cameraAngle * Math.PI) / 180;
        this.camera.position.x = Math.cos(angleRad) * 50;
        this.camera.position.z = Math.sin(angleRad) * 50;
        this.camera.position.y = 20;
        this.camera.lookAt(0, 0, 0);
    }
    
    updatePhysics() {
        this.balls.forEach(ball => {
            // Apply gravity
            ball.vy -= this.gravity;
            
            // Apply speed multiplier
            ball.vx *= this.ballSpeed;
            ball.vy *= this.ballSpeed;
            ball.vz *= this.ballSpeed;
            
            // Update position
            ball.x += ball.vx;
            ball.y += ball.vy;
            ball.z += ball.vz;
            
            // Bounce off walls (3D boundaries)
            if (ball.x - ball.radius < -30 || ball.x + ball.radius > 30) {
                ball.vx *= -this.bounce;
                ball.x = Math.max(-30 + ball.radius, Math.min(30 - ball.radius, ball.x));
            }
            
            if (ball.y - ball.radius < -20 || ball.y + ball.radius > 20) {
                ball.vy *= -this.bounce;
                ball.y = Math.max(-20 + ball.radius, Math.min(20 - ball.radius, ball.y));
            }
            
            if (ball.z - ball.radius < -10 || ball.z + ball.radius > 10) {
                ball.vz *= -this.bounce;
                ball.z = Math.max(-10 + ball.radius, Math.min(10 - ball.radius, ball.z));
            }
            
            // Apply friction
            ball.vx *= this.friction;
            ball.vy *= this.friction;
            ball.vz *= this.friction;
            
            // Reset speed multiplier for next frame
            ball.vx /= this.ballSpeed;
            ball.vy /= this.ballSpeed;
            ball.vz /= this.ballSpeed;
            
            // Update mesh position
            ball.mesh.position.set(ball.x, ball.y, ball.z);
        });
        
        // Ball-to-ball collisions
        this.handleCollisions();
    }
    
    handleCollisions() {
        for (let i = 0; i < this.balls.length; i++) {
            for (let j = i + 1; j < this.balls.length; j++) {
                const ball1 = this.balls[i];
                const ball2 = this.balls[j];
                
                const dx = ball2.x - ball1.x;
                const dy = ball2.y - ball1.y;
                const dz = ball2.z - ball1.z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                
                if (distance < ball1.radius + ball2.radius) {
                    // 3D collision detected - simple elastic collision
                    const overlap = (ball1.radius + ball2.radius) - distance;
                    const separationX = (dx / distance) * overlap * 0.5;
                    const separationY = (dy / distance) * overlap * 0.5;
                    const separationZ = (dz / distance) * overlap * 0.5;
                    
                    // Separate balls
                    ball1.x -= separationX;
                    ball1.y -= separationY;
                    ball1.z -= separationZ;
                    ball2.x += separationX;
                    ball2.y += separationY;
                    ball2.z += separationZ;
                    
                    // Exchange velocities (simplified 3D collision)
                    const tempVx = ball1.vx;
                    const tempVy = ball1.vy;
                    const tempVz = ball1.vz;
                    
                    ball1.vx = ball2.vx * this.bounce;
                    ball1.vy = ball2.vy * this.bounce;
                    ball1.vz = ball2.vz * this.bounce;
                    
                    ball2.vx = tempVx * this.bounce;
                    ball2.vy = tempVy * this.bounce;
                    ball2.vz = tempVz * this.bounce;
                }
            }
        }
    }
    
    render() {
        // Three.js handles background through renderer.setClearColor
        // Get background color from the color input element
        const bgColorInput = document.getElementById('bg-color');
        const bgColor = bgColorInput ? bgColorInput.value : '#CCFD50';
        this.renderer.setClearColor(bgColor.replace('#', '0x'), 1);
        
        // Render the 3D scene
        this.renderer.render(this.scene, this.camera);
    }
    
    redrawContent() {
        this.render();
    }
    
    animate() {
        this.updatePhysics();
        this.render();
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    startAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.animate();
    }
}

// Initialize the tool when the page loads
let bouncyBall3DTool;

document.addEventListener('DOMContentLoaded', () => {
    bouncyBall3DTool = new BouncyBall3DTool();
});

// High-resolution export function (CRITICAL for Chatooly)
window.renderHighResolution = function(targetCanvas, scale) {
    if (!bouncyBall3DTool || !bouncyBall3DTool.isInitialized) {
        console.warn('Bouncy Ball 3D tool not ready for high-res export');
        return;
    }
    
    // Create temporary renderer for high-res export
    const tempRenderer = new THREE.WebGLRenderer({ 
        canvas: targetCanvas, 
        antialias: true, 
        preserveDrawingBuffer: true 
    });
    
    tempRenderer.setSize(
        bouncyBall3DTool.canvas.width * scale, 
        bouncyBall3DTool.canvas.height * scale
    );
    
    // Set background color
    const bgColorInput = document.getElementById('bg-color');
    const bgColor = bgColorInput ? bgColorInput.value : '#CCFD50';
    tempRenderer.setClearColor(bgColor.replace('#', '0x'), 1);
    
    // Create temporary camera with scaled aspect ratio
    const tempCamera = new THREE.PerspectiveCamera(
        75, 
        (bouncyBall3DTool.canvas.width * scale) / (bouncyBall3DTool.canvas.height * scale), 
        0.1, 
        1000
    );
    
    // Copy camera position and rotation
    tempCamera.position.copy(bouncyBall3DTool.camera.position);
    tempCamera.rotation.copy(bouncyBall3DTool.camera.rotation);
    tempCamera.updateProjectionMatrix();
    
    // Render at high resolution
    tempRenderer.render(bouncyBall3DTool.scene, tempCamera);
    
    console.log(`High-res export completed at ${scale}x resolution`);
};