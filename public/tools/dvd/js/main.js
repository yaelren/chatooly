/*
 * DVD Animation Tool - Main Logic
 * Ported to Chatooly
 */

const canvas = document.getElementById('chatooly-canvas');
const ctx = canvas.getContext('2d');

// --- State ---
const state = {
    // Canvas dimensions are now controlled by the element size, but we track logic dimensions
    width: 800, height: 600,
    
    // Background state
    bgMode: 'color', // 'color' or 'image'
    bgAnimationOnHit: false, // Unified toggle
    lastBgSwitchTime: 0,
    
    contentType: 'text', 
    text: 'DVD\nScreensaver', 
    font: 'Arial', 
    fontSize: 60, 
    textColor: '#00ffff', 
    textAlign: 'left',
    changeColorOnHit: true,
    
    letterSpacing: 0, 
    lineHeight: 1.2,
    
    highlight: false, 
    highlightColor: '#ff00ff', 
    highlightPadding: 10,
    
    img: null, 
    imgHeight: 100,
    
    speed: 4, 
    running: true,
    
    fps: 60,
    
    explosions: true, 
    deterioration: false, 
    detSeverity: 'subtle', 
    
    enableSplitting: false, 
    splitGenerations: 3, 
    splitChildren: 2,
    splitScale: 0.6,

    trails: false, 
    trailAlpha: 0.2, 
    glow: false,
    
    textColorPalette: [], // Array of colors
    bgColorPalette: [],   // Array of colors
    
    // New Features
    bgPool: [], // Stores Image objects for background cycling
    fgImage: null, // Stores Foreground Image object
    bgFit: 'cover', // 'cover', 'contain', 'fill'
};

let elements = [];
let particles = [];
let animId;
let lastTime = 0;

// Initialize Chatooly Background Manager
if (window.Chatooly && window.Chatooly.backgroundManager) {
    Chatooly.backgroundManager.init(canvas);
    // Set initial dark background
    Chatooly.backgroundManager.setBackgroundColor('#000000');
}

// --- Helper Functions ---
function getRandomColor() { return `hsl(${Math.random()*360}, 100%, 50%)`; }
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false });
}

function drawImageWithFit(ctx, img, cw, ch, fit) {
    let iw, ih;
    if (img.tagName === 'VIDEO') {
        iw = img.videoWidth; ih = img.videoHeight;
    } else {
        iw = img.width; ih = img.height;
    }
    
    // Safety check
    if (!iw || !ih) return;

    if (fit === 'fill') {
        ctx.drawImage(img, 0, 0, cw, ch);
    } else if (fit === 'contain') {
        const scale = Math.min(cw / iw, ch / ih);
        const nw = iw * scale;
        const nh = ih * scale;
        const nx = (cw - nw) / 2;
        const ny = (ch - nh) / 2;
        ctx.drawImage(img, nx, ny, nw, nh);
    } else { // cover (default)
        const scale = Math.max(cw / iw, ch / ih);
        const nw = iw * scale;
        const nh = ih * scale;
        const nx = (cw - nw) / 2;
        const ny = (ch - nh) / 2;
        ctx.drawImage(img, nx, ny, nw, nh);
    }
}

function getRandomColorFromPalette(palette) {
    if (!palette || palette.length === 0) return getRandomColor();
    return palette[Math.floor(Math.random() * palette.length)];
}

// --- Classes ---
class DVD {
    constructor(depth = 0, scale = 1.0) {
        this.depth = depth; 
        this.scale = scale; 
        this.isDead = false; 

        // Use canvas logical size for initial position
        this.x = state.width / 2; 
        this.y = state.height / 2;
        
        this.dx = (Math.random() > 0.5 ? 1 : -1) * state.speed;
        this.dy = (Math.random() > 0.5 ? 1 : -1) * state.speed;
        this.w = 100; 
        this.h = 60;
        this.color = state.textColor;
        
        this.displayedTime = state.contentType === 'clock' ? getCurrentTime() : '';
        this.ascent = 0;
        
        this.rotation = 0;
        this.damage = 0;
        this.chaosLevel = 0; 
        this.chars = []; 
        
        this.glitchFonts = ['Courier New', 'Times New Roman', 'Impact', 'Verdana', 'Georgia', 'Comic Sans MS'];

        this.measure();
        this.initChars();
    }
    
    measure() {
        if (state.contentType === 'text' || state.contentType === 'clock') {
            const scaledFontSize = state.fontSize * this.scale;
            ctx.font = `bold ${scaledFontSize}px ${state.font}`;
            ctx.textBaseline = 'alphabetic';
            
            if (ctx.letterSpacing !== undefined) {
                try {
                   ctx.letterSpacing = (state.letterSpacing * this.scale) + "px";
                } catch(e) {}
            }
            
            const content = state.contentType === 'clock' ? this.displayedTime : state.text;
            const lines = content.split('\n');
            const lh = scaledFontSize * state.lineHeight;
            let maxW = 0;
            
            lines.forEach(l => {
                const m = ctx.measureText(l);
                let w = m.width;
                if (m.actualBoundingBoxRight !== undefined && m.actualBoundingBoxLeft !== undefined) {
                    w = Math.abs(m.actualBoundingBoxLeft) + Math.abs(m.actualBoundingBoxRight);
                }
                if (w > maxW) maxW = w;
            });
            
            const firstM = ctx.measureText(lines[0]);
            const lastM = ctx.measureText(lines[lines.length - 1]);
            const topAscent = firstM.actualBoundingBoxAscent !== undefined ? firstM.actualBoundingBoxAscent : scaledFontSize;
            const bottomDescent = lastM.actualBoundingBoxDescent !== undefined ? lastM.actualBoundingBoxDescent : scaledFontSize * 0.2;
            
            this.ascent = topAscent; 
            
            const contentHeight = topAscent + ((lines.length - 1) * lh) + bottomDescent;

            const padding = (state.highlight ? state.highlightPadding * 2 : 0) * this.scale;
            this.w = Math.ceil(maxW + padding);
            this.h = Math.ceil(contentHeight + padding);
            
        } else if (state.contentType === 'image' && state.img) {
            const isVideo = state.img.tagName === 'VIDEO';
            const width = isVideo ? state.img.videoWidth : state.img.width;
            const height = isVideo ? state.img.videoHeight : state.img.height;
            const r = width / height;
            
            this.h = state.imgHeight * this.scale;
            this.w = this.h * r;
        } else {
            this.w = 100 * this.scale; this.h = 60 * this.scale;
        }
    }

    initChars() {
        if(state.contentType !== 'text' && state.contentType !== 'clock') return;
        this.chars = [];
        
        const scaledFontSize = state.fontSize * this.scale;
        ctx.font = `bold ${scaledFontSize}px ${state.font}`;
        if (ctx.letterSpacing !== undefined) {
             try { ctx.letterSpacing = (state.letterSpacing * this.scale) + "px"; } catch(e){}
        }

        const content = state.contentType === 'clock' ? this.displayedTime : state.text;
        const lines = content.split('\n');
        const lh = scaledFontSize * state.lineHeight;
        const pad = (state.highlight ? state.highlightPadding : 0) * this.scale;

        lines.forEach((line, lineIdx) => {
            const lineWidth = ctx.measureText(line).width;
            const availableW = this.w - pad*2;
            
            let startX = pad;
            if (state.textAlign === 'center') startX += (availableW - lineWidth)/2;
            else if (state.textAlign === 'right') startX += (availableW - lineWidth);

            const lineY = pad + this.ascent + (lineIdx * lh);
            
            for(let i=0; i<line.length; i++) {
                const char = line[i];
                const prevWidth = ctx.measureText(line.substring(0, i)).width;
                const charX = startX + prevWidth;
                
                this.chars.push({
                    char: char,
                    originX: charX,
                    originY: lineY,
                    x: charX, 
                    y: lineY,
                    r: 0, 
                    font: state.font, 
                    damage: 0 
                });
            }
        });
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;

        let cx = this.x + this.w / 2;
        let cy = this.y + this.h / 2;

        let currentW = this.w;
        let currentH = this.h;
        
        if (state.deterioration && state.detSeverity === 'severe') {
            const compressionFactor = Math.min(this.chaosLevel * 0.1, 0.95);
            currentW = this.w * (1 - compressionFactor);
            currentH = this.h * (1 - compressionFactor);
        }

        const angle = this.rotation;
        const absCos = Math.abs(Math.cos(angle));
        const absSin = Math.abs(Math.sin(angle));
        
        const boundW = currentW * absCos + currentH * absSin;
        const boundH = currentW * absSin + currentH * absCos;
        
        const halfBW = boundW / 2;
        const halfBH = boundH / 2;

        let hit = false;
        let hitX=0, hitY=0;

        if (cx + halfBW >= state.width) {
            this.dx = -Math.abs(this.dx);
            cx = state.width - halfBW; 
            hit = true; hitX = state.width; hitY = cy;
        } else if (cx - halfBW <= 0) {
            this.dx = Math.abs(this.dx);
            cx = halfBW; 
            hit = true; hitX = 0; hitY = cy;
        }

        if (cy + halfBH >= state.height) {
            this.dy = -Math.abs(this.dy);
            cy = state.height - halfBH; 
            hit = true; hitX = cx; hitY = state.height;
        } else if (cy - halfBH <= 0) {
            this.dy = Math.abs(this.dy);
            cy = halfBH; 
            hit = true; hitX = cx; hitY = 0;
        }

        this.x = cx - this.w / 2;
        this.y = cy - this.h / 2;

        if (hit) this.onHit(hitX, hitY);
    }

    onHit(hx, hy) {
        if (state.contentType === 'clock') {
            this.displayedTime = getCurrentTime();
            this.measure();
            this.initChars();
        }

        if ((state.contentType === 'text' || state.contentType === 'clock') && state.changeColorOnHit) {
            this.color = getRandomColorFromPalette(state.textColorPalette);
        }
        
        // Background Change Logic
        if (state.bgAnimationOnHit) {
            const now = Date.now();
            if (now - state.lastBgSwitchTime > 500) { // 500ms debounce
                
                if (state.bgMode === 'image' && state.bgPool && state.bgPool.length > 1) {
                    // Switch Image
                    let nextIndex = Math.floor(Math.random() * state.bgPool.length);
                    // Ensure unique
                    if (state.bgPool[nextIndex] === state.currentBgFromPool) {
                        nextIndex = (nextIndex + 1) % state.bgPool.length;
                    }
                    state.currentBgFromPool = state.bgPool[nextIndex];
                    state.lastBgSwitchTime = now;
                    
                } else if (state.bgMode === 'color') {
                    // Switch Color
                    const newColor = getRandomColorFromPalette(state.bgColorPalette);
                    if (window.Chatooly && Chatooly.backgroundManager) {
                        Chatooly.backgroundManager.setBackgroundColor(newColor);
                    }
                    state.lastBgSwitchTime = now;
                }
            }
        }

        if (state.explosions) {
            for(let i=0; i<15; i++) {
                particles.push({
                    x: hx, y: hy,
                    vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
                    life: 1.0, color: this.color
                });
            }
        }

        if (state.deterioration) {
            this.damage++;
            if (state.detSeverity === 'severe') {
                this.chaosLevel += 0.05; 
                this.rotation += (Math.random()-0.5) * 0.3; 
                this.chars.forEach(c => {
                    if(Math.random() < 0.1) c.font = this.glitchFonts[Math.floor(Math.random() * this.glitchFonts.length)];
                    c.r += (Math.random() - 0.5) * 0.5; 
                });
            } else {
                this.rotation += (Math.random()-0.5) * 0.2;
            }
        }

        if (state.enableSplitting && this.depth < state.splitGenerations) {
            this.isDead = true; 

            for(let i = 0; i < state.splitChildren; i++) {
                const child = new DVD(this.depth + 1, this.scale * state.splitScale);
                
                child.x = this.x;
                child.y = this.y;
                
                child.color = getRandomColor();
                child.rotation = this.rotation;
                child.chaosLevel = this.chaosLevel;
                
                if (state.contentType === 'clock') {
                    child.displayedTime = this.displayedTime;
                    child.measure(); 
                    child.initChars();
                }

                const spread = 2; 
                child.dx = this.dx + (Math.random() - 0.5) * spread * 2;
                child.dy = this.dy + (Math.random() - 0.5) * spread * 2;
                
                if (Math.abs(child.dx) < 1) child.dx = (Math.random() > 0.5 ? 1 : -1) * state.speed;
                if (Math.abs(child.dy) < 1) child.dy = (Math.random() > 0.5 ? 1 : -1) * state.speed;

                if (state.deterioration && state.detSeverity === 'severe') {
                    if(state.contentType !== 'clock') {
                         child.chars = JSON.parse(JSON.stringify(this.chars));
                    } else {
                        child.chars.forEach(c => {
                            if(Math.random() < 0.1) c.font = this.glitchFonts[Math.floor(Math.random() * this.glitchFonts.length)];
                            c.r += (Math.random() - 0.5) * 0.5; 
                        });
                    }
                }
                
                elements.push(child);
            }
        }
    }

    draw(context = ctx, width = state.width, height = state.height) {
        context.save();
        const cx = this.x + this.w/2;
        const cy = this.y + this.h/2;
        context.translate(cx, cy);
        context.rotate(this.rotation);
        context.translate(-cx, -cy);

        if (state.contentType === 'text' || state.contentType === 'clock') {
            if (state.glow) { context.shadowBlur = 20; context.shadowColor = this.color; }
            
            if (state.highlight) {
                context.fillStyle = state.highlightColor;
                
                if(state.deterioration && state.detSeverity === 'severe') {
                    const paddingVal = (state.highlightPadding * 2) * this.scale;
                    const rawW = this.w - paddingVal;
                    const rawH = this.h - paddingVal;
                    
                    const compressionFactor = Math.min(this.chaosLevel * 0.1, 0.95);
                    
                    const visualW = rawW * (1 - compressionFactor);
                    const visualH = rawH * (1 - compressionFactor);
                    
                    const finalW = visualW + paddingVal;
                    const finalH = visualH + paddingVal;
                    
                    const vX = this.x + (this.w - finalW)/2;
                    const vY = this.y + (this.h - finalH)/2;
                    
                    context.fillRect(vX, vY, finalW, finalH);
                } else {
                    context.fillRect(this.x, this.y, this.w, this.h);
                }
            }

            context.fillStyle = this.color;
            context.textBaseline = 'alphabetic'; 
            
            if (context.letterSpacing !== undefined) {
                try { context.letterSpacing = (state.letterSpacing * this.scale) + "px"; } catch(e){}
            }

            if (state.deterioration && state.detSeverity === 'severe') {
                const centerX = this.w / 2;
                const centerY = this.h / 2;
                const compressionFactor = Math.min(this.chaosLevel * 0.1, 0.95);

                this.chars.forEach(c => {
                    context.save();
                    const targetX = centerX;
                    const targetY = centerY;
                    const currentX = c.originX + (targetX - c.originX) * compressionFactor;
                    const currentY = c.originY + (targetY - c.originY) * compressionFactor;
                    const drawX = this.x + currentX;
                    const drawY = this.y + currentY; 

                    context.translate(drawX, drawY);
                    context.rotate(c.r);
                    context.translate(-drawX, -drawY);

                    const scaledFontSize = state.fontSize * this.scale;
                    context.font = `bold ${scaledFontSize}px "${c.font}"`;
                    context.fillText(c.char, drawX, drawY);
                    context.restore();
                });

            } else {
                const scaledFontSize = state.fontSize * this.scale;
                context.font = `bold ${scaledFontSize}px ${state.font}`;
                
                const content = state.contentType === 'clock' ? this.displayedTime : state.text;
                const lines = content.split('\n');
                const lh = scaledFontSize * state.lineHeight;
                const pad = (state.highlight ? state.highlightPadding : 0) * this.scale;
                
                lines.forEach((line, i) => {
                    const lineWidth = context.measureText(line).width;
                    let drawX = this.x + pad;
                    const availableW = this.w - pad*2;
                    if (state.textAlign === 'center') drawX += (availableW - lineWidth)/2;
                    else if (state.textAlign === 'right') drawX += (availableW - lineWidth);
                    const drawY = this.y + pad + this.ascent + (i * lh);
                    context.fillText(line, drawX, drawY);
                });
            }
            
        } else if (state.contentType === 'image' && state.img) {
            if (state.glow) { context.shadowBlur = 20; context.shadowColor = "white"; }
            
            // Image Deterioration
            if (state.deterioration && state.detSeverity === 'severe' && this.damage > 0) {
                // We'll simulate glitch/pixelation by drawing slightly offset copies and using smaller chunks
                // Simple effect: Shake + Color Channel Split simulation (draw multiple times with composite)
                const shakeX = (Math.random() - 0.5) * this.damage * 0.5;
                const shakeY = (Math.random() - 0.5) * this.damage * 0.5;
                
                context.save();
                context.globalAlpha = 0.7;
                context.translate(shakeX, shakeY);
                context.drawImage(state.img, this.x, this.y, this.w, this.h);
                
                // "Color Split" Ghost
                if (Math.random() > 0.7) {
                     context.globalCompositeOperation = 'screen';
                     context.fillStyle = '#ff0000'; // Tint red? No, fillRect just draws rect.
                     // To tint image we need more complex canvas work.
                     // Simpler: Just draw another copy offset
                     context.translate(5, 0);
                     context.globalAlpha = 0.3;
                     context.drawImage(state.img, this.x, this.y, this.w, this.h);
                }
                context.restore();
                
                // Add static noise overlay lines if very damaged
                if (this.damage > 10) {
                     context.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
                     context.fillRect(this.x, this.y + Math.random()*this.h, this.w, 2);
                }
            } else {
                context.drawImage(state.img, this.x, this.y, this.w, this.h);
            }
        } else {
            context.fillStyle = this.color;
            context.fillRect(this.x, this.y, this.w, this.h);
        }
        context.restore();
    }
}

function loop(timestamp) {
    if(!state.running) {
        animId = requestAnimationFrame(loop);
        return;
    }

    const fpsInterval = 1000 / state.fps;
    const elapsed = timestamp - lastTime;

    if (elapsed > fpsInterval) {
        lastTime = timestamp - (elapsed % fpsInterval);

        // Clear or Trail
        if (state.trails) {
            // Attempt to support trails by drawing background with partial opacity
            ctx.save();
            // Calculate alpha: High trail value (long trails) = Low opacity background redraw
            // trailAlpha comes from slider (5-95).
            // Default 20.
            // We want alpha to be inversely proportional to trail length.
            // If trailAlpha is "length", then higher = longer trails = lower opacity.
            // Let's use the original logic: 1 - (val/100).
            // val=20 -> alpha=0.8. Fast fade.
            // val=90 -> alpha=0.1. Slow fade.
            const alpha = 1 - (state.trailAlpha / 100);
            ctx.globalAlpha = Math.max(0.01, Math.min(0.99, alpha));
            
            if (window.Chatooly && Chatooly.backgroundManager) {
                // 1. Draw Background Color (Always base)
                Chatooly.backgroundManager.drawToCanvas(ctx, canvas.width, canvas.height);
                
                // 2. Draw Image if in Image Mode
                if (state.bgMode === 'image' && state.currentBgFromPool) {
                    drawImageWithFit(ctx, state.currentBgFromPool, canvas.width, canvas.height, state.bgFit);
                }
            }
            ctx.restore();
        } else {
             if (window.Chatooly && Chatooly.backgroundManager) {
                // 1. Draw Color
                Chatooly.backgroundManager.drawToCanvas(ctx, canvas.width, canvas.height);
                
                // 2. Draw Image
                if (state.bgMode === 'image' && state.currentBgFromPool) {
                    drawImageWithFit(ctx, state.currentBgFromPool, canvas.width, canvas.height, state.bgFit);
                }
             }
        }

        // Cleanup dead elements
        elements = elements.filter(el => !el.isDead);

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy; p.life -= 0.05;
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
            if(p.life <= 0) particles.splice(i, 1);
        }

        elements.forEach(el => {
            el.update();
            el.draw();
        });
        
        // --- FOREGROUND RENDER ---
        if (state.fgImage) {
            ctx.drawImage(state.fgImage, 0, 0, state.width, state.height);
        }
    }

    animId = requestAnimationFrame(loop);
}

// --- High Res Export ---
window.renderHighResolution = function(targetCanvas, scale) {
    const tCtx = targetCanvas.getContext('2d');
    targetCanvas.width = state.width * scale;
    targetCanvas.height = state.height * scale;
    
    // 1. Background
    tCtx.save();
    tCtx.scale(scale, scale);
    if (window.Chatooly && Chatooly.backgroundManager) {
        // Draw Color
        Chatooly.backgroundManager.drawToCanvas(tCtx, state.width, state.height);
        
        // Draw Image
        if (state.bgMode === 'image' && state.currentBgFromPool) {
             drawImageWithFit(tCtx, state.currentBgFromPool, state.width, state.height, state.bgFit);
        }
    } else {
        tCtx.fillStyle = '#0f172a';
        tCtx.fillRect(0, 0, state.width, state.height);
    }
    tCtx.restore();
    
    // 2. Particles (scaled)
    particles.forEach(p => {
        tCtx.save();
        tCtx.globalAlpha = p.life;
        tCtx.fillStyle = p.color;
        tCtx.beginPath(); 
        tCtx.arc(p.x * scale, p.y * scale, 3 * scale, 0, Math.PI*2); 
        tCtx.fill();
        tCtx.restore();
    });
    
    // 3. Elements
    tCtx.save();
    tCtx.scale(scale, scale);
    elements.forEach(el => {
        el.draw(tCtx);
    });
    tCtx.restore();
    
    // 4. Foreground
    if (state.fgImage) {
        tCtx.save();
        tCtx.scale(scale, scale);
        tCtx.drawImage(state.fgImage, 0, 0, state.width, state.height);
        tCtx.restore();
    }
};

// --- Initialization ---
function init() {
    // Set initial size
    canvas.width = state.width;
    canvas.height = state.height;
    
    const el = new DVD();
    elements.push(el);
    
    loop(0);
}

// Handle Canvas Resize from Chatooly
document.addEventListener('chatooly:canvas-resized', (e) => {
    // e.detail.canvas is the canvas element
    // e.detail.width/height are the new dimensions
    const newWidth = e.detail.width || canvas.width;
    const newHeight = e.detail.height || canvas.height;
    
    state.width = newWidth;
    state.height = newHeight;
    
    // We don't need to scale elements for this tool, as it bounces off walls.
    // They will just have more/less room.
});

// Start
init();

// Export state for UI
window.toolState = state;
window.toolElements = elements;
window.restartTool = function() {
    elements = [new DVD()];
    particles = [];
};
