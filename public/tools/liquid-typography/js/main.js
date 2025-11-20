/*
 * Liquid Typography Tool - Main Logic
 * Particle-based liquid typography with interactive physics
 */

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// Set initial canvas dimensions (HD resolution)
canvas.width = 1920;
canvas.height = 1080;

// ========== BACKGROUND SYSTEM ==========
// Initialize background manager
if (window.Chatooly && window.Chatooly.backgroundManager) {
    window.Chatooly.backgroundManager.init(canvas);
    // Set default background to black
    window.Chatooly.backgroundManager.setBackgroundColor('#000000');
}

// ========== SETTINGS ==========
let settings = {
    text: 'Liquid\nTypography',
    particleSpacing: 3,
    particleSize: 1.5,
    fontFamily: 'Assistant',
    fontSize: 150,
    letterSpacing: 0,
    lineHeight: 1.2,
    returnForce: 0.05,
    fieldStrength: 0.5,
    noiseScale: 0.003,
    mouseRepel: 8,
};

// ========== MOUSE TRACKING ==========
const mouse = { x: null, y: null, radius: 150 };
const cursorDot = document.querySelector('.cursor-dot');

// Track canvas dimensions for resize handling
let previousCanvasSize = { width: 0, height: 0 };

// ========== PARTICLES ==========
let particlesArray = [];

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.originX = x;
        this.originY = y;
        this.size = settings.particleSize;
        this.vx = 0;
        this.vy = 0;
        this.maxSpeed = 3;
        this.color = 'white';
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    update(time) {
        // Mouse interaction
        if (mouse.x !== undefined && mouse.y !== undefined) {
            let dx = this.x - mouse.x;
            let dy = this.y - mouse.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < mouse.radius) {
                let force = (mouse.radius - distance) / mouse.radius;
                this.vx += (dx / distance) * force * settings.mouseRepel;
                this.vy += (dy / distance) * force * settings.mouseRepel;
            }
        }
        
        // Perlin noise field
        const angle = noise.perlin3(
            this.x * settings.noiseScale,
            this.y * settings.noiseScale,
            time * 0.0001
        ) * Math.PI * 2;
        this.vx += Math.cos(angle) * settings.fieldStrength;
        this.vy += Math.sin(angle) * settings.fieldStrength;
        
        // Return force to origin
        this.vx += (this.originX - this.x) * settings.returnForce;
        this.vy += (this.originY - this.y) * settings.returnForce;
        
        // Limit speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
            this.vx = (this.vx / speed) * this.maxSpeed;
            this.vy = (this.vy / speed) * this.maxSpeed;
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Damping
        this.vx *= 0.95;
        this.vy *= 0.95;
    }
}

// ========== TEXT TO PARTICLES ==========
function init(callback) {
    particlesArray = [];
    
    if (canvas.width === 0 || canvas.height === 0) {
        setTimeout(() => init(callback), 50);
        return;
    }
    
    // Set font properties
    ctx.fillStyle = 'white';
    ctx.font = `bold ${settings.fontSize}px ${settings.fontFamily}`;
    ctx.letterSpacing = `${settings.letterSpacing}px`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw text to get pixel data
    const lines = settings.text.split('\n');
    const lineHeightPixels = settings.fontSize * settings.lineHeight;
    const totalTextHeight = (lines.length - 1) * lineHeightPixels;
    const startY = (canvas.height / 2) - (totalTextHeight / 2);
    
    lines.forEach((line, index) => {
        const y = startY + (index * lineHeightPixels);
        ctx.fillText(line, canvas.width / 2, y);
    });
    
    // Extract particles from text pixels
    const textCoordinates = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < textCoordinates.height; y += settings.particleSpacing) {
        for (let x = 0; x < textCoordinates.width; x += settings.particleSpacing) {
            const alpha = textCoordinates.data[(y * 4 * textCoordinates.width) + (x * 4) + 3];
            if (alpha > 128) {
                particlesArray.push(new Particle(x, y));
            }
        }
    }
    
    if (callback) callback();
}

// ========== ANIMATION LOOP ==========
let animationFrameId;
let animationTime = 0;

function animate(timestamp) {
    animationTime = timestamp;
    
    // Draw background first
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.drawToCanvas(ctx, canvas.width, canvas.height);
    } else {
        // Fallback: fill with black
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Update and draw particles
    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update(timestamp);
        particlesArray[i].draw();
    }
    
    animationFrameId = requestAnimationFrame(animate);
}

// ========== PERLIN NOISE ==========
const noise = (function() {
    function Grad(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    Grad.prototype.dot3 = function(x, y, z) {
        return this.x * x + this.y * y + this.z * z;
    };
    
    var grad3 = [
        new Grad(1, 1, 0), new Grad(-1, 1, 0), new Grad(1, -1, 0), new Grad(-1, -1, 0),
        new Grad(1, 0, 1), new Grad(-1, 0, 1), new Grad(1, 0, -1), new Grad(-1, 0, -1),
        new Grad(0, 1, 1), new Grad(0, -1, 1), new Grad(0, 1, -1), new Grad(0, -1, -1)
    ];
    
    var p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10,
        23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87,
        174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211,
        133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208,
        89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5,
        202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119,
        248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232,
        178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249,
        14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205,
        93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];
    
    var perm = new Array(512);
    var gradP = new Array(512);
    
    function seed(seed) {
        if (seed > 0 && seed < 1) {
            Math.random = function() { return seed; };
        }
        var i;
        var p_temp = [];
        for (i = 0; i < 256; i++) {
            p_temp[i] = Math.floor(Math.random() * 256);
        }
        for (i = 0; i < 512; i++) {
            perm[i] = p_temp[i & 255];
            gradP[i] = grad3[perm[i] % 12];
        }
    }
    
    seed(Math.random());
    
    function fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    function lerp(a, b, t) {
        return (1 - t) * a + t * b;
    }
    
    return {
        perlin3: function(x, y, z) {
            var X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
            x = x - X;
            y = y - Y;
            z = z - Z;
            X = X & 255;
            Y = Y & 255;
            Z = Z & 255;
            var n000 = gradP[X + perm[Y + perm[Z]]].dot3(x, y, z);
            var n001 = gradP[X + perm[Y + perm[Z + 1]]].dot3(x, y, z - 1);
            var n010 = gradP[X + perm[Y + 1 + perm[Z]]].dot3(x, y - 1, z);
            var n011 = gradP[X + perm[Y + 1 + perm[Z + 1]]].dot3(x, y - 1, z - 1);
            var n100 = gradP[X + 1 + perm[Y + perm[Z]]].dot3(x - 1, y, z);
            var n101 = gradP[X + 1 + perm[Y + perm[Z + 1]]].dot3(x - 1, y, z - 1);
            var n110 = gradP[X + 1 + perm[Y + 1 + perm[Z]]].dot3(x - 1, y - 1, z);
            var n111 = gradP[X + 1 + perm[Y + 1 + perm[Z + 1]]].dot3(x - 1, y - 1, z - 1);
            var u = fade(x);
            var v = fade(y);
            var w = fade(z);
            return lerp(lerp(lerp(n000, n100, u), lerp(n001, n101, u), w),
                lerp(lerp(n010, n110, u), lerp(n011, n111, u), w), v);
        }
    };
})();

// ========== CANVAS RESIZE HANDLING ==========
function onCanvasResized(e) {
    if (!particlesArray || particlesArray.length === 0) {
        previousCanvasSize = { width: e.detail.canvas.width, height: e.detail.canvas.height };
        init(() => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animate(0);
        });
        return;
    }
    
    const oldWidth = previousCanvasSize.width;
    const oldHeight = previousCanvasSize.height;
    const newWidth = e.detail.canvas.width;
    const newHeight = e.detail.canvas.height;
    
    if (oldWidth === 0 || oldHeight === 0) {
        previousCanvasSize = { width: newWidth, height: newHeight };
        init(() => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animate(0);
        });
        return;
    }
    
    const scaleX = newWidth / oldWidth;
    const scaleY = newHeight / oldHeight;
    
    // Scale all particles
    particlesArray.forEach(particle => {
        particle.x *= scaleX;
        particle.y *= scaleY;
        particle.originX *= scaleX;
        particle.originY *= scaleY;
    });
    
    previousCanvasSize = { width: newWidth, height: newHeight };
    
    // Re-initialize to regenerate particles for new text layout
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    init(() => {
        animate(0);
    });
}

// Listen for canvas resize events
document.addEventListener('chatooly:canvas-resized', onCanvasResized);

// ========== MOUSE COORDINATE MAPPING ==========
function updateMousePosition(e) {
    // Use Chatooly's mouse mapping utility if available
    if (window.Chatooly && window.Chatooly.utils && window.Chatooly.utils.mapMouseToCanvas) {
        const coords = window.Chatooly.utils.mapMouseToCanvas(e, canvas);
        mouse.x = coords.x;
        mouse.y = coords.y;
    } else {
        // Fallback mapping
        const rect = canvas.getBoundingClientRect();
        const displayX = e.clientX - rect.left;
        const displayY = e.clientY - rect.top;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        mouse.x = displayX * scaleX;
        mouse.y = displayY * scaleY;
    }
    
    // Update cursor dot position (screen coordinates)
    if (cursorDot) {
        cursorDot.style.left = `${e.clientX}px`;
        cursorDot.style.top = `${e.clientY}px`;
    }
}

canvas.addEventListener('mousemove', updateMousePosition);
canvas.addEventListener('mouseenter', updateMousePosition);
canvas.addEventListener('mouseleave', () => {
    mouse.x = undefined;
    mouse.y = undefined;
});

// ========== HIGH-RESOLUTION EXPORT ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!particlesArray || particlesArray.length === 0) {
        console.warn('No particles to export');
        return;
    }
    
    const exportCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
    const scaledWidth = canvas.width * scale;
    const scaledHeight = canvas.height * scale;
    
    targetCanvas.width = scaledWidth;
    targetCanvas.height = scaledHeight;
    
    // Draw background first (at scaled size)
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.drawToCanvas(exportCtx, scaledWidth, scaledHeight);
    } else {
        exportCtx.clearRect(0, 0, scaledWidth, scaledHeight);
    }
    
    // Scale context for drawing
    exportCtx.scale(scale, scale);
    
    // Draw particles at current state (using scaled context, so positions are correct)
    particlesArray.forEach(particle => {
        exportCtx.fillStyle = particle.color;
        exportCtx.beginPath();
        // Size is already scaled by context scale, so use original size
        exportCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        exportCtx.fill();
    });
    
    console.log(`High-res export completed at ${scale}x resolution (${scaledWidth}x${scaledHeight})`);
};

// ========== PNG SEQUENCE EXPORT ==========
async function exportPngSequence() {
    const exportStatus = document.getElementById('exportStatus');
    const exportDurationInput = document.getElementById('exportDuration');
    const pngSequenceButton = document.getElementById('pngSequenceButton');
    const textInput = document.getElementById('textInput');
    
    if (!window.JSZip || !window.saveAs) {
        exportStatus.textContent = 'Error: Export libraries not loaded';
        return;
    }
    
    exportStatus.textContent = 'Preparing... 0%';
    pngSequenceButton.disabled = true;
    textInput.disabled = true;
    
    const zip = new JSZip();
    const duration = parseFloat(exportDurationInput.value) || 5;
    const frameRate = 30;
    const totalFrames = duration * frameRate;
    
    // Pause animation
    cancelAnimationFrame(animationFrameId);
    
    // Create temporary canvas for export
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    try {
        for (let i = 0; i < totalFrames; i++) {
            const timestamp = (i / frameRate) * 1000;
            
            // Draw background
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.drawToCanvas(tempCtx, tempCanvas.width, tempCanvas.height);
            } else {
                tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            }
            
            // Update and draw particles
            particlesArray.forEach(p => {
                p.update(timestamp);
                // Draw particle on temp canvas
                tempCtx.fillStyle = p.color;
                tempCtx.beginPath();
                tempCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                tempCtx.fill();
            });
            
            // Convert to blob
            const blob = await new Promise(resolve => tempCanvas.toBlob(resolve, 'image/png'));
            const paddedIndex = String(i).padStart(5, '0');
            zip.file(`frame_${paddedIndex}.png`, blob);
            
            exportStatus.textContent = `Processing... ${Math.round((i / totalFrames) * 100)}%`;
            
            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        exportStatus.textContent = 'Creating ZIP file...';
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, 'animation_sequence.zip');
        
        exportStatus.textContent = 'Export completed!';
        setTimeout(() => {
            exportStatus.textContent = '';
        }, 3000);
    } catch (error) {
        console.error('Export error:', error);
        exportStatus.textContent = 'Export error';
    } finally {
        pngSequenceButton.disabled = false;
        textInput.disabled = false;
        // Re-initialize particles and restart animation
        init(() => {
            animate(0);
        });
    }
}

// Make export function globally available
window.exportPngSequence = exportPngSequence;

// Export animate function for UI
window.animate = animate;

// ========== INITIALIZATION ==========
function main() {
    previousCanvasSize = { width: canvas.width, height: canvas.height };
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    init(() => {
        animate(0);
    });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

// Export settings object for UI to update
window.liquidTypographySettings = settings;

// Export init function for UI to trigger re-initialization
window.init = init;

// Export particlesArray for UI access
Object.defineProperty(window, 'particlesArray', {
    get: () => particlesArray,
    enumerable: true
});
