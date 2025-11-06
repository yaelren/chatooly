/**
 * GridSnapshot.js - Comprehensive state management for Grid Animation System
 * Part of the Grid Animation System - Day 2 Implementation
 */

class GridSnapshot {
    constructor(grid, canvas, config) {
        this.timestamp = Date.now();
        this.version = '1.0.0';

        // Grid state
        this.gridData = grid ? grid.serialize() : null;

        // Canvas state
        this.canvasState = this._captureCanvasState(canvas);

        // Application configuration
        this.config = this._captureConfig(config);

        // Animation state
        this.animationState = this._captureAnimationState(grid);
    }

    /**
     * Capture canvas state including dimensions and styling
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {Object} - Canvas state object
     * @private
     */
    _captureCanvasState(canvas) {
        if (!canvas) return null;

        return {
            width: canvas.width,
            height: canvas.height,
            backgroundColor: canvas.style.backgroundColor || '#ffffff',
            transform: canvas.style.transform || 'none',
            // Capture current visual state without pixel data for performance
            hasContent: canvas.width > 0 && canvas.height > 0
        };
    }

    /**
     * Capture application configuration state
     * @param {Object} config - Configuration object from app
     * @returns {Object} - Configuration snapshot
     * @private
     */
    _captureConfig(config) {
        if (!config) return {};

        // Extract key configuration that affects layout and animation
        return {
            textEngine: config.textEngine ? {
                fontSize: config.textEngine.fontSize,
                fontFamily: config.textEngine.fontFamily,
                color: config.textEngine.color,
                mode: config.textEngine.mode
            } : null,

            canvas: config.canvas ? {
                padding: config.canvas.padding,
                dimensions: config.canvas.dimensions
            } : null,

            spots: config.spots ? {
                minSize: config.spots.minSize,
                autoDetect: config.spots.autoDetect
            } : null,

            debug: config.debug ? {
                showOutlines: config.debug.showOutlines,
                showNumbers: config.debug.showNumbers
            } : null
        };
    }

    /**
     * Capture current animation state from grid
     * @param {Grid} grid - Grid instance
     * @returns {Object} - Animation state
     * @private
     */
    _captureAnimationState(grid) {
        if (!grid || !grid.isGridReady()) return null;

        const animatingCells = grid.getAllCells().filter(cell =>
            cell.animation && cell.animation.type !== 'none'
        );

        return {
            isAnimating: animatingCells.length > 0,
            activeAnimations: animatingCells.map(cell => ({
                row: cell.row,
                col: cell.col,
                type: cell.animation.type,
                intensity: cell.animation.intensity,
                currentOffset: { ...cell.animation.currentOffset }
            })),
            gridLocked: grid.isLocked || false
        };
    }

    /**
     * Serialize complete snapshot to JSON
     * @returns {Object} - Complete serializable snapshot
     */
    serialize() {
        return {
            metadata: {
                timestamp: this.timestamp,
                version: this.version,
                type: 'GridSnapshot'
            },
            grid: this.gridData,
            canvas: this.canvasState,
            config: this.config,
            animation: this.animationState
        };
    }

    /**
     * Restore GridSnapshot from serialized JSON data
     * @param {Object} json - Serialized snapshot data
     * @returns {GridSnapshot} - Restored snapshot instance
     */
    static deserialize(json) {
        try {
            // Validate JSON structure
            if (!json.metadata || json.metadata.type !== 'GridSnapshot') {
                throw new Error('Invalid snapshot format');
            }

            // Create new snapshot instance
            const snapshot = Object.create(GridSnapshot.prototype);

            // Restore metadata
            snapshot.timestamp = json.metadata.timestamp;
            snapshot.version = json.metadata.version;

            // Restore state data
            snapshot.gridData = json.grid;
            snapshot.canvasState = json.canvas;
            snapshot.config = json.config;
            snapshot.animationState = json.animation;

            return snapshot;

        } catch (error) {
            console.error('❌ Failed to deserialize GridSnapshot:', error);
            throw error;
        }
    }

    /**
     * Validate snapshot integrity
     * @returns {Object} - Validation result with success status and any issues
     */
    validate() {
        const issues = [];
        let success = true;

        // Check metadata
        if (!this.timestamp || !this.version) {
            issues.push('Missing or invalid metadata');
            success = false;
        }

        // Check grid data
        if (this.gridData) {
            if (!this.gridData.layout || !this.gridData.layout.cells) {
                issues.push('Invalid grid data structure');
                success = false;
            }
        }

        // Check canvas state
        if (this.canvasState) {
            if (!this.canvasState.width || !this.canvasState.height ||
                this.canvasState.width <= 0 || this.canvasState.height <= 0) {
                issues.push('Invalid canvas dimensions');
                success = false;
            }
        }

        // Check version compatibility
        const currentVersion = '1.0.0';
        if (this.version !== currentVersion) {
            issues.push(`Version mismatch: snapshot ${this.version}, current ${currentVersion}`);
            // Note: This is a warning, not a failure for minor version differences
        }

        return {
            success,
            issues,
            timestamp: this.timestamp,
            version: this.version
        };
    }

    /**
     * Get snapshot metadata for display
     * @returns {Object} - Human-readable snapshot information
     */
    getInfo() {
        const cellCount = this.gridData?.layout?.cells?.length || 0;
        const animationCount = this.animationState?.activeAnimations?.length || 0;

        return {
            timestamp: new Date(this.timestamp).toLocaleString(),
            version: this.version,
            gridCells: cellCount,
            activeAnimations: animationCount,
            canvasSize: this.canvasState ?
                `${this.canvasState.width}×${this.canvasState.height}` : 'Unknown',
            isAnimating: this.animationState?.isAnimating || false,
            isValid: this.validate().success
        };
    }

    /**
     * Create a deep copy of this snapshot
     * @returns {GridSnapshot} - Cloned snapshot
     */
    clone() {
        const serialized = this.serialize();
        return GridSnapshot.deserialize(serialized);
    }

    /**
     * Compare this snapshot with another
     * @param {GridSnapshot} other - Another snapshot to compare
     * @returns {Object} - Comparison result
     */
    compare(other) {
        if (!(other instanceof GridSnapshot)) {
            return { error: 'Cannot compare with non-GridSnapshot object' };
        }

        const thisData = this.serialize();
        const otherData = other.serialize();

        return {
            timeDiff: Math.abs(this.timestamp - other.timestamp),
            gridChanged: JSON.stringify(thisData.grid) !== JSON.stringify(otherData.grid),
            canvasChanged: JSON.stringify(thisData.canvas) !== JSON.stringify(otherData.canvas),
            configChanged: JSON.stringify(thisData.config) !== JSON.stringify(otherData.config),
            animationChanged: JSON.stringify(thisData.animation) !== JSON.stringify(otherData.animation)
        };
    }
}