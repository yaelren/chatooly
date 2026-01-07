/*
 * 3D Trail Tool - Main Logic
 * Author: Claude Code
 *
 * Creates trails of 3D objects following mouse movement.
 * Uses Three.js with InstancedMesh for performance.
 */

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');

// Set canvas dimensions - use CSS size if available, otherwise default
function setCanvasDimensions() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Use CSS size if canvas has been styled, otherwise use defaults
    if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
    } else {
        canvas.width = 1920;
        canvas.height = 1080;
    }
    console.log('3D Trail: Canvas dimensions set to', canvas.width, 'x', canvas.height);
}

setCanvasDimensions();

// ========== SETTINGS ==========
const settings = {
    // Trail settings
    density: 20,
    size: 1.0,           // Single size value (used when randomSize and sizeBySpeed are OFF)
    sizeMin: 0.5,
    sizeMax: 1.5,
    randomSize: false,   // Random size within min/max range
    sizeBySpeed: false,  // Size varies with mouse speed
    lifespan: 3.0,
    exitDuration: 1.0,
    disappearMode: 'fade',

    // Movement
    floatEnabled: false,
    floatStyle: 'oscillate',  // 'oscillate', 'random', 'perlin'
    floatAmplitude: 0.3,
    followEnabled: false,
    followStrength: 0.1,

    // Object facing
    facingMode: 'billboard',
    fixedAngleX: 0,
    fixedAngleY: 0,
    fixedAngleZ: 0,

    // Physics
    gravityEnabled: false,
    gravityStrength: 9.8,
    spinEnabled: false,
    spinSpeed: 1.0,
    tumbleEnabled: false,
    tumbleSpeed: 1.0,
    bounceEnabled: true,  // Bounce is always on when gravity is enabled
    bounceHeight: -3,
    bounceAmount: 0.6,

    // Camera
    cameraX: 0,
    cameraY: 0,
    cameraZ: 10,
    cameraFOV: 65,

    // Material settings (MatCap style)
    materialEnabled: false,
    shaderMode: 'reflective',  // 'reflective' or 'toon' - shared across all gradients

    // Gradient sets - always at least 1
    gradientSets: [
        {
            name: 'Gradient 1',
            stops: [
                { color: '#ff6b6b', position: 0 },
                { color: '#4ecdc4', position: 50 },
                { color: '#45b7d1', position: 100 }
            ],
            type: 'radial'  // Each gradient has its own type
        }
    ],
    activeGradientIndex: 0,  // Currently editing/selected gradient

    // Multi-gradient settings (only used when gradientSets.length >= 2)
    multiGradientMode: 'random',  // 'random' | 'time'
    gradientCycleSpeed: 1.0,

    // Lighting (shared)
    lightColor: '#ffffff',
    lightPosition: 0.5,
    lightIntensity: 1.0,
    rimEnabled: true,
    rimColor: '#ffffff',
    rimIntensity: 0.5
};

// ========== THREE.JS SETUP ==========
let renderer, scene, camera;
let pointerPlane, raycaster, pointer;
let clock;
let backgroundTexture = null;

// ========== PARTICLE SYSTEM ==========
let particlePool = null;
let loadedGeometry = null;
let loadedMaterial = null;
let isModelLoaded = false;

// ========== MATCAP MATERIAL SYSTEM ==========
let matcapGenerator = null;
let customMaterial = null;
let originalMaterial = null;  // Store original for toggling back

// ========== GRADIENT LERPING SYSTEM (for time-based transitions) ==========
let gradientTextures = [];  // Pre-generated textures for all gradients
let currentGradientA = 0;   // Index of gradient A in blend
let currentGradientB = 1;   // Index of gradient B in blend
let gradientMixRatio = 0;   // 0 = fully A, 1 = fully B
let gradientTransitionTime = 0;  // Time tracking for smooth transitions

// ========== MULTI-GRADIENT PARTICLE SYSTEM ==========
// For random per-particle gradients, we use multiple InstancedMeshes (one per gradient)
let gradientPools = [];  // Array of { pool: ParticlePool, material: Material, mesh: InstancedMesh }
let useMultiGradientPools = false;

// ========== DEFAULT MODEL ==========
const DEFAULT_MODEL_PATH = 'assets/musa.glb';

// ========== MOUSE STATE ==========
let isMouseDown = false;
let lastMousePos = { x: 0, y: 0 };
let currentMousePos = { x: 0, y: 0 };
let currentMouseWorldPos = null;  // World position for face mouse mode (initialized in init())
let mouseSpeed = 0;
let lastSpawnTime = 0;
let lastMoveDirection = { x: 0, y: 0 };

// ========== PARTICLE POOL CLASS ==========
class ParticlePool {
    constructor(maxCount = 1000) {
        this.maxCount = maxCount;
        this.instancedMesh = null;
        this.particles = new Map();
        this.freeIndices = [];
        this.dummy = new THREE.Object3D();
        this.activeCount = 0;
    }

    init(geometry, material) {
        // Clone material and make it double-sided for better visibility
        const clonedMaterial = material.clone();
        clonedMaterial.side = THREE.DoubleSide;

        this.instancedMesh = new THREE.InstancedMesh(
            geometry,
            clonedMaterial,
            this.maxCount
        );
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.instancedMesh.frustumCulled = false;

        // Initialize all instances as hidden (scale 0)
        const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
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
        const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
        this.instancedMesh.setMatrixAt(index, zeroMatrix);
        this.particles.delete(index);
        this.freeIndices.push(index);
        this.activeCount--;
    }

    updateInstance(index, position, rotation, scale) {
        this.dummy.position.copy(position);
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

    clear() {
        this.particles.forEach((particle, index) => {
            this.release(index);
        });
    }
}

// ========== PARTICLE CLASS ==========
class Particle {
    constructor(index, position, moveDirection) {
        this.index = index;
        this.position = position.clone();
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.angularVelocity = new THREE.Vector3(0, 0, 0);
        this.spinOffset = new THREE.Vector3(0, 0, 0);  // Accumulated spin/tumble offset
        this.scale = new THREE.Vector3(1, 1, 1);
        this.initialScale = 1;
        this.age = 0;
        this.lifespan = settings.lifespan;
        this.moveDirection = moveDirection ? moveDirection.clone() : new THREE.Vector2(1, 0);
        this.spawnTime = clock ? clock.getElapsedTime() : 0;  // For float phase offset
        this.phaseOffset = Math.random() * Math.PI * 2;  // Random phase for organic feel

        // Set initial angular velocity based on settings
        if (settings.tumbleEnabled) {
            this.angularVelocity.set(
                (Math.random() - 0.5) * 4 * settings.tumbleSpeed,
                (Math.random() - 0.5) * 4 * settings.tumbleSpeed,
                (Math.random() - 0.5) * 4 * settings.tumbleSpeed
            );
        }
        if (settings.spinEnabled) {
            this.angularVelocity.y += settings.spinSpeed;
        }

        // Set initial rotation based on facing mode
        this.setInitialRotation();
    }

    setInitialRotation() {
        switch (settings.facingMode) {
            case 'random':
                this.rotation.set(
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2
                );
                break;
            case 'fixed':
                this.rotation.set(
                    THREE.MathUtils.degToRad(settings.fixedAngleX),
                    THREE.MathUtils.degToRad(settings.fixedAngleY),
                    THREE.MathUtils.degToRad(settings.fixedAngleZ)
                );
                break;
            case 'mouse':
                // Will be updated each frame to face mouse position
                break;
            case 'billboard':
            default:
                // Will be updated each frame to face camera
                break;
        }
    }
}

// ========== INITIALIZATION ==========
function init() {
    console.log('3D Trail: Initializing...');

    // Initialize mouse world position vector (must be done after THREE is loaded)
    currentMouseWorldPos = new THREE.Vector3();

    // Make sure canvas has dimensions
    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = 1920;
        canvas.height = 1080;
    }

    // Create renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        preserveDrawingBuffer: true,
        alpha: true
    });
    renderer.setSize(canvas.width, canvas.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xffffff, 1);

    console.log('3D Trail: Renderer created, canvas size:', canvas.width, 'x', canvas.height);

    // Set canvas display style to fill container
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    // Create scene
    scene = new THREE.Scene();

    // Create camera - perspective for depth effect
    camera = new THREE.PerspectiveCamera(
        65,
        canvas.width / canvas.height,
        0.1,
        1000
    );
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, -5, 5);
    scene.add(directionalLight2);

    // Create invisible plane for raycasting
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    const planeMaterial = new THREE.MeshBasicMaterial({
        visible: false,
        side: THREE.DoubleSide
    });
    pointerPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    pointerPlane.position.z = 0;
    scene.add(pointerPlane);

    // Setup raycaster
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    // Setup clock for delta time
    clock = new THREE.Clock();

    // Initialize particle pool
    particlePool = new ParticlePool(1000);

    // Setup event listeners
    setupEventListeners();

    // Initialize background system
    initBackgroundSystem();

    // Initialize material system
    initMaterialSystem();

    // Start animation loop
    animate();

    // Load default model
    loadDefaultModel();

    console.log('3D Trail: Initialization complete.');
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Mouse events
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);

    // Touch events for mobile
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);

    // Canvas resize
    document.addEventListener('chatooly:canvas-resized', onCanvasResized);
}

function onMouseDown(e) {
    isMouseDown = true;
    updateMousePosition(e);
    lastMousePos.x = currentMousePos.x;
    lastMousePos.y = currentMousePos.y;
    lastSpawnTime = performance.now();
}

function onMouseMove(e) {
    const prevX = currentMousePos.x;
    const prevY = currentMousePos.y;
    updateMousePosition(e);

    // Calculate mouse speed and direction
    const dx = currentMousePos.x - prevX;
    const dy = currentMousePos.y - prevY;
    mouseSpeed = Math.sqrt(dx * dx + dy * dy);

    if (mouseSpeed > 0.1) {
        lastMoveDirection.x = dx / mouseSpeed;
        lastMoveDirection.y = dy / mouseSpeed;
    }
}

function onMouseUp() {
    isMouseDown = false;
}

function onMouseLeave() {
    isMouseDown = false;
}

function onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        isMouseDown = true;
        updateMousePositionFromTouch(e.touches[0]);
        lastMousePos.x = currentMousePos.x;
        lastMousePos.y = currentMousePos.y;
        lastSpawnTime = performance.now();
    }
}

function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        const prevX = currentMousePos.x;
        const prevY = currentMousePos.y;
        updateMousePositionFromTouch(e.touches[0]);

        const dx = currentMousePos.x - prevX;
        const dy = currentMousePos.y - prevY;
        mouseSpeed = Math.sqrt(dx * dx + dy * dy);

        if (mouseSpeed > 0.1) {
            lastMoveDirection.x = dx / mouseSpeed;
            lastMoveDirection.y = dy / mouseSpeed;
        }
    }
}

function onTouchEnd() {
    isMouseDown = false;
}

function updateMousePosition(e) {
    let coords;
    if (window.Chatooly && window.Chatooly.utils && window.Chatooly.utils.mapMouseToCanvas) {
        coords = window.Chatooly.utils.mapMouseToCanvas(e, canvas);
    } else {
        coords = fallbackMouseMapping(e);
    }

    currentMousePos.x = coords.x;
    currentMousePos.y = coords.y;

    // Convert to normalized device coordinates
    pointer.x = (coords.x / canvas.width) * 2 - 1;
    pointer.y = -(coords.y / canvas.height) * 2 + 1;
}

function updateMousePositionFromTouch(touch) {
    const rect = canvas.getBoundingClientRect();
    const displayX = touch.clientX - rect.left;
    const displayY = touch.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    currentMousePos.x = displayX * scaleX;
    currentMousePos.y = displayY * scaleY;

    pointer.x = (currentMousePos.x / canvas.width) * 2 - 1;
    pointer.y = -(currentMousePos.y / canvas.height) * 2 + 1;
}

function fallbackMouseMapping(e) {
    const rect = canvas.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: displayX * scaleX, y: displayY * scaleY };
}

function onCanvasResized(e) {
    const newWidth = e.detail.canvas.width;
    const newHeight = e.detail.canvas.height;

    renderer.setSize(newWidth, newHeight);
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    updateBackground();
}

// ========== WORLD POSITION FROM MOUSE ==========
function getWorldPosition() {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(pointerPlane);
    if (intersects.length > 0) {
        return intersects[0].point.clone();
    }
    return null;
}

// ========== GLB LOADING ==========
async function loadGLBFromURL(url, modelName = 'model') {
    return new Promise((resolve, reject) => {
        const LoaderClass = window.GLTFLoader;
        if (!LoaderClass) {
            reject(new Error('GLTFLoader not available. Make sure Three.js is loaded.'));
            return;
        }

        const loader = new LoaderClass();
        console.log('3D Trail: Loading GLB from URL:', url);

        loader.load(
            url,
            (gltf) => {
                console.log('3D Trail: GLB loaded successfully!', gltf);

                let mesh = null;
                gltf.scene.traverse((child) => {
                    if (child.isMesh && !mesh) {
                        mesh = child;
                    }
                });

                if (!mesh) {
                    reject(new Error('No mesh found in GLB file'));
                    return;
                }

                loadedGeometry = mesh.geometry.clone();
                loadedMaterial = mesh.material.clone ? mesh.material.clone() : mesh.material;

                loadedGeometry.computeBoundingBox();
                loadedGeometry.center();

                const box = loadedGeometry.boundingBox;
                const size = new THREE.Vector3();
                box.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                if (maxDim > 0) {
                    const scale = 1 / maxDim;
                    loadedGeometry.scale(scale, scale, scale);
                }

                if (particlePool.instancedMesh) {
                    scene.remove(particlePool.instancedMesh);
                }
                particlePool = new ParticlePool(1000);
                const instancedMesh = particlePool.init(loadedGeometry, loadedMaterial);
                scene.add(instancedMesh);

                isModelLoaded = true;
                console.log('3D Trail: Model "' + modelName + '" loaded successfully!');

                resolve({ geometry: loadedGeometry, material: loadedMaterial, name: modelName });
            },
            (progress) => {
                if (progress.lengthComputable) {
                    console.log('3D Trail: Loading progress:', Math.round(progress.loaded / progress.total * 100) + '%');
                }
            },
            (error) => {
                console.error('3D Trail: Error loading GLB:', error);
                reject(error);
            }
        );
    });
}

async function loadDefaultModel() {
    try {
        console.log('3D Trail: Loading default model...');
        await loadGLBFromURL(DEFAULT_MODEL_PATH, 'musa.glb');

        // Update UI to show default model is loaded
        const modelInfo = document.getElementById('model-info');
        const modelName = document.getElementById('model-name');
        if (modelInfo && modelName) {
            modelName.textContent = 'musa.glb (default)';
            modelInfo.style.display = 'block';
        }

        console.log('3D Trail: Default model loaded successfully!');
    } catch (error) {
        console.warn('3D Trail: Could not load default model:', error.message);
        console.log('3D Trail: Upload a GLB model to start creating trails.');
    }
}

async function loadGLBModel(file) {
    return new Promise((resolve, reject) => {
        // Get GLTFLoader from global scope (set by module import)
        const LoaderClass = window.GLTFLoader;
        if (!LoaderClass) {
            reject(new Error('GLTFLoader not available. Make sure Three.js is loaded.'));
            return;
        }

        const loader = new LoaderClass();
        const url = URL.createObjectURL(file);
        console.log('3D Trail: Loading GLB from blob URL:', url);

        loader.load(
            url,
            // Success callback
            (gltf) => {
                console.log('3D Trail: GLB loaded successfully!', gltf);
                console.log('3D Trail: Scene children:', gltf.scene.children);

                // Find the first mesh in the loaded scene
                let mesh = null;
                gltf.scene.traverse((child) => {
                    console.log('3D Trail: Traversing child:', child.type, child.name || '(unnamed)');
                    if (child.isMesh && !mesh) {
                        mesh = child;
                        console.log('3D Trail: Found mesh to use:', mesh.name || '(unnamed)', mesh.geometry, mesh.material);
                    }
                });

                if (!mesh) {
                    URL.revokeObjectURL(url);
                    reject(new Error('No mesh found in GLB file'));
                    return;
                }

                // Store geometry and material
                loadedGeometry = mesh.geometry.clone();
                loadedMaterial = mesh.material.clone ? mesh.material.clone() : mesh.material;
                console.log('3D Trail: Geometry cloned:', loadedGeometry);
                console.log('3D Trail: Material cloned:', loadedMaterial);

                // Center and normalize geometry
                loadedGeometry.computeBoundingBox();
                loadedGeometry.center();

                // Scale geometry to reasonable size
                const box = loadedGeometry.boundingBox;
                const size = new THREE.Vector3();
                box.getSize(size);
                console.log('3D Trail: Model size before scaling:', size);
                const maxDim = Math.max(size.x, size.y, size.z);
                if (maxDim > 0) {
                    const scale = 1 / maxDim;
                    loadedGeometry.scale(scale, scale, scale);
                    console.log('3D Trail: Scaled geometry by factor:', scale);
                }

                URL.revokeObjectURL(url);

                // Initialize particle pool with loaded geometry
                if (particlePool.instancedMesh) {
                    scene.remove(particlePool.instancedMesh);
                }
                particlePool = new ParticlePool(1000);
                const instancedMesh = particlePool.init(loadedGeometry, loadedMaterial);
                scene.add(instancedMesh);

                isModelLoaded = true;
                console.log('3D Trail: Model loaded successfully, ready to create trails!');

                resolve({ geometry: loadedGeometry, material: loadedMaterial });
            },
            // Progress callback
            (progress) => {
                if (progress.lengthComputable) {
                    console.log('3D Trail: Loading progress:', Math.round(progress.loaded / progress.total * 100) + '%');
                }
            },
            // Error callback
            (error) => {
                console.error('3D Trail: Error loading GLB:', error);
                URL.revokeObjectURL(url);
                reject(error);
            }
        );
    });
}

function clearModel() {
    if (particlePool && particlePool.instancedMesh) {
        particlePool.clear();
        scene.remove(particlePool.instancedMesh);
    }
    loadedGeometry = null;
    loadedMaterial = null;
    isModelLoaded = false;
    particlePool = new ParticlePool(1000);
}

// ========== PARTICLE SPAWNING ==========
function trySpawnParticle(currentTime) {
    if (!isMouseDown || !isModelLoaded) return;

    const spawnInterval = 1000 / settings.density;
    if (currentTime - lastSpawnTime < spawnInterval) return;

    const worldPos = getWorldPosition();
    if (!worldPos) return;

    // Calculate scale based on size settings
    let scale;
    if (settings.randomSize) {
        // Random size between min and max
        scale = THREE.MathUtils.lerp(settings.sizeMin, settings.sizeMax, Math.random());
    } else if (settings.sizeBySpeed && mouseSpeed > 0) {
        // Size based on mouse speed
        const speedNorm = Math.min(mouseSpeed / 50, 1);
        scale = THREE.MathUtils.lerp(settings.sizeMin, settings.sizeMax, speedNorm);
    } else {
        // Use single fixed size value
        scale = settings.size;
    }

    // Create particle - choose pool based on gradient mode
    const moveDir = new THREE.Vector2(lastMoveDirection.x, lastMoveDirection.y);

    // Use multi-gradient pools for random per-particle gradient assignment
    if (useMultiGradientPools && settings.gradientSets.length >= 2 && settings.multiGradientMode === 'random') {
        // Randomly select a gradient pool
        const poolIndex = Math.floor(Math.random() * gradientPools.length);
        const { pool } = gradientPools[poolIndex];

        const index = pool.acquire();
        if (index === null) return;

        const particle = new Particle(index, worldPos, moveDir);
        particle.initialScale = scale;
        particle.scale.set(scale, scale, scale);
        particle.lifespan = settings.lifespan;
        particle.poolIndex = poolIndex;  // Track which pool this particle belongs to

        pool.particles.set(index, particle);
    } else {
        // Standard single-pool mode
        const index = particlePool.acquire();
        if (index === null) return;

        const particle = new Particle(index, worldPos, moveDir);
        particle.initialScale = scale;
        particle.scale.set(scale, scale, scale);
        particle.lifespan = settings.lifespan;
        particle.poolIndex = -1;  // Main pool

        particlePool.particles.set(index, particle);
    }

    lastSpawnTime = currentTime;
}

// ========== PARTICLE UPDATE ==========
function updateParticles(delta) {
    const currentMouseWorld = getWorldPosition();
    // Update global mouse world position for face mouse mode
    if (currentMouseWorld) {
        currentMouseWorldPos.copy(currentMouseWorld);
    }
    const cameraPosition = camera.position.clone();

    // Helper function to update a single particle
    function updateSingleParticle(particle, index, pool) {
        particle.age += delta;

        // Check lifespan
        if (particle.age >= particle.lifespan) {
            return true; // Mark for removal
        }

        const lifeRatio = particle.age / particle.lifespan;

        // Apply float (space-like wiggle)
        if (settings.floatEnabled) {
            const time = clock.getElapsedTime();
            const phase = particle.spawnTime + particle.phaseOffset;

            switch (settings.floatStyle) {
                case 'oscillate':
                    particle.position.x += Math.sin(time * 2 + phase) * settings.floatAmplitude * delta;
                    particle.position.y += Math.cos(time * 2.5 + phase * 1.3) * settings.floatAmplitude * delta;
                    break;
                case 'random':
                    particle.velocity.x += (Math.random() - 0.5) * settings.floatAmplitude * delta * 2;
                    particle.velocity.y += (Math.random() - 0.5) * settings.floatAmplitude * delta * 2;
                    break;
                case 'perlin':
                    const noiseX = Math.sin(time * 0.7 + particle.index * 0.1) * Math.cos(time * 0.5 + phase);
                    const noiseY = Math.cos(time * 0.6 + particle.index * 0.1) * Math.sin(time * 0.8 + phase);
                    particle.position.x += noiseX * settings.floatAmplitude * delta;
                    particle.position.y += noiseY * settings.floatAmplitude * delta;
                    break;
            }
        }

        // Apply gravity
        if (settings.gravityEnabled) {
            particle.velocity.y -= settings.gravityStrength * delta;
        }

        // Apply follow (attraction to mouse)
        if (settings.followEnabled && currentMouseWorld) {
            const direction = currentMouseWorld.clone().sub(particle.position);
            const distance = direction.length();
            if (distance > 0.1) {
                direction.normalize();
                particle.velocity.add(direction.multiplyScalar(settings.followStrength * delta * 10));
            }
        }

        // Apply velocity damping
        particle.velocity.multiplyScalar(0.99);

        // Update position
        particle.position.add(particle.velocity.clone().multiplyScalar(delta * 60));

        // Apply bounce
        if (settings.bounceEnabled && particle.position.y <= settings.bounceHeight) {
            particle.position.y = settings.bounceHeight;
            particle.velocity.y = Math.abs(particle.velocity.y) * settings.bounceAmount;
        }

        // Accumulate spin/tumble offset
        particle.spinOffset.x += particle.angularVelocity.x * delta;
        particle.spinOffset.y += particle.angularVelocity.y * delta;
        particle.spinOffset.z += particle.angularVelocity.z * delta;

        // Update rotation based on facing mode
        if (settings.facingMode === 'none' || settings.facingMode === 'random' || settings.facingMode === 'fixed') {
            particle.rotation.x += particle.angularVelocity.x * delta;
            particle.rotation.y += particle.angularVelocity.y * delta;
            particle.rotation.z += particle.angularVelocity.z * delta;
        }

        // Billboard facing
        if (settings.facingMode === 'billboard') {
            const lookDir = cameraPosition.clone().sub(particle.position).normalize();
            const rotY = Math.atan2(lookDir.x, lookDir.z);
            const rotX = Math.atan2(-lookDir.y, Math.sqrt(lookDir.x * lookDir.x + lookDir.z * lookDir.z));
            particle.rotation.set(
                rotX + particle.spinOffset.x,
                rotY + particle.spinOffset.y,
                particle.spinOffset.z
            );
        }

        // Face mouse
        if (settings.facingMode === 'mouse' && currentMouseWorldPos) {
            const toMouse = currentMouseWorldPos.clone().sub(particle.position);
            const distance = toMouse.length();

            if (distance > 0.01) {
                toMouse.normalize();
                const targetRotY = Math.atan2(toMouse.x, 0.5) * 1.2 + particle.spinOffset.y;
                const targetRotX = Math.atan2(-toMouse.y, 1) * 0.8 + particle.spinOffset.x;
                const targetRotZ = toMouse.x * 0.2 + particle.spinOffset.z;

                const maxAngleY = Math.PI / 2.5;
                const maxAngleX = Math.PI / 4;
                const maxRoll = Math.PI / 10;

                const clampedRotX = Math.max(-maxAngleX, Math.min(maxAngleX, targetRotX - particle.spinOffset.x)) + particle.spinOffset.x;
                const clampedRotY = Math.max(-maxAngleY, Math.min(maxAngleY, targetRotY - particle.spinOffset.y)) + particle.spinOffset.y;
                const clampedRotZ = Math.max(-maxRoll, Math.min(maxRoll, targetRotZ - particle.spinOffset.z)) + particle.spinOffset.z;

                const lagFactor = 0.1 + (lifeRatio * 0.15);
                particle.rotation.x += (clampedRotX - particle.rotation.x) * lagFactor;
                particle.rotation.y += (clampedRotY - particle.rotation.y) * lagFactor;
                particle.rotation.z += (clampedRotZ - particle.rotation.z) * lagFactor;
            }
        }

        // Apply disappear mode with exit duration control
        let currentScale = particle.initialScale;
        const timeRemaining = particle.lifespan - particle.age;
        const exitDuration = Math.min(settings.exitDuration, particle.lifespan);

        switch (settings.disappearMode) {
            case 'fade':
            case 'shrink':
                if (timeRemaining <= exitDuration) {
                    const exitProgress = 1 - (timeRemaining / exitDuration);
                    currentScale = particle.initialScale * (1 - exitProgress);
                }
                break;
            case 'snap':
                break;
        }

        particle.scale.set(currentScale, currentScale, currentScale);

        // Update instance matrix
        pool.updateInstance(index, particle.position, particle.rotation, particle.scale);

        return false; // Don't remove
    }

    // Update main particle pool
    if (particlePool && particlePool.particles.size > 0) {
        const particlesToRemove = [];

        particlePool.particles.forEach((particle, index) => {
            if (updateSingleParticle(particle, index, particlePool)) {
                particlesToRemove.push(index);
            }
        });

        particlesToRemove.forEach(index => particlePool.release(index));
        particlePool.finishUpdate();
    }

    // Update multi-gradient pools
    if (useMultiGradientPools) {
        gradientPools.forEach(({ pool }) => {
            if (pool.particles.size === 0) return;

            const particlesToRemove = [];

            pool.particles.forEach((particle, index) => {
                if (updateSingleParticle(particle, index, pool)) {
                    particlesToRemove.push(index);
                }
            });

            particlesToRemove.forEach(index => pool.release(index));
            pool.finishUpdate();
        });
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
            const isPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                Chatooly.backgroundManager.setTransparent(isPressed);
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
        renderer.setClearColor(0xffffff, 1);
        return;
    }

    const bg = Chatooly.backgroundManager.getBackgroundState();

    if (bg.bgTransparent) {
        renderer.setClearAlpha(0);
        scene.background = null;
        if (backgroundTexture) {
            backgroundTexture.dispose();
            backgroundTexture = null;
        }
        return;
    }

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

        if (backgroundTexture) {
            backgroundTexture.dispose();
            backgroundTexture = null;
        }
    }
}

// ========== MATCAP MATERIAL SYSTEM ==========
function initMaterialSystem() {
    if (window.MatCapGenerator) {
        matcapGenerator = new MatCapGenerator(256);
        console.log('3D Trail: MatCap material system initialized');
    }
}

function createCustomMaterial() {
    if (!matcapGenerator) return null;

    // Pre-generate all gradient textures for blending
    regenerateGradientTextures();

    // Start with first gradient texture
    const texture = gradientTextures[0] || matcapGenerator.generate(
        settings.gradientSets[0].stops,
        settings.gradientSets[0].type,
        settings.lightPosition
    );

    const material = new THREE.MeshMatcapMaterial({
        matcap: texture,
        side: THREE.DoubleSide,
        flatShading: settings.shaderMode === 'toon'
    });

    // Extend with rim light AND matcap blending via onBeforeCompile
    material.onBeforeCompile = (shader) => {
        // Existing uniforms
        shader.uniforms.rimColor = { value: new THREE.Color(settings.rimColor) };
        shader.uniforms.rimIntensity = { value: settings.rimEnabled ? settings.rimIntensity : 0 };
        shader.uniforms.lightColor = { value: new THREE.Color(settings.lightColor) };
        shader.uniforms.lightIntensity = { value: settings.lightIntensity };
        shader.uniforms.toonMode = { value: settings.shaderMode === 'toon' ? 1 : 0 };

        // NEW: Matcap blending uniforms
        shader.uniforms.matcap2 = { value: gradientTextures[1] || gradientTextures[0] };
        shader.uniforms.mixRatio = { value: 0.0 };

        // Inject uniforms after #include <common>
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
            uniform vec3 rimColor;
            uniform float rimIntensity;
            uniform vec3 lightColor;
            uniform float lightIntensity;
            uniform int toonMode;
            uniform sampler2D matcap2;
            uniform float mixRatio;`
        );

        // Replace matcap sampling to blend two textures
        // The default line is: vec4 matcapColor = texture2D( matcap, uv );
        shader.fragmentShader = shader.fragmentShader.replace(
            'vec4 matcapColor = texture2D( matcap, uv );',
            `vec4 matcapColor1 = texture2D( matcap, uv );
            vec4 matcapColor2 = texture2D( matcap2, uv );
            vec4 matcapColor = mix(matcapColor1, matcapColor2, mixRatio);`
        );

        // Add rim light + toon effect before opaque_fragment
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <opaque_fragment>',
            `// Apply light color and intensity
            outgoingLight *= lightColor * lightIntensity;

            // Toon posterization
            if (toonMode == 1) {
                outgoingLight = floor(outgoingLight * 4.0) / 4.0;
            }

            // Rim light (Fresnel effect)
            vec3 rimViewDir = normalize(vViewPosition);
            float rimFactor = 1.0 - max(0.0, dot(normal, rimViewDir));
            rimFactor = pow(rimFactor, 2.0);
            outgoingLight += rimColor * rimFactor * rimIntensity;

            #include <opaque_fragment>`
        );

        // Store reference for uniform updates
        material.userData.shader = shader;
    };

    return material;
}

// Pre-generate textures for all gradients (called when gradients change)
function regenerateGradientTextures() {
    // Dispose old textures
    gradientTextures.forEach(tex => {
        if (tex) tex.dispose();
    });
    gradientTextures = [];

    // Generate new textures for each gradient
    settings.gradientSets.forEach((gradient) => {
        const texture = matcapGenerator.generate(
            gradient.stops,
            gradient.type,
            settings.lightPosition
        );
        gradientTextures.push(texture);
    });
}

function updateMaterial() {
    if (!settings.materialEnabled || !particlePool?.instancedMesh || !matcapGenerator) return;

    // Get current gradient from gradientSets
    const currentGradient = settings.gradientSets[settings.activeGradientIndex] || settings.gradientSets[0];

    // Regenerate matcap texture
    const texture = matcapGenerator.generate(
        currentGradient.stops,
        currentGradient.type,
        settings.lightPosition
    );

    if (customMaterial) {
        // Update matcap texture
        if (customMaterial.matcap) {
            customMaterial.matcap.dispose();
        }
        customMaterial.matcap = texture;
        customMaterial.flatShading = settings.shaderMode === 'toon';
        customMaterial.needsUpdate = true;

        // Update uniforms if shader compiled
        if (customMaterial.userData.shader) {
            const uniforms = customMaterial.userData.shader.uniforms;
            uniforms.rimColor.value.set(settings.rimColor);
            uniforms.rimIntensity.value = settings.rimEnabled ? settings.rimIntensity : 0;
            uniforms.lightColor.value.set(settings.lightColor);
            uniforms.lightIntensity.value = settings.lightIntensity;
            uniforms.toonMode.value = settings.shaderMode === 'toon' ? 1 : 0;
        }
    }

    // Also update multi-gradient pool materials when lighting changes
    updateMultiGradientPoolMaterials();
}

function toggleMaterialMode(enabled) {
    settings.materialEnabled = enabled;
    if (!particlePool?.instancedMesh) return;

    if (enabled) {
        // Store original material and apply custom
        if (!originalMaterial) {
            originalMaterial = particlePool.instancedMesh.material;
        }
        customMaterial = createCustomMaterial();
        if (customMaterial) {
            particlePool.instancedMesh.material = customMaterial;
            console.log('3D Trail: Custom MatCap material applied');
        }

        // Initialize multi-gradient pools if we have multiple gradients and random mode
        if (settings.gradientSets.length >= 2 && settings.multiGradientMode === 'random') {
            initMultiGradientPools();
        }
    } else {
        // Restore original material
        if (originalMaterial) {
            particlePool.instancedMesh.material = originalMaterial;
        }
        if (customMaterial) {
            if (customMaterial.matcap) {
                customMaterial.matcap.dispose();
            }
            customMaterial.dispose();
            customMaterial = null;
        }

        // Clean up multi-gradient pools
        cleanupMultiGradientPools();

        console.log('3D Trail: Original material restored');
    }
}

// ========== MULTI-GRADIENT MANAGEMENT ==========

// Create material for a specific gradient
function createMaterialForGradient(gradientIndex) {
    if (!matcapGenerator) return null;

    const gradient = settings.gradientSets[gradientIndex];
    if (!gradient) return null;

    const texture = matcapGenerator.generate(
        gradient.stops,
        gradient.type,
        settings.lightPosition
    );

    const material = new THREE.MeshMatcapMaterial({
        matcap: texture,
        side: THREE.DoubleSide,
        flatShading: settings.shaderMode === 'toon'
    });

    // Extend with rim light via onBeforeCompile
    material.onBeforeCompile = (shader) => {
        shader.uniforms.rimColor = { value: new THREE.Color(settings.rimColor) };
        shader.uniforms.rimIntensity = { value: settings.rimEnabled ? settings.rimIntensity : 0 };
        shader.uniforms.lightColor = { value: new THREE.Color(settings.lightColor) };
        shader.uniforms.lightIntensity = { value: settings.lightIntensity };
        shader.uniforms.toonMode = { value: settings.shaderMode === 'toon' ? 1 : 0 };

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
            uniform vec3 rimColor;
            uniform float rimIntensity;
            uniform vec3 lightColor;
            uniform float lightIntensity;
            uniform int toonMode;`
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <opaque_fragment>',
            `outgoingLight *= lightColor * lightIntensity;
            if (toonMode == 1) {
                outgoingLight = floor(outgoingLight * 4.0) / 4.0;
            }
            vec3 rimViewDir = normalize(vViewPosition);
            float rimFactor = 1.0 - max(0.0, dot(normalize(vNormal), -rimViewDir));
            rimFactor = pow(rimFactor, 2.0);
            outgoingLight += rimColor * rimFactor * rimIntensity;
            #include <opaque_fragment>`
        );

        material.userData.shader = shader;
    };

    return material;
}

// Initialize multiple gradient pools for per-particle random assignment
function initMultiGradientPools() {
    if (!loadedGeometry || !settings.materialEnabled) return;

    // Clean up existing pools
    cleanupMultiGradientPools();

    // Create a pool for each gradient
    settings.gradientSets.forEach((gradient, index) => {
        const material = createMaterialForGradient(index);
        if (!material) return;

        const pool = new ParticlePool(Math.ceil(1000 / settings.gradientSets.length));
        const mesh = pool.init(loadedGeometry, material);
        scene.add(mesh);

        gradientPools.push({
            pool: pool,
            material: material,
            mesh: mesh,
            gradientIndex: index
        });
    });

    useMultiGradientPools = gradientPools.length > 0;
}

// Clean up multi-gradient pools
function cleanupMultiGradientPools() {
    gradientPools.forEach(({ pool, material, mesh }) => {
        pool.clear();
        scene.remove(mesh);
        if (material.matcap) material.matcap.dispose();
        material.dispose();
        // Note: Don't dispose mesh.geometry - it's the shared loadedGeometry
    });
    gradientPools = [];
    useMultiGradientPools = false;
}

// Update multi-gradient pool materials (when lighting/shader settings change)
function updateMultiGradientPoolMaterials() {
    if (!useMultiGradientPools) return;

    gradientPools.forEach(({ material, gradientIndex }) => {
        const gradient = settings.gradientSets[gradientIndex];
        if (!gradient || !matcapGenerator) return;

        // Regenerate texture
        const texture = matcapGenerator.generate(
            gradient.stops,
            gradient.type,
            settings.lightPosition
        );

        if (material.matcap) material.matcap.dispose();
        material.matcap = texture;
        material.flatShading = settings.shaderMode === 'toon';
        material.needsUpdate = true;

        if (material.userData.shader) {
            const uniforms = material.userData.shader.uniforms;
            uniforms.rimColor.value.set(settings.rimColor);
            uniforms.rimIntensity.value = settings.rimEnabled ? settings.rimIntensity : 0;
            uniforms.lightColor.value.set(settings.lightColor);
            uniforms.lightIntensity.value = settings.lightIntensity;
            uniforms.toonMode.value = settings.shaderMode === 'toon' ? 1 : 0;
        }
    });
}

function updateMultiGradient(delta) {
    // Only run multi-gradient logic when there are 2+ gradients
    if (settings.gradientSets.length < 2) return;

    if (settings.multiGradientMode === 'time') {
        // Smooth lerping between gradients
        updateGradientLerp(delta);
    }
    // For 'random' mode, switching happens on spawn (see trySpawnParticle)
}

// Smooth gradient lerping for time mode
function updateGradientLerp(delta) {
    if (!customMaterial?.userData?.shader) return;

    const shader = customMaterial.userData.shader;
    const numGradients = settings.gradientSets.length;

    // Calculate transition speed (full cycle through all gradients)
    // gradientCycleSpeed of 1.0 = 1 second per gradient transition
    const transitionSpeed = settings.gradientCycleSpeed;

    // Advance the mix ratio
    gradientMixRatio += delta * transitionSpeed;

    // When we complete a transition (mixRatio >= 1), move to next gradient pair
    if (gradientMixRatio >= 1.0) {
        gradientMixRatio = 0.0;
        currentGradientA = currentGradientB;
        currentGradientB = (currentGradientB + 1) % numGradients;

        // Update the primary matcap texture to the new "A" gradient
        if (gradientTextures[currentGradientA]) {
            customMaterial.matcap = gradientTextures[currentGradientA];
            customMaterial.needsUpdate = true;
        }
        // Update matcap2 to the new "B" gradient
        if (shader.uniforms.matcap2 && gradientTextures[currentGradientB]) {
            shader.uniforms.matcap2.value = gradientTextures[currentGradientB];
        }
    }

    // Update the mix ratio uniform for smooth blending
    if (shader.uniforms.mixRatio) {
        // Use smoothstep for more pleasing easing
        const smoothMix = smoothstep(0, 1, gradientMixRatio);
        shader.uniforms.mixRatio.value = smoothMix;
    }
}

// Smoothstep easing function
function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

function applyGradientSet(index) {
    if (index >= settings.gradientSets.length) return;

    const gradientSet = settings.gradientSets[index];
    if (!gradientSet || !gradientSet.stops) return;

    // Update active gradient index and regenerate material
    settings.activeGradientIndex = index;
    updateMaterial();
}

// ========== ANIMATION LOOP ==========
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // Update multi-gradient (for time mode - smooth lerping)
    updateMultiGradient(delta);

    // Try spawning particles
    trySpawnParticle(performance.now());

    // Update all particles
    updateParticles(delta);

    // Render
    renderer.render(scene, camera);
}

// ========== HIGH-RES EXPORT ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!renderer || !scene || !camera) {
        console.warn('3D Trail: Not ready for high-res export');
        return;
    }

    const originalWidth = canvas.width;
    const originalHeight = canvas.height;
    const newWidth = originalWidth * scale;
    const newHeight = originalHeight * scale;

    // Resize renderer
    renderer.setSize(newWidth, newHeight);
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    // Render at high resolution
    renderer.render(scene, camera);

    // Copy to target canvas
    const ctx = targetCanvas.getContext('2d');
    targetCanvas.width = newWidth;
    targetCanvas.height = newHeight;
    ctx.drawImage(renderer.domElement, 0, 0);

    // Restore original size
    renderer.setSize(originalWidth, originalHeight);
    camera.aspect = originalWidth / originalHeight;
    camera.updateProjectionMatrix();

    console.log(`High-res export completed at ${scale}x resolution`);
};

// ========== CAMERA CONTROLS ==========
function setCameraPosition(x, y, z) {
    if (camera) {
        if (x !== undefined) camera.position.x = x;
        if (y !== undefined) camera.position.y = y;
        if (z !== undefined) camera.position.z = z;
        settings.cameraX = camera.position.x;
        settings.cameraY = camera.position.y;
        settings.cameraZ = camera.position.z;
    }
}

function setCameraFOV(fov) {
    if (camera) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
        settings.cameraFOV = fov;
    }
}

function setCameraPreset(view) {
    const distance = 10;
    const presets = {
        front:  { x: 0, y: 0, z: distance },
        back:   { x: 0, y: 0, z: -distance },
        top:    { x: 0, y: distance, z: 0.001 },
        bottom: { x: 0, y: -distance, z: 0.001 },
        left:   { x: -distance, y: 0, z: 0.001 },
        right:  { x: distance, y: 0, z: 0.001 }
    };

    const preset = presets[view];
    if (preset && camera) {
        camera.position.set(preset.x, preset.y, preset.z);
        camera.lookAt(0, 0, 0);
        settings.cameraX = preset.x;
        settings.cameraY = preset.y;
        settings.cameraZ = preset.z;
        console.log('3D Trail: Camera preset', view);
    }
}

// ========== CLEAR CANVAS ==========
function clearCanvas() {
    // Clear main particle pool
    if (particlePool) {
        particlePool.clear();
        particlePool.finishUpdate();
    }

    // Clear multi-gradient pools
    if (useMultiGradientPools) {
        gradientPools.forEach(({ pool }) => {
            pool.clear();
            pool.finishUpdate();
        });
    }

    // Render the empty scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }

    console.log('3D Trail: Canvas cleared');
}

// Setup clear canvas button
document.addEventListener('DOMContentLoaded', () => {
    const clearCanvasBtn = document.getElementById('clear-canvas-btn');
    if (clearCanvasBtn) {
        clearCanvasBtn.addEventListener('click', clearCanvas);
    }
});

// ========== EXPOSE FUNCTIONS FOR UI ==========
window.trailTool = {
    settings: settings,
    loadGLBModel: loadGLBModel,
    loadDefaultModel: loadDefaultModel,
    clearModel: clearModel,
    isModelLoaded: () => isModelLoaded,
    updateMaterial: updateMaterial,
    toggleMaterialMode: toggleMaterialMode,
    getMatcapPreview: () => matcapGenerator?.getPreviewCanvas(),
    generateMatcapPreview: (stops, type) => {
        if (!matcapGenerator) return null;
        matcapGenerator.generate(stops, type, settings.lightPosition);
        return matcapGenerator.getPreviewCanvas();
    },
    setCameraPosition: setCameraPosition,
    setCameraFOV: setCameraFOV,
    setCameraPreset: setCameraPreset,
    // Multi-gradient pool functions
    initMultiGradientPools: initMultiGradientPools,
    updateMultiGradientPoolMaterials: updateMultiGradientPoolMaterials,
    cleanupMultiGradientPools: cleanupMultiGradientPools
};

// ========== INITIALIZE ==========
// Wait for Three.js module to load
if (window.THREE) {
    init();
} else {
    window.addEventListener('three-ready', init);
}
