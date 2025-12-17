/*
 * Data-Driven Visual Instrument - Main Logic
 * A tool that transforms data into meaningful 3D visualizations
 * Author: Claude Code
 *
 * This is not a chart generator. It's a data-driven visual instrument—
 * free to explore, strict about meaning.
 */

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');
canvas.width = 1920;   // HD resolution
canvas.height = 1080;

// ========== CORE STATE ==========
let instrumentState = {
    // Data flow
    rawInput: '',
    parsedData: null,
    dataStatus: 'empty', // 'empty', 'parsing', 'ready', 'error'

    // Visualization
    chartType: 'bars', // 'bars', 'lines', 'pie'
    isReady: false,
    hasContent: false,

    // Visual properties
    material: 'standard',
    animation: 'none',
    opacity: 0.9,
    transparency: false,

    // 3D Design properties
    depth: 1.5,
    spacing: 'auto',
    style: 'modern',

    // Animation properties
    animationSpeed: 1.0,
    autoRotate: false,

    // Scene properties
    lighting: 'studio',
    cameraAngle: 45,
    cameraDistance: 8,
    cameraAutoRotate: false,
    cameraAutoRotateSpeed: 0.5
};

// ========== THREE.JS CORE ==========
let scene, renderer, camera, controls;
let ambientLight, directionalLight;
let visualElements = [];
let animationFrame = null;
let isInitialized = false;

// ========== MATERIAL LIBRARY ==========
const MaterialLibrary = {
    standard: {
        name: 'Standard',
        create: (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 })
    },
    metallic: {
        name: 'Metallic',
        create: (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.1, metalness: 0.9 })
    },
    glass: {
        name: 'Glass',
        create: (color) => new THREE.MeshPhysicalMaterial({
            color,
            transparent: true,
            opacity: 0.3,
            transmission: 0.9,
            roughness: 0,
            metalness: 0
        })
    },
    'asphalt-4': {
        name: 'Asphalt-4',
        create: (color) => {
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color).multiplyScalar(0.3),
                roughness: 0.95,
                metalness: 0.05
            });
            // Simulate asphalt texture through color variation
            mat.color.offsetHSL(0, -0.2, -0.4);
            return mat;
        }
    },
    'asphalt-6': {
        name: 'Asphalt-6',
        create: (color) => {
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color).multiplyScalar(0.25),
                roughness: 0.98,
                metalness: 0.02
            });
            mat.color.offsetHSL(0, -0.3, -0.5);
            return mat;
        }
    },
    'asphalt-13': {
        name: 'Asphalt-13',
        create: (color) => {
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color).multiplyScalar(0.2),
                roughness: 0.99,
                metalness: 0.01
            });
            mat.color.offsetHSL(0, -0.4, -0.6);
            return mat;
        }
    },
    'asphalt-32': {
        name: 'Asphalt-32',
        create: (color) => {
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color).multiplyScalar(0.15),
                roughness: 1.0,
                metalness: 0
            });
            mat.color.offsetHSL(0, -0.5, -0.7);
            return mat;
        }
    },
    fur: {
        name: 'Fur',
        create: (color) => {
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(color).multiplyScalar(0.8),
                roughness: 0.9,
                metalness: 0
            });
            // Simulate fur-like properties
            mat.color.offsetHSL(0.02, 0.1, 0.1);
            return mat;
        }
    },
    crystal: {
        name: 'Crystal',
        create: (color) => new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(color).multiplyScalar(0.9),
            transparent: true,
            opacity: 0.7,
            transmission: 0.3,
            thickness: 0.2,
            roughness: 0.05,
            metalness: 0.1,
            ior: 2.4
        })
    },
    neon: {
        name: 'Neon',
        create: (color) => {
            const mat = new THREE.MeshBasicMaterial({
                color,
                transparent: instrumentState.opacity < 1,
                opacity: instrumentState.opacity
            });
            mat.emissive = new THREE.Color(color).multiplyScalar(0.6);
            return mat;
        }
    },
    marble: {
        name: 'Marble',
        create: (color) => new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(color).multiplyScalar(0.95),
            roughness: 0.3,
            metalness: 0.05,
            clearcoat: 0.8,
            clearcoatRoughness: 0.1,
            transparent: instrumentState.opacity < 1,
            opacity: instrumentState.opacity
        })
    }
};

// ========== DATA PARSING ENGINE ==========
class DataInstrument {
    static parseInput(text) {
        console.log('🎼 DataInstrument: Parsing input', text.length, 'characters');

        if (!text || !text.trim()) {
            return { success: false, error: 'No input provided' };
        }

        const lines = text.trim().split(/\r?\n/).filter(line => line.trim());

        if (lines.length === 0) {
            return { success: false, error: 'No data lines found' };
        }

        // Detect format: space-separated or CSV
        const firstLine = lines[0];
        const hasCommas = firstLine.includes(',');
        const separator = hasCommas ? ',' : /\s+/;

        console.log('🎼 Detected separator:', hasCommas ? 'comma' : 'whitespace');

        const data = [];
        for (const line of lines) {
            const parts = line.split(separator).map(p => p.trim()).filter(p => p);

            if (parts.length >= 2) {
                const label = parts[0];
                const value = parseFloat(parts[1]);

                if (!isNaN(value) && isFinite(value)) {
                    data.push({ label, value });
                }
            }
        }

        if (data.length === 0) {
            return { success: false, error: 'No valid label-value pairs found' };
        }

        console.log('🎼 Parsed', data.length, 'data points:', data);

        return {
            success: true,
            data: data,
            stats: {
                count: data.length,
                min: Math.min(...data.map(d => d.value)),
                max: Math.max(...data.map(d => d.value)),
                sum: data.reduce((s, d) => s + d.value, 0)
            }
        };
    }

    static validateData(data) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return { valid: false, message: 'No data to validate' };
        }

        if (data.length < 2) {
            return { valid: false, message: 'Need at least 2 data points' };
        }

        const hasValidValues = data.every(d =>
            d.label && typeof d.label === 'string' &&
            typeof d.value === 'number' && !isNaN(d.value)
        );

        if (!hasValidValues) {
            return { valid: false, message: 'Invalid data format' };
        }

        return { valid: true, message: `${data.length} data points ready` };
    }
}

// ========== THREE.JS INITIALIZATION ==========
function initializeThreeJS() {
    console.log('🎨 Initializing Three.js visualization engine...');

    try {
        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f5f5);

        // Camera
        const aspect = canvas.width / canvas.height;
        camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        setCameraPosition();

        // Renderer
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            preserveDrawingBuffer: true,
            alpha: true
        });

        renderer.setSize(canvas.width, canvas.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting
        setupLighting();

        // Start render loop
        isInitialized = true;
        startRenderLoop();

        console.log('🎨 Three.js initialized successfully');
        return true;

    } catch (error) {
        console.error('🎨 Failed to initialize Three.js:', error);
        return false;
    }
}

function setupLighting() {
    // Clear existing lights
    scene.children = scene.children.filter(child => !(child instanceof THREE.Light));

    // Studio lighting setup
    ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;

    scene.add(ambientLight);
    scene.add(directionalLight);
}

function setCameraPosition() {
    if (!camera) return;

    const distance = instrumentState.cameraDistance;
    const angle = instrumentState.cameraAngle * Math.PI / 180;

    camera.position.x = Math.sin(angle) * distance;
    camera.position.y = Math.cos(angle) * distance * 0.7;
    camera.position.z = Math.cos(angle) * distance;
    camera.lookAt(0, 0, 0);
}

function updateCameraAutoRotation() {
    if (!camera || !instrumentState.cameraAutoRotate) return;

    const time = Date.now() * 0.001 * instrumentState.cameraAutoRotateSpeed;
    const distance = instrumentState.cameraDistance;
    const baseAngle = instrumentState.cameraAngle * Math.PI / 180;

    camera.position.x = Math.sin(time) * distance;
    camera.position.y = Math.cos(baseAngle) * distance * 0.7;
    camera.position.z = Math.cos(time) * distance;
    camera.lookAt(0, 0, 0);
}

// ========== VISUALIZATION GENERATORS ==========
function create3DBars(data) {
    console.log('📊 Creating 3D bars for', data.length, 'data points');

    clearVisualElements();

    const maxValue = Math.max(...data.map(d => d.value));

    // Dynamic spacing based on setting
    let spacing;
    switch (instrumentState.spacing) {
        case 'tight': spacing = Math.min(1.2, 8 / data.length); break;
        case 'normal': spacing = Math.min(1.8, 12 / data.length); break;
        case 'wide': spacing = Math.min(2.5, 16 / data.length); break;
        default: spacing = Math.min(2, 12 / data.length); // auto
    }

    data.forEach((item, index) => {
        const height = Math.max(0.2, (item.value / maxValue) * 5);

        // Style-dependent dimensions
        let width, depth;
        switch (instrumentState.style) {
            case 'minimal':
                width = 0.4;
                depth = 0.8;
                break;
            case 'bold':
                width = 1.2;
                depth = 2.0;
                break;
            case 'elegant':
                width = 0.6;
                depth = 1.2;
                break;
            default: // modern
                width = 0.8;
                depth = instrumentState.depth;
        }

        // Geometry with style variations
        let geometry;
        if (instrumentState.style === 'elegant') {
            // Rounded bars for elegant style
            geometry = new THREE.CylinderGeometry(width/2, width/2, height, 8);
        } else {
            geometry = new THREE.BoxGeometry(width, height, depth);
        }

        // Material with transparency and opacity
        const hue = (index / data.length) * 0.8;
        const color = new THREE.Color().setHSL(hue, 0.7, 0.6);
        const material = MaterialLibrary[instrumentState.material].create(color);

        // Apply global transparency settings
        if (instrumentState.transparency || instrumentState.opacity < 1) {
            material.transparent = true;
            material.opacity = instrumentState.opacity;
        }

        // Mesh
        const bar = new THREE.Mesh(geometry, material);
        bar.position.x = (index - data.length / 2) * spacing;
        bar.position.y = height / 2;
        bar.position.z = 0;
        bar.castShadow = true;
        bar.receiveShadow = true;

        // Store data reference
        bar.userData = { label: item.label, value: item.value, index };

        scene.add(bar);
        visualElements.push(bar);
    });

    console.log('📊 Created', visualElements.length, '3D bars');
}

function create3DLines(data) {
    console.log('📈 Creating 3D line chart for', data.length, 'data points');

    clearVisualElements();

    const maxValue = Math.max(...data.map(d => d.value));
    const spacing = 8 / data.length;

    // Create line geometry
    const points = data.map((item, index) => {
        const x = (index - data.length / 2) * spacing;
        const y = (item.value / maxValue) * 4;
        return new THREE.Vector3(x, y, 0);
    });

    // Line
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x2196F3,
        linewidth: 3
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
    visualElements.push(line);

    // Data points as spheres
    points.forEach((point, index) => {
        const geometry = new THREE.SphereGeometry(0.15, 16, 12);
        const hue = (index / data.length) * 0.8;
        const color = new THREE.Color().setHSL(hue, 0.7, 0.6);
        const material = MaterialLibrary[instrumentState.material].create(color);

        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(point);
        sphere.castShadow = true;
        sphere.userData = { label: data[index].label, value: data[index].value, index };

        scene.add(sphere);
        visualElements.push(sphere);
    });

    console.log('📈 Created line chart with', visualElements.length, 'elements');
}

function create3DPie(data) {
    console.log('🥧 Creating 3D pie chart for', data.length, 'data points');

    clearVisualElements();

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const radius = 3;
    const thickness = 1;

    let currentAngle = 0;

    data.forEach((item, index) => {
        const angle = (item.value / total) * Math.PI * 2;
        const geometry = new THREE.CylinderGeometry(radius, radius, thickness, 32, 1, false, currentAngle, angle);

        const hue = (index / data.length) * 0.8;
        const color = new THREE.Color().setHSL(hue, 0.7, 0.6);
        const material = MaterialLibrary[instrumentState.material].create(color);

        const slice = new THREE.Mesh(geometry, material);
        slice.position.y = thickness / 2;
        slice.castShadow = true;
        slice.receiveShadow = true;
        slice.userData = { label: item.label, value: item.value, percentage: (item.value / total * 100).toFixed(1) };

        scene.add(slice);
        visualElements.push(slice);

        currentAngle += angle;
    });

    console.log('🥧 Created pie chart with', visualElements.length, 'slices');
}

function clearVisualElements() {
    visualElements.forEach(element => {
        scene.remove(element);
        if (element.geometry) element.geometry.dispose();
        if (element.material) element.material.dispose();
    });
    visualElements = [];
}

// ========== RENDER LOOP ==========
function startRenderLoop() {
    function render() {
        if (!isInitialized || !scene || !camera || !renderer) {
            return;
        }

        // Apply animations based on data
        applyDataDrivenAnimations();

        renderer.render(scene, camera);
        animationFrame = requestAnimationFrame(render);
    }
    render();
}

function applyDataDrivenAnimations() {
    if (!visualElements.length || instrumentState.animation === 'none') return;

    const time = Date.now() * 0.001 * instrumentState.animationSpeed;

    switch (instrumentState.animation) {
        case 'pulse':
            // Pulse based on data values
            visualElements.forEach((element, index) => {
                if (element.userData && element.userData.value) {
                    const intensity = element.userData.value / 100;
                    const scale = 1 + Math.sin(time * 2 + index * 0.5) * 0.15 * intensity;
                    element.scale.setScalar(scale);
                }
            });
            break;

        case 'flow':
            // Gentle rotation based on data hierarchy
            visualElements.forEach((element, index) => {
                if (element.userData) {
                    element.rotation.y = time * 0.3 + index * 0.4;
                }
            });
            break;

        case 'breathe':
            // Breathing motion - data-driven amplitude
            visualElements.forEach((element, index) => {
                if (element.userData && element.userData.value) {
                    const amplitude = (element.userData.value / 200) * 0.3;
                    const baseY = element.userData.baseY || element.position.y;
                    element.userData.baseY = baseY;
                    element.position.y = baseY + Math.sin(time * 0.8 + index * 0.6) * amplitude;
                }
            });
            break;

        case 'wave':
            // Wave motion across the data
            visualElements.forEach((element, index) => {
                if (element.userData) {
                    const waveOffset = Math.sin(time * 1.5 + index * 0.8) * 0.4;
                    const baseY = element.userData.baseY || element.position.y;
                    element.userData.baseY = baseY;
                    element.position.y = baseY + waveOffset;
                    element.rotation.z = waveOffset * 0.1;
                }
            });
            break;

        case 'orbit':
            // Elements orbit around their original position
            visualElements.forEach((element, index) => {
                if (element.userData) {
                    const radius = 0.3;
                    const speed = time * 0.5 + index * 0.7;
                    const baseX = element.userData.baseX || element.position.x;
                    const baseZ = element.userData.baseZ || element.position.z;
                    element.userData.baseX = baseX;
                    element.userData.baseZ = baseZ;

                    element.position.x = baseX + Math.cos(speed) * radius;
                    element.position.z = baseZ + Math.sin(speed) * radius;
                }
            });
            break;

        case 'spiral':
            // Spiral motion with data-driven intensity
            visualElements.forEach((element, index) => {
                if (element.userData && element.userData.value) {
                    const intensity = element.userData.value / 100;
                    const spiralTime = time + index * 0.5;
                    const spiralRadius = 0.2 * intensity;

                    const baseX = element.userData.baseX || element.position.x;
                    const baseY = element.userData.baseY || element.position.y;
                    const baseZ = element.userData.baseZ || element.position.z;

                    element.userData.baseX = baseX;
                    element.userData.baseY = baseY;
                    element.userData.baseZ = baseZ;

                    element.position.x = baseX + Math.cos(spiralTime * 2) * spiralRadius;
                    element.position.z = baseZ + Math.sin(spiralTime * 2) * spiralRadius;
                    element.position.y = baseY + Math.sin(spiralTime) * 0.1;
                    element.rotation.y = spiralTime;
                }
            });
            break;
    }

    // Apply camera auto-rotation if enabled
    updateCameraAutoRotation();
}

// ========== BACKGROUND SYSTEM ==========
function initBackground() {
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.init(canvas);
    }
}

function updateBackground() {
    if (!window.Chatooly || !window.Chatooly.backgroundManager) return;

    const bg = Chatooly.backgroundManager.getBackgroundState();

    if (bg.bgTransparent) {
        renderer.setClearAlpha(0);
        scene.background = null;
    } else {
        const color = new THREE.Color(bg.bgColor);
        renderer.setClearColor(color, 1);
        scene.background = color;
    }
}

// ========== HIGH-RES EXPORT ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!isInitialized) return;

    try {
        const originalSize = renderer.getSize(new THREE.Vector2());
        renderer.setSize(canvas.width * scale, canvas.height * scale);
        renderer.render(scene, camera);

        const exportCtx = targetCanvas.getContext('2d');
        targetCanvas.width = canvas.width * scale;
        targetCanvas.height = canvas.height * scale;
        exportCtx.drawImage(renderer.domElement, 0, 0);

        renderer.setSize(originalSize.x, originalSize.y);
        console.log('📤 High-res export completed at', scale + 'x');
    } catch (error) {
        console.error('📤 Export error:', error);
    }
};

// ========== INITIALIZATION ==========
function initialize() {
    console.log('🎼 Initializing Data-Driven Visual Instrument...');

    if (!initializeThreeJS()) {
        console.error('Failed to initialize Three.js');
        return;
    }

    initBackground();

    // Load sample data
    const sampleText = `Alpha     42
Beta      68
Gamma     31
Delta     55
Epsilon   79
Zeta      46`;

    const result = DataInstrument.parseInput(sampleText);
    if (result.success) {
        instrumentState.parsedData = result.data;
        instrumentState.dataStatus = 'ready';
        instrumentState.isReady = true;
        create3DBars(result.data);
        instrumentState.hasContent = true;
    }

    console.log('🎼 Instrument initialized with sample data');
}

// ========== CANVAS RESIZE HANDLING ==========
document.addEventListener('chatooly:canvas-resized', (e) => {
    if (camera && renderer) {
        const newWidth = e.detail.canvas.width;
        const newHeight = e.detail.canvas.height;

        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);

        updateBackground();
    }
});

// ========== PUBLIC API ==========
window.DataVisualInstrument = {
    // Core functions
    parseInput: (text) => {
        console.log('🎼 API: parseInput called');
        instrumentState.rawInput = text;
        instrumentState.dataStatus = 'parsing';

        const result = DataInstrument.parseInput(text);

        if (result.success) {
            const validation = DataInstrument.validateData(result.data);
            if (validation.valid) {
                instrumentState.parsedData = result.data;
                instrumentState.dataStatus = 'ready';
                instrumentState.isReady = true;
                return {
                    success: true,
                    data: result.data,
                    stats: result.stats,
                    message: validation.message
                };
            } else {
                instrumentState.dataStatus = 'error';
                return { success: false, error: validation.message };
            }
        } else {
            instrumentState.dataStatus = 'error';
            return { success: false, error: result.error };
        }
    },

    generateVisualization: () => {
        console.log('🎼 API: generateVisualization called');
        if (!instrumentState.isReady || !instrumentState.parsedData) {
            return { success: false, error: 'No data ready for visualization' };
        }

        try {
            switch (instrumentState.chartType) {
                case 'bars':
                    create3DBars(instrumentState.parsedData);
                    break;
                case 'lines':
                    create3DLines(instrumentState.parsedData);
                    break;
                case 'pie':
                    create3DPie(instrumentState.parsedData);
                    break;
                default:
                    create3DBars(instrumentState.parsedData);
            }

            instrumentState.hasContent = true;
            return { success: true, message: 'Visualization generated' };
        } catch (error) {
            console.error('🎼 Visualization error:', error);
            return { success: false, error: error.message };
        }
    },

    // Control functions
    setChartType: (type) => {
        if (['bars', 'lines', 'pie'].includes(type)) {
            instrumentState.chartType = type;
            if (instrumentState.isReady) {
                window.DataVisualInstrument.generateVisualization();
            }
        }
    },

    setMaterial: (materialKey) => {
        if (MaterialLibrary[materialKey]) {
            instrumentState.material = materialKey;
            if (instrumentState.hasContent) {
                window.DataVisualInstrument.generateVisualization();
            }
        }
    },

    setAnimation: (animationType) => {
        instrumentState.animation = animationType;
    },

    setOpacity: (opacity) => {
        instrumentState.opacity = Math.max(0.1, Math.min(1.0, opacity));
        if (instrumentState.hasContent) {
            window.DataVisualInstrument.generateVisualization();
        }
    },

    setTransparency: (enabled) => {
        instrumentState.transparency = enabled;
        if (instrumentState.hasContent) {
            window.DataVisualInstrument.generateVisualization();
        }
    },

    setDepth: (depth) => {
        instrumentState.depth = Math.max(0.5, Math.min(3.0, depth));
        if (instrumentState.hasContent) {
            window.DataVisualInstrument.generateVisualization();
        }
    },

    setSpacing: (spacing) => {
        if (['tight', 'normal', 'wide', 'auto'].includes(spacing)) {
            instrumentState.spacing = spacing;
            if (instrumentState.hasContent) {
                window.DataVisualInstrument.generateVisualization();
            }
        }
    },

    setStyle: (style) => {
        if (['minimal', 'modern', 'bold', 'elegant'].includes(style)) {
            instrumentState.style = style;
            if (instrumentState.hasContent) {
                window.DataVisualInstrument.generateVisualization();
            }
        }
    },

    setAnimationSpeed: (speed) => {
        instrumentState.animationSpeed = Math.max(0.1, Math.min(3.0, speed));
    },

    setCameraDistance: (distance) => {
        instrumentState.cameraDistance = Math.max(3, Math.min(20, distance));
        setCameraPosition();
    },

    setCameraAngle: (angle) => {
        instrumentState.cameraAngle = Math.max(0, Math.min(90, angle));
        setCameraPosition();
    },

    setCameraAutoRotate: (enabled) => {
        instrumentState.cameraAutoRotate = enabled;
    },

    setCameraAutoRotateSpeed: (speed) => {
        instrumentState.cameraAutoRotateSpeed = Math.max(0.1, Math.min(2.0, speed));
    },

    // Status functions
    getStatus: () => ({
        dataStatus: instrumentState.dataStatus,
        isReady: instrumentState.isReady,
        hasContent: instrumentState.hasContent,
        chartType: instrumentState.chartType,
        material: instrumentState.material,
        animation: instrumentState.animation
    }),

    getData: () => instrumentState.parsedData,
    getMaterials: () => Object.keys(MaterialLibrary),
    updateBackground: updateBackground
};

// ========== AUTO-INITIALIZATION ==========
function waitForDependencies() {
    if (typeof THREE === 'undefined') {
        console.log('🎼 Waiting for Three.js...');
        setTimeout(waitForDependencies, 100);
        return;
    }

    if (!window.Chatooly) {
        console.log('🎼 Waiting for Chatooly CDN...');
        setTimeout(waitForDependencies, 100);
        return;
    }

    initialize();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForDependencies);
} else {
    waitForDependencies();
}