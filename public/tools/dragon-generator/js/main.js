/*
 * Dragon Generator - Main Logic
 * Author: The Boss
 *
 * Creates complex, animated visual patterns with flowing dragon-like trails
 */

// ========== GLOBAL VARIABLES ==========
let dragons = [];
let leaderImage = null;
let bodyImage = null;
let leaderVideo = null;
let bodyVideo = null;
let canvasElement;

// Configuration object to store all parameters
const config = {
    // Element settings
    elementType: 'text',
    elementText: 'STUDIO VIDEO',
    fontFamily: 'Inter',
    fontWeight: 'normal',
    letterSpacing: 0,
    textStrokeEnabled: false,
    textStrokeColor: '#000000',
    textStrokeWidth: 2,
    shapeType: 'circle',
    
    // Image/Video settings
    animationOffset: 50,  // Time offset between segments in milliseconds
    
    // Dragon settings
    numDragons: 1,
    segmentCount: 30,
    segmentSpacing: 15,
    movementSpeed: 2,
    
    // Style settings
    baseSize: 40,
    gradientEnabled: false,
    color1: '#ff6b6b',
    color2: '#4ecdc4',
    taper: 0.5,
    opacityFade: 0.3,
    shadowEnabled: false,
    shadowColor: '#000000',
    shadowBlur: 10,
    shadowX: 0,
    shadowY: 0,
    
    // Animation settings
    customLeader: false,  // Toggle to make leader different from body
    leaderScale: 1.0,
    leaderRotation: 0,
    scaleNoiseEnabled: false,
    scaleNoiseAmount: 0.3,
    scaleNoiseSpeed: 1,
    scaleNoiseDrift: 0,
    rotationNoiseEnabled: false,
    rotationNoiseAmount: 45,
    rotationNoiseSpeed: 1,
    rotationNoiseDrift: 0,
    alignDirection: true,
    
    // Advanced settings
    frameRate: 60,
    
    // Background settings
    bgColor: '#CCFD50',
    transparentBg: false
};

// ========== DRAGON CLASS ==========
class Dragon {
    constructor(offsetAngle) {
        this.segments = [];
        this.offsetAngle = offsetAngle;
        
        // Initialize segments at center
        for (let i = 0; i < config.segmentCount; i++) {
            this.segments.push({
                x: width / 2,
                y: height / 2,
                angle: 0
            });
        }
        
        // Movement parameters for this dragon
        this.angle = offsetAngle;
        this.radius = min(width, height) * 0.3;
    }
    
    update() {
        // Update leader position (circular motion)
        this.angle += config.movementSpeed * 0.01;
        const targetX = width / 2 + cos(this.angle) * this.radius;
        const targetY = height / 2 + sin(this.angle) * this.radius;
        
        // Calculate leader's angle based on movement direction
        const prevLeaderX = this.segments[0].x;
        const prevLeaderY = this.segments[0].y;
        
        // Update leader segment position
        this.segments[0].x = targetX;
        this.segments[0].y = targetY;
        
        // Calculate and store leader's angle of movement
        const dx = targetX - prevLeaderX;
        const dy = targetY - prevLeaderY;
        if (dx !== 0 || dy !== 0) {
            this.segments[0].angle = atan2(dy, dx);
        }
        
        // Follow-the-leader algorithm
        for (let i = 1; i < this.segments.length; i++) {
            const target = this.segments[i - 1];
            const current = this.segments[i];
            
            // Calculate angle to target
            const dx = target.x - current.x;
            const dy = target.y - current.y;
            const distance = sqrt(dx * dx + dy * dy);
            
            // Store angle for rotation
            current.angle = atan2(dy, dx);
            
            // Move toward target if too far
            if (distance > config.segmentSpacing) {
                const moveX = (dx / distance) * (distance - config.segmentSpacing);
                const moveY = (dy / distance) * (distance - config.segmentSpacing);
                current.x += moveX;
                current.y += moveY;
            }
        }
    }
    
    display() {
        // Draw in reverse order so leader (first segment) is drawn last (on top)
        for (let i = this.segments.length - 1; i >= 0; i--) {
            const segment = this.segments[i];
            const progress = i / this.segments.length;
            
            // Calculate size with taper
            let segmentSize = config.baseSize * (1 - progress * config.taper);
            
            // Calculate opacity with fade
            let segmentOpacity = 255 * (1 - progress * config.opacityFade);
            
            // Apply scale animation
            let segmentScale = 1.0;
            
            // Only apply leader-specific scale if Custom Leader is enabled
            if (i === 0 && config.customLeader) {
                segmentScale = config.leaderScale;
                
                // Add noise animation to scale
                if (config.scaleNoiseEnabled) {
                    const noiseValue = noise(frameCount * config.scaleNoiseSpeed * 0.01);
                    const noiseDelta = (noiseValue - 0.5) * 2 * config.scaleNoiseAmount;
                    const drift = frameCount * config.scaleNoiseDrift;
                    segmentScale += noiseDelta + drift;
                    segmentScale = max(0.1, segmentScale); // Prevent zero or negative scale
                }
            }
            
            segmentSize *= segmentScale;
            
            // Calculate color
            let elementColor;
            if (config.gradientEnabled) {
                elementColor = lerpColor(color(config.color1), color(config.color2), progress);
            } else {
                elementColor = color(config.color1);
            }
            elementColor.setAlpha(segmentOpacity);
            
            // Calculate rotation
            let rotation = 0;
            
            // Add direction alignment if enabled (applies to ALL segments including leader)
            if (config.alignDirection) {
                rotation = segment.angle;
            }
            
            // Only apply ADDITIONAL leader-specific rotation if Custom Leader is enabled
            if (i === 0 && config.customLeader) {
                rotation += radians(config.leaderRotation); // Additional rotation on top of alignment
                
                // Add noise animation to rotation
                if (config.rotationNoiseEnabled) {
                    const noiseValue = noise(frameCount * config.rotationNoiseSpeed * 0.01 + 1000);
                    const noiseDelta = (noiseValue - 0.5) * 2 * radians(config.rotationNoiseAmount);
                    const drift = frameCount * radians(config.rotationNoiseDrift);
                    rotation += noiseDelta + drift;
                }
            }
            
            // Apply shadow
            if (config.shadowEnabled) {
                drawingContext.shadowColor = config.shadowColor;
                drawingContext.shadowBlur = config.shadowBlur;
                drawingContext.shadowOffsetX = config.shadowX;
                drawingContext.shadowOffsetY = config.shadowY;
            } else {
                drawingContext.shadowColor = 'transparent';
                drawingContext.shadowBlur = 0;
                drawingContext.shadowOffsetX = 0;
                drawingContext.shadowOffsetY = 0;
            }
            
            // Draw element
            push();
            translate(segment.x, segment.y);
            rotate(rotation);
            
            const isLeader = i === 0;
            this.drawElement(elementColor, segmentSize, isLeader, i);
            
            pop();
        }
    }
    
    drawElement(elementColor, size, isLeader, segmentIndex = 0) {
        // Choose which image/video to use
        const imgToUse = (isLeader && leaderImage) ? leaderImage : (bodyImage || leaderImage);
        const vidToUse = (isLeader && leaderVideo) ? leaderVideo : (bodyVideo || leaderVideo);
        
        switch (config.elementType) {
            case 'text':
                this.drawText(elementColor, size);
                break;
            case 'shape':
                this.drawShape(elementColor, size);
                break;
            case 'image':
                // Use video if available, otherwise use image
                const mediaToUse = vidToUse || imgToUse;
                if (mediaToUse) {
                    this.drawImage(mediaToUse, size, segmentIndex);
                } else {
                    // Fallback to shape if no image/video
                    this.drawShape(elementColor, size);
                }
                break;
        }
    }
    
    drawText(elementColor, size) {
        textAlign(CENTER, CENTER);
        textSize(size);
        textFont(config.fontFamily);
        
        // Apply font weight
        if (config.fontWeight === 'bold') {
            drawingContext.font = `bold ${size}px "${config.fontFamily}"`;
        }
        
        // Apply text stroke
        if (config.textStrokeEnabled) {
            strokeWeight(config.textStrokeWidth);
            stroke(config.textStrokeColor);
        } else {
            noStroke();
        }
        
        fill(elementColor);
        
        // Apply letter spacing (for multi-character text)
        if (config.elementText.length > 1 && config.letterSpacing !== 0) {
            push();
            const chars = config.elementText.split('');
            const totalWidth = chars.length * (size * 0.6 + config.letterSpacing);
            translate(-totalWidth / 2, 0);
            
            for (let i = 0; i < chars.length; i++) {
                text(chars[i], i * (size * 0.6 + config.letterSpacing), 0);
            }
            pop();
        } else {
            text(config.elementText, 0, 0);
        }
    }
    
    drawShape(elementColor, size) {
        fill(elementColor);
        noStroke();
        
        const halfSize = size / 2;
        
        switch (config.shapeType) {
            case 'circle':
                ellipse(0, 0, size, size);
                break;
                
            case 'ring':
                stroke(elementColor);
                strokeWeight(size * 0.15);
                noFill();
                ellipse(0, 0, size, size);
                break;
                
            case 'star':
                this.drawStar(0, 0, halfSize * 0.4, halfSize, 5);
                break;
                
            case 'square':
                rectMode(CENTER);
                rect(0, 0, size, size);
                break;
                
            case 'pentagon':
                this.drawPolygon(0, 0, halfSize, 5);
                break;
                
            case 'heart':
                this.drawHeart(0, 0, size);
                break;
        }
    }
    
    drawImage(img, size, segmentIndex = 0) {
        imageMode(CENTER);
        
        // Check if it's a video element
        if (img && img.elt && img.elt.tagName === 'VIDEO') {
            // Calculate time offset for this segment
            const timeOffset = segmentIndex * (config.animationOffset / 1000); // Convert ms to seconds
            const videoDuration = img.elt.duration || 1;
            
            // Calculate current playback position with offset
            let currentTime = (millis() / 1000 + timeOffset) % videoDuration;
            
            // For videos, we need to draw from the video element
            // Note: This is approximate since we can't easily seek video in real-time
            push();
            tint(255, 255); // Reset tint
            image(img, 0, 0, size, size);
            pop();
        } else {
            // Regular image or GIF
            tint(255, 255); // Reset tint
            image(img, 0, 0, size, size);
        }
    }
    
    // Helper function to draw star
    drawStar(x, y, radius1, radius2, npoints) {
        let angle = TWO_PI / npoints;
        let halfAngle = angle / 2.0;
        beginShape();
        for (let a = -PI / 2; a < TWO_PI - PI / 2; a += angle) {
            let sx = x + cos(a) * radius2;
            let sy = y + sin(a) * radius2;
            vertex(sx, sy);
            sx = x + cos(a + halfAngle) * radius1;
            sy = y + sin(a + halfAngle) * radius1;
            vertex(sx, sy);
        }
        endShape(CLOSE);
    }
    
    // Helper function to draw polygon
    drawPolygon(x, y, radius, npoints) {
        let angle = TWO_PI / npoints;
        beginShape();
        for (let a = -PI / 2; a < TWO_PI - PI / 2; a += angle) {
            let sx = x + cos(a) * radius;
            let sy = y + sin(a) * radius;
            vertex(sx, sy);
        }
        endShape(CLOSE);
    }
    
    // Helper function to draw heart
    drawHeart(x, y, size) {
        const s = size / 20;
        beginShape();
        vertex(x, y + s * 2);
        bezierVertex(x, y - s * 2, x - s * 10, y - s * 6, x, y - s * 12);
        bezierVertex(x + s * 10, y - s * 6, x, y - s * 2, x, y + s * 2);
        endShape(CLOSE);
    }
}

// ========== P5.JS SETUP ==========
function setup() {
    // Get the canvas element that's already in the HTML
    canvasElement = document.getElementById('chatooly-canvas');
    
    // Create p5 canvas and attach to the chatooly-canvas element
    let canvas = createCanvas(1920, 1080);
    canvas.parent('chatooly-container');
    
    // Remove the old canvas and use our p5 canvas
    if (canvasElement) {
        canvasElement.remove();
    }
    
    // Set our p5 canvas as the new chatooly-canvas
    canvas.elt.id = 'chatooly-canvas';
    canvasElement = canvas.elt;
    
    frameRate(config.frameRate);
    
    // Initialize dragons
    initializeDragons();
    
    // Initialize background manager
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.init(canvasElement);
    }
    
    // Set up all event listeners
    setupEventListeners();
}

// ========== P5.JS DRAW LOOP ==========
function draw() {
    // Draw background using Chatooly background manager
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        // Clear canvas
        clear();
        
        // Let background manager handle background
        const ctx = canvasElement.getContext('2d');
        Chatooly.backgroundManager.drawToCanvas(ctx, width, height);
    } else {
        // Fallback background
        if (config.transparentBg) {
            clear();
        } else {
            background(config.bgColor);
        }
    }
    
    // Update and display all dragons
    for (let dragon of dragons) {
        dragon.update();
        dragon.display();
    }
}

// ========== DRAGON INITIALIZATION ==========
function initializeDragons() {
    dragons = [];
    const angleStep = TWO_PI / config.numDragons;
    
    for (let i = 0; i < config.numDragons; i++) {
        dragons.push(new Dragon(i * angleStep));
    }
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Element Type
    document.getElementById('element-type').addEventListener('change', (e) => {
        config.elementType = e.target.value;
        updateElementControls();
    });
    
    // Text controls
    document.getElementById('element-text').addEventListener('input', (e) => {
        config.elementText = e.target.value || 'STUDIO VIDEO';
    });
    
    document.getElementById('font-family').addEventListener('change', (e) => {
        config.fontFamily = e.target.value;
    });
    
    document.getElementById('font-weight').addEventListener('change', (e) => {
        config.fontWeight = e.target.value;
    });
    
    document.getElementById('letter-spacing').addEventListener('input', (e) => {
        config.letterSpacing = parseFloat(e.target.value);
        document.getElementById('letter-spacing-value').textContent = e.target.value;
    });
    
    document.getElementById('text-stroke-enabled').addEventListener('change', (e) => {
        config.textStrokeEnabled = e.target.checked;
        document.getElementById('text-stroke-controls').style.display = e.target.checked ? 'block' : 'none';
    });
    
    document.getElementById('text-stroke-color').addEventListener('input', (e) => {
        config.textStrokeColor = e.target.value;
    });
    
    document.getElementById('text-stroke-width').addEventListener('input', (e) => {
        config.textStrokeWidth = parseFloat(e.target.value);
        document.getElementById('text-stroke-width-value').textContent = e.target.value;
    });
    
    // Shape controls
    document.getElementById('shape-type').addEventListener('change', (e) => {
        config.shapeType = e.target.value;
    });
    
    // Image controls
    document.getElementById('leader-image').addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const fileType = file.type;
            
            // Check if it's a video
            if (fileType.startsWith('video/')) {
                // Create video element
                const videoElement = document.createElement('video');
                videoElement.src = URL.createObjectURL(file);
                videoElement.loop = true;
                videoElement.muted = true;
                videoElement.play();
                
                // Wait for video to load, then create p5 video
                videoElement.addEventListener('loadeddata', () => {
                    leaderVideo = createVideo(videoElement.src);
                    leaderVideo.hide(); // Hide the HTML element
                    leaderVideo.loop();
                    leaderVideo.volume(0);
                    leaderImage = null; // Clear image if video is loaded
                });
            } else {
                // Regular image or GIF
                loadImage(URL.createObjectURL(file), (img) => {
                    leaderImage = img;
                    leaderVideo = null; // Clear video if image is loaded
                });
            }
        }
    });
    
    document.getElementById('body-image').addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const fileType = file.type;
            
            // Check if it's a video
            if (fileType.startsWith('video/')) {
                // Create video element
                const videoElement = document.createElement('video');
                videoElement.src = URL.createObjectURL(file);
                videoElement.loop = true;
                videoElement.muted = true;
                videoElement.play();
                
                // Wait for video to load, then create p5 video
                videoElement.addEventListener('loadeddata', () => {
                    bodyVideo = createVideo(videoElement.src);
                    bodyVideo.hide(); // Hide the HTML element
                    bodyVideo.loop();
                    bodyVideo.volume(0);
                    bodyImage = null; // Clear image if video is loaded
                });
            } else {
                // Regular image or GIF
                loadImage(URL.createObjectURL(file), (img) => {
                    bodyImage = img;
                    bodyVideo = null; // Clear video if image is loaded
                });
            }
        }
    });
    
    document.getElementById('animation-offset').addEventListener('input', (e) => {
        config.animationOffset = parseFloat(e.target.value);
        document.getElementById('animation-offset-value').textContent = e.target.value;
    });
    
    // Dragons controls
    document.getElementById('num-dragons').addEventListener('input', (e) => {
        config.numDragons = parseInt(e.target.value);
        document.getElementById('num-dragons-value').textContent = e.target.value;
        initializeDragons();
    });
    
    document.getElementById('segment-count').addEventListener('input', (e) => {
        config.segmentCount = parseInt(e.target.value);
        document.getElementById('segment-count-value').textContent = e.target.value;
        initializeDragons();
    });
    
    document.getElementById('segment-spacing').addEventListener('input', (e) => {
        config.segmentSpacing = parseFloat(e.target.value);
        document.getElementById('segment-spacing-value').textContent = e.target.value;
    });
    
    document.getElementById('movement-speed').addEventListener('input', (e) => {
        config.movementSpeed = parseFloat(e.target.value);
        document.getElementById('movement-speed-value').textContent = e.target.value;
    });
    
    // Style controls
    document.getElementById('base-size').addEventListener('input', (e) => {
        config.baseSize = parseFloat(e.target.value);
        document.getElementById('base-size-value').textContent = e.target.value;
    });
    
    document.getElementById('gradient-enabled').addEventListener('change', (e) => {
        config.gradientEnabled = e.target.checked;
        document.getElementById('gradient-controls').style.display = e.target.checked ? 'block' : 'none';
    });
    
    document.getElementById('color-1').addEventListener('input', (e) => {
        config.color1 = e.target.value;
    });
    
    document.getElementById('color-2').addEventListener('input', (e) => {
        config.color2 = e.target.value;
    });
    
    document.getElementById('taper').addEventListener('input', (e) => {
        config.taper = parseFloat(e.target.value);
        document.getElementById('taper-value').textContent = e.target.value;
    });
    
    document.getElementById('opacity-fade').addEventListener('input', (e) => {
        config.opacityFade = parseFloat(e.target.value);
        document.getElementById('opacity-fade-value').textContent = e.target.value;
    });
    
    document.getElementById('shadow-enabled').addEventListener('change', (e) => {
        config.shadowEnabled = e.target.checked;
        document.getElementById('shadow-controls').style.display = e.target.checked ? 'block' : 'none';
    });
    
    document.getElementById('shadow-color').addEventListener('input', (e) => {
        config.shadowColor = e.target.value;
    });
    
    document.getElementById('shadow-blur').addEventListener('input', (e) => {
        config.shadowBlur = parseFloat(e.target.value);
        document.getElementById('shadow-blur-value').textContent = e.target.value;
    });
    
    document.getElementById('shadow-x').addEventListener('input', (e) => {
        config.shadowX = parseFloat(e.target.value);
        document.getElementById('shadow-x-value').textContent = e.target.value;
    });
    
    document.getElementById('shadow-y').addEventListener('input', (e) => {
        config.shadowY = parseFloat(e.target.value);
        document.getElementById('shadow-y-value').textContent = e.target.value;
    });
    
    // Animation controls
    document.getElementById('custom-leader').addEventListener('change', (e) => {
        config.customLeader = e.target.checked;
        document.getElementById('leader-controls').style.display = e.target.checked ? 'block' : 'none';
    });
    
    document.getElementById('leader-scale').addEventListener('input', (e) => {
        config.leaderScale = parseFloat(e.target.value);
        document.getElementById('leader-scale-value').textContent = e.target.value;
    });
    
    document.getElementById('leader-rotation').addEventListener('input', (e) => {
        config.leaderRotation = parseFloat(e.target.value);
        document.getElementById('leader-rotation-value').textContent = e.target.value;
    });
    
    document.getElementById('scale-noise-enabled').addEventListener('change', (e) => {
        config.scaleNoiseEnabled = e.target.checked;
        document.getElementById('scale-noise-controls').style.display = e.target.checked ? 'block' : 'none';
    });
    
    document.getElementById('scale-noise-amount').addEventListener('input', (e) => {
        config.scaleNoiseAmount = parseFloat(e.target.value);
        document.getElementById('scale-noise-amount-value').textContent = e.target.value;
    });
    
    document.getElementById('scale-noise-speed').addEventListener('input', (e) => {
        config.scaleNoiseSpeed = parseFloat(e.target.value);
        document.getElementById('scale-noise-speed-value').textContent = e.target.value;
    });
    
    document.getElementById('scale-noise-drift').addEventListener('input', (e) => {
        config.scaleNoiseDrift = parseFloat(e.target.value);
        document.getElementById('scale-noise-drift-value').textContent = e.target.value;
    });
    
    document.getElementById('rotation-noise-enabled').addEventListener('change', (e) => {
        config.rotationNoiseEnabled = e.target.checked;
        document.getElementById('rotation-noise-controls').style.display = e.target.checked ? 'block' : 'none';
    });
    
    document.getElementById('rotation-noise-amount').addEventListener('input', (e) => {
        config.rotationNoiseAmount = parseFloat(e.target.value);
        document.getElementById('rotation-noise-amount-value').textContent = e.target.value;
    });
    
    document.getElementById('rotation-noise-speed').addEventListener('input', (e) => {
        config.rotationNoiseSpeed = parseFloat(e.target.value);
        document.getElementById('rotation-noise-speed-value').textContent = e.target.value;
    });
    
    document.getElementById('rotation-noise-drift').addEventListener('input', (e) => {
        config.rotationNoiseDrift = parseFloat(e.target.value);
        document.getElementById('rotation-noise-drift-value').textContent = e.target.value;
    });
    
    document.getElementById('align-direction').addEventListener('change', (e) => {
        config.alignDirection = e.target.checked;
    });
    
    // Advanced controls
    document.getElementById('frame-rate').addEventListener('input', (e) => {
        config.frameRate = parseInt(e.target.value);
        document.getElementById('frame-rate-value').textContent = e.target.value;
        frameRate(config.frameRate);
    });
    
    // Background controls
    document.getElementById('transparent-bg').addEventListener('change', (e) => {
        config.transparentBg = e.target.checked;
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            Chatooly.backgroundManager.setTransparent(e.target.checked);
        }
        document.getElementById('bg-color-group').style.display = e.target.checked ? 'none' : 'block';
    });
    
    document.getElementById('bg-color').addEventListener('input', (e) => {
        config.bgColor = e.target.value;
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            Chatooly.backgroundManager.setBackgroundColor(e.target.value);
        }
    });
    
    document.getElementById('bg-image').addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                await Chatooly.backgroundManager.setBackgroundImage(e.target.files[0]);
            }
            document.getElementById('clear-bg-image').style.display = 'block';
            document.getElementById('bg-fit-group').style.display = 'block';
        }
    });
    
    document.getElementById('clear-bg-image').addEventListener('click', () => {
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            Chatooly.backgroundManager.clearBackgroundImage();
        }
        document.getElementById('clear-bg-image').style.display = 'none';
        document.getElementById('bg-fit-group').style.display = 'none';
        document.getElementById('bg-image').value = '';
    });
    
    document.getElementById('bg-fit').addEventListener('change', (e) => {
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            Chatooly.backgroundManager.setFit(e.target.value);
        }
    });
}

// Helper function to show/hide element controls
function updateElementControls() {
    document.getElementById('text-controls').style.display = 
        config.elementType === 'text' ? 'block' : 'none';
    document.getElementById('shape-controls').style.display = 
        config.elementType === 'shape' ? 'block' : 'none';
    document.getElementById('image-controls').style.display = 
        config.elementType === 'image' ? 'block' : 'none';
}

// ========== HIGH-RESOLUTION EXPORT ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!canvasElement) {
        console.warn('Canvas not initialized for high-res export');
        return;
    }
    
    const ctx = targetCanvas.getContext('2d');
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    
    targetCanvas.width = scaledWidth;
    targetCanvas.height = scaledHeight;
    
    // Create a temporary p5 graphics buffer at high resolution
    const pg = createGraphics(scaledWidth, scaledHeight);
    pg.pixelDensity(1);
    
    // Draw background
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        pg.clear();
        const tempCtx = pg.elt.getContext('2d');
        Chatooly.backgroundManager.drawToCanvas(tempCtx, scaledWidth, scaledHeight);
    } else {
        if (config.transparentBg) {
            pg.clear();
        } else {
            pg.background(config.bgColor);
        }
    }
    
    // Scale up all dragon rendering
    pg.push();
    pg.scale(scale);
    
    // Render each dragon at current state
    for (let dragon of dragons) {
        for (let i = 0; i < dragon.segments.length; i++) {
            const segment = dragon.segments[i];
            const progress = i / dragon.segments.length;
            
            // Calculate size with taper
            let segmentSize = config.baseSize * (1 - progress * config.taper);
            
            // Calculate opacity with fade
            let segmentOpacity = 255 * (1 - progress * config.opacityFade);
            
            // Apply scale animation
            let segmentScale = 1.0;
            
            // Only apply leader-specific scale if Custom Leader is enabled
            if (i === 0 && config.customLeader) {
                segmentScale = config.leaderScale;
                if (config.scaleNoiseEnabled) {
                    const noiseValue = noise(frameCount * config.scaleNoiseSpeed * 0.01);
                    const noiseDelta = (noiseValue - 0.5) * 2 * config.scaleNoiseAmount;
                    const drift = frameCount * config.scaleNoiseDrift;
                    segmentScale += noiseDelta + drift;
                    segmentScale = max(0.1, segmentScale);
                }
            }
            
            segmentSize *= segmentScale;
            
            // Calculate color
            let elementColor;
            if (config.gradientEnabled) {
                elementColor = pg.lerpColor(pg.color(config.color1), pg.color(config.color2), progress);
            } else {
                elementColor = pg.color(config.color1);
            }
            elementColor.setAlpha(segmentOpacity);
            
            // Calculate rotation
            let rotation = 0;
            
            // Add direction alignment if enabled (applies to ALL segments including leader)
            if (config.alignDirection) {
                rotation = segment.angle;
            }
            
            // Only apply ADDITIONAL leader-specific rotation if Custom Leader is enabled
            if (i === 0 && config.customLeader) {
                rotation += radians(config.leaderRotation); // Additional rotation on top of alignment
                
                // Add noise animation to rotation
                if (config.rotationNoiseEnabled) {
                    const noiseValue = noise(frameCount * config.rotationNoiseSpeed * 0.01 + 1000);
                    const noiseDelta = (noiseValue - 0.5) * 2 * radians(config.rotationNoiseAmount);
                    const drift = frameCount * radians(config.rotationNoiseDrift);
                    rotation += noiseDelta + drift;
                }
            }
            
            // Apply shadow
            if (config.shadowEnabled) {
                pg.drawingContext.shadowColor = config.shadowColor;
                pg.drawingContext.shadowBlur = config.shadowBlur * scale;
                pg.drawingContext.shadowOffsetX = config.shadowX * scale;
                pg.drawingContext.shadowOffsetY = config.shadowY * scale;
            } else {
                pg.drawingContext.shadowColor = 'transparent';
                pg.drawingContext.shadowBlur = 0;
                pg.drawingContext.shadowOffsetX = 0;
                pg.drawingContext.shadowOffsetY = 0;
            }
            
            // Draw element
            pg.push();
            pg.translate(segment.x, segment.y);
            pg.rotate(rotation);
            
            const isLeader = i === 0;
            drawElementToGraphics(pg, elementColor, segmentSize, isLeader, i);
            
            pg.pop();
        }
    }
    
    pg.pop();
    
    // Copy the high-res buffer to target canvas
    ctx.drawImage(pg.elt, 0, 0);
    
    console.log(`High-res export completed at ${scale}x resolution`);
};

// Helper function to draw elements to a graphics buffer
function drawElementToGraphics(pg, elementColor, size, isLeader, segmentIndex = 0) {
    const imgToUse = (isLeader && leaderImage) ? leaderImage : (bodyImage || leaderImage);
    const vidToUse = (isLeader && leaderVideo) ? leaderVideo : (bodyVideo || leaderVideo);
    const mediaToUse = vidToUse || imgToUse;
    
    switch (config.elementType) {
        case 'text':
            pg.textAlign(CENTER, CENTER);
            pg.textSize(size);
            pg.textFont(config.fontFamily);
            
            if (config.fontWeight === 'bold') {
                pg.drawingContext.font = `bold ${size}px "${config.fontFamily}"`;
            }
            
            if (config.textStrokeEnabled) {
                pg.strokeWeight(config.textStrokeWidth);
                pg.stroke(config.textStrokeColor);
            } else {
                pg.noStroke();
            }
            
            pg.fill(elementColor);
            pg.text(config.elementText, 0, 0);
            break;
            
        case 'shape':
            pg.fill(elementColor);
            pg.noStroke();
            
            const halfSize = size / 2;
            
            switch (config.shapeType) {
                case 'circle':
                    pg.ellipse(0, 0, size, size);
                    break;
                case 'ring':
                    pg.stroke(elementColor);
                    pg.strokeWeight(size * 0.15);
                    pg.noFill();
                    pg.ellipse(0, 0, size, size);
                    break;
                case 'star':
                    drawStarToGraphics(pg, 0, 0, halfSize * 0.4, halfSize, 5);
                    break;
                case 'square':
                    pg.rectMode(CENTER);
                    pg.rect(0, 0, size, size);
                    break;
                case 'pentagon':
                    drawPolygonToGraphics(pg, 0, 0, halfSize, 5);
                    break;
                case 'heart':
                    drawHeartToGraphics(pg, 0, 0, size);
                    break;
            }
            break;
            
        case 'image':
            if (mediaToUse) {
                pg.imageMode(CENTER);
                pg.tint(255, 255);
                pg.image(mediaToUse, 0, 0, size, size);
            } else {
                pg.fill(elementColor);
                pg.noStroke();
                pg.ellipse(0, 0, size, size);
            }
            break;
    }
}

function drawStarToGraphics(pg, x, y, radius1, radius2, npoints) {
    let angle = TWO_PI / npoints;
    let halfAngle = angle / 2.0;
    pg.beginShape();
    for (let a = -PI / 2; a < TWO_PI - PI / 2; a += angle) {
        let sx = x + cos(a) * radius2;
        let sy = y + sin(a) * radius2;
        pg.vertex(sx, sy);
        sx = x + cos(a + halfAngle) * radius1;
        sy = y + sin(a + halfAngle) * radius1;
        pg.vertex(sx, sy);
    }
    pg.endShape(CLOSE);
}

function drawPolygonToGraphics(pg, x, y, radius, npoints) {
    let angle = TWO_PI / npoints;
    pg.beginShape();
    for (let a = -PI / 2; a < TWO_PI - PI / 2; a += angle) {
        let sx = x + cos(a) * radius;
        let sy = y + sin(a) * radius;
        pg.vertex(sx, sy);
    }
    pg.endShape(CLOSE);
}

function drawHeartToGraphics(pg, x, y, size) {
    const s = size / 20;
    pg.beginShape();
    pg.vertex(x, y + s * 2);
    pg.bezierVertex(x, y - s * 2, x - s * 10, y - s * 6, x, y - s * 12);
    pg.bezierVertex(x + s * 10, y - s * 6, x, y - s * 2, x, y + s * 2);
    pg.endShape(CLOSE);
}
