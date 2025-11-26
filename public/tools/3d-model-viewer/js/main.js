/*
 * 3D Model Viewer - Main Logic
 * Author: Claude Code
 *
 * Professional 3D model viewer with Three.js r162+
 * Features: HDRI environments, advanced lighting, animations, export
 */

// ========== IMPORTS ==========
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// ========== GLOBAL VARIABLES ==========
let viewer = null;

// ========== MODEL VIEWER CLASS ==========
class ModelViewer {
    constructor(canvasId = 'chatooly-canvas') {
        // Canvas and rendering
        this.canvas = document.getElementById(canvasId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.pmremGenerator = null;

        // Model management
        this.currentModel = null;
        this.modelContainer = null;
        this.originalMaterials = new Map();

        // HDRI environment system
        this.currentHDRI = null;
        this.originalHDRITexture = null;
        this.hdriPresets = {
            studio: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/photo_studio_loft_hall_2k.hdr',
            sunset: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/venice_sunset_2k.hdr',
            outdoor: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kloofendal_48d_partly_cloudy_puresky_2k.hdr',
            warehouse: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/industrial_sunset_puresky_2k.hdr',
            night: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/moonlit_golf_2k.hdr',
            autumn: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/autumn_crossing_2k.hdr',
            urban: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/urban_alley_01_2k.hdr'
        };

        // Lighting system
        this.sunLight = null;
        this.hdriIntensity = 1.0;
        this.hdriRotation = 0;
        this.hdriBackgroundVisible = false;
        this.sunEnabled = true;
        this.sunIntensity = 2.0;
        this.sunAzimuth = 180;
        this.sunElevation = 45;
        this.sunColor = '#ffffff';
        this.shadowQuality = 2048;
        this.shadowSoftness = 4;
        this.shadowIntensity = 0.5;

        // Material presets
        this.materialPresets = {
            custom: {},
            metallic: { roughness: 0.1, metalness: 1.0, transmission: 0.0, clearcoat: 0.0 },
            plastic: { roughness: 0.3, metalness: 0.0, transmission: 0.0, clearcoat: 0.8 },
            glass: { roughness: 0.0, metalness: 0.0, transmission: 0.9, clearcoat: 1.0 },
            matte: { roughness: 1.0, metalness: 0.0, transmission: 0.0, clearcoat: 0.0 },
            glossy: { roughness: 0.2, metalness: 0.5, transmission: 0.0, clearcoat: 0.5 },
            clay: { roughness: 0.8, metalness: 0.0, color: '#e8e0d5' }
        };

        // Animation system
        this.orbitControls = null;
        this.animationEnabled = false;
        this.animationMode = 'turntable';
        this.animationFrameId = null;
        this.turntableSpeedX = 0.0;
        this.turntableSpeedY = 1.0;
        this.turntableSpeedZ = 0.0;
        this.sineTime = 0;
        this.sineAmplitudeX = 0;
        this.sineAmplitudeY = 0;
        this.sineAmplitudeZ = 0;
        this.sineFrequencyX = 0;
        this.sineFrequencyY = 0;
        this.sineFrequencyZ = 0;
        this.lightAnimationSpeed = 1.0;
        this.rotationBeforeAnimation = new THREE.Euler();

        // Background system integration
        this.backgroundTexture = null;

        this.init();
    }

    async init() {
        this.setupCanvas();
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createLights();
        this.createControls();
        this.setupBackgroundSystem();
        await this.loadDefaultHDRI();
        this.setupEventListeners();
        this.startRenderLoop();

        console.log('3D Model Viewer initialized');
    }

    setupCanvas() {
        // CRITICAL: Set exact dimensions for Chatooly export
        this.canvas.width = 1080;
        this.canvas.height = 1350;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        // Model container for transforms
        this.modelContainer = new THREE.Group();
        this.scene.add(this.modelContainer);
    }

    createCamera() {
        const aspect = this.canvas.width / this.canvas.height;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(0, 0, 5);
    }

    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true // CRITICAL for exports
        });

        this.renderer.setSize(this.canvas.width, this.canvas.height, false);
        this.renderer.setPixelRatio(1); // Force 1:1 pixel mapping
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Shadow settings
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.VSMShadowMap; // For soft shadows

        // PMREM Generator for IBL
        this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.pmremGenerator.compileEquirectangularShader();
    }

    createLights() {
        // Ambient light (fallback)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(ambientLight);

        // Directional sun light with shadows
        this.sunLight = new THREE.DirectionalLight(0xffffff, this.sunIntensity);
        this.sunLight.castShadow = true;

        // Shadow configuration
        this.sunLight.shadow.mapSize.width = this.shadowQuality;
        this.sunLight.shadow.mapSize.height = this.shadowQuality;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 50;
        this.sunLight.shadow.camera.left = -10;
        this.sunLight.shadow.camera.right = 10;
        this.sunLight.shadow.camera.top = 10;
        this.sunLight.shadow.camera.bottom = -10;
        this.sunLight.shadow.radius = this.shadowSoftness;
        this.sunLight.shadow.bias = -0.0001 * this.shadowIntensity;

        this.scene.add(this.sunLight);
        this.updateSunLightPosition();
    }

    createControls() {
        this.orbitControls = new OrbitControls(this.camera, this.canvas);
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.05;
        this.orbitControls.screenSpacePanning = false;
        this.orbitControls.minDistance = 1;
        this.orbitControls.maxDistance = 50;
        this.orbitControls.maxPolarAngle = Math.PI;
    }

    setupBackgroundSystem() {
        // CRITICAL: Initialize Chatooly background manager
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            window.Chatooly.backgroundManager.init(this.canvas);
        }
    }

    async loadDefaultHDRI() {
        try {
            await this.loadHDRI('studio');
        } catch (error) {
            console.error('Failed to load default HDRI:', error);
        }
    }

    async loadHDRI(presetName) {
        const loader = new RGBELoader();

        try {
            const texture = await new Promise((resolve, reject) => {
                loader.load(
                    this.hdriPresets[presetName],
                    resolve,
                    undefined,
                    reject
                );
            });

            this.originalHDRITexture = texture;
            this.generateRotatedEnvironment(texture, this.hdriRotation * Math.PI / 180);

        } catch (error) {
            console.error(`Failed to load HDRI ${presetName}:`, error);
            throw error;
        }
    }

    generateRotatedEnvironment(texture, rotationRadians) {
        // Generate PMREM environment map
        const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
        this.currentHDRI = envMap;

        // Apply to scene
        this.scene.environment = envMap;
        if (this.hdriBackgroundVisible) {
            this.scene.background = envMap;
        }

        // Apply rotation (Three.js r162+ API)
        this.scene.environmentRotation.set(0, rotationRadians, 0);
        this.scene.backgroundRotation.set(0, rotationRadians, 0);

        // Update tone mapping
        this.renderer.toneMappingExposure = this.hdriIntensity;
    }

    updateSunLightPosition() {
        if (!this.sunLight) return;

        // Convert spherical coordinates to Cartesian
        const azimuthRad = this.sunAzimuth * Math.PI / 180;
        const elevationRad = this.sunElevation * Math.PI / 180;

        const x = Math.cos(elevationRad) * Math.sin(azimuthRad);
        const y = Math.sin(elevationRad);
        const z = Math.cos(elevationRad) * Math.cos(azimuthRad);

        // Position at distance
        const distance = 20;
        this.sunLight.position.set(x * distance, y * distance, z * distance);

        // Update shadow settings
        this.sunLight.shadow.radius = this.shadowSoftness;
        this.sunLight.shadow.bias = -0.0001 * this.shadowIntensity;
    }

    async loadModel(file) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        let loader;

        if (fileExtension === 'glb' || fileExtension === 'gltf') {
            loader = new GLTFLoader();
        } else if (fileExtension === 'fbx') {
            loader = new FBXLoader();
        } else {
            throw new Error('Unsupported file format. Please use GLB, GLTF, or FBX.');
        }

        try {
            const url = URL.createObjectURL(file);

            const result = await new Promise((resolve, reject) => {
                loader.load(url, resolve, undefined, reject);
            });

            // Clean up object URL
            URL.revokeObjectURL(url);

            // Extract model based on loader type
            const model = fileExtension === 'fbx' ? result : result.scene;

            this.setModel(model);

        } catch (error) {
            console.error('Failed to load model:', error);
            throw error;
        }
    }

    setModel(model) {
        // Remove existing model
        if (this.currentModel) {
            this.modelContainer.remove(this.currentModel);
            this.originalMaterials.clear();
        }

        this.currentModel = model;
        this.modelContainer.add(this.currentModel);

        // Store original materials
        this.currentModel.traverse((child) => {
            if (child.isMesh) {
                this.originalMaterials.set(child.uuid, child.material.clone());

                // Enable shadows
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        this.autoCenter();
        this.autoScale();
    }

    autoCenter() {
        if (!this.currentModel) return;

        const box = new THREE.Box3().setFromObject(this.currentModel);
        const center = box.getCenter(new THREE.Vector3());
        this.currentModel.position.sub(center);
    }

    autoScale() {
        if (!this.currentModel) return;

        const box = new THREE.Box3().setFromObject(this.currentModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim; // Target size: 2 units
        this.modelContainer.scale.setScalar(scale);
    }

    applyMaterialPreset(presetName) {
        if (!this.currentModel || !this.materialPresets[presetName]) return;

        const preset = this.materialPresets[presetName];

        this.currentModel.traverse((child) => {
            if (child.isMesh) {
                if (presetName === 'custom') {
                    // Restore original material
                    const original = this.originalMaterials.get(child.uuid);
                    if (original) {
                        child.material = original.clone();
                    }
                } else if (presetName === 'clay') {
                    // Clay removes textures
                    const clayMaterial = new THREE.MeshStandardMaterial({
                        color: preset.color,
                        roughness: preset.roughness,
                        metalness: preset.metalness
                    });
                    child.material = clayMaterial;
                } else {
                    // Apply preset properties while keeping textures
                    Object.assign(child.material, preset);
                }
                child.material.needsUpdate = true;
            }
        });
    }

    // ========== ANIMATION SYSTEM ==========
    startAnimation() {
        this.animationEnabled = true;

        // Store rotation before animation for sine wave mode
        this.rotationBeforeAnimation.copy(this.modelContainer.rotation);
        this.sineTime = 0;

        if (!this.animationFrameId) {
            this.animate();
        }
    }

    stopAnimation() {
        this.animationEnabled = false;

        // For sine wave, restore original rotation
        if (this.animationMode === 'sine') {
            this.modelContainer.rotation.copy(this.rotationBeforeAnimation);
        }
    }

    animate() {
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        if (this.animationEnabled && this.currentModel) {
            switch (this.animationMode) {
                case 'turntable':
                    this.updateTurntableAnimation();
                    break;
                case 'sine':
                    this.updateSineAnimation();
                    break;
                case 'light-rotation':
                    this.updateLightRotationAnimation();
                    break;
            }
        }

        this.orbitControls.update();
        this.render();
    }

    updateTurntableAnimation() {
        // Multi-axis continuous rotation
        if (this.turntableSpeedX !== 0) {
            this.modelContainer.rotateOnWorldAxis(
                new THREE.Vector3(1, 0, 0),
                0.01 * this.turntableSpeedX
            );
        }
        if (this.turntableSpeedY !== 0) {
            this.modelContainer.rotateOnWorldAxis(
                new THREE.Vector3(0, 1, 0),
                0.01 * this.turntableSpeedY
            );
        }
        if (this.turntableSpeedZ !== 0) {
            this.modelContainer.rotateOnWorldAxis(
                new THREE.Vector3(0, 0, 1),
                0.01 * this.turntableSpeedZ
            );
        }
    }

    updateSineAnimation() {
        this.sineTime += 1 / 60; // Assuming 60fps

        const rotX = this.rotationBeforeAnimation.x +
            Math.sin(this.sineTime * this.sineFrequencyX * Math.PI * 2) *
            this.sineAmplitudeX * Math.PI / 180;

        const rotY = this.rotationBeforeAnimation.y +
            Math.sin(this.sineTime * this.sineFrequencyY * Math.PI * 2) *
            this.sineAmplitudeY * Math.PI / 180;

        const rotZ = this.rotationBeforeAnimation.z +
            Math.sin(this.sineTime * this.sineFrequencyZ * Math.PI * 2) *
            this.sineAmplitudeZ * Math.PI / 180;

        this.modelContainer.rotation.set(rotX, rotY, rotZ);
    }

    updateLightRotationAnimation() {
        if (this.lightAnimationSpeed !== 0) {
            // Update HDRI rotation
            this.hdriRotation += this.lightAnimationSpeed;
            if (this.hdriRotation >= 360) this.hdriRotation -= 360;
            if (this.hdriRotation < 0) this.hdriRotation += 360;

            // Update sun azimuth (same rotation)
            this.sunAzimuth += this.lightAnimationSpeed;
            if (this.sunAzimuth >= 360) this.sunAzimuth -= 360;
            if (this.sunAzimuth < 0) this.sunAzimuth += 360;

            // Apply rotations immediately
            const rotationRadians = this.hdriRotation * Math.PI / 180;
            this.scene.environmentRotation.set(0, rotationRadians, 0);
            this.scene.backgroundRotation.set(0, rotationRadians, 0);
            this.updateSunLightPosition();
        }
    }

    // ========== BACKGROUND SYSTEM INTEGRATION ==========
    updateBackground() {
        if (!window.Chatooly || !window.Chatooly.backgroundManager) return;

        const bg = window.Chatooly.backgroundManager.getBackgroundState();

        // Handle transparent background
        if (bg.bgTransparent) {
            this.renderer.setClearAlpha(0);
            this.scene.background = this.hdriBackgroundVisible ? this.currentHDRI : null;

            // Clean up old texture
            if (this.backgroundTexture) {
                this.backgroundTexture.dispose();
                this.backgroundTexture = null;
            }
            return;
        }

        // Handle background image - CRITICAL: Must use CanvasTexture for Three.js
        if (bg.bgImage && bg.bgImageURL) {
            // Remove old texture if it exists
            if (this.backgroundTexture) {
                this.backgroundTexture.dispose();
                this.backgroundTexture = null;
            }

            // Get canvas dimensions
            const canvasWidth = this.renderer.domElement.width;
            const canvasHeight = this.renderer.domElement.height;
            const dims = window.Chatooly.backgroundManager.calculateImageDimensions(canvasWidth, canvasHeight);

            // Create canvas texture with properly fitted image
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvasWidth;
            tempCanvas.height = canvasHeight;
            const ctx = tempCanvas.getContext('2d');

            // Fill background with solid color first
            ctx.fillStyle = bg.bgColor;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Draw image with fit mode
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, dims.offsetX, dims.offsetY, dims.drawWidth, dims.drawHeight);

                // Create Three.js texture from canvas
                this.backgroundTexture = new THREE.CanvasTexture(tempCanvas);
                this.backgroundTexture.needsUpdate = true;
                this.scene.background = this.hdriBackgroundVisible ? this.currentHDRI : this.backgroundTexture;

                // Set clear color to match
                const color = new THREE.Color(bg.bgColor);
                this.renderer.setClearColor(color, 1);
                this.renderer.setClearAlpha(1);
            };
            img.onerror = () => {
                console.error('Failed to load background image');
                // Fallback to solid color
                const fallbackColor = new THREE.Color(bg.bgColor);
                this.renderer.setClearColor(fallbackColor, 1);
                this.renderer.setClearAlpha(1);
                this.scene.background = this.hdriBackgroundVisible ? this.currentHDRI : null;
            };
            img.src = bg.bgImageURL;
        } else {
            // Solid color background
            const color = new THREE.Color(bg.bgColor);
            this.renderer.setClearColor(color, 1);
            this.renderer.setClearAlpha(1);
            this.scene.background = this.hdriBackgroundVisible ? this.currentHDRI : null;

            // Clean up old texture
            if (this.backgroundTexture) {
                this.backgroundTexture.dispose();
                this.backgroundTexture = null;
            }
        }
    }

    setupEventListeners() {
        // Canvas resize handling
        document.addEventListener('chatooly:canvas-resized', (e) => this.onCanvasResized(e));
    }

    onCanvasResized(e) {
        const newWidth = e.detail.canvas.width;
        const newHeight = e.detail.canvas.height;

        // Update canvas dimensions
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;

        // Update camera
        this.camera.aspect = newWidth / newHeight;
        this.camera.updateProjectionMatrix();

        // Update renderer
        this.renderer.setSize(newWidth, newHeight, false);
        this.renderer.setPixelRatio(1);

        // Update background system
        this.updateBackground();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    startRenderLoop() {
        this.animate();
    }
}

// ========== HIGH-RESOLUTION EXPORT ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!viewer || !viewer.scene || !viewer.camera) {
        console.warn('3D viewer not ready for high-res export');
        return;
    }

    // Create high-resolution renderer
    const exportRenderer = new THREE.WebGLRenderer({
        canvas: targetCanvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
    });

    const scaledWidth = viewer.canvas.width * scale;
    const scaledHeight = viewer.canvas.height * scale;

    exportRenderer.setSize(scaledWidth, scaledHeight, false);
    exportRenderer.setPixelRatio(1);
    exportRenderer.outputColorSpace = THREE.SRGBColorSpace;
    exportRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    exportRenderer.toneMappingExposure = viewer.renderer.toneMappingExposure;

    // Copy shadow settings
    exportRenderer.shadowMap.enabled = viewer.renderer.shadowMap.enabled;
    exportRenderer.shadowMap.type = viewer.renderer.shadowMap.type;

    // Update camera aspect for export
    const camera = viewer.camera.clone();
    camera.aspect = scaledWidth / scaledHeight;
    camera.updateProjectionMatrix();

    // Render high-resolution frame
    exportRenderer.render(viewer.scene, camera);

    console.log(`High-res export completed at ${scale}x resolution (${scaledWidth}x${scaledHeight})`);

    // Cleanup
    exportRenderer.dispose();
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    viewer = new ModelViewer();

    // Make viewer globally available for debugging
    window.viewer = viewer;
});