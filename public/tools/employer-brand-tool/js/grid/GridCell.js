/**
 * GridCell.js - Base class for all grid cells
 * Part of the Grid Animation System
 */

class GridCell {
    constructor(row, col) {
        this.row = row;
        this.col = col;
        this.id = null; // Sequential ID (assigned after grid build)
        this.contentId = this._generateContentId(); // Persistent UUID for tracking across rebuilds
        this.type = 'base'; // 'main-text' | 'spot' | 'content' | 'text'
        this.bounds = { x: 0, y: 0, width: 0, height: 0 };
        this.originalBounds = null; // Snapshot for animation reset

        // Animation (Per-cell animation system)
        // This is completely isolated from grid structure
        // cell.bounds remains unchanged - only currentOffset affects rendering
        this.animation = null;          // CellAnimation instance or null
        this.currentOffset = { x: 0, y: 0 }; // Visual rendering offset (non-destructive)

        // Layer system (NEW)
        this.layerId = 'behind-main-text'; // Default layer assignment
        this.layerOrder = 0; // Order within layer (for future use)
        this.layerManager = null; // Reference to LayerManager (injected later)
    }

    /**
     * Generate unique content ID for this cell
     * @returns {string} - UUID v4
     * @private
     */
    _generateContentId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Set animation for this cell
     * @param {string} type - Animation type ('sway', 'bounce', 'rotate', 'pulse')
     * @param {number} intensity - Animation intensity in pixels (default: 20)
     * @param {number} speed - Speed multiplier (default: 1.0)
     */
    setAnimation(type, intensity = 20, speed = 1.0) {
        // Remove existing animation if present
        if (this.animation) {
            this.animation.pause();
            this.animation = null;
        }

        // Create new animation for supported cell types
        // Supports: 'main-text', 'text', 'spot', 'content'
        if (this.type === 'main-text' || this.type === 'text' || this.type === 'spot' || this.type === 'content') {
            this.animation = new CellAnimation(this, { type, intensity, speed });
        }
    }

    /**
     * Remove animation from this cell
     */
    removeAnimation() {
        if (this.animation) {
            this.animation.pause();
            this.animation = null;
        }
        this.currentOffset = { x: 0, y: 0 };
    }

    /**
     * Reset to original position (before animations)
     */
    resetToOriginal() {
        if (this.originalBounds) {
            this.bounds = { ...this.originalBounds };
        }
        this.currentOffset = { x: 0, y: 0 };
    }

    /**
     * Save current bounds as original for animation reset
     */
    saveOriginalBounds() {
        this.originalBounds = { ...this.bounds };
    }

    /**
     * Get the center point of this cell
     * @returns {Object} - {x, y} coordinates of center
     */
    getCenter() {
        return {
            x: this.bounds.x + this.bounds.width / 2,
            y: this.bounds.y + this.bounds.height / 2
        };
    }

    /**
     * Check if a point is inside this cell
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if point is inside cell bounds
     */
    contains(x, y) {
        return x >= this.bounds.x && 
               x <= this.bounds.x + this.bounds.width &&
               y >= this.bounds.y && 
               y <= this.bounds.y + this.bounds.height;
    }

    /**
     * Set the layer manager reference for this cell
     * @param {LayerManager} layerManager - LayerManager instance
     */
    setLayerManager(layerManager) {
        this.layerManager = layerManager;
    }

    /**
     * Set the layer for this cell
     * @param {string} layerId - Layer ID to assign this cell to
     * @returns {boolean} True if assignment was successful
     */
    setLayer(layerId) {
        if (!this.layerManager) {
            console.warn('LayerManager not set for cell, cannot assign layer');
            return false;
        }
        
        return this.layerManager.assignCellToLayer(this, layerId);
    }

    /**
     * Get the current layer ID
     * @returns {string} Current layer ID
     */
    getLayerId() {
        return this.layerId;
    }

    /**
     * Get the current layer instance
     * @returns {Layer|null} Current layer instance or null
     */
    getLayer() {
        if (!this.layerManager) return null;
        return this.layerManager.getLayer(this.layerId);
    }

    /**
     * Check if this cell is in a specific layer
     * @param {string} layerId - Layer ID to check
     * @returns {boolean} True if cell is in the specified layer
     */
    isInLayer(layerId) {
        return this.layerId === layerId;
    }

    /**
     * Serialize cell data to JSON
     * @returns {Object} - Serializable representation
     */
    serialize() {
        return {
            id: this.id,
            contentId: this.contentId,
            row: this.row,
            col: this.col,
            type: this.type,
            bounds: this.bounds,
            originalBounds: this.originalBounds,
            layerId: this.layerId,
            layerOrder: this.layerOrder,
            animation: this.animation ? {
                type: this.animation.type,
                intensity: this.animation.intensity,
                speed: this.animation.speed,
                isPlaying: this.animation.isPlaying
            } : null
        };
    }

    /**
     * Restore cell from serialized data
     * @param {Object} data - Serialized cell data
     */
    static deserialize(data) {
        const cell = new GridCell(data.row, data.col);
        cell.id = data.id;
        cell.contentId = data.contentId;
        cell.type = data.type;
        cell.bounds = data.bounds;
        cell.originalBounds = data.originalBounds;
        
        // Restore layer information
        cell.layerId = data.layerId || 'behind-main-text';
        cell.layerOrder = data.layerOrder || 0;

        // Restore animation if present
        if (data.animation) {
            cell.setAnimation(
                data.animation.type,
                data.animation.intensity,
                data.animation.speed
            );
            if (data.animation.isPlaying && cell.animation) {
                cell.animation.play();
            }
        }

        return cell;
    }
}