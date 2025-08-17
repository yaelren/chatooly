/* 
 * 3D Lanyard Tool - Main Logic
 * Author: yael
 */

// Basic Three.js setup
let scene, camera, renderer, lanyardTool;

class LanyardTool {
    constructor() {
        this.canvas = document.getElementById('chatooly-canvas');
        this.swingStrength = 1.5;
        this.bounceFactor = 0.7;
        this.init();
    }
    
    init() {
        this.setupThreeJS();
        this.createScene();
        this.setupEventListeners();
        this.animate();
        console.log('3D Lanyard Tool initialized');
    }
    
    setupThreeJS() {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, this.canvas.width / this.canvas.height, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, preserveDrawingBuffer: true });
        renderer.setSize(this.canvas.width, this.canvas.height);
        renderer.setClearColor('#2c3e50');
        camera.position.z = 5;
    }
    
    createScene() {
        // Create lanyard chain segments
        this.lanyardSegments = [];
        this.segmentCount = 12;
        this.segmentLength = 0.3;
        
        const geometry = new THREE.CylinderGeometry(0.03, 0.03, this.segmentLength, 8);
        const material = new THREE.MeshPhongMaterial({ color: '#ff6b6b', shininess: 50 });
        
        for (let i = 0; i < this.segmentCount; i++) {
            const segment = new THREE.Mesh(geometry, material.clone());
            segment.position.set(0, 2 - (i * this.segmentLength), 0);
            segment.castShadow = true;
            segment.receiveShadow = true;
            
            // Add physics properties
            segment.userData = {
                velocity: new THREE.Vector3(0, 0, 0),
                isFixed: i === 0,
                targetY: segment.position.y
            };
            
            this.lanyardSegments.push(segment);
            scene.add(segment);
        }
        
        // Create card at bottom
        this.createCard();
        this.setupLighting();
    }
    
    createCard() {
        const cardGeometry = new THREE.PlaneGeometry(1, 0.6);
        const cardMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffff, 
            side: THREE.DoubleSide 
        });
        
        this.card = new THREE.Mesh(cardGeometry, cardMaterial);
        this.card.position.y = 2 - (this.segmentCount * this.segmentLength) - 0.4;
        this.card.castShadow = true;
        this.card.receiveShadow = true;
        
        this.card.userData = {
            velocity: new THREE.Vector3(0, 0, 0)
        };
        
        scene.add(this.card);
        this.updateCardTexture();
    }
    
    updateCardTexture(imageUrl = null) {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        
        if (imageUrl) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                this.applyTexture(canvas);
            };
            img.src = imageUrl;
        } else {
            // Default card design
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.strokeStyle = '#495057';
            ctx.lineWidth = 4;
            ctx.strokeRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#343a40';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('LANYARD', canvas.width/2, canvas.height/2 - 10);
            
            ctx.font = '16px Arial';
            ctx.fillText('Upload your image', canvas.width/2, canvas.height/2 + 20);
            
            this.applyTexture(canvas);
        }
    }
    
    applyTexture(canvas) {
        const texture = new THREE.CanvasTexture(canvas);
        this.card.material.map = texture;
        this.card.material.needsUpdate = true;
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        // Directional light with shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        
        // Enable shadows
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    setupEventListeners() {
        // Canvas resize
        document.addEventListener('chatooly:canvas-resized', (e) => {
            camera.aspect = e.detail.canvas.width / e.detail.canvas.height;
            camera.updateProjectionMatrix();
            renderer.setSize(e.detail.canvas.width, e.detail.canvas.height);
        });
        
        // Image upload
        const imageUpload = document.getElementById('image-upload');
        if (imageUpload) {
            imageUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        this.updateCardTexture(event.target.result);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        // Color controls
        const lanyardColor = document.getElementById('lanyard-color');
        if (lanyardColor) {
            lanyardColor.addEventListener('input', (e) => {
                this.lanyardSegments.forEach(segment => {
                    segment.material.color.setHex(e.target.value.replace('#', '0x'));
                });
            });
        }
        
        const backgroundColor = document.getElementById('background-color');
        if (backgroundColor) {
            backgroundColor.addEventListener('input', (e) => {
                renderer.setClearColor(e.target.value);
            });
        }
        
        // Physics controls
        const swingStrength = document.getElementById('swing-strength');
        if (swingStrength) {
            swingStrength.addEventListener('input', (e) => {
                this.swingStrength = parseFloat(e.target.value);
            });
        }
        
        const bounceFactor = document.getElementById('bounce-factor');
        if (bounceFactor) {
            bounceFactor.addEventListener('input', (e) => {
                this.bounceFactor = parseFloat(e.target.value);
            });
        }
        
        const resetButton = document.getElementById('reset-physics');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetPhysics();
            });
        }
        
        // Mouse interaction for physics
        this.canvas.addEventListener('mousemove', (e) => {
            this.onMouseMove(e);
        });
    }
    
    onMouseMove(e) {
        if (!window.Chatooly?.utils?.mapMouseToCanvas) return;
        
        const coords = window.Chatooly.utils.mapMouseToCanvas(e, this.canvas);
        const mouseX = (coords.x / this.canvas.width) * 2 - 1;
        const mouseY = -(coords.y / this.canvas.height) * 2 + 1;
        
        // Apply gentle wind force based on mouse movement
        const windForce = new THREE.Vector3(
            mouseX * 0.005 * this.swingStrength,
            0,
            mouseY * 0.005 * this.swingStrength
        );
        
        // Apply wind to non-fixed segments
        this.lanyardSegments.forEach((segment, index) => {
            if (!segment.userData.isFixed) {
                segment.userData.velocity.add(windForce);
            }
        });
    }
    
    updatePhysics() {
        const gravity = -0.01;
        const damping = 0.99;
        
        // Update lanyard physics
        for (let i = 0; i < this.lanyardSegments.length; i++) {
            const segment = this.lanyardSegments[i];
            const data = segment.userData;
            
            if (!data.isFixed) {
                // Apply gravity
                data.velocity.y += gravity;
                
                // Apply damping
                data.velocity.multiplyScalar(damping);
                
                // Update position
                segment.position.add(data.velocity);
                
                // Simple constraint to previous segment
                if (i > 0) {
                    const prev = this.lanyardSegments[i - 1];
                    const distance = segment.position.distanceTo(prev.position);
                    
                    if (distance > this.segmentLength) {
                        const dir = new THREE.Vector3()
                            .subVectors(segment.position, prev.position)
                            .normalize();
                        segment.position.copy(prev.position)
                            .add(dir.multiplyScalar(this.segmentLength));
                    }
                }
                
                // Simple rotation based on direction to next segment
                if (i < this.lanyardSegments.length - 1) {
                    const next = this.lanyardSegments[i + 1];
                    const direction = new THREE.Vector3()
                        .subVectors(next.position, segment.position)
                        .normalize();
                    segment.lookAt(segment.position.clone().add(direction));
                }
            }
        }
        
        // Update card physics (follows last segment)
        if (this.lanyardSegments.length > 0) {
            const lastSegment = this.lanyardSegments[this.lanyardSegments.length - 1];
            const cardTarget = lastSegment.position.clone();
            cardTarget.y -= 0.5;
            
            // Spring physics to follow the last segment
            const springForce = new THREE.Vector3()
                .subVectors(cardTarget, this.card.position)
                .multiplyScalar(0.08);
            
            this.card.userData.velocity.add(springForce);
            this.card.userData.velocity.multiplyScalar(damping * this.bounceFactor);
            this.card.position.add(this.card.userData.velocity);
            
            // Add gentle rotation for realism
            this.card.rotation.z = this.card.userData.velocity.x * 3;
            this.card.rotation.x = Math.sin(Date.now() * 0.001) * 0.05;
        }
    }
    
    resetPhysics() {
        // Reset all lanyard segments to original positions
        this.lanyardSegments.forEach((segment, index) => {
            segment.position.set(0, 2 - (index * this.segmentLength), 0);
            segment.rotation.set(0, 0, 0);
            segment.userData.velocity.set(0, 0, 0);
        });
        
        // Reset card
        this.card.position.set(0, 2 - (this.segmentCount * this.segmentLength) - 0.4, 0);
        this.card.rotation.set(0, 0, 0);
        this.card.userData.velocity.set(0, 0, 0);
        
        console.log('Physics reset');
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.updatePhysics();
        renderer.render(scene, camera);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof THREE !== 'undefined') {
        lanyardTool = new LanyardTool();
    }
});

// Basic export function
window.renderHighResolution = function(targetCanvas, scale) {
    if (!renderer) return;
    
    const ctx = targetCanvas.getContext('2d');
    targetCanvas.width = renderer.domElement.width * scale;
    targetCanvas.height = renderer.domElement.height * scale;
    ctx.drawImage(renderer.domElement, 0, 0, targetCanvas.width, targetCanvas.height);
    
    console.log(`High-res export at ${scale}x`);
};