/**
 * ContentSlotManager.js - Content Slots creation and management
 *
 * Workflow:
 * 1. Designer marks cell as "editable" in SavePageModal
 * 2. Designer configures slot constraints (text/image)
 * 3. ContentSlotManager captures cell.bounds automatically
 * 4. ContentSlotManager creates ContentSlot object
 * 5. ContentSlot saved with page data to Wix CMS
 *
 * Key Innovation: Auto-capture bounding boxes from existing cell.bounds
 * - No manual coordinate entry needed
 * - Always accurate positioning
 * - Survives grid rebuilds via contentId tracking
 */

class ContentSlotManager {
    constructor(app) {
        this.app = app;
        this.slots = []; // Array of ContentSlot objects for current page
    }

    /**
     * Capture ACTUAL content bounding box (not cell bounds)
     * Calculates the precise bounds of the rendered content (text or image)
     *
     * @param {GridCell} cell - Grid cell (MainTextCell, TextCell, or ContentCell)
     * @returns {BoundingBox} Bounding box {x, y, width, height}
     */
    captureBoundingBox(cell) {
        if (!cell || !cell.bounds) {
            throw new Error('Invalid cell: missing bounds property');
        }

        // For text cells, calculate actual text bounds
        if (cell.type === 'main-text' || cell.type === 'text') {
            return this._captureTextBounds(cell);
        }

        // For content cells, check content type
        if (cell.type === 'content' || cell.type === 'spot') {
            if (cell.content) {
                // Text content in a content cell
                if (cell.content.type === 'text' || cell.content.text !== undefined) {
                    return this._captureTextBounds(cell);
                }
                // Image/media content
                // 🎯 FIX: Old presets don't set content.type or content.mediaType, only content.media
                if (cell.content.type === 'media' || cell.content.mediaType || cell.content.media) {
                    return this._captureMediaBounds(cell);
                }
            }
            // Empty content cell - use full cell bounds
            return this._copyBounds(cell.bounds);
        }

        // Fallback: use cell bounds
        return this._copyBounds(cell.bounds);
    }

    /**
     * Copy bounds object
     * @private
     */
    _copyBounds(bounds) {
        return {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height
        };
    }

    /**
     * Calculate actual text content bounds
     * Uses typography-aware measurement like TextComponent
     * @private
     */
    _captureTextBounds(cell) {
        // 🎯 FIXED: TextComponent container may not be set, use cell bounds directly
        // For main text cells and content cells with text, calculate tight bounds

        // First, ensure TextComponent container is synced with cell bounds
        if (cell.textComponent && cell.bounds) {
            // Sync container to cell bounds if not already set
            if (cell.textComponent.containerWidth === 0 || cell.textComponent.containerHeight === 0) {
                cell.textComponent.setContainer(
                    cell.bounds.x,
                    cell.bounds.y,
                    cell.bounds.width,
                    cell.bounds.height
                );
            }

            // Now use getTextBounds() with proper container
            const ctx = this.app.canvasManager.ctx;
            const textBounds = cell.textComponent.getTextBounds(ctx);

            if (textBounds && textBounds.length > 0) {
                // Calculate bounding box that encompasses all lines
                let minX = Infinity;
                let minY = Infinity;
                let maxX = -Infinity;
                let maxY = -Infinity;

                textBounds.forEach(lineBounds => {
                    minX = Math.min(minX, lineBounds.x);
                    minY = Math.min(minY, lineBounds.y);
                    maxX = Math.max(maxX, lineBounds.x + lineBounds.width);
                    maxY = Math.max(maxY, lineBounds.y + lineBounds.height);
                });

                return {
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY
                };
            }
        }

        // 🎯 FIX: For content cells, try to use textComponent if available (like renderer does)
        // If textComponent exists and has getTextBounds, use it for accurate positioning
        if (cell.textComponent && cell.textComponent.getTextBounds) {
            // Ensure container is synced
            if (cell.textComponent.containerWidth === 0 || cell.textComponent.containerHeight === 0) {
                cell.textComponent.setContainer(
                    cell.bounds.x,
                    cell.bounds.y,
                    cell.bounds.width,
                    cell.bounds.height
                );
            }

            const ctx = this.app.canvasManager.ctx;
            const textBounds = cell.textComponent.getTextBounds(ctx);

            if (textBounds && textBounds.length > 0) {
                // Calculate encompassing box for all lines
                let minX = Infinity, minY = Infinity;
                let maxX = -Infinity, maxY = -Infinity;

                textBounds.forEach(lineBounds => {
                    minX = Math.min(minX, lineBounds.x);
                    minY = Math.min(minY, lineBounds.y);
                    maxX = Math.max(maxX, lineBounds.x + lineBounds.width);
                    maxY = Math.max(maxY, lineBounds.y + lineBounds.height);
                });

                return {
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY
                };
            }
        }

        // Fallback: For content cells without textComponent, calculate bounds manually
        const ctx = this.app.canvasManager.ctx;
        ctx.save();

        // Get text properties
        const text = cell.text || cell.content?.text || '';
        const fontSize = cell.textComponent?.fontSize || cell.content?.fontSize || 16;
        const fontFamily = cell.textComponent?.fontFamily || cell.content?.fontFamily || 'Arial';
        const fontWeight = cell.textComponent?.fontWeight || cell.content?.fontWeight || 'normal';
        const textAlign = cell.textComponent?.alignH || cell.content?.textAlign || 'center';
        const padding = cell.content?.padding || cell.padding || 0;

        // Get positioning properties (where in cell to position text)
        const positionH = cell.content?.positionH || 'center';
        const positionV = cell.content?.positionV || 'middle';

        // Set font for measurement
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

        // Measure text
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;

        // Use actualBoundingBox for accurate height if available
        let textHeight;
        if (metrics.actualBoundingBoxAscent !== undefined && metrics.actualBoundingBoxDescent !== undefined) {
            textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        } else {
            // Fallback: Use typography-aware height based on capital/lowercase detection
            const hasCapitals = /[A-Z]/.test(text);
            // Use more accurate height estimate based on whether text has capitals
            textHeight = hasCapitals ? fontSize * 0.72 : fontSize * 0.5; // capHeight ≈ 0.72em, xHeight ≈ 0.5em
        }

        // Calculate content area (cell minus padding)
        const contentX = cell.bounds.x + padding;
        const contentY = cell.bounds.y + padding;
        const contentWidth = cell.bounds.width - padding * 2;
        const contentHeight = cell.bounds.height - padding * 2;

        // Calculate text position based on positionH and positionV
        let textX, textY;

        // Horizontal positioning (where in cell)
        switch (positionH) {
            case 'left':
                // Text starts at left edge
                switch (textAlign) {
                    case 'left':
                        textX = contentX;
                        break;
                    case 'right':
                        textX = contentX - textWidth;
                        break;
                    case 'center':
                    default:
                        textX = contentX - textWidth / 2;
                        break;
                }
                break;
            case 'right':
                // Text aligned to right edge
                switch (textAlign) {
                    case 'left':
                        textX = contentX + contentWidth;
                        break;
                    case 'right':
                        textX = contentX + contentWidth - textWidth;
                        break;
                    case 'center':
                    default:
                        textX = contentX + contentWidth - textWidth / 2;
                        break;
                }
                break;
            case 'center':
            default:
                // Text centered in cell
                switch (textAlign) {
                    case 'left':
                        textX = contentX + (contentWidth - textWidth) / 2;
                        break;
                    case 'right':
                        textX = contentX + (contentWidth + textWidth) / 2 - textWidth;
                        break;
                    case 'center':
                    default:
                        textX = contentX + (contentWidth - textWidth) / 2;
                        break;
                }
                break;
        }

        // Vertical positioning (where in cell)
        switch (positionV) {
            case 'top':
                textY = contentY;
                break;
            case 'bottom':
                textY = contentY + contentHeight - textHeight;
                break;
            case 'middle':
            default:
                textY = contentY + (contentHeight - textHeight) / 2;
                break;
        }

        ctx.restore();

        return {
            x: textX,
            y: textY,
            width: textWidth,
            height: textHeight
        };
    }

    /**
     * Calculate actual media content bounds
     * @private
     */
    _captureMediaBounds(cell) {
        const content = cell.content;
        if (!content) return this._copyBounds(cell.bounds);

        // Get padding and content area
        // 🎯 FIX: Padding is stored in cell.content.padding for content cells
        const padding = content.padding || cell.padding || 0;
        const contentX = cell.bounds.x + padding;
        const contentY = cell.bounds.y + padding;
        const contentWidth = cell.bounds.width - padding * 2;
        const contentHeight = cell.bounds.height - padding * 2;

        // Get media dimensions
        const media = content.media;
        if (!media) return this._copyBounds(cell.bounds);

        const mediaWidth = media.videoWidth || media.naturalWidth || media.width || contentWidth;
        const mediaHeight = media.videoHeight || media.naturalHeight || media.height || contentHeight;
        const mediaAspect = mediaWidth / mediaHeight;
        const contentAspect = contentWidth / contentHeight;

        // Get settings
        const scale = content.scale || 1.0;
        const fillMode = content.fillMode || 'fit';
        const positionH = content.positionH || 'center';
        const positionV = content.positionV || 'middle';

        let drawWidth, drawHeight;

        // Calculate dimensions based on fill mode
        switch (fillMode) {
            case 'fill':
                if (mediaAspect > contentAspect) {
                    drawWidth = contentHeight * mediaAspect;
                    drawHeight = contentHeight;
                } else {
                    drawWidth = contentWidth;
                    drawHeight = contentWidth / mediaAspect;
                }
                break;
            case 'stretch':
                drawWidth = contentWidth;
                drawHeight = contentHeight;
                break;
            case 'fit':
            default:
                // 🎯 FIX: Cell-relative scaling to match CellRenderer behavior
                // First fit to cell dimensions, THEN apply scale multiplier
                // This ensures bounding box matches what's actually rendered
                if (mediaAspect > contentAspect) {
                    // Media is wider - fit to width, then scale
                    drawWidth = contentWidth * scale;
                    drawHeight = (contentWidth / mediaAspect) * scale;
                } else {
                    // Media is taller - fit to height, then scale
                    drawWidth = (contentHeight * mediaAspect) * scale;
                    drawHeight = contentHeight * scale;
                }
                break;
        }

        // Calculate position
        let anchorX, anchorY;

        switch (positionH) {
            case 'left':
                anchorX = contentX + drawWidth / 2;
                break;
            case 'right':
                anchorX = contentX + contentWidth - drawWidth / 2;
                break;
            case 'center':
            default:
                anchorX = contentX + contentWidth / 2;
                break;
        }

        switch (positionV) {
            case 'top':
                anchorY = contentY + drawHeight / 2;
                break;
            case 'bottom':
                anchorY = contentY + contentHeight - drawHeight / 2;
                break;
            case 'middle':
            default:
                anchorY = contentY + contentHeight / 2;
                break;
        }

        // Calculate final bounds (top-left corner and dimensions)
        let finalX = anchorX - drawWidth / 2;
        let finalY = anchorY - drawHeight / 2;
        let finalWidth = drawWidth;
        let finalHeight = drawHeight;

        // For fill and stretch modes, clip to content area (match CellRenderer behavior)
        if (fillMode === 'fill' || fillMode === 'stretch') {
            // Calculate intersection with content area
            const right = Math.min(finalX + finalWidth, contentX + contentWidth);
            const bottom = Math.min(finalY + finalHeight, contentY + contentHeight);
            finalX = Math.max(finalX, contentX);
            finalY = Math.max(finalY, contentY);
            finalWidth = right - finalX;
            finalHeight = bottom - finalY;
        }

        // 🎯 FIX: Account for rotation - transform bounding box
        const rotation = content.rotation || 0;
        if (rotation !== 0) {
            // Calculate rotated bounding box
            // Rotation happens around the center point (anchorX, anchorY)
            const angle = (rotation * Math.PI) / 180;
            const cos = Math.abs(Math.cos(angle));
            const sin = Math.abs(Math.sin(angle));

            // Rotated bounds width/height (axis-aligned bounding box)
            const rotatedWidth = finalWidth * cos + finalHeight * sin;
            const rotatedHeight = finalWidth * sin + finalHeight * cos;

            // Update bounds to encompass rotated rectangle
            finalX = anchorX - rotatedWidth / 2;
            finalY = anchorY - rotatedHeight / 2;
            finalWidth = rotatedWidth;
            finalHeight = rotatedHeight;
        }

        return {
            x: finalX,
            y: finalY,
            width: finalWidth,
            height: finalHeight
        };
    }

    /**
     * Create content slot from a grid cell with designer configuration
     *
     * @param {GridCell} cell - Grid cell to make editable
     * @param {Object} config - Designer configuration
     * @param {string} config.fieldName - Form field name (e.g., 'headline', 'companyLogo')
     * @param {string} config.fieldLabel - Form field label (e.g., 'Hero Headline')
     * @param {string} config.fieldDescription - Form field description
     * @param {boolean} config.required - Whether field is required
     * @param {Object} config.constraints - Type-specific constraints (optional, uses defaults)
     * @returns {ContentSlot} Complete content slot object
     */
    createSlotFromCell(cell, config) {
        // Validate inputs
        if (!cell || !cell.id) {
            throw new Error('Invalid cell: missing id property');
        }

        if (!config || !config.fieldName || !config.fieldLabel) {
            throw new Error('Invalid config: fieldName and fieldLabel are required');
        }

        // Determine slot type from cell type
        const slotType = this._determineSlotType(cell);

        // Build content slot object
        const slot = {
            slotId: `${cell.id}-slot`, // e.g., 'text-cell-1-slot'
            sourceElement: cell.id,
            sourceContentId: cell.contentId, // UUID for tracking across rebuilds
            type: slotType,

            // AUTO-CAPTURED bounding box
            boundingBox: this.captureBoundingBox(cell),

            // Designer-configured constraints
            constraints: this.buildConstraints(cell, slotType, config.constraints),

            // Locked styling
            styling: this.extractStyling(cell, slotType),

            // Default content
            defaultContent: this.extractContent(cell, slotType),

            // Form metadata
            fieldName: config.fieldName,
            fieldLabel: config.fieldLabel,
            fieldDescription: config.fieldDescription || '',
            required: config.required !== undefined ? config.required : false
        };

        // Validate slot before returning
        this.validateSlot(slot);

        console.log(`✅ Created content slot: ${slot.slotId} (${slot.type})`);
        return slot;
    }

    /**
     * Determine slot type from cell type
     * @param {GridCell} cell - Grid cell
     * @returns {string} 'text' | 'image'
     * @private
     */
    _determineSlotType(cell) {
        if (cell.type === 'main-text' || cell.type === 'text') {
            return 'text';
        }

        if (cell.type === 'content' || cell.type === 'spot') {
            // Check if content exists and determine type
            if (cell.content) {
                // Check for text content
                if (cell.content.type === 'text' || cell.content.text !== undefined) {
                    return 'text';
                }
                // Check for image content
                if (cell.content.mediaType === 'image' || cell.content.type === 'media') {
                    return 'image';
                }
            }
            // Empty content cells default to image
            return 'image';
        }

        throw new Error(`Unsupported cell type for content slot: ${cell.type}`);
    }

    /**
     * Build constraints object based on slot type
     *
     * @param {GridCell} cell - Grid cell
     * @param {string} slotType - 'text' | 'image'
     * @param {Object} customConstraints - Designer-provided constraints (optional)
     * @returns {TextSlotConstraints|ImageSlotConstraints}
     */
    buildConstraints(cell, slotType, customConstraints = {}) {
        if (slotType === 'text') {
            return this._buildTextConstraints(cell, customConstraints);
        } else if (slotType === 'image') {
            return this._buildImageConstraints(cell, customConstraints);
        }

        throw new Error(`Unsupported slot type: ${slotType}`);
    }

    /**
     * Build text slot constraints
     * @param {GridCell} cell - Grid cell (MainTextCell or TextCell)
     * @param {Object} custom - Custom constraints from designer
     * @returns {TextSlotConstraints}
     * @private
     */
    _buildTextConstraints(cell, custom = {}) {
        // Get current font size from cell content
        const currentFontSize = this._getCurrentFontSize(cell);

        // Use defaults from ContentSlotTypes
        const defaults = window.DEFAULT_TEXT_CONSTRAINTS || {
            maxCharacters: 100,
            fontSizeMode: 'auto-fit',
            minFontSize: 16,
            maxFontSize: 72,
            wordWrap: true,
            verticalAlign: 'center',
            horizontalAlign: 'center'
        };

        return {
            maxCharacters: custom.maxCharacters || defaults.maxCharacters,
            fontSizeMode: custom.fontSizeMode || defaults.fontSizeMode,
            minFontSize: custom.minFontSize || Math.max(16, Math.floor(currentFontSize * 0.5)),
            maxFontSize: custom.maxFontSize || Math.max(currentFontSize, defaults.maxFontSize),
            wordWrap: custom.wordWrap !== undefined ? custom.wordWrap : defaults.wordWrap,
            verticalAlign: custom.verticalAlign || defaults.verticalAlign,
            horizontalAlign: custom.horizontalAlign || defaults.horizontalAlign
        };
    }

    /**
     * Get current font size from cell
     * @param {GridCell} cell - Grid cell
     * @returns {number} Font size in pixels
     * @private
     */
    _getCurrentFontSize(cell) {
        // For main-text cells
        if (cell.type === 'main-text' && this.app.mainTextComponent) {
            return this.app.mainTextComponent.fontSize;
        }

        // For text cells
        if (cell.type === 'text' && cell.content && cell.content.fontSize) {
            return cell.content.fontSize;
        }

        // Default
        return 48;
    }

    /**
     * Build image slot constraints
     * @param {GridCell} cell - Grid cell (ContentCell)
     * @param {Object} custom - Custom constraints from designer
     * @returns {ImageSlotConstraints}
     * @private
     */
    _buildImageConstraints(cell, custom = {}) {
        // Use defaults from ContentSlotTypes
        const defaults = window.DEFAULT_IMAGE_CONSTRAINTS || {
            fitMode: 'cover',
            focalPoint: 'center',
            maxFileSize: 10485760, // 10MB
            allowedFormats: ['jpg', 'png', 'webp', 'gif']
        };

        return {
            fitMode: custom.fitMode || defaults.fitMode,
            focalPoint: custom.focalPoint || defaults.focalPoint,
            maxFileSize: custom.maxFileSize || defaults.maxFileSize,
            allowedFormats: custom.allowedFormats || defaults.allowedFormats
        };
    }

    /**
     * Extract locked styling from cell
     *
     * @param {GridCell} cell - Grid cell
     * @param {string} slotType - 'text' | 'image'
     * @returns {TextSlotStyling|Object}
     */
    extractStyling(cell, slotType) {
        if (slotType === 'text') {
            return this._extractTextStyling(cell);
        } else if (slotType === 'image') {
            return {}; // No styling for images (constraints handle fit mode)
        }

        return {};
    }

    /**
     * Extract text styling (locked properties)
     * @param {GridCell} cell - Grid cell
     * @returns {TextSlotStyling}
     * @private
     */
    _extractTextStyling(cell) {
        // For main-text cells
        if (cell.type === 'main-text' && this.app.mainTextComponent) {
            return {
                fontFamily: this.app.mainTextComponent.fontFamily,
                fontWeight: this.app.mainTextComponent.fontWeight || 'normal',
                color: this.app.mainTextComponent.color
            };
        }

        // For text cells
        if (cell.type === 'text' && cell.content) {
            return {
                fontFamily: cell.content.fontFamily || 'Inter',
                fontWeight: cell.content.fontWeight || 'normal',
                color: cell.content.color || '#000000'
            };
        }

        // Default styling
        return {
            fontFamily: 'Inter',
            fontWeight: 'normal',
            color: '#000000'
        };
    }

    /**
     * Extract default content from cell
     *
     * @param {GridCell} cell - Grid cell
     * @param {string} slotType - 'text' | 'image'
     * @returns {string} Default content (text string or image URL)
     */
    extractContent(cell, slotType) {
        if (slotType === 'text') {
            return this._extractTextContent(cell);
        } else if (slotType === 'image') {
            return this._extractImageContent(cell);
        }

        return '';
    }

    /**
     * Extract text content from cell
     * @param {GridCell} cell - Grid cell
     * @returns {string} Text content
     * @private
     */
    _extractTextContent(cell) {
        // For main-text cells
        if (cell.type === 'main-text' && this.app.mainTextComponent) {
            return this.app.mainTextComponent.text;
        }

        // For text cells
        if (cell.type === 'text' && cell.content && cell.content.text) {
            return cell.content.text;
        }

        return '';
    }

    /**
     * Extract image URL from cell
     * @param {GridCell} cell - Grid cell
     * @returns {string} Image URL
     * @private
     */
    _extractImageContent(cell) {
        if (cell.content) {
            // Check for mediaUrl (ContentCell property)
            if (cell.content.mediaUrl) {
                return cell.content.mediaUrl;
            }

            // Check for imageURL (from serialization)
            if (cell.content.imageURL) {
                return cell.content.imageURL;
            }

            // Check for media element src
            if (cell.content.media && cell.content.media instanceof HTMLImageElement) {
                return cell.content.media.src;
            }
        }

        return '';
    }

    /**
     * Validate content slot object
     *
     * @param {ContentSlot} slot - Content slot to validate
     * @throws {Error} If validation fails
     */
    validateSlot(slot) {
        // Required fields
        const required = ['slotId', 'sourceElement', 'sourceContentId', 'type', 'boundingBox', 'constraints', 'styling', 'fieldName', 'fieldLabel'];

        for (const field of required) {
            if (!(field in slot)) {
                throw new Error(`Invalid content slot: missing required field '${field}'`);
            }
        }

        // Type validation
        if (slot.type !== 'text' && slot.type !== 'image') {
            throw new Error(`Invalid slot type: ${slot.type}. Must be 'text' or 'image'`);
        }

        // Bounding box validation
        if (!slot.boundingBox.x && slot.boundingBox.x !== 0) {
            throw new Error('Invalid bounding box: missing x coordinate');
        }
        if (!slot.boundingBox.y && slot.boundingBox.y !== 0) {
            throw new Error('Invalid bounding box: missing y coordinate');
        }
        if (slot.boundingBox.width <= 0) {
            throw new Error(`Invalid bounding box: width must be > 0 (got ${slot.boundingBox.width})`);
        }
        if (slot.boundingBox.height <= 0) {
            throw new Error(`Invalid bounding box: height must be > 0 (got ${slot.boundingBox.height})`);
        }

        // Field name validation
        if (!slot.fieldName || slot.fieldName.trim() === '') {
            throw new Error('Invalid content slot: fieldName cannot be empty');
        }

        // Field label validation
        if (!slot.fieldLabel || slot.fieldLabel.trim() === '') {
            throw new Error('Invalid content slot: fieldLabel cannot be empty');
        }

        return true;
    }

    /**
     * Find cell by ID in current grid
     * @param {string} cellId - Cell ID to find
     * @returns {GridCell|null} Found cell or null
     */
    findCellById(cellId) {
        if (!this.app.grid) {
            return null;
        }

        const allCells = this.app.grid.getAllCells();
        return allCells.find(cell => cell.id === cellId) || null;
    }

    /**
     * Find cell by contentId (UUID) in current grid
     * Useful for tracking cells across grid rebuilds
     *
     * @param {string} contentId - Cell contentId (UUID)
     * @returns {GridCell|null} Found cell or null
     */
    findCellByContentId(contentId) {
        if (!this.app.grid) {
            return null;
        }

        const allCells = this.app.grid.getAllCells();
        return allCells.find(cell => cell.contentId === contentId) || null;
    }

    /**
     * Add slot to manager's slot array
     * @param {ContentSlot} slot - Content slot to add
     */
    addSlot(slot) {
        this.validateSlot(slot);
        this.slots.push(slot);
        console.log(`📝 Added slot to manager: ${slot.slotId}`);
    }

    /**
     * Remove slot by ID
     * @param {string} slotId - Slot ID to remove
     * @returns {boolean} True if removed, false if not found
     */
    removeSlot(slotId) {
        const index = this.slots.findIndex(s => s.slotId === slotId);
        if (index !== -1) {
            this.slots.splice(index, 1);
            console.log(`🗑️ Removed slot: ${slotId}`);
            return true;
        }
        return false;
    }

    /**
     * Clear all slots
     */
    clearSlots() {
        this.slots = [];
        console.log('🗑️ Cleared all content slots');
    }

    /**
     * Get all slots
     * @returns {ContentSlot[]} Array of content slots
     */
    getAllSlots() {
        return [...this.slots]; // Return copy to prevent external mutation
    }

    /**
     * Get slot by ID
     * @param {string} slotId - Slot ID to find
     * @returns {ContentSlot|null} Found slot or null
     */
    getSlotById(slotId) {
        return this.slots.find(s => s.slotId === slotId) || null;
    }

    /**
     * Update slot configuration
     * @param {string} slotId - Slot ID to update
     * @param {Object} updates - Fields to update
     * @returns {boolean} True if updated, false if not found
     */
    updateSlot(slotId, updates) {
        const slot = this.getSlotById(slotId);
        if (!slot) {
            return false;
        }

        Object.assign(slot, updates);
        this.validateSlot(slot);
        console.log(`✏️ Updated slot: ${slotId}`);
        return true;
    }
}
