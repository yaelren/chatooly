/**
 * EmptyContentController.js - Handles empty content controls and interactions
 * Extends ContentController for empty content functionality (minimal controls)
 */

class EmptyContentController extends ContentController {
    constructor(app) {
        super(app);
        this.contentType = 'empty';
    }

    /**
     * Get default content for empty cells
     * @returns {Object} Default content object
     */
    getDefaultContent() {
        return {}; // Empty cells have no content
    }

    /**
     * Create controls for empty cells
     * @param {ContentCell} cell - ContentCell object
     * @param {HTMLElement} container - Container for controls
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement[]} Array of created control elements (empty for empty cells)
     */
    createControls(cell, container, context = 'sidebar') {
        // Empty cells don't have any specific controls
        // They only show the type selector and no padding controls

        // Could add a placeholder message
        const messageGroup = this.createControlGroup(context);
        messageGroup.innerHTML = `
            <p style="font-size: 12px; color: var(--chatooly-color-text-secondary, #999); text-align: center; margin: 20px 0;">
                This cell is empty. Select a different type to add content.
            </p>
        `;

        container.appendChild(messageGroup);
        return [messageGroup];
    }
}