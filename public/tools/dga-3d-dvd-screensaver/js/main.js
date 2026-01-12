/*
 * 3D DVD Screensaver Tool - Main Logic
 * Author: Claude Code
 *
 * Classic DVD screensaver with bouncing 3D objects.
 * Features: bounce physics, split effects, trails, customizable materials.
 * Uses Three.js with InstancedMesh for performance.
 */

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');

// Set canvas dimensions - use CSS size if available, otherwise default
function setCanvasDimensions() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        // Store CSS dimensions for camera/renderer
        canvas.cssWidth = rect.width;
        canvas.cssHeight = rect.height;
    } else {
        canvas.width = 1920;
        canvas.height = 1080;
        canvas.cssWidth = 1920;
        canvas.cssHeight = 1080;
    }
    console.log('3D DVD Screensaver: Canvas dimensions set to', canvas.cssWidth, 'x', canvas.cssHeight, '(DPR:', dpr, ')');
}

setCanvasDimensions();

// ========== SETTINGS ==========
const settings = {
    // === Object Source ===
    objectSource: 'primitive',      // 'primitive' | 'glb'
    primitiveType: 'cube',          // 'cube' | 'sphere' | 'torus' | 'cone' | 'cylinder'
    objectSize: 1.0,

    // === Movement ===
    initialSpeed: 3.0,
    speedX: 1.0,
    speedY: 0.7,
    startPosition: 'random',        // 'random' | 'center'

    // === Bounce Effects ===
    speedIncreaseEnabled: false,
    speedIncreaseAmount: 0.2,
    speedMaxCap: 15.0,

    splitEnabled: false,
    splitMaxObjects: 100,
    splitAngleDivergence: 30,       // degrees
    splitVelocityInheritance: 0.9,

    rotationOnHitEnabled: false,
    rotationOnHitMode: 'snap',      // 'snap' | 'lerp'
    rotationLerpSpeed: 5.0,

    // === Trail System ===
    trailEnabled: false,
    trailStyle: 'ghost',            // 'ghost' | 'solid'
    trailPostProcess: false,        // AfterImage effect (works with both modes)

    // Ghost trail (fading copies with opacity/scale)
    ghostTrailLength: 50,           // Max trail copies per object
    ghostSpacing: 2,                // Frames between trail copies
    ghostOpacityFade: 0.04,         // Opacity reduction per copy (lower = longer visible trail)
    ghostScaleFade: 0.98,           // Scale multiplier per copy (lower = more shrink)
    ghostMaterialInherit: true,     // Trail uses same material as object

    // Solid trail (distance-based copies)
    solidTrailSpacing: 0.3,         // World units between copies
    solidTrailMaxCopies: 50,        // Max instances in trail
    solidTrailLifespan: 0,          // Seconds before copy removed (0 = infinite)

    // Post-process blur (AfterImage effect, optional on either mode)
    postProcessDamp: 0.9,           // 0 = no blur, 0.98 = long blur

    // === Object Behavior ===
    facingMode: 'camera',           // 'camera' | 'movement' | 'fixed' | 'random'
    facingLerpEnabled: false,
    facingLerpSpeed: 5.0,
    fixedAngleX: 0,
    fixedAngleY: 0,
    fixedAngleZ: 0,

    // Independent rotation
    spinEnabled: false,
    spinSpeed: 1.0,
    tumbleEnabled: false,
    tumbleSpeed: 1.0,

    // === Materials ===
    materialType: 'solid',          // 'solid' | 'gradient' | 'matcapUpload'
    solidColor: '#ff0000',          // DVD red default
    shaderMode: 'flat',             // 'flat' | 'reflective' | 'toon'
    gradientSets: [{
        name: 'Gradient 1',
        stops: [
            { color: '#ff6b6b', position: 0 },
            { color: '#4ecdc4', position: 50 },
            { color: '#45b7d1', position: 100 }
        ],
        type: 'radial'
    }],
    activeGradientIndex: 0,
    lightColor: '#ffffff',
    lightPosition: 0.5,
    lightIntensity: 1.0,
    rimEnabled: true,
    rimColor: '#ffffff',
    rimIntensity: 0.5,

    // === Camera ===
    cameraZoom: 5.0,

    // === Debug ===
    debugBoundsVisible: false
};

// ========== THREE.JS SETUP ==========
let renderer, scene, camera;
let clock;
let backgroundTexture = null;

// ========== POST-PROCESSING ==========
let composer = null;
let afterImagePass = null;

// ========== DVD OBJECT SYSTEM ==========
let objectPool = null;
let trailManager = null;
let boundsManager = null;
let loadedGeometry = null;
let loadedMaterial = null;
let isModelLoaded = false;

// ========== MATCAP MATERIAL SYSTEM ==========
let matcapGenerator = null;
let customMaterial = null;
let uploadedMatcapTexture = null;

// ========== CANVAS SIZE TRACKING ==========
let previousCanvasSize = { width: canvas.width, height: canvas.height };

// ========== ZERO MATRIX FOR HIDDEN INSTANCES ==========
// Initialized lazily after THREE is loaded
let zeroMatrix = null;

// ========== DVD OBJECT CLASS ==========
class DVDObject {
    constructor(index, position, velocity, parentObject = null) {
        this.index = index;
        this.position = position.clone();      // THREE.Vector2 (X/Y only)
        this.velocity = velocity.clone();      // THREE.Vector2
        this.rotation = new THREE.Euler(0, 0, 0);
        this.angularVelocity = new THREE.Vector3(0, 0, 0);
        this.spinOffset = new THREE.Vector3(0, 0, 0);
        this.scale = new THREE.Vector3(1, 1, 1);

        // Ghost trail: history of positions for fading copies
        this.trailHistory = [];
        this.framesSinceLastTrail = 0;

        // Solid trail: distance-based spawning
        this.accumulatedDistance = 0;
        this.lastTrailPosition = position.clone();

        // Facing direction tracking
        this.targetRotation = new THREE.Euler(0, 0, 0);
        this.baseRotation = new THREE.Euler(0, 0, 0);

        // Random factors for tumble
        this.randomTumbleFactor = new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
        );

        // Parent reference
        this.parentObject = parentObject;

        // Current speed tracking
        this.currentSpeed = velocity.length();

        // Rotation on hit offset (separate from spin/tumble)
        this.hitRotationOffset = 0;

        // Bounce cooldown to prevent infinite split loops
        this.lastBounceTime = 0;

        // Initialize facing based on mode
        this.initializeFacing();
    }

    initializeFacing() {
        switch (settings.facingMode) {
            case 'random':
                this.baseRotation.set(
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2
                );
                break;
            case 'fixed':
                this.baseRotation.set(
                    THREE.MathUtils.degToRad(settings.fixedAngleX),
                    THREE.MathUtils.degToRad(settings.fixedAngleY),
                    THREE.MathUtils.degToRad(settings.fixedAngleZ)
                );
                break;
            case 'camera':
            case 'movement':
            default:
                this.baseRotation.set(0, 0, 0);
                break;
        }
        this.rotation.copy(this.baseRotation);
    }

    // Update ghost trail: add position to history with fading
    updateTrailHistory() {
        if (!settings.trailEnabled || settings.trailStyle !== 'ghost') return;

        this.framesSinceLastTrail++;

        // Only add trail point every N frames based on spacing
        if (this.framesSinceLastTrail >= settings.ghostSpacing) {
            this.framesSinceLastTrail = 0;

            // Add current state to trail
            this.trailHistory.unshift({
                position: this.position.clone(),
                rotation: this.rotation.clone(),
                opacity: 1.0,
                scale: this.scale.clone()
            });

            // Trim to max length
            while (this.trailHistory.length > settings.ghostTrailLength) {
                this.trailHistory.pop();
            }
        }

        // Update opacity/scale for all trail entries
        this.trailHistory.forEach((entry, idx) => {
            entry.opacity = Math.max(0, 1.0 - (idx * settings.ghostOpacityFade));
            const scaleFactor = Math.pow(settings.ghostScaleFade, idx);
            entry.scale.setScalar(settings.objectSize * scaleFactor);
        });
    }

    // Update solid trail: spawn copies based on distance traveled
    updateSolidTrail(trailManager) {
        if (!settings.trailEnabled || settings.trailStyle !== 'solid') return;

        // Calculate distance moved since last trail position
        const dx = this.position.x - this.lastTrailPosition.x;
        const dy = this.position.y - this.lastTrailPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.accumulatedDistance += distance;
        this.lastTrailPosition.copy(this.position);

        // Spawn copies when accumulated distance exceeds spacing
        while (this.accumulatedDistance >= settings.solidTrailSpacing) {
            this.accumulatedDistance -= settings.solidTrailSpacing;
            trailManager.spawnCopy(this.position, this.rotation, this.scale);
        }
    }
}

// ========== OBJECT POOL CLASS ==========
class ObjectPool {
    constructor(maxCount = 100) {
        this.maxCount = maxCount;
        this.instancedMesh = null;
        this.objects = new Map();
        this.freeIndices = [];
        this.dummy = new THREE.Object3D();
        this.activeCount = 0;
    }

    init(geometry, material) {
        const clonedMaterial = material.clone();
        clonedMaterial.side = THREE.DoubleSide;

        this.instancedMesh = new THREE.InstancedMesh(
            geometry,
            clonedMaterial,
            this.maxCount
        );
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.instancedMesh.frustumCulled = false;

        // Initialize all instances as hidden
        for (let i = 0; i < this.maxCount; i++) {
            this.instancedMesh.setMatrixAt(i, zeroMatrix);
            this.freeIndices.push(i);
        }
        this.instancedMesh.instanceMatrix.needsUpdate = true;

        return this.instancedMesh;
    }

    acquire() {
        if (this.freeIndices.length === 0) return null;
        const index = this.freeIndices.pop();
        this.activeCount++;
        return index;
    }

    release(index) {
        this.instancedMesh.setMatrixAt(index, zeroMatrix);
        this.objects.delete(index);
        this.freeIndices.push(index);
        this.activeCount--;
    }

    updateInstance(index, position, rotation, scale) {
        // Position is 2D, set Z to 0
        this.dummy.position.set(position.x, position.y, 0);
        this.dummy.rotation.copy(rotation);
        this.dummy.scale.copy(scale);
        this.dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(index, this.dummy.matrix);
    }

    finishUpdate() {
        if (this.instancedMesh) {
            this.instancedMesh.instanceMatrix.needsUpdate = true;
        }
    }

    canSplit() {
        return this.activeCount < settings.splitMaxObjects && this.freeIndices.length > 0;
    }

    clear() {
        this.objects.forEach((obj, index) => {
            this.release(index);
        });
        this.activeCount = 0;
    }

    updateMaterial(material) {
        if (this.instancedMesh) {
            const clonedMaterial = material.clone();
            clonedMaterial.side = THREE.DoubleSide;
            this.instancedMesh.material = clonedMaterial;
        }
    }

    updateGeometry(geometry) {
        if (this.instancedMesh) {
            this.instancedMesh.geometry = geometry;
        }
    }
}

// ========== TRAIL MANAGER CLASS ==========
// Manages both ghost trails (fading copies) and solid trails (distance-based spawning)
class TrailManager {
    constructor(scene, maxInstances = 2000) {
        this.scene = scene;
        this.maxInstances = maxInstances;

        // Ghost trail pool (for fading copies rendered from trailHistory)
        this.ghostPool = null;
        this.ghostMaterial = null;

        // Solid trail pool (for distance-based spawning)
        this.solidPool = null;
        this.solidMaterial = null;
        this.solidCopies = [];  // Array of {position, rotation, scale, age}

        this.dummy = new THREE.Object3D();
    }

    // === GHOST TRAIL (fading copies) ===
    initGhostPool(geometry, material) {
        // Remove old ghost pool if exists
        if (this.ghostPool) {
            this.scene.remove(this.ghostPool);
            this.ghostPool.geometry.dispose();
            this.ghostPool.material.dispose();
        }

        // Create semi-transparent ghost material
        this.ghostMaterial = material.clone();
        this.ghostMaterial.transparent = true;
        this.ghostMaterial.opacity = 0.5;
        this.ghostMaterial.side = THREE.DoubleSide;

        this.ghostPool = new THREE.InstancedMesh(
            geometry,
            this.ghostMaterial,
            this.maxInstances
        );
        this.ghostPool.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.ghostPool.frustumCulled = false;

        // Put trail on separate layer for selective blur
        this.ghostPool.layers.set(1); // LAYER_TRAIL

        // Initialize as hidden
        for (let i = 0; i < this.maxInstances; i++) {
            this.ghostPool.setMatrixAt(i, zeroMatrix);
        }
        this.ghostPool.instanceMatrix.needsUpdate = true;

        this.scene.add(this.ghostPool);
    }

    updateGhosts(objects) {
        if (settings.trailStyle !== 'ghost' || !this.ghostPool) return;

        let ghostIndex = 0;

        // Clear all ghosts first
        for (let i = 0; i < this.maxInstances; i++) {
            this.ghostPool.setMatrixAt(i, zeroMatrix);
        }

        // Render ghost trails for each object
        objects.forEach((dvdObject) => {
            dvdObject.trailHistory.forEach((trail) => {
                if (ghostIndex >= this.maxInstances) return;
                if (trail.opacity <= 0) return;

                this.dummy.position.set(trail.position.x, trail.position.y, 0);
                this.dummy.rotation.copy(trail.rotation);
                this.dummy.scale.copy(trail.scale).multiplyScalar(trail.opacity);
                this.dummy.updateMatrix();

                this.ghostPool.setMatrixAt(ghostIndex, this.dummy.matrix);
                ghostIndex++;
            });
        });

        this.ghostPool.instanceMatrix.needsUpdate = true;
    }

    // === SOLID TRAIL (distance-based spawning) ===
    initSolidPool(geometry, material) {
        // Remove old solid pool if exists
        if (this.solidPool) {
            this.scene.remove(this.solidPool);
            this.solidPool.geometry.dispose();
            this.solidPool.material.dispose();
        }

        // Create material for trail copies (full opacity, same as main object)
        this.solidMaterial = material.clone();
        this.solidMaterial.side = THREE.DoubleSide;

        this.solidPool = new THREE.InstancedMesh(
            geometry,
            this.solidMaterial,
            this.maxInstances
        );
        this.solidPool.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.solidPool.frustumCulled = false;

        // Put trail on separate layer for selective blur
        this.solidPool.layers.set(1); // LAYER_TRAIL

        // Initialize all instances as hidden
        for (let i = 0; i < this.maxInstances; i++) {
            this.solidPool.setMatrixAt(i, zeroMatrix);
        }
        this.solidPool.instanceMatrix.needsUpdate = true;

        this.scene.add(this.solidPool);
    }

    spawnCopy(position, rotation, scale) {
        // Remove oldest if at max capacity
        if (this.solidCopies.length >= settings.solidTrailMaxCopies) {
            this.solidCopies.shift();
        }

        this.solidCopies.push({
            position: new THREE.Vector3(position.x, position.y, 0),
            rotation: rotation.clone(),
            scale: scale.clone(),
            age: 0
        });
    }

    updateSolid(delta) {
        if (!this.solidPool) return;

        // Age copies and remove expired ones (if lifespan > 0)
        if (settings.solidTrailLifespan > 0) {
            this.solidCopies = this.solidCopies.filter(copy => {
                copy.age += delta;
                return copy.age < settings.solidTrailLifespan;
            });
        }

        // Render all copies to InstancedMesh
        for (let i = 0; i < this.maxInstances; i++) {
            if (i < this.solidCopies.length) {
                const copy = this.solidCopies[i];
                this.dummy.position.copy(copy.position);
                this.dummy.rotation.copy(copy.rotation);
                this.dummy.scale.copy(copy.scale);
                this.dummy.updateMatrix();
                this.solidPool.setMatrixAt(i, this.dummy.matrix);
            } else {
                this.solidPool.setMatrixAt(i, zeroMatrix);
            }
        }
        this.solidPool.instanceMatrix.needsUpdate = true;
    }

    // === COMMON METHODS ===
    updateMaterial(newMaterial) {
        if (this.ghostPool && settings.ghostMaterialInherit) {
            this.ghostMaterial = newMaterial.clone();
            this.ghostMaterial.transparent = true;
            this.ghostMaterial.opacity = 0.5;
            this.ghostMaterial.side = THREE.DoubleSide;
            this.ghostPool.material = this.ghostMaterial;
        }
        if (this.solidPool) {
            this.solidMaterial = newMaterial.clone();
            this.solidMaterial.side = THREE.DoubleSide;
            this.solidPool.material = this.solidMaterial;
        }
    }

    updateGeometry(geometry) {
        if (this.ghostPool) {
            this.ghostPool.geometry = geometry;
        }
        if (this.solidPool) {
            this.solidPool.geometry = geometry;
        }
    }

    clear() {
        // Clear ghost pool
        if (this.ghostPool) {
            for (let i = 0; i < this.maxInstances; i++) {
                this.ghostPool.setMatrixAt(i, zeroMatrix);
            }
            this.ghostPool.instanceMatrix.needsUpdate = true;
        }

        // Clear solid pool
        this.solidCopies = [];
        if (this.solidPool) {
            for (let i = 0; i < this.maxInstances; i++) {
                this.solidPool.setMatrixAt(i, zeroMatrix);
            }
            this.solidPool.instanceMatrix.needsUpdate = true;
        }
    }

    clearTrailHistory(objects) {
        objects.forEach((obj) => {
            obj.trailHistory = [];
            obj.framesSinceLastTrail = 0;
        });
    }
}

// ========== BOUNDS MANAGER CLASS ==========
class BoundsManager {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.bounds = { left: 0, right: 0, top: 0, bottom: 0 };
        this.debugLines = null;
        this.debugVisible = false;
        this.updateBounds();
    }

    createDebugVisualizer() {
        if (this.debugLines) {
            this.scene.remove(this.debugLines);
            this.debugLines.geometry.dispose();
            this.debugLines.material.dispose();
        }

        const points = [
            new THREE.Vector3(this.bounds.left, this.bounds.top, 0),
            new THREE.Vector3(this.bounds.right, this.bounds.top, 0),
            new THREE.Vector3(this.bounds.right, this.bounds.bottom, 0),
            new THREE.Vector3(this.bounds.left, this.bounds.bottom, 0),
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
        this.debugLines = new THREE.LineLoop(geometry, material);
        this.debugLines.visible = this.debugVisible;
        this.scene.add(this.debugLines);
    }

    updateDebugVisualizer() {
        if (!this.debugLines) return;

        const points = [
            new THREE.Vector3(this.bounds.left, this.bounds.top, 0),
            new THREE.Vector3(this.bounds.right, this.bounds.top, 0),
            new THREE.Vector3(this.bounds.right, this.bounds.bottom, 0),
            new THREE.Vector3(this.bounds.left, this.bounds.bottom, 0),
        ];

        this.debugLines.geometry.setFromPoints(points);
        this.debugLines.geometry.attributes.position.needsUpdate = true;
    }

    setDebugVisible(visible) {
        this.debugVisible = visible;
        if (this.debugLines) {
            this.debugLines.visible = visible;
        }
    }

    updateBounds() {
        // For orthographic camera, bounds = visible area
        const zoom = this.camera.zoom || 1;

        // Get frustum dimensions
        const height = (this.camera.top - this.camera.bottom) / zoom;
        const width = (this.camera.right - this.camera.left) / zoom;

        this.bounds = {
            left: -width / 2,
            right: width / 2,
            top: height / 2,
            bottom: -height / 2
        };

        // Update debug visualizer if it exists
        this.updateDebugVisualizer();
    }

    checkBounce(object, objectRadius = 0.5) {
        const bounceResults = {
            bounced: false,
            hitEdge: null,
            newPosition: object.position.clone(),
            newVelocity: object.velocity.clone()
        };

        // Check left/right bounds
        if (object.position.x - objectRadius <= this.bounds.left) {
            bounceResults.bounced = true;
            bounceResults.hitEdge = 'left';
            bounceResults.newPosition.x = this.bounds.left + objectRadius;
            bounceResults.newVelocity.x = Math.abs(object.velocity.x);
        } else if (object.position.x + objectRadius >= this.bounds.right) {
            bounceResults.bounced = true;
            bounceResults.hitEdge = 'right';
            bounceResults.newPosition.x = this.bounds.right - objectRadius;
            bounceResults.newVelocity.x = -Math.abs(object.velocity.x);
        }

        // Check top/bottom bounds
        if (object.position.y + objectRadius >= this.bounds.top) {
            bounceResults.bounced = true;
            bounceResults.hitEdge = 'top';
            bounceResults.newPosition.y = this.bounds.top - objectRadius;
            bounceResults.newVelocity.y = -Math.abs(object.velocity.y);
        } else if (object.position.y - objectRadius <= this.bounds.bottom) {
            bounceResults.bounced = true;
            bounceResults.hitEdge = 'bottom';
            bounceResults.newPosition.y = this.bounds.bottom + objectRadius;
            bounceResults.newVelocity.y = Math.abs(object.velocity.y);
        }

        return bounceResults;
    }

    getHitNormal(edge) {
        switch (edge) {
            case 'left': return new THREE.Vector2(1, 0);
            case 'right': return new THREE.Vector2(-1, 0);
            case 'top': return new THREE.Vector2(0, -1);
            case 'bottom': return new THREE.Vector2(0, 1);
            default: return new THREE.Vector2(0, 0);
        }
    }

    getHitAngle(edge) {
        const normal = this.getHitNormal(edge);
        return Math.atan2(normal.y, normal.x);
    }
}

// ========== INITIALIZATION ==========
function init() {
    console.log('3D DVD Screensaver: Initializing...');

    // Initialize zero matrix (THREE is now available)
    zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        preserveDrawingBuffer: true,
        alpha: true
    });
    // Use CSS dimensions for renderer (it handles pixel ratio internally)
    const width = canvas.cssWidth || canvas.width;
    const height = canvas.cssHeight || canvas.height;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);

    // Create scene
    scene = new THREE.Scene();

    // Create ORTHOGRAPHIC camera
    const aspect = width / height;
    const frustumSize = 10;
    camera = new THREE.OrthographicCamera(
        frustumSize * aspect / -2,
        frustumSize * aspect / 2,
        frustumSize / 2,
        frustumSize / -2,
        0.1,
        1000
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    // Enable camera to see both main (0) and trail (1) layers
    camera.layers.enableAll();

    // Initialize clock
    clock = new THREE.Clock();

    // Initialize MatCap generator
    matcapGenerator = new MatCapGenerator();

    // Initialize managers
    boundsManager = new BoundsManager(camera, scene);
    objectPool = new ObjectPool(settings.splitMaxObjects);
    trailManager = new TrailManager(scene);

    // Create debug visualizer (initially hidden)
    boundsManager.createDebugVisualizer();

    // Create initial material
    createMaterial();

    // Create initial geometry and spawn first object
    createInitialObject();

    // Setup post-processing for AfterImage effect
    setupPostProcessing();

    // Initialize background system
    initBackgroundSystem();

    // Handle window resize
    window.addEventListener('resize', handleResize);

    // Use ResizeObserver for canvas and container (handles chatooly CDN resize bar)
    if (typeof ResizeObserver !== 'undefined') {
        let resizeTimeout = null;
        const debouncedResize = () => {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                console.log('ResizeObserver triggered');
                handleResize();
            }, 50);
        };

        const resizeObserver = new ResizeObserver(debouncedResize);
        
        // Observe canvas itself
        resizeObserver.observe(canvas);
        
        // Also observe container and its parent (chatooly structure)
        if (canvas.parentElement) {
            resizeObserver.observe(canvas.parentElement);
            if (canvas.parentElement.parentElement) {
                resizeObserver.observe(canvas.parentElement.parentElement);
            }
        }
    }

    // Start animation loop
    animate();

    console.log('3D DVD Screensaver: Initialization complete');
}

// ========== MATERIAL CREATION ==========
function createMaterial() {
    let texture;
    const isFlat = settings.shaderMode === 'flat';

    if (settings.materialType === 'solid') {
        // Create solid color matcap
        const stops = [
            { color: settings.solidColor, position: 0 },
            { color: settings.solidColor, position: 100 }
        ];
        texture = matcapGenerator.generate(stops, 'radial', settings.lightPosition, isFlat);
    } else if (settings.materialType === 'gradient') {
        // Use current gradient set
        const gradientSet = settings.gradientSets[settings.activeGradientIndex];
        texture = matcapGenerator.generate(
            gradientSet.stops,
            gradientSet.type,
            settings.lightPosition,
            isFlat
        );
    } else if (settings.materialType === 'matcapUpload' && (window.uploadedMatcapTexture || uploadedMatcapTexture)) {
        texture = window.uploadedMatcapTexture || uploadedMatcapTexture;
    } else {
        // Fallback to solid red
        const stops = [
            { color: '#ff0000', position: 0 },
            { color: '#ff0000', position: 100 }
        ];
        texture = matcapGenerator.generate(stops, 'radial', settings.lightPosition, isFlat);
    }

    const material = new THREE.MeshMatcapMaterial({
        matcap: texture,
        side: THREE.DoubleSide,
        flatShading: settings.shaderMode === 'toon'
    });

    // Custom shader modifications for lighting effects
    material.onBeforeCompile = (shader) => {
        const isFlatMode = settings.shaderMode === 'flat';

        shader.uniforms.rimColor = { value: new THREE.Color(settings.rimColor) };
        shader.uniforms.rimIntensity = { value: isFlatMode ? 0 : settings.rimIntensity };
        shader.uniforms.lightColor = { value: new THREE.Color(settings.lightColor) };
        shader.uniforms.lightIntensity = { value: isFlatMode ? 1.0 : settings.lightIntensity };
        shader.uniforms.flatMode = { value: isFlatMode ? 1 : 0 };
        shader.uniforms.toonMode = { value: settings.shaderMode === 'toon' ? 1 : 0 };

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
            uniform vec3 rimColor;
            uniform float rimIntensity;
            uniform vec3 lightColor;
            uniform float lightIntensity;
            uniform int toonMode;
            uniform int flatMode;`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <opaque_fragment>',
            `if (flatMode == 0) {
                outgoingLight *= lightColor * lightIntensity;
                if (toonMode == 1) {
                    outgoingLight = floor(outgoingLight * 4.0) / 4.0;
                }
                vec3 rimViewDir = normalize(vViewPosition);
                float rimFactor = 1.0 - max(0.0, dot(normal, rimViewDir));
                rimFactor = pow(rimFactor, 2.0);
                outgoingLight += rimColor * rimFactor * rimIntensity;
            }
            #include <opaque_fragment>`
        );

        material.userData.shader = shader;
    };

    customMaterial = material;
    loadedMaterial = material;

    return material;
}

function applyCurrentMaterial() {
    createMaterial();

    if (objectPool && objectPool.instancedMesh) {
        objectPool.updateMaterial(customMaterial);
    }

    if (trailManager && settings.ghostMaterialInherit) {
        trailManager.updateMaterial(customMaterial);
    }
}

// ========== GEOMETRY CREATION ==========
function createPrimitiveGeometry(type) {
    const size = settings.objectSize;

    switch (type) {
        case 'sphere':
            return new THREE.SphereGeometry(size * 0.5, 32, 32);
        case 'torus':
            return new THREE.TorusGeometry(size * 0.4, size * 0.15, 16, 100);
        case 'cone':
            return new THREE.ConeGeometry(size * 0.5, size, 32);
        case 'cylinder':
            return new THREE.CylinderGeometry(size * 0.3, size * 0.3, size, 32);
        case 'cube':
        default:
            return new THREE.BoxGeometry(size, size, size);
    }
}

function createInitialObject() {
    // Create geometry based on source
    if (settings.objectSource === 'primitive') {
        loadedGeometry = createPrimitiveGeometry(settings.primitiveType);
    } else if (loadedGeometry) {
        // Use already loaded GLB geometry
    } else {
        // Fallback to cube
        loadedGeometry = createPrimitiveGeometry('cube');
    }

    // Initialize pools with geometry and material
    const mesh = objectPool.init(loadedGeometry, loadedMaterial);
    scene.add(mesh);

    // Initialize trail manager based on style
    if (settings.trailEnabled) {
        if (settings.trailStyle === 'ghost') {
            trailManager.initGhostPool(loadedGeometry, loadedMaterial);
        } else if (settings.trailStyle === 'solid') {
            trailManager.initSolidPool(loadedGeometry, loadedMaterial);
        }
    }

    isModelLoaded = true;

    // Spawn first DVD object
    spawnDVDObject();
}

// ========== GLB LOADING ==========
async function loadGLBFromURL(url, modelName = 'model') {
    const LoaderClass = window.GLTFLoader;
    if (!LoaderClass) {
        console.error('GLTFLoader not available');
        return null;
    }

    const loader = new LoaderClass();
    return new Promise((resolve, reject) => {
        loader.load(url,
            (gltf) => {
                let mesh = null;
                gltf.scene.traverse((child) => {
                    if (child.isMesh && !mesh) mesh = child;
                });

                if (!mesh) {
                    reject(new Error('No mesh found in GLB'));
                    return;
                }

                // Normalize size and center geometry
                loadedGeometry = mesh.geometry.clone();
                loadedGeometry.computeBoundingBox();
                loadedGeometry.center();

                // Scale to unit size
                const box = loadedGeometry.boundingBox;
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = settings.objectSize / maxDim;
                loadedGeometry.scale(scale, scale, scale);

                // Update pools
                objectPool.updateGeometry(loadedGeometry);
                if (settings.trailEnabled && settings.trailMode === 'ghost') {
                    trailManager.updateGeometry(loadedGeometry);
                }

                settings.objectSource = 'glb';
                isModelLoaded = true;

                console.log('GLB loaded:', modelName);
                resolve({ geometry: loadedGeometry, name: modelName });
            },
            (progress) => {
                console.log('Loading:', Math.round(progress.loaded / progress.total * 100) + '%');
            },
            (error) => reject(error)
        );
    });
}

async function loadGLBModel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
                const url = URL.createObjectURL(blob);
                const result = await loadGLBFromURL(url, file.name);
                URL.revokeObjectURL(url);
                resolve(result);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// ========== DVD OBJECT SPAWNING ==========
function spawnDVDObject(position = null, velocity = null, parentObject = null) {
    const index = objectPool.acquire();
    if (index === null) return null;

    // Calculate start position
    let startPos;
    if (position) {
        startPos = position;
    } else if (settings.startPosition === 'center') {
        startPos = new THREE.Vector2(0, 0);
    } else {
        // Random position within bounds
        const margin = settings.objectSize;
        startPos = new THREE.Vector2(
            (Math.random() - 0.5) * (boundsManager.bounds.right - boundsManager.bounds.left - margin * 2),
            (Math.random() - 0.5) * (boundsManager.bounds.top - boundsManager.bounds.bottom - margin * 2)
        );
    }

    // Calculate velocity
    let startVelocity;
    if (velocity) {
        startVelocity = velocity;
    } else {
        // Random direction based on speed settings
        const dirX = settings.speedX * (Math.random() > 0.5 ? 1 : -1);
        const dirY = settings.speedY * (Math.random() > 0.5 ? 1 : -1);
        startVelocity = new THREE.Vector2(dirX, dirY).normalize().multiplyScalar(settings.initialSpeed);
    }

    const dvdObject = new DVDObject(index, startPos, startVelocity, parentObject);
    dvdObject.scale.setScalar(settings.objectSize);
    dvdObject.lastBounceTime = performance.now(); // Prevent immediate collision on spawn
    objectPool.objects.set(index, dvdObject);

    // Update instance
    objectPool.updateInstance(index, dvdObject.position, dvdObject.rotation, dvdObject.scale);

    return dvdObject;
}

// ========== BOUNCE EFFECTS ==========
function handleSpeedIncrease(object) {
    if (!settings.speedIncreaseEnabled) return;

    const currentSpeed = object.velocity.length();
    if (currentSpeed < settings.speedMaxCap) {
        const newSpeed = Math.min(currentSpeed + settings.speedIncreaseAmount, settings.speedMaxCap);
        object.velocity.normalize().multiplyScalar(newSpeed);
        object.currentSpeed = newSpeed;
    }
}

function handleSplit(parentObject, bounceResult) {
    if (!settings.splitEnabled || !objectPool.canSplit()) return;

    // Get the bounce velocity direction and speed
    const speed = bounceResult.newVelocity.length();
    const baseAngle = Math.atan2(bounceResult.newVelocity.y, bounceResult.newVelocity.x);

    // Divergence angle: 20-30 degrees in opposite directions
    const divergeAngle = (20 + Math.random() * 10) * Math.PI / 180;

    // Child goes one direction (negative angle offset)
    const childAngle = baseAngle - divergeAngle;
    const splitVelocity = new THREE.Vector2(
        Math.cos(childAngle) * speed,
        Math.sin(childAngle) * speed
    );

    // Parent goes the other direction (positive angle offset)
    const parentAngle = baseAngle + divergeAngle;
    parentObject.velocity.set(
        Math.cos(parentAngle) * speed,
        Math.sin(parentAngle) * speed
    );

    // Velocity fallback: ensure minimum speed
    const minSpeed = settings.initialSpeed * 0.5;
    if (splitVelocity.length() < minSpeed) {
        splitVelocity.normalize().multiplyScalar(minSpeed);
    }
    if (parentObject.velocity.length() < minSpeed) {
        parentObject.velocity.normalize().multiplyScalar(minSpeed);
    }

    // Spawn at bounce position (cooldown prevents immediate re-collision)
    spawnDVDObject(bounceResult.newPosition.clone(), splitVelocity, parentObject);
}

function handleRotationOnHit(object, hitEdge, delta) {
    if (!settings.rotationOnHitEnabled) return;

    const hitAngle = boundsManager.getHitAngle(hitEdge);

    if (settings.rotationOnHitMode === 'snap') {
        // Snap directly to hit angle
        object.hitRotationOffset = hitAngle;
    } else {
        // Smooth lerp toward hit direction
        const currentAngle = object.hitRotationOffset;
        const angleDiff = hitAngle - currentAngle;
        const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        object.hitRotationOffset += normalizedDiff * settings.rotationLerpSpeed * delta;
    }
}

// ========== OBJECT BEHAVIOR ==========
function updateFacing(object, delta) {
    switch (settings.facingMode) {
        case 'camera':
            // Face forward (no rotation needed for 2D orthographic view)
            // Keep base rotation
            break;

        case 'movement':
            const angle = Math.atan2(object.velocity.y, object.velocity.x);
            if (settings.facingLerpEnabled) {
                const currentAngle = object.baseRotation.z;
                const diff = angle - currentAngle;
                const normalizedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
                object.baseRotation.z += normalizedDiff * settings.facingLerpSpeed * delta;
            } else {
                object.baseRotation.z = angle;
            }
            break;

        case 'fixed':
            object.baseRotation.set(
                THREE.MathUtils.degToRad(settings.fixedAngleX),
                THREE.MathUtils.degToRad(settings.fixedAngleY),
                THREE.MathUtils.degToRad(settings.fixedAngleZ)
            );
            break;

        case 'random':
            // Keep initial random rotation
            break;
    }
}

function updateRotation(object, delta) {
    // Apply spin
    if (settings.spinEnabled) {
        object.spinOffset.y += settings.spinSpeed * delta;
    }

    // Apply tumble
    if (settings.tumbleEnabled) {
        object.spinOffset.x += settings.tumbleSpeed * object.randomTumbleFactor.x * delta;
        object.spinOffset.y += settings.tumbleSpeed * object.randomTumbleFactor.y * delta;
        object.spinOffset.z += settings.tumbleSpeed * object.randomTumbleFactor.z * delta;
    }

    // Combine base rotation with spin offset and hit rotation offset
    object.rotation.x = object.baseRotation.x + object.spinOffset.x;
    object.rotation.y = object.baseRotation.y + object.spinOffset.y;
    object.rotation.z = object.baseRotation.z + object.spinOffset.z + object.hitRotationOffset;
}

// ========== MAIN UPDATE LOOP ==========
function updateDVDObjects(delta) {
    const objectsToSplit = [];

    const currentTime = performance.now();
    const bounceCooldown = 100; // ms - prevents re-bounce within same collision event

    objectPool.objects.forEach((object, index) => {
        // Update position based on velocity
        object.position.x += object.velocity.x * delta;
        object.position.y += object.velocity.y * delta;

        // Check for bounces (skip if recently bounced to prevent infinite split loops)
        const objectRadius = settings.objectSize * 0.5;
        const canBounce = (currentTime - object.lastBounceTime) >= bounceCooldown;
        const bounceResult = canBounce ? boundsManager.checkBounce(object, objectRadius) : { bounced: false };

        if (bounceResult.bounced) {
            // Update cooldown timestamp
            object.lastBounceTime = currentTime;

            // Apply bounce
            object.position.copy(bounceResult.newPosition);
            object.velocity.copy(bounceResult.newVelocity);

            // Speed increase effect
            handleSpeedIncrease(object);

            // Queue split (process after iteration)
            if (settings.splitEnabled) {
                objectsToSplit.push({ object, bounceResult });
            }

            // Rotation on hit
            handleRotationOnHit(object, bounceResult.hitEdge, delta);
        }

        // Update facing
        updateFacing(object, delta);

        // Update spin/tumble
        updateRotation(object, delta);

        // Update instance matrix
        objectPool.updateInstance(index, object.position, object.rotation, object.scale);
    });

    // Process splits after iteration to avoid modifying collection during iteration
    objectsToSplit.forEach(({ object, bounceResult }) => {
        handleSplit(object, bounceResult);
    });

    objectPool.finishUpdate();
}

// ========== POST-PROCESSING SETUP ==========
// Layer constants for separating main object from trail
const LAYER_MAIN = 0;      // Default layer for main bouncing objects
const LAYER_TRAIL = 1;     // Separate layer for trail copies

function setupPostProcessing() {
    if (!window.EffectComposer || !window.RenderPass || !window.AfterimagePass) {
        console.warn('Post-processing modules not loaded, falling back to standard rendering');
        return;
    }

    // Create composer for trail blur effect
    composer = new window.EffectComposer(renderer);

    // Render pass for the scene
    const renderPass = new window.RenderPass(scene, camera);
    composer.addPass(renderPass);

    // AfterImage pass for blur effect on trails
    afterImagePass = new window.AfterimagePass();
    afterImagePass.uniforms['damp'].value = 0.0; // Start with no blur
    composer.addPass(afterImagePass);

    // Output pass for correct color space
    if (window.OutputPass) {
        const outputPass = new window.OutputPass();
        composer.addPass(outputPass);
    }

    console.log('Post-processing initialized');
}

function updateAfterImageEffect() {
    if (!afterImagePass) return;

    // Post-process blur only applies to ghost trail when enabled
    if (settings.trailEnabled && settings.trailStyle === 'ghost' && settings.trailPostProcess) {
        afterImagePass.uniforms['damp'].value = settings.postProcessDamp;
    } else {
        afterImagePass.uniforms['damp'].value = 0.0;
    }
}

// ========== ANIMATION LOOP ==========
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // Update all DVD objects
    updateDVDObjects(delta);

    // Update trail based on style
    if (settings.trailEnabled) {
        if (settings.trailStyle === 'ghost') {
            // Ghost trail: update trail history for each object, then render
            objectPool.objects.forEach((object) => {
                object.updateTrailHistory();
            });
            trailManager.updateGhosts(objectPool.objects);
        } else if (settings.trailStyle === 'solid') {
            // Solid trail: spawn copies based on distance traveled
            objectPool.objects.forEach((object) => {
                object.updateSolidTrail(trailManager);
            });
            trailManager.updateSolid(delta);
        }
    }

    // Update AfterImage effect based on settings
    updateAfterImageEffect();

    // Render with selective blur on ghost trail only
    const usePostProcess = composer && settings.trailEnabled && settings.trailStyle === 'ghost' && settings.trailPostProcess;

    if (usePostProcess) {
        // Two-pass rendering: ghost trail with blur, then main object on top

        // Pass 1: Render trail layer only with blur effect
        camera.layers.set(1); // Only see LAYER_TRAIL
        composer.render();

        // Pass 2: Render main object layer on top (no clearing, blend on top)
        camera.layers.set(0); // Only see LAYER_MAIN
        renderer.autoClear = false;
        renderer.render(scene, camera);
        renderer.autoClear = true;

        // Reset camera to see all layers
        camera.layers.enableAll();
    } else {
        // Standard rendering: see all layers
        camera.layers.enableAll();
        renderer.render(scene, camera);
    }
}

// ========== RESIZE HANDLER ==========
function handleResize() {
    setCanvasDimensions();

    // Use CSS dimensions for aspect ratio (not DPR-scaled)
    const width = canvas.cssWidth || canvas.width;
    const height = canvas.cssHeight || canvas.height;
    const aspect = width / height;
    const frustumSize = 10;

    // Update camera frustum
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();

    console.log('handleResize called: width=' + width + ', height=' + height + ', aspect=' + aspect.toFixed(3));
    console.log('Camera frustum: left=' + camera.left.toFixed(2) + ', right=' + camera.right.toFixed(2) + ', top=' + camera.top.toFixed(2) + ', bottom=' + camera.bottom.toFixed(2));

    // Renderer uses CSS dimensions, internally scales by pixel ratio
    renderer.setSize(width, height);

    // Update post-processing composer size
    if (composer) {
        composer.setSize(width, height);
    }

    // Update bounds AFTER camera is updated
    if (boundsManager) {
        boundsManager.updateBounds();
        console.log('Bounds updated:', boundsManager.bounds);
    }

    // Update background for new size
    updateBackground();
}

// ========== UTILITY FUNCTIONS ==========
function clearCanvas() {
    objectPool.clear();
    trailManager.clear();
}

function resetToDefaults() {
    clearCanvas();
    spawnDVDObject();
}

function changePrimitive(type) {
    settings.primitiveType = type;
    settings.objectSource = 'primitive';

    loadedGeometry = createPrimitiveGeometry(type);
    objectPool.updateGeometry(loadedGeometry);

    if (settings.trailEnabled && settings.trailMode === 'ghost') {
        trailManager.updateGeometry(loadedGeometry);
    }
}

function updateObjectSize(size) {
    settings.objectSize = size;

    // Recreate geometry with new size
    if (settings.objectSource === 'primitive') {
        loadedGeometry = createPrimitiveGeometry(settings.primitiveType);
        objectPool.updateGeometry(loadedGeometry);
        if (settings.trailEnabled && settings.trailMode === 'ghost') {
            trailManager.updateGeometry(loadedGeometry);
        }
    }

    // Update existing objects
    objectPool.objects.forEach((object) => {
        object.scale.setScalar(size);
    });
}

function toggleTrail(enabled) {
    settings.trailEnabled = enabled;

    if (enabled) {
        // Initialize the appropriate trail pool
        if (settings.trailStyle === 'ghost') {
            trailManager.initGhostPool(loadedGeometry, loadedMaterial);
        } else if (settings.trailStyle === 'solid') {
            trailManager.initSolidPool(loadedGeometry, loadedMaterial);
        }
    } else {
        // Clear trail data
        trailManager.clear();
        trailManager.clearTrailHistory(objectPool.objects);
    }

    // Reset tracking for all objects
    objectPool.objects.forEach((object) => {
        object.accumulatedDistance = 0;
        object.lastTrailPosition.copy(object.position);
        object.trailHistory = [];
        object.framesSinceLastTrail = 0;
    });
}

function setTrailStyle(style) {
    settings.trailStyle = style;

    // Clear existing trails
    trailManager.clear();
    trailManager.clearTrailHistory(objectPool.objects);

    // Initialize the new trail style if enabled
    if (settings.trailEnabled) {
        if (style === 'ghost') {
            trailManager.initGhostPool(loadedGeometry, loadedMaterial);
        } else if (style === 'solid') {
            trailManager.initSolidPool(loadedGeometry, loadedMaterial);
        }
    }

    // Reset tracking for all objects
    objectPool.objects.forEach((object) => {
        object.accumulatedDistance = 0;
        object.lastTrailPosition.copy(object.position);
        object.trailHistory = [];
        object.framesSinceLastTrail = 0;
    });
}

// ========== HIGH-RES EXPORT ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!isModelLoaded) {
        console.warn('Not ready for export');
        return;
    }

    const ctx = targetCanvas.getContext('2d');
    const exportWidth = targetCanvas.width;
    const exportHeight = targetCanvas.height;

    // Draw background first (at export resolution)
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.drawToCanvas(ctx, exportWidth, exportHeight);
    }

    // Render Three.js scene at scaled resolution
    const oldSize = renderer.getSize(new THREE.Vector2());
    renderer.setSize(oldSize.x * scale, oldSize.y * scale);

    renderer.render(scene, camera);

    // Draw Three.js content on top of background
    ctx.drawImage(
        renderer.domElement,
        0, 0,
        oldSize.x * scale, oldSize.y * scale,
        0, 0,
        exportWidth, exportHeight
    );

    renderer.setSize(oldSize.x, oldSize.y);
};

// ========== DEBUG FUNCTIONS ==========
function toggleDebugBounds(visible) {
    settings.debugBoundsVisible = visible;
    if (boundsManager) {
        boundsManager.setDebugVisible(visible);
    }
}

// ========== BACKGROUND SYSTEM ==========
function initBackgroundSystem() {
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.init(canvas);
    }

    // Wire up background controls
    const transparentToggle = document.getElementById('transparent-bg');
    const bgColor = document.getElementById('bg-color');
    const bgImage = document.getElementById('bg-image');
    const clearBgImage = document.getElementById('clear-bg-image');
    const bgFit = document.getElementById('bg-fit');

    if (transparentToggle) {
        transparentToggle.addEventListener('click', () => {
            // Toggle the aria-pressed state
            const wasPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
            const isPressed = !wasPressed;
            transparentToggle.setAttribute('aria-pressed', isPressed);

            if (window.Chatooly && window.Chatooly.backgroundManager) {
                Chatooly.backgroundManager.setTransparent(isPressed);
            }
            // Hide/show color picker based on transparency
            const bgColorGroup = document.getElementById('bg-color-group');
            if (bgColorGroup) {
                bgColorGroup.style.display = isPressed ? 'none' : 'block';
            }
            updateBackground();
        });
    }

    if (bgColor) {
        bgColor.addEventListener('input', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                Chatooly.backgroundManager.setBackgroundColor(e.target.value);
            }
            updateBackground();
        });
    }

    if (bgImage) {
        bgImage.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                if (window.Chatooly && window.Chatooly.backgroundManager) {
                    await Chatooly.backgroundManager.setBackgroundImage(file);
                }
                if (clearBgImage) clearBgImage.style.display = 'block';
                const bgFitGroup = document.getElementById('bg-fit-group');
                if (bgFitGroup) bgFitGroup.style.display = 'block';
                updateBackground();
            } catch (error) {
                console.error('Failed to load background image:', error);
            }
        });
    }

    if (clearBgImage) {
        clearBgImage.addEventListener('click', () => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                Chatooly.backgroundManager.clearBackgroundImage();
            }
            clearBgImage.style.display = 'none';
            const bgFitGroup = document.getElementById('bg-fit-group');
            if (bgFitGroup) bgFitGroup.style.display = 'none';
            if (bgImage) bgImage.value = '';
            updateBackground();
        });
    }

    if (bgFit) {
        bgFit.addEventListener('change', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                Chatooly.backgroundManager.setFit(e.target.value);
            }
            updateBackground();
        });
    }

    // Initial background update
    updateBackground();
}

function updateBackground() {
    if (!window.Chatooly || !window.Chatooly.backgroundManager) {
        renderer.setClearColor(0x000000, 1);
        return;
    }

    const bg = Chatooly.backgroundManager.getBackgroundState();

    // Handle transparent background
    if (bg.bgTransparent) {
        renderer.setClearAlpha(0);
        scene.background = null;
        if (backgroundTexture) {
            backgroundTexture.dispose();
            backgroundTexture = null;
        }
        return;
    }

    // Handle background image
    if (bg.bgImage && bg.bgImageURL) {
        // Dispose old texture
        if (backgroundTexture) {
            backgroundTexture.dispose();
            backgroundTexture = null;
        }

        const canvasWidth = renderer.domElement.width;
        const canvasHeight = renderer.domElement.height;
        const dims = Chatooly.backgroundManager.calculateImageDimensions(canvasWidth, canvasHeight);

        // Create canvas texture
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;
        const ctx = tempCanvas.getContext('2d');

        // Fill with bg color first
        ctx.fillStyle = bg.bgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw image
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, dims.offsetX, dims.offsetY, dims.drawWidth, dims.drawHeight);
            backgroundTexture = new THREE.CanvasTexture(tempCanvas);
            backgroundTexture.needsUpdate = true;
            scene.background = backgroundTexture;

            const color = new THREE.Color(bg.bgColor);
            renderer.setClearColor(color, 1);
            renderer.setClearAlpha(1);
        };
        img.onerror = () => {
            const color = new THREE.Color(bg.bgColor);
            renderer.setClearColor(color, 1);
            renderer.setClearAlpha(1);
            scene.background = null;
        };
        img.src = bg.bgImageURL;
    } else {
        // Solid color background
        const color = new THREE.Color(bg.bgColor);
        renderer.setClearColor(color, 1);
        renderer.setClearAlpha(1);
        scene.background = null;

        // Clean up old texture
        if (backgroundTexture) {
            backgroundTexture.dispose();
            backgroundTexture = null;
        }
    }
}

// ========== LIVE SPEED UPDATE ==========
function updateAllObjectSpeeds(newSpeed) {
    settings.initialSpeed = newSpeed;

    // Update all existing objects' velocities
    objectPool.objects.forEach((object) => {
        // Normalize velocity and multiply by new speed
        const currentSpeed = object.velocity.length();
        if (currentSpeed > 0) {
            object.velocity.normalize().multiplyScalar(newSpeed);
            object.currentSpeed = newSpeed;
        }
    });
}

// ========== EXPORT TO GLOBAL SCOPE ==========
window.dvdScreensaver = {
    settings,
    loadGLBModel,
    loadGLBFromURL,
    clearCanvas,
    resetToDefaults,
    changePrimitive,
    updateObjectSize,
    toggleTrail,
    setTrailStyle,
    applyCurrentMaterial,
    spawnDVDObject,
    toggleDebugBounds,
    updateAllObjectSpeeds,
    renderHighResolution: window.renderHighResolution,
    get trailManager() { return trailManager; }
};

// ========== INITIALIZE ON LOAD ==========
// Wait for Three.js module to load (ES Module pattern)
if (window.THREE) {
    init();
} else {
    window.addEventListener('three-ready', init);
}
