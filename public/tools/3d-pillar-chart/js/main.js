/**
 * 3D Pillar Chart Visualizer - Main Logic
 * Author: Claude Code
 *
 * Three.js-based 3D bar/pillar chart with customizable themes,
 * materials, and GSAP animations.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// ========== GLOBAL STATE ==========
const state = {
    data: null,           // Parsed CSV data
    pillars: [],          // Array of pillar meshes
    labels3D: [],         // Array of 3D text sprites
    pillarGroup: null,    // Group containing all pillars

    // Settings - User's preferred defaults
    pillarShape: 'roundedBox',
    pillarWidth: 1,
    materialTheme: 'glass',
    customColor: '#4a90d9',
    seriesColors: ['#cce7ff', '#ff0000', '#2ecc71', '#f39c12', '#9b59b6'],
    matcapPreset: '',
    customMatcapTexture: null,
    labelMode: '3d',
    showValues: true,
    showLabels: true,
    fontSize: 14,
    textColor: '#ff3838',
    bloomEnabled: false,
    bloomIntensity: 1.0,
    autoRotate: true,
    rotationSpeed: 1,
    envReflections: true,
    pillarSpacing: 3,
    groupSpacing: 0.5,
    groupXOffset: 0.25,
    maxHeight: 6,
    animationStyle: 'grow',
    animationDuration: 3,
    staggerDelay: 0.5,
    bgColor: '#1a1a2e',
    bgTransparent: false,
    hdriPreset: 'sunset',
    showHdriBackground: true,
    backgroundBlurriness: 0.0
};

// ========== THREE.JS SETUP ==========
let canvas, scene, renderer, camera, controls, composer, bloomPass, envMap;
let pmremGenerator, floor, customMatcapMap;

function initThreeJS() {
    console.log('initThreeJS: Starting...');

    canvas = document.getElementById('chatooly-canvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return false;
    }
    console.log('initThreeJS: Canvas found');

    // Get container dimensions - use fallback if container not ready
    const container = document.getElementById('chatooly-container');
    let width = 1920;
    let height = 1080;

    if (container) {
        const rect = container.getBoundingClientRect();
        console.log('initThreeJS: Container rect:', rect.width, 'x', rect.height);
        // Only use container dimensions if they are valid
        if (rect.width > 0 && rect.height > 0) {
            width = rect.width;
            height = rect.height;
        }
    }

    canvas.width = width;
    canvas.height = height;
    console.log('initThreeJS: Canvas dimensions set to', width, 'x', height);

    // Scene
    scene = new THREE.Scene();
    console.log('initThreeJS: Scene created');

    // Renderer
    try {
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true  // Required for exports
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        console.log('initThreeJS: Renderer created');
    } catch (err) {
        console.error('initThreeJS: Failed to create renderer:', err);
        return false;
    }

    // Set initial background color
    scene.background = new THREE.Color(state.bgColor);

    // Camera
    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(8, 6, 8);
    camera.lookAt(0, 0, 0);
    console.log('initThreeJS: Camera created');

    return true;
}

function initControls() {
    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.target.set(0, 1.5, 0);
    controls.update();
}

function initLighting() {
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);
}

// HDRI environment map URLs (using Needle Tools CDN for fast KTX2 loading)
// Fallback to Poly Haven EXR if KTX2 not supported
const HDRI_PRESETS = {
    ballroom: {
        name: 'Ballroom',
        url: 'https://cdn.needle.tools/static/hdris/ballroom_2k.pmrem.ktx2',
        fallbackUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/ballroom_1k.hdr'
    },
    studio: {
        name: 'Studio',
        url: 'https://cdn.needle.tools/static/hdris/studio_small_09_2k.pmrem.ktx2',
        fallbackUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr'
    },
    sunset: {
        name: 'Sunset',
        url: 'https://cdn.needle.tools/static/hdris/the_sky_is_on_fire_2k.pmrem.ktx2',
        fallbackUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/the_sky_is_on_fire_1k.hdr'
    },
    city: {
        name: 'City Street',
        url: 'https://cdn.needle.tools/static/hdris/wide_street_01_2k.pmrem.ktx2',
        fallbackUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/wide_street_01_1k.hdr'
    },
    cape: {
        name: 'Cape Hill',
        url: 'https://cdn.needle.tools/static/hdris/cape_hill_2k.pmrem.ktx2',
        fallbackUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/cape_hill_1k.hdr'
    },
    metro: {
        name: 'Metro',
        url: 'https://cdn.needle.tools/static/hdris/metro_noord_2k.pmrem.ktx2',
        fallbackUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/metro_noord_1k.hdr'
    },
    none: {
        name: 'None (Color)',
        url: null,
        fallbackUrl: null
    }
};

// RGBE Loader for HDR files
let rgbeLoader;

function initEnvironment() {
    // Environment map for reflections
    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    // Initialize RGBE loader for HDR files
    rgbeLoader = new RGBELoader();

    // Load initial environment
    loadHDRIEnvironment(state.hdriPreset);
}

function loadHDRIEnvironment(preset) {
    const hdriConfig = HDRI_PRESETS[preset];

    if (!hdriConfig || !hdriConfig.fallbackUrl) {
        // No HDRI - use solid color background
        if (envMap) {
            envMap.dispose();
            envMap = null;
        }
        scene.environment = null;
        scene.background = new THREE.Color(state.bgColor);
        scene.backgroundBlurriness = 0;
        console.log('HDRI disabled, using solid color background');
        return;
    }

    console.log('Loading HDRI:', hdriConfig.name);

    // Use RGBE loader for HDR files (more compatible than KTX2)
    rgbeLoader.load(hdriConfig.fallbackUrl, (texture) => {
        // Dispose old envMap
        if (envMap) {
            envMap.dispose();
        }

        texture.mapping = THREE.EquirectangularReflectionMapping;

        // Generate environment map for reflections
        envMap = pmremGenerator.fromEquirectangular(texture).texture;

        // Set environment for material reflections
        scene.environment = envMap;

        // Set background if enabled
        if (state.showHdriBackground && !state.bgTransparent) {
            scene.background = texture;
            scene.backgroundBlurriness = state.backgroundBlurriness;
        }

        // Update existing materials
        if (state.pillars && state.pillars.length > 0) {
            updateMaterials();
        }

        console.log('HDRI loaded:', hdriConfig.name);
    },
    // Progress callback
    (progress) => {
        if (progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            console.log(`Loading HDRI: ${percent}%`);
        }
    },
    // Error callback - try fallback
    (error) => {
        console.warn('Failed to load HDRI, creating fallback:', error);
        createFallbackEnvironment(preset);
    });
}

function createFallbackEnvironment(preset) {
    // Fallback gradient environment if HDR loading fails
    const fallbackColors = {
        ballroom: { top: '#2a1a1a', middle: '#4a3030', bottom: '#1a1010' },
        studio: { top: '#ffffff', middle: '#e8e8e8', bottom: '#cccccc' },
        sunset: { top: '#1a0a2e', middle: '#ff6b35', bottom: '#f7931e' },
        city: { top: '#3a4a5a', middle: '#5a6a7a', bottom: '#2a3a4a' },
        cape: { top: '#87ceeb', middle: '#90a080', bottom: '#506040' },
        metro: { top: '#2a2a3a', middle: '#3a3a4a', bottom: '#1a1a2a' }
    };

    const colors = fallbackColors[preset] || fallbackColors.studio;

    const canvas2d = document.createElement('canvas');
    canvas2d.width = 1024;
    canvas2d.height = 512;
    const ctx = canvas2d.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, colors.top);
    gradient.addColorStop(0.5, colors.middle);
    gradient.addColorStop(1, colors.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);

    if (envMap) {
        envMap.dispose();
    }

    const texture = new THREE.CanvasTexture(canvas2d);
    texture.mapping = THREE.EquirectangularReflectionMapping;

    envMap = pmremGenerator.fromEquirectangular(texture).texture;
    scene.environment = envMap;

    if (state.showHdriBackground && !state.bgTransparent) {
        scene.background = texture;
    }

    if (state.pillars && state.pillars.length > 0) {
        updateMaterials();
    }
}

function updateHDRIEnvironment(preset) {
    state.hdriPreset = preset;
    loadHDRIEnvironment(preset);
}

function setBackgroundBlurriness(value) {
    state.backgroundBlurriness = value;
    scene.backgroundBlurriness = value;
}

function setShowHdriBackground(show) {
    state.showHdriBackground = show;
    if (show && envMap && !state.bgTransparent) {
        // Reload the HDRI to set it as background
        loadHDRIEnvironment(state.hdriPreset);
    } else {
        scene.background = state.bgTransparent ? null : new THREE.Color(state.bgColor);
        scene.backgroundBlurriness = 0;
    }
}

function initFloor() {
    // Create pillar group (no floor plane - cleaner look with HDRI backgrounds)
    state.pillarGroup = new THREE.Group();
    scene.add(state.pillarGroup);
}

// ========== POST-PROCESSING (BLOOM) ==========
function setupPostProcessing() {
    composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(canvas.width, canvas.height),
        state.bloomIntensity,  // strength
        0.4,                   // radius
        0.85                   // threshold
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);
}

// ========== MATERIAL FACTORY ==========
// Series tint variations for multi-series differentiation
const SERIES_TINTS = [
    { hueShift: 0, satMult: 1.0, lightMult: 1.0 },      // Series 0: original
    { hueShift: 0.08, satMult: 0.9, lightMult: 0.85 },  // Series 1: warmer, darker
    { hueShift: -0.05, satMult: 1.1, lightMult: 1.1 },  // Series 2: cooler, lighter
    { hueShift: 0.15, satMult: 0.8, lightMult: 0.9 },   // Series 3: shifted hue
    { hueShift: -0.1, satMult: 1.0, lightMult: 0.8 }    // Series 4: darker variant
];

// Apply tint to a base color based on series index
function applySeriesTint(baseColor, seriesIndex) {
    const tint = SERIES_TINTS[seriesIndex % SERIES_TINTS.length];
    const color = new THREE.Color(baseColor);
    const hsl = {};
    color.getHSL(hsl);

    // Apply tint modifications
    hsl.h = (hsl.h + tint.hueShift + 1) % 1; // Wrap hue
    hsl.s = Math.min(1, Math.max(0, hsl.s * tint.satMult));
    hsl.l = Math.min(1, Math.max(0, hsl.l * tint.lightMult));

    color.setHSL(hsl.h, hsl.s, hsl.l);
    return color;
}

function createMaterial(theme, seriesIndex = 0) {
    const color = state.seriesColors[seriesIndex % state.seriesColors.length];

    switch (theme) {
        case 'metallic': {
            // Metallic with series color tinting
            const userColor = new THREE.Color(color);
            const hsl = {};
            userColor.getHSL(hsl);
            const tintedColor = new THREE.Color();
            tintedColor.setHSL(hsl.h, Math.min(hsl.s * 0.7, 0.6), Math.max(hsl.l, 0.5));
            return new THREE.MeshStandardMaterial({
                color: tintedColor,
                metalness: 1.0,
                roughness: 0.15,
                envMap: (state.envReflections && envMap) ? envMap : null,
                envMapIntensity: 1.5
            });
        }

        case 'glass': {
            // Glass with series color tinting
            const tintedGlass = applySeriesTint(color, seriesIndex);
            return new THREE.MeshPhysicalMaterial({
                color: tintedGlass,
                metalness: 0.0,
                roughness: 0.0,
                transmission: 0.9,
                thickness: 0.5,
                ior: 1.5 + (seriesIndex * 0.1),
                envMap: (state.envReflections && envMap) ? envMap : null,
                envMapIntensity: 1.0
            });
        }

        case 'matcap':
        case 'custom-matcap': {
            // Matcap material (from preset or custom upload)
            if (state.customMatcapTexture) {
                console.log('Creating MeshMatcapMaterial with texture:', state.customMatcapTexture);
                const mat = new THREE.MeshMatcapMaterial({
                    matcap: state.customMatcapTexture
                });
                mat.needsUpdate = true;
                return mat;
            }
            // Fallback if no matcap loaded - show warning
            console.warn('Matcap selected but no texture loaded, using fallback');
            return new THREE.MeshStandardMaterial({
                color: new THREE.Color(color),
                metalness: 0.1,
                roughness: 0.8
            });
        }

        case 'custom':
        default: {
            // Custom color material
            return new THREE.MeshStandardMaterial({
                color: new THREE.Color(color),
                metalness: 0.5,
                roughness: 0.3,
                envMap: (state.envReflections && envMap) ? envMap : null,
                envMapIntensity: 0.8
            });
        }
    }
}

// ========== GEOMETRY FACTORY ==========
function createPillarGeometry(height) {
    const width = state.pillarWidth;

    switch (state.pillarShape) {
        case 'cylinder':
            return new THREE.CylinderGeometry(width / 2, width / 2, height, 32);

        case 'box':
            return new THREE.BoxGeometry(width, height, width);

        case 'roundedBox':
            return new RoundedBoxGeometry(width, height, width, 4, 0.05);

        default:
            return new THREE.CylinderGeometry(width / 2, width / 2, height, 32);
    }
}

// ========== CHART GENERATION ==========
function clearChart() {
    // Remove existing pillars
    state.pillars.forEach(pillar => {
        state.pillarGroup.remove(pillar);
        pillar.geometry.dispose();
        pillar.material.dispose();
    });
    state.pillars = [];

    // Remove 3D labels
    state.labels3D.forEach(label => {
        state.pillarGroup.remove(label);
        if (label.material.map) label.material.map.dispose();
        label.material.dispose();
    });
    state.labels3D = [];
}

function generateChart() {
    console.log('generateChart: Starting...');
    console.log('generateChart: state.data =', state.data);
    console.log('generateChart: state.pillarGroup =', state.pillarGroup);

    if (!state.data || state.data.rows.length === 0) {
        console.log('generateChart: No data to generate');
        return;
    }

    if (!state.pillarGroup) {
        console.error('generateChart: pillarGroup not initialized!');
        return;
    }

    clearChart();

    const data = state.data;
    const numCategories = data.rows.length;
    const numSeries = data.headers.length - 1; // Exclude label column

    // Find max value for scaling
    let maxValue = 0;
    data.rows.forEach(row => {
        for (let i = 1; i < row.length; i++) {
            const val = parseFloat(row[i]) || 0;
            if (val > maxValue) maxValue = val;
        }
    });

    if (maxValue === 0) maxValue = 1;

    // Calculate total width
    const totalWidth = numCategories * state.pillarSpacing;
    const startX = -totalWidth / 2 + state.pillarSpacing / 2;

    // Generate pillars
    data.rows.forEach((row, categoryIndex) => {
        const label = row[0];
        const x = startX + categoryIndex * state.pillarSpacing;

        // For each series
        for (let seriesIndex = 0; seriesIndex < numSeries; seriesIndex++) {
            const value = parseFloat(row[seriesIndex + 1]) || 0;
            const normalizedHeight = (value / maxValue) * state.maxHeight;
            const height = Math.max(normalizedHeight, 0.1);

            // Calculate position for grouped display with both x and z offset
            const seriesOffset = (seriesIndex - (numSeries - 1) / 2);
            // When groupSpacing is 0, all pillars in a group share Z=0
            // Otherwise space them by pillarWidth + groupSpacing
            const z = state.groupSpacing === 0 ? 0 : seriesOffset * (state.pillarWidth + state.groupSpacing);
            // Add x-offset to create diagonal arrangement within group
            const xOffset = seriesOffset * state.groupXOffset;
            const pillarX = x + xOffset;

            // Create geometry and material
            const geometry = createPillarGeometry(height);
            const material = createMaterial(state.materialTheme, seriesIndex);

            // Create mesh
            const pillar = new THREE.Mesh(geometry, material);
            pillar.position.set(pillarX, height / 2, z);
            pillar.castShadow = true;
            pillar.receiveShadow = true;

            // Store metadata
            pillar.userData = {
                label,
                value,
                seriesIndex,
                categoryIndex,
                targetHeight: height,
                targetY: height / 2
            };

            state.pillarGroup.add(pillar);
            state.pillars.push(pillar);
        }
    });

    // Update labels
    updateLabels();

    // Center camera target
    controls.target.set(0, state.maxHeight / 3, 0);
    controls.update();

    console.log('generateChart: Created', state.pillars.length, 'pillars');
    console.log('generateChart: pillarGroup children count:', state.pillarGroup.children.length);
}

// ========== LABEL SYSTEM ==========
function updateLabels() {
    // Clear existing 3D labels
    state.labels3D.forEach(label => {
        state.pillarGroup.remove(label);
        if (label.material.map) label.material.map.dispose();
        label.material.dispose();
    });
    state.labels3D = [];

    // Also clear any leftover 2D labels (for backwards compatibility)
    const labelContainer = document.getElementById('label-container');
    if (labelContainer) labelContainer.innerHTML = '';

    if (state.labelMode === 'none') return;

    // Always use 3D labels
    update3DLabels();
}

function update3DLabels() {
    if (!state.data) return;

    // Track which categories we've already labeled (for multi-series)
    const labeledCategories = new Set();

    state.pillars.forEach((pillar) => {
        const userData = pillar.userData;

        // Category labels below pillars (only for first series of each category)
        if (state.showLabels && userData.seriesIndex === 0 && !labeledCategories.has(userData.label)) {
            labeledCategories.add(userData.label);

            const categorySprite = createTextSprite(userData.label);
            // Position below the pillar base
            categorySprite.position.set(
                pillar.position.x,
                -0.5,  // Below ground level
                pillar.position.z
            );
            categorySprite.userData.pillarRef = pillar;
            categorySprite.userData.isCategory = true;

            state.pillarGroup.add(categorySprite);
            state.labels3D.push(categorySprite);
        }

        // Value labels above pillars
        if (state.showValues) {
            const valueSprite = createTextSprite(formatValue(userData.value));
            valueSprite.position.set(
                pillar.position.x,
                pillar.position.y + userData.targetHeight / 2 + 0.3,
                pillar.position.z
            );
            valueSprite.userData.pillarRef = pillar;
            valueSprite.userData.isValue = true;

            state.pillarGroup.add(valueSprite);
            state.labels3D.push(valueSprite);
        }
    });
}

function createTextSprite(text) {
    const canvas2d = document.createElement('canvas');
    const ctx = canvas2d.getContext('2d');

    const fontSize = state.fontSize * 8; // Scale up for better quality
    ctx.font = `bold ${fontSize}px Arial`;
    const textWidth = ctx.measureText(text).width;

    canvas2d.width = textWidth + 20;
    canvas2d.height = fontSize + 20;

    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = state.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas2d.width / 2, canvas2d.height / 2);

    const texture = new THREE.CanvasTexture(canvas2d);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(canvas2d.width / 150, canvas2d.height / 150, 1);

    return sprite;
}

function formatValue(value) {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toFixed(0);
}

// ========== ANIMATION SYSTEM ==========
function playEntranceAnimation() {
    if (state.pillars.length === 0) return;

    // Store original heights and reset pillars
    state.pillars.forEach(pillar => {
        pillar.userData.originalHeight = pillar.userData.targetHeight;
        pillar.scale.y = 0.01;
        pillar.position.y = 0.01;
    });

    const duration = state.animationDuration;
    const stagger = state.staggerDelay;

    // Kill any existing animations
    gsap.killTweensOf(state.pillars.map(p => p.scale));
    gsap.killTweensOf(state.pillars.map(p => p.position));

    switch (state.animationStyle) {
        case 'grow':
            state.pillars.forEach((pillar, i) => {
                const targetHeight = pillar.userData.targetHeight;
                gsap.to(pillar.scale, {
                    y: 1,
                    duration: duration,
                    delay: i * stagger,
                    ease: 'power2.out',
                    onUpdate: () => {
                        pillar.position.y = (targetHeight * pillar.scale.y) / 2;
                    }
                });
            });
            break;

        case 'pop':
            state.pillars.forEach((pillar, i) => {
                const targetHeight = pillar.userData.targetHeight;
                pillar.scale.set(0.01, 0.01, 0.01);
                gsap.to(pillar.scale, {
                    x: 1, y: 1, z: 1,
                    duration: duration,
                    delay: i * stagger,
                    ease: 'back.out(1.7)',
                    onUpdate: () => {
                        pillar.position.y = (targetHeight * pillar.scale.y) / 2;
                    }
                });
            });
            break;

        case 'wave':
            state.pillars.forEach((pillar, i) => {
                const targetHeight = pillar.userData.targetHeight;
                const waveDelay = Math.sin(i * 0.3) * stagger * 3 + i * stagger;
                gsap.to(pillar.scale, {
                    y: 1,
                    duration: duration,
                    delay: waveDelay,
                    ease: 'elastic.out(1, 0.5)',
                    onUpdate: () => {
                        pillar.position.y = (targetHeight * pillar.scale.y) / 2;
                    }
                });
            });
            break;
    }
}

// ========== CAMERA PRESETS ==========
function setCameraPreset(preset) {
    const duration = 1.0;
    let targetPos, targetLookAt;

    switch (preset) {
        case 'front':
            targetPos = { x: 0, y: 3, z: 12 };
            targetLookAt = { x: 0, y: 1.5, z: 0 };
            break;
        case 'top':
            targetPos = { x: 0, y: 15, z: 0.1 };
            targetLookAt = { x: 0, y: 0, z: 0 };
            break;
        case 'isometric':
            targetPos = { x: 10, y: 10, z: 10 };
            targetLookAt = { x: 0, y: 1.5, z: 0 };
            break;
        case 'quarter':
        default:
            targetPos = { x: 8, y: 6, z: 8 };
            targetLookAt = { x: 0, y: 1.5, z: 0 };
            break;
    }

    gsap.to(camera.position, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration: duration,
        ease: 'power2.inOut',
        onUpdate: () => controls.update()
    });

    gsap.to(controls.target, {
        x: targetLookAt.x,
        y: targetLookAt.y,
        z: targetLookAt.z,
        duration: duration,
        ease: 'power2.inOut',
        onUpdate: () => controls.update()
    });
}

// ========== UPDATE FUNCTIONS ==========
function updateMaterials() {
    state.pillars.forEach(pillar => {
        const seriesIndex = pillar.userData.seriesIndex;
        pillar.material.dispose();
        pillar.material = createMaterial(state.materialTheme, seriesIndex);
    });
}

function updateBloom() {
    if (bloomPass) {
        bloomPass.strength = state.bloomEnabled ? state.bloomIntensity : 0;
    }

    // Update neon emissive intensity
    if (state.materialTheme === 'neon') {
        state.pillars.forEach(pillar => {
            pillar.material.emissiveIntensity = state.bloomEnabled ? 0.8 : 0.2;
        });
    }
}

function updateBackground() {
    if (state.bgTransparent) {
        renderer.setClearAlpha(0);
        scene.background = null;
    } else {
        renderer.setClearAlpha(1);
        scene.background = new THREE.Color(state.bgColor);
    }

    // Handle background image via Chatooly system
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        const bg = window.Chatooly.backgroundManager.getBackgroundState();
        if (bg.bgTransparent) {
            renderer.setClearAlpha(0);
            scene.background = null;
        } else if (bg.bgImage) {
            // For Three.js, we need to create a texture from the background image
            updateBackgroundTexture(bg);
        } else {
            scene.background = new THREE.Color(bg.bgColor || state.bgColor);
        }
    }
}

let backgroundTexture = null;
function updateBackgroundTexture(bg) {
    if (!bg.bgImage || !bg.bgImageURL) {
        if (backgroundTexture) {
            backgroundTexture.dispose();
            backgroundTexture = null;
        }
        scene.background = new THREE.Color(bg.bgColor || state.bgColor);
        return;
    }

    // Dispose old texture
    if (backgroundTexture) {
        backgroundTexture.dispose();
        backgroundTexture = null;
    }

    const canvasWidth = renderer.domElement.width;
    const canvasHeight = renderer.domElement.height;
    const dims = window.Chatooly.backgroundManager.calculateImageDimensions(canvasWidth, canvasHeight);

    // Create temp canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const ctx = tempCanvas.getContext('2d');

    // Fill with bg color
    ctx.fillStyle = bg.bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw image
    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, dims.offsetX, dims.offsetY, dims.drawWidth, dims.drawHeight);
        backgroundTexture = new THREE.CanvasTexture(tempCanvas);
        backgroundTexture.needsUpdate = true;
        scene.background = backgroundTexture;
    };
    img.src = bg.bgImageURL;
}

// ========== ANIMATION LOOP ==========
function animate() {
    requestAnimationFrame(animate);

    if (!controls || !renderer) return;

    // Update controls
    controls.autoRotate = state.autoRotate;
    controls.autoRotateSpeed = state.rotationSpeed;
    controls.update();

    // Render
    if (state.bloomEnabled && composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}

// ========== CANVAS RESIZE HANDLING ==========
function onCanvasResized(e) {
    if (!camera || !renderer) return;

    const width = e.detail.canvas.width;
    const height = e.detail.canvas.height;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);

    if (composer) {
        composer.setSize(width, height);
    }

    if (bloomPass) {
        bloomPass.resolution.set(width, height);
    }
}

// ========== HIGH-RES EXPORT ==========
function setupHighResExport() {
    window.renderHighResolution = function(targetCanvas, scale) {
        const width = canvas.width * scale;
        const height = canvas.height * scale;

        // Create temporary renderer
        const tempRenderer = new THREE.WebGLRenderer({
            canvas: targetCanvas,
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true
        });
        tempRenderer.setSize(width, height);
        tempRenderer.setPixelRatio(1);
        tempRenderer.toneMapping = THREE.ACESFilmicToneMapping;
        tempRenderer.toneMappingExposure = 1.0;
        tempRenderer.outputColorSpace = THREE.SRGBColorSpace;

        // Set background
        if (state.bgTransparent) {
            tempRenderer.setClearAlpha(0);
        } else {
            tempRenderer.setClearColor(new THREE.Color(state.bgColor), 1);
        }

        // Update camera aspect
        const originalAspect = camera.aspect;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        // Render
        if (state.bloomEnabled) {
            // Create temporary composer for high-res
            const tempComposer = new EffectComposer(tempRenderer);
            const renderPass = new RenderPass(scene, camera);
            tempComposer.addPass(renderPass);

            const tempBloomPass = new UnrealBloomPass(
                new THREE.Vector2(width, height),
                state.bloomIntensity,
                0.4,
                0.85
            );
            tempComposer.addPass(tempBloomPass);

            const outputPass = new OutputPass();
            tempComposer.addPass(outputPass);

            tempComposer.render();
        } else {
            tempRenderer.render(scene, camera);
        }

        // Restore camera
        camera.aspect = originalAspect;
        camera.updateProjectionMatrix();

        tempRenderer.dispose();

        console.log(`High-res export completed at ${scale}x (${width}x${height})`);
    };
}

// ========== CUSTOM MATCAP HANDLING ==========
function setCustomMatcapTexture(imageDataURL) {
    // Dispose old texture if exists
    if (state.customMatcapTexture) {
        state.customMatcapTexture.dispose();
        state.customMatcapTexture = null;
    }

    if (!imageDataURL) {
        updateMaterials();
        return;
    }

    // Create image and load texture manually (like Three.js matcap example)
    const img = new Image();
    img.onload = () => {
        const texture = new THREE.Texture(img);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;

        state.customMatcapTexture = texture;
        console.log('Custom matcap texture loaded');

        // Update all pillar materials
        updateMaterials();

        // Force material update for existing pillars
        state.pillars.forEach(pillar => {
            pillar.material.needsUpdate = true;
        });
    };
    img.src = imageDataURL;
}

function clearCustomMatcap() {
    if (state.customMatcapTexture) {
        state.customMatcapTexture.dispose();
        state.customMatcapTexture = null;
    }
    updateMaterials();
}

// Load matcap from preset value (supports cdn: and local: prefixes)
function loadMatcapPreset(presetValue) {
    if (!presetValue) {
        clearCustomMatcap();
        return;
    }

    state.matcapPreset = presetValue;

    // Determine the URL based on prefix
    let url;
    if (presetValue.startsWith('cdn:')) {
        // Load from nidorx/matcaps GitHub CDN
        const matcapId = presetValue.replace('cdn:', '');
        url = `https://raw.githubusercontent.com/nidorx/matcaps/master/256/${matcapId}-256px.png`;
    } else if (presetValue.startsWith('local:')) {
        // Load from local assets folder
        const filename = presetValue.replace('local:', '');
        url = `assets/matcaps/${filename}`;
    } else {
        // Legacy: assume local file
        url = `assets/matcaps/${presetValue}`;
    }

    // Dispose old texture if exists
    if (state.customMatcapTexture) {
        state.customMatcapTexture.dispose();
        state.customMatcapTexture = null;
    }

    console.log('Loading matcap from:', url);

    const img = new Image();
    img.crossOrigin = 'anonymous';  // Required for CDN images
    img.onload = () => {
        const texture = new THREE.Texture(img);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;

        state.customMatcapTexture = texture;
        console.log('Matcap loaded successfully:', presetValue);

        updateMaterials();
    };
    img.onerror = (err) => {
        console.error('Failed to load matcap:', url, err);
    };
    img.src = url;
}

// ========== EXPORT API FOR UI.JS ==========
function setupAPI() {
    window.ChartApp = {
        state,
        generateChart,
        clearChart,
        updateMaterials,
        updateLabels,
        updateBloom,
        updateBackground,
        updateHDRIEnvironment,
        setBackgroundBlurriness,
        setShowHdriBackground,
        setCustomMatcapTexture,
        clearCustomMatcap,
        loadMatcapPreset,
        playEntranceAnimation,
        setCameraPreset,
        controls,
        HDRI_PRESETS  // Export presets so UI can access them
    };
}

// ========== MAIN INITIALIZATION ==========
function init() {
    console.log('Initializing 3D Pillar Chart...');

    // Initialize Three.js
    if (!initThreeJS()) {
        console.error('Failed to initialize Three.js');
        return;
    }

    // Initialize all components
    console.log('init: Setting up controls...');
    initControls();
    console.log('init: Setting up lighting...');
    initLighting();
    console.log('init: Setting up environment...');
    initEnvironment();
    console.log('init: Setting up floor...');
    initFloor();
    console.log('init: Setting up post-processing...');
    setupPostProcessing();
    console.log('init: All components initialized');

    // Setup exports and API
    setupHighResExport();
    setupAPI();

    // Register event listeners
    document.addEventListener('chatooly:canvas-resized', onCanvasResized);

    // Initialize Chatooly background system
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.init(canvas);
    }

    // Start animation loop
    animate();

    // Load sample data (two series by default)
    const sampleData = {
        headers: ['Category', 'Revenue', 'Expenses'],
        rows: [
            ['Q1', 45, 32],
            ['Q2', 52, 41],
            ['Q3', 38, 35],
            ['Q4', 61, 48],
            ['Q5', 55, 42]
        ]
    };

    state.data = sampleData;
    generateChart();

    // Update UI to reflect number of series (show/hide Series B picker)
    const numSeries = sampleData.headers.length - 1;
    const seriesBGroup = document.getElementById('series-b-group');
    if (seriesBGroup) {
        seriesBGroup.style.display = numSeries >= 2 ? 'block' : 'none';
    }

    // Play entrance animation after a short delay
    setTimeout(() => {
        playEntranceAnimation();
    }, 500);

    console.log('3D Pillar Chart initialized successfully!');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
