/**
 * ContentSlotOverlay.js - Visual overlay to show content slots on canvas
 *
 * Similar to grid guides, but highlights editable content slot areas
 * Shows bounding boxes and labels for all configured slots
 */

class ContentSlotOverlay {
    constructor(app) {
        this.app = app;
        this.contentSlotManager = app.presetPageManager.contentSlotManager;

        this.enabled = false;
        this.overlayCanvas = null;
        this.overlayCtx = null;

        this.createOverlay();
    }

    /**
     * Create overlay canvas
     */
    createOverlay() {
        // Create canvas element
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.id = 'contentSlotOverlay';
        this.overlayCanvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 100;
            display: none;
        `;

        // Insert after main canvas
        const mainCanvas = this.app.canvasManager.canvas;
        mainCanvas.parentElement.insertBefore(this.overlayCanvas, mainCanvas.nextSibling);

        this.overlayCtx = this.overlayCanvas.getContext('2d');

        // Match main canvas size
        this.updateSize();
    }

    /**
     * Update overlay canvas size and position to match main canvas
     */
    updateSize() {
        const mainCanvas = this.app.canvasManager.canvas;
        this.overlayCanvas.width = mainCanvas.width;
        this.overlayCanvas.height = mainCanvas.height;

        // Get main canvas position relative to its offset parent
        const mainRect = mainCanvas.getBoundingClientRect();
        const parentRect = mainCanvas.parentElement.getBoundingClientRect();

        // Calculate position relative to parent
        const left = mainRect.left - parentRect.left;
        const top = mainRect.top - parentRect.top;

        // Match visual size and position
        this.overlayCanvas.style.width = mainRect.width + 'px';
        this.overlayCanvas.style.height = mainRect.height + 'px';
        this.overlayCanvas.style.left = left + 'px';
        this.overlayCanvas.style.top = top + 'px';
    }

    /**
     * Show content slot overlays
     */
    show() {
        this.enabled = true;
        this.overlayCanvas.style.display = 'block';
        this.render();
    }

    /**
     * Hide content slot overlays
     */
    hide() {
        this.enabled = false;
        this.overlayCanvas.style.display = 'none';
        this.clear();
    }

    /**
     * Toggle overlay visibility
     */
    toggle() {
        if (this.enabled) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Refresh overlay (re-render if enabled)
     * Call this when grid content changes
     */
    refresh() {
        if (this.enabled) {
            this.render();
        }
    }

    /**
     * Clear overlay
     */
    clear() {
        this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    }

    /**
     * Render all content slots
     * 🎯 ENHANCED: Shows ALL content in grid (registered and unregistered)
     */
    render() {
        if (!this.enabled) return;

        this.clear();
        this.updateSize();

        // Get ALL content bounds from grid (not just registered slots)
        const allContentBounds = this.getAllContentBounds();

        if (allContentBounds.length === 0) {
            // Show message when no content
            this.renderNoContentMessage();
            return;
        }

        // Draw each content item
        allContentBounds.forEach((item, index) => {
            this.renderContentBounds(item, index);
        });
    }

    /**
     * Get bounding boxes for ALL content in grid (not just registered slots)
     * @returns {Array} Array of content bound objects
     */
    getAllContentBounds() {
        const bounds = [];
        
        // Get grid directly from app (not gridManager)
        const grid = this.app.grid;
        if (!grid || !grid.layerManager) return bounds;
        
        // Main text (if exists and has content)
        // Main text is stored in the 'main-text' layer
        // 🎯 FIX: Loop through ALL cells in main-text layer, not just first one
        const mainTextLayer = grid.layerManager.getLayer('main-text');
        if (mainTextLayer && mainTextLayer.getCellCount() > 0) {
            const mainTextCells = mainTextLayer.getCells();
            mainTextCells.forEach((cell, index) => {
                if (cell && cell.text && cell.text.trim()) {
                    try {
                        const bbox = this.contentSlotManager.captureBoundingBox(cell);
                        bounds.push({
                            bounds: bbox,
                            type: 'text',
                            label: index === 0 ? 'Main Text' : `Main Text Line ${index + 1}`,
                            isRegistered: this.isRegisteredSlot(cell),
                            cell: cell
                        });
                    } catch (error) {
                        console.warn(`Failed to capture main text cell ${cell.id} bounds:`, error);
                    }
                }
            });
        }
        
        // All content cells (iterate through all layers except main-text)
        const allLayers = grid.layerManager.getAllLayers();
        allLayers.forEach(layer => {
            // Skip main-text layer (already handled above)
            if (layer.id === 'main-text') return;
            
            // Get cells from layer (cells is a Set, use getCells())
            const layerCells = layer.getCells();
            layerCells.forEach(cell => {
                // Skip empty cells
                if (cell.contentType === 'empty') return;

                // Skip text cells without actual text
                // 🎯 FIX: For content cells, text is in cell.content.text, not cell.text
                if (cell.contentType === 'text' && (!cell.content || !cell.content.text || !cell.content.text.trim())) return;

                // Skip media cells without media
                if (cell.contentType === 'media' && (!cell.content || !cell.content.media)) return;
                
                try {
                    const bbox = this.contentSlotManager.captureBoundingBox(cell);
                    bounds.push({
                        bounds: bbox,
                        type: cell.contentType,
                        label: this.getContentLabel(cell),
                        isRegistered: this.isRegisteredSlot(cell),
                        cell: cell
                    });
                } catch (error) {
                    console.warn(`Failed to capture bounds for cell ${cell.id}:`, error);
                }
            });
        });
        
        return bounds;
    }

    /**
     * Check if cell is registered as content slot
     * @param {GridCell} cell - Cell to check
     * @returns {boolean} True if registered
     */
    isRegisteredSlot(cell) {
        const slots = this.contentSlotManager.getAllSlots();
        return slots.some(slot => 
            slot.sourceContentId === cell.contentId || 
            slot.sourceElement === cell.id ||
            (cell.type === 'main-text' && slot.sourceElement === 'main-text')
        );
    }

    /**
     * Get descriptive label for content
     * @param {GridCell} cell - Cell to get label for
     * @returns {string} Label text
     */
    getContentLabel(cell) {
        // Check if registered and has field label
        const slots = this.contentSlotManager.getAllSlots();
        const registeredSlot = slots.find(slot => 
            slot.sourceContentId === cell.contentId || 
            slot.sourceElement === cell.id
        );
        
        if (registeredSlot && registeredSlot.fieldLabel) {
            return registeredSlot.fieldLabel;
        }
        
        // Default labels based on content type
        switch (cell.contentType) {
            case 'text':
                return `Text Cell ${cell.id || ''}`;
            case 'media':
                const mediaType = cell.content?.mediaType || 'media';
                return `${mediaType} (${cell.id || ''})`;
            case 'fill':
                return `Fill (${cell.id || ''})`;
            case 'mask':
                return `Mask (${cell.id || ''})`;
            default:
                return `Content (${cell.id || ''})`;
        }
    }

    /**
     * Render "No content found" message
     * 🎯 UPDATED: Changed message to reflect showing all content
     */
    renderNoContentMessage() {
        const ctx = this.overlayCtx;
        const canvas = this.overlayCanvas;

        ctx.save();

        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Message box
        const boxWidth = 400;
        const boxHeight = 120;
        const x = (canvas.width - boxWidth) / 2;
        const y = (canvas.height - boxHeight) / 2;

        // White box
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, boxWidth, boxHeight);

        // Border
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, boxWidth, boxHeight);

        // Text
        ctx.fillStyle = '#1e40af';
        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No Content Found', canvas.width / 2, y + 40);

        ctx.fillStyle = '#6b7280';
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillText('Add text or media to cells to see', canvas.width / 2, y + 65);
        ctx.fillText('their tight bounding boxes here', canvas.width / 2, y + 85);

        ctx.restore();
    }

    /**
     * Render a single content slot
     */
    renderSlot(slot, index) {
        const ctx = this.overlayCtx;
        const bounds = slot.boundingBox;

        ctx.save();

        // Different colors for text vs image
        const isText = slot.type === 'text';
        const color = isText ? '#3b82f6' : '#8b5cf6'; // Blue for text, Purple for image

        // Draw bounding box with glow effect
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);

        // Glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

        // Reset shadow
        ctx.shadowBlur = 0;

        // Label background
        const labelPadding = 8;
        const labelHeight = 24;
        const labelText = `${slot.fieldLabel} (${slot.type})`;

        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const labelWidth = ctx.measureText(labelText).width + labelPadding * 2;

        // Position label at top-left of slot
        const labelX = bounds.x;
        const labelY = bounds.y - labelHeight - 4;

        // Label background
        ctx.fillStyle = color;
        ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

        // Label text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, labelX + labelPadding, labelY + labelHeight / 2);

        // Corner indicators
        this.drawCornerIndicators(bounds, color);

        // Constraints indicator (bottom-right)
        this.drawConstraintsIndicator(slot, bounds, color);

        ctx.restore();
    }

    /**
     * Render content bounds (supports both registered and unregistered content)
     * 🎯 NEW: Renders any content with visual distinction for registration status
     * @param {Object} item - Content item with bounds, type, label, isRegistered
     * @param {number} index - Index for color variation
     */
    renderContentBounds(item, index) {
        const ctx = this.overlayCtx;
        const bounds = item.bounds;

        ctx.save();

        // Color selection
        const isText = item.type === 'text';
        const baseColor = isText ? '#3b82f6' : '#8b5cf6'; // Blue for text, Purple for media
        const color = item.isRegistered ? baseColor : '#94a3b8'; // Gray for unregistered

        // Draw bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = item.isRegistered ? 3 : 2;
        ctx.setLineDash(item.isRegistered ? [8, 4] : [4, 4]); // Different dash pattern

        // Glow effect only for registered slots
        if (item.isRegistered) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
        }
        
        ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        ctx.shadowBlur = 0;

        // Label
        const labelPadding = 8;
        const labelHeight = 24;
        const labelPrefix = item.isRegistered ? '✓ ' : '';
        const labelText = `${labelPrefix}${item.label}`;

        ctx.font = item.isRegistered 
            ? 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
            : '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const labelWidth = ctx.measureText(labelText).width + labelPadding * 2;

        // Position label at top-left of bounds
        const labelX = bounds.x;
        const labelY = bounds.y - labelHeight - 4;

        // Label background
        ctx.fillStyle = color;
        ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

        // Label text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, labelX + labelPadding, labelY + labelHeight / 2);

        // Corner indicators (stronger for registered)
        this.drawCornerIndicators(bounds, color);

        // Constraints indicator only for registered slots
        if (item.isRegistered) {
            // Find the registered slot to get constraints
            const slots = this.contentSlotManager.getAllSlots();
            const registeredSlot = slots.find(slot => 
                slot.sourceContentId === item.cell.contentId || 
                slot.sourceElement === item.cell.id ||
                (item.cell.type === 'main-text' && slot.sourceElement === 'main-text')
            );
            
            if (registeredSlot) {
                this.drawConstraintsIndicator(registeredSlot, bounds, color);
            }
        }

        ctx.restore();
    }

    /**
     * Draw corner indicators for slot bounds
     */
    drawCornerIndicators(bounds, color) {
        const ctx = this.overlayCtx;
        const cornerSize = 12;
        const cornerThickness = 3;

        ctx.strokeStyle = color;
        ctx.lineWidth = cornerThickness;
        ctx.setLineDash([]);

        // Top-left
        ctx.beginPath();
        ctx.moveTo(bounds.x, bounds.y + cornerSize);
        ctx.lineTo(bounds.x, bounds.y);
        ctx.lineTo(bounds.x + cornerSize, bounds.y);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(bounds.x + bounds.width - cornerSize, bounds.y);
        ctx.lineTo(bounds.x + bounds.width, bounds.y);
        ctx.lineTo(bounds.x + bounds.width, bounds.y + cornerSize);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(bounds.x, bounds.y + bounds.height - cornerSize);
        ctx.lineTo(bounds.x, bounds.y + bounds.height);
        ctx.lineTo(bounds.x + cornerSize, bounds.y + bounds.height);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(bounds.x + bounds.width - cornerSize, bounds.y + bounds.height);
        ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height);
        ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height - cornerSize);
        ctx.stroke();
    }

    /**
     * Draw constraints indicator badge
     */
    drawConstraintsIndicator(slot, bounds, color) {
        const ctx = this.overlayCtx;

        let constraintText = '';
        if (slot.type === 'text') {
            constraintText = `${slot.constraints.maxCharacters} chars, ${slot.constraints.minFontSize}-${slot.constraints.maxFontSize}px`;
        } else {
            constraintText = `${slot.constraints.fitMode}, ${Math.round(slot.constraints.maxFileSize / 1048576)}MB`;
        }

        // Small badge at bottom-right
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const badgeWidth = ctx.measureText(constraintText).width + 8;
        const badgeHeight = 16;
        const badgeX = bounds.x + bounds.width - badgeWidth;
        const badgeY = bounds.y + bounds.height + 4;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);

        // Text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(constraintText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
    }

    /**
     * Add toggle button to UI
     */
    addToggleButton() {
        // Find a good place to add the button (next to Show Guides)
        const guidesCheckbox = document.querySelector('input[type="checkbox"]'); // Adjust selector

        if (!guidesCheckbox) {
            // Fallback: add to controls area
            const controls = document.querySelector('.left-panel');
            if (controls) {
                this.createToggleButton(controls);
            }
            return;
        }

        const parent = guidesCheckbox.parentElement;
        this.createToggleButton(parent.parentElement);
    }

    /**
     * Create toggle button element
     */
    createToggleButton(container) {
        const button = document.createElement('label');
        button.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            cursor: pointer;
            user-select: none;
            background: #f3f4f6;
            border-radius: 4px;
            margin: 8px 0;
        `;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'showContentSlots';
        checkbox.checked = this.enabled;
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.show();
            } else {
                this.hide();
            }
        });

        const label = document.createElement('span');
        label.textContent = '📝 Show Content Slots';
        label.style.cssText = 'font-size: 14px; font-weight: 500; color: #374151;';

        button.appendChild(checkbox);
        button.appendChild(label);
        container.appendChild(button);
    }
}
