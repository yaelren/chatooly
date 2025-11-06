/**
 * CanvasManager.js - Handles all canvas operations and rendering
 * Manages the Chatooly-compliant canvas and provides rendering methods
 */

class CanvasManager {
    constructor() {
        // Get Chatooly-compliant canvas
        this.canvas = document.getElementById('chatooly-canvas');
        if (!this.canvas) {
            throw new Error('Canvas with id "chatooly-canvas" not found!');
        }

        this.ctx = this.canvas.getContext('2d');

        // No need to cache dimensions - use canvas.width and canvas.height directly

        // Initialize BackgroundManager
        this.backgroundManager = new BackgroundManager();

        // Debug options object for TextComponent system
        this.debugOptions = {
            showSpotOutlines: true,
            showSpotNumbers: true,
            showTextBounds: false,
            showPadding: false
        };
    }
    
    /**
     * Set canvas dimensions
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    setDimensions(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }
    
    /**
     * Clear the entire canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Fill with background color if not transparent
        if (this.backgroundColor !== 'transparent') {
            this.ctx.fillStyle = this.backgroundColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Render background image if available (from app)
        if (window.employerBrandTool && window.employerBrandTool.backgroundImage) {
            window.employerBrandTool.renderBackgroundImage(this.ctx);
        }
    }
    
    /**
     * Set background color
     * @param {string} color - CSS color string
     */
    setBackgroundColor(color) {
        this.backgroundManager.setBackgroundColor(color);
    }
    
    /**
     * Set background image (for future use)
     * @param {File|HTMLImageElement} image - Background image
     * @param {Function} onLoadCallback - Callback when image is loaded
     */
    setBackgroundImage(image, onLoadCallback = null) {
        this.backgroundManager.setBackgroundImage(image, onLoadCallback);
    }
    
    /**
     * Set background GIF using gifler library
     * @param {string} gifUrl - URL of the GIF file
     * @param {Function} onLoadCallback - Callback when GIF is loaded
     */
    setBackgroundGif(gifUrl, onLoadCallback = null) {
        this.backgroundManager.setBackgroundGif(gifUrl, onLoadCallback);
        // Clear other media when setting GIF
        this.backgroundManager.clearBackgroundImage();
        this.backgroundManager.clearBackgroundVideo();
    }

    /**
     * Set background video
     * @param {File|HTMLVideoElement} video - Video file or element
     * @param {Function} onLoadCallback - Callback when video is loaded
     */
    setBackgroundVideo(video, onLoadCallback = null) {
        this.backgroundManager.setBackgroundVideo(video, onLoadCallback);
        // Clear other media when setting video
        this.backgroundManager.clearBackgroundImage();
        this.backgroundManager.clearBackgroundGif();
    }
    
    /**
     * Set background fit mode
     * @param {string} mode - 'fit', 'fill', or 'stretch'
     */
    setBackgroundFitMode(mode) {
        this.backgroundManager.setBackgroundFitMode(mode);
    }
    
    /**
     * Set padding for background image fit mode
     * @param {Object} padding - {top, bottom, left, right}
     */
    setBackgroundPadding(padding) {
        this.backgroundManager.setPadding(padding);
    }
    
    /**
     * Clear background image
     */
    clearBackgroundImage() {
        this.backgroundManager.clearBackgroundImage();
    }
    
    /**
     * Clear background video
     */
    clearBackgroundVideo() {
        this.backgroundManager.clearBackgroundVideo();
    }
    
    /**
     * Clear all background media (image and video)
     */
    clearBackgroundMedia() {
        this.backgroundManager.clearBackgroundMedia();
    }
    
    /**
     * Render background (color + optional image)
     */
    renderBackground() {
        this.backgroundManager.renderBackground(this.ctx, this.canvas);
    }
    
    
    
    
    /**
     * Render text lines on canvas
     * @param {Array} lines - Array of line objects with text, x, y, width, height
     * @param {Object} textConfig - Text configuration object
     */
    renderText(lines, textConfig) {
        if (!lines || lines.length === 0) return;
        
        this.ctx.save();
        
        // Build font string with styles
        let fontStyle = '';
        if (textConfig.textStyles) {
            if (textConfig.textStyles.italic) fontStyle += 'italic ';
            if (textConfig.textStyles.bold) fontStyle += 'bold ';
        }
        
        // Set font properties
        this.ctx.font = `${fontStyle}${textConfig.fontSize}px ${textConfig.fontFamily || 'Arial'}`;
        this.ctx.fillStyle = textConfig.color || '#000000';
        this.ctx.textBaseline = 'top';
        
        // Render each line
        lines.forEach(line => {
            if (line.text.trim()) {
                // Set alignment for this line and calculate position
                let x, textAlign;
                if (line.alignment === 'center') {
                    textAlign = 'center';
                    x = line.x + line.width / 2;
                } else if (line.alignment === 'right') {
                    textAlign = 'right';
                    x = line.x + line.width;
                } else {
                    textAlign = 'left';
                    x = line.x;
                }
                this.ctx.textAlign = textAlign;
                
                // Draw highlight background if enabled
                if (textConfig.textStyles && textConfig.textStyles.highlight) {
                    this.ctx.save();
                    
                    // Measure text for highlight
                    const metrics = this.ctx.measureText(line.text);
                    const highlightHeight = textConfig.fontSize * 1.2;
                    
                    // Set highlight color
                    this.ctx.fillStyle = textConfig.textStyles.highlightColor || '#ffff00';
                    
                    // Draw highlight rectangle based on alignment
                    let highlightX = line.x;
                    if (line.alignment === 'center') {
                        highlightX = x - metrics.width / 2;
                    } else if (line.alignment === 'right') {
                        highlightX = x - metrics.width;
                    }
                    
                    this.ctx.fillRect(highlightX, line.y - textConfig.fontSize * 0.1, 
                                     metrics.width, highlightHeight);
                    
                    // Restore text color
                    this.ctx.fillStyle = textConfig.color || '#000000';
                    this.ctx.restore();
                }
                
                // Draw the text
                this.ctx.fillText(line.text, x, line.y);
                
                // Draw underline if enabled
                if (textConfig.textStyles && textConfig.textStyles.underline) {
                    this.ctx.save();
                    
                    // Measure text for underline
                    const metrics = this.ctx.measureText(line.text);
                    
                    // Calculate underline position
                    const underlineY = line.y + textConfig.fontSize * 0.9;
                    let underlineX = line.x;
                    
                    if (line.alignment === 'center') {
                        underlineX = x - metrics.width / 2;
                    } else if (line.alignment === 'right') {
                        underlineX = x - metrics.width;
                    }
                    
                    // Draw underline
                    this.ctx.strokeStyle = textConfig.color || '#000000';
                    this.ctx.lineWidth = Math.max(1, textConfig.fontSize / 20);
                    this.ctx.beginPath();
                    this.ctx.moveTo(underlineX, underlineY);
                    this.ctx.lineTo(underlineX + metrics.width, underlineY);
                    this.ctx.stroke();
                    
                    this.ctx.restore();
                }
            }
        });
        
        this.ctx.restore();
        
        // Draw text bounds if debug mode is on
        if (this.debugOptions.showTextBounds) {
            this.renderTextBounds(lines);
        }
    }
    
    /**
     * Render text bounding boxes for debug
     * @param {Array} lines - Array of line objects
     * @private
     */
    renderTextBounds(lines) {
        this.ctx.save();
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([2, 2]);
        
        lines.forEach(line => {
            this.ctx.strokeRect(line.x, line.y, line.width, line.height);
        });
        
        this.ctx.restore();
    }
    
    /**
     * Render padding areas for debug
     * @param {Object} textConfig - Text configuration with padding values
     * @private
     */
    renderPaddingAreas(textConfig) {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.2)'; // Semi-transparent yellow
        this.ctx.strokeStyle = '#ffcc00';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        
        const { paddingTop, paddingBottom, paddingLeft, paddingRight } = textConfig;
        
        // Top padding area
        if (paddingTop > 0) {
            this.ctx.fillRect(0, 0, this.canvas.width, paddingTop);
            this.ctx.strokeRect(0, 0, this.canvas.width, paddingTop);
        }

        // Bottom padding area
        if (paddingBottom > 0) {
            this.ctx.fillRect(0, this.canvas.height - paddingBottom, this.canvas.width, paddingBottom);
            this.ctx.strokeRect(0, this.canvas.height - paddingBottom, this.canvas.width, paddingBottom);
        }

        // Left padding area
        if (paddingLeft > 0) {
            this.ctx.fillRect(0, 0, paddingLeft, this.canvas.height);
            this.ctx.strokeRect(0, 0, paddingLeft, this.canvas.height);
        }

        // Right padding area
        if (paddingRight > 0) {
            this.ctx.fillRect(this.canvas.width - paddingRight, 0, paddingRight, this.canvas.height);
            this.ctx.strokeRect(this.canvas.width - paddingRight, 0, paddingRight, this.canvas.height);
        }
        
        this.ctx.restore();
    }
    
    /**
     * Render all spots
     * @param {Array} spots - Array of Spot objects
     */
    renderSpots(spots) {
        if (!spots || spots.length === 0) return;
        
        spots.forEach(spot => {
            spot.render(this.ctx, this.debugOptions.showSpotOutlines, this.debugOptions.showSpotNumbers, this.backgroundImage);
        });
    }
    
    /**
     * Render debug information
     * @param {Object} debugInfo - Debug information object
     */
    renderDebugInfo(debugInfo) {
        if (!debugInfo) return;
        
        this.ctx.save();
        this.ctx.fillStyle = '#000000';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        let y = 10;
        const lineHeight = 16;
        
        // Render debug text
        if (debugInfo.detectionTime) {
            this.ctx.fillText(`Detection Time: ${debugInfo.detectionTime}ms`, 10, y);
            y += lineHeight;
        }
        
        if (debugInfo.spotsFound) {
            this.ctx.fillText(`Spots Found: ${debugInfo.spotsFound}`, 10, y);
            y += lineHeight;
        }
        
        if (debugInfo.textLines) {
            this.ctx.fillText(`Text Lines: ${debugInfo.textLines}`, 10, y);
            y += lineHeight;
        }
        
        this.ctx.restore();
    }
    
    /**
     * Main render method - renders everything
     * @param {Object} renderData - Object containing all render data
     */
    render(renderData) {
        const {
            textLines = [],
            textConfig = {},
            spots = [],
            debugInfo = null
        } = renderData;
        
        // 1. Render background
        this.renderBackground();
        
        // 2. Render spots (behind text)
        this.renderSpots(spots);
        
        // 3. Render text (on top)
        this.renderText(textLines, textConfig);
        
        // 4. Render padding areas if debug mode is on
        if (this.debugOptions.showPadding && textConfig) {
            this.renderPaddingAreas(textConfig);
        }
        
        // Debug info rendering disabled
    }
    
    /**
     * Set debug visualization options
     * @param {Object} options - Debug options
     */
    setDebugOptions(options) {
        if (options.showSpotOutlines !== undefined) {
            this.debugOptions.showSpotOutlines = options.showSpotOutlines;
        }
        if (options.showSpotNumbers !== undefined) {
            this.debugOptions.showSpotNumbers = options.showSpotNumbers;
        }
        if (options.showTextBounds !== undefined) {
            this.debugOptions.showTextBounds = options.showTextBounds;
        }
        if (options.showPadding !== undefined) {
            this.debugOptions.showPadding = options.showPadding;
        }
    }
    
    /**
     * Get canvas data URL for export (required by Chatooly)
     * @param {string} format - Image format ('png', 'jpeg')
     * @param {number} quality - Quality for JPEG (0-1)
     * @returns {string} Data URL
     */
    toDataURL(format = 'png', quality = 1.0) {
        return this.canvas.toDataURL(`image/${format}`, quality);
    }
    
    /**
     * Get canvas dimensions
     * @returns {{width: number, height: number}}
     */
    getDimensions() {
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }
    
    /**
     * Convert screen coordinates to canvas coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {{x: number, y: number}} Canvas coordinates
     */
    screenToCanvas(screenX, screenY) {
        // Use Chatooly utility if available
        if (window.Chatooly && window.Chatooly.utils && window.Chatooly.utils.mapMouseToCanvas) {
            const mockEvent = { clientX: screenX, clientY: screenY };
            return window.Chatooly.utils.mapMouseToCanvas(mockEvent, this.canvas);
        }

        // Fallback to manual calculation
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (screenX - rect.left) * scaleX,
            y: (screenY - rect.top) * scaleY
        };
    }
    
    /**
     * Find spot at given coordinates
     * @param {number} x - Canvas X coordinate
     * @param {number} y - Canvas Y coordinate
     * @param {Array} spots - Array of spots to search
     * @returns {Spot|null} Found spot or null
     */
    findSpotAt(x, y, spots) {
        // Search in reverse order (top spots first)
        for (let i = spots.length - 1; i >= 0; i--) {
            if (spots[i].contains(x, y)) {
                return spots[i];
            }
        }
        return null;
    }
}