/**
 * ContentCell.js - Grid cell for content areas (replaces Spot + SpotCell)
 * Part of the Unified Grid System
 *
 * Handles all content types: empty, media, text, fill
 */

class ContentCell extends GridCell {
    constructor(contentType, row, col) {
        super(row, col);
        this.cellType = 'content';  // Internal cell type identifier
        this.contentType = contentType || 'empty';  // 'empty' | 'media' | 'text' | 'fill'
        this.content = null;  // Content data (varies by type)

        // Visual properties (for rendering placeholders and outlines)
        this.outlineColor = '#e5e5e5';
        this.fillColor = 'transparent';

        // Set default layer for content cells (behind main text by default)
        this.layerId = 'behind-main-text';

        // Content cells support animations (inherited from GridCell)
        // Animation is applied during rendering via currentOffset transforms
    }

    /**
     * Set content type and initialize default content
     * @param {string} type - 'empty' | 'media' | 'text' | 'fill'
     */
    setContentType(type) {
        this.contentType = type;
        this.content = this._getDefaultContent(type);
    }

    /**
     * Set content data
     * @param {*} content - Content data (structure depends on contentType)
     */
    setContent(content) {
        this.content = content;
    }

    /**
     * Get default content structure for a type
     * @param {string} type - Content type
     * @returns {Object} Default content object
     * @private
     */
    _getDefaultContent(type) {
        switch (type) {
            case 'media':
                return {
                    media: null,
                    mediaType: null,
                    mediaUrl: null,
                    scale: 1.0,
                    rotation: 0,
                    padding: 10,
                    positionH: 'center',
                    positionV: 'middle',
                    fillWithBackgroundColor: false  // Default: show media
                };

            case 'text':
                return {
                    text: '',
                    fontSize: 'auto',
                    fontFamily: '"Wix Madefor Display", Arial, sans-serif',
                    color: '#808080',
                    textAlign: 'center',  // Line alignment (left/center/right)
                    padding: 1,
                    positionH: 'center',  // Where entire text block sits horizontally
                    positionV: 'middle',  // Where entire text block sits vertically
                    styles: {
                        bold: false,
                        italic: false,
                        underline: false,
                        highlight: false
                    },
                    highlightColor: '#ffff00',
                    fillWithBackgroundColor: false  // Default: show image
                };

            case 'fill':
                return {
                    padding: 0  // No padding for solid fills
                };

            default:  // 'empty'
                return null;
        }
    }

    // ===== Type Checking Methods =====

    /**
     * Check if this cell is empty
     * @returns {boolean}
     */
    isEmpty() {
        return this.contentType === 'empty' || !this.content;
    }

    /**
     * Check if this cell has image content
     * @returns {boolean}
     */
    hasImage() {
        return this.contentType === 'media' && this.content && this.content.media;
    }

    /**
     * Check if this cell has text content
     * @returns {boolean}
     */
    hasText() {
        return this.contentType === 'text' && this.content && this.content.text;
    }

    /**
     * Check if this cell is a fill cell
     * @returns {boolean}
     */
    isFill() {
        return this.contentType === 'fill';
    }

    // ===== Spatial Methods (for click detection) =====

    /**
     * Check if a point is inside this cell
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if point is inside
     */
    contains(x, y) {
        return x >= this.bounds.x &&
               x <= this.bounds.x + this.bounds.width &&
               y >= this.bounds.y &&
               y <= this.bounds.y + this.bounds.height;
    }

    /**
     * Get the center point of this cell
     * @returns {{x: number, y: number}} Center coordinates
     */
    getCenter() {
        return {
            x: this.bounds.x + this.bounds.width / 2,
            y: this.bounds.y + this.bounds.height / 2
        };
    }

    /**
     * Get area of this cell
     * @returns {number} Area in pixels
     */
    getArea() {
        return this.bounds.width * this.bounds.height;
    }

    /**
     * Get aspect ratio of this cell
     * @returns {number} Width divided by height
     */
    getAspectRatio() {
        return this.bounds.width / this.bounds.height;
    }

    // ===== Serialization =====

    /**
     * Serialize ContentCell data to JSON
     * @returns {Object} - Serializable representation
     */
    serialize() {
        const baseData = super.serialize();
        return {
            ...baseData,
            cellType: this.cellType,
            contentType: this.contentType,
            content: this.content,
            outlineColor: this.outlineColor,
            fillColor: this.fillColor
        };
    }

    /**
     * Restore ContentCell from serialized data
     * @param {Object} data - Serialized cell data
     * @returns {ContentCell}
     */
    static deserialize(data) {
        const cell = new ContentCell(data.contentType, data.row, data.col);
        cell.id = data.id;
        cell.contentId = data.contentId;
        cell.cellType = data.cellType || 'content'; // Restore cellType
        cell.bounds = data.bounds;
        cell.originalBounds = data.originalBounds;
        cell.content = data.content;
        cell.outlineColor = data.outlineColor || '#e5e5e5';
        cell.fillColor = data.fillColor || 'transparent';

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

    /**
     * Get a summary of this cell for debugging
     * @returns {string} Summary string
     */
    toString() {
        return `ContentCell ${this.id} (${this.contentId}): ${Math.round(this.bounds.width)}x${Math.round(this.bounds.height)} at (${Math.round(this.bounds.x)}, ${Math.round(this.bounds.y)}) - ${this.contentType}`;
    }

    // ========================================
    // Phase 4: Spot Compatibility Interface
    // ========================================
    // These properties/methods provide backward compatibility with legacy Spot UI

    /**
     * Get x coordinate (Spot compatibility)
     * @returns {number}
     */
    get x() {
        return this.bounds ? this.bounds.x : 0;
    }

    /**
     * Set x coordinate (Spot compatibility)
     * @param {number} value
     */
    set x(value) {
        if (this.bounds) this.bounds.x = value;
    }

    /**
     * Get y coordinate (Spot compatibility)
     * @returns {number}
     */
    get y() {
        return this.bounds ? this.bounds.y : 0;
    }

    /**
     * Set y coordinate (Spot compatibility)
     * @param {number} value
     */
    set y(value) {
        if (this.bounds) this.bounds.y = value;
    }

    /**
     * Get width (Spot compatibility)
     * @returns {number}
     */
    get width() {
        return this.bounds ? this.bounds.width : 0;
    }

    /**
     * Set width (Spot compatibility)
     * @param {number} value
     */
    set width(value) {
        if (this.bounds) this.bounds.width = value;
    }

    /**
     * Get height (Spot compatibility)
     * @returns {number}
     */
    get height() {
        return this.bounds ? this.bounds.height : 0;
    }

    /**
     * Set height (Spot compatibility)
     * @param {number} value
     */
    set height(value) {
        if (this.bounds) this.bounds.height = value;
    }

    /**
     * Get type - returns 'content' for grid type checking
     * Use contentType property to get the actual content type ('empty', 'media', etc.)
     * @returns {string}
     */
    get type() {
        return 'content';
    }

    /**
     * Set type (Spot compatibility) - maps to contentType
     * @param {string} value
     */
    set type(value) {
        this.setContentType(value);
    }

    /**
     * Render cell background based on content type and settings
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {BackgroundManager} globalBackground - Global background manager
     */
    renderBackground(ctx, globalBackground) {
        if (this.contentType === 'empty') {
            // Empty cells show global background automatically
            return;
        }
        
        if (this.contentType === 'fill') {
            this.renderFillBackground(ctx, globalBackground);
        } else if (this.contentType === 'media' || this.contentType === 'text') {
            this.renderImageTextBackground(ctx, globalBackground);
        }
    }
    
    /**
     * Render background for fill cells
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {BackgroundManager} globalBackground - Global background manager
     * @private
     */
    renderFillBackground(ctx, globalBackground) {
        if (!this.content) return;
        
        // Always use global background color
        ctx.fillStyle = globalBackground.backgroundColor;
        ctx.fillRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
    }
    
    /**
     * Render background for image/text cells
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {BackgroundManager} globalBackground - Global background manager
     * @private
     */
    renderImageTextBackground(ctx, globalBackground) {
        if (!this.content || !this.content.fillWithBackgroundColor) {
            // Show global background image (already rendered)
            return;
        }
        
        // Always use global background color when filled
        ctx.fillStyle = globalBackground.backgroundColor;
        ctx.fillRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
    }
    
    /**
     * Set fill with background color for image/text cells
     * @param {boolean} enabled - Whether to fill with background color
     */
    setFillWithBackgroundColor(enabled) {
        if (this.content && (this.contentType === 'media' || this.contentType === 'text')) {
            this.content.fillWithBackgroundColor = enabled;
        }
    }
}
