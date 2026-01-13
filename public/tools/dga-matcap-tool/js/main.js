import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/*
 * MatCap Architect - Main Logic
 * Ported from React to Vanilla JS for Chatooly
 */

// ================= CONSTANTS & STATE =================
const PREVIEW_RES = 512;
const ANIM_RES = 256;

// State object (replacing React useState)
const state = {
    colorStops: [
        { id: 1, pos: 0.0, color: '#ffffe0' }, 
        { id: 2, pos: 0.4, color: '#ff0080' }, 
        { id: 3, pos: 1.0, color: '#220044' } 
    ],
    lightPos: { x: 0.5, y: 0.5 },
    customMatCapURL: null,
    gradientType: 'radial', // 'radial' | 'linear'
    gradientAngle: 90,
    shaderMode: 'reflective', // 'reflective' | 'toon'
    noiseStrength: 0.0,
    patternType: 'none',
    customPatternURL: null,
    textureScale: 1.0,
    patternOpacity: 0.5,
    bumpStrength: 0.1,
    rimLightColor: '#00aaff',
    rimLightIntensity: 0.0,
    rimLightPower: 0.6,
    chromaticAberration: 0.0,
    blurStrength: 0,
    lensPreset: 50,
    isAnimating: false,
    isExportingVideo: false,
    exportLoop: true,
    exportHQ: true,
    animSpeed: 0.5,
    isBaked: false,
    highQuality: true
};

// Global References
let scene, camera, renderer, mesh, material, controls;
let matcapCanvas, noiseCanvas;
let generatedMatCap, generatedBump, generatedPattern;

const canvas = document.getElementById('chatooly-canvas');
const previewCanvas = document.getElementById('matcap-preview-canvas');

// ================= UTILS =================
const lerpColor = (hex1, hex2, factor) => {
    if (!hex1 || !hex2) return hex1 || '#000000';
    const r1 = parseInt(hex1.substring(1,3), 16);
    const g1 = parseInt(hex1.substring(3,5), 16);
    const b1 = parseInt(hex1.substring(5,7), 16);
    
    const r2 = parseInt(hex2.substring(1,3), 16);
    const g2 = parseInt(hex2.substring(3,5), 16);
    const b2 = parseInt(hex2.substring(5,7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const generateNoiseCanvas = () => {
    const nc = document.createElement('canvas');
    nc.width = 512; nc.height = 512;
    const nctx = nc.getContext('2d');
    const idata = nctx.createImageData(512, 512);
    for (let i = 0; i < idata.data.length; i += 4) {
        const n = Math.random() * 255;
        idata.data[i] = n; idata.data[i+1] = n; idata.data[i+2] = n; idata.data[i+3] = 255;
    }
    nctx.putImageData(idata, 0, 0);
    return nc;
};

// ================= THREE.JS SETUP =================
function init() {
    // 1. Scene
    scene = new THREE.Scene();
    // Scene background will be handled by Background Manager logic in animate()

    // 2. Camera
    // Use dimensions from HTML (set to 1080x1920 for Portrait)
    const aspect = canvas.width / canvas.height;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.z = 4.5;

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true, // REQUIRED
        powerPreference: "high-performance"
    });
    // Important: pass false as 3rd arg to prevent Three.js from setting inline styles
    renderer.setSize(canvas.width, canvas.height, false);
    // Optimization: Cap pixel ratio to improve performance
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 4. Controls
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 5. Initial Object (TorusKnot)
    const geometry = new THREE.TorusKnotGeometry(1, 0.35, 256, 64);
    applyTriplanarUV(geometry);

    // Initial Material
    matcapCanvas = document.createElement('canvas');
    matcapCanvas.width = PREVIEW_RES; 
    matcapCanvas.height = PREVIEW_RES;
    
    const matcapTex = new THREE.CanvasTexture(matcapCanvas);
    matcapTex.colorSpace = THREE.SRGBColorSpace;

    material = new THREE.MeshMatcapMaterial({ 
        color: 0xffffff, 
        matcap: matcapTex, 
        map: null, 
        bumpMap: null, 
        bumpScale: 0.1 
    });

    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Noise
    noiseCanvas = generateNoiseCanvas();

    // Init Logic
    setupUI();
    
    // Background Manager Init
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.init(canvas);
        // Set default black background
        window.Chatooly.backgroundManager.setBackgroundColor('#000000');
    }

    setupBackgroundListeners();
    updateBackground(); // Initial background render

    // Start Loop
    requestAnimationFrame(animate);
    
    // Initial Render of MatCap
    renderMatCap();
    updateStopsUI();
}

// ================= MATCAP LOGIC =================
function renderMatCap(offset = 0) {
    if (!material) return;
    
    const p = state;
    const size = p.isExportingVideo ? (p.exportHQ ? 1024 : 512) : (p.isAnimating ? ANIM_RES : (p.highQuality ? 2048 : PREVIEW_RES));
    
    if (matcapCanvas.width !== size) { matcapCanvas.width = size; matcapCanvas.height = size; }
    const ctx = matcapCanvas.getContext('2d');

    // 1. BASE
    if (p.customMatCapURL) {
        const img = new Image();
        img.src = p.customMatCapURL;
        // Note: synchronous draw for now, assume loaded if URL exists. 
        // Real logic should handle async loading, but state.customMatCapURL comes from FileReader which is fast enough usually
        if (img.complete) {
            ctx.drawImage(img, 0, 0, size, size);
        } else {
            img.onload = () => {
                ctx.drawImage(img, 0, 0, size, size);
                updateMaterialTexture();
            };
        }
    } else {
        let gradient;
        const stops = [...p.colorStops].sort((a, b) => a.pos - b.pos);
        
        if (p.gradientType === 'radial') {
                const cx = size * p.lightPos.x;
                const cy = size * (1 - p.lightPos.y); 
                const dx = Math.max(cx, size - cx);
                const dy = Math.max(cy, size - cy);
                const maxDist = Math.sqrt(dx*dx + dy*dy);
                gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDist);
        } else {
                const rad = (p.gradientAngle * Math.PI) / 180;
                const cx = size / 2; const cy = size / 2;
                const r = size / 2; // approximation
                const x1 = cx - Math.cos(rad) * r; const y1 = cy - Math.sin(rad) * r;
                const x2 = cx + Math.cos(rad) * r; const y2 = cy + Math.sin(rad) * r;
                gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        }

        if (p.isAnimating) {
            const t = offset % 1.0; 
            let activeStops = [];
            
            [-1, 0, 1].forEach(period => {
                stops.forEach(s => {
                    const finalPos = s.pos + t + period;
                    activeStops.push({ pos: finalPos, color: s.color });
                });
            });
            
            activeStops.sort((a, b) => a.pos - b.pos);

            const addInterpolatedStop = (atPos) => {
                let pStop = activeStops[0];
                let nStop = activeStops[activeStops.length - 1];
                
                for (let i = 0; i < activeStops.length; i++) {
                    if (activeStops[i].pos <= atPos) pStop = activeStops[i];
                    if (activeStops[i].pos > atPos) { nStop = activeStops[i]; break; }
                }
                
                if (pStop && nStop && pStop !== nStop) {
                    const range = nStop.pos - pStop.pos;
                    const localT = (atPos - pStop.pos) / range;
                    const blendedColor = lerpColor(pStop.color, nStop.color, localT);
                    return { pos: atPos, color: blendedColor };
                }
                return null;
            };

            const startAnchor = addInterpolatedStop(0.0);
            const endAnchor = addInterpolatedStop(1.0);
            
            const finalStops = activeStops.filter(s => s.pos > 0.0001 && s.pos < 0.9999);
            if (startAnchor) finalStops.unshift(startAnchor);
            if (endAnchor) finalStops.push(endAnchor);

            finalStops.forEach(s => {
                gradient.addColorStop(Math.max(0, Math.min(1, s.pos)), s.color);
            });
        } else {
            stops.forEach(stop => {
                gradient.addColorStop(Math.max(0, Math.min(1, stop.pos)), stop.color);
            });
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
    }

    // 2. FX
    if (p.rimLightIntensity > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; 
        const cx = size / 2, cy = size / 2, radius = size / 2;
        const rim = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        rim.addColorStop(0, 'rgba(0,0,0,0)');
        rim.addColorStop(Math.max(0, 1 - p.rimLightPower), 'rgba(0,0,0,0)'); 
        rim.addColorStop(1, p.rimLightColor);
        ctx.globalAlpha = p.rimLightIntensity;
        ctx.fillStyle = rim;
        ctx.fillRect(0, 0, size, size);
        ctx.restore();
    }

    if (p.noiseStrength > 0 && noiseCanvas) {
        ctx.save();
        ctx.globalAlpha = p.noiseStrength; 
        ctx.globalCompositeOperation = 'overlay'; 
        ctx.drawImage(noiseCanvas, 0, 0, size, size);
        ctx.restore();
    }

    if (p.shaderMode === 'toon') {
        const imgData = ctx.getImageData(0, 0, size, size);
        const levels = 3; const step = 255 / levels;
        for (let i = 0; i < imgData.data.length; i += 4) {
            imgData.data[i] = Math.floor(imgData.data[i] / step) * step;
            imgData.data[i+1] = Math.floor(imgData.data[i+1] / step) * step;
            imgData.data[i+2] = Math.floor(imgData.data[i+2] / step) * step;
        }
        ctx.putImageData(imgData, 0, 0);
    }

    if (p.chromaticAberration > 0) {
        const imgData = ctx.getImageData(0, 0, size, size);
        const pixels = imgData.data;
        const cx = size / 2, cy = size / 2;
        const maxRadius = Math.sqrt(cx*cx + cy*cy);
        const source = new Uint8ClampedArray(pixels);
        const maxShift = p.chromaticAberration * (size / 256); 
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                const dx = x - cx, dy = y - cy;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const shift = (dist / maxRadius) ** 2 * maxShift; 
                const rx = x - (dx/dist||0) * shift; const ry = y - (dy/dist||0) * shift;
                const bx = x + (dx/dist||0) * shift; const by = y + (dy/dist||0) * shift;
                if (rx>=0 && rx<size && ry>=0 && ry<size) {
                    const rIdx = (Math.floor(ry)*size + Math.floor(rx))*4;
                    pixels[idx] = source[rIdx];
                }
                if (bx>=0 && bx<size && by>=0 && by<size) {
                    const bIdx = (Math.floor(by)*size + Math.floor(bx))*4;
                    pixels[idx+2] = source[bIdx+2];
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    if (p.blurStrength > 0) {
        const temp = document.createElement('canvas'); temp.width = size; temp.height = size;
        const tCtx = temp.getContext('2d');
        tCtx.filter = `blur(${p.blurStrength * (size/512)}px)`;
        tCtx.drawImage(matcapCanvas, 0, 0);
        ctx.clearRect(0,0,size,size);
        ctx.drawImage(temp, 0, 0);
    }
    
    generatedMatCap = matcapCanvas;
    
    // Update Preview Canvas
    if (previewCanvas) {
        const pCtx = previewCanvas.getContext('2d');
        pCtx.clearRect(0,0,128,128);
        pCtx.drawImage(matcapCanvas, 0,0,size,size, 0,0,128,128);
    }

    updateMaterialTexture();
}

function updateMaterialTexture() {
    if (!material) return;
    const p = state;

    const matcapTex = new THREE.CanvasTexture(matcapCanvas);
    matcapTex.colorSpace = THREE.SRGBColorSpace;
    
    if (p.shaderMode === 'toon') {
        matcapTex.minFilter = THREE.NearestFilter;
        matcapTex.magFilter = THREE.NearestFilter;
    } else {
        matcapTex.minFilter = THREE.LinearFilter;
        matcapTex.magFilter = THREE.LinearFilter;
    }
    if (renderer && !p.isAnimating) matcapTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    
    // Rotation
    matcapTex.center.set(0.5, 0.5);
    if (p.customMatCapURL || p.gradientType === 'linear') {
        matcapTex.rotation = (p.lightPos.x - 0.5) * Math.PI * 2;
    } else {
        matcapTex.rotation = 0;
    }
    
    matcapTex.needsUpdate = true;
    
    if (p.isBaked) {
        const wC = document.createElement('canvas'); wC.width=2; wC.height=2;
        const wCtx = wC.getContext('2d'); wCtx.fillStyle='#FFFFFF'; wCtx.fillRect(0,0,2,2);
        const wTex = new THREE.CanvasTexture(wC);
        material.map = matcapTex; 
        material.matcap = wTex; 
    } else {
        material.matcap = matcapTex;
        // Map will be handled by applyPatterns if needed, or cleared here if no pattern logic runs
        // But since we fixed unbake to call applyPatterns, we don't strictly need to clear it here 
        // unless applyPatterns isn't called.
        // Let's rely on applyPatterns being called for consistency.
    }
    material.needsUpdate = true;
}

const generatePatternMap = (size, opacity, customImg = null) => {
    const p = state;
    const cvs = document.createElement('canvas'); cvs.width = size; cvs.height = size;
    const cx = cvs.getContext('2d');
    cx.fillStyle = '#FFFFFF'; cx.fillRect(0,0,size,size);
    cx.save(); cx.globalAlpha = opacity;

    if (customImg) {
            cx.drawImage(customImg, 0, 0, size, size);
    } else if (p.patternType !== 'none') {
            cx.fillStyle = '#000000';
            const reps = 20; const step = size/reps;
            if(p.patternType==='scanlines') for(let i=0;i<reps;i++) cx.fillRect(0,i*step,size,step*0.5);
            else if(p.patternType==='grid') for(let i=0;i<reps;i++) { cx.fillRect(i*step,0,Math.max(1,step*0.1),size); cx.fillRect(0,i*step,size,Math.max(1,step*0.1)); }
            else if(p.patternType==='dots') {
                const r = (step*0.6)/2;
                for(let x=0;x<reps;x++) for(let y=0;y<reps;y++) { cx.beginPath(); cx.arc(x*step+step/2,y*step+step/2,r,0,Math.PI*2); cx.fill(); }
            }
    }
    cx.restore();
    const tex = new THREE.CanvasTexture(cvs);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(p.textureScale, p.textureScale);
    tex.colorSpace = THREE.SRGBColorSpace;
    if (p.shaderMode === 'toon') { tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter; }
    return { cvs, tex };
};

const applyPatterns = (img = null) => {
    const p = state;
    const size = p.highQuality ? 2048 : PREVIEW_RES;
    
    const bump = generatePatternMap(size, 1.0, img);
    generatedBump = bump.cvs;
    
    const vis = generatePatternMap(size, p.patternOpacity, img);
    generatedPattern = vis.cvs;
    
    if (material) {
        material.bumpMap = bump.tex;
        material.bumpScale = p.bumpStrength;
        if (!p.isBaked) material.map = vis.tex;
        material.needsUpdate = true;
    }
};

const applyTriplanarUV = (geometry) => {
    // Ensure normals exist
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;
    
    // Calculate size for normalization
    const sizeX = (max.x - min.x) || 1.0;
    const sizeY = (max.y - min.y) || 1.0;
    const sizeZ = (max.z - min.z) || 1.0;

    const posAttribute = geometry.attributes.position;
    const normAttribute = geometry.attributes.normal;
    
    const count = posAttribute.count;
    const uvArray = new Float32Array(count * 2);
    
    const p = new THREE.Vector3();
    const n = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
        p.fromBufferAttribute(posAttribute, i);
        n.fromBufferAttribute(normAttribute, i);
        
        const nx = Math.abs(n.x);
        const ny = Math.abs(n.y);
        const nz = Math.abs(n.z);
        
        let u = 0, v = 0;
        
        // Triplanar mapping with normalization (0..1)
        if (nx >= ny && nx >= nz) { 
            u = (p.z - min.z) / sizeZ; 
            v = (p.y - min.y) / sizeY; 
        } 
        else if (ny >= nx && ny >= nz) { 
            u = (p.x - min.x) / sizeX; 
            v = (p.z - min.z) / sizeZ; 
        } 
        else { 
            u = (p.x - min.x) / sizeX; 
            v = (p.y - min.y) / sizeY; 
        }
        
        uvArray[i * 2] = u; 
        uvArray[i * 2 + 1] = v;
    }
    
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
    geometry.attributes.uv.needsUpdate = true;
};

function setupBackgroundListeners() {
    if (!window.Chatooly || !window.Chatooly.backgroundManager) return;
    const bgm = window.Chatooly.backgroundManager;

    // Transparent Toggle
    const transparentToggle = document.getElementById('transparent-bg');
    if (transparentToggle) {
        transparentToggle.addEventListener('click', (e) => {
            // Wait for UI to update attribute
            setTimeout(() => {
                const isPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
                bgm.setTransparent(isPressed);
                updateBackground();
            }, 0);
        });
    }

    // Color
    const colorPicker = document.getElementById('bg-color');
    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            bgm.setBackgroundColor(e.target.value);
            updateBackground();
        });
    }

    // Image
    const bgImage = document.getElementById('bg-image');
    if (bgImage) {
        bgImage.addEventListener('change', async (e) => {
            if (e.target.files[0]) {
                await bgm.setBackgroundImage(e.target.files[0]);
                document.getElementById('clear-bg-image').style.display = 'block';
                document.getElementById('bg-fit-group').style.display = 'block';
                updateBackground();
            }
        });
    }

    // Clear Image
    const clearBtn = document.getElementById('clear-bg-image');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            bgm.clearBackgroundImage();
            clearBtn.style.display = 'none';
            document.getElementById('bg-fit-group').style.display = 'none';
            if (bgImage) bgImage.value = '';
            updateBackground();
        });
    }

    // Fit
    const fitSelect = document.getElementById('bg-fit');
    if (fitSelect) {
        fitSelect.addEventListener('change', (e) => {
            bgm.setFit(e.target.value);
            updateBackground();
        });
    }
}

// ================= UI EVENT HANDLERS =================
function setupUI() {
    // Presets
    document.getElementById('save-preset-btn').addEventListener('click', () => {
        const data = JSON.stringify(state, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'matcap_preset.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('load-preset-btn').addEventListener('click', () => {
        document.getElementById('preset-upload').click();
    });

    document.getElementById('preset-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const loaded = JSON.parse(event.target.result);
                // Merge safely
                Object.assign(state, loaded);
                
                // Update UI from state
                updateStopsUI();
                
                // Update simple inputs
                const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
                const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
                
                setVal('gradient-angle', state.gradientAngle); setTxt('angle-val', state.gradientAngle + '°');
                if(state.gradientType === 'radial') document.getElementById('angle-control').style.display = 'none';
                else document.getElementById('angle-control').style.display = 'block';

                setVal('light-x', state.lightPos.x);
                setVal('light-y', state.lightPos.y);
                setVal('anim-speed', state.animSpeed); setTxt('anim-speed-val', state.animSpeed);
                setVal('shader-mode', state.shaderMode);
                setVal('rim-color', state.rimLightColor);
                setVal('rim-intensity', state.rimLightIntensity); setTxt('rim-int-val', Math.round(state.rimLightIntensity * 100));
                setVal('rim-power', state.rimLightPower); setTxt('rim-pow-val', Math.round(state.rimLightPower * 100));
                setVal('chrom-ab', state.chromaticAberration); setTxt('chrom-val', state.chromaticAberration);
                setVal('blur-str', state.blurStrength); setTxt('blur-val', state.blurStrength);
                setVal('grain-str', state.noiseStrength); setTxt('grain-val', Math.round(state.noiseStrength * 100));
                
                // Toggles
                const setToggle = (id, val) => { const el = document.getElementById(id); if(el) el.setAttribute('aria-pressed', val); };
                setToggle('anim-toggle', !state.isAnimating); // Logic inverted in UI listener but visual is pressed=true
                // Actually wait, UI logic: isPressed -> !isAnimating. 
                // If state.isAnimating is true, button should be UNPRESSED? 
                // Let's check original logic:
                // btn.setAttribute('aria-pressed', !isPressed); state.isAnimating = !isPressed;
                // So pressed=true => animating=true.
                setToggle('anim-toggle', state.isAnimating);
                document.getElementById('anim-speed-group').style.display = state.isAnimating ? 'block' : 'none';

                setToggle('export-loop', state.exportLoop);
                setToggle('export-hq', state.exportHQ);
                
                // Camera
                updateCamera();
                
                // Re-render
                renderMatCap();
                
            } catch (err) {
                console.error('Invalid preset', err);
                alert('Error loading preset');
            }
        };
        reader.readAsText(file);
    });

    // Custom MatCap Upload
    document.getElementById('custom-matcap-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            state.customMatCapURL = event.target.result;
            document.getElementById('clear-custom-matcap').style.display = 'block';
            renderMatCap();
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('clear-custom-matcap').addEventListener('click', () => {
        state.customMatCapURL = null;
        document.getElementById('custom-matcap-upload').value = '';
        document.getElementById('clear-custom-matcap').style.display = 'none';
        renderMatCap();
    });

    // Gradient Types
    document.getElementById('btn-gradient-radial').addEventListener('click', () => {
        state.gradientType = 'radial';
        document.getElementById('angle-control').style.display = 'none';
        renderMatCap();
    });
    document.getElementById('btn-gradient-linear').addEventListener('click', () => {
        state.gradientType = 'linear';
        document.getElementById('angle-control').style.display = 'block';
        renderMatCap();
    });

    document.getElementById('gradient-angle').addEventListener('input', (e) => {
        state.gradientAngle = parseInt(e.target.value);
        document.getElementById('angle-val').innerText = state.gradientAngle + '°';
        renderMatCap();
    });

    // Stops UI is complex - adding button
    document.getElementById('add-stop-btn').addEventListener('click', () => {
        state.colorStops.push({ id: Date.now(), pos: 0.5, color: '#888888' });
        updateStopsUI();
        renderMatCap();
    });

    // Lighting
    document.getElementById('light-x').addEventListener('input', (e) => {
        state.lightPos.x = parseFloat(e.target.value);
        renderMatCap();
    });
    document.getElementById('light-y').addEventListener('input', (e) => {
        state.lightPos.y = parseFloat(e.target.value);
        renderMatCap();
    });

    // Animation
    document.getElementById('anim-toggle').addEventListener('click', (e) => {
        const btn = e.target.closest('button'); // handle click on inner span
        const isPressed = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', !isPressed);
        state.isAnimating = !isPressed;
        document.getElementById('anim-speed-group').style.display = state.isAnimating ? 'block' : 'none';
    });
    document.getElementById('anim-speed').addEventListener('input', (e) => {
        state.animSpeed = parseFloat(e.target.value);
        document.getElementById('anim-speed-val').innerText = state.animSpeed;
    });

    // Shader Mode
    document.getElementById('shader-mode').addEventListener('change', (e) => {
        state.shaderMode = e.target.value;
        applyPatterns(state.customPatternURL ? new Image().src = state.customPatternURL : null); // Re-apply pattern settings
        renderMatCap();
    });

    // Lens
    document.querySelectorAll('.lens-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.lens-btn').forEach(b => b.classList.add('btn-outline'));
            btn.classList.remove('btn-outline');
            const mm = parseInt(btn.dataset.mm);
            state.lensPreset = mm;
            updateCamera();
        });
    });

    // Effects
    const linkSlider = (id, prop, labelId, suffix = '') => {
        const el = document.getElementById(id);
        if(!el) return;
        el.addEventListener('input', (e) => {
            state[prop] = parseFloat(e.target.value);
            if(labelId) document.getElementById(labelId).innerText = Math.round(state[prop] * (prop.includes('Color') ? 1 : (prop === 'blurStrength' || prop === 'chromaticAberration' ? 1 : 100))) + (prop === 'blurStrength' || prop === 'chromaticAberration' ? '' : suffix);
            renderMatCap();
        });
    };

    document.getElementById('rim-color').addEventListener('input', (e) => {
        state.rimLightColor = e.target.value;
        renderMatCap();
    });
    linkSlider('rim-intensity', 'rimLightIntensity', 'rim-int-val');
    linkSlider('rim-power', 'rimLightPower', 'rim-pow-val');
    linkSlider('chrom-ab', 'chromaticAberration', 'chrom-val');
    linkSlider('blur-str', 'blurStrength', 'blur-val');
    linkSlider('grain-str', 'noiseStrength', 'grain-val');

    // Model Upload
    document.getElementById('model-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const url = URL.createObjectURL(file);
        const loader = new GLTFLoader();
        loader.load(url, (gltf) => {
            if (mesh) scene.remove(mesh);
            const loadedMesh = gltf.scene;
            const box = new THREE.Box3().setFromObject(loadedMesh);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.5 / maxDim;
            loadedMesh.position.sub(center);
            loadedMesh.scale.setScalar(scale);
            loadedMesh.traverse((child) => { if (child.isMesh) { applyTriplanarUV(child.geometry); child.material = material; } });
            scene.add(loadedMesh);
            mesh = loadedMesh;
            state.isBaked = false;
            URL.revokeObjectURL(url);
        });
    });

    document.getElementById('reset-rot-btn').addEventListener('click', () => {
        if(mesh) mesh.rotation.set(0,0,0);
        controls.reset();
    });

    document.getElementById('bake-btn').addEventListener('click', () => {
        if (state.isBaked) {
            // Unbake
            if (mesh) mesh.traverse((child) => { if (child.isMesh) applyTriplanarUV(child.geometry); });
            state.isBaked = false;
            document.getElementById('bake-btn').innerText = 'Bake UVs';
            document.getElementById('bake-btn').classList.remove('btn-danger');
            document.getElementById('bake-btn').classList.add('btn-secondary');

            // FIX: Restore texture/pattern mapping
            applyPatterns();
        } else {
            // Bake from view
            if (!mesh || !camera) return;
            mesh.updateMatrixWorld(true);
            camera.updateMatrixWorld(true);
            mesh.traverse((child) => {
                if (child.isMesh) {
                    const geometry = child.geometry;
                    // Keep original UVs in attribute 'uv2' if needed, or assume overwrite is desired
                    
                    if (!geometry.attributes.normal) geometry.computeVertexNormals();
                    const modelViewMatrix = new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse, child.matrixWorld);
                    const normalMatrix = new THREE.Matrix3().getNormalMatrix(modelViewMatrix);
                    const normalAttribute = geometry.attributes.normal;
                    const uvArray = new Float32Array(normalAttribute.count * 2);
                    const vec = new THREE.Vector3();
                    for (let i = 0; i < normalAttribute.count; i++) {
                        vec.set(normalAttribute.getX(i), normalAttribute.getY(i), normalAttribute.getZ(i));
                        vec.applyMatrix3(normalMatrix);
                        vec.normalize();
                        uvArray[i * 2] = vec.x * 0.5 + 0.5;
                        uvArray[i * 2 + 1] = vec.y * 0.5 + 0.5;
                    }
                    geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
                    geometry.attributes.uv.needsUpdate = true;
                }
            });
            state.isBaked = true;
            document.getElementById('bake-btn').innerText = 'Unbake';
            document.getElementById('bake-btn').classList.remove('btn-secondary');
            document.getElementById('bake-btn').classList.add('btn-danger');
        }
        renderMatCap();
    });

    // Downloads
    
    // Export Settings Toggles
    const toggleSetup = (id, stateKey) => {
        const el = document.getElementById(id);
        if(!el) return;
        el.addEventListener('click', () => {
            const isPressed = el.getAttribute('aria-pressed') === 'true';
            el.setAttribute('aria-pressed', !isPressed);
            state[stateKey] = !isPressed;
        });
    };
    toggleSetup('export-loop', 'exportLoop');
    toggleSetup('export-hq', 'exportHQ');

    document.getElementById('dl-model').addEventListener('click', () => {
        if (!mesh) return;
        // Logic for export model with texture
        // ... (Simplified for brevity: basic GLB export)
        const exporter = new GLTFExporter();
        exporter.parse(scene, (result) => {
             if (result instanceof ArrayBuffer) {
                 const blob = new Blob([result], { type: 'application/octet-stream' });
                 const link = document.createElement('a');
                 link.style.display = 'none';
                 link.href = URL.createObjectURL(blob);
                 link.download = 'matcap_model.glb';
                 document.body.appendChild(link);
                 link.click();
                 document.body.removeChild(link);
             }
        }, (err) => console.error(err), { binary: true, onlyVisible: true });
    });
    
    document.getElementById('dl-matcap').addEventListener('click', () => {
        if(generatedMatCap) {
             const link = document.createElement('a'); link.download = 'matcap.png'; link.href = generatedMatCap.toDataURL('image/png'); link.click();
        }
    });
    
    document.getElementById('dl-bump').addEventListener('click', () => {
        if(generatedBump) {
             const link = document.createElement('a'); link.download = 'bump.png'; link.href = generatedBump.toDataURL('image/png'); link.click();
        }
    });

    document.getElementById('dl-anim').addEventListener('click', async () => {
        const btn = document.getElementById('dl-anim');
        if (state.isExportingVideo) return; 

        // 1. Setup
        const originalAnimState = state.isAnimating;
        state.isExportingVideo = true;
        
        btn.innerText = 'Rec...';
        btn.classList.add('btn-danger');
        btn.classList.remove('btn-outline');

        // Parameters
        const bitrate = state.exportHQ ? 50000000 : 5000000;
        const fps = 30;
        const totalDurationSec = state.exportLoop 
            ? (1.0 / Math.max(0.1, state.animSpeed)) 
            : 5.0;
        const totalFrames = Math.ceil(totalDurationSec * fps);
        const timeStep = 1.0 / fps; // in seconds

        // 2. Stream Setup & Manual Driver
        // We render once to set size
        renderMatCap(0);

        let currentFrame = 0;
        let recordingTime = 0;
        if (state.exportLoop) recordingTime = 0; 
        else recordingTime = animTime;

        // Force render first frame
        renderMatCap(recordingTime);

        // Stream
        // Use 0 FPS if supported for manual control, otherwise 30
        let stream;
        let useManualFrame = false;
        
        try {
            // Try capturing with 0 FPS (manual control)
            stream = matcapCanvas.captureStream(0);
            if (stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].requestFrame) {
                useManualFrame = true;
            } else {
                // Fallback if 0 FPS yields no tracks or requestFrame not supported
                stream = matcapCanvas.captureStream(fps);
            }
        } catch (e) {
            stream = matcapCanvas.captureStream(fps);
        }

        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/mp4; codecs=h264')) mimeType = 'video/mp4; codecs=h264';
        else if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
        else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) mimeType = 'video/webm; codecs=vp9';
        
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
        const chunks = [];
        recorder.ondataavailable = (e) => { if(e.data.size > 0) chunks.push(e.data); };
        
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            a.download = `matcap_${state.exportHQ ? 'hq' : 'lq'}_${state.exportLoop ? 'loop' : 'seq'}.${ext}`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);

            // Cleanup
            state.isExportingVideo = false;
            state.isAnimating = originalAnimState;
            btn.innerText = 'Texture Video';
            btn.classList.remove('btn-danger');
            btn.classList.add('btn-outline');
            renderMatCap(animTime);
        };

        recorder.start();

        // 3. Driver Loop
        // Use recursive setTimeout for better timing control than setInterval
        const frameInterval = 1000 / fps;
        let nextFrameTime = performance.now();
        
        const processFrame = async () => {
            if (currentFrame >= totalFrames) {
                recorder.stop();
                return;
            }

            // Update & Render
            recordingTime += timeStep * state.animSpeed;
            renderMatCap(recordingTime);
            
            // Wait for paint to ensure frame is ready for capture
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            // Capture
            if (useManualFrame) {
                stream.getVideoTracks()[0].requestFrame();
            }
            
            currentFrame++;
            
            // Schedule next frame to match wall-clock 30fps
            nextFrameTime += frameInterval;
            const delay = Math.max(0, nextFrameTime - performance.now());
            setTimeout(processFrame, delay);
        };

        // Start loop
        processFrame();
    });

    // 3D Scene Video Export
    document.getElementById('dl-scene-video').addEventListener('click', async () => {
        const btn = document.getElementById('dl-scene-video');
        if (state.isExportingVideo) return;

        // 1. Setup
        const originalAnimState = state.isAnimating;
        state.isExportingVideo = true;
        
        btn.innerText = 'Rec...';
        btn.classList.add('btn-danger');
        btn.classList.remove('btn-outline');

        // Parameters
        const bitrate = state.exportHQ ? 50000000 : 5000000;
        const fps = 30;
        const totalDurationSec = state.exportLoop 
            ? (1.0 / Math.max(0.1, state.animSpeed)) 
            : 5.0;
        const totalFrames = Math.ceil(totalDurationSec * fps);
        const timeStep = 1.0 / fps;

        let currentFrame = 0;
        let recordingTime = 0;
        if (state.exportLoop) recordingTime = 0;
        else recordingTime = animTime;

        // Force a render to ensure fresh state at time 0
        renderMatCap(recordingTime);
        renderer.render(scene, camera);

        // Stream
        // Use 0 FPS if supported for manual control, otherwise 30
        let stream;
        let useManualFrame = false;
        
        try {
            // Try capturing with 0 FPS (manual control)
            stream = canvas.captureStream(0);
            if (stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].requestFrame) {
                useManualFrame = true;
            } else {
                // Fallback if 0 FPS yields no tracks or requestFrame not supported
                stream = canvas.captureStream(fps);
            }
        } catch (e) {
            stream = canvas.captureStream(fps);
        }

        let mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/mp4; codecs=h264')) mimeType = 'video/mp4; codecs=h264';
        else if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
        else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) mimeType = 'video/webm; codecs=vp9';

        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
        const chunks = [];
        recorder.ondataavailable = (e) => { if(e.data.size > 0) chunks.push(e.data); };
        
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
            a.download = `scene_${state.exportHQ ? 'hq' : 'lq'}_${state.exportLoop ? 'loop' : 'seq'}.${ext}`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);

            // Cleanup
            state.isExportingVideo = false;
            state.isAnimating = originalAnimState;
            btn.innerText = '3D Video';
            btn.classList.remove('btn-danger');
            btn.classList.add('btn-outline');
        };

        recorder.start();

        // 3. Driver Loop
        // Use recursive logic with RAF to ensure paint synchronization
        
        const processFrame = async () => {
            if (currentFrame >= totalFrames) {
                recorder.stop();
                return;
            }

            // 1. Update State & Render
            recordingTime += timeStep * state.animSpeed;
            renderMatCap(recordingTime);
            // Only render scene if we are exporting scene
            // Check context or passed flag. We are inside dl-anim handler here (Texture Video)
            // Wait, I am editing the first block which is dl-anim (Texture).
            // dl-scene-video is further down.
            // Texture video doesn't need renderer.render(scene).
            
            // 2. Wait for browser composition
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            // 3. Capture
            if (useManualFrame) {
                stream.getVideoTracks()[0].requestFrame();
            }
            
            currentFrame++;
            
            // 4. Timing Control
            const now = performance.now();
            const targetTime = nextFrameTime + frameInterval;
            let delay = targetTime - now;
            if (delay < 0) delay = 0;
            nextFrameTime = targetTime;

            setTimeout(processFrame, delay);
        };

        // Initialize Timing
        const frameInterval = 1000 / fps;
        let nextFrameTime = performance.now();
        
        // Start
        processFrame();
    });
}

function updateCamera() {
    if (camera) {
        let fov = 45;
        switch(state.lensPreset) {
            case 15: fov = 100; break;
            case 24: fov = 74; break;
            case 35: fov = 54; break;
            case 50: fov = 40; break;
            case 85: fov = 24; break;
            case 135: fov = 15; break;
            default: fov = 45;
        }
        camera.fov = fov;
        camera.updateProjectionMatrix();
    }
}

function updateStopsUI() {
    const container = document.getElementById('stops-container');
    container.innerHTML = '';
    
    state.colorStops.sort((a,b) => a.pos - b.pos).forEach((stop, idx) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.marginBottom = '4px';
        row.style.gap = '5px';
        
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = stop.color;
        colorInput.className = 'chatooly-color-input';
        colorInput.style.width = '30px';
        colorInput.style.height = '30px';
        colorInput.style.padding = '0';
        colorInput.addEventListener('input', (e) => {
            stop.color = e.target.value;
            renderMatCap();
        });
        
        const posInput = document.createElement('input');
        posInput.type = 'range';
        posInput.min = '0';
        posInput.max = '1';
        posInput.step = '0.01';
        posInput.value = stop.pos;
        posInput.className = 'chatooly-slider';
        posInput.style.flex = '1';
        posInput.addEventListener('input', (e) => {
            stop.pos = parseFloat(e.target.value);
            renderMatCap();
        });
        
        const delBtn = document.createElement('button');
        delBtn.innerText = '×';
        delBtn.className = 'chatooly-btn btn-danger';
        delBtn.style.padding = '0 6px';
        delBtn.style.minWidth = 'auto';
        if (state.colorStops.length <= 2) delBtn.disabled = true;
        delBtn.addEventListener('click', () => {
            state.colorStops = state.colorStops.filter(s => s.id !== stop.id);
            updateStopsUI();
            renderMatCap();
        });
        
        row.appendChild(colorInput);
        row.appendChild(posInput);
        row.appendChild(delBtn);
        container.appendChild(row);
    });
}

// ================= ANIMATION & BACKGROUND =================
let animTime = 0;
let lastTime = 0;

// Optimization: Reuse background resources
const bgCanvas = document.createElement('canvas');
const bgTexture = new THREE.CanvasTexture(bgCanvas);
bgTexture.colorSpace = THREE.SRGBColorSpace;
bgTexture.minFilter = THREE.LinearFilter;

function updateBackground() {
    // Resize bg canvas if needed
    if (bgCanvas.width !== canvas.width || bgCanvas.height !== canvas.height) {
        bgCanvas.width = canvas.width;
        bgCanvas.height = canvas.height;
    }

    const bgCtx = bgCanvas.getContext('2d');
    
    // Draw Chatooly background to it
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.drawToCanvas(bgCtx, canvas.width, canvas.height);
    } else {
        bgCtx.fillStyle = '#000000';
        bgCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Update texture
    bgTexture.needsUpdate = true;
    scene.background = bgTexture;
}

function animate(time) {
    requestAnimationFrame(animate);
    
    // Time management
    const now = time * 0.001;
    const delta = now - lastTime;
    lastTime = now;
    
    if (state.isAnimating) {
        animTime += delta * state.animSpeed;
        renderMatCap(animTime);
    }
    
    controls.update();
    renderer.render(scene, camera);
}

// ================= RESIZE & EXPORT =================

// Canvas Resize
document.addEventListener('chatooly:canvas-resized', (e) => {
    const newWidth = e.detail.canvas.width;
    const newHeight = e.detail.canvas.height;
    
    if (camera && renderer) {
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight, false); // Update internal res, don't touch style
    }
});

// High Res Export
window.renderHighResolution = function(targetCanvas, scale) {
    if (!renderer || !scene || !camera) return;
    
    const targetWidth = canvas.width * scale;
    const targetHeight = canvas.height * scale;
    
    // 1. Create High-Res Background
    // We must manually draw background to targetCanvas because THREE.WebGLRenderer with preserveDrawingBuffer
    // will just draw over it or handle alpha. 
    // Wait, typical flow is: High-res background -> 3D Render on top.
    
    const ctx = targetCanvas.getContext('2d');
    
    // Draw background
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.drawToCanvas(ctx, targetWidth, targetHeight);
    }
    
    // 2. Render 3D Scene
    // We need a fresh renderer for the high-res export to ensure correct sizing and context
    const exportRenderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true
    });
    exportRenderer.setSize(targetWidth, targetHeight);
    exportRenderer.setPixelRatio(1); // Explicitly 1 because we sized canvas already
    exportRenderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Temporary Background for 3D Scene (Transparent)
    const originalBg = scene.background;
    scene.background = null; 
    
    exportRenderer.render(scene, camera);
    
    // Composite
    ctx.drawImage(exportRenderer.domElement, 0, 0);
    
    // Cleanup
    scene.background = originalBg;
    exportRenderer.dispose();
};

// Start
init();

// Export init to window for debugging if needed
window.MatCapTool = {
    init,
    state,
    renderMatCap
};
