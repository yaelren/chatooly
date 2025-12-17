/*
 * 3D Bar Chart Reimaginator - Main Logic
 * Author: Claude Code
 *
 * Transforms static bar chart screenshots into dynamic 3D sculptural experiences
 * with advanced materials, lighting, and motion patterns
 */

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');
canvas.width = 1920;   // HD resolution
canvas.height = 1080;

// ========== THREE.JS SETUP ==========
let scene, camera, renderer, controls;
let backgroundTexture = null;

// Chart data and visualization
let chartData = null;
let chartBars = [];
let chartImage = null;
let is3DMode = true;

// Lighting
let ambientLight, directionalLight, pointLight;

// Animation
let animationMixer = null;
let clock = new THREE.Clock();

// Resize tracking
let previousCanvasSize = { width: 1920, height: 1080 };

// ========== INITIALIZATION ==========
function init() {
    initThreeJS();
    initLighting();
    setupEventListeners();
    initBackgroundSystem();
    animate();
}

function initThreeJS() {
    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    camera.position.set(5, 5, 10);
    camera.lookAt(0, 0, 0);

    // Renderer with preserveDrawingBuffer for exports
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        preserveDrawingBuffer: true,
        alpha: true
    });
    renderer.setSize(canvas.width, canvas.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x222222, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add orbit controls for manual camera control
    // Note: We'll implement basic rotation manually to avoid external dependencies
}

function initLighting() {
    // Ambient light
    ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Directional light
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Point light (initially disabled)
    pointLight = new THREE.PointLight(0xffaa00, 0.5, 100);
    pointLight.position.set(0, 5, 5);
    pointLight.visible = false;
    scene.add(pointLight);
}

function setupEventListeners() {
    // Canvas resize handler
    document.addEventListener('chatooly:canvas-resized', onCanvasResized);

    // Mouse interaction for camera
    let isMouseDown = false;
    let mouseX = 0, mouseY = 0;

    canvas.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        const coords = window.Chatooly ?
            window.Chatooly.utils.mapMouseToCanvas(e, canvas) :
            fallbackMouseMapping(e);
        mouseX = coords.x;
        mouseY = coords.y;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;

        const coords = window.Chatooly ?
            window.Chatooly.utils.mapMouseToCanvas(e, canvas) :
            fallbackMouseMapping(e);

        const deltaX = coords.x - mouseX;
        const deltaY = coords.y - mouseY;

        // Rotate camera around the scene
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position);
        spherical.theta -= deltaX * 0.01;
        spherical.phi += deltaY * 0.01;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, 0, 0);

        mouseX = coords.x;
        mouseY = coords.y;
    });

    canvas.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const distance = camera.position.length();
        const newDistance = Math.max(3, Math.min(50, distance + e.deltaY * 0.01));
        camera.position.normalize().multiplyScalar(newDistance);
    });
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

    // Update camera aspect ratio
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(newWidth, newHeight);

    // Update background if needed
    updateBackground();

    previousCanvasSize = { width: newWidth, height: newHeight };
}

// ========== BACKGROUND SYSTEM INTEGRATION ==========
function initBackgroundSystem() {
    if (!window.Chatooly || !window.Chatooly.backgroundManager) {
        console.warn('Background manager not available');
        return;
    }

    Chatooly.backgroundManager.init(canvas);

    // Connect background controls
    connectBackgroundControls();
}

function connectBackgroundControls() {
    // Transparent Background
    const transparentBg = document.getElementById('transparent-bg');
    if (transparentBg) {
        transparentBg.addEventListener('change', (e) => {
            Chatooly.backgroundManager.setTransparent(e.target.checked);
            document.getElementById('bg-color-group').style.display =
                e.target.checked ? 'none' : 'block';
            updateBackground();
        });
    }

    // Background Color
    const bgColor = document.getElementById('bg-color');
    if (bgColor) {
        bgColor.addEventListener('input', (e) => {
            Chatooly.backgroundManager.setBackgroundColor(e.target.value);
            updateBackground();
        });
    }

    // Background Image Upload
    const bgImage = document.getElementById('bg-image');
    if (bgImage) {
        bgImage.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                await Chatooly.backgroundManager.setBackgroundImage(file);
                document.getElementById('clear-bg-image').style.display = 'block';
                document.getElementById('bg-fit-group').style.display = 'block';
                updateBackground();
            } catch (error) {
                alert('Failed to load image: ' + error.message);
            }
        });
    }

    // Clear Image
    const clearBgImage = document.getElementById('clear-bg-image');
    if (clearBgImage) {
        clearBgImage.addEventListener('click', () => {
            Chatooly.backgroundManager.clearBackgroundImage();
            document.getElementById('clear-bg-image').style.display = 'none';
            document.getElementById('bg-fit-group').style.display = 'none';
            document.getElementById('bg-image').value = '';
            updateBackground();
        });
    }

    // Image Fit Mode
    const bgFit = document.getElementById('bg-fit');
    if (bgFit) {
        bgFit.addEventListener('change', (e) => {
            Chatooly.backgroundManager.setFit(e.target.value);
            updateBackground();
        });
    }
}

function updateBackground() {
    if (!window.Chatooly || !window.Chatooly.backgroundManager) return;

    const bg = Chatooly.backgroundManager.getBackgroundState();

    // Handle transparent background
    if (bg.bgTransparent) {
        renderer.setClearAlpha(0);
        scene.background = null;
        // Clean up old texture
        if (backgroundTexture) {
            backgroundTexture.dispose();
            backgroundTexture = null;
        }
        return;
    }

    // Handle background image
    if (bg.bgImage && bg.bgImageURL) {
        // Remove old texture
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

        // Fill with solid color first
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

        // Clean up old texture
        if (backgroundTexture) {
            backgroundTexture.dispose();
            backgroundTexture = null;
        }
    }
}

// ========== CHART PARSING AND GENERATION ==========
function parseChartImage(imageElement) {
    // This is a simplified chart parsing system
    // In a production system, you'd use computer vision or ML for robust parsing

    // Create a temporary canvas to analyze the image
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    tempCanvas.width = imageElement.width;
    tempCanvas.height = imageElement.height;

    ctx.drawImage(imageElement, 0, 0);
    const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    // Simple bar detection algorithm
    const bars = detectBars(imageData, tempCanvas.width, tempCanvas.height);

    return {
        bars: bars,
        width: tempCanvas.width,
        height: tempCanvas.height,
        type: 'vertical' // Default assumption
    };
}

function detectBars(imageData, width, height) {
    // Simplified bar detection - look for rectangular regions
    // This is a placeholder implementation
    const bars = [];
    const numBars = 5; // Default number of bars for demo

    for (let i = 0; i < numBars; i++) {
        bars.push({
            x: (i / numBars) * 2 - 1, // Normalize to -1 to 1
            height: 0.5 + Math.random() * 1.5, // Random height for demo
            width: 0.3,
            color: new THREE.Color().setHSL((i / numBars) * 0.7, 0.8, 0.6),
            value: Math.random() * 100 // Demo value
        });
    }

    return bars;
}

function generateDemoChart() {
    // Generate a demo chart when no image is uploaded
    const bars = [];
    const numBars = 6;
    const colors = [
        0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c
    ];

    for (let i = 0; i < numBars; i++) {
        bars.push({
            x: (i - numBars/2 + 0.5) * 0.8,
            height: 0.5 + Math.random() * 2,
            width: 0.6,
            depth: 1.0,
            color: new THREE.Color(colors[i % colors.length]),
            value: Math.random() * 100,
            originalHeight: 0.5 + Math.random() * 2
        });
    }

    return { bars, type: 'vertical' };
}

function create3DBars(chartData) {
    // Clear existing bars
    chartBars.forEach(bar => {
        scene.remove(bar);
        if (bar.geometry) bar.geometry.dispose();
        if (bar.material) bar.material.dispose();
    });
    chartBars = [];

    chartData.bars.forEach((barData, index) => {
        const geometry = new THREE.BoxGeometry(barData.width, barData.height, barData.depth || 1.0);
        const material = new THREE.MeshStandardMaterial({
            color: barData.color,
            metalness: 0.0,
            roughness: 0.5
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(barData.x, barData.height / 2, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { ...barData, index };

        scene.add(mesh);
        chartBars.push(mesh);
    });
}

// ========== ANIMATION SYSTEM ==========
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // Update animations if mixer exists
    if (animationMixer) {
        animationMixer.update(deltaTime);
    }

    // Auto-rotate if enabled
    const autoRotate = document.getElementById('auto-rotate');
    if (autoRotate && autoRotate.getAttribute('aria-pressed') === 'true') {
        const time = clock.getElapsedTime();
        camera.position.x = Math.sin(time * 0.5) * 10;
        camera.position.z = Math.cos(time * 0.5) * 10;
        camera.lookAt(0, 0, 0);
    }

    // Render background first
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        updateBackground();
    }

    renderer.render(scene, camera);
}

// ========== HIGH-RESOLUTION EXPORT ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!scene || !camera || !renderer) {
        console.warn('3D scene not ready for export');
        return;
    }

    // Create temporary high-res renderer
    const exportRenderer = new THREE.WebGLRenderer({
        canvas: targetCanvas,
        antialias: true,
        preserveDrawingBuffer: true,
        alpha: true
    });

    const exportWidth = canvas.width * scale;
    const exportHeight = canvas.height * scale;

    targetCanvas.width = exportWidth;
    targetCanvas.height = exportHeight;
    exportRenderer.setSize(exportWidth, exportHeight);

    // Update camera aspect ratio for export
    const originalAspect = camera.aspect;
    camera.aspect = exportWidth / exportHeight;
    camera.updateProjectionMatrix();

    // Render background for export
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        const bg = Chatooly.backgroundManager.getBackgroundState();
        if (bg.bgTransparent) {
            exportRenderer.setClearAlpha(0);
        } else {
            const color = new THREE.Color(bg.bgColor);
            exportRenderer.setClearColor(color, 1);
        }
    }

    // Render the scene at high resolution
    exportRenderer.render(scene, camera);

    // Restore original camera aspect
    camera.aspect = originalAspect;
    camera.updateProjectionMatrix();

    // Clean up
    exportRenderer.dispose();

    console.log(`High-res export completed at ${scale}x resolution`);
};

// ========== INITIALIZATION ==========
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ========== ADVANCED MATERIAL SYSTEM ==========
const MaterialPresets = {
    standard: { roughness: 0.5, metalness: 0.0, opacity: 1.0, transparent: false, emissive: 0x000000, emissiveIntensity: 0.0 },
    glass: { roughness: 0.0, metalness: 0.0, opacity: 0.3, transparent: true, emissive: 0x004499, emissiveIntensity: 0.1 },
    metal: { roughness: 0.2, metalness: 1.0, opacity: 1.0, transparent: false, emissive: 0x000000, emissiveIntensity: 0.0 },
    plastic: { roughness: 0.8, metalness: 0.0, opacity: 1.0, transparent: false, emissive: 0x000000, emissiveIntensity: 0.0 },
    rubber: { roughness: 1.0, metalness: 0.0, opacity: 1.0, transparent: false, emissive: 0x000000, emissiveIntensity: 0.0 },
    fabric: { roughness: 0.9, metalness: 0.0, opacity: 1.0, transparent: false, emissive: 0x000000, emissiveIntensity: 0.0 },
    marble: { roughness: 0.1, metalness: 0.0, opacity: 1.0, transparent: false, emissive: 0x000000, emissiveIntensity: 0.0 },
    wood: { roughness: 0.8, metalness: 0.0, opacity: 1.0, transparent: false, emissive: 0x000000, emissiveIntensity: 0.0 },
    neon: { roughness: 0.0, metalness: 0.0, opacity: 0.8, transparent: true, emissive: 0xff00ff, emissiveIntensity: 1.0 },
    crystal: { roughness: 0.0, metalness: 0.2, opacity: 0.6, transparent: true, emissive: 0x44aaff, emissiveIntensity: 0.3 }
};

window.applyMaterialPreset = function(presetName) {
    const preset = MaterialPresets[presetName];
    if (!preset) return;

    // Update UI controls
    document.getElementById('roughness').value = preset.roughness;
    document.getElementById('metalness').value = preset.metalness;
    document.getElementById('opacity').value = preset.opacity;
    document.getElementById('emission-intensity').value = preset.emissiveIntensity;

    // Update displays
    document.getElementById('roughness-value').textContent = preset.roughness.toFixed(1);
    document.getElementById('metalness-value').textContent = preset.metalness.toFixed(1);
    document.getElementById('opacity-value').textContent = preset.opacity.toFixed(1);
    document.getElementById('emission-intensity-value').textContent = preset.emissiveIntensity.toFixed(1);

    // Apply to all bars
    chartBars.forEach(bar => {
        bar.material.roughness = preset.roughness;
        bar.material.metalness = preset.metalness;
        bar.material.opacity = preset.opacity;
        bar.material.transparent = preset.transparent;
        bar.material.emissive.setHex(preset.emissive);
        bar.material.emissiveIntensity = preset.emissiveIntensity;
        bar.material.needsUpdate = true;
    });
};

window.updateMaterialProperty = function(property, value) {
    chartBars.forEach(bar => {
        if (property === 'emissionIntensity') {
            bar.material.emissiveIntensity = value;
        } else {
            bar.material[property] = value;
        }

        // Handle transparency
        if (property === 'opacity') {
            bar.material.transparent = value < 1.0;
        }

        bar.material.needsUpdate = true;
    });
};

window.randomizeBarColors = function(enabled) {
    if (!enabled) return;

    chartBars.forEach(bar => {
        bar.material.color.setHSL(
            Math.random(),
            0.7 + Math.random() * 0.3,
            0.4 + Math.random() * 0.4
        );
        bar.material.needsUpdate = true;
    });
};

// ========== LIGHTING CONTROLS ==========
window.updateLighting = function(lightType, property, value) {
    switch (lightType) {
        case 'ambient':
            if (property === 'intensity') {
                ambientLight.intensity = value;
            } else if (property === 'color') {
                ambientLight.color.setHex(value.replace('#', '0x'));
            }
            break;

        case 'directional':
            if (property === 'intensity') {
                directionalLight.intensity = value;
            } else if (property === 'color') {
                directionalLight.color.setHex(value.replace('#', '0x'));
            }
            break;

        case 'point':
            if (property === 'intensity') {
                pointLight.intensity = value;
            } else if (property === 'color') {
                pointLight.color.setHex(value.replace('#', '0x'));
            }
            break;
    }
};

window.updatePointLight = function(enabled) {
    pointLight.visible = enabled;
};

// ========== 3D CONTROLS ==========
window.updateBarDepth = function(depth) {
    if (!chartData) return;

    chartData.bars.forEach((barData, index) => {
        barData.depth = depth;

        if (chartBars[index]) {
            // Update geometry
            const newGeometry = new THREE.BoxGeometry(barData.width, barData.height, depth);
            chartBars[index].geometry.dispose();
            chartBars[index].geometry = newGeometry;
        }
    });
};

window.updateBarSpacing = function(spacing) {
    if (!chartData) return;

    chartData.bars.forEach((barData, index) => {
        const baseX = (index - chartData.bars.length/2 + 0.5) * (0.8 + spacing);
        barData.x = baseX;

        if (chartBars[index]) {
            chartBars[index].position.x = baseX;
        }
    });
};

window.updateExtrusionMultiplier = function(multiplier) {
    if (!chartData) return;

    chartData.bars.forEach((barData, index) => {
        const newHeight = barData.originalHeight * multiplier;
        barData.height = newHeight;

        if (chartBars[index]) {
            // Update geometry
            const newGeometry = new THREE.BoxGeometry(barData.width, newHeight, barData.depth || 1.0);
            chartBars[index].geometry.dispose();
            chartBars[index].geometry = newGeometry;
            chartBars[index].position.y = newHeight / 2;
        }
    });
};

window.updateCameraDistance = function(distance) {
    const currentDirection = camera.position.clone().normalize();
    camera.position.copy(currentDirection.multiplyScalar(distance));
    camera.lookAt(0, 0, 0);
};

window.updateCameraAngle = function(axis, angle) {
    if (axis === 'x') {
        camera.position.y = Math.sin(angle) * camera.position.length();
    } else if (axis === 'y') {
        const distance = Math.sqrt(camera.position.x * camera.position.x + camera.position.z * camera.position.z);
        camera.position.x = Math.sin(angle) * distance;
        camera.position.z = Math.cos(angle) * distance;
    }
    camera.lookAt(0, 0, 0);
};

// ========== GSAP ANIMATION SYSTEM ==========
let currentAnimations = [];
let animationSettings = {
    speed: 1.0,
    intensity: 0.5
};

window.updateAnimationProperty = function(property, value) {
    animationSettings[property] = value;

    // Restart current animation with new settings
    const animationType = document.getElementById('animation-type').value;
    if (animationType !== 'none') {
        window.applyAnimationPreset(animationType);
    }
};

window.applyAnimationPreset = function(animationType) {
    // Clear existing animations
    currentAnimations.forEach(tween => tween.kill());
    currentAnimations = [];

    // Reset all bar positions and scales
    chartBars.forEach((bar, index) => {
        gsap.set(bar.position, { y: chartData.bars[index].height / 2 });
        gsap.set(bar.scale, { x: 1, y: 1, z: 1 });
        gsap.set(bar.rotation, { x: 0, y: 0, z: 0 });
    });

    const duration = 2 / animationSettings.speed;
    const intensity = animationSettings.intensity;

    switch (animationType) {
        case 'grow':
            chartBars.forEach((bar, index) => {
                gsap.set(bar.scale, { y: 0.1 });
                gsap.set(bar.position, { y: 0.1 });

                const tween = gsap.to(bar.scale, {
                    y: 1,
                    duration: duration,
                    delay: index * 0.1,
                    ease: "back.out(1.7)"
                });
                currentAnimations.push(tween);

                const positionTween = gsap.to(bar.position, {
                    y: chartData.bars[index].height / 2,
                    duration: duration,
                    delay: index * 0.1,
                    ease: "back.out(1.7)"
                });
                currentAnimations.push(positionTween);
            });
            break;

        case 'wave':
            chartBars.forEach((bar, index) => {
                const tween = gsap.to(bar.position, {
                    y: `+=${0.5 * intensity}`,
                    duration: duration,
                    delay: index * 0.2,
                    yoyo: true,
                    repeat: -1,
                    ease: "sine.inOut"
                });
                currentAnimations.push(tween);
            });
            break;

        case 'sway':
            chartBars.forEach((bar, index) => {
                const tween = gsap.to(bar.rotation, {
                    z: (Math.random() - 0.5) * 0.3 * intensity,
                    duration: duration * 2,
                    yoyo: true,
                    repeat: -1,
                    ease: "sine.inOut"
                });
                currentAnimations.push(tween);
            });
            break;

        case 'pulse':
            chartBars.forEach((bar, index) => {
                const tween = gsap.to(bar.scale, {
                    x: 1 + 0.3 * intensity,
                    z: 1 + 0.3 * intensity,
                    duration: duration,
                    yoyo: true,
                    repeat: -1,
                    ease: "sine.inOut"
                });
                currentAnimations.push(tween);
            });
            break;

        case 'elastic':
            chartBars.forEach((bar, index) => {
                const tween = gsap.to(bar.scale, {
                    y: 1 + 0.5 * intensity,
                    duration: duration,
                    delay: index * 0.1,
                    yoyo: true,
                    repeat: -1,
                    ease: "elastic.inOut(1, 0.5)"
                });
                currentAnimations.push(tween);
            });
            break;

        case 'stagger-reveal':
            chartBars.forEach((bar, index) => {
                gsap.set(bar.scale, { y: 0 });
                gsap.set(bar.position, { y: 0 });

                const tween = gsap.to(bar.scale, {
                    y: 1,
                    duration: duration,
                    delay: index * 0.2,
                    ease: "bounce.out"
                });
                currentAnimations.push(tween);

                const positionTween = gsap.to(bar.position, {
                    y: chartData.bars[index].height / 2,
                    duration: duration,
                    delay: index * 0.2,
                    ease: "bounce.out"
                });
                currentAnimations.push(positionTween);
            });
            break;

        case 'rotate':
            chartBars.forEach((bar, index) => {
                const tween = gsap.to(bar.rotation, {
                    y: Math.PI * 2,
                    duration: duration * 3,
                    repeat: -1,
                    ease: "none"
                });
                currentAnimations.push(tween);
            });
            break;
    }
};

// ========== 2D MODE ==========
window.toggleViewMode = function(is3D) {
    is3DMode = is3D;

    if (is3D) {
        // Switch to 3D view
        camera.position.set(5, 5, 10);
        camera.lookAt(0, 0, 0);
    } else {
        // Switch to 2D view (orthographic-like)
        camera.position.set(0, 0, 15);
        camera.lookAt(0, 0, 0);

        // Flatten bars for 2D view
        chartBars.forEach(bar => {
            bar.scale.z = 0.1;
        });
    }
};

// ========== RESET FUNCTIONS ==========
window.resetMaterials = function() {
    window.applyMaterialPreset('standard');
};

window.resetAnimations = function() {
    currentAnimations.forEach(tween => tween.kill());
    currentAnimations = [];

    chartBars.forEach((bar, index) => {
        gsap.set(bar.position, { y: chartData.bars[index].height / 2 });
        gsap.set(bar.scale, { x: 1, y: 1, z: 1 });
        gsap.set(bar.rotation, { x: 0, y: 0, z: 0 });
    });
};

window.resetLighting = function() {
    ambientLight.intensity = 0.4;
    ambientLight.color.setHex(0xffffff);

    directionalLight.intensity = 0.8;
    directionalLight.color.setHex(0xffffff);

    pointLight.intensity = 0.5;
    pointLight.color.setHex(0xffaa00);
    pointLight.visible = false;

    document.getElementById('point-light-enabled').setAttribute('aria-pressed', 'false');
};

window.resetCamera = function() {
    camera.position.set(5, 5, 10);
    camera.lookAt(0, 0, 0);

    document.getElementById('camera-distance').value = '10';
    document.getElementById('camera-angle-x').value = '0.3';
    document.getElementById('camera-angle-y').value = '0.5';

    window.UIControls.updateAllSliderDisplays();
};

// Generate demo chart on startup
setTimeout(() => {
    const demoData = generateDemoChart();
    chartData = demoData;
    create3DBars(demoData);
}, 100);