/* 
 * fisheyezzz - Interactive Fisheye Distortion Tool
 * Author: yael
 */

class FisheyeTool {
    constructor() {
        this.canvas = document.getElementById('chatooly-canvas');
        if (!this.canvas) {
            console.error('Canvas element not found. Waiting for initialization...');
            setTimeout(() => this.initializeCanvas(), 100);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.originalImage = null;
        this.fisheyePoints = [];
        this.selectedPoint = null;
        this.isDragging = false;
        this.globalStrength = 1.0;
        this.hoveredPoint = null;
        this.renderTimeout = null;
        this.previousCanvasSize = { width: 0, height: 0 };
        
        this.init();
    }
    
    initializeCanvas() {
        this.canvas = document.getElementById('chatooly-canvas');
        if (!this.canvas) {
            console.error('Canvas still not found. Retrying...');
            setTimeout(() => this.initializeCanvas(), 100);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.originalImage = null;
        this.fisheyePoints = [];
        this.selectedPoint = null;
        this.isDragging = false;
        this.globalStrength = 1.0;
        this.hoveredPoint = null;
        this.renderTimeout = null;
        this.previousCanvasSize = { width: 0, height: 0 };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.updateGlobalStrengthDisplay();
    }
    
    setupEventListeners() {
        // Image upload
        document.getElementById('image-upload').addEventListener('change', (e) => {
            this.loadImage(e.target.files[0]);
        });
        
        // Global strength slider
        document.getElementById('global-strength').addEventListener('input', (e) => {
            this.globalStrength = parseFloat(e.target.value);
            this.updateGlobalStrengthDisplay();
            this.renderFisheye();
        });
        
        // Clear all button
        document.getElementById('clear-all-btn').addEventListener('click', () => {
            this.clearAllPoints();
        });
        
        // Reset image button
        document.getElementById('reset-image-btn').addEventListener('click', () => {
            this.resetImage();
        });
        
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseLeave(e));
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // Listen for Chatooly canvas resize events
        document.addEventListener('chatooly:canvas-resized', (e) => this.onCanvasResized(e));
    }
    
    loadImage(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.setupCanvas();
                this.renderFisheye();
                this.showCanvas();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    setupCanvas() {
        // Set canvas size to match image, but maintain aspect ratio
        const maxWidth = 800;
        const maxHeight = 600;
        
        let { width, height } = this.originalImage;
        
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
        }
        
        // Store previous size before changing
        this.previousCanvasSize = {
            width: this.canvas.width || width,
            height: this.canvas.height || height
        };
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
    }
    
    showCanvas() {
        document.getElementById('upload-prompt').style.display = 'none';
        this.canvas.style.display = 'block';
        this.canvas.style.cursor = 'crosshair';
        
        // Update the canvas size after making it visible
        this.previousCanvasSize = {
            width: this.canvas.width,
            height: this.canvas.height
        };
        
        // Debug: Log canvas state for export
        console.log('Canvas shown - dimensions:', this.canvas.width, 'x', this.canvas.height);
        console.log('Canvas display style:', this.canvas.style.display);
    }
    
    onCanvasClick(e) {
        if (this.isDragging) return;
        
        // Use Chatooly's coordinate mapping utility
        const coords = window.Chatooly ? 
            window.Chatooly.utils.mapMouseToCanvas(e, this.canvas) :
            this.fallbackMouseMapping(e);
            
        const x = coords.x;
        const y = coords.y;
        
        // Check if clicking on existing point
        const clickedPoint = this.fisheyePoints.find(point => {
            const dx = x - point.x;
            const dy = y - point.y;
            return Math.sqrt(dx * dx + dy * dy) < 15;
        });
        
        if (clickedPoint) {
            this.selectPoint(clickedPoint);
        } else {
            this.addFisheyePoint(x, y);
        }
    }
    
    onMouseDown(e) {
        // Use Chatooly's coordinate mapping utility
        const coords = window.Chatooly ? 
            window.Chatooly.utils.mapMouseToCanvas(e, this.canvas) :
            this.fallbackMouseMapping(e);
            
        const x = coords.x;
        const y = coords.y;
        
        const point = this.fisheyePoints.find(p => {
            const dx = x - p.x;
            const dy = y - p.y;
            return Math.sqrt(dx * dx + dy * dy) < 15;
        });
        
        if (point) {
            this.selectedPoint = point;
            this.isDragging = true;
        }
    }
    
    onMouseMove(e) {
        // Use Chatooly's coordinate mapping utility
        const coords = window.Chatooly ? 
            window.Chatooly.utils.mapMouseToCanvas(e, this.canvas) :
            this.fallbackMouseMapping(e);
            
        const x = coords.x;
        const y = coords.y;
        
        if (this.isDragging && this.selectedPoint) {
            this.selectedPoint.x = Math.max(0, Math.min(this.canvas.width, x));
            this.selectedPoint.y = Math.max(0, Math.min(this.canvas.height, y));
            
            this.renderFisheyeDebounced(); // Use debounced version for smooth dragging
            this.updatePointDisplay();
        } else {
            // Check for hover on points
            const hoveredPoint = this.fisheyePoints.find(point => {
                const dx = x - point.x;
                const dy = y - point.y;
                return Math.sqrt(dx * dx + dy * dy) < 15;
            });
            
            if (hoveredPoint !== this.hoveredPoint) {
                this.hoveredPoint = hoveredPoint;
                this.canvas.style.cursor = hoveredPoint ? 'pointer' : 'crosshair';
                this.renderFisheye(); // Re-render to update hover visual
            }
        }
    }
    
    onMouseUp(e) {
        this.isDragging = false;
        this.selectedPoint = null;
    }
    
    onMouseLeave(e) {
        this.hoveredPoint = null;
        this.canvas.style.cursor = 'default';
        this.renderFisheye();
    }
    
    onKeyDown(e) {
        // Delete key to remove hovered or selected point
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (this.hoveredPoint) {
                this.deletePoint(this.hoveredPoint.id);
            } else if (this.selectedPoint) {
                this.deletePoint(this.selectedPoint.id);
            }
        }
        
        // Escape key to deselect
        if (e.key === 'Escape') {
            this.selectedPoint = null;
            this.hoveredPoint = null;
            this.renderFisheye();
        }
    }
    
    onCanvasResized(e) {
        // Canvas was resized by Chatooly CDN
        if (!this.originalImage) return;
        
        console.log('Fisheye: Canvas resized event received', e.detail);
        
        // Store the old canvas dimensions
        const oldWidth = this.previousCanvasSize.width;
        const oldHeight = this.previousCanvasSize.height;
        
        // Get new canvas dimensions from event detail or canvas element
        const newWidth = (e.detail && e.detail.canvas) ? e.detail.canvas.width : this.canvas.width;
        const newHeight = (e.detail && e.detail.canvas) ? e.detail.canvas.height : this.canvas.height;
        
        // Avoid division by zero
        if (oldWidth === 0 || oldHeight === 0) {
            this.previousCanvasSize = { width: newWidth, height: newHeight };
            this.renderFisheye();
            return;
        }
        
        // Calculate scale factors
        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;
        
        console.log(`Fisheye: Scaling points from ${oldWidth}x${oldHeight} to ${newWidth}x${newHeight}`);
        console.log(`Fisheye: Display: ${e.detail?.display?.width}x${e.detail?.display?.height}`);
        
        // Scale all fisheye points to match new canvas size
        this.fisheyePoints.forEach(point => {
            point.x = point.x * scaleX;
            point.y = point.y * scaleY;
            // Scale radius proportionally
            point.radius = point.radius * Math.min(scaleX, scaleY);
        });
        
        // Update stored canvas size
        this.previousCanvasSize = {
            width: newWidth,
            height: newHeight
        };
        
        // Re-render the image with fisheye effects
        this.renderFisheye();
    }
    
    // Fallback mouse mapping for when Chatooly isn't available
    fallbackMouseMapping(e) {
        const rect = this.canvas.getBoundingClientRect();
        const displayX = e.clientX - rect.left;
        const displayY = e.clientY - rect.top;
        
        // Get scale factors
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: displayX * scaleX,
            y: displayY * scaleY,
            displayX: displayX,
            displayY: displayY,
            scaleX: scaleX,
            scaleY: scaleY
        };
    }
    
    addFisheyePoint(x, y) {
        const point = {
            id: Date.now() + Math.random(),
            x: x,
            y: y,
            radius: 50,
            strength: 0.5
        };
        
        this.fisheyePoints.push(point);
        this.addPointControls(point);
        this.renderFisheye();
    }
    
    addPointControls(point) {
        const pointsList = document.getElementById('fisheye-points-list');
        const pointDiv = document.createElement('div');
        pointDiv.className = 'fisheye-point-control';
        pointDiv.style.cssText = `
            border: 2px solid var(--chatooly-color-border);
            padding: var(--chatooly-spacing-2);
            margin: var(--chatooly-spacing-2) 0;
            border-radius: var(--chatooly-border-radius);
            background: var(--chatooly-color-background);
        `;
        
        pointDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--chatooly-spacing-2);">
                <span style="color: var(--chatooly-color-text);">Point ${this.fisheyePoints.length}</span>
                <button class="chatooly-btn chatooly-btn-danger" style="padding: 2px 6px; font-size: 12px;" onclick="fisheyeTool.deletePoint('${point.id}')">×</button>
            </div>
            <div style="margin-bottom: var(--chatooly-spacing-2);">
                <label style="color: var(--chatooly-color-text); font-size: 12px;">Radius</label>
                <input type="range" min="10" max="200" value="${point.radius}" 
                       oninput="fisheyeTool.updatePointRadius('${point.id}', this.value)">
                <span style="color: var(--chatooly-color-text-muted); font-size: 11px;">${point.radius}px</span>
            </div>
            <div>
                <label style="color: var(--chatooly-color-text); font-size: 12px;">Strength</label>
                <input type="range" min="0" max="2" step="0.1" value="${point.strength}" 
                       oninput="fisheyeTool.updatePointStrength('${point.id}', this.value)">
                <span style="color: var(--chatooly-color-text-muted); font-size: 11px;">${point.strength}</span>
            </div>
        `;
        
        pointsList.appendChild(pointDiv);
        
        // Remove the initial instruction text
        const instructionText = pointsList.querySelector('.chatooly-text-muted');
        if (instructionText) {
            instructionText.remove();
        }
    }
    
    updatePointRadius(pointId, radius) {
        const point = this.fisheyePoints.find(p => p.id === pointId);
        if (point) {
            point.radius = parseInt(radius);
            this.renderFisheye();
            this.updatePointDisplay();
        }
    }
    
    updatePointStrength(pointId, strength) {
        const point = this.fisheyePoints.find(p => p.id === pointId);
        if (point) {
            point.strength = parseFloat(strength);
            this.renderFisheye();
            this.updatePointDisplay();
        }
    }
    
    deletePoint(pointId) {
        this.fisheyePoints = this.fisheyePoints.filter(p => p.id !== pointId);
        this.updatePointsList();
        this.renderFisheye();
    }
    
    updatePointsList() {
        const pointsList = document.getElementById('fisheye-points-list');
        pointsList.innerHTML = '';
        
        if (this.fisheyePoints.length === 0) {
            pointsList.innerHTML = '<p class="chatooly-text-muted">Click on the image to add fisheye points</p>';
        } else {
            this.fisheyePoints.forEach(point => {
                this.addPointControls(point);
            });
        }
    }
    
    selectPoint(point) {
        // Highlight selected point (could add visual feedback here)
        console.log('Selected point:', point);
    }
    
    updatePointDisplay() {
        // Update the display values for all points
        this.fisheyePoints.forEach(point => {
            const pointDiv = document.querySelector(`[onclick*="${point.id}"]`).closest('.fisheye-point-control');
            if (pointDiv) {
                const radiusSpan = pointDiv.querySelector('input[type="range"]').nextElementSibling;
                const strengthSpan = pointDiv.querySelectorAll('input[type="range"]')[1].nextElementSibling;
                
                if (radiusSpan) radiusSpan.textContent = `${point.radius}px`;
                if (strengthSpan) strengthSpan.textContent = point.strength;
            }
        });
    }
    
    clearAllPoints() {
        this.fisheyePoints = [];
        this.updatePointsList();
        this.renderFisheye();
    }
    
    resetImage() {
        this.fisheyePoints = [];
        this.updatePointsList();
        this.renderFisheye();
    }
    
    updateGlobalStrengthDisplay() {
        const display = document.querySelector('#global-strength + .chatooly-value-display');
        if (display) {
            display.textContent = this.globalStrength.toFixed(1);
        }
    }
    
    renderFisheye() {
        if (!this.originalImage) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw original image
        this.ctx.drawImage(this.originalImage, 0, 0, this.canvas.width, this.canvas.height);
        
        // Apply fisheye effects
        if (this.fisheyePoints.length > 0) {
            this.applyFisheyeEffects();
        }
        
        // Draw fisheye point indicators
        this.drawPointIndicators();
    }
    
    // Debounced version for performance during drag operations
    renderFisheyeDebounced() {
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }
        this.renderTimeout = setTimeout(() => {
            this.renderFisheye();
        }, 16); // ~60fps
    }
    
    applyFisheyeEffects() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        // Create a temporary canvas for the distorted image
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        tempCtx.putImageData(imageData, 0, 0);
        
        // Apply each fisheye point
        this.fisheyePoints.forEach(point => {
            this.applySingleFisheye(tempCtx, point);
        });
        
        // Draw the final result
        this.ctx.drawImage(tempCanvas, 0, 0);
    }
    
    applySingleFisheye(ctx, point) {
        const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const newData = new Uint8ClampedArray(data.length);
        
        // Copy original data first
        for (let i = 0; i < data.length; i++) {
            newData[i] = data[i];
        }
        
        const centerX = point.x;
        const centerY = point.y;
        const radius = point.radius;
        const strength = point.strength * this.globalStrength;
        
        for (let y = 0; y < this.canvas.height; y++) {
            for (let x = 0; x < this.canvas.width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < radius && distance > 0) {
                    // Calculate fisheye distortion
                    const normalizedDistance = distance / radius;
                    
                    // Create a smooth fisheye effect
                    const distortionFactor = Math.pow(normalizedDistance, 1 + strength);
                    const newDistance = distance * distortionFactor;
                    
                    if (newDistance < radius) {
                        const angle = Math.atan2(dy, dx);
                        const sourceX = centerX + Math.cos(angle) * newDistance;
                        const sourceY = centerY + Math.sin(angle) * newDistance;
                        
                        // Bilinear interpolation for smoother results
                        const srcX1 = Math.floor(sourceX);
                        const srcY1 = Math.floor(sourceY);
                        const srcX2 = srcX1 + 1;
                        const srcY2 = srcY1 + 1;
                        
                        if (srcX1 >= 0 && srcX2 < this.canvas.width && srcY1 >= 0 && srcY2 < this.canvas.height) {
                            const fx = sourceX - srcX1;
                            const fy = sourceY - srcY1;
                            
                            const destIndex = (y * this.canvas.width + x) * 4;
                            
                            // Get four corner pixels for interpolation
                            const idx1 = (srcY1 * this.canvas.width + srcX1) * 4;
                            const idx2 = (srcY1 * this.canvas.width + srcX2) * 4;
                            const idx3 = (srcY2 * this.canvas.width + srcX1) * 4;
                            const idx4 = (srcY2 * this.canvas.width + srcX2) * 4;
                            
                            // Interpolate each color channel
                            for (let c = 0; c < 4; c++) {
                                const top = data[idx1 + c] * (1 - fx) + data[idx2 + c] * fx;
                                const bottom = data[idx3 + c] * (1 - fx) + data[idx4 + c] * fx;
                                newData[destIndex + c] = Math.round(top * (1 - fy) + bottom * fy);
                            }
                        }
                    }
                }
            }
        }
        
        const newImageData = new ImageData(newData, this.canvas.width, this.canvas.height);
        ctx.putImageData(newImageData, 0, 0);
    }
    
    drawPointIndicators() {
        this.fisheyePoints.forEach(point => {
            const isHovered = this.hoveredPoint === point;
            const isSelected = this.selectedPoint === point;
            
            // Draw radius circle first (so it appears behind the point)
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, point.radius, 0, 2 * Math.PI);
            this.ctx.strokeStyle = isHovered || isSelected ? 'rgba(0, 123, 255, 0.5)' : 'rgba(0, 123, 255, 0.2)';
            this.ctx.lineWidth = isHovered || isSelected ? 2 : 1;
            this.ctx.stroke();
            
            // Draw point circle
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, isHovered || isSelected ? 10 : 8, 0, 2 * Math.PI);
            
            // Different colors for different states
            if (isSelected) {
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.9)'; // Gold for selected
                this.ctx.strokeStyle = 'rgba(255, 140, 0, 1)';
            } else if (isHovered) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Bright white for hovered
                this.ctx.strokeStyle = 'rgba(0, 180, 255, 1)';
            } else {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // Normal state
                this.ctx.strokeStyle = 'rgba(0, 123, 255, 1)';
            }
            
            this.ctx.fill();
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Add a small label showing point number
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.font = '10px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText((this.fisheyePoints.indexOf(point) + 1).toString(), point.x, point.y + 3);
        });
    }
    
    // Helper function for applying fisheye to any canvas context (used by high-res export)
    applySingleFisheyeToCanvas(ctx, point, canvasWidth, canvasHeight) {
        const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        const data = imageData.data;
        const newData = new Uint8ClampedArray(data.length);
        
        // Copy original data first
        for (let i = 0; i < data.length; i++) {
            newData[i] = data[i];
        }
        
        const centerX = point.x;
        const centerY = point.y;
        const radius = point.radius;
        const strength = point.strength * this.globalStrength;
        
        for (let y = 0; y < canvasHeight; y++) {
            for (let x = 0; x < canvasWidth; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < radius && distance > 0) {
                    // Calculate fisheye distortion
                    const normalizedDistance = distance / radius;
                    
                    // Create a smooth fisheye effect
                    const distortionFactor = Math.pow(normalizedDistance, 1 + strength);
                    const newDistance = distance * distortionFactor;
                    
                    if (newDistance < radius) {
                        const angle = Math.atan2(dy, dx);
                        const sourceX = centerX + Math.cos(angle) * newDistance;
                        const sourceY = centerY + Math.sin(angle) * newDistance;
                        
                        // Bilinear interpolation for smoother results
                        const srcX1 = Math.floor(sourceX);
                        const srcY1 = Math.floor(sourceY);
                        const srcX2 = srcX1 + 1;
                        const srcY2 = srcY1 + 1;
                        
                        if (srcX1 >= 0 && srcX2 < canvasWidth && srcY1 >= 0 && srcY2 < canvasHeight) {
                            const fx = sourceX - srcX1;
                            const fy = sourceY - srcY1;
                            
                            const destIndex = (y * canvasWidth + x) * 4;
                            
                            // Get four corner pixels for interpolation
                            const idx1 = (srcY1 * canvasWidth + srcX1) * 4;
                            const idx2 = (srcY1 * canvasWidth + srcX2) * 4;
                            const idx3 = (srcY2 * canvasWidth + srcX1) * 4;
                            const idx4 = (srcY2 * canvasWidth + srcX2) * 4;
                            
                            // Interpolate each color channel
                            for (let c = 0; c < 4; c++) {
                                const top = data[idx1 + c] * (1 - fx) + data[idx2 + c] * fx;
                                const bottom = data[idx3 + c] * (1 - fx) + data[idx4 + c] * fx;
                                newData[destIndex + c] = Math.round(top * (1 - fy) + bottom * fy);
                            }
                        }
                    }
                }
            }
        }
        
        const newImageData = new ImageData(newData, canvasWidth, canvasHeight);
        ctx.putImageData(newImageData, 0, 0);
    }
}

// Initialize the tool when the page loads
let fisheyeTool;
document.addEventListener('DOMContentLoaded', () => {
    fisheyeTool = new FisheyeTool();
});

// High-resolution render function for Chatooly export
window.renderHighResolution = function(targetCanvas, scale) {
    if (!fisheyeTool || !fisheyeTool.originalImage) {
        console.warn('Fisheye: No image loaded for high-res export');
        return;
    }
    
    const ctx = targetCanvas.getContext('2d');
    const scaledWidth = fisheyeTool.canvas.width * scale;
    const scaledHeight = fisheyeTool.canvas.height * scale;
    
    // Set target canvas size
    targetCanvas.width = scaledWidth;
    targetCanvas.height = scaledHeight;
    
    // Clear and draw scaled original image
    ctx.clearRect(0, 0, scaledWidth, scaledHeight);
    ctx.drawImage(fisheyeTool.originalImage, 0, 0, scaledWidth, scaledHeight);
    
    // Apply fisheye effects at high resolution
    if (fisheyeTool.fisheyePoints.length > 0) {
        fisheyeTool.fisheyePoints.forEach(point => {
            const scaledPoint = {
                x: point.x * scale,
                y: point.y * scale,
                radius: point.radius * scale,
                strength: point.strength
            };
            fisheyeTool.applySingleFisheyeToCanvas(ctx, scaledPoint, scaledWidth, scaledHeight);
        });
    }
    
    console.log(`Fisheye: High-res render completed at ${scale}x (${scaledWidth}x${scaledHeight})`);
};