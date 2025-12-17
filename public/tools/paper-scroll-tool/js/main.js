/*
 * Paper Scroll Tool - Main Logic
 * Author: Chatooly
 *
 * Three.js image conveyor belt with flexible paper physics
 */

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');
canvas.width = 1920;
canvas.height = 1080;

// ========== THREE.JS GLOBALS ==========
let renderer, scene, camera, orbitControls;
let backgroundTexture = null;
let pathCurve = null;
let pathLine = null;

// ========== TOOL STATE ==========
const state = {
    // Images
    images: [],  // Array of { id, texture, aspectRatio, name }

    // Path configuration
    direction: 'x',
    bendAmount: 0,
    planeSpacing: 1.5,
    fillPath: false,        // Multiply images to fill path
    fillPathCount: 12,      // Target number of planes when filling
    pathScale: 1.0,         // Overall path size multiplier
    showPathDebug: false,   // Show path visualization line

    // Plane configuration
    planeRotationX: 0,
    flexIntensity: 1.0,
    sizeMode: 'bounding-box',
    planeSize: 1.0,

    // Animation
    isAnimating: true,
    speed: 0.5,
    conveyorPosition: 0,
    lastFrameTime: 0,

    // Camera
    orbitEnabled: true,
    defaultCameraPosition: new THREE.Vector3(4, 3, 7),

    // Planes
    planes: [],
    placeholderPlanes: []
};

// ========== PAPER SHADER ==========
const paperVertexShader = `
uniform float time;
uniform float speed;
uniform float bendIntensity;
uniform float phaseOffset;      // Per-plane random phase (0 to 2π)
uniform float freqMultiplier;   // Per-plane frequency variation (0.5 to 1.5)
uniform float sizeMultiplier;   // Size-based amplitude (larger = slower)

varying vec2 vUv;
varying vec3 vNormal;

void main() {
    vUv = uv;
    vNormal = normal;

    vec3 pos = position;

    // Trailing edge bends more (uv.y = 0 is bottom, 1 is top)
    float trailFactor = (1.0 - uv.y);

    // Speed-based deformation intensity
    float speedFactor = speed * bendIntensity;

    // Primary wave deformation (flutter effect) - now desynchronized per-plane
    float waveFreq = 3.0;
    float waveAmp = 0.12 * speedFactor;  // Increased from 0.08 for stronger flex
    float wave = sin(uv.y * waveFreq * freqMultiplier + time * 5.0 + phaseOffset)
               * waveAmp * sizeMultiplier * trailFactor;

    // Bend effect - trailing edge curves back
    float bendOffset = trailFactor * trailFactor * speedFactor * 0.2 * sizeMultiplier;  // Increased from 0.15

    // Secondary wave for organic movement - also desynchronized
    float wave2 = sin(uv.x * 2.0 * freqMultiplier + time * 3.0 + phaseOffset * 0.7)
                * waveAmp * 0.4 * sizeMultiplier * trailFactor;  // Increased from 0.3

    pos.z += wave + bendOffset + wave2;

    // Side-to-side motion - different phase offset for variation
    pos.x += sin(time * 2.0 * freqMultiplier + uv.y * 2.0 + phaseOffset * 1.3)
           * 0.03 * speedFactor * sizeMultiplier * trailFactor;  // Increased from 0.02

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const paperFragmentShader = `
uniform sampler2D map;
uniform float opacity;

varying vec2 vUv;
varying vec3 vNormal;

void main() {
    vec4 texColor = texture2D(map, vUv);

    // Simple lighting based on normal
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
    float light = dot(normalize(vNormal), lightDir) * 0.3 + 0.7;

    gl_FragColor = vec4(texColor.rgb * light, texColor.a * opacity);
}
`;

// ========== INITIALIZATION ==========
function init() {
    initThreeJS();
    initBackgroundManager();
    createPlaceholderPlanes();
    generatePath();
    updatePlanePositions();
    animate();
}

function initThreeJS() {
    // Renderer with preserveDrawingBuffer for exports
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        preserveDrawingBuffer: true,
        alpha: true
    });
    renderer.setSize(canvas.width, canvas.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(50, canvas.width / canvas.height, 0.1, 100);
    camera.position.copy(state.defaultCameraPosition);
    camera.lookAt(0, 0, 0);

    // Orbit Controls (enabled by default)
    orbitControls = new THREE.OrbitControls(camera, canvas);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.enabled = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(-3, 3, -3);
    scene.add(backLight);
}

function initBackgroundManager() {
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.init(canvas);
    }
}

// ========== PLACEHOLDER PLANES ==========
function createPlaceholderPlanes() {
    // Create 5 placeholder grey planes
    const placeholderCount = 5;

    for (let i = 0; i < placeholderCount; i++) {
        const plane = createPaperPlane(null, 1.0); // Grey placeholder
        state.placeholderPlanes.push(plane);
        scene.add(plane);
    }
}

// ========== PAPER PLANE CREATION ==========
function createPaperPlane(texture, aspectRatio) {
    const segments = 32;

    // Calculate dimensions based on size mode
    let width, height;
    const baseSize = state.planeSize;

    if (state.sizeMode === 'uniform-width') {
        width = baseSize;
        height = baseSize / aspectRatio;
    } else if (state.sizeMode === 'uniform-height') {
        height = baseSize;
        width = baseSize * aspectRatio;
    } else {
        // Fit bounding box
        if (aspectRatio > 1) {
            width = baseSize;
            height = baseSize / aspectRatio;
        } else {
            height = baseSize;
            width = baseSize * aspectRatio;
        }
    }

    const geometry = new THREE.PlaneGeometry(width, height, segments, segments);

    // Generate per-plane physics variation values
    // Random phase offset (0 to 2π) - each paper starts at different point in wave
    const phaseOffset = Math.random() * Math.PI * 2;

    // Frequency multiplier: random ±50% variation (range 0.5 to 1.5)
    const freqMultiplier = 0.5 + Math.random() * 1.0;

    // Size-based multiplier: larger papers = slower/heavier movement
    const area = width * height;
    const baseSizeMultiplier = 1.0 / Math.sqrt(area);
    // Normalize around 1.0 and clamp to reasonable range (0.6 to 1.4)
    const sizeMultiplier = Math.max(0.6, Math.min(1.4, baseSizeMultiplier));

    let material;
    if (texture) {
        material = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: texture },
                time: { value: 0 },
                speed: { value: 0 },
                bendIntensity: { value: state.flexIntensity },
                opacity: { value: 1.0 },
                phaseOffset: { value: phaseOffset },
                freqMultiplier: { value: freqMultiplier },
                sizeMultiplier: { value: sizeMultiplier }
            },
            vertexShader: paperVertexShader,
            fragmentShader: paperFragmentShader,
            side: THREE.DoubleSide,
            transparent: true
        });
    } else {
        // Grey placeholder material
        material = new THREE.MeshStandardMaterial({
            color: 0x555555,
            side: THREE.DoubleSide,
            roughness: 0.8,
            metalness: 0.1
        });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.aspectRatio = aspectRatio;

    return mesh;
}

// ========== PATH SYSTEM ==========
function generatePath() {
    const numPoints = Math.max(12, (state.images.length || 5) * 3);
    const radius = calculateRadius();

    const linearPoints = getLinearPoints(numPoints, radius);
    const circularPoints = getCircularPoints(numPoints, radius);

    const t = state.bendAmount / 100;

    const morphedPoints = linearPoints.map((linear, i) => {
        const circular = circularPoints[i];
        return new THREE.Vector3(
            THREE.MathUtils.lerp(linear.x, circular.x, t),
            THREE.MathUtils.lerp(linear.y, circular.y, t),
            THREE.MathUtils.lerp(linear.z, circular.z, t)
        );
    });

    // Create closed curve when bend > 50%
    const isClosed = state.bendAmount > 50;
    pathCurve = new THREE.CatmullRomCurve3(morphedPoints, isClosed);

    // Update debug line (optional)
    updatePathVisualization();
}

function calculateRadius() {
    const planeCount = state.planes.length || state.images.length || 5;
    return ((planeCount * state.planeSpacing) / (2 * Math.PI)) * state.pathScale;
}

function getLinearPoints(count, totalLength) {
    const points = [];
    const start = -totalLength;
    const end = totalLength;

    for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const pos = THREE.MathUtils.lerp(start, end, t);

        switch (state.direction) {
            case 'x':
                points.push(new THREE.Vector3(pos, 0, 0));
                break;
            case 'y':
                points.push(new THREE.Vector3(0, pos, 0));
                break;
            case 'z':
                points.push(new THREE.Vector3(0, 0, pos));
                break;
        }
    }
    return points;
}

function getCircularPoints(count, radius) {
    const points = [];

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;

        switch (state.direction) {
            case 'x':
                // Circle in YZ plane
                points.push(new THREE.Vector3(0, Math.cos(angle) * radius, Math.sin(angle) * radius));
                break;
            case 'y':
                // Circle in XZ plane
                points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
                break;
            case 'z':
                // Circle in XY plane
                points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
                break;
        }
    }
    return points;
}

function updatePathVisualization() {
    // Remove old line
    if (pathLine) {
        scene.remove(pathLine);
        pathLine.geometry.dispose();
        pathLine.material.dispose();
    }

    // Create new line for debugging
    const points = pathCurve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff3366, opacity: 0.8, transparent: true, linewidth: 2 });
    pathLine = new THREE.Line(geometry, material);
    pathLine.visible = state.showPathDebug;
    scene.add(pathLine);
}

function setPathDebugVisible(visible) {
    state.showPathDebug = visible;
    if (pathLine) {
        pathLine.visible = visible;
    }
}

// ========== PLANE POSITIONING ==========
function updatePlanePositions() {
    if (!pathCurve) return;

    // Determine which planes to position
    const planesToPosition = state.images.length > 0 ? state.planes : state.placeholderPlanes;
    const planeCount = planesToPosition.length;

    if (planeCount === 0) return;

    const spacing = 1 / Math.max(planeCount, 1);

    planesToPosition.forEach((plane, index) => {
        // Calculate position on path with spacing
        let t = (state.conveyorPosition + index * spacing) % 1;

        // Ensure t is positive
        if (t < 0) t += 1;

        // Clamp for open curves
        if (!pathCurve.closed) {
            t = Math.min(t, 0.999);
            t = Math.max(t, 0.001);
        }

        // Get position and tangent from curve
        const position = pathCurve.getPointAt(t);
        const tangent = pathCurve.getTangentAt(t);

        // Set position
        plane.position.copy(position);

        // Orient plane to follow path
        orientPlaneToTangent(plane, tangent);

        // Apply user X rotation
        plane.rotateX(state.planeRotationX);

        // Store path position for shader
        plane.userData.pathT = t;
    });
}

function orientPlaneToTangent(plane, tangent) {
    // Create a quaternion from tangent direction
    const up = new THREE.Vector3(0, 1, 0);

    // Handle edge case where tangent is parallel to up
    if (Math.abs(tangent.dot(up)) > 0.99) {
        up.set(0, 0, 1);
    }

    const matrix = new THREE.Matrix4();
    matrix.lookAt(new THREE.Vector3(), tangent, up);

    const quaternion = new THREE.Quaternion();
    quaternion.setFromRotationMatrix(matrix);

    plane.quaternion.copy(quaternion);
}

// ========== ANIMATION ==========
function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const deltaTime = (now - state.lastFrameTime) / 1000;
    state.lastFrameTime = now;

    // Update orbit controls if enabled
    if (state.orbitEnabled && orbitControls) {
        orbitControls.update();
    }

    // Update conveyor position if animating
    if (state.isAnimating) {
        const moveAmount = state.speed * deltaTime * 0.1;
        state.conveyorPosition = (state.conveyorPosition + moveAmount) % 1;

        // Update manual position slider
        const positionSlider = document.getElementById('position-slider');
        const positionValue = document.getElementById('position-value');
        if (positionSlider && positionValue) {
            positionSlider.value = Math.round(state.conveyorPosition * 100);
            positionValue.textContent = Math.round(state.conveyorPosition * 100) + '%';
        }
    }

    // Update plane positions
    updatePlanePositions();

    // Update shader uniforms
    updateShaderUniforms();

    // Render
    renderer.render(scene, camera);
}

function updateShaderUniforms() {
    const currentTime = performance.now() / 1000;
    const effectiveSpeed = state.isAnimating ? state.speed : 0;

    // Update image planes
    state.planes.forEach(plane => {
        if (plane.material.uniforms) {
            plane.material.uniforms.time.value = currentTime;
            plane.material.uniforms.speed.value = effectiveSpeed;
            plane.material.uniforms.bendIntensity.value = state.flexIntensity;
        }
    });
}

// ========== IMAGE MANAGEMENT ==========
function addImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const textureLoader = new THREE.TextureLoader();
                const texture = textureLoader.load(e.target.result, () => {
                    texture.colorSpace = THREE.SRGBColorSpace;

                    const imageData = {
                        id: Date.now() + Math.random(),
                        texture: texture,
                        aspectRatio: img.width / img.height,
                        name: file.name
                    };

                    state.images.push(imageData);

                    // Create plane for this image
                    const plane = createPaperPlane(texture, imageData.aspectRatio);
                    state.planes.push(plane);
                    scene.add(plane);

                    // Hide placeholder planes when we have images
                    state.placeholderPlanes.forEach(p => p.visible = false);

                    // Regenerate path
                    generatePath();
                    updatePlanePositions();

                    resolve(imageData);
                });
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function removeImage(id) {
    const index = state.images.findIndex(img => img.id === id);
    if (index === -1) return;

    // Dispose texture
    state.images[index].texture.dispose();
    state.images.splice(index, 1);

    // Remove plane
    const plane = state.planes[index];
    scene.remove(plane);
    plane.geometry.dispose();
    plane.material.dispose();
    state.planes.splice(index, 1);

    // Show placeholder planes if no images
    if (state.images.length === 0) {
        state.placeholderPlanes.forEach(p => p.visible = true);
    }

    // Regenerate path
    generatePath();
    updatePlanePositions();
}

function clearAllImages() {
    // Dispose all textures and planes
    state.images.forEach(img => img.texture.dispose());
    state.planes.forEach(plane => {
        scene.remove(plane);
        plane.geometry.dispose();
        plane.material.dispose();
    });

    state.images = [];
    state.planes = [];

    // Show placeholder planes
    state.placeholderPlanes.forEach(p => p.visible = true);

    // Regenerate path
    generatePath();
    updatePlanePositions();
}

// ========== PLANE REBUILDING ==========
function rebuildPlanes() {
    // Remove existing image planes
    state.planes.forEach(plane => {
        scene.remove(plane);
        plane.geometry.dispose();
        // Don't dispose material if it uses shared texture
    });
    state.planes = [];

    // Recreate planes with new settings
    if (state.images.length > 0) {
        if (state.fillPath && state.images.length < state.fillPathCount) {
            // Fill path mode: repeat images to reach target count
            const repeatCount = Math.ceil(state.fillPathCount / state.images.length);
            for (let r = 0; r < repeatCount; r++) {
                for (let i = 0; i < state.images.length; i++) {
                    if (state.planes.length >= state.fillPathCount) break;
                    const imageData = state.images[i];
                    const plane = createPaperPlane(imageData.texture, imageData.aspectRatio);
                    state.planes.push(plane);
                    scene.add(plane);
                }
            }
        } else {
            // Normal mode: one plane per image
            state.images.forEach(imageData => {
                const plane = createPaperPlane(imageData.texture, imageData.aspectRatio);
                state.planes.push(plane);
                scene.add(plane);
            });
        }
    }

    // Rebuild placeholder planes too
    state.placeholderPlanes.forEach(plane => {
        scene.remove(plane);
        plane.geometry.dispose();
        plane.material.dispose();
    });
    state.placeholderPlanes = [];

    for (let i = 0; i < 5; i++) {
        const plane = createPaperPlane(null, 1.0);
        plane.visible = state.images.length === 0;
        state.placeholderPlanes.push(plane);
        scene.add(plane);
    }

    generatePath();
    updatePlanePositions();
}

// ========== BACKGROUND SYSTEM ==========
function updateBackground() {
    if (!window.Chatooly || !window.Chatooly.backgroundManager) return;

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
        if (backgroundTexture) {
            backgroundTexture.dispose();
            backgroundTexture = null;
        }

        const canvasWidth = renderer.domElement.width;
        const canvasHeight = renderer.domElement.height;
        const dims = Chatooly.backgroundManager.calculateImageDimensions(canvasWidth, canvasHeight);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = canvasHeight;
        const ctx = tempCanvas.getContext('2d');

        ctx.fillStyle = bg.bgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, dims.offsetX, dims.offsetY, dims.drawWidth, dims.drawHeight);
            backgroundTexture = new THREE.CanvasTexture(tempCanvas);
            backgroundTexture.needsUpdate = true;
            scene.background = backgroundTexture;
            renderer.setClearColor(new THREE.Color(bg.bgColor), 1);
            renderer.setClearAlpha(1);
        };
        img.onerror = () => {
            console.error('Failed to load background image');
            const fallbackColor = new THREE.Color(bg.bgColor);
            renderer.setClearColor(fallbackColor, 1);
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

// ========== CANVAS RESIZE HANDLING ==========
function handleCanvasResize(e) {
    const newWidth = e.detail.canvas.width;
    const newHeight = e.detail.canvas.height;

    renderer.setSize(newWidth, newHeight);
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    updateBackground();
}

// ========== CAMERA CONTROLS ==========
function resetCamera() {
    camera.position.copy(state.defaultCameraPosition);
    camera.lookAt(0, 0, 0);
    if (orbitControls) {
        orbitControls.reset();
    }
}

function setOrbitEnabled(enabled) {
    state.orbitEnabled = enabled;
    if (orbitControls) {
        orbitControls.enabled = enabled;
    }
}

// ========== HIGH-RES EXPORT ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!renderer || !scene || !camera) {
        console.warn('Paper Scroll Tool not ready for high-res export');
        return;
    }

    const originalWidth = renderer.domElement.width;
    const originalHeight = renderer.domElement.height;
    const exportWidth = originalWidth * scale;
    const exportHeight = originalHeight * scale;

    // Store original size
    const originalSize = new THREE.Vector2();
    renderer.getSize(originalSize);

    // Resize for high-res
    renderer.setSize(exportWidth, exportHeight);
    camera.aspect = exportWidth / exportHeight;
    camera.updateProjectionMatrix();

    // Update background for new size
    updateBackground();

    // Small delay to let background update
    setTimeout(() => {
        // Render at high resolution
        renderer.render(scene, camera);

        // Copy to target canvas
        const ctx = targetCanvas.getContext('2d');
        targetCanvas.width = exportWidth;
        targetCanvas.height = exportHeight;
        ctx.drawImage(renderer.domElement, 0, 0);

        // Restore original size
        renderer.setSize(originalSize.x, originalSize.y);
        camera.aspect = originalSize.x / originalSize.y;
        camera.updateProjectionMatrix();
        updateBackground();

        console.log(`High-res export completed at ${scale}x resolution`);
    }, 100);
};

// ========== EXPOSE TO UI ==========
window.PaperScrollTool = {
    state,
    addImage,
    removeImage,
    clearAllImages,
    rebuildPlanes,
    generatePath,
    updateBackground,
    resetCamera,
    setOrbitEnabled,
    setPathDebugVisible,
    handleCanvasResize
};

// ========== INIT ON DOM READY ==========
document.addEventListener('DOMContentLoaded', init);

// Listen for canvas resize events
document.addEventListener('chatooly:canvas-resized', handleCanvasResize);
