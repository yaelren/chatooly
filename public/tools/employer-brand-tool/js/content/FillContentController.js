/**
 * FillContentController.js - Handles fill content controls and interactions
 * Extends ContentController for fill content functionality
 */

class FillContentController extends ContentController {
    constructor(app) {
        super(app);
        this.contentType = 'fill';
    }

    /**
     * Get default content for fill cells
     * @returns {Object} Default content object
     */
    getDefaultContent() {
        return {
            padding: 0  // No padding for solid fills
        };
    }

    /**
     * Create controls for fill cells
     * @param {ContentCell} cell - ContentCell object
     * @param {HTMLElement} container - Container for controls
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement[]} Array of created control elements
     */
    createControls(cell, container, context = 'sidebar') {
        const controls = [];
        
        // Initialize content if needed
        this.initializeContent(cell);

        // Info message - Fill cells always use global background color
        const infoGroup = this.createControlGroup(context);
        infoGroup.innerHTML = `
            <label>Background:</label>
            <p style="margin: 5px 0; font-style: italic; color: #666;">Fill cells use the global background color</p>
        `;

        container.appendChild(infoGroup);
        
        controls.push(infoGroup);
        return controls;
    }
}
