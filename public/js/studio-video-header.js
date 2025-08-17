/**
 * Studio Video Header - Three.js FBX Animation Controller
 * Handles FBX model loading and frame-by-frame animation control
 */

import * as THREE from 'three';
// import { OrbitControls } from '../../node_modules/three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

class StudioVideoHeader {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.fbxModel = null;
        this.mixer = null;
        this.animationAction = null;
        this.currentFrame = 0;
        this.totalFrames = 0;
        this.animationDuration = 0;
        this.frameRate = 30;
        this.isInitialized = false;
        
        this.init();
        this.setupKeyboardControls();
        this.animate();
    }
    
    init() {
        if (!this.container) {
            console.error('Container not found for Studio Video Header');
            return;
        }
        
        // Create scene (following the exact pattern from your example)
        this.scene = new THREE.Scene();
        this.scene.add(new THREE.AxesHelper(5));
        
        // Add lights (following your example pattern)
        const light = new THREE.PointLight(0xffffff, 50);
        light.position.set(0.8, 1.4, 1.0);
        this.scene.add(light);
        
        const ambientLight = new THREE.AmbientLight();
        this.scene.add(ambientLight);
        
        // Create camera
        const containerRect = this.container.getBoundingClientRect();
        this.camera = new THREE.PerspectiveCamera(
            75,
            containerRect.width / containerRect.height,
            0.1,
            1000
        );
        this.camera.position.set(0.8, 1.4, 1.0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(containerRect.width, containerRect.height);
        this.container.appendChild(this.renderer.domElement);
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize(), false);
        
        this.isInitialized = true;
        console.log('Studio Video Header initialized');
    }
    
    loadFBX(fbxPath) {
        if (!this.isInitialized) {
            console.error('Studio Video Header not initialized');
            return Promise.reject('Not initialized');
        }
        
        // Use the imported FBXLoader directly
        const fbxLoader = new FBXLoader();
        
        return new Promise((resolve, reject) => {
            fbxLoader.load(
                fbxPath,
                (object) => {
                    this.fbxModel = object;
                    
                    // Optional: Process materials and meshes if needed
                    // object.traverse((child) => {
                    //     if (child.isMesh) {
                    //         if (child.material) {
                    //             child.material.transparent = false;
                    //         }
                    //     }
                    // });
                    
                    // Scale the model (adjust as needed for your model)
                    // object.scale.set(0.01, 0.01, 0.01);
                    
                    this.scene.add(object);
                    
                    // Setup animation if available
                    if (object.animations && object.animations.length > 0) {
                        this.setupAnimation(object.animations[0]);
                    }
                    
                    resolve(object);
                },
                (xhr) => {
                    console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
                },
                (error) => {
                    console.log(error);
                    reject(error);
                }
            );
        });
    }
    
    setupAnimation(animationClip) {
        this.mixer = new THREE.AnimationMixer(this.fbxModel);
        this.animationAction = this.mixer.clipAction(animationClip);
        
        this.animationDuration = animationClip.duration;
        this.totalFrames = Math.floor(this.animationDuration * this.frameRate);
        
        // Pause the animation to control it manually
        this.animationAction.play();
        this.animationAction.paused = true;
        this.animationAction.time = 0;
        
        console.log(`Animation setup: ${this.totalFrames} frames, ${this.animationDuration}s duration`);
    }
    
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            if (!this.mixer || !this.animationAction) return;
            
            switch(event.code) {
                case 'ArrowRight':
                    event.preventDefault();
                    this.nextFrame();
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    this.previousFrame();
                    break;
                case 'Space':
                    event.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'Home':
                    event.preventDefault();
                    this.goToFrame(0);
                    break;
                case 'End':
                    event.preventDefault();
                    this.goToFrame(this.totalFrames - 1);
                    break;
            }
        });
        
        console.log('Keyboard controls setup: ← Previous frame, → Next frame, Space Play/Pause');
    }
    
    nextFrame() {
        if (this.currentFrame < this.totalFrames - 1) {
            this.currentFrame++;
            this.updateAnimationFrame();
        }
    }
    
    previousFrame() {
        if (this.currentFrame > 0) {
            this.currentFrame--;
            this.updateAnimationFrame();
        }
    }
    
    goToFrame(frameNumber) {
        this.currentFrame = Math.max(0, Math.min(frameNumber, this.totalFrames - 1));
        this.updateAnimationFrame();
    }
    
    updateAnimationFrame() {
        if (!this.mixer || !this.animationAction) return;
        
        const time = (this.currentFrame / this.totalFrames) * this.animationDuration;
        this.animationAction.time = time;
        this.mixer.update(0); // Update with 0 delta to set exact time
        this.render();
        
        // Dispatch custom event for frame change
        const event = new CustomEvent('frameChanged', {
            detail: {
                currentFrame: this.currentFrame,
                totalFrames: this.totalFrames,
                time: time,
                duration: this.animationDuration
            }
        });
        document.dispatchEvent(event);
    }
    
    togglePlayPause() {
        if (!this.animationAction) return;
        
        this.animationAction.paused = !this.animationAction.paused;
        console.log(this.animationAction.paused ? 'Animation paused' : 'Animation playing');
    }
    
    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        
        const containerRect = this.container.getBoundingClientRect();
        this.camera.aspect = containerRect.width / containerRect.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(containerRect.width, containerRect.height);
        this.render();
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update mixer if animation is playing
        if (this.mixer && !this.animationAction?.paused) {
            this.mixer.update(0.016); // 60fps delta time
        }
        
        this.render();
    }
    
    render() {
        if (!this.renderer || !this.scene || !this.camera) return;
        this.renderer.render(this.scene, this.camera);
    }
    
    // Public API methods
    getCurrentFrame() {
        return this.currentFrame;
    }
    
    getTotalFrames() {
        return this.totalFrames;
    }
    
    getAnimationProgress() {
        return this.totalFrames > 0 ? this.currentFrame / this.totalFrames : 0;
    }
    
    setFrameRate(fps) {
        this.frameRate = fps;
        if (this.animationDuration > 0) {
            this.totalFrames = Math.floor(this.animationDuration * this.frameRate);
        }
    }
    
    destroy() {
        // Clean up resources
        if (this.renderer) {
            this.container.removeChild(this.renderer.domElement);
            this.renderer.dispose();
        }
        
        if (this.mixer) {
            this.mixer.stopAllAction();
        }
        
        // Remove event listeners
        window.removeEventListener('resize', this.onWindowResize);
        document.removeEventListener('keydown', this.setupKeyboardControls);
        
        console.log('Studio Video Header destroyed');
    }
}

// Export the class for ES6 modules
export { StudioVideoHeader };