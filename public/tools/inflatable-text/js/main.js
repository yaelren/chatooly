/*
 * Inflatable Text - 3D Text with Custom Shader Inflation
 * Author: Studio Video
 *
 * Features:
 * - Three.js 3D rendering with custom shader material
 * - GPU-based vertex inflation along normals
 * - Real-time geometry parameter editing
 * - Fixed camera position for consistent background sizing
 */

// ========== GLOBAL STATE ==========
const InflatableText = {
    scene: null,
    camera: null,
    renderer: null,
    letterMeshes: [], // Array of individual letter objects
    font: null,
    isInitialized: false,
    canvas: null,

    // Settings
    settings: {
        inflationSpeed: 1.0, // Speed of bevel animation (higher = faster)
        fontSize: 5,
        autoSpacing: true, // Automatically calculate spacing based on font size
        randomSpawn: false, // Use random spawn positions instead of grid layout
        letterSpacing: 0.3, // Multiplier for spacing between letters (0.1 = very tight, 2 = very loose)
        lineSpacing: 0.3, // Multiplier for spacing between lines (0.1 = very tight, 2 = very loose)
        backgroundColor: '#000000',
        backgroundImage: null, // Background image texture
        backgroundImageSprite: null, // Sprite for background image rendering
        environmentMap: null, // Environment map for reflections
        transparentBg: false, // Transparent background option
        useBackgroundAsEnv: false, // Use background color/image as environment map (optional)
        bgFillMode: 'fill', // 'fill' or 'fit'
        lightFollowsMouse: false, // Toggle whether light follows mouse

        // Fixed geometry parameters
        extrudeDepth: 0.2,
        curveSegments: 64,
        bevelSegments: 32,

        // Inflation targets (ONLY thing that animates)
        targetBevelThickness: 0.23,
        targetBevelSize: 0.15,

        // Squish Animation settings
        squishAnimation: false, // Enable squish animation
        squishSpeed: 1.0, // Speed of squish animation
        squishEasing: 'easeInOut', // Easing function
        squishPingPong: true, // Ping pong back and forth vs one-way
        squishWidthMin: 0.5, // Minimum width as percentage (50% = 0.5)
        squishWidthMax: 1.5, // Maximum width as percentage (150% = 1.5)
        squishHeightMin: 0.5, // Minimum height as percentage (50% = 0.5)
        squishHeightMax: 1.5, // Maximum height as percentage (150% = 1.5)

        // Physics settings
        spawnRadius: 5,
        gravity: 0,
        boundaryPadding: 5, // Padding from canvas edges
        bounciness: 0.1, // 0 = no bounce, 1 = full bounce
        colliderSize: 0.4, // Multiplier for collision radius (0.3 = small, 2 = large)

        // Bounding box settings
        useBoundingBoxSize: false, // Use custom width/height instead of auto-calculated
        boundingBoxWidth: 50,
        boundingBoxHeight: 40,

        // Color palette for letters
        letterColors: ['#ff6b9d', '#c44569', '#4a69bd'],

        // Material settings
        selectedMaterial: 'helium-latex', // Current material preset (helium-latex, helium-foil, custom-matcap)
        customMatcapTexture: null, // Custom uploaded matcap texture

        // Environment Map settings (simplified)
        backgroundImageEnvMap: null, // Converted background image for use as environment map

        // Lighting settings
        ambientEnabled: true,
        ambientIntensity: 0.6,      // Overall scene illumination
        mainLightEnabled: true,
        mainLightIntensity: 1.2,    // Key light (main directional)
        mainLightPosition: { x: 10, y: 20, z: 10 },
        fillLightEnabled: true,
        fillLightIntensity: 0.4,    // Fill light (softer, opposite side)
        fillLightPosition: { x: -10, y: 5, z: -5 },
        rimLightEnabled: true,
        rimLightIntensity: 0.1,     // Rim light (edge glow) - reduced for subtle effect
        rimLightPosition: { x: -5, y: 10, z: -15 }, // Rim light position

        // Debug options
        showBoundingBox: true,

        // Typing animation settings
        playTypingAnimation: false, // Toggle for typing animation
        typingSpeed: 0.1 // Delay between letters in seconds (independent from inflation speed)
    },

    // Squish animation state
    squishState: {
        time: 0, // Animation time
        direction: 1, // 1 for growing, -1 for shrinking
        currentScaleWidth: 1.0, // Current width scale factor
        currentScaleHeight: 1.0 // Current height scale factor
    },

    // Typing animation state
    typingState: {
        isPlaying: false, // Whether typing animation is currently playing
        letterQueue: [], // Queue of letters to spawn in order
        currentLetterIndex: 0, // Index of current letter being spawned
        lastSpawnTime: 0, // Time when last letter was spawned
        isLooping: false // Whether to loop the animation
    },

    // Store light references for runtime updates
    lights: {
        ambient: null,
        main: null,
        fill: null,
        rim: null
    },

    // Canvas bounds (updated on resize)
    canvasBounds: {
        minX: -400,
        maxX: 400,
        minY: -300,
        maxY: 300
    },

    // Mouse position in 3D space
    mousePosition: {
        x: 10,
        y: 20,
        z: 10
    }
};

// ========== CHATOOLY CANVAS INITIALIZATION ==========
function initializeChatoolyCanvas() {
    const setCanvasSize = () => {
        if (window.Chatooly && window.Chatooly.canvasResizer) {
            console.log('📐 Setting initial canvas size to 1000x1000');
            window.Chatooly.canvasResizer.setExportSize(1000, 1000);
            window.Chatooly.canvasResizer.applyExportSize();
        }
    };

    // Try to set size immediately if CDN is ready
    if (window.Chatooly && window.Chatooly.canvasResizer) {
        setCanvasSize();
    } else {
        // Wait for Chatooly to be ready
        window.addEventListener('chatooly:ready', setCanvasSize);
    }
}

// ========== INITIALIZATION ==========
function init() {
    InflatableText.canvas = document.getElementById('chatooly-canvas');

    // Initialize Chatooly canvas to 1000x1000
    initializeChatoolyCanvas();

    // Get container size to match canvas properly
    const container = document.getElementById('chatooly-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Setup Three.js renderer
    InflatableText.renderer = new THREE.WebGLRenderer({
        canvas: InflatableText.canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true  // Required for Chatooly exports
    });
    InflatableText.renderer.setSize(containerWidth, containerHeight);
    InflatableText.renderer.setPixelRatio(window.devicePixelRatio);
    InflatableText.renderer.shadowMap.enabled = true;
    InflatableText.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Setup scene
    InflatableText.scene = new THREE.Scene();
    updateSceneBackground();

    // Setup camera
    InflatableText.camera = new THREE.PerspectiveCamera(
        60,
        containerWidth / containerHeight,
        0.1,
        1000
    );
    InflatableText.camera.position.set(0, 0, 30);
    InflatableText.camera.lookAt(0, 0, 0);

    // OrbitControls removed - fixed camera position for consistent background sizing

    // Add lighting
    Lighting.setupLighting();

    // Add debug bounding box
    createBoundingBoxDebug();

    // Load font (don't create initial text)
    loadFont();

    // Setup controls
    setupControls();

    // Canvas click interaction removed - using grid layout now

    // Mouse move tracking for light following
    InflatableText.canvas.addEventListener('mousemove', handleMouseMove);

    // Listen for canvas resize events
    document.addEventListener('chatooly:canvas-resized', handleCanvasResize);
    window.addEventListener('resize', handleWindowResize);

    // Calculate initial canvas bounds
    updateCanvasBounds();

    // Start animation loop
    animate();

    InflatableText.isInitialized = true;
}

// ========== CANVAS RESIZE HANDLING ==========
function handleCanvasResize(e) {
    const newWidth = e.detail.canvas.width;
    const newHeight = e.detail.canvas.height;

    InflatableText.renderer.setSize(newWidth, newHeight, false);
    InflatableText.camera.aspect = newWidth / newHeight;
    InflatableText.camera.updateProjectionMatrix();
    updateCanvasBounds();
    
    // Update background sprite to match new canvas size
    if (InflatableText.settings.backgroundImage) {
        updateSceneBackground();
    }
}

function handleWindowResize() {
    const container = document.getElementById('chatooly-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    InflatableText.renderer.setSize(containerWidth, containerHeight);
    InflatableText.camera.aspect = containerWidth / containerHeight;
    InflatableText.camera.updateProjectionMatrix();
    updateCanvasBounds();
    
    // Update background sprite to match new canvas size
    if (InflatableText.settings.backgroundImage) {
        updateSceneBackground();
    }
}

// ========== MOUSE MOVE HANDLING ==========
function handleMouseMove(event) {
    if (!InflatableText.settings.lightFollowsMouse) return;

    const rect = InflatableText.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Convert screen coordinates to normalized device coordinates (-1 to +1)
    const mouseX = (x / rect.width) * 2 - 1;
    const mouseY = -(y / rect.height) * 2 + 1;

    // Convert to 3D world position at camera's Z distance
    const vector = new THREE.Vector3(mouseX, mouseY, 0.5);
    vector.unproject(InflatableText.camera);
    const dir = vector.sub(InflatableText.camera.position).normalize();
    const distance = -InflatableText.camera.position.z / dir.z;
    const pos = InflatableText.camera.position.clone().add(dir.multiplyScalar(distance));

    // Update mouse position
    InflatableText.mousePosition.x = pos.x;
    InflatableText.mousePosition.y = pos.y;
    InflatableText.mousePosition.z = 10; // Keep Z at 10 for good lighting angle

    // Update main light position using Lighting module
    Lighting.updateMainLightPosition(
        InflatableText.mousePosition.x,
        InflatableText.mousePosition.y,
        InflatableText.mousePosition.z
    );
}

// ========== UPDATE CANVAS BOUNDS ==========
function updateCanvasBounds() {
    let visibleWidth, visibleHeight;

    if (InflatableText.settings.useBoundingBoxSize) {
        // Use custom width and height
        visibleWidth = InflatableText.settings.boundingBoxWidth;
        visibleHeight = InflatableText.settings.boundingBoxHeight;
    } else {
        // Calculate visible area in world space based on camera
        const vFOV = InflatableText.camera.fov * Math.PI / 180;
        const distance = InflatableText.camera.position.z;
        visibleHeight = 2 * Math.tan(vFOV / 2) * distance;
        visibleWidth = visibleHeight * InflatableText.camera.aspect;
    }

    // Apply squish animation scale (separate width and height)
    if (InflatableText.settings.squishAnimation) {
        visibleWidth *= InflatableText.squishState.currentScaleWidth;
        visibleHeight *= InflatableText.squishState.currentScaleHeight;
    }

    const padding = InflatableText.settings.boundaryPadding;

    InflatableText.canvasBounds = {
        minX: -(visibleWidth / 2) + padding,
        maxX: (visibleWidth / 2) - padding,
        minY: -(visibleHeight / 2) + padding,
        maxY: (visibleHeight / 2) - padding
    };

    // Update debug bounding box
    updateBoundingBoxDebug();
}

// ========== DEBUG BOUNDING BOX ==========
let debugBoundingBox = null;

function createBoundingBoxDebug() {
    // Create a wireframe box to visualize boundaries
    const geometry = new THREE.BoxGeometry(1, 1, 5);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
    debugBoundingBox = new THREE.LineSegments(edges, material);
    InflatableText.scene.add(debugBoundingBox);
}

function updateBoundingBoxDebug() {
    if (!debugBoundingBox) return;

    const bounds = InflatableText.canvasBounds;
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    debugBoundingBox.scale.set(width, height, 1);
    debugBoundingBox.position.set(centerX, centerY, 0);
    debugBoundingBox.visible = InflatableText.settings.showBoundingBox;
}

// ========== BACKGROUND MANAGEMENT ==========
// Note: Lighting setup now handled by Lighting module (lighting.js)
function updateSceneBackground() {
    // Remove existing background sprite if any
    if (InflatableText.settings.backgroundImageSprite) {
        InflatableText.scene.remove(InflatableText.settings.backgroundImageSprite);
        InflatableText.settings.backgroundImageSprite = null;
    }

    if (InflatableText.settings.transparentBg) {
        // Transparent background
        InflatableText.scene.background = null;
    } else if (InflatableText.settings.backgroundImage) {
        // Use sprite for background image to control fill/fit
        createBackgroundSprite();
        InflatableText.scene.background = new THREE.Color(InflatableText.settings.backgroundColor);
    } else {
        // Solid color background
        InflatableText.scene.background = new THREE.Color(InflatableText.settings.backgroundColor);
    }
}

function createBackgroundSprite() {
    const texture = InflatableText.settings.backgroundImage;
    if (!texture) return;

    // Use camera's field of view to calculate proper background size
    const vFOV = InflatableText.camera.fov * Math.PI / 180;
    const backgroundZ = -25; // Background plane position
    const distance = Math.abs(InflatableText.camera.position.z - backgroundZ); // Actual distance from camera to background
    const visibleHeight = 2 * Math.tan(vFOV / 2) * distance;
    const visibleWidth = visibleHeight * InflatableText.camera.aspect;

    // Get texture dimensions
    const textureAspect = texture.image.width / texture.image.height;
    const cameraAspect = InflatableText.camera.aspect;

    let planeWidth, planeHeight;

    if (InflatableText.settings.bgFillMode === 'fill') {
        // Fill mode: cover entire view (may crop image)
        if (cameraAspect > textureAspect) {
            // Camera view is wider than image
            planeWidth = visibleWidth;
            planeHeight = visibleWidth / textureAspect;
        } else {
            // Camera view is taller than image
            planeHeight = visibleHeight;
            planeWidth = visibleHeight * textureAspect;
        }
    } else {
        // Fit mode: fit entire image (may show letterboxing)
        if (cameraAspect > textureAspect) {
            // Camera view is wider than image
            planeHeight = visibleHeight;
            planeWidth = visibleHeight * textureAspect;
        } else {
            // Camera view is taller than image
            planeWidth = visibleWidth;
            planeHeight = visibleWidth / textureAspect;
        }
    }

    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false
    });

    const sprite = new THREE.Mesh(geometry, material);
    sprite.position.z = -25; // Place behind all letters but closer to camera
    sprite.renderOrder = -1; // Render first

    // Debug logging
    console.log('🎨 Background sprite created:', {
        planeWidth: planeWidth.toFixed(2),
        planeHeight: planeHeight.toFixed(2),
        visibleWidth: visibleWidth.toFixed(2),
        visibleHeight: visibleHeight.toFixed(2),
        cameraAspect: cameraAspect.toFixed(2),
        textureAspect: textureAspect.toFixed(2),
        fillMode: InflatableText.settings.bgFillMode,
        distance: distance.toFixed(2)
    });

    InflatableText.settings.backgroundImageSprite = sprite;
    InflatableText.scene.add(sprite);
}

// ========== REMOVED: Physics boundaries (no longer needed) ==========

// ========== FONT LOADING ==========
function loadFont() {
    const loader = new THREE.FontLoader();

    // Load Balloony Regular JSON font
    loader.load(
        'fonts/Balloony_Regular.json',
        function(font) {
            InflatableText.font = font;
            console.log('✅ Balloony Regular font loaded - Start typing!');

            // Enable text input once font is loaded
            const textInput = document.getElementById('text-input');
            textInput.disabled = false;
            textInput.placeholder = "Type letters...";
            textInput.value = ""; // Clear initial value
            textInput.focus(); // Auto-focus for typing
        },
        undefined,
        function(error) {
            console.error('❌ Error loading Balloony font:', error);
            alert('Font loading failed. Please refresh the page.');
        }
    );
}

// ========== BALLOON MATERIAL CREATION ==========
// Note: Material creation now handled by Materials module (materials.js)
// Legacy function kept for compatibility - delegates to Materials.createBalloonMaterial()
function createBalloonMaterial(colorIndex) {
    return Materials.createBalloonMaterial(colorIndex);
}

// ========== CREATE INDIVIDUAL LETTER MESH ==========
function createLetterMesh(char, letterIndex, gridPosition = null) {
    if (!InflatableText.font) {
        console.warn('⚠️ Font not loaded yet');
        return null;
    }

    let spawnX, spawnY;

    if (gridPosition) {
        // Use grid position (from text layout)
        spawnX = gridPosition.x;
        spawnY = gridPosition.y;
    } else {
        // Calculate random spawn position around center (fallback)
        const angle = Math.random() * Math.PI * 2;
        const radius = InflatableText.settings.spawnRadius;
        spawnX = Math.cos(angle) * radius;
        spawnY = Math.sin(angle) * radius;
    }

    // Create letter object to track animation state
    const letterObj = {
        char: char,
        mesh: null,

        // Inflation animation (ONLY thing that animates during spawn)
        currentBevelThickness: 0,
        currentBevelSize: 0,
        inflation: 0, // 0 to 1
        isInflating: true,

        // Physics
        velocity: {
            x: 0,
            y: 0,
            z: 0
        },
        position: {
            x: spawnX,
            y: spawnY,
            z: 0
        }
    };

    // Create initial geometry with 0 bevel (flat)
    const geometry = createLetterGeometry(char, 0, 0);

    // Create material with color from palette, cycling through based on letter index
    const material = createBalloonMaterial(letterIndex);

    // Create mesh
    letterObj.mesh = new THREE.Mesh(geometry, material);
    letterObj.mesh.position.set(letterObj.position.x, letterObj.position.y, letterObj.position.z);
    letterObj.mesh.castShadow = true;
    letterObj.mesh.receiveShadow = true;

    // Add to scene
    InflatableText.scene.add(letterObj.mesh);

    console.log('✅ Letter created:', char);
    return letterObj;
}

// ========== CREATE LETTER GEOMETRY ==========
function createLetterGeometry(char, bevelThickness, bevelSize) {
    const geometry = new THREE.TextGeometry(char, {
        font: InflatableText.font,
        size: InflatableText.settings.fontSize,
        height: InflatableText.settings.fontSize * InflatableText.settings.extrudeDepth,
        curveSegments: InflatableText.settings.curveSegments,
        bevelEnabled: true,
        bevelThickness: InflatableText.settings.fontSize * bevelThickness,
        bevelSize: InflatableText.settings.fontSize * bevelSize,
        bevelSegments: InflatableText.settings.bevelSegments
    });

    geometry.computeBoundingBox();

    // Fix inverted normals
    const index = geometry.index;
    if (index) {
        const indices = index.array;
        for (let i = 0; i < indices.length; i += 3) {
            const temp = indices[i];
            indices[i] = indices[i + 2];
            indices[i + 2] = temp;
        }
        index.needsUpdate = true;
    }

    geometry.computeVertexNormals();
    geometry.center();

    return geometry;
}

// ========== EASING FUNCTIONS ==========
const EasingFunctions = {
    linear: (t) => t,

    easeInOut: (t) => {
        return t < 0.5
            ? 2 * t * t
            : 1 - Math.pow(-2 * t + 2, 2) / 2;
    },

    easeIn: (t) => t * t,

    easeOut: (t) => 1 - Math.pow(1 - t, 2),

    bounce: (t) => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    },

    elastic: (t) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0
            : t === 1 ? 1
            : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    }
};

// ========== UPDATE SQUISH ANIMATION ==========
function updateSquishAnimation(deltaTime) {
    if (!InflatableText.settings.squishAnimation) {
        InflatableText.squishState.currentScaleWidth = 1.0;
        InflatableText.squishState.currentScaleHeight = 1.0;
        return;
    }

    const widthMin = InflatableText.settings.squishWidthMin;
    const widthMax = InflatableText.settings.squishWidthMax;
    const heightMin = InflatableText.settings.squishHeightMin;
    const heightMax = InflatableText.settings.squishHeightMax;
    const speed = InflatableText.settings.squishSpeed;
    const easingType = InflatableText.settings.squishEasing;

    // Update animation time
    InflatableText.squishState.time += deltaTime * speed;

    // Calculate current progress using sine wave for smooth animation
    const cycle = InflatableText.squishState.time * Math.PI;
    let rawT = (Math.sin(cycle) + 1) / 2; // Normalize to 0-1

    if (!InflatableText.settings.squishPingPong) {
        // One-way: just grow or shrink repeatedly
        rawT = (Math.sin(cycle * 2) + 1) / 2;
    }

    // Apply easing function
    const easingFunc = EasingFunctions[easingType] || EasingFunctions.easeInOut;
    const t = easingFunc(rawT);

    // Interpolate between min and max size for width and height separately
    InflatableText.squishState.currentScaleWidth = widthMin + (widthMax - widthMin) * t;
    InflatableText.squishState.currentScaleHeight = heightMin + (heightMax - heightMin) * t;

    // Update canvas bounds with new scale
    updateCanvasBounds();
}

// ========== TYPING ANIMATION FUNCTIONS ==========
function startTypingAnimation() {
    if (!InflatableText.font) {
        console.warn('⚠️ Font not loaded yet');
        return;
    }

    const textInput = document.getElementById('text-input');
    const text = textInput.value.toUpperCase();
    
    if (!text.trim()) {
        console.warn('⚠️ No text to animate');
        return;
    }

    // Clear existing letters
    clearAllLetters();

    // Build letter queue from text
    InflatableText.typingState.letterQueue = [];
    const lines = text.split('\n');
    
    // Calculate grid layout parameters (same as in ui.js)
    const bounds = InflatableText.canvasBounds;
    const boxWidth = bounds.maxX - bounds.minX;
    const boxHeight = bounds.maxY - bounds.minY;

    let letterWidth, letterHeight;
    if (InflatableText.settings.autoSpacing) {
        letterWidth = InflatableText.settings.fontSize * 1.2;
        letterHeight = InflatableText.settings.fontSize * 1.5;
    } else {
        const maxLineLength = Math.max(...lines.map(line => line.length));
        letterWidth = (boxWidth / maxLineLength) * InflatableText.settings.letterSpacing;
        letterHeight = (boxHeight / lines.length) * InflatableText.settings.lineSpacing;
    }

    // Calculate total height and center vertically
    const totalTextHeight = lines.length * letterHeight;
    const verticalOffset = (boxHeight - totalTextHeight) / 2;

    // Build letter queue with positions
    lines.forEach((line, rowIndex) => {
        const lineLength = line.replace(/\s/g, '').length;
        const lineWidth = lineLength * letterWidth;
        const centerOffset = (boxWidth - lineWidth) / 2;

        let charIndexInLine = 0;
        for (let colIndex = 0; colIndex < line.length; colIndex++) {
            const char = line[colIndex];
            if (char.trim()) {
                let x, y;
                if (InflatableText.settings.randomSpawn) {
                    const angle = Math.random() * Math.PI * 2;
                    const radius = InflatableText.settings.spawnRadius;
                    x = Math.cos(angle) * radius;
                    y = Math.sin(angle) * radius;
                } else {
                    x = bounds.minX + centerOffset + charIndexInLine * letterWidth + letterWidth / 2;
                    y = bounds.maxY - verticalOffset - rowIndex * letterHeight - letterHeight / 2;
                }

                InflatableText.typingState.letterQueue.push({
                    char: char,
                    x: x,
                    y: y,
                    index: InflatableText.typingState.letterQueue.length
                });
                charIndexInLine++;
            }
        }
    });

    // Reset typing state
    InflatableText.typingState.currentLetterIndex = 0;
    InflatableText.typingState.lastSpawnTime = 0;
    InflatableText.typingState.isPlaying = true;
    InflatableText.typingState.isLooping = true;

    console.log(`🎬 Started typing animation with ${InflatableText.typingState.letterQueue.length} letters`);
}

function stopTypingAnimation() {
    InflatableText.typingState.isPlaying = false;
    InflatableText.typingState.isLooping = false;
    console.log('⏹️ Stopped typing animation');
}

function updateTypingAnimation(deltaTime) {
    if (!InflatableText.typingState.isPlaying) return;

    const currentTime = Date.now() / 1000; // Convert to seconds

    // Use typing speed setting for delay between letters (independent from inflation speed)
    const spawnDelay = InflatableText.settings.typingSpeed;

    // Check if it's time to spawn the next letter
    if (currentTime - InflatableText.typingState.lastSpawnTime >= spawnDelay) {
        const queue = InflatableText.typingState.letterQueue;
        const currentIndex = InflatableText.typingState.currentLetterIndex;

        if (currentIndex < queue.length) {
            // Spawn next letter
            const letterData = queue[currentIndex];
            const gridPosition = { x: letterData.x, y: letterData.y };
            const letterObj = createLetterMesh(letterData.char, letterData.index, gridPosition);
            
            if (letterObj) {
                InflatableText.letterMeshes.push(letterObj);
                InflatableText.typingState.currentLetterIndex++;
                InflatableText.typingState.lastSpawnTime = currentTime;
                console.log(`📝 Spawned letter: ${letterData.char} (delay: ${spawnDelay.toFixed(2)}s)`);
            }
        } else if (InflatableText.typingState.isLooping) {
            // Loop back to beginning - clear all letters first
            clearAllLetters();
            InflatableText.typingState.currentLetterIndex = 0;
            InflatableText.typingState.lastSpawnTime = currentTime;
            console.log('🔄 Looping typing animation');
        } else {
            // Animation finished
            InflatableText.typingState.isPlaying = false;
            console.log('✅ Typing animation completed');
        }
    }
}

function clearAllLetters() {
    InflatableText.letterMeshes.forEach(letterObj => {
        if (letterObj.mesh) {
            InflatableText.scene.remove(letterObj.mesh);
            letterObj.mesh.geometry.dispose();
            letterObj.mesh.material.dispose();
        }
    });
    InflatableText.letterMeshes = [];
}

// ========== UPDATE ALL LETTERS ==========
function updateLetters(deltaTime) {
    const bounds = InflatableText.canvasBounds;

    InflatableText.letterMeshes.forEach(letterObj => {
        // INFLATION ANIMATION (plays once on spawn)
        if (letterObj.isInflating) {
            letterObj.inflation += deltaTime * InflatableText.settings.inflationSpeed;

            if (letterObj.inflation >= 1.0) {
                letterObj.inflation = 1.0;
                letterObj.isInflating = false; // Stop inflating
            }

            // Ease-out cubic
            const easedInflation = 1 - Math.pow(1 - letterObj.inflation, 3);

            // Animate bevel from 0 to target values
            letterObj.currentBevelThickness = easedInflation * InflatableText.settings.targetBevelThickness;
            letterObj.currentBevelSize = easedInflation * InflatableText.settings.targetBevelSize;

            // Rebuild geometry
            const oldGeometry = letterObj.mesh.geometry;
            letterObj.mesh.geometry = createLetterGeometry(
                letterObj.char,
                letterObj.currentBevelThickness,
                letterObj.currentBevelSize
            );
            oldGeometry.dispose();
        }

        // PHYSICS (gravity and boundary collision)
        // Apply gravity
        letterObj.velocity.y -= InflatableText.settings.gravity * deltaTime * 60;

        // Update position
        letterObj.position.x += letterObj.velocity.x * deltaTime * 60;
        letterObj.position.y += letterObj.velocity.y * deltaTime * 60;

        // Boundary collision with bounce
        if (letterObj.position.x < bounds.minX) {
            letterObj.position.x = bounds.minX;
            letterObj.velocity.x = Math.abs(letterObj.velocity.x) * InflatableText.settings.bounciness;
        } else if (letterObj.position.x > bounds.maxX) {
            letterObj.position.x = bounds.maxX;
            letterObj.velocity.x = -Math.abs(letterObj.velocity.x) * InflatableText.settings.bounciness;
        }

        if (letterObj.position.y < bounds.minY) {
            letterObj.position.y = bounds.minY;
            letterObj.velocity.y = Math.abs(letterObj.velocity.y) * InflatableText.settings.bounciness;
        } else if (letterObj.position.y > bounds.maxY) {
            letterObj.position.y = bounds.maxY;
            letterObj.velocity.y = -Math.abs(letterObj.velocity.y) * InflatableText.settings.bounciness;
        }

        // Update mesh position
        letterObj.mesh.position.x = letterObj.position.x;
        letterObj.mesh.position.y = letterObj.position.y;
    });

    // Letter-to-letter collision detection
    for (let i = 0; i < InflatableText.letterMeshes.length; i++) {
        for (let j = i + 1; j < InflatableText.letterMeshes.length; j++) {
            const letterA = InflatableText.letterMeshes[i];
            const letterB = InflatableText.letterMeshes[j];

            // Calculate distance between letters
            const dx = letterB.position.x - letterA.position.x;
            const dy = letterB.position.y - letterA.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Collision radius based on font size and collider size setting
            const collisionRadius = InflatableText.settings.fontSize * InflatableText.settings.colliderSize;
            const minDistance = collisionRadius * 2;

            // Check for collision
            if (distance < minDistance && distance > 0) {
                // Calculate collision normal
                const nx = dx / distance;
                const ny = dy / distance;

                // Separate overlapping letters
                const overlap = minDistance - distance;
                const separationX = nx * overlap * 0.5;
                const separationY = ny * overlap * 0.5;

                letterA.position.x -= separationX;
                letterA.position.y -= separationY;
                letterB.position.x += separationX;
                letterB.position.y += separationY;

                // Calculate relative velocity
                const dvx = letterB.velocity.x - letterA.velocity.x;
                const dvy = letterB.velocity.y - letterA.velocity.y;
                const relativeVelocity = dvx * nx + dvy * ny;

                // Only resolve if letters are moving towards each other
                if (relativeVelocity < 0) {
                    // Apply collision response with bounciness
                    const impulse = relativeVelocity * InflatableText.settings.bounciness;
                    letterA.velocity.x -= impulse * nx;
                    letterA.velocity.y -= impulse * ny;
                    letterB.velocity.x += impulse * nx;
                    letterB.velocity.y += impulse * ny;
                }
            }
        }
    }
}

// ========== ANIMATION LOOP ==========
let lastTime = Date.now();

function animate() {
    requestAnimationFrame(animate);

    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // OrbitControls removed - no need to update

    // Update squish animation (animates bounding box size)
    updateSquishAnimation(deltaTime);

    // Update typing animation (spawns letters in sequence)
    updateTypingAnimation(deltaTime);

    // Update all letter animations
    updateLetters(deltaTime);

    // Render scene
    InflatableText.renderer.render(InflatableText.scene, InflatableText.camera);
}

// UI controls are now in ui.js


// ========== HIGH-RES EXPORT (REQUIRED FOR CHATOOLY) ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!InflatableText.isInitialized) {
        console.warn('Tool not ready for high-res export');
        return;
    }

    // Save original size
    const originalWidth = InflatableText.renderer.domElement.width;
    const originalHeight = InflatableText.renderer.domElement.height;

    // Set high-res size
    const newWidth = originalWidth * scale;
    const newHeight = originalHeight * scale;

    InflatableText.renderer.setSize(newWidth, newHeight, false);
    InflatableText.camera.aspect = newWidth / newHeight;
    InflatableText.camera.updateProjectionMatrix();

    // Render high-res frame
    InflatableText.renderer.render(InflatableText.scene, InflatableText.camera);

    // Copy to target canvas
    const ctx = targetCanvas.getContext('2d');
    targetCanvas.width = newWidth;
    targetCanvas.height = newHeight;

    // Clear canvas with transparency if transparent background is enabled
    if (InflatableText.settings.transparentBg) {
        ctx.clearRect(0, 0, newWidth, newHeight);
    }

    ctx.drawImage(InflatableText.renderer.domElement, 0, 0);

    // Restore original size
    InflatableText.renderer.setSize(originalWidth, originalHeight, false);
    InflatableText.camera.aspect = originalWidth / originalHeight;
    InflatableText.camera.updateProjectionMatrix();

    console.log(`High-res export completed at ${scale}x resolution`);
};

// ========== START THE TOOL ==========
window.addEventListener('DOMContentLoaded', init);
