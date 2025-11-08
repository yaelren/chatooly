/**
 * app.js - Main application controller
 * Ties together all components and handles UI interactions
 */

class EmployerBrandToolPOC {
    constructor() {
        // Core components
        this.canvasManager = new CanvasManager();
        this.textEngine = new MainTextController();
        this.gridDetector = new GridDetector(); // Phase 2: Unified grid detection
        this.debugController = null; // Will be initialized after DOM is ready
        
        // Layer Management System (NEW)
        this.layerManager = new LayerManager();

        // State
        this.spots = [];
        this.isInitialized = false;
        this.savedLineAlignments = {}; // Store user's line alignment preferences
        this.savedSpotData = []; // Store spot content data for persistence
        this.mainTextFillWithBackgroundColor = false; // Store main text background fill preference

        // Auto-detection settings
        this.autoDetectSpots = true; // Enable automatic spot detection
        this.spotDetectionTimeout = null; // Debounce timeout for spot detection
        this.waitingSpots = []; // Spots that couldn't fit in current layout but are preserved

        // Canvas resize tracking
        this.previousCanvasSize = { width: 0, height: 0 };

        // Canvas hover state
        this.hoveredCell = null;
        this.showHoverOutline = false;

        // Temporary debug display state
        this.temporaryPaddingDebugVisible = false;
        this.paddingDebugTimeout = null;

        // Main text component
        this.mainTextComponent = new MainTextComponent();

        // UI Manager
        this.uiManager = null; // Will be initialized after DOM is ready

        // Preset Management System
        this.presetManager = null; // Will be initialized after DOM is ready
        this.presetUIComponent = null; // Will be initialized after DOM is ready

        // Content Controllers - Object-oriented content management
        this.contentControllers = {
            'empty': new EmptyContentController(this),
            'text': new TextContentController(this),
            'media': new ImageContentController(this),
            'fill': new FillContentController(this)
        };

        // Asset Management System
        this.backgroundImage = null; // Currently loaded background image
        this.backgroundVideo = null; // Currently loaded background video

        // Grid Animation System (NEW - simple per-cell animations)
        this.grid = null; // Will be initialized after DOM is ready

        // Minimum spot size - will be calculated as min(50, fontSize)
        this.minSpotSize = null; // Will be set dynamically based on font size

        // Initialize the application
        this.initialize();
    }
    
    /**
     * Initialize the application
     */
    async initialize() {
        try {
            // Initialize UI Manager FIRST (other components depend on it)
            this.uiManager = new UIManager(this);

            // Initialize Preset Management System
            this.presetManager = new PresetManager(this);
            this.presetUIComponent = new PresetUIComponent(this);
            this.presetUIComponent.initialize(this.presetManager);

            // Initialize Wix Cloud Backend for Presets (MUST happen before font loading)
            await this.initializeWixCloud();

            // Initialize font upload AFTER WixAPI is ready (loads custom fonts from Wix Data)
            await this.uiManager.initializeFontUpload();

            // Initialize debug controller
            this.debugController = new DebugController(this);

            // Initialize Grid system (NEW - simple per-cell animations)
            this.grid = new Grid(this);

            // Set initial canvas size via Chatooly CDN
            this.initializeChatoolyCanvas();

            // Initialize MainTextController with canvas dimensions and default mode
            this.textEngine.updateConfig({
                canvasWidth: this.canvasManager.canvas.width,
                canvasHeight: this.canvasManager.canvas.height,
                mode: 'manual' // Set default mode to manual
            });

            // Initialize main text component
            this.mainTextComponent.setContainer(
                0, 0,
                this.canvasManager.canvas.width,
                this.canvasManager.canvas.height
            );
            this.mainTextComponent.text = this.uiManager.elements.mainText.value;
            this.mainTextComponent.color = this.uiManager.elements.textColor.value;

            // Set initial text
            this.textEngine.setText(this.uiManager.elements.mainText.value);

            // Update line alignment controls for initial text
            this.uiManager.updateLineAlignmentControls();

            // Auto-detection is now permanently enabled
            this.autoDetectSpots = true;

            // Initialize minimum spot size from UI
            if (this.uiManager.elements.minSpotSize) {
                const minSize = parseInt(this.uiManager.elements.minSpotSize.value);
                this.gridDetector.setMinCellSize(minSize);
                this.minSpotSize = minSize;
            }

            // Build grid first, then render
            if (this.grid) {
                this.grid.buildFromExisting();

                // Populate spots array from grid content cells
                this.spots = this.grid.getContentCells();
                this.uiManager.updateSpotsUI();

                // Visual grid display removed - canvas is now clickable
            }

            // Initial render (after grid is built)
            this.render();

            // Add canvas click event listener
            this.canvasManager.canvas.addEventListener('click', (event) => {
                this.onCanvasClick(event);
            });

            // Add canvas hover event listeners
            this.canvasManager.canvas.addEventListener('mousemove', (event) => {
                this.onCanvasHover(event);
            });

            this.canvasManager.canvas.addEventListener('mouseleave', (event) => {
                this.onCanvasLeave(event);
            });

            // Debug: Log grid status
            if (this.grid) {
            }

            this.isInitialized = true;

        } catch (error) {
            console.error('❌ Failed to initialize POC:', error);
            if (this.uiManager && this.uiManager.showError) {
                this.uiManager.showError('Failed to initialize application. Please refresh and try again.');
            } else {
                alert('Failed to initialize application. Please refresh and try again.');
            }
        }
    }

    /**
     * Initialize Chatooly canvas dimensions
     * @private
     */
    initializeChatoolyCanvas() {
        const setCanvasSize = () => {
            console.log('🎯 EmployerBrandTool: Setting canvas size to 1080x1350');

            if (window.Chatooly && window.Chatooly.canvasResizer) {
                console.log('   → Chatooly.canvasResizer available');
                console.log('   → Current canvas size:', this.canvasManager.canvas.width, 'x', this.canvasManager.canvas.height);

                window.Chatooly.canvasResizer.setExportSize(1080, 1350);
                window.Chatooly.canvasResizer.applyExportSize();

                console.log('   → After setExportSize:', this.canvasManager.canvas.width, 'x', this.canvasManager.canvas.height);

                // Update our tracking
                this.previousCanvasSize = {
                    width: this.canvasManager.canvas.width,
                    height: this.canvasManager.canvas.height
                };
            } else {
                console.warn('   → Chatooly.canvasResizer NOT available!');
            }
        };

        // Try to set size immediately if CDN is ready
        if (window.Chatooly && window.Chatooly.canvasResizer) {
            console.log('✅ Chatooly already loaded, setting size immediately');
            setCanvasSize();
        } else {
            console.log('⏳ Waiting for chatooly:ready event...');
            // Wait for Chatooly to be ready
            window.addEventListener('chatooly:ready', setCanvasSize);
        }
    }
    
    

    
















    /**
     * Handle text input changes
     * @private
     */
    onTextChanged() {
        if (!this.uiManager || !this.uiManager.elements) {
            console.warn('UIManager not ready, skipping text change');
            return;
        }
        
        const text = this.uiManager.elements.mainText.value;
        this.mainTextComponent.text = text;

        // Sync styling properties from MainTextComponent to MainTextController
        if (this.textEngine) {
            this.textEngine.updateConfig({
                textStyles: {
                    bold: this.mainTextComponent.fontWeight === 'bold',
                    italic: this.mainTextComponent.fontStyle === 'italic',
                    underline: this.mainTextComponent.underline,
                    highlight: this.mainTextComponent.highlight,
                    highlightColor: this.mainTextComponent.highlightColor
                }
            });
            this.textEngine.setText(text);
        }

        // IMPORTANT: Apply saved alignments immediately after text change but before updateLineAlignmentControls
        this.applySavedAlignments();

        // Update line alignment controls
        this.uiManager.updateLineAlignmentControls();

        // Save spots before clearing when text changes
        if (this.spots.length > 0) {
            this.saveSpotData();
        }

        // Clear spots when text changes
        this.spots = [];
        this.uiManager.updateSpotsUI();

        // Rebuild grid BEFORE rendering (NEW - keep grid synchronized)
        if (this.grid) {
            this.grid.buildFromExisting();

            // Sync spots array with grid content cells
            this.spots = this.grid.getContentCells();
            this.uiManager.updateSpotsUI();
        }

        // Render with updated grid
        this.render();

        // Animation controls updated after grid rebuild
        if (this.grid) {
            setTimeout(() => {
                this.uiManager.updateTextLineAnimations();
            }, 100); // Small delay to ensure grid is fully rebuilt
        }

        // Auto-detect spots after text changes (only if there's text content)
        if (this.uiManager && this.uiManager.elements && this.uiManager.elements.mainText.value.trim()) {
            this.autoDetectSpotsDebounced();
        }
    }
    

    /**
     * Apply saved alignments to current text lines
     * @private
     */
    applySavedAlignments() {
        // Get lines from main text component (assumes already synced)
        const ctx = this.canvasManager.ctx;
        ctx.save();

        let fontSize = this.mainTextComponent.fontSize;
        if (fontSize === 'auto') {
            fontSize = this.mainTextComponent.calculateAutoFontSize(ctx);
        }

        ctx.font = this.mainTextComponent.getFontString(fontSize);
        const availableWidth = this.mainTextComponent.getAvailableWidth();
        const lines = this.mainTextComponent.wrapTextToLines(ctx, this.mainTextComponent.text, availableWidth, fontSize);

        ctx.restore();

        lines.forEach((line, index) => {
            if (line.trim()) {
                const lineKey = line.trim();
                const savedAlignment = this.savedLineAlignments[lineKey];

                if (savedAlignment) {
                    // Update BOTH systems to keep them in sync
                    // 1. Update MainTextComponent (for rendering)
                    this.mainTextComponent.setLineAlignment(index, savedAlignment);

                    // 2. Update MainTextController (for grid detection and bounds)
                    if (this.textEngine) {
                        this.textEngine.setLineAlignment(index, savedAlignment);
                    }
                }
            }
        });
    }
    
    
    
    
    
    
    
    
    
    
    
    
    /**
     * Save current spot data for persistence
     * @private
     */
    saveSpotData() {
        const promises = this.spots.map(async (spot) => {
            if (spot.contentType === 'empty') return null;

            // Create base saved spot data
            const savedSpot = {
                // Position data for matching
                x: spot.x,
                y: spot.y,
                width: spot.width,
                height: spot.height,

                // Basic properties
                type: spot.contentType,
                opacity: spot.opacity,
                originalId: spot.id
            };

            // Handle content based on type
            if (spot.content) {
                if (spot.contentType === 'media' && spot.content.media) {
                    // Convert image to data URL for serialization
                    savedSpot.content = {
                        ...spot.content,
                        imageDataURL: this.imageToDataURL(spot.content.media),
                        media: null // Remove the actual media object
                    };
                } else {
                    // Create a clean copy of content, excluding non-serializable properties
                    const cleanContent = {};
                    for (const key in spot.content) {
                        // Skip non-serializable properties (Lottie animation objects, canvas elements, etc.)
                        if (key === 'lottieAnimation' || key === 'lottieContainer' || key === 'media') {
                            continue;
                        }
                        cleanContent[key] = spot.content[key];
                    }
                    savedSpot.content = cleanContent;
                }
            } else {
                savedSpot.content = null;
            }
            
            return savedSpot;
        });
        
        // Filter out null values (empty spots) and combine with waiting spots
        const currentSpotData = this.spots
            .map(spot => this.createSavedSpotData(spot))
            .filter(savedSpot => savedSpot !== null);
        
        // Combine current spots with waiting spots (waiting spots take priority to be restored first)
        this.savedSpotData = [...this.waitingSpots, ...currentSpotData];
    }
    
    /**
     * Create saved spot data for a single spot
     * @param {Spot} spot - Spot to save
     * @returns {Object|null} Saved spot data or null if empty
     * @private
     */
    createSavedSpotData(spot) {
        if (spot.contentType === 'empty') return null;

        const savedSpot = {
            // Position data for matching
            x: spot.x,
            y: spot.y,
            width: spot.width,
            height: spot.height,

            // Basic properties
            type: spot.contentType,
            opacity: spot.opacity,
            originalId: spot.id
        };

        // Handle content based on type
        if (spot.content) {
            if (spot.contentType === 'media' && spot.content.media) {
                // Convert media to data URL for serialization
                savedSpot.content = {
                    ...spot.content,
                    imageDataURL: this.imageToDataURL(spot.content.media),
                    media: null // Remove the actual media object
                };
            } else {
                // Create a clean copy of content, excluding non-serializable properties
                const cleanContent = {};
                for (const key in spot.content) {
                    // Skip non-serializable properties (Lottie animation objects, canvas elements, etc.)
                    if (key === 'lottieAnimation' || key === 'lottieContainer' || key === 'media') {
                        continue;
                    }
                    cleanContent[key] = spot.content[key];
                }
                savedSpot.content = cleanContent;
            }
        } else {
            savedSpot.content = null;
        }
        
        return savedSpot;
    }
    
    /**
     * Convert Image object to data URL
     * @param {HTMLImageElement} image - Image to convert
     * @returns {string} Data URL
     * @private
     */
    imageToDataURL(image) {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = image.width || image.naturalWidth;
            canvas.height = image.height || image.naturalHeight;
            ctx.drawImage(image, 0, 0);
            return canvas.toDataURL();
        } catch (error) {
            console.warn('Failed to convert image to data URL:', error);
            return null;
        }
    }
    
    /**
     * Restore saved spot data to newly detected spots
     * @private
     */
    restoreSpotData() {
        if (!this.savedSpotData || this.savedSpotData.length === 0) {
            return;
        }
        
        // Phase 1: Try to restore spots to their original positions
        const remainingSavedSpots = [...this.savedSpotData];
        let restoredCount = 0;
        
        // First pass: Match spots to their original positions (within 150 pixels)
        for (const newSpot of this.spots) {
            if (remainingSavedSpots.length === 0) break;
            
            let bestMatch = null;
            let bestScore = Infinity;
            let bestIndex = -1;
            
            remainingSavedSpots.forEach((savedSpot, index) => {
                // Calculate distance between centers
                const newCenterX = newSpot.x + newSpot.width / 2;
                const newCenterY = newSpot.y + newSpot.height / 2;
                const savedCenterX = savedSpot.x + savedSpot.width / 2;
                const savedCenterY = savedSpot.y + savedSpot.height / 2;
                
                const distance = Math.sqrt(
                    Math.pow(newCenterX - savedCenterX, 2) + 
                    Math.pow(newCenterY - savedCenterY, 2)
                );
                
                // Only consider close matches in first pass
                if (distance < 150 && distance < bestScore) {
                    bestScore = distance;
                    bestMatch = savedSpot;
                    bestIndex = index;
                }
            });
            
            // Restore if we found a close match
            if (bestMatch) {
                this.restoreSpotToNewLocation(newSpot, bestMatch);
                remainingSavedSpots.splice(bestIndex, 1);
                restoredCount++;
            }
        }
        
        // Phase 2: Place remaining saved spots in any available spots (starting from spot 1)
        const availableSpots = this.spots.filter(spot => spot.contentType === 'empty');
        for (let i = 0; i < availableSpots.length && remainingSavedSpots.length > 0; i++) {
            const newSpot = availableSpots[i];
            const savedSpot = remainingSavedSpots[0]; // Take first remaining saved spot

            this.restoreSpotToNewLocation(newSpot, savedSpot);
            remainingSavedSpots.shift(); // Remove from remaining
            restoredCount++;
        }

        // Phase 3: Move unfitted spots to waiting list (don't delete them!)
        if (remainingSavedSpots.length > 0) {
            this.waitingSpots = remainingSavedSpots;
        } else {
            // Clear waiting list if all spots were restored
            this.waitingSpots = [];
        }
    }
    
    /**
     * Restore a saved spot to a new spot location
     * @param {Spot} newSpot - New spot to restore to
     * @param {Object} savedSpot - Saved spot data
     * @private
     */
    restoreSpotToNewLocation(newSpot, savedSpot) {
        newSpot.setContentType(savedSpot.type);
        
        // Handle content restoration based on type
        if (savedSpot.content) {
            if (savedSpot.type === 'media' && savedSpot.content.imageDataURL) {
                // Restore image from data URL
                this.restoreImageContent(newSpot, savedSpot.content);
            } else {
                // Regular content restoration
                newSpot.content = savedSpot.content;
            }
        }
        
        if (savedSpot.opacity !== undefined) {
            newSpot.opacity = savedSpot.opacity;
        }
    }
    
    /**
     * Restore image content from data URL
     * @param {Spot} spot - Spot to restore to
     * @param {Object} savedContent - Saved content with imageDataURL
     * @private
     */
    restoreImageContent(spot, savedContent) {
        if (!savedContent.imageDataURL) {
            console.warn('No image data URL found for spot restoration');
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous'; // Enable CORS for external images
        img.onload = () => {
            // Create the content object with restored image
            spot.content = {
                ...savedContent,
                image: img,
                imageDataURL: undefined // Remove the data URL as we now have the image
            };
            
            // Re-render to show the restored image
            this.render();
        };

        img.onerror = () => {
            console.warn(`Failed to load image for spot ${spot.id}`);
            // Set content without image so other properties are still restored
            spot.content = {
                ...savedContent,
                image: null,
                imageDataURL: undefined
            };
        };
        
        img.src = savedContent.imageDataURL;
    }
    
    /**
     * Auto-detect spots with debouncing
     * @param {number} delay - Delay in milliseconds (default: 500ms)
     * @param {Function} callback - Optional callback to run after detection completes
     * @private
     */
    autoDetectSpotsDebounced(delay = 500, callback = null) {
        if (!this.autoDetectSpots) return;
        
        // Clear existing timeout
        if (this.spotDetectionTimeout) {
            clearTimeout(this.spotDetectionTimeout);
        }
        
        // Set new timeout
        this.spotDetectionTimeout = setTimeout(() => {
            this.detectSpots(callback);
        }, delay);
    }

    /**
     * Detect/rebuild spots - now simplified to use Grid system
     * @param {Function} callback - Optional callback to run after detection completes
     */
    detectSpots(callback = null) {
        try {
            // Rebuild grid (this handles everything: detection, building, content preservation)
            if (this.grid) {
                this.grid.buildFromExisting();

                // Extract content cells as spots for UI compatibility
                this.spots = this.grid.getContentCells();
            }

            // Update UI
            this.uiManager.updateSpotsUI();
            this.render();

            // Call the callback if provided
            if (callback && typeof callback === 'function') {
                callback();
            }

        } catch (error) {
            console.error('❌ Grid rebuild failed:', error);
            this.uiManager.showError('Grid rebuild failed. Please try again.');

            // Still call callback even if detection failed
            if (callback && typeof callback === 'function') {
                callback();
            }
        }
    }
    
    /**
     * Get text bounds from MainTextComponent for spot detection
     * @returns {Array} Array of text bounds
     * @private
     */
    getTextBoundsFromMainComponent() {
        return this.mainTextComponent.getTextBounds(this.canvasManager.ctx);
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    /**
     * Handle canvas clicks
     * @param {MouseEvent} event - Click event
     * @private
     */
    onCanvasClick(event) {
        const canvasCoords = this.canvasManager.screenToCanvas(event.clientX, event.clientY);
        
        // Find clicked cell using grid system
        const clickedCell = this.grid ? this.grid.getCellAt(canvasCoords.x, canvasCoords.y) : null;
        
        if (clickedCell) {
            
            // Automatically switch to Grid Editor tab when clicking on a cell
            this.uiManager.switchTab('grid');
            
            // Handle different cell types
            if (clickedCell.type === 'main-text') {
                // For main text cells, show cell 8 main text cell with animations
                this.handleMainTextCellClick(clickedCell);
            } else if (clickedCell.type === 'content') {
                // For content cells, show content controls
                this.handleContentCellClick(clickedCell);
            }
        } else {
            // No cell clicked, hide controls
            this.hideCellControls();
        }
    }
    
    /**
     * Handle main text cell clicks
     * @param {MainTextCell} cell - Clicked main text cell
     * @private
     */
    handleMainTextCellClick(cell) {
        // Show cell 8 main text cell with animations
        this.uiManager.showMainTextCellControls(cell);
    }
    
    /**
     * Handle content cell clicks
     * @param {ContentCell} cell - Clicked content cell
     * @private
     */
    handleContentCellClick(cell) {
        // Show content controls
        this.uiManager.showContentCellControls(cell);
    }
    
    /**
     * Hide cell controls
     * @private
     */
    hideCellControls() {
        if (this.uiManager) {
            this.uiManager.hideCellControls();
        }
    }

    /**
     * Handle canvas hover events
     * @param {MouseEvent} event - Mouse move event
     */
    onCanvasHover(event) {
        const canvasCoords = this.canvasManager.screenToCanvas(event.clientX, event.clientY);
        
        // Find hovered cell using grid system
        const hoveredCell = this.grid ? this.grid.getCellAt(canvasCoords.x, canvasCoords.y) : null;
        
        // Check if we're hovering over a different cell
        if (hoveredCell !== this.hoveredCell) {
            this.hoveredCell = hoveredCell;
            
            if (hoveredCell) {
                // Show hover effects
                this.showHoverOutline = true;
                this.canvasManager.canvas.style.cursor = 'pointer';
                
                // Trigger a render to show hover outline
                this.render();
            } else {
                // Hide hover effects
                this.showHoverOutline = false;
                this.canvasManager.canvas.style.cursor = 'default';
                
                // Trigger a render to hide hover outline
                this.render();
            }
        }
    }

    /**
     * Handle canvas mouse leave events
     * @param {MouseEvent} event - Mouse leave event
     */
    onCanvasLeave(event) {
        // Clear hover state
        this.hoveredCell = null;
        this.showHoverOutline = false;
        this.canvasManager.canvas.style.cursor = 'default';
        
        // Trigger a render to hide hover outline
        this.render();
    }
    /**
     * Show temporary padding debug display
     * @param {number} duration - Duration in milliseconds (default: 2000)
     */
    showTemporaryPaddingDebug(duration = 2000) {
        // Clear any existing timeout
        if (this.paddingDebugTimeout) {
            clearTimeout(this.paddingDebugTimeout);
        }
        
        // Show padding debug
        this.temporaryPaddingDebugVisible = true;
        this.render();
        
        // Hide after duration
        this.paddingDebugTimeout = setTimeout(() => {
            this.temporaryPaddingDebugVisible = false;
            this.render();
        }, duration);
    }
    
    /**
     * Render hover outline for a cell
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {GridCell} cell - Cell to highlight
     * @private
     */
    renderHoverOutline(ctx, cell) {
        if (!cell || !cell.bounds) return;

        ctx.save();
        
        // Set hover outline style
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        // Draw cell outline
        ctx.strokeRect(
            cell.bounds.x,
            cell.bounds.y,
            cell.bounds.width,
            cell.bounds.height
        );
        
        // Draw cell number in the center
        ctx.fillStyle = '#007bff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const centerX = cell.bounds.x + cell.bounds.width / 2;
        const centerY = cell.bounds.y + cell.bounds.height / 2;
        
        // Add white background for better visibility
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(centerX - 20, centerY - 12, 40, 24);
        
        // Draw cell number
        ctx.fillStyle = '#007bff';
        ctx.fillText(cell.id, centerX, centerY);
        
        ctx.restore();
    }
    
    /**
     * Main render method
     * @param {boolean} isAnimationFrame - True if called from animation loop
     */
    render(isAnimationFrame = false) {
        try {
            // Update main text component with current values
            this.syncMainTextComponent();

            // Render canvas background
            this.canvasManager.renderBackground();

            // Unified grid rendering (animations applied when present)
            this._renderWithAnimations();

            // Render debug overlays if enabled
            if (this.debugController) {
                this.debugController.renderDebugOverlays(this.canvasManager.ctx, {
                    mainTextComponent: this.mainTextComponent,
                    spots: this.spots
                });
            }

            // Render temporary padding debug if enabled
            if (this.temporaryPaddingDebugVisible) {
                // Ensure debug controller exists for temporary padding debug
                if (!this.debugController) {
                    this.debugController = new DebugController(this);
                }
                this.debugController.renderPaddingDebug(this.canvasManager.ctx, {
                    mainTextComponent: this.mainTextComponent
                });
            }

            // Render hover outline if hovering over a cell
            if (this.showHoverOutline && this.hoveredCell) {
                this.renderHoverOutline(this.canvasManager.ctx, this.hoveredCell);
            }

        } catch (error) {
            console.error('❌ Render failed:', error);
        }
    }

    /**
     * Render content using unified grid architecture
     * Renders all grid cells (MainTextCell and ContentCell) with animation transforms
     * @private
     */
    _renderWithAnimations() {
        const ctx = this.canvasManager.ctx;
        const debugOptions = this.debugController ? this.debugController.getDebugOptions() : {};

        
        // Always use layer-based rendering
        this.renderByLayers(ctx, debugOptions);
    }

    /**
     * Render cells by layers (NEW layer-based rendering)
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} debugOptions - Debug options
     * @private
     */
    renderByLayers(ctx, debugOptions) {
        const sortedLayers = this.layerManager.getSortedLayers();
        
        sortedLayers.forEach((layer, layerIndex) => {
            if (!layer.visible) return;
            
            const layerCells = layer.getCells();
            
            layerCells.forEach(cell => {
                this.renderCellWithAnimations(ctx, cell, debugOptions);
            });
        });
    }

    /**
     * Render a single cell with animation transforms
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {GridCell} cell - Cell to render
     * @param {Object} debugOptions - Debug options
     * @private
     */
    renderCellWithAnimations(ctx, cell, debugOptions) {
        if (!cell) return;
        
        ctx.save();
        
        // Apply animation transforms
        const offset = cell.currentOffset || { x: 0, y: 0 };
        const centerX = cell.bounds.x + cell.bounds.width / 2;
        const centerY = cell.bounds.y + cell.bounds.height / 2;
        
        ctx.translate(centerX, centerY);
        ctx.translate(offset.x || 0, offset.y || 0);
        if (offset.rotation) ctx.rotate(offset.rotation);
        if (offset.scale) ctx.scale(offset.scale, offset.scale);
        ctx.translate(-centerX, -centerY);
        
        // Render based on cell type
        if (cell.type === 'main-text') {
            // Render cell background first (if needed)
            if (cell.renderBackground) {
                cell.renderBackground(ctx, this.canvasManager.backgroundManager);
            }
            
            CellRenderer.renderTextCell(ctx, cell, debugOptions);
            
            // Draw debug outline if enabled
            if (debugOptions.showSpotOutlines) {
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 2;
                ctx.strokeRect(cell.bounds.x, cell.bounds.y, cell.bounds.width, cell.bounds.height);
            }
            
            // Draw debug number if enabled
            if (debugOptions.showSpotNumbers && cell.id) {
                const center = cell.getCenter();
                const radius = 15;
                
                // Circle background
                ctx.fillStyle = '#e5e5e5';
                ctx.beginPath();
                ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
                ctx.fill();
                
                // Number text
                ctx.fillStyle = '#121212';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(cell.id.toString(), center.x, center.y);
            }
        } else if (cell instanceof ContentCell) {
            // Render cell background first (if needed)
            if (cell.renderBackground) {
                cell.renderBackground(ctx, this.canvasManager.backgroundManager);
            }
            
            const renderOptions = {
                showOutlines: debugOptions.showSpotOutlines,
                showNumbers: debugOptions.showSpotNumbers,
                backgroundImage: this.canvasManager.backgroundImage
            };
            CellRenderer.render(ctx, cell, renderOptions);
        }
        
        ctx.restore();
    }

    /**
     * Start animation render loop
     * Continuously renders canvas while animations are playing
     * @private
     */
    _startAnimationLoop() {
        if (this._animationLoopId) {
            return;
        }

        this._animationStartTime = performance.now();
        this._animationFrameCount = 0;

        const animate = () => {
            // Check if any animations are still playing
            const hasPlayingAnimations = this.grid &&
                this.grid.getAnimatedCells().some(cell =>
                    cell.animation && cell.animation.isPlaying
                );

            // Check if any videos need frame updates
            const hasVideos = this.grid &&
                this.grid.getAllCells().some(cell =>
                    cell.content && cell.content.media instanceof HTMLVideoElement
                );

            // Check if any GIFs need frame updates (GIFs can be HTMLImageElements or Canvas elements from gifler)
            const hasGIFs = this.grid &&
                this.grid.getAllCells().some(cell => {
                    return cell.content && cell.content.mediaType === 'gif' &&
                        (cell.content.media instanceof HTMLImageElement || cell.content.media instanceof HTMLCanvasElement);
                });

            // Check if any Lottie animations need frame updates
            const hasLottieAnimations = this.grid &&
                this.grid.getAllCells().some(cell =>
                    cell.content && cell.content.mediaType === 'lottie' && cell.content.lottieAnimation
                );

            // Check if background video needs frame updates
            const hasBackgroundVideo = this.canvasManager.backgroundManager.backgroundVideo instanceof HTMLVideoElement;

            // Check if background GIF needs frame updates
            const hasBackgroundGif = this.canvasManager.backgroundManager.backgroundGif instanceof HTMLCanvasElement;

            if (hasPlayingAnimations || hasVideos || hasGIFs || hasLottieAnimations || hasBackgroundVideo || hasBackgroundGif) {
                // Re-render canvas
                this.render();

                // Update FPS counter
                this._animationFrameCount++;
                const elapsed = performance.now() - this._animationStartTime;
                if (elapsed >= 1000) {
                    const fps = Math.round((this._animationFrameCount / elapsed) * 1000);
                    const fpsDisplay = document.getElementById('fpsDisplay');
                    if (fpsDisplay) {
                        fpsDisplay.textContent = `${fps} FPS`;
                    }
                    this._animationFrameCount = 0;
                    this._animationStartTime = performance.now();
                }

                // Schedule next frame
                this._animationLoopId = requestAnimationFrame(animate);
            } else {
                // No more playing animations or videos, stop loop
                this._stopAnimationLoop();
            }
        };

        // Start the loop
        this._animationLoopId = requestAnimationFrame(animate);
    }

    /**
     * Stop animation render loop
     * @private
     */
    _stopAnimationLoop() {
        if (this._animationLoopId) {
            cancelAnimationFrame(this._animationLoopId);
            this._animationLoopId = null;

            // Clear FPS display
            const fpsDisplay = document.getElementById('fpsDisplay');
            if (fpsDisplay) {
                fpsDisplay.textContent = '0 FPS';
            }
        }
    }


    
    /**
     * Sync MainTextComponent with current UI state
     * @private
     */
    syncMainTextComponent() {
        // Safety check: UIManager must be initialized
        if (!this.uiManager || !this.uiManager.elements) {
            return;
        }

        // Update text content
        this.mainTextComponent.text = this.uiManager.elements.mainText.value;
        
        // Update container size and position
        this.mainTextComponent.setContainer(
            0, 0,
            this.canvasManager.canvas.width,
            this.canvasManager.canvas.height
        );
        
        // Update color
        this.mainTextComponent.color = this.uiManager.elements.textColor.value;
        
        // Update padding
        const paddingH = parseInt(this.uiManager.elements.paddingHorizontal.value);
        const paddingV = parseInt(this.uiManager.elements.paddingVertical.value);
        this.mainTextComponent.setPaddingIndividual({
            left: paddingH,
            right: paddingH,
            top: paddingV,
            bottom: paddingV
        });
        
        // Update background padding for fit-within-padding mode
        this.canvasManager.setBackgroundPadding({
            left: paddingH,
            right: paddingH,
            top: paddingV,
            bottom: paddingV
        });
        
        // Update text mode (manual only)
        this.mainTextComponent.fontSize = parseInt(this.uiManager.elements.fontSize.value);
        
        // Update line spacing
        this.mainTextComponent.lineSpacing = parseInt(this.uiManager.elements.lineSpacing.value);
        
        // Update main text cell padding (vertical and horizontal)
        const spacingV = this.uiManager.elements.marginVertical ? parseInt(this.uiManager.elements.marginVertical.value) : 0;
        const spacingH = this.uiManager.elements.marginHorizontal ? parseInt(this.uiManager.elements.marginHorizontal.value) : 0;
        this.mainTextComponent.setLineSpacing({
            vertical: spacingV,
            horizontal: spacingH
        });
        
        // Update wrapping (always enabled now)
        this.mainTextComponent.wrapText = true;
        
        // Update positioning (always manual mode)
        const activePos = document.querySelector('.pos-btn.active');
        if (activePos) {
            this.mainTextComponent.alignH = activePos.dataset.horizontal;
            this.mainTextComponent.alignV = activePos.dataset.vertical;
        } else {
            // Default to center alignment if no position button is active
            this.mainTextComponent.alignH = 'center';
            this.mainTextComponent.alignV = 'middle';
        }
        
        // Apply saved line alignments by converting content keys to numeric indices
        this.applySavedAlignments();
        
        // Sync styling to all grid cells
        this.syncGridCellStyling();
    }
    
    /**
     * Sync styling from main text component to all grid cells
     * @private
     */
    syncGridCellStyling() {
        if (!this.grid || !this.grid.matrix) return;
        
        // Get all text cells from the grid
        const textCells = this.grid.getAllCells().filter(cell => cell && cell.type === 'main-text');
        
        textCells.forEach(cell => {
            // Sync color
            cell.textComponent.color = this.mainTextComponent.color;
            
            // Sync highlight color
            cell.textComponent.highlightColor = this.mainTextComponent.highlightColor;
            
            // Sync highlight state
            cell.textComponent.highlight = this.mainTextComponent.highlight;
            
            // Sync other styling properties
            cell.textComponent.fontWeight = this.mainTextComponent.fontWeight;
            cell.textComponent.fontStyle = this.mainTextComponent.fontStyle;
            cell.textComponent.underline = this.mainTextComponent.underline;
            
            // Sync font properties
            cell.textComponent.fontFamily = this.mainTextComponent.fontFamily;
            cell.textComponent.fontSize = this.mainTextComponent.fontSize;
            cell.textComponent.lineSpacing = this.mainTextComponent.lineSpacing;
        });
    }
    
    /**
     * Get current application state for debugging
     * @returns {Object} Current state
     */
    getState() {
        return {
            textContent: this.uiManager.elements.mainText.value,
            textConfig: this.textEngine.getConfig(),
            spots: this.spots.map(spot => ({
                id: spot.id,
                type: spot.contentType,
                bounds: { x: spot.x, y: spot.y, width: spot.width, height: spot.height }
            })),
            canvasDimensions: this.canvasManager.getDimensions()
        };
    }

    /**
     * Handle canvas resize event from Chatooly CDN
     * @param {Event} e - Canvas resize event
     * @private
     */
    onCanvasResized(e) {
        if (!this.isInitialized || !e.detail) return;

        const newWidth = e.detail.canvas.width;
        const newHeight = e.detail.canvas.height;
        const oldWidth = this.previousCanvasSize.width;
        const oldHeight = this.previousCanvasSize.height;

        // Skip if this is the first resize or dimensions haven't changed
        if (oldWidth === 0 || oldHeight === 0 || (oldWidth === newWidth && oldHeight === newHeight)) {
            this.previousCanvasSize = { width: newWidth, height: newHeight };
            return;
        }

        // Calculate scale factors
        const scaleX = newWidth / oldWidth;
        const scaleY = newHeight / oldHeight;

        // Scale all spots
        this.spots.forEach(spot => {
            spot.x *= scaleX;
            spot.y *= scaleY;
            spot.width *= scaleX;
            spot.height *= scaleY;

            // Scale spot content if needed
            if (spot.content) {
                if (spot.content.fontSize) {
                    spot.content.fontSize = Math.round(spot.content.fontSize * Math.min(scaleX, scaleY));
                }
                if (spot.content.padding) {
                    spot.content.padding = Math.round(spot.content.padding * Math.min(scaleX, scaleY));
                }
            }
        });

        // Canvas dimensions are now automatically synced - no manual update needed

        // Update text engine configuration
        this.textEngine.updateConfig({
            canvasWidth: newWidth,
            canvasHeight: newHeight
        });

        // Update main text component
        this.mainTextComponent.setContainer(0, 0, newWidth, newHeight);

        // Scale padding
        const paddingH = Math.round(parseInt(this.uiManager.elements.paddingHorizontal.value) * scaleX);
        const paddingV = Math.round(parseInt(this.uiManager.elements.paddingVertical.value) * scaleY);
        this.uiManager.elements.paddingHorizontal.value = paddingH;
        this.uiManager.elements.paddingVertical.value = paddingV;
        this.uiManager.elements.paddingHorizontalValue.textContent = paddingH + 'px';
        this.uiManager.elements.paddingVerticalValue.textContent = paddingV + 'px';

        // Update tracking
        this.previousCanvasSize = { width: newWidth, height: newHeight };

        // Re-render everything
        this.render();

        // Trigger spot detection if auto-detect is enabled
        if (this.autoDetectSpots && this.uiManager && this.uiManager.elements && this.uiManager.elements.mainText.value.trim()) {
            this.autoDetectSpotsDebounced(300);
        }
    }

    /**
     * Run a test to verify everything is working
     * @returns {Object} Test results
     */
    runTest() {
        try {
            // Set test text
            this.uiManager.elements.mainText.value = 'TEST\nSPOT\nDETECTION';
            this.onTextChanged();
            
            // Run detection
            this.detectSpots();
            
            // Check results
            const hasText = this.textEngine.getTextBounds().length > 0;
            const hasSpots = this.spots.length > 0;
            const canRender = true; // If we get here, rendering worked
            
            const result = {
                success: hasText && hasSpots && canRender,
                textLines: this.textEngine.getTextBounds().length,
                spotsFound: this.spots.length,
                canvasSize: this.canvasManager.getDimensions(),
                textEngine: hasText,
                spotDetector: hasSpots,
                canvasManager: canRender
            };

            return result;
            
        } catch (error) {
            console.error('❌ Test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Canvas click handler removed - spot editing now handled through unified sidebar
     */
    
    
    
    
    /**
     * Set background image
     * @param {HTMLImageElement} image - Image to set as background
     */
    setBackgroundImage(image) {
        this.backgroundImage = image;
        this.render();
    }
    
    /**
     * Clear background image
     */
    clearBackgroundImage() {
        this.canvasManager.setBackgroundImage(null);
        this.backgroundImage = null;
        this.render();
    }
    
    /**
     * Set background video
     * @param {File|HTMLVideoElement} video - Video file or element
     */
    setBackgroundVideo(video) {
        this.canvasManager.setBackgroundVideo(video, () => {
            // Video loaded callback
            this.backgroundVideo = this.canvasManager.backgroundManager.backgroundVideo;
            this.backgroundImage = null; // Clear image when setting video
            this.render();
            
            // Start animation loop for video frame updates
            this._startAnimationLoop();
        });
    }
    
    /**
     * Clear background video
     */
    clearBackgroundVideo() {
        this.canvasManager.clearBackgroundVideo();
        this.backgroundVideo = null;
        this.render();
    }
    
    /**
     * Set background fit mode
     * @param {string} mode - 'fit', 'fill', or 'stretch'
     */
    setBackgroundFitMode(mode) {
        this.canvasManager.setBackgroundFitMode(mode);
        this.render();
    }
    
    /**
     * Render background image on canvas if set
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @private
     */
    renderBackgroundImage(ctx) {
        if (!this.backgroundImage) return;
        
        const canvas = this.canvasManager.canvas;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Calculate scaling to fit the image in the canvas while maintaining aspect ratio
        const imageAspect = this.backgroundImage.width / this.backgroundImage.height;
        const canvasAspect = canvasWidth / canvasHeight;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (imageAspect > canvasAspect) {
            // Image is wider than canvas - fit to height
            drawHeight = canvasHeight;
            drawWidth = drawHeight * imageAspect;
            drawX = (canvasWidth - drawWidth) / 2;
            drawY = 0;
        } else {
            // Image is taller than canvas - fit to width
            drawWidth = canvasWidth;
            drawHeight = drawWidth / imageAspect;
            drawX = 0;
            drawY = (canvasHeight - drawHeight) / 2;
        }
        
        // Draw the background image
        ctx.drawImage(this.backgroundImage, drawX, drawY, drawWidth, drawHeight);
    }

    /**
     * Save current state as a preset
     * @param {string} presetName - Name for the preset
     */
    savePreset(presetName) {
        if (!this.presetManager) {
            console.error('PresetManager not initialized');
            return;
        }
        this.presetManager.downloadPreset(presetName);
    }

    /**
     * Load a preset from JSON data
     * @param {Object} presetData - Preset JSON data
     */
    async loadPreset(presetData) {
        if (!this.presetManager) {
            console.error('PresetManager not initialized');
            return;
        }
        await this.presetManager.deserializeState(presetData);
    }

    /**
     * Initialize preset UI in the presets tab
     */
    initializePresetUI() {
        if (!this.presetUIComponent) {
            console.error('PresetUIComponent not initialized');
            return;
        }
        
        const presetsContainer = document.getElementById('presetsContainer');
        
        if (presetsContainer) {
            this.presetUIComponent.render(presetsContainer);
        } else {
            console.error('App: presetsContainer element not found');
        }
    }

    /**
     * Initialize Wix Cloud API for preset storage
     */
    async initializeWixCloud() {
        try {
            console.log('🔄 Initializing Wix Cloud Backend...');

            // Dynamically import modules
            const { WixPresetAPI } = await import('./api/WixPresetAPI.js');
            const { WIX_CONFIG } = await import('./config/wix-config.js');

            // Create and initialize Wix API
            this.wixAPI = new WixPresetAPI();
            await this.wixAPI.initialize(WIX_CONFIG.clientId, WIX_CONFIG.apiKey, WIX_CONFIG.siteId);

            // Expose WixAPI globally for FontManager to use
            window.wixAPI = this.wixAPI;

            // Connect Wix API to PresetManager
            this.presetManager.setWixAPI(this.wixAPI);

            console.log('✅ Wix Cloud Backend initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize Wix Cloud Backend:', error);
            console.warn('⚠️ Preset system will not be available');
            // Don't throw - app can still work without cloud presets
        }
    }


}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Create global app instance
        window.employerBrandTool = new EmployerBrandToolPOC();

        // Add to global scope for debugging
        window.app = window.employerBrandTool;

    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        alert('Failed to initialize application. Please refresh and try again.');
    }
});

// Required by Chatooly for high-res export
window.renderHighResolution = function(targetCanvas, scale) {
    if (!window.employerBrandTool || !window.employerBrandTool.isInitialized) {
        console.warn('App not ready for high-res export');
        return;
    }

    const app = window.employerBrandTool;
    const ctx = targetCanvas.getContext('2d');

    // Set up scaled canvas
    const originalWidth = app.canvasManager.canvas.width;
    const originalHeight = app.canvasManager.canvas.height;
    targetCanvas.width = originalWidth * scale;
    targetCanvas.height = originalHeight * scale;

    ctx.save();
    ctx.scale(scale, scale);

    // Temporarily swap canvas and context for rendering
    const originalCanvas = app.canvasManager.canvas;
    const originalCtx = app.canvasManager.ctx;

    // Set export canvas and context
    app.canvasManager.canvas = targetCanvas;
    app.canvasManager.ctx = ctx;

    // NEW: Use the same render flow as normal rendering (grid/layer system)
    // Render background
    app.canvasManager.renderBackground();

    // Render using the unified grid architecture (no debug overlays for export)
    app._renderWithAnimations();

    // Restore original canvas and context
    app.canvasManager.canvas = originalCanvas;
    app.canvasManager.ctx = originalCtx;

    ctx.restore();
};