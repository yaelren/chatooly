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
    // Trail settings (distance-based spawning)
    spacing: 20,          // pixels between particles
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

    // Look at Mouse animation settings
    lookAtMouseEnabled: false,
    lookAtMouseStrength: 0.5,
    lookAtMaxAngleLeft: 360,
    lookAtMaxAngleRight: 360,
    lookAtMaxAngleUp: 360,
    lookAtMaxAngleDown: 360,

    // Physics
    gravityEnabled: false,
    gravityStrength: 9.8,
    spinEnabled: false,
    spinSpeed: 1.0,
    tumbleEnabled: false,
    tumbleSpeed: 1.0,
    bounceEnabled: true,  // Bounce floor only applies when gravity is enabled
    bounceHeight: -3,
    bounceAmount: 0.6,

    // Camera
    cameraX: 0,
    cameraY: 0,
    cameraZ: 10,
    cameraFOV: 65,

    // Custom cursor settings
    cursorEnabled: false,
    cursorImage: null,      // Base64 data URL of uploaded image
    cursorSize: 32,

    // Material settings (MatCap style) - always enabled, solid by default
    materialEnabled: true,
    materialType: 'solid',  // 'solid', 'gradient', or 'matcapUpload'
    solidColor: '#4a90d9',  // Color for solid material type
    shaderMode: 'flat',  // 'flat' (no lighting), 'reflective', or 'toon' - shared across all gradients

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
    multiGradientMode: 'random',  // 'random' | 'lerp' (fade between) | 'time' | 'age'
    gradientCycleSpeed: 1.0,
    lerpSteps: 8,  // Steps between gradients for fade mode

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
let uploadedMatcapTexture = null;  // For custom uploaded matcap images

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

// ========== LERP MODE SYSTEM ==========
// For sequential lerp mode, we pre-generate intermediate gradient materials
let lerpPools = [];  // Array of { pool, material, mesh } for lerp sequence
let lerpIndex = 0;   // Current index in lerp sequence
let useLerpPools = false;

// ========== AGE-BASED FADING SYSTEM ==========
let ageFadingMaterial = null;  // Special material with age-based blending shader
let ageFadingAgeBuffer = null; // Float32Array for age ratios
let useAgeFading = false;

// ========== DEFAULT MODEL ==========
// No default model - user must upload their own GLB

// ========== MOUSE STATE ==========
let isMouseDown = false;
let lastMousePos = { x: 0, y: 0 };
let currentMousePos = { x: 0, y: 0 };
let currentMouseWorldPos = null;  // World position for face mouse mode (initialized in init())
let mouseSpeed = 0;
let lastMoveDirection = { x: 0, y: 0 };
let accumulatedDistance = 0;  // For distance-based spawning

// ========== CANVAS SIZE TRACKING ==========
let previousCanvasSize = { width: canvas.width, height: canvas.height };

// ========== CUSTOM CURSOR ==========
let cursorElement = null;

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

        // Store random factors for tumble variation (unique per particle, used dynamically)
        this.randomTumbleFactor = new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
        );

        // Store base rotation for this particle (for random/mouse facing modes)
        this.baseRotation = new THREE.Euler(0, 0, 0);
        this.setBaseRotation();
    }

    setBaseRotation() {
        // Store base rotation at spawn time - used for random/mouse modes
        // Fixed mode reads current settings dynamically in update loop
        switch (settings.facingMode) {
            case 'random':
                this.baseRotation.set(
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2,
                    Math.random() * Math.PI * 2
                );
                break;
            case 'mouse':
                // Calculate rotation toward mouse at spawn time (frozen orientation)
                if (currentMouseWorldPos) {
                    const toMouse = currentMouseWorldPos.clone().sub(this.position);
                    const distance = toMouse.length();

                    if (distance > 0.01) {
                        toMouse.normalize();
                        const rotY = Math.atan2(-toMouse.x, 0.5) * 1.2;
                        const rotX = Math.atan2(toMouse.y, 1) * 0.8;
                        const rotZ = -toMouse.x * 0.2;

                        this.baseRotation.set(rotX, rotY, rotZ);
                    }
                }
                break;
            case 'fixed':
            case 'billboard':
            default:
                // Fixed uses current settings dynamically, billboard is calculated each frame
                this.baseRotation.set(0, 0, 0);
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

    // Create invisible plane for raycasting (very large to cover all canvas sizes)
    const planeGeometry = new THREE.PlaneGeometry(10000, 10000);
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

    // Initialize custom cursor system
    initCursorSystem();

    // Start animation loop
    animate();

    console.log('3D Trail: Initialization complete. Upload a GLB model to start.');
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Mouse events
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', onMouseLeave);

    // Cursor visibility events
    canvas.addEventListener('mouseenter', onCanvasEnter);

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
    accumulatedDistance = 0;  // Reset distance accumulator on mouse down
}

function onMouseMove(e) {
    const prevX = currentMousePos.x;
    const prevY = currentMousePos.y;
    updateMousePosition(e);

    // Calculate mouse speed and direction
    const dx = currentMousePos.x - prevX;
    const dy = currentMousePos.y - prevY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    mouseSpeed = distance;

    if (distance > 0.1) {
        lastMoveDirection.x = dx / distance;
        lastMoveDirection.y = dy / distance;
    }

    // Accumulate distance for distance-based spawning
    if (isMouseDown) {
        accumulatedDistance += distance;
    }

    // Update custom cursor position
    updateCursorPosition(e);
}

function onMouseUp() {
    isMouseDown = false;
}

function onMouseLeave() {
    isMouseDown = false;
    // Hide custom cursor when leaving canvas
    if (cursorElement) {
        canvas.style.cursor = 'default';
        cursorElement.style.display = 'none';
    }
}

function onCanvasEnter() {
    // Show custom cursor when entering canvas
    if (settings.cursorEnabled && cursorElement && settings.cursorImage) {
        canvas.style.cursor = 'none';
        cursorElement.style.display = 'block';
    }
}

function onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
        isMouseDown = true;
        updateMousePositionFromTouch(e.touches[0]);
        lastMousePos.x = currentMousePos.x;
        lastMousePos.y = currentMousePos.y;
        accumulatedDistance = 0;  // Reset distance accumulator on touch start
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
        const distance = Math.sqrt(dx * dx + dy * dy);
        mouseSpeed = distance;

        if (distance > 0.1) {
            lastMoveDirection.x = dx / distance;
            lastMoveDirection.y = dy / distance;
        }

        // Accumulate distance for distance-based spawning
        if (isMouseDown) {
            accumulatedDistance += distance;
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
    const oldWidth = previousCanvasSize.width;
    const oldHeight = previousCanvasSize.height;
    const newWidth = e.detail.canvas.width;
    const newHeight = e.detail.canvas.height;

    renderer.setSize(newWidth, newHeight);
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    // Scale mouse position to new canvas dimensions to prevent offset
    if (oldWidth > 0 && oldHeight > 0) {
        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;
        currentMousePos.x *= scaleX;
        currentMousePos.y *= scaleY;

        // Recalculate normalized device coordinates
        pointer.x = (currentMousePos.x / newWidth) * 2 - 1;
        pointer.y = -(currentMousePos.y / newHeight) * 2 + 1;
    }

    // Update tracked canvas size
    previousCanvasSize.width = newWidth;
    previousCanvasSize.height = newHeight;

    updateBackground();
}

// ========== WORLD POSITION FROM MOUSE ==========
function getWorldPosition() {
    raycaster.setFromCamera(pointer, camera);
    
    // Use mathematical ray-plane intersection for unbounded world position
    // This ensures particles can spawn anywhere the mouse points, with no limits
    const ray = raycaster.ray;
    
    // Calculate intersection with z=0 plane (infinite plane, no bounds)
    if (Math.abs(ray.direction.z) > 0.0001) {
        const t = -ray.origin.z / ray.direction.z;
        if (t > 0) {
            const worldPos = new THREE.Vector3();
            worldPos.copy(ray.origin).addScaledVector(ray.direction, t);
            return worldPos;
        }
    }
    
    // Edge case: ray is nearly parallel to z=0 plane
    // Fall back to raycast against the large plane (kept for edge cases)
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

                // Apply material after model loads
                applyCurrentMaterial();

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

                // Apply current material settings to new model
                applyCurrentMaterial();

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

    // Distance-based spawning: spawn when accumulated distance exceeds spacing
    if (accumulatedDistance < settings.spacing) return;
    accumulatedDistance -= settings.spacing;  // Preserve remainder for smooth spawning

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

    // Use lerp pools for sequential lerp mode
    if (useLerpPools && settings.gradientSets.length >= 2 && settings.multiGradientMode === 'lerp') {
        const { pool } = lerpPools[lerpIndex];

        const index = pool.acquire();
        if (index === null) return;

        const particle = new Particle(index, worldPos, moveDir);
        particle.initialScale = scale;
        particle.scale.set(scale, scale, scale);
        particle.lifespan = settings.lifespan;
        particle.poolIndex = lerpIndex;
        particle.isLerpPool = true;

        pool.particles.set(index, particle);

        // Advance to next lerp index (cycle through sequence)
        lerpIndex = (lerpIndex + 1) % lerpPools.length;
    }
    // Use multi-gradient pools for random per-particle gradient assignment
    else if (useMultiGradientPools && settings.gradientSets.length >= 2 && settings.multiGradientMode === 'random') {
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
        // Float adds movement to position - when disabled, the accumulated drift stays
        // (this is intentional - float creates organic movement, not a reversible offset)
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

        // Apply velocity damping (time-independent for consistent behavior at any frame rate)
        particle.velocity.multiplyScalar(Math.pow(0.99, delta * 60));

        // Update position
        particle.position.add(particle.velocity.clone().multiplyScalar(delta * 60));

        // Apply bounce - ONLY when gravity is enabled (no floor without gravity)
        if (settings.gravityEnabled && settings.bounceEnabled && particle.position.y <= settings.bounceHeight) {
            particle.position.y = settings.bounceHeight;
            particle.velocity.y = Math.abs(particle.velocity.y) * settings.bounceAmount;
        }

        // Calculate dynamic angular velocity from CURRENT settings (not spawn-time)
        // This allows spin/tumble toggles to affect existing particles
        let angularVelX = 0, angularVelY = 0, angularVelZ = 0;

        if (settings.tumbleEnabled) {
            angularVelX = settings.tumbleSpeed * particle.randomTumbleFactor.x;
            angularVelY = settings.tumbleSpeed * particle.randomTumbleFactor.y;
            angularVelZ = settings.tumbleSpeed * particle.randomTumbleFactor.z;
        }

        if (settings.spinEnabled) {
            angularVelY += settings.spinSpeed;
        }

        // When spin/tumble are enabled, accumulate offset
        // When disabled, smoothly decay offset back to zero so particles return to base orientation
        const spinTumbleActive = settings.spinEnabled || settings.tumbleEnabled;
        if (spinTumbleActive) {
            particle.spinOffset.x += angularVelX * delta;
            particle.spinOffset.y += angularVelY * delta;
            particle.spinOffset.z += angularVelZ * delta;
        } else {
            // Decay spinOffset back to zero when spin/tumble disabled
            const decayRate = 3.0; // How fast to return to base orientation
            particle.spinOffset.x *= Math.max(0, 1 - decayRate * delta);
            particle.spinOffset.y *= Math.max(0, 1 - decayRate * delta);
            particle.spinOffset.z *= Math.max(0, 1 - decayRate * delta);
            // Snap to zero when close enough
            if (Math.abs(particle.spinOffset.x) < 0.001) particle.spinOffset.x = 0;
            if (Math.abs(particle.spinOffset.y) < 0.001) particle.spinOffset.y = 0;
            if (Math.abs(particle.spinOffset.z) < 0.001) particle.spinOffset.z = 0;
        }

        // Update rotation based on CURRENT facing mode (not spawn-time)
        // This allows facing mode changes to affect existing particles
        switch (settings.facingMode) {
            case 'fixed':
                // Use current fixed angle settings + accumulated spin offset
                particle.rotation.set(
                    THREE.MathUtils.degToRad(settings.fixedAngleX) + particle.spinOffset.x,
                    THREE.MathUtils.degToRad(settings.fixedAngleY) + particle.spinOffset.y,
                    THREE.MathUtils.degToRad(settings.fixedAngleZ) + particle.spinOffset.z
                );
                break;
            case 'random':
            case 'mouse':
            case 'none':
                // Use stored base rotation + accumulated spin offset
                particle.rotation.set(
                    particle.baseRotation.x + particle.spinOffset.x,
                    particle.baseRotation.y + particle.spinOffset.y,
                    particle.baseRotation.z + particle.spinOffset.z
                );
                break;
            case 'billboard':
                // Billboard: calculate facing direction each frame + spin offset
                const lookDir = cameraPosition.clone().sub(particle.position).normalize();
                const rotY = Math.atan2(lookDir.x, lookDir.z);
                const rotX = Math.atan2(-lookDir.y, Math.sqrt(lookDir.x * lookDir.x + lookDir.z * lookDir.z));
                particle.rotation.set(
                    rotX + particle.spinOffset.x,
                    rotY + particle.spinOffset.y,
                    particle.spinOffset.z
                );
                break;
        }

        // Look at Mouse Animation (independent of facingMode, stackable effect)
        if (settings.lookAtMouseEnabled && currentMouseWorldPos) {
            const toMouse = currentMouseWorldPos.clone().sub(particle.position);
            const distance = toMouse.length();

            if (distance > 0.01) {
                // Calculate ideal rotation angles to face the mouse
                // Yaw (Y-axis): horizontal rotation based on X/Z position
                const idealYaw = Math.atan2(toMouse.x, toMouse.z);
                // Pitch (X-axis): vertical rotation based on Y and horizontal distance
                const horizontalDist = Math.sqrt(toMouse.x * toMouse.x + toMouse.z * toMouse.z);
                const idealPitch = Math.atan2(-toMouse.y, horizontalDist);

                // Get limits in radians
                const maxLeft = THREE.MathUtils.degToRad(settings.lookAtMaxAngleLeft);
                const maxRight = THREE.MathUtils.degToRad(settings.lookAtMaxAngleRight);
                const maxUp = THREE.MathUtils.degToRad(settings.lookAtMaxAngleUp);
                const maxDown = THREE.MathUtils.degToRad(settings.lookAtMaxAngleDown);

                // Clamp yaw based on direction (positive = right, negative = left)
                let targetRotY;
                if (idealYaw >= 0) {
                    targetRotY = Math.min(idealYaw, maxRight);
                } else {
                    targetRotY = Math.max(idealYaw, -maxLeft);
                }

                // Clamp pitch based on direction (positive = down, negative = up)
                let targetRotX;
                if (idealPitch >= 0) {
                    targetRotX = Math.min(idealPitch, maxDown);
                } else {
                    targetRotX = Math.max(idealPitch, -maxUp);
                }

                // Optional roll (tilt) - proportional to horizontal offset, clamped
                const targetRotZ = THREE.MathUtils.clamp(toMouse.x * 0.2, -0.5, 0.5);

                // Smoothly interpolate toward target
                const strength = settings.lookAtMouseStrength;
                particle.rotation.x += (targetRotX - particle.rotation.x) * strength;
                particle.rotation.y += (targetRotY - particle.rotation.y) * strength;
                particle.rotation.z += (targetRotZ - particle.rotation.z) * strength;
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

    // Update lerp pools
    if (useLerpPools) {
        lerpPools.forEach(({ pool }) => {
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

// ========== CUSTOM CURSOR SYSTEM ==========
function initCursorSystem() {
    cursorElement = document.createElement('div');
    cursorElement.id = 'custom-cursor';
    cursorElement.style.cssText = `
        position: fixed;
        pointer-events: none;
        display: none;
        z-index: 1000;
        transform: translate(-50%, -50%);
    `;
    document.body.appendChild(cursorElement);
}

function updateCursorPosition(e) {
    if (!settings.cursorEnabled || !cursorElement || !settings.cursorImage) return;

    cursorElement.style.left = e.clientX + 'px';
    cursorElement.style.top = e.clientY + 'px';
}

function updateCursorAppearance() {
    if (!cursorElement) return;

    if (settings.cursorEnabled && settings.cursorImage) {
        cursorElement.innerHTML = '';
        const img = document.createElement('img');
        img.src = settings.cursorImage;
        img.style.width = settings.cursorSize + 'px';
        img.style.height = settings.cursorSize + 'px';
        img.style.objectFit = 'contain';
        cursorElement.appendChild(img);

        // Update cursor visibility if mouse is over canvas
        const canvasRect = canvas.getBoundingClientRect();
        const mouseX = parseInt(cursorElement.style.left) || 0;
        const mouseY = parseInt(cursorElement.style.top) || 0;

        if (mouseX >= canvasRect.left && mouseX <= canvasRect.right &&
            mouseY >= canvasRect.top && mouseY <= canvasRect.bottom) {
            canvas.style.cursor = 'none';
            cursorElement.style.display = 'block';
        }
    } else {
        canvas.style.cursor = 'default';
        cursorElement.style.display = 'none';
        cursorElement.innerHTML = '';
    }
}

// ========== CUSTOM MATCAP UPLOAD ==========
function handleMatcapUpload(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Dispose old texture if exists
                if (uploadedMatcapTexture) {
                    uploadedMatcapTexture.dispose();
                }

                // Create new texture from uploaded image
                uploadedMatcapTexture = new THREE.Texture(img);
                uploadedMatcapTexture.needsUpdate = true;

                console.log('3D Trail: Custom matcap uploaded successfully');

                // If matcapUpload mode is active, update the material
                if (settings.materialEnabled && settings.materialType === 'matcapUpload') {
                    applyUploadedMatcap();
                }

                resolve(uploadedMatcapTexture);
            };
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            img.src = event.target.result;
        };
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
    });
}

function applyUploadedMatcap() {
    if (!uploadedMatcapTexture || !particlePool?.instancedMesh) return;

    // Create a simple matcap material with the uploaded texture
    // No shader modifications - display the matcap as-is for vibrant colors
    const material = new THREE.MeshMatcapMaterial({
        matcap: uploadedMatcapTexture
    });

    // Dispose old custom material if exists
    if (customMaterial) {
        if (customMaterial.matcap && customMaterial.matcap !== uploadedMatcapTexture) {
            customMaterial.matcap.dispose();
        }
        customMaterial.dispose();
    }

    customMaterial = material;
    particlePool.instancedMesh.material = material;
    console.log('3D Trail: Uploaded matcap applied');
}

function applySolidColor() {
    if (!particlePool?.instancedMesh) return;

    // Create a simple solid color material
    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(settings.solidColor),
        metalness: 0.3,
        roughness: 0.7,
        side: THREE.DoubleSide
    });

    // Dispose old custom material if exists
    if (customMaterial) {
        if (customMaterial.matcap) {
            customMaterial.matcap.dispose();
        }
        customMaterial.dispose();
    }

    customMaterial = material;
    particlePool.instancedMesh.material = material;
    console.log('3D Trail: Solid color applied');
}

function clearUploadedMatcap() {
    if (uploadedMatcapTexture) {
        uploadedMatcapTexture.dispose();
        uploadedMatcapTexture = null;
    }

    // If we're in matcapUpload mode, switch back to solid
    if (settings.materialType === 'matcapUpload') {
        settings.materialType = 'solid';
        applyCurrentMaterial();
    }
}

// Apply the current material based on materialType setting
function applyCurrentMaterial() {
    if (!particlePool?.instancedMesh) return;

    // Store original material for reference (first time only)
    if (!originalMaterial) {
        originalMaterial = particlePool.instancedMesh.material;
    }

    // Clean up existing multi-gradient systems
    cleanupMultiGradientPools();
    cleanupLerpPools();
    cleanupAgeFading();

    // Apply material based on type
    if (settings.materialType === 'solid') {
        applySolidColor();
    } else if (settings.materialType === 'matcapUpload' && uploadedMatcapTexture) {
        applyUploadedMatcap();
    } else {
        // Gradient mode
        customMaterial = createCustomMaterial();
        if (customMaterial) {
            particlePool.instancedMesh.material = customMaterial;
        }

        // Initialize multi-gradient pools based on mode
        if (settings.gradientSets.length >= 2) {
            if (settings.multiGradientMode === 'random') {
                initMultiGradientPools();
            } else if (settings.multiGradientMode === 'lerp') {
                initLerpPools();
            } else if (settings.multiGradientMode === 'age') {
                initAgeFading();
            }
        }
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
            // Defer to next tick to ensure aria-pressed is updated by toggle script first
            setTimeout(() => {
                const isPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
                if (window.Chatooly && window.Chatooly.backgroundManager) {
                    Chatooly.backgroundManager.setTransparent(isPressed);
                }
                updateBackground();
            }, 0);
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
        // Determine if flat mode (no lighting effects)
        const isFlat = settings.shaderMode === 'flat';

        // Uniforms for lighting effects (still needed for non-flat modes)
        shader.uniforms.rimColor = { value: new THREE.Color(settings.rimColor) };
        shader.uniforms.rimIntensity = { value: isFlat ? 0 : (settings.rimEnabled ? settings.rimIntensity : 0) };
        shader.uniforms.lightColor = { value: new THREE.Color(settings.lightColor) };
        shader.uniforms.lightIntensity = { value: isFlat ? 1.0 : settings.lightIntensity };
        shader.uniforms.toonMode = { value: settings.shaderMode === 'toon' ? 1 : 0 };
        shader.uniforms.flatMode = { value: isFlat ? 1 : 0 };

        // Matcap blending uniforms
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
            uniform int flatMode;
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

        // Add lighting effects before opaque_fragment (skipped in flat mode)
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <opaque_fragment>',
            `// Flat mode: pure matcap colors without lighting modification
            if (flatMode == 0) {
                // Apply light color and intensity
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
            }

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

    // In flat mode, use centered gradient (no light offset)
    const useCentered = settings.shaderMode === 'flat';

    // Generate new textures for each gradient
    settings.gradientSets.forEach((gradient) => {
        const texture = matcapGenerator.generate(
            gradient.stops,
            gradient.type,
            settings.lightPosition,
            useCentered
        );
        gradientTextures.push(texture);
    });
}

function updateMaterial() {
    if (!settings.materialEnabled || !matcapGenerator) return;

    // Determine if flat mode (centered gradient, no lighting)
    const isFlat = settings.shaderMode === 'flat';

    // Update main custom material if it exists
    if (customMaterial && particlePool?.instancedMesh) {
        // Get current gradient from gradientSets
        const currentGradient = settings.gradientSets[settings.activeGradientIndex] || settings.gradientSets[0];

        // Regenerate matcap texture (centered in flat mode)
        const texture = matcapGenerator.generate(
            currentGradient.stops,
            currentGradient.type,
            settings.lightPosition,
            isFlat
        );

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
            uniforms.rimIntensity.value = isFlat ? 0 : (settings.rimEnabled ? settings.rimIntensity : 0);
            uniforms.lightColor.value.set(settings.lightColor);
            uniforms.lightIntensity.value = isFlat ? 1.0 : settings.lightIntensity;
            uniforms.toonMode.value = settings.shaderMode === 'toon' ? 1 : 0;
            uniforms.flatMode.value = isFlat ? 1 : 0;
        }
    }

    // ALWAYS update multi-gradient pool materials when lighting changes
    // These are independent of the main particlePool
    updateMultiGradientPoolMaterials();
    updateLerpPoolMaterials();
    updateAgeFadingMaterial();
}

function toggleMaterialMode(enabled) {
    settings.materialEnabled = enabled;
    if (!particlePool?.instancedMesh) return;

    if (enabled) {
        // Store original material and apply custom
        if (!originalMaterial) {
            originalMaterial = particlePool.instancedMesh.material;
        }

        // Choose material based on materialType
        if (settings.materialType === 'solid') {
            applySolidColor();
            console.log('3D Trail: Solid color material applied');
        } else if (settings.materialType === 'matcapUpload' && uploadedMatcapTexture) {
            applyUploadedMatcap();
            console.log('3D Trail: Uploaded MatCap material applied');
        } else {
            // Default to gradient
            customMaterial = createCustomMaterial();
            if (customMaterial) {
                particlePool.instancedMesh.material = customMaterial;
                console.log('3D Trail: Gradient material applied');
            }

            // Initialize multi-gradient pools based on mode
            if (settings.gradientSets.length >= 2) {
                if (settings.multiGradientMode === 'random') {
                    initMultiGradientPools();
                } else if (settings.multiGradientMode === 'lerp') {
                    initLerpPools();
                } else if (settings.multiGradientMode === 'age') {
                    initAgeFading();
                }
            }
        }
    } else {
        // Restore original material
        if (originalMaterial) {
            particlePool.instancedMesh.material = originalMaterial;
        }
        if (customMaterial) {
            if (customMaterial.matcap && customMaterial.matcap !== uploadedMatcapTexture) {
                customMaterial.matcap.dispose();
            }
            customMaterial.dispose();
            customMaterial = null;
        }

        // Clean up all multi-gradient systems
        cleanupMultiGradientPools();
        cleanupLerpPools();
        cleanupAgeFading();

        console.log('3D Trail: Original material restored');
    }
}

// ========== MULTI-GRADIENT MANAGEMENT ==========

// Create material for a specific gradient
function createMaterialForGradient(gradientIndex) {
    if (!matcapGenerator) return null;

    const gradient = settings.gradientSets[gradientIndex];
    if (!gradient) return null;

    // In flat mode, use centered gradient (no light offset)
    const isFlat = settings.shaderMode === 'flat';

    const texture = matcapGenerator.generate(
        gradient.stops,
        gradient.type,
        settings.lightPosition,
        isFlat
    );

    const material = new THREE.MeshMatcapMaterial({
        matcap: texture,
        side: THREE.DoubleSide,
        flatShading: settings.shaderMode === 'toon'
    });

    // Pre-create uniform objects so we can update them before shader compiles
    material.userData.uniforms = {
        rimColor: { value: new THREE.Color(settings.rimColor) },
        rimIntensity: { value: isFlat ? 0 : (settings.rimEnabled ? settings.rimIntensity : 0) },
        lightColor: { value: new THREE.Color(settings.lightColor) },
        lightIntensity: { value: isFlat ? 1.0 : settings.lightIntensity },
        toonMode: { value: settings.shaderMode === 'toon' ? 1 : 0 },
        flatMode: { value: isFlat ? 1 : 0 }
    };

    // Extend with rim light via onBeforeCompile (skipped in flat mode)
    material.onBeforeCompile = (shader) => {
        // Use pre-created uniforms so updates work before and after compilation
        shader.uniforms.rimColor = material.userData.uniforms.rimColor;
        shader.uniforms.rimIntensity = material.userData.uniforms.rimIntensity;
        shader.uniforms.lightColor = material.userData.uniforms.lightColor;
        shader.uniforms.lightIntensity = material.userData.uniforms.lightIntensity;
        shader.uniforms.toonMode = material.userData.uniforms.toonMode;
        shader.uniforms.flatMode = material.userData.uniforms.flatMode;

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
            `// Flat mode: pure matcap colors without lighting modification
            if (flatMode == 0) {
                outgoingLight *= lightColor * lightIntensity;
                if (toonMode == 1) {
                    outgoingLight = floor(outgoingLight * 4.0) / 4.0;
                }
                vec3 rimViewDir = normalize(vViewPosition);
                float rimFactor = 1.0 - max(0.0, dot(normalize(vNormal), -rimViewDir));
                rimFactor = pow(rimFactor, 2.0);
                outgoingLight += rimColor * rimFactor * rimIntensity;
            }
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

    const isFlat = settings.shaderMode === 'flat';

    gradientPools.forEach(({ material, gradientIndex }) => {
        const gradient = settings.gradientSets[gradientIndex];
        if (!gradient || !matcapGenerator) return;

        // Regenerate texture (centered in flat mode)
        const texture = matcapGenerator.generate(
            gradient.stops,
            gradient.type,
            settings.lightPosition,
            isFlat
        );

        if (material.matcap) material.matcap.dispose();
        material.matcap = texture;
        material.flatShading = settings.shaderMode === 'toon';
        material.needsUpdate = true;

        // Update uniforms - try compiled shader first, fall back to userData.uniforms
        const uniforms = material.userData.shader?.uniforms || material.userData.uniforms;
        if (uniforms) {
            uniforms.rimColor.value.set(settings.rimColor);
            uniforms.rimIntensity.value = isFlat ? 0 : (settings.rimEnabled ? settings.rimIntensity : 0);
            uniforms.lightColor.value.set(settings.lightColor);
            uniforms.lightIntensity.value = isFlat ? 1.0 : settings.lightIntensity;
            uniforms.toonMode.value = settings.shaderMode === 'toon' ? 1 : 0;
            uniforms.flatMode.value = isFlat ? 1 : 0;
        }
    });
}

// Update lerp pool materials (when lighting/shader settings change)
function updateLerpPoolMaterials() {
    if (!useLerpPools || !matcapGenerator) return;

    const isFlat = settings.shaderMode === 'flat';

    lerpPools.forEach(({ material, gradientData }) => {
        // Regenerate texture with current light position (centered in flat mode)
        if (gradientData) {
            const texture = matcapGenerator.generate(
                gradientData.stops,
                gradientData.type,
                settings.lightPosition,
                isFlat
            );
            if (material.matcap) material.matcap.dispose();
            material.matcap = texture;
            material.flatShading = settings.shaderMode === 'toon';
            material.needsUpdate = true;
        }

        // Update uniforms - try compiled shader first, fall back to userData.uniforms
        const uniforms = material.userData.shader?.uniforms || material.userData.uniforms;
        if (uniforms) {
            uniforms.rimColor.value.set(settings.rimColor);
            uniforms.rimIntensity.value = isFlat ? 0 : (settings.rimEnabled ? settings.rimIntensity : 0);
            uniforms.lightColor.value.set(settings.lightColor);
            uniforms.lightIntensity.value = isFlat ? 1.0 : settings.lightIntensity;
            uniforms.toonMode.value = settings.shaderMode === 'toon' ? 1 : 0;
            uniforms.flatMode.value = isFlat ? 1 : 0;
        }
    });
}

// Update age fading material (when lighting/shader settings change)
function updateAgeFadingMaterial() {
    if (!useAgeFading || !ageFadingMaterial || !matcapGenerator) return;

    const isFlat = settings.shaderMode === 'flat';

    // Regenerate both textures with current light position (centered in flat mode)
    const gradA = settings.gradientSets[0];
    const gradB = settings.gradientSets[1];

    if (gradA && gradB) {
        const textureA = matcapGenerator.generate(gradA.stops, gradA.type, settings.lightPosition, isFlat);
        const textureB = matcapGenerator.generate(gradB.stops, gradB.type, settings.lightPosition, isFlat);

        // Update main matcap texture
        if (ageFadingMaterial.matcap) ageFadingMaterial.matcap.dispose();
        ageFadingMaterial.matcap = textureA;
        ageFadingMaterial.flatShading = settings.shaderMode === 'toon';
        ageFadingMaterial.needsUpdate = true;

        // Update uniforms - try compiled shader first, fall back to userData.uniforms
        const uniforms = ageFadingMaterial.userData.shader?.uniforms || ageFadingMaterial.userData.uniforms;
        if (uniforms) {
            // Dispose old textureB and update
            if (ageFadingMaterial.userData.textureB) {
                ageFadingMaterial.userData.textureB.dispose();
            }
            ageFadingMaterial.userData.textureB = textureB;
            uniforms.matcap2.value = textureB;

            // Update other uniforms
            uniforms.rimColor.value.set(settings.rimColor);
            uniforms.rimIntensity.value = isFlat ? 0 : (settings.rimEnabled ? settings.rimIntensity : 0);
            uniforms.lightColor.value.set(settings.lightColor);
            uniforms.lightIntensity.value = isFlat ? 1.0 : settings.lightIntensity;
            uniforms.toonMode.value = settings.shaderMode === 'toon' ? 1 : 0;
            uniforms.flatMode.value = isFlat ? 1 : 0;
        }
    }
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

// ========== LERP MODE SYSTEM ==========
// Interpolate between two gradient stop arrays
function interpolateGradientStops(stopsA, stopsB, ratio) {
    // Create interpolated stops - use the same positions, blend colors
    const result = [];
    const numStops = Math.max(stopsA.length, stopsB.length);

    for (let i = 0; i < numStops; i++) {
        const stopA = stopsA[Math.min(i, stopsA.length - 1)];
        const stopB = stopsB[Math.min(i, stopsB.length - 1)];

        // Parse hex colors to RGB
        const colorA = hexToRgb(stopA.color);
        const colorB = hexToRgb(stopB.color);

        // Interpolate colors
        const r = Math.round(colorA.r + (colorB.r - colorA.r) * ratio);
        const g = Math.round(colorA.g + (colorB.g - colorA.g) * ratio);
        const b = Math.round(colorA.b + (colorB.b - colorA.b) * ratio);

        // Interpolate positions
        const position = stopA.position + (stopB.position - stopA.position) * ratio;

        result.push({
            color: rgbToHex(r, g, b),
            position: Math.round(position)
        });
    }

    return result;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// Initialize lerp pools with interpolated gradients
function initLerpPools() {
    if (!loadedGeometry || !settings.materialEnabled || settings.gradientSets.length < 2) return;

    // Clean up existing lerp pools
    cleanupLerpPools();

    const gradA = settings.gradientSets[0];
    const gradB = settings.gradientSets[1];
    const steps = settings.lerpSteps;

    // Generate sequence: A -> intermediate steps -> B -> intermediate steps back -> (loop)
    // Total sequence length: 2 * (steps + 1) = A + steps + B + steps
    const sequence = [];

    // Forward: A to B
    for (let i = 0; i <= steps; i++) {
        const ratio = i / (steps + 1);
        sequence.push({
            stops: interpolateGradientStops(gradA.stops, gradB.stops, ratio),
            type: gradA.type  // Use first gradient's type
        });
    }

    // Add B
    sequence.push({
        stops: gradB.stops,
        type: gradB.type
    });

    // Backward: B to A (excluding endpoints to avoid duplicates)
    for (let i = steps; i >= 1; i--) {
        const ratio = i / (steps + 1);
        sequence.push({
            stops: interpolateGradientStops(gradA.stops, gradB.stops, ratio),
            type: gradA.type
        });
    }

    console.log('3D Trail: Lerp sequence length:', sequence.length);

    // Create a pool for each step in the sequence
    const poolSize = Math.ceil(1000 / sequence.length);
    const isFlat = settings.shaderMode === 'flat';

    sequence.forEach((gradientData, index) => {
        const texture = matcapGenerator.generate(
            gradientData.stops,
            gradientData.type,
            settings.lightPosition,
            isFlat
        );

        const material = new THREE.MeshMatcapMaterial({
            matcap: texture,
            side: THREE.DoubleSide,
            flatShading: settings.shaderMode === 'toon'
        });

        // Pre-create uniform objects so we can update them before shader compiles
        material.userData.uniforms = {
            rimColor: { value: new THREE.Color(settings.rimColor) },
            rimIntensity: { value: isFlat ? 0 : (settings.rimEnabled ? settings.rimIntensity : 0) },
            lightColor: { value: new THREE.Color(settings.lightColor) },
            lightIntensity: { value: isFlat ? 1.0 : settings.lightIntensity },
            toonMode: { value: settings.shaderMode === 'toon' ? 1 : 0 },
            flatMode: { value: isFlat ? 1 : 0 }
        };

        // Add rim light shader modifications (skipped in flat mode)
        material.onBeforeCompile = (shader) => {
            // Use pre-created uniforms so updates work before and after compilation
            shader.uniforms.rimColor = material.userData.uniforms.rimColor;
            shader.uniforms.rimIntensity = material.userData.uniforms.rimIntensity;
            shader.uniforms.lightColor = material.userData.uniforms.lightColor;
            shader.uniforms.lightIntensity = material.userData.uniforms.lightIntensity;
            shader.uniforms.toonMode = material.userData.uniforms.toonMode;
            shader.uniforms.flatMode = material.userData.uniforms.flatMode;

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
                `// Flat mode: pure matcap colors without lighting modification
                if (flatMode == 0) {
                    outgoingLight *= lightColor * lightIntensity;
                    if (toonMode == 1) {
                        outgoingLight = floor(outgoingLight * 4.0) / 4.0;
                    }
                    vec3 rimViewDir = normalize(vViewPosition);
                    float rimFactor = 1.0 - max(0.0, dot(normalize(vNormal), -rimViewDir));
                    rimFactor = pow(rimFactor, 2.0);
                    outgoingLight += rimColor * rimFactor * rimIntensity;
                }
                #include <opaque_fragment>`
            );

            material.userData.shader = shader;
        };

        const pool = new ParticlePool(poolSize);
        const mesh = pool.init(loadedGeometry, material);
        scene.add(mesh);

        lerpPools.push({
            pool: pool,
            material: material,
            mesh: mesh,
            index: index,
            gradientData: gradientData  // Store for texture regeneration
        });
    });

    lerpIndex = 0;
    useLerpPools = lerpPools.length > 0;
    console.log('3D Trail: Lerp pools initialized with', lerpPools.length, 'steps');
}

// Clean up lerp pools
function cleanupLerpPools() {
    lerpPools.forEach(({ pool, material, mesh }) => {
        pool.clear();
        scene.remove(mesh);
        if (material.matcap) material.matcap.dispose();
        material.dispose();
    });
    lerpPools = [];
    useLerpPools = false;
    lerpIndex = 0;
}

// ========== AGE-BASED FADING SYSTEM ==========
// Create material with custom shader for age-based matcap blending
function createAgeFadingMaterial() {
    if (!matcapGenerator || settings.gradientSets.length < 2) return null;

    // Generate textures for gradient A and B
    const gradA = settings.gradientSets[0];
    const gradB = settings.gradientSets[1];
    const isFlat = settings.shaderMode === 'flat';

    const textureA = matcapGenerator.generate(gradA.stops, gradA.type, settings.lightPosition, isFlat);
    const textureB = matcapGenerator.generate(gradB.stops, gradB.type, settings.lightPosition, isFlat);

    // Create base matcap material
    const material = new THREE.MeshMatcapMaterial({
        matcap: textureA,
        side: THREE.DoubleSide,
        flatShading: settings.shaderMode === 'toon'
    });

    // Pre-create uniform objects so we can update them before shader compiles
    material.userData.uniforms = {
        matcap2: { value: textureB },
        rimColor: { value: new THREE.Color(settings.rimColor) },
        rimIntensity: { value: isFlat ? 0 : (settings.rimEnabled ? settings.rimIntensity : 0) },
        lightColor: { value: new THREE.Color(settings.lightColor) },
        lightIntensity: { value: isFlat ? 1.0 : settings.lightIntensity },
        toonMode: { value: settings.shaderMode === 'toon' ? 1 : 0 },
        flatMode: { value: isFlat ? 1 : 0 }
    };
    material.userData.textureB = textureB;

    // Extend shader to support age-based blending (lighting skipped in flat mode)
    material.onBeforeCompile = (shader) => {
        // Use pre-created uniforms so updates work before and after compilation
        shader.uniforms.matcap2 = material.userData.uniforms.matcap2;
        shader.uniforms.rimColor = material.userData.uniforms.rimColor;
        shader.uniforms.rimIntensity = material.userData.uniforms.rimIntensity;
        shader.uniforms.lightColor = material.userData.uniforms.lightColor;
        shader.uniforms.lightIntensity = material.userData.uniforms.lightIntensity;
        shader.uniforms.toonMode = material.userData.uniforms.toonMode;
        shader.uniforms.flatMode = material.userData.uniforms.flatMode;

        // Add instance age attribute varying
        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
            attribute float instanceAge;
            varying float vAgeRatio;`
        );

        // Pass age to fragment shader
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            vAgeRatio = instanceAge;`
        );

        // Add uniforms and varying to fragment shader
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
            uniform sampler2D matcap2;
            uniform vec3 rimColor;
            uniform float rimIntensity;
            uniform vec3 lightColor;
            uniform float lightIntensity;
            uniform int toonMode;
            uniform int flatMode;
            varying float vAgeRatio;`
        );

        // Blend matcaps based on age ratio
        shader.fragmentShader = shader.fragmentShader.replace(
            'vec4 matcapColor = texture2D( matcap, uv );',
            `vec4 matcapColor1 = texture2D( matcap, uv );
            vec4 matcapColor2 = texture2D( matcap2, uv );
            vec4 matcapColor = mix(matcapColor1, matcapColor2, vAgeRatio);`
        );

        // Add rim light + toon effect (skipped in flat mode)
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <opaque_fragment>',
            `// Flat mode: pure matcap colors without lighting modification
            if (flatMode == 0) {
                outgoingLight *= lightColor * lightIntensity;
                if (toonMode == 1) {
                    outgoingLight = floor(outgoingLight * 4.0) / 4.0;
                }
                vec3 rimViewDir = normalize(vViewPosition);
                float rimFactor = 1.0 - max(0.0, dot(normalize(vNormal), -rimViewDir));
                rimFactor = pow(rimFactor, 2.0);
                outgoingLight += rimColor * rimFactor * rimIntensity;
            }
            #include <opaque_fragment>`
        );

        material.userData.shader = shader;
    };

    return material;
}

// Initialize age-based fading system
function initAgeFading() {
    if (!loadedGeometry || !particlePool?.instancedMesh || settings.gradientSets.length < 2) return;

    // Create age attribute buffer
    const maxCount = particlePool.maxCount;
    ageFadingAgeBuffer = new Float32Array(maxCount);

    // Add instance age attribute to geometry
    const geometry = particlePool.instancedMesh.geometry;
    geometry.setAttribute('instanceAge', new THREE.InstancedBufferAttribute(ageFadingAgeBuffer, 1));

    // Create and apply the age fading material
    ageFadingMaterial = createAgeFadingMaterial();
    if (ageFadingMaterial) {
        particlePool.instancedMesh.material = ageFadingMaterial;
        useAgeFading = true;
        console.log('3D Trail: Age-based fading initialized');
    }
}

// Update age ratios for all particles
function updateAgeFadingAgeRatios() {
    if (!useAgeFading || !ageFadingAgeBuffer || !particlePool?.instancedMesh) return;

    particlePool.particles.forEach((particle, index) => {
        const ageRatio = Math.min(1, particle.age / particle.lifespan);
        ageFadingAgeBuffer[index] = ageRatio;
    });

    // Mark attribute for update
    const geometry = particlePool.instancedMesh.geometry;
    const ageAttr = geometry.getAttribute('instanceAge');
    if (ageAttr) {
        ageAttr.needsUpdate = true;
    }
}

// Clean up age fading system
function cleanupAgeFading() {
    if (ageFadingMaterial) {
        if (ageFadingMaterial.matcap) ageFadingMaterial.matcap.dispose();
        if (ageFadingMaterial.userData.textureB) ageFadingMaterial.userData.textureB.dispose();
        ageFadingMaterial.dispose();
        ageFadingMaterial = null;
    }
    ageFadingAgeBuffer = null;
    useAgeFading = false;
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

    // Update age-based fading ratios
    if (useAgeFading) {
        updateAgeFadingAgeRatios();
    }

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

    // Clear lerp pools
    if (useLerpPools) {
        lerpPools.forEach(({ pool }) => {
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
    cleanupMultiGradientPools: cleanupMultiGradientPools,
    // Custom cursor functions
    updateCursorAppearance: updateCursorAppearance,
    // Custom matcap upload functions
    handleMatcapUpload: handleMatcapUpload,
    applyUploadedMatcap: applyUploadedMatcap,
    clearUploadedMatcap: clearUploadedMatcap,
    hasUploadedMatcap: () => uploadedMatcapTexture !== null,
    // Material functions
    applySolidColor: applySolidColor,
    applyCurrentMaterial: applyCurrentMaterial,
    // Lerp mode functions
    initLerpPools: initLerpPools,
    cleanupLerpPools: cleanupLerpPools,
    updateLerpPoolMaterials: updateLerpPoolMaterials,
    // Age fading functions
    initAgeFading: initAgeFading,
    cleanupAgeFading: cleanupAgeFading,
    updateAgeFadingMaterial: updateAgeFadingMaterial
};

// ========== PRESET MANAGEMENT ==========
const PRESET_STORAGE_KEY = '3d-trail-presets';

function getPresetData() {
    // Clone settings object, excluding non-serializable/runtime items
    const preset = JSON.parse(JSON.stringify(settings));
    // Remove runtime-only properties (cursorImage is large binary data)
    delete preset.cursorImage;
    return preset;
}

function savePreset(name) {
    const preset = {
        name: name,
        timestamp: Date.now(),
        tool: '3DTrail',
        version: '1.0',
        settings: getPresetData()
    };

    // Save to localStorage
    const presets = JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || '{}');
    presets[name] = preset;
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));

    // Also download as JSON file
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    updatePresetDropdown();
}

function loadPreset(preset) {
    // Apply settings from preset (preserve cursorImage if it exists)
    const currentCursor = settings.cursorImage;
    Object.assign(settings, preset.settings);
    if (currentCursor && !preset.settings.cursorImage) {
        settings.cursorImage = currentCursor;
    }

    // Sync all UI controls to match loaded values
    syncUIToSettings();

    // Update material if needed
    if (typeof updateMaterial === 'function') {
        updateMaterial();
    }
}

function loadPresetFromStorage(name) {
    const presets = JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || '{}');
    if (presets[name]) {
        loadPreset(presets[name]);
    }
}

function deletePreset(name) {
    const presets = JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || '{}');
    delete presets[name];
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
    updatePresetDropdown();
}

function updatePresetDropdown() {
    const select = document.getElementById('preset-select');
    if (!select) return;

    const presets = JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || '{}');

    select.innerHTML = '<option value="">-- Select Preset --</option>';
    Object.keys(presets).sort().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

function syncUIToSettings() {
    // Helper to set value and dispatch input event
    const setSlider = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    const setSelect = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    const setToggle = (id, enabled) => {
        const el = document.getElementById(id);
        if (el) {
            const isPressed = el.getAttribute('aria-pressed') === 'true';
            if (isPressed !== enabled) {
                el.click();
            }
        }
    };

    const setColor = (id, value) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };

    // Trail/particle settings
    setSlider('spacing', settings.spacing);
    setSlider('size', settings.size);
    setSlider('size-min', settings.sizeMin);
    setSlider('size-max', settings.sizeMax);
    setToggle('random-size', settings.randomSize);
    setToggle('size-by-speed', settings.sizeBySpeed);
    setSlider('lifespan', settings.lifespan);
    setSlider('exit-duration', settings.exitDuration);
    setSelect('disappear-mode', settings.disappearMode);

    // Facing mode
    setSelect('facing-mode', settings.facingMode);
    setSlider('angle-x', settings.fixedAngleX);
    setSlider('angle-y', settings.fixedAngleY);
    setSlider('angle-z', settings.fixedAngleZ);

    // Material settings
    setSelect('material-type', settings.materialType);
    setColor('solid-color', settings.solidColor);
    setSelect('shader-mode', settings.shaderMode);
    setSelect('multi-gradient-mode', settings.multiGradientMode);
    setSlider('gradient-cycle-speed', settings.gradientCycleSpeed);
    setSlider('lerp-steps', settings.lerpSteps);

    // Lighting
    setSlider('light-position', settings.lightPosition);
    setSlider('light-intensity', settings.lightIntensity);
    setColor('light-color', settings.lightColor);
    setToggle('rim-enabled', settings.rimEnabled);
    setColor('rim-color', settings.rimColor);
    setSlider('rim-intensity', settings.rimIntensity);

    // Movement
    setToggle('float-enabled', settings.floatEnabled);
    setSelect('float-style', settings.floatStyle);
    setSlider('float-amplitude', settings.floatAmplitude);
    setToggle('follow-enabled', settings.followEnabled);
    setSlider('follow-strength', settings.followStrength);

    // Physics
    setToggle('gravity-enabled', settings.gravityEnabled);
    setSlider('gravity-strength', settings.gravityStrength);
    setToggle('bounce-enabled', settings.bounceEnabled);
    setSlider('bounce-amount', settings.bounceAmount);
    setToggle('spin-enabled', settings.spinEnabled);
    setSlider('spin-speed', settings.spinSpeed);
    setToggle('tumble-enabled', settings.tumbleEnabled);
    setSlider('tumble-speed', settings.tumbleSpeed);

    // Look at mouse
    setToggle('look-at-mouse-enabled', settings.lookAtMouseEnabled);
    setSlider('look-at-mouse-strength', settings.lookAtMouseStrength);
    setSlider('look-at-max-left', settings.lookAtMaxAngleLeft);
    setSlider('look-at-max-right', settings.lookAtMaxAngleRight);
    setSlider('look-at-max-up', settings.lookAtMaxAngleUp);
    setSlider('look-at-max-down', settings.lookAtMaxAngleDown);

    // Custom cursor
    setToggle('cursor-enabled', settings.cursorEnabled);
    setSlider('cursor-size', settings.cursorSize);

    // Camera
    setSlider('camera-x', settings.cameraX);
    setSlider('camera-y', settings.cameraY);
    setSlider('camera-fov', settings.cameraFOV);

    // Update gradient UI if gradients exist
    if (settings.gradientSets && settings.gradientSets[0]) {
        const event = new CustomEvent('preset-gradient-loaded', {
            detail: settings.gradientSets[0]
        });
        document.dispatchEvent(event);
    }

    // Update slider value displays
    document.querySelectorAll('.chatooly-slider').forEach(slider => {
        const valueSpan = document.querySelector(`#${slider.id}-value`);
        if (valueSpan) {
            valueSpan.textContent = slider.value;
        }
    });
}

function initPresetUI() {
    // Save preset button
    const saveBtn = document.getElementById('save-preset-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const name = prompt('Enter preset name:');
            if (!name || !name.trim()) {
                return;
            }
            savePreset(name.trim());
        });
    }

    // Preset select dropdown
    const presetSelect = document.getElementById('preset-select');
    if (presetSelect) {
        presetSelect.addEventListener('change', (e) => {
            const deleteBtn = document.getElementById('delete-preset-btn');
            if (e.target.value) {
                loadPresetFromStorage(e.target.value);
                if (deleteBtn) deleteBtn.style.display = 'block';
            } else {
                if (deleteBtn) deleteBtn.style.display = 'none';
            }
        });
    }

    // Upload preset from file
    const presetUpload = document.getElementById('preset-upload');
    if (presetUpload) {
        presetUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const preset = JSON.parse(event.target.result);
                        if (preset.settings) {
                            loadPreset(preset);
                        } else {
                            alert('Invalid preset file format');
                        }
                    } catch (err) {
                        alert('Invalid preset file: ' + err.message);
                    }
                };
                reader.readAsText(file);
                e.target.value = ''; // Reset input
            }
        });
    }

    // Delete preset button
    const deleteBtn = document.getElementById('delete-preset-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const select = document.getElementById('preset-select');
            const name = select?.value;
            if (name && confirm(`Delete preset "${name}"?`)) {
                deletePreset(name);
                deleteBtn.style.display = 'none';
            }
        });
    }

    // Initialize dropdown with saved presets
    updatePresetDropdown();
}

// Initialize preset UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initPresetUI();
});

// ========== INITIALIZE ==========
// Wait for Three.js module to load
if (window.THREE) {
    init();
} else {
    window.addEventListener('three-ready', init);
}
