/**
 * DebugController.js - Manages all debug visualization and controls
 * Handles debug panel UI, keyboard shortcuts, and visualization options
 */

class DebugController {
    constructor(app) {
        this.app = app; // Reference to main app
        
        // Debug state
        this.debugOptions = {
            showSpotOutlines: true,
            showSpotNumbers: true,
            showPadding: false
        };
        
        // UI element references
        this.elements = {};
        
        // Layer panel removed - no longer needed in debug panel
        
        // Initialize
        this.cacheElements();
        this.setupEventListeners();
        this.initializeState();
        // Layer panel initialization removed
    }
    
    /**
     * Cache UI element references
     * @private
     */
    cacheElements() {
        this.elements.toggleGuides = document.getElementById('toggleGuides');
        this.elements.guidesLabel = document.getElementById('guidesLabel');
        
        if (!this.elements.toggleGuides) {
            console.warn('Debug element not found: toggleGuides');
        }
    }
    
    /**
     * Set up event listeners
     * @private
     */
    setupEventListeners() {
        // Guides toggle button
        if (this.elements.toggleGuides) {
            this.elements.toggleGuides.addEventListener('click', () => {
                this.toggleAllControls();
            });
        }
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcut(e));
    }
    
    /**
     * Initialize debug state from UI
     * @private
     */
    initializeState() {
        // Start with guides hidden
        this.debugOptions.showSpotOutlines = false;
        this.debugOptions.showSpotNumbers = false;
        this.debugOptions.showPadding = false;
        
        // Update button label
        this.updateButtonLabel();
        
        // Apply initial state
        this.applyDebugOptions();
    }
    
    /**
     * Layer panel methods removed - no longer needed in debug panel
     */
    
    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     * @private
     */
    handleKeyboardShortcut(e) {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || 
            e.target.tagName === 'TEXTAREA' || 
            e.target.tagName === 'SELECT') {
            return;
        }
        
        // Check for Ctrl/Cmd modifier
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;
        
        // Cmd/Ctrl + D: Toggle all debug controls
        if (isCtrlOrCmd && e.code === 'KeyI') {
            e.preventDefault();
            this.toggleAllControls();
        }
    }
    
    /**
     * Toggle all debug controls on/off
     */
    toggleAllControls() {
        // Check if any control is currently enabled
        const anyEnabled = this.debugOptions.showSpotOutlines ||
                          this.debugOptions.showSpotNumbers ||
                          this.debugOptions.showPadding;
        
        if (anyEnabled) {
            this.hideAllControls();
        } else {
            this.showAllControls();
        }
        
        this.updateButtonLabel();
    }
    
    /**
     * Show all debug controls
     */
    showAllControls() {
        this.debugOptions.showSpotOutlines = true;
        this.debugOptions.showSpotNumbers = true;
        this.debugOptions.showPadding = true;
        this.applyDebugOptions();
    }
    
    /**
     * Hide all debug controls
     */
    hideAllControls() {
        this.debugOptions.showSpotOutlines = false;
        this.debugOptions.showSpotNumbers = false;
        this.debugOptions.showPadding = false;
        this.applyDebugOptions();
    }
    
    /**
     * Update button label based on current state
     * @private
     */
    updateButtonLabel() {
        if (!this.elements.guidesLabel) return;
        
        const anyEnabled = this.debugOptions.showSpotOutlines ||
                          this.debugOptions.showSpotNumbers ||
                          this.debugOptions.showPadding;
        
        this.elements.guidesLabel.textContent = anyEnabled ? 'Hide Guides' : 'Show Guides';
        
        // Update button visual state
        if (this.elements.toggleGuides) {
            if (anyEnabled) {
                this.elements.toggleGuides.classList.add('active');
            } else {
                this.elements.toggleGuides.classList.remove('active');
            }
        }
    }
    
    /**
     * Update a single debug option
     * @param {string} option - Option name
     * @param {boolean} value - New value
     * @private
     */
    updateDebugOption(option, value) {
        this.debugOptions[option] = value;
        this.applyDebugOptions();
    }
    
    /**
     * Apply debug options to canvas manager and trigger render
     * @private
     */
    applyDebugOptions() {
        // Update canvas manager debug options
        if (this.app.canvasManager) {
            this.app.canvasManager.setDebugOptions(this.debugOptions);
        }
        
        // Update button label
        this.updateButtonLabel();
        
        // Trigger re-render
        if (this.app.render) {
            this.app.render();
        }
    }
    
    /**
     * Get current debug options
     * @returns {Object} Current debug options
     */
    getDebugOptions() {
        return { ...this.debugOptions };
    }
    
    /**
     * Set debug options programmatically
     * @param {Object} options - Debug options to set
     */
    setDebugOptions(options) {
        Object.assign(this.debugOptions, options);
        this.updateButtonLabel();
        this.applyDebugOptions();
    }
    
    /**
     * Check if any debug option is enabled
     * @returns {boolean} True if any debug option is on
     */
    isAnyDebugEnabled() {
        return Object.values(this.debugOptions).some(value => value === true);
    }
    
    /**
     * Render debug overlays on the canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} components - Components to debug (mainTextComponent, spots, etc.)
     */
    renderDebugOverlays(ctx, components) {
        if (!this.isAnyDebugEnabled()) return;
        
        const { mainTextComponent, spots } = components;
        
        // Show padding areas
        if (this.debugOptions.showPadding && mainTextComponent) {
            this.renderPaddingAreas(ctx, mainTextComponent);
        }
        
        // Note: Spot outlines and numbers are handled by the Spot class itself
        // based on the debug options passed during their render() calls
    }
    
    /**
     * Render padding debug overlay (for temporary display)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} options - Options object containing mainTextComponent
     */
    renderPaddingDebug(ctx, options) {
        if (options.mainTextComponent) {
            this.renderPaddingAreas(ctx, options.mainTextComponent);
        }
    }
    
    /**
     * Render padding areas debug overlay
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {TextComponent} textComponent - Text component to debug
     * @private
     */
    renderPaddingAreas(ctx, textComponent) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        
        const containerX = textComponent.containerX;
        const containerY = textComponent.containerY;
        const containerWidth = textComponent.containerWidth;
        const containerHeight = textComponent.containerHeight;
        
        // Top padding
        ctx.fillRect(containerX, containerY, containerWidth, textComponent.paddingTop);
        // Bottom padding
        ctx.fillRect(containerX, containerY + containerHeight - textComponent.paddingBottom, 
                    containerWidth, textComponent.paddingBottom);
        // Left padding
        ctx.fillRect(containerX, containerY, textComponent.paddingLeft, containerHeight);
        // Right padding
        ctx.fillRect(containerX + containerWidth - textComponent.paddingRight, containerY, 
                    textComponent.paddingRight, containerHeight);
        
        ctx.restore();
    }
    
    /**
     * Export debug state for testing
     * @returns {Object} Debug state
     */
    exportState() {
        const anyEnabled = this.debugOptions.showSpotOutlines ||
                          this.debugOptions.showSpotNumbers ||
                          this.debugOptions.showPadding;
        
        return {
            options: { ...this.debugOptions },
            guidesVisible: anyEnabled
        };
    }
}