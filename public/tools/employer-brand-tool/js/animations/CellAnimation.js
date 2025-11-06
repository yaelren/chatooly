/**
 * CellAnimation.js - Simple per-cell animation for any GridCell
 *
 * Core Principles:
 * - Self-contained: Each instance manages its own RAF loop
 * - Non-destructive: Only updates cell.currentOffset, never cell.bounds
 * - Independent: No grid coordination or neighbor propagation
 * - Isolated: Cell animation state doesn't affect grid building
 */

class CellAnimation {
    constructor(cell, config = {}) {
        this.cell = cell;                        // Reference to parent GridCell
        this.type = config.type || 'sway';       // Animation type
        this.intensity = config.intensity || 20; // Movement intensity (pixels)
        this.speed = config.speed || 1.0;        // Speed multiplier

        // Animation state
        this.isPlaying = false;
        this.startTime = 0;
        this.animationFrameId = null;
    }

    /**
     * Start animation playback
     */
    play() {
        if (this.isPlaying) {
            return;
        }

        this.isPlaying = true;
        this.startTime = performance.now();
        this._animate();
    }

    /**
     * Pause animation playback
     */
    pause() {
        if (!this.isPlaying) {
            return;
        }

        this.isPlaying = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Reset animation to starting state
     */
    reset() {
        this.pause();

        // Reset cell's visual offset to zero
        this.cell.currentOffset = { x: 0, y: 0 };
    }

    /**
     * Update animation configuration
     * @param {Object} config - Configuration updates
     */
    updateConfig(config) {
        if (config.type !== undefined) this.type = config.type;
        if (config.intensity !== undefined) this.intensity = config.intensity;
        if (config.speed !== undefined) this.speed = config.speed;
    }

    /**
     * Get current animation status
     * @returns {Object} - Status information
     */
    getStatus() {
        return {
            type: this.type,
            intensity: this.intensity,
            speed: this.speed,
            isPlaying: this.isPlaying,
            currentOffset: this.cell.currentOffset
        };
    }

    /**
     * Main animation loop (private)
     * Updates cell.currentOffset based on elapsed time
     * @private
     */
    _animate() {
        if (!this.isPlaying) return;

        const elapsed = performance.now() - this.startTime;

        // Calculate offset and update cell (non-destructive)
        this.cell.currentOffset = this._calculateOffset(elapsed);

        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(() => this._animate());
    }

    /**
     * Calculate animation offset based on type and time
     * @param {number} time - Elapsed time in milliseconds
     * @returns {Object} - Offset object {x, y, rotation?, scale?}
     * @private
     */
    _calculateOffset(time) {
        // Convert to seconds and apply speed multiplier
        const t = (time / 1000) * this.speed;

        switch (this.type) {
            case 'sway':
                return this._calculateSway(t);

            case 'bounce':
                return this._calculateBounce(t);

            case 'rotate':
                return this._calculateRotate(t);

            case 'pulse':
                return this._calculatePulse(t);

            default:
                return { x: 0, y: 0 };
        }
    }

    /**
     * Calculate horizontal sway animation
     * @param {number} t - Time in seconds
     * @returns {Object} - Offset with horizontal movement
     * @private
     */
    _calculateSway(t) {
        // Gentle sine wave for horizontal movement
        return {
            x: Math.sin(t * 2) * this.intensity,
            y: 0
        };
    }

    /**
     * Calculate vertical bounce animation
     * @param {number} t - Time in seconds
     * @returns {Object} - Offset with vertical movement
     * @private
     */
    _calculateBounce(t) {
        // Faster sine wave for bouncy effect
        return {
            x: 0,
            y: Math.sin(t * 3) * this.intensity
        };
    }

    /**
     * Calculate rotation animation
     * @param {number} t - Time in seconds
     * @returns {Object} - Offset with rotation in radians
     * @private
     */
    _calculateRotate(t) {
        // Gentle rotation oscillation
        const maxRotation = 0.2; // ~11.5 degrees max
        const rotationAmount = (this.intensity / 20) * maxRotation; // Scale by intensity

        return {
            x: 0,
            y: 0,
            rotation: Math.sin(t * 2) * rotationAmount
        };
    }

    /**
     * Calculate pulse (scale) animation
     * @param {number} t - Time in seconds
     * @returns {Object} - Offset with scale factor
     * @private
     */
    _calculatePulse(t) {
        // Subtle scale pulsing
        const maxScaleChange = 0.2; // 20% size change max
        const scaleAmount = (this.intensity / 20) * maxScaleChange; // Scale by intensity

        return {
            x: 0,
            y: 0,
            scale: 1 + Math.sin(t * 2) * scaleAmount
        };
    }

    /**
     * Destroy animation and clean up resources
     */
    destroy() {
        this.reset();
        this.cell = null;
    }
}
