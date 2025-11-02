/*
 * Bouncy Tool - Main Logic
 * Author: Yael
 *
 * Physics simulation where typed letters become bouncing balls
 */

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');
const ctx = canvas.getContext('2d');

// Set initial canvas dimensions
canvas.width = 800;
canvas.height = 600;

// ========== BACKGROUND SYSTEM ==========
// Initialize background manager
if (window.Chatooly && window.Chatooly.backgroundManager) {
    Chatooly.backgroundManager.init(canvas);
    
    // Connect background controls
    document.getElementById('transparent-bg').addEventListener('change', (e) => {
        Chatooly.backgroundManager.setTransparent(e.target.checked);
        document.getElementById('bg-color-group').style.display = e.target.checked ? 'none' : 'block';
    });
    
    document.getElementById('bg-color').addEventListener('input', (e) => {
        Chatooly.backgroundManager.setBackgroundColor(e.target.value);
    });
    
    document.getElementById('bg-image').addEventListener('change', async (e) => {
        if (e.target.files[0]) {
            await Chatooly.backgroundManager.setBackgroundImage(e.target.files[0]);
            document.getElementById('clear-bg-image').style.display = 'block';
            document.getElementById('bg-fit-group').style.display = 'block';
        }
    });
    
    document.getElementById('clear-bg-image').addEventListener('click', () => {
        Chatooly.backgroundManager.clearBackgroundImage();
        document.getElementById('clear-bg-image').style.display = 'none';
        document.getElementById('bg-fit-group').style.display = 'none';
        document.getElementById('bg-image').value = '';
    });
    
    document.getElementById('bg-fit').addEventListener('change', (e) => {
        Chatooly.backgroundManager.setFit(e.target.value);
    });
}

// ========== PHYSICS SIMULATION ==========
class BouncyBall {
    constructor(x, y, letter, color, bounciness) {
        this.x = x;
        this.y = y;
        this.letter = letter;
        this.color = color;
        this.bounciness = bounciness;
        this.radius = 25;
        
        // Random initial velocity
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = Math.random() * 2;
        
        // Physics constants
        this.gravity = 0.5;
        this.friction = 0.98;
        this.airResistance = 0.99;
    }
    
    update() {
        // Apply gravity
        this.vy += this.gravity;
        
        // Apply air resistance
        this.vx *= this.airResistance;
        this.vy *= this.airResistance;
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Bounce off walls (left and right)
        if (this.x - this.radius <= 0 || this.x + this.radius >= canvas.width) {
            this.vx = -this.vx * this.friction;
            this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        }
        
        // Bounce off floor
        if (this.y + this.radius >= canvas.height) {
            this.y = canvas.height - this.radius;
            this.vy = -this.vy * this.bounciness;
            this.vx *= this.friction; // Apply friction on bounce
            
            // Stop very slow bounces
            if (Math.abs(this.vy) < 0.1) {
                this.vy = 0;
            }
        }
        
        // Bounce off ceiling
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.vy = -this.vy * this.bounciness;
        }
    }
    
    draw() {
        // Draw ball
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw letter
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.letter, this.x, this.y);
    }
}

// ========== GAME STATE ==========
let balls = [];
let previousCanvasSize = { width: canvas.width, height: canvas.height };

// ========== CONTROL REFERENCES ==========
const textInput = document.getElementById('text-input');
const colorPicker = document.getElementById('ball-color');
const bouncinessSlider = document.getElementById('bounciness');
const bouncinessValue = document.getElementById('bounciness-value');
const clearButton = document.getElementById('clear-balls');

// ========== EVENT LISTENERS ==========

// Text input - create balls when Enter is pressed
textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const text = textInput.value.trim();
        if (text.length === 0) return;
        
        const color = colorPicker.value;
        const bounciness = parseFloat(bouncinessSlider.value);
        
        // Create a ball for each character
        text.split('').forEach((letter, index) => {
            const x = (canvas.width / (text.length + 1)) * (index + 1);
            const y = 50 + Math.random() * 20; // Start near top
            balls.push(new BouncyBall(x, y, letter, color, bounciness));
        });
        
        textInput.value = '';
    }
});

// Update bounciness display
bouncinessSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    bouncinessValue.textContent = value.toFixed(2);
    
    // Update existing balls' bounciness
    balls.forEach(ball => {
        ball.bounciness = value;
    });
});

// Clear all balls
clearButton.addEventListener('click', () => {
    balls = [];
});

// ========== CANVAS RESIZE HANDLING ==========
document.addEventListener('chatooly:canvas-resized', (e) => {
    const oldWidth = previousCanvasSize.width;
    const oldHeight = previousCanvasSize.height;
    const newWidth = e.detail.canvas.width;
    const newHeight = e.detail.canvas.height;
    
    if (oldWidth === 0 || oldHeight === 0) {
        previousCanvasSize = { width: newWidth, height: newHeight };
        return;
    }
    
    const scaleX = newWidth / oldWidth;
    const scaleY = newHeight / oldHeight;
    
    // Scale all balls proportionally
    balls.forEach(ball => {
        ball.x *= scaleX;
        ball.y *= scaleY;
        ball.radius *= Math.min(scaleX, scaleY);
        
        // Adjust velocities to maintain physics feel
        ball.vx *= scaleX / oldWidth * newWidth;
        ball.vy *= scaleY / oldHeight * newHeight;
    });
    
    previousCanvasSize = { width: newWidth, height: newHeight };
});

// ========== ANIMATION LOOP ==========
function animate() {
    // Draw background FIRST
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.drawToCanvas(ctx, canvas.width, canvas.height);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Update and draw all balls
    balls.forEach((ball, index) => {
        ball.update();
        ball.draw();
        
        // Remove balls that are completely stopped and below screen
        if (ball.vy === 0 && ball.vx === 0 && ball.y > canvas.height + 100) {
            balls.splice(index, 1);
        }
    });
    
    requestAnimationFrame(animate);
}

// Start animation
animate();

// ========== HIGH-RESOLUTION EXPORT ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (balls.length === 0) {
        console.warn('No balls to export');
        return;
    }
    
    const exportCtx = targetCanvas.getContext('2d');
    const scaledWidth = canvas.width * scale;
    const scaledHeight = canvas.height * scale;
    
    targetCanvas.width = scaledWidth;
    targetCanvas.height = scaledHeight;
    
    // Scale context
    exportCtx.scale(scale, scale);
    
    // Draw background
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.drawToCanvas(exportCtx, canvas.width, canvas.height);
    } else {
        exportCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Re-draw all balls at high resolution
    balls.forEach(ball => {
        const scaledBall = {
            x: ball.x,
            y: ball.y,
            radius: ball.radius,
            letter: ball.letter,
            color: ball.color
        };
        
        // Draw ball
        exportCtx.beginPath();
        exportCtx.arc(scaledBall.x, scaledBall.y, scaledBall.radius, 0, Math.PI * 2);
        exportCtx.fillStyle = scaledBall.color;
        exportCtx.fill();
        exportCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        exportCtx.lineWidth = 2;
        exportCtx.stroke();
        
        // Draw letter at scaled font size
        exportCtx.fillStyle = '#ffffff';
        exportCtx.font = `bold ${20 * scale}px monospace`;
        exportCtx.textAlign = 'center';
        exportCtx.textBaseline = 'middle';
        exportCtx.fillText(scaledBall.letter, scaledBall.x, scaledBall.y);
    });
    
    console.log(`High-res export completed at ${scale}x resolution`);
};
