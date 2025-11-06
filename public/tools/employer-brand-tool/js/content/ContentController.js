/**
 * ContentController.js - Base class for content control management
 * Provides common functionality for all content types (empty, text, image, mask)
 */

class ContentController {
    constructor(app) {
        this.app = app;
        this.contentType = 'base';
    }
    
    /**
     * Create controls for this content type
     * @param {ContentCell} cell - ContentCell object
     * @param {HTMLElement} container - Container for controls
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement[]} Array of created control elements
     */
    createControls(cell, container, context = 'sidebar') {
        throw new Error('createControls must be implemented by subclass');
    }

    /**
     * Create shared padding control
     * @param {ContentCell} cell - ContentCell object
     * @param {HTMLElement} container - Container for controls
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement} Created padding control element
     * @protected
     */
    createPaddingControl(cell, container, context = 'sidebar') {
        const paddingGroup = document.createElement('div');
        paddingGroup.className = context === 'popup' ? 'chatooly-control-group' : 'spot-control-section';
        paddingGroup.innerHTML = `
            <label>Padding: <span class="padding-value">${cell.content?.padding || 1}px</span></label>
            <input type="range" class="spot-padding" min="0" max="50" step="1" value="${cell.content?.padding || 1}">
        `;

        const paddingSlider = paddingGroup.querySelector('.spot-padding');
        this.addControlListener(paddingSlider, 'input', () => {
            const value = parseInt(paddingSlider.value);
            paddingGroup.querySelector('.padding-value').textContent = value + 'px';
            this.updateContent(cell, { padding: value }, true);
        });

        container.appendChild(paddingGroup);
        return paddingGroup;
    }
    
    /**
     * Create control group wrapper
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement} Control group element
     * @protected
     */
    createControlGroup(context = 'sidebar') {
        const group = document.createElement('div');
        group.className = context === 'popup' ? 'chatooly-control-group' : 'spot-control-section';
        return group;
    }
    
    /**
     * Add event listener with propagation prevention
     * @param {HTMLElement} element - Element to add listener to
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     * @protected
     */
    addControlListener(element, event, handler) {
        element.addEventListener(event, handler);
    }
    
    /**
     * Initialize cell content with defaults
     * @param {ContentCell} cell - Cell object
     * @returns {Object} Initialized content object
     * @protected
     */
    initializeContent(cell) {
        if (!cell.content) {
            cell.content = this.getDefaultContent();
        }
        return cell.content;
    }

    /**
     * Get default content for this cell type
     * @returns {Object} Default content object
     * @protected
     */
    getDefaultContent() {
        return { padding: 1 };
    }

    /**
     * Handle cell content update
     * @param {ContentCell} cell - Cell object
     * @param {Object} updates - Content updates
     * @param {boolean} skipUIUpdate - Skip UI update for minor changes
     * @protected
     */
    updateContent(cell, updates, skipUIUpdate = false) {
        if (!cell.content) {
            cell.content = this.getDefaultContent();
        }
        Object.assign(cell.content, updates);
        this.app.render();

        // Only update spots UI if necessary (to prevent closing open controls)
        if (!skipUIUpdate) {
            this.app.uiManager?.updateSpotsUI();
        }
    }
}