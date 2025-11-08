/**
 * MainTextCell.js - Grid cell for main text lines
 * Extends GridCell for grid functionality, uses TextComponent for typography
 * Part of the Grid Animation System
 */

class MainTextCell extends GridCell {
    constructor(text, lineIndex, row, col) {
        super(row, col);
        
        // Grid-specific properties
        this.type = 'main-text';
        this.lineIndex = lineIndex;

        // Override contentId with content-based ID for text cells
        // This ensures text cells with same content get same ID across rebuilds
        this.contentId = this._generateTextContentId(text, lineIndex);

        // Create TextComponent instance for typography and styling
        this.textComponent = new TextComponent();
        this.textComponent.text = text;

        // Set default layer for main text (should be on top by default)
        this.layerId = 'main-text';

        // Background properties for main text cells
        this.fillWithBackgroundColor = false;  // Default: show global background

        // Text cells support animations (inherited from GridCell)
    }

    /**
     * Generate content-based ID for text cells
     * @param {string} text - Text content
     * @param {number} lineIndex - Line index
     * @returns {string} - Content-based ID
     * @private
     */
    _generateTextContentId(text, lineIndex) {
        // Simple hash function for text
        const hash = this._hashString(text);
        return `text-${lineIndex}-${hash}`;
    }

    /**
     * Simple string hash function
     * @param {string} str - String to hash
     * @returns {string} - Hash string
     * @private
     */
    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Update text content
     * @param {string} newText - New text content
     */
    setText(newText) {
        this.textComponent.text = newText;
        // Update contentId when text changes
        this.contentId = this._generateTextContentId(newText, this.lineIndex);
        // Invalidate TextComponent cache
        this.textComponent.invalidateCache();
    }

    /**
     * Get text content
     * @returns {string} - Text content
     */
    get text() {
        return this.textComponent.text;
    }

    /**
     * Set text content
     * @param {string} value - Text content
     */
    set text(value) {
        this.textComponent.text = value;
    }

    /**
     * Update text style properties (delegates to TextComponent)
     * @param {Object} styleUpdates - Style properties to update
     */
    updateStyle(styleUpdates) {
        
        // Map style updates to TextComponent properties
        if (styleUpdates.fontSize !== undefined) this.textComponent.fontSize = styleUpdates.fontSize;
        if (styleUpdates.fontFamily !== undefined) this.textComponent.fontFamily = styleUpdates.fontFamily;
        if (styleUpdates.color !== undefined) this.textComponent.color = styleUpdates.color;
        if (styleUpdates.alignment !== undefined) this.textComponent.alignH = styleUpdates.alignment;
        if (styleUpdates.bold !== undefined) this.textComponent.fontWeight = styleUpdates.bold ? 'bold' : 'normal';
        if (styleUpdates.italic !== undefined) this.textComponent.fontStyle = styleUpdates.italic ? 'italic' : 'normal';
        if (styleUpdates.underline !== undefined) this.textComponent.underline = styleUpdates.underline;
        if (styleUpdates.highlight !== undefined) this.textComponent.highlight = styleUpdates.highlight;
        if (styleUpdates.highlightColor !== undefined) this.textComponent.highlightColor = styleUpdates.highlightColor;
        
        
        // Invalidate cache when styles change
        this.textComponent.invalidateCache();
    }

    /**
     * Get text style as CSS font string (delegates to TextComponent)
     * @returns {string} - CSS font string
     */
    getFontString() {
        return this.textComponent.getFontString();
    }

    /**
     * Check if this text cell is empty
     * @returns {boolean}
     */
    isEmpty() {
        return !this.textComponent.text || this.textComponent.text.trim().length === 0;
    }

    /**
     * Get the current alignment of this text cell (delegates to TextComponent)
     * @returns {string} - Alignment value ('left', 'center', 'right')
     */
    getAlignment() {
        return this.textComponent.alignH;
    }

    /**
     * Render cell background based on settings
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {BackgroundManager} globalBackground - Global background manager
     */
    renderBackground(ctx, globalBackground) {
        if (!this.fillWithBackgroundColor) {
            // Show global background (already rendered)
            return;
        }
        
        // Always use global background color when filled
        ctx.fillStyle = globalBackground.backgroundColor;
        ctx.fillRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
    }

    /**
     * Set fill with background color for main text cells
     * @param {boolean} enabled - Whether to fill with background color
     */
    setFillWithBackgroundColor(enabled) {
        this.fillWithBackgroundColor = enabled;
    }

    /**
     * Serialize MainTextCell data to JSON
     * @returns {Object} - Serializable representation
     */
    serialize() {
        // Get base GridCell data
        const baseData = super.serialize();
        
        // Get TextComponent data
        const textData = this.textComponent.toJSON();
        
        return {
            ...baseData,
            ...textData,
            lineIndex: this.lineIndex,
            fillWithBackgroundColor: this.fillWithBackgroundColor
        };
    }

    /**
     * Restore MainTextCell from serialized data
     * @param {Object} data - Serialized cell data
     * @returns {MainTextCell}
     */
    static deserialize(data) {
        const cell = new MainTextCell(data.text, data.lineIndex, data.row, data.col);
        
        // Restore base GridCell properties
        cell.id = data.id;
        cell.contentId = data.contentId;
        cell.bounds = data.bounds;
        cell.originalBounds = data.originalBounds;
        
        // Restore TextComponent properties
        cell.textComponent.fromJSON(data);
        
        // Restore background properties
        cell.fillWithBackgroundColor = data.fillWithBackgroundColor || false;
        
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