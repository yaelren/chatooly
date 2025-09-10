/* 
 * Sticker Maker - Main Logic
 * Creates text stickers that look like real stickers when clicked on canvas
 */

class StickerMaker {
    constructor() {
        this.canvas = document.getElementById('chatooly-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.stickers = [];
        this.previousCanvasSize = { width: 0, height: 0 };
        
        this.setupCanvas();
        this.setupEventListeners();
        this.clearCanvas();
    }
    
    setupCanvas() {
        // Set initial canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.previousCanvasSize = { 
            width: this.canvas.width, 
            height: this.canvas.height 
        };
    }
    
    setupEventListeners() {
        // Canvas click event
        this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
        
        // Canvas resize event
        document.addEventListener('chatooly:canvas-resized', (e) => this.onCanvasResized(e));
        
        // Control events
        document.getElementById('font-size').addEventListener('input', (e) => {
            document.getElementById('font-size-value').textContent = e.target.value + 'px';
        });
        
        document.getElementById('clear-canvas').addEventListener('click', () => {
            this.stickers = [];
            this.clearCanvas();
        });
    }
    
    onCanvasClick(e) {
        // Get accurate mouse coordinates
        const coords = window.Chatooly ? 
            window.Chatooly.utils.mapMouseToCanvas(e, this.canvas) :
            this.fallbackMouseMapping(e);
        
        const text = document.getElementById('sticker-text').value;
        if (!text.trim()) return;
        
        const fontSize = parseInt(document.getElementById('font-size').value);
        const color = document.getElementById('sticker-color').value;
        
        // Create sticker object
        const sticker = {
            x: coords.x,
            y: coords.y,
            text: text,
            fontSize: fontSize,
            color: color,
            rotation: (Math.random() - 0.5) * 0.3 // Random slight rotation
        };
        
        this.stickers.push(sticker);
        this.redrawCanvas();
    }
    
    fallbackMouseMapping(e) {
        const rect = this.canvas.getBoundingClientRect();
        const displayX = e.clientX - rect.left;
        const displayY = e.clientY - rect.top;
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return { x: displayX * scaleX, y: displayY * scaleY };
    }
    
    onCanvasResized(e) {
        if (this.stickers.length === 0) return;
        
        const oldWidth = this.previousCanvasSize.width;
        const oldHeight = this.previousCanvasSize.height;
        const newWidth = e.detail.canvas.width;
        const newHeight = e.detail.canvas.height;
        
        if (oldWidth === 0 || oldHeight === 0) {
            this.previousCanvasSize = { width: newWidth, height: newHeight };
            this.redrawCanvas();
            return;
        }
        
        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;
        
        // Scale all sticker positions
        this.stickers.forEach(sticker => {
            sticker.x *= scaleX;
            sticker.y *= scaleY;
            sticker.fontSize *= Math.min(scaleX, scaleY);
        });
        
        this.previousCanvasSize = { width: newWidth, height: newHeight };
        this.redrawCanvas();
    }
    
    clearCanvas() {
        // Fill with light background
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add subtle grid pattern
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 1;
        const gridSize = 40;
        
        for (let x = 0; x <= this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawSticker(sticker) {
        this.ctx.save();
        
        // Move to sticker position and apply rotation
        this.ctx.translate(sticker.x, sticker.y);
        this.ctx.rotate(sticker.rotation);
        
        // Set font
        this.ctx.font = `bold ${sticker.fontSize}px "Comic Sans MS", "Arial Black", sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Measure text for background
        const metrics = this.ctx.measureText(sticker.text);
        const padding = sticker.fontSize * 0.4;
        const width = metrics.width + padding * 2;
        const height = sticker.fontSize * 1.4;
        
        // Draw white border/background (thick for sticker effect)
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = sticker.fontSize * 0.15;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Create rounded rectangle path for sticker shape
        const radius = height * 0.3;
        this.ctx.beginPath();
        this.ctx.roundRect(-width/2, -height/2, width, height, radius);
        this.ctx.fill();
        this.ctx.stroke();
        
        // Draw shadow for depth
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = sticker.fontSize * 0.1;
        this.ctx.shadowOffsetX = sticker.fontSize * 0.05;
        this.ctx.shadowOffsetY = sticker.fontSize * 0.05;
        this.ctx.fill();
        
        // Reset shadow for text
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // Draw colored text with outline
        this.ctx.strokeStyle = this.darkenColor(sticker.color, 0.3);
        this.ctx.lineWidth = sticker.fontSize * 0.08;
        this.ctx.strokeText(sticker.text, 0, 0);
        
        this.ctx.fillStyle = sticker.color;
        this.ctx.fillText(sticker.text, 0, 0);
        
        // Add glossy effect
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.ellipse(0, -height * 0.2, width * 0.4, height * 0.2, 0, 0, Math.PI);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
        
        this.ctx.restore();
    }
    
    darkenColor(color, amount) {
        const num = parseInt(color.slice(1), 16);
        const r = Math.max(0, (num >> 16) - Math.floor(255 * amount));
        const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.floor(255 * amount));
        const b = Math.max(0, (num & 0x0000FF) - Math.floor(255 * amount));
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    }
    
    redrawCanvas() {
        this.clearCanvas();
        this.stickers.forEach(sticker => this.drawSticker(sticker));
    }
}

// High-resolution export function
window.renderHighResolution = function(targetCanvas, scale) {
    if (!window.stickerMaker || !window.stickerMaker.stickers) {
        console.warn('Sticker Maker not ready for high-res export');
        return;
    }
    
    const ctx = targetCanvas.getContext('2d');
    const originalCanvas = window.stickerMaker.canvas;
    
    // Set high-res dimensions
    targetCanvas.width = originalCanvas.width * scale;
    targetCanvas.height = originalCanvas.height * scale;
    
    // Clear and set background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
    
    // Draw grid at high resolution
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = scale;
    const gridSize = 40 * scale;
    
    for (let x = 0; x <= targetCanvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, targetCanvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y <= targetCanvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(targetCanvas.width, y);
        ctx.stroke();
    }
    
    // Draw each sticker at high resolution
    window.stickerMaker.stickers.forEach(sticker => {
        ctx.save();
        
        const scaledX = sticker.x * scale;
        const scaledY = sticker.y * scale;
        const scaledFontSize = sticker.fontSize * scale;
        
        ctx.translate(scaledX, scaledY);
        ctx.rotate(sticker.rotation);
        
        ctx.font = `bold ${scaledFontSize}px "Comic Sans MS", "Arial Black", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const metrics = ctx.measureText(sticker.text);
        const padding = scaledFontSize * 0.4;
        const width = metrics.width + padding * 2;
        const height = scaledFontSize * 1.4;
        
        // White background
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = scaledFontSize * 0.15;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const radius = height * 0.3;
        ctx.beginPath();
        ctx.roundRect(-width/2, -height/2, width, height, radius);
        ctx.fill();
        ctx.stroke();
        
        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = scaledFontSize * 0.1;
        ctx.shadowOffsetX = scaledFontSize * 0.05;
        ctx.shadowOffsetY = scaledFontSize * 0.05;
        ctx.fill();
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Text with outline
        ctx.strokeStyle = window.stickerMaker.darkenColor(sticker.color, 0.3);
        ctx.lineWidth = scaledFontSize * 0.08;
        ctx.strokeText(sticker.text, 0, 0);
        
        ctx.fillStyle = sticker.color;
        ctx.fillText(sticker.text, 0, 0);
        
        // Glossy effect
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(0, -height * 0.2, width * 0.4, height * 0.2, 0, 0, Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        ctx.restore();
    });
    
    console.log(`High-res export completed at ${scale}x resolution`);
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.stickerMaker = new StickerMaker();
});