/**
 * PresetManager.js - Core preset save/load system
 * Handles serialization and deserialization of complete canvas states
 */

class PresetManager {
    constructor(app) {
        this.app = app;
        this.wixAPI = null; // Will be set by app.js after WixAPI initialization
    }

    /**
     * Set Wix API instance for cloud operations
     * @param {WixPresetAPI} wixAPI - Initialized WixPresetAPI instance
     */
    setWixAPI(wixAPI) {
        this.wixAPI = wixAPI;
        console.log('✅ WixAPI connected to PresetManager');
    }

    /**
     * Safe render wrapper that checks canvas is ready before rendering
     * Prevents "negative canvas dimensions" errors during async media loading
     * @private
     */
    safeRender() {
        try {
            // Check that app and canvas are initialized
            if (!this.app || !this.app.canvasManager || !this.app.canvasManager.canvas) {
                return;
            }

            // Check canvas has valid dimensions
            const canvas = this.app.canvasManager.canvas;
            if (canvas.width <= 0 || canvas.height <= 0) {
                return;
            }

            // Safe to render
            this.app.render();
        } catch (error) {
            console.error('Failed to render canvas:', error);
        }
    }

    /**
     * Serialize the complete application state to JSON
     * @param {string} presetName - Name for the preset
     * @returns {Object} Complete state object ready for JSON.stringify
     */
    serializeState(presetName) {
        try {
            const state = {
                presetName: presetName,
                createdAt: new Date().toISOString(),
                version: "1.0",
                canvas: this.serializeCanvasState(),
                background: this.serializeBackgroundState(),
                mainText: this.serializeMainTextState(),
                grid: this.serializeGridState(),
                layers: this.serializeLayerState(),
                customFonts: this.serializeCustomFontsState()
            };

            return state;
        } catch (error) {
            console.error('❌ Failed to serialize state:', error);
            throw new Error('Failed to serialize canvas state: ' + error.message);
        }
    }

    /**
     * Serialize custom fonts used in the preset
     * @returns {Array} Array of custom font data with CDN URLs
     * @private
     */
    serializeCustomFontsState() {
        const mainText = this.app.mainTextComponent;
        const fontManager = window.fontManager;

        // Safety check - fontManager might not be initialized yet
        if (!fontManager) {
            console.warn('⚠️ FontManager not initialized - skipping custom fonts');
            return [];
        }

        // Check if main text uses a custom font
        const customFont = fontManager.getFontByFamily(mainText.fontFamily);

        if (customFont && customFont.cdnUrl) {
            console.log(`📝 Including custom font in preset: ${customFont.name}`);
            return [{
                name: customFont.name,
                family: customFont.family,
                fileName: customFont.fileName,
                cdnUrl: customFont.cdnUrl,
                mimeType: customFont.mimeType
            }];
        }

        // No custom fonts used
        return [];
    }

    /**
     * Serialize canvas settings
     * @returns {Object} Canvas state
     * @private
     */
    serializeCanvasState() {
        return {
            width: this.app.canvasManager.canvas.width,
            height: this.app.canvasManager.canvas.height,
            backgroundColor: this.app.canvasManager.backgroundManager.backgroundColor,
            backgroundFitMode: this.app.canvasManager.backgroundManager.backgroundFitMode,
            padding: {
                left: parseInt(this.app.uiManager.elements.paddingHorizontal?.value || 20),
                right: parseInt(this.app.uiManager.elements.paddingHorizontal?.value || 20),
                top: parseInt(this.app.uiManager.elements.paddingVertical?.value || 20),
                bottom: parseInt(this.app.uiManager.elements.paddingVertical?.value || 20)
            }
        };
    }

    /**
     * Serialize background state (supports both cloud URLs and localStorage data URLs)
     * @returns {Object} Background state
     * @private
     */
    serializeBackgroundState() {
        const bg = this.app.canvasManager.backgroundManager;

        const hasImage = !!bg.backgroundImage;
        console.log('📸 SAVE: Serializing background state...');
        console.log('   → Has image element:', hasImage);
        if (hasImage) {
            console.log('   → Image element type:', bg.backgroundImage.constructor.name);
            console.log('   → Image dimensions:', bg.backgroundImage.width, 'x', bg.backgroundImage.height);

            // For localStorage: Use data URL if available (from file upload)
            // For cloud: imageElement will be uploaded and URL set in saveToCloud()
            const hasDataURL = !!bg.backgroundImageDataURL;
            const hasCloudURL = !!bg.backgroundImageURL;
            console.log('   → Has data URL:', hasDataURL);
            console.log('   → Has cloud URL:', hasCloudURL);

            if (hasDataURL) {
                console.log('   → Using data URL for localStorage');
            } else if (hasCloudURL) {
                console.log('   → Using cloud URL');
            } else {
                console.log('   → Image will be uploaded to cloud');
            }
        } else {
            console.log('   → No image to serialize');
        }

        return {
            color: bg.backgroundColor,
            // Use data URL for localStorage, cloud URL if available, or null for upload
            imageURL: bg.backgroundImageDataURL || bg.backgroundImageURL || null,
            imageElement: bg.backgroundImage, // Temp reference for upload
            fitMode: bg.backgroundFitMode,
            videoSettings: {
                autoplay: this.app.uiManager.elements.backgroundVideoAutoplay?.checked || false,
                loop: this.app.uiManager.elements.backgroundVideoLoop?.checked || false
            }
        };
    }

    /**
     * Serialize main text state
     * @returns {Object} Main text state
     * @private
     */
    serializeMainTextState() {
        const mainText = this.app.mainTextComponent;
        const ui = this.app.uiManager.elements;

        return {
            content: mainText.text,
            fontFamily: mainText.fontFamily,
            fontSize: mainText.fontSize,
            color: mainText.color,
            lineSpacing: mainText.lineSpacing,
            marginVertical: parseInt(ui.marginVertical?.value || 0),
            marginHorizontal: parseInt(ui.marginHorizontal?.value || 0),
            fontWeight: mainText.fontWeight,
            fontStyle: mainText.fontStyle,
            underline: mainText.underline,
            highlight: mainText.highlight,
            highlightColor: mainText.highlightColor,
            alignH: mainText.alignH,
            alignV: mainText.alignV,
            lineAlignments: { ...this.app.savedLineAlignments },
            fillWithBackgroundColor: this.app.mainTextFillWithBackgroundColor
        };
    }

    /**
     * Serialize grid state including all cells
     * @returns {Object} Grid state
     * @private
     */
    serializeGridState() {
        if (!this.app.grid) {
            return { rows: 0, cols: 0, minCellSize: 50, snapshot: null };
        }

        // Use existing Grid.serialize() method
        const gridSnapshot = this.app.grid.serialize();

        // Process cells for media serialization
        if (gridSnapshot.layout && gridSnapshot.layout.cells) {
            gridSnapshot.layout.cells = gridSnapshot.layout.cells.map(cellData => {
                return this.processCellContentForSerialization(cellData);
            });
        }

        return {
            rows: this.app.grid.rows,
            cols: this.app.grid.cols,
            minCellSize: this.app.minSpotSize || 50,
            snapshot: gridSnapshot
        };
    }

    /**
     * Process cell content for cloud serialization (NO base64 - URLs only)
     * @param {Object} cellData - Cell data from existing serialize() method
     * @returns {Object} Processed cell data with temp image references for upload
     * @private
     */
    processCellContentForSerialization(cellData) {
        if (!cellData.content) return cellData;

        const processedData = { ...cellData };
        const content = { ...cellData.content };

        // Handle media content - keep mediaUrl from ContentCell
        if (cellData.contentType === 'media' && cellData.content.media) {
            if (cellData.content.media instanceof HTMLImageElement) {
                console.log(`📸 SAVE: Processing cell ${cellData.id} with image`);
                console.log('   → Image dimensions:', cellData.content.media.width, 'x', cellData.content.media.height);
                console.log('   → mediaUrl:', cellData.content.mediaUrl);
                content.mediaType = 'image';
                content.media = null; // Remove actual element (mediaUrl is preserved)
            } else if (cellData.content.media instanceof HTMLVideoElement) {
                console.log(`🎥 SAVE: Processing cell ${cellData.id} with video`);
                console.log('   → Video dimensions:', cellData.content.media.videoWidth, 'x', cellData.content.media.videoHeight);
                console.log('   → Video duration:', cellData.content.media.duration, 'seconds');

                // Check if video is from CDN (via mediaUrl) - if so, preserve it
                const videoSrc = cellData.content.media.src;
                const mediaUrl = cellData.content.mediaUrl;

                // Check for Wix CDN URLs (videos use video.wixstatic.com, images use static.wixstatic.com)
                const isWixCDN = (url) => url && url.includes('.wixstatic.com/');

                if (isWixCDN(videoSrc) || isWixCDN(mediaUrl)) {
                    // Already a CDN URL - save it directly, no upload needed
                    console.log('   ✅ Wix CDN video detected - saving directly');
                    content.videoURL = mediaUrl || videoSrc;
                    content.mediaType = 'video';
                    content.media = null;
                    // Don't set videoElement - no upload needed
                } else {
                    // Local video - needs upload (will fail with 403 due to OAuth limitations)
                    console.log('   ⚠️ Local video detected - will attempt upload');
                    content.videoElement = cellData.content.media; // Temp ref for upload
                    content.videoURL = null; // Will be set during cloud upload
                    content.mediaType = 'video';
                    content.media = null; // Remove actual element
                }
            }
        }

        // Remove non-serializable properties
        const nonSerializable = ['lottieAnimation', 'lottieContainer', 'media'];
        nonSerializable.forEach(prop => {
            if (content[prop] !== undefined) {
                delete content[prop];
            }
        });

        processedData.content = content;
        return processedData;
    }

    /**
     * Serialize layer state
     * @returns {Object} Layer state
     * @private
     */
    serializeLayerState() {
        const assignments = {};
        
        if (this.app.grid) {
            const allCells = this.app.grid.getAllCells();
            allCells.forEach(cell => {
                if (cell && cell.id) {
                    assignments[cell.id] = cell.layerId;
                }
            });
        }

        return {
            assignments: assignments,
            stats: this.app.layerManager.getLayerStats()
        };
    }

    /**
     * Deserialize state from JSON and restore application
     * @param {Object} stateData - Serialized state object
     */
    async deserializeState(stateData) {
        try {
            console.log('📦 LOAD: Deserializing preset...');
            console.log('   → Preset name:', stateData.presetName);
            console.log('   → Has background image:', !!stateData.background?.imageURL);
            if (stateData.background?.imageURL) {
                console.log('   → Background image URL length:', stateData.background.imageURL.length, 'characters');
            }

            // Validate the preset structure
            this.validatePresetJSON(stateData);

            // Load custom fonts if present in preset
            if (stateData.customFonts && stateData.customFonts.length > 0) {
                console.log('🔤 LOAD: Loading custom fonts from preset...');
                await this.restoreCustomFontsState(stateData.customFonts);

                // Refresh font dropdown to show newly loaded fonts
                if (this.app.uiManager && this.app.uiManager.refreshFontFamilyDropdown) {
                    this.app.uiManager.refreshFontFamilyDropdown();
                    console.log('   ✅ Font dropdown refreshed with preset fonts');
                }
            }

            // Clear existing state completely
            this.clearCurrentState();

            // Restore in order (all synchronous, no delays)
            console.log('🔄 LOAD: Restoring canvas state...');
            this.restoreCanvasState(stateData.canvas);       // Canvas size FIRST
            console.log('   ✅ Canvas restored:', this.app.canvasManager.canvas.width, 'x', this.app.canvasManager.canvas.height);

            console.log('🔄 LOAD: Restoring background state...');
            this.restoreBackgroundState(stateData.background);
            console.log('   ✅ Background restored');

            console.log('🔄 LOAD: Restoring main text state...');
            console.log('   → Font:', stateData.mainText.fontFamily);
            console.log('   → Font size:', stateData.mainText.fontSize);
            console.log('   → Text length:', stateData.mainText.content.length, 'characters');
            this.restoreMainTextState(stateData.mainText);   // Now syncs textEngine properly

            // Check textBounds after setText
            const textBoundsAfterRestore = this.app.textEngine?.textBounds || [];
            console.log('   ✅ Text restored, textBounds count:', textBoundsAfterRestore.length);
            if (textBoundsAfterRestore.length > 0) {
                const b = textBoundsAfterRestore[0];
                console.log('   → First line bounds: x=' + b.x.toFixed(2) + ' y=' + b.y.toFixed(2) +
                           ' w=' + b.width.toFixed(2) + ' h=' + b.height.toFixed(2));
            }

            console.log('🔄 LOAD: Restoring grid state...');
            this.restoreGridState(stateData.grid);           // Grid deserialize
            console.log('   ✅ Grid state deserialized');

            console.log('🔄 LOAD: Restoring layer state...');
            this.restoreLayerState(stateData.layers);
            console.log('   ✅ Layers restored');

            // Update UI elements to match restored state (no renders triggered)
            console.log('🔄 LOAD: Updating UI elements...');
            this.updateUIElements(stateData);
            console.log('   ✅ UI updated');

            // Apply saved alignments (like onTextChanged does)
            console.log('🔄 LOAD: Applying saved alignments...');
            console.log('   → BEFORE applySavedAlignments:');
            console.log('      mainTextComponent.fontSize:', this.app.mainTextComponent.fontSize);
            console.log('      textEngine.config.fontSize:', this.app.textEngine.config.fontSize);
            if (this.app.applySavedAlignments) {
                this.app.applySavedAlignments();
            }
            console.log('   → AFTER applySavedAlignments:');
            console.log('      mainTextComponent.fontSize:', this.app.mainTextComponent.fontSize);
            console.log('      textEngine.config.fontSize:', this.app.textEngine.config.fontSize);

            // Check textBounds after alignment
            const textBoundsAfterAlignment = this.app.textEngine?.textBounds || [];
            console.log('   ✅ Alignments applied, textBounds count:', textBoundsAfterAlignment.length);
            if (textBoundsAfterAlignment.length > 0) {
                const b = textBoundsAfterAlignment[0];
                console.log('   → First line after alignment: x=' + b.x.toFixed(2) + ' y=' + b.y.toFixed(2) +
                           ' w=' + b.width.toFixed(2) + ' h=' + b.height.toFixed(2));
            }

            // Update line alignment controls
            if (this.app.uiManager && this.app.uiManager.updateLineAlignmentControls) {
                this.app.uiManager.updateLineAlignmentControls();
            }

            // CRITICAL FIX: Force complete text recalculation after alignments
            // applySavedAlignments() modifies positions but doesn't recalculate dimensions
            // This matches what happens when user changes font size (triggers onTextChanged)
            console.log('🔄 LOAD: Forcing complete text recalculation...');
            if (this.app.textEngine) {
                this.app.textEngine.setText(stateData.mainText.content);
            }

            // Check textBounds after forced recalculation
            const textBoundsAfterRecalc = this.app.textEngine?.textBounds || [];
            console.log('   ✅ Text recalculated, textBounds count:', textBoundsAfterRecalc.length);
            if (textBoundsAfterRecalc.length > 0) {
                const b = textBoundsAfterRecalc[0];
                console.log('   → First line after recalc: x=' + b.x.toFixed(2) + ' y=' + b.y.toFixed(2) +
                           ' w=' + b.width.toFixed(2) + ' h=' + b.height.toFixed(2));
            }

            // CRITICAL: Wait for fonts to load before building grid
            // This ensures text measurements are accurate
            console.log('⏳ LOAD: Waiting for fonts to load...');
            console.log('   → Current fonts status:', document.fonts.status);
            console.log('   → Number of fonts:', document.fonts.size);
            await document.fonts.ready;
            console.log('✅ LOAD: Fonts loaded');
            console.log('   → Fonts status after ready:', document.fonts.status);

            // Check textBounds after font ready
            const textBoundsAfterFonts = this.app.textEngine?.textBounds || [];
            console.log('   → TextBounds count after fonts:', textBoundsAfterFonts.length);
            if (textBoundsAfterFonts.length > 0) {
                const b = textBoundsAfterFonts[0];
                console.log('   → First line after fonts: x=' + b.x.toFixed(2) + ' y=' + b.y.toFixed(2) +
                           ' w=' + b.width.toFixed(2) + ' h=' + b.height.toFixed(2));
            }

            // Rebuild grid from scratch (uses fresh textEngine data)
            console.log('🔄 LOAD: Building grid from textEngine...');
            if (this.app.grid) {
                this.app.grid.buildFromExisting();
                const allCells = this.app.grid.getAllCells();
                console.log('   ✅ Grid built, cells:', allCells.length);
                console.log('   → Grid dimensions:', this.app.grid.rows, 'rows x', this.app.grid.cols, 'cols');

                // Log first main text cell bounds for comparison
                const firstTextCell = allCells.find(cell => cell.type === 'main-text');
                if (firstTextCell) {
                    const cb = firstTextCell.bounds;
                    console.log('   → First text CELL bounds: x=' + cb.x.toFixed(2) + ' y=' + cb.y.toFixed(2) +
                               ' w=' + cb.width.toFixed(2) + ' h=' + cb.height.toFixed(2));
                }

                // Sync spots array with grid
                this.app.spots = this.app.grid.getContentCells();
                console.log('   → Content cells:', this.app.spots.length);
                if (this.app.uiManager && this.app.uiManager.updateSpotsUI) {
                    this.app.uiManager.updateSpotsUI();
                }
            }

            // Single synchronous render (no setTimeout, no redundant calls)
            console.log('🎨 LOAD: Rendering canvas...');
            console.log('   → MainTextComponent font:', this.app.mainTextComponent.fontFamily);
            console.log('   → MainTextComponent fontSize:', this.app.mainTextComponent.fontSize);
            console.log('   → MainTextComponent text:', this.app.mainTextComponent.text);
            console.log('   → TextEngine config fontSize:', this.app.textEngine.config.fontSize);
            console.log('   → TextEngine config fontFamily:', this.app.textEngine.config.fontFamily);
            this.app.render();
            console.log('   ✅ Canvas rendered');

            console.log('✅ Preset loaded successfully');

        } catch (error) {
            console.error('❌ Failed to deserialize state:', error);
            alert(`Failed to load preset: ${error.message}\n\nCheck console for details.`);
            window.location.reload();
        }
    }

    /**
     * Validate preset JSON structure
     * @param {Object} json - JSON to validate
     * @throws {Error} If JSON is invalid
     * @private
     */
    validatePresetJSON(json) {
        if (!json || typeof json !== 'object') {
            throw new Error('Invalid preset: Not a valid JSON object');
        }

        const required = ['presetName', 'canvas', 'background', 'mainText', 'grid', 'layers'];
        for (const field of required) {
            if (!(field in json)) {
                throw new Error(`Invalid preset: Missing required field '${field}'`);
            }
        }

        // Validate canvas structure
        if (!json.canvas.width || !json.canvas.height) {
            throw new Error('Invalid preset: Canvas dimensions missing');
        }

        // Validate main text structure
        if (typeof json.mainText.content !== 'string') {
            throw new Error('Invalid preset: Main text content missing');
        }
    }

    /**
     * Clear all current application state
     * @private
     */
    clearCurrentState() {
        // Clear text
        this.app.uiManager.elements.mainText.value = '';
        this.app.mainTextComponent.text = '';

        // Clear spots and waiting spots completely
        this.app.spots = [];
        this.app.savedSpotData = [];
        this.app.waitingSpots = []; // Ensure waiting spots are cleared

        // Clear saved alignments
        this.app.savedLineAlignments = {};

        // Clear background
        this.app.canvasManager.clearBackgroundMedia();

        // Clear grid completely
        if (this.app.grid) {
            // Clear the matrix and reset grid state
            this.app.grid.matrix = [];
            this.app.grid.rows = 0;
            this.app.grid.cols = 0;
            this.app.grid.isReady = false;
            this.app.grid.waitingContent = []; // Clear waiting content in grid

            // Clear all cells from layers
            this.app.grid.getAllCells().forEach(cell => {
                if (cell && cell.layerId) {
                    const layer = this.app.layerManager.getLayer(cell.layerId);
                    if (layer) {
                        layer.removeCell(cell);
                    }
                }
            });
        }

        // Clear layers
        this.app.layerManager.clearAllLayers();
    }

    /**
     * Restore canvas state
     * @param {Object} canvasData - Canvas state data
     * @private
     */
    restoreCanvasState(canvasData) {
        // Set canvas size via Chatooly CDN FIRST
        if (window.Chatooly && window.Chatooly.canvasResizer) {
            window.Chatooly.canvasResizer.setExportSize(
                canvasData.width,
                canvasData.height
            );
            window.Chatooly.canvasResizer.applyExportSize();
        }

        // Update textEngine canvas dimensions
        this.app.textEngine.updateConfig({
            canvasWidth: canvasData.width,
            canvasHeight: canvasData.height
        });

        // Update mainTextComponent container
        this.app.mainTextComponent.setContainer(
            0, 0,
            canvasData.width,
            canvasData.height
        );

        // Update padding
        if (this.app.uiManager.elements.paddingHorizontal) {
            this.app.uiManager.elements.paddingHorizontal.value = canvasData.padding.left;
        }
        if (this.app.uiManager.elements.paddingVertical) {
            this.app.uiManager.elements.paddingVertical.value = canvasData.padding.top;
        }
    }

    /**
     * Restore background state from URL (supports both cloud URLs and data URLs)
     * @param {Object} backgroundData - Background state data
     * @private
     */
    restoreBackgroundState(backgroundData) {
        const bg = this.app.canvasManager.backgroundManager;

        // Set background color
        bg.setBackgroundColor(backgroundData.color);

        // Restore background image from URL (cloud CDN or data URL)
        if (backgroundData.imageURL) {
            console.log('🔄 LOAD: Restoring background image...');
            const isDataURL = backgroundData.imageURL.startsWith('data:');
            console.log('   → URL type:', isDataURL ? 'data URL' : 'cloud URL');
            console.log('   → URL length:', backgroundData.imageURL.length, 'characters');

            const img = new Image();
            img.crossOrigin = 'anonymous'; // Enable CORS for CDN images
            img.onload = () => {
                // Store both image element and data URL in BackgroundManager
                bg.backgroundImage = img;
                if (isDataURL) {
                    bg.backgroundImageDataURL = backgroundData.imageURL;
                } else {
                    bg.backgroundImageURL = backgroundData.imageURL;
                    bg.backgroundImageDataURL = null;
                }
                // Trigger render after image loads so it appears on canvas
                this.safeRender();
            };
            img.onerror = (e) => {
                console.error('   ❌ LOAD: Failed to load background image!');
                console.error('   → Error type:', e.type);
                console.error('   → URL preview:', backgroundData.imageURL.substring(0, 100) + '...');
            };
            img.src = backgroundData.imageURL;
        } else {
            console.log('ℹ️ LOAD: No background image URL to restore');
        }

        // Set fit mode
        bg.setBackgroundFitMode(backgroundData.fitMode);

        // Restore video settings (UI only)
        if (this.app.uiManager.elements.backgroundVideoAutoplay) {
            this.app.uiManager.elements.backgroundVideoAutoplay.checked = backgroundData.videoSettings.autoplay;
        }
        if (this.app.uiManager.elements.backgroundVideoLoop) {
            this.app.uiManager.elements.backgroundVideoLoop.checked = backgroundData.videoSettings.loop;
        }
    }

    /**
     * Restore main text state
     * @param {Object} mainTextData - Main text state data
     * @private
     */
    restoreMainTextState(mainTextData) {
        console.log('   🔍 RESTORE: Starting main text restoration...');
        const ui = this.app.uiManager.elements;
        const mainText = this.app.mainTextComponent;

        // 1. Update UI elements (for visibility)
        console.log('   → Step 1: Updating UI elements');
        ui.mainText.value = mainTextData.content;
        if (ui.fontFamily) {
            ui.fontFamily.value = mainTextData.fontFamily;
        }
        if (ui.fontSize) {
            ui.fontSize.value = mainTextData.fontSize;
        }
        if (ui.textColor) {
            ui.textColor.value = mainTextData.color;
        }
        if (ui.mainTextHighlightColor) {
            ui.mainTextHighlightColor.value = mainTextData.highlightColor;
        }
        if (ui.marginVertical) {
            ui.marginVertical.value = mainTextData.marginVertical;
        }
        if (ui.marginHorizontal) {
            ui.marginHorizontal.value = mainTextData.marginHorizontal;
        }

        // 2. Update mainTextComponent (visual properties)
        console.log('   → Step 2: Updating mainTextComponent properties');
        mainText.text = mainTextData.content;
        mainText.fontFamily = mainTextData.fontFamily;
        mainText.fontSize = mainTextData.fontSize;
        mainText.color = mainTextData.color;
        mainText.fontWeight = mainTextData.fontWeight;
        mainText.fontStyle = mainTextData.fontStyle;
        mainText.underline = mainTextData.underline;
        mainText.highlight = mainTextData.highlight;
        mainText.highlightColor = mainTextData.highlightColor;
        mainText.lineSpacing = mainTextData.lineSpacing;
        mainText.alignH = mainTextData.alignH;
        mainText.alignV = mainTextData.alignV;

        // 3. Sync to textEngine (CRITICAL - SAME AS onTextChanged)
        // This is the missing piece that causes margins/alignment bugs!
        console.log('   → Step 3: Syncing to textEngine config');
        console.log('      BEFORE updateConfig, textEngine.config.fontSize:', this.app.textEngine.config.fontSize);
        console.log('      Calling updateConfig with fontSize:', mainTextData.fontSize);

        this.app.textEngine.updateConfig({
            fontSize: mainTextData.fontSize,
            fontFamily: mainTextData.fontFamily,
            color: mainTextData.color,
            lineSpacing: mainTextData.lineSpacing,
            marginVertical: mainTextData.marginVertical,
            marginHorizontal: mainTextData.marginHorizontal,
            defaultAlignment: mainTextData.alignH,
            textPositionHorizontal: mainTextData.alignH,
            textPositionVertical: mainTextData.alignV,
            textStyles: {
                bold: mainTextData.fontWeight === 'bold',
                italic: mainTextData.fontStyle === 'italic',
                underline: mainTextData.underline,
                highlight: mainTextData.highlight,
                highlightColor: mainTextData.highlightColor
            }
        });

        console.log('      AFTER updateConfig, textEngine.config.fontSize:', this.app.textEngine.config.fontSize);

        // 4. Set text and recalculate bounds (CRITICAL)
        // Without this, textEngine.textBounds stays empty and grid can't render
        console.log('   → Step 4: Calling textEngine.setText() - THIS MEASURES TEXT');
        this.app.textEngine.setText(mainTextData.content);
        console.log('   → After setText, textBounds length:', this.app.textEngine.textBounds.length);

        // 5. Restore line alignments
        console.log('   → Step 5: Restoring line alignments');
        this.app.savedLineAlignments = { ...mainTextData.lineAlignments };

        // 6. Apply line alignments to textEngine
        console.log('   → Step 6: Applying line alignments to textEngine');
        if (mainTextData.lineAlignments) {
            Object.entries(mainTextData.lineAlignments).forEach(([index, alignment]) => {
                this.app.textEngine.setLineAlignment(parseInt(index), alignment);
            });
        }

        // 7. Set background fill preference
        console.log('   → Step 7: Setting background fill preference');
        this.app.mainTextFillWithBackgroundColor = mainTextData.fillWithBackgroundColor;
        if (ui.mainTextFillWithBackgroundColor) {
            ui.mainTextFillWithBackgroundColor.checked = mainTextData.fillWithBackgroundColor;
        }

        // 8. Update UI button states
        console.log('   → Step 8: Updating UI button states');
        this.updateTextStyleButtons();
        console.log('   ✅ RESTORE: Main text restoration complete');
    }

    /**
     * Restore grid state
     * @param {Object} gridData - Grid state data
     * @private
     */
    restoreGridState(gridData) {
        if (!this.app.grid) return;
        
        // Set minimum cell size
        this.app.minSpotSize = gridData.minCellSize;
        if (this.app.uiManager.elements.minSpotSize) {
            this.app.uiManager.elements.minSpotSize.value = gridData.minCellSize;
        }
        
        // Clear existing grid
        if (this.app.grid) {
            // Clear the matrix and reset grid state
            this.app.grid.matrix = [];
            this.app.grid.rows = 0;
            this.app.grid.cols = 0;
            this.app.grid.isReady = false;
            
            // Clear all cells from layers
            this.app.grid.getAllCells().forEach(cell => {
                if (cell && cell.layerId) {
                    const layer = this.app.layerManager.getLayer(cell.layerId);
                    if (layer) {
                        layer.removeCell(cell);
                    }
                }
            });
        }
        
        // Use existing Grid.deserialize() method
        if (gridData.snapshot) {
            this.app.grid.deserialize(gridData.snapshot);
        }
        
        // Process any media content that needs restoration
        this.restoreMediaContent();
        
        // Update spots array (but don't use it for rendering - grid handles ContentCells)
        this.app.spots = this.app.grid.getContentCells();
        
        // Update UI (but don't trigger render yet)
        if (this.app.uiManager.updateSpotsUI) {
            this.app.uiManager.updateSpotsUI();
        }
        
        // Don't trigger grid rebuild here - it causes multiple renders
        // The grid is already properly deserialized
    }

    /**
     * Restore media content from Wix CDN URLs (images and videos)
     * @private
     */
    restoreMediaContent() {
        if (!this.app.grid) return;

        const allCells = this.app.grid.getAllCells();

        allCells.forEach(cell => {
            if (cell && cell.type === 'content' && cell.content) {
                // Restore videos first (they have priority)
                if (cell.content.videoURL) {
                    this.restoreVideoFromURL(cell, cell.content.videoURL);
                }
                // Restore images - support both imageURL and mediaUrl for compatibility
                // Only restore as image if no videoURL exists
                else {
                    const imageURL = cell.content.imageURL || cell.content.mediaUrl;
                    if (imageURL) {
                        this.restoreImageFromURL(cell, imageURL);
                    }
                }
            }
        });
    }

    /**
     * Restore image from Wix CDN URL
     * @param {ContentCell} cell - Cell to restore image to
     * @param {string} imageURL - Wix CDN URL
     * @private
     */
    restoreImageFromURL(cell, imageURL) {
        console.log(`🔄 LOAD: Restoring cell image for ${cell.id}...`);

        const img = new Image();
        img.crossOrigin = 'anonymous'; // Enable CORS for CDN images
        img.onload = () => {
            if (cell.content) {
                cell.content.media = img; // CellRenderer looks for .media not .image
                // Trigger render after image loads so it appears on canvas
                this.safeRender();
            }
        };
        img.onerror = (e) => {
            console.error(`   ❌ LOAD: Failed to load cell image! (${cell.id})`);
            console.error('   → Error type:', e.type);
            console.error('   → URL preview:', imageURL.substring(0, 100) + '...');
        };
        img.src = imageURL;
    }

    /**
     * Restore video from Wix CDN URL
     * @param {ContentCell} cell - Cell to restore video to
     * @param {string} videoURL - Wix CDN URL
     * @private
     */
    restoreVideoFromURL(cell, videoURL) {
        console.log(`🔄 LOAD: Restoring cell video for ${cell.id}...`);

        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true; // Required for autoplay
        video.loop = true; // Always loop
        video.autoplay = true; // Always autoplay
        video.playsInline = true;

        video.addEventListener('loadedmetadata', () => {
            if (cell.content) {
                cell.content.media = video; // CellRenderer looks for .media
                cell.content.autoplay = true; // Store in content
                cell.content.loop = true; // Store in content

                // Start playing immediately
                video.play().then(() => {
                    console.log(`   ✅ Video playing for cell ${cell.id}`);
                }).catch((error) => {
                    console.warn(`   ⚠️ Autoplay prevented for cell ${cell.id}:`, error.message);
                    // Try playing again after user interaction
                    document.addEventListener('click', () => {
                        video.play().catch(() => {});
                    }, { once: true });
                });

                // Trigger render after video loads so it appears on canvas
                this.safeRender();

                // Start animation loop for video frame updates
                if (this.app._startAnimationLoop) {
                    this.app._startAnimationLoop();
                }
            }
        });

        video.addEventListener('error', (e) => {
            console.error(`   ❌ LOAD: Failed to load cell video! (${cell.id})`);
            console.error('   → Error type:', e.type);
            console.error('   → Error code:', video.error ? video.error.code : 'unknown');
            console.error('   → URL preview:', videoURL.substring(0, 100) + '...');
        });

        video.src = videoURL;
        video.load();
    }

    /**
     * Restore layer state
     * @param {Object} layerData - Layer state data
     * @private
     */
    restoreLayerState(layerData) {
        // Layer assignments are handled during cell restoration
        // This method is here for future layer-specific settings
    }

    /**
     * Restore custom fonts from preset
     * @param {Array} customFonts - Array of font data with CDN URLs
     * @returns {Promise<void>}
     * @private
     */
    async restoreCustomFontsState(customFonts) {
        const fontManager = window.fontManager;

        for (const fontData of customFonts) {
            try {
                console.log(`   → Loading font "${fontData.name}" from CDN...`);
                await fontManager.loadFontFromCDN(fontData);
                console.log(`   ✅ Font "${fontData.name}" loaded successfully`);
            } catch (error) {
                console.warn(`   ⚠️ Failed to load font "${fontData.name}":`, error);
                console.warn(`   → Text will fallback to system font`);
                // Don't throw - allow preset to load with fallback font
            }
        }
    }

    /**
     * Update text style button states in UI
     * @private
     */
    updateTextStyleButtons() {
        const ui = this.app.uiManager.elements;
        const mainText = this.app.mainTextComponent;
        
        // Update button states
        if (ui.mainTextBold) {
            ui.mainTextBold.classList.toggle('active', mainText.fontWeight === 'bold');
        }
        if (ui.mainTextItalic) {
            ui.mainTextItalic.classList.toggle('active', mainText.fontStyle === 'italic');
        }
        if (ui.mainTextUnderline) {
            ui.mainTextUnderline.classList.toggle('active', mainText.underline);
        }
        if (ui.mainTextHighlight) {
            ui.mainTextHighlight.classList.toggle('active', mainText.highlight);
        }
        
        // Show/hide highlight color picker
        if (ui.mainTextHighlightColor) {
            ui.mainTextHighlightColor.style.display = mainText.highlight ? 'inline-block' : 'none';
        }
    }

    // ==============================================
    // CLOUD PRESET METHODS (Wix Headless)
    // ==============================================

    /**
     * Save preset to Wix cloud with automatic asset uploads
     * @param {string} presetName - Name for the preset
     * @returns {Promise} Promise that resolves when save is complete
     */
    async saveToCloud(presetName) {
        if (!this.wixAPI) {
            throw new Error('Wix API not initialized. Cannot save to cloud.');
        }

        try {
            console.log(`🔄 Starting cloud save: "${presetName}"`);

            // 1. Get current state (with temp image references)
            const state = this.serializeState(presetName);

            // 2. Upload background image if exists
            if (state.background.imageElement) {
                const imgSrc = state.background.imageElement.src;

                // 🧪 TEST: Check if this is a CDN URL - if so, save it directly!
                if (imgSrc && imgSrc.startsWith('https://static.wixstatic.com/media/')) {
                    console.log('🎯 SAVE: Detected CDN URL - saving directly (no upload needed)');
                    console.log('   → CDN URL:', imgSrc);
                    console.log('   → URL length:', imgSrc.length, 'bytes (vs ~266KB for data URL)');

                    state.background.imageURL = imgSrc;
                    delete state.background.imageElement; // Remove temp reference
                } else {
                    // Original upload logic
                    console.log('📤 SAVE: Uploading background image...');
                    console.log('   → Image element type:', state.background.imageElement.constructor.name);
                    console.log('   → Image dimensions:', state.background.imageElement.width, 'x', state.background.imageElement.height);

                    state.background.imageURL = await this.wixAPI.uploadMedia(
                        state.background.imageElement,
                        `bg-${presetName}-${Date.now()}.png`,
                        'image/png'
                    );

                    console.log('   ✅ Media uploaded, URL length:', state.background.imageURL.length, 'characters');
                    console.log('   → Preview:', state.background.imageURL.substring(0, 50) + '...');
                    delete state.background.imageElement; // Remove temp reference
                }
            } else {
                console.log('ℹ️ SAVE: No background image to upload');
            }

            // 3. Upload all cell media (images and videos)
            if (state.grid.snapshot && state.grid.snapshot.layout && state.grid.snapshot.layout.cells) {
                console.log(`📋 SAVE: Checking ${state.grid.snapshot.layout.cells.length} cells for media...`);
                let cellImageCount = 0;
                let cellVideoCount = 0;

                for (let i = 0; i < state.grid.snapshot.layout.cells.length; i++) {
                    const cellData = state.grid.snapshot.layout.cells[i];

                    // Upload cell images
                    if (cellData.content && cellData.content.imageElement) {
                        const imgSrc = cellData.content.imageElement.src;

                        // Check if this is already a CDN URL - if so, save it directly!
                        if (imgSrc && imgSrc.startsWith('https://static.wixstatic.com/media/')) {
                            console.log(`🎯 SAVE: Cell ${i + 1} - Detected CDN URL - saving directly (no upload needed)`);
                            console.log('   → CDN URL:', imgSrc);
                            console.log('   → URL length:', imgSrc.length, 'bytes');

                            cellData.content.imageURL = imgSrc;
                            delete cellData.content.imageElement; // Remove temp reference
                            delete cellData.content.mediaType;
                        } else {
                            // Upload to Media Manager
                            cellImageCount++;
                            console.log(`📤 SAVE: Uploading cell image ${i + 1}...`);
                            console.log('   → Cell index:', i);
                            console.log('   → Image dimensions:', cellData.content.imageElement.width, 'x', cellData.content.imageElement.height);

                            cellData.content.imageURL = await this.wixAPI.uploadMedia(
                                cellData.content.imageElement,
                                `cell-${presetName}-${i}-${Date.now()}.png`,
                                'image/png'
                            );

                            console.log('   ✅ Cell image uploaded, URL length:', cellData.content.imageURL.length, 'characters');
                            delete cellData.content.imageElement; // Remove temp reference
                            delete cellData.content.mediaType;
                        }
                    }

                    // Upload cell videos
                    if (cellData.content && cellData.content.videoElement) {
                        const videoSrc = cellData.content.videoElement.src;

                        // Check if this is already a CDN URL - if so, save it directly!
                        const isWixCDN = (url) => url && url.includes('.wixstatic.com/');
                        if (isWixCDN(videoSrc)) {
                            console.log(`🎯 SAVE: Cell ${i + 1} - Detected CDN video URL - saving directly (no upload needed)`);

                            cellData.content.videoURL = videoSrc;
                            delete cellData.content.videoElement; // Remove temp reference
                            delete cellData.content.mediaType;
                        } else {
                            // Upload to Media Manager - use stored mime type or detect from video
                            cellVideoCount++;
                            console.log(`📤 SAVE: Uploading cell video ${i + 1}...`);

                            // Determine mime type and file extension
                            const mimeType = cellData.content.mimeType || 'video/mp4';
                            const extension = mimeType.split('/')[1] || 'mp4'; // Extract extension from mime type

                            cellData.content.videoURL = await this.wixAPI.uploadMedia(
                                cellData.content.videoElement,
                                `cell-${presetName}-${i}-${Date.now()}.${extension}`,
                                mimeType
                            );

                            console.log('   ✅ Cell video uploaded, URL length:', cellData.content.videoURL.length, 'characters');
                            delete cellData.content.videoElement; // Remove temp reference
                            delete cellData.content.mediaType;
                        }
                    }
                }
                console.log(`✅ SAVE: Uploaded ${cellImageCount} image(s) and ${cellVideoCount} video(s)`);
            }

            // 4. Save preset to Wix collection
            console.log('💾 Saving preset to Wix...');
            const savedPreset = await this.wixAPI.savePreset(presetName, state);

            console.log(`✅ Preset saved to cloud: "${presetName}"`);
            return savedPreset;

        } catch (error) {
            console.error('❌ Failed to save preset to cloud:', error);
            throw new Error(`Cloud save failed: ${error.message}`);
        }
    }

    /**
     * Load preset from Wix cloud by ID
     * @param {string} presetId - Wix preset _id
     * @returns {Promise} Promise that resolves when load is complete
     */
    async loadFromCloud(presetId) {
        if (!this.wixAPI) {
            throw new Error('Wix API not initialized. Cannot load from cloud.');
        }

        try {
            console.log(`🔄 Loading preset from cloud: ${presetId}`);

            // 1. Fetch preset from Wix
            const preset = await this.wixAPI.loadPreset(presetId);

            // 2. Deserialize the settings (URLs load automatically in browser)
            await this.deserializeState(preset.settings);

            console.log(`✅ Preset loaded from cloud: "${preset.name}"`);
            return preset;

        } catch (error) {
            console.error('❌ Failed to load preset from cloud:', error);
            throw new Error(`Cloud load failed: ${error.message}`);
        }
    }

    /**
     * List all presets from Wix cloud
     * @returns {Promise<Array>} Promise that resolves with array of presets
     */
    async listCloudPresets() {
        if (!this.wixAPI) {
            throw new Error('Wix API not initialized. Cannot list presets.');
        }

        try {
            return await this.wixAPI.listPresets();
        } catch (error) {
            console.error('❌ Failed to list cloud presets:', error);
            return [];
        }
    }

    /**
     * Delete preset from Wix cloud
     * @param {string} presetId - Wix preset _id
     * @returns {Promise} Promise that resolves when delete is complete
     */
    async deleteFromCloud(presetId) {
        if (!this.wixAPI) {
            throw new Error('Wix API not initialized. Cannot delete from cloud.');
        }

        try {
            await this.wixAPI.deletePreset(presetId);
            console.log(`✅ Preset deleted from cloud: ${presetId}`);
        } catch (error) {
            console.error('❌ Failed to delete preset from cloud:', error);
            throw new Error(`Cloud delete failed: ${error.message}`);
        }
    }

    // ==============================================
    // LOCAL FILE METHODS (REMOVED - Cloud only)
    // ==============================================
    // downloadPreset() - REMOVED: Use saveToCloud() instead
    // loadPresetFromFile() - REMOVED: Use loadFromCloud() instead

    /**
     * Update UI elements to match the restored preset state
     * @param {Object} stateData - Complete preset state data
     * @private
     */
    updateUIElements(stateData) {
        // Temporarily disable event listeners to prevent multiple renders
        const originalOnTextChanged = this.app.onTextChanged;
        this.app.onTextChanged = () => {
            // Do nothing during preset loading
        };
        
        try {
            // Update background color UI
            if (this.app.uiManager.elements.backgroundColor) {
                this.app.uiManager.elements.backgroundColor.value = stateData.background.color;
            }
            
            // Update background fit mode UI
            if (this.app.uiManager.elements.backgroundFitMode) {
                this.app.uiManager.elements.backgroundFitMode.value = stateData.background.fitMode;
            }
            
            // Update main text UI
            if (this.app.uiManager.elements.mainText) {
                this.app.uiManager.elements.mainText.value = stateData.mainText.content;
            }
            
            // Update font family UI
            if (this.app.uiManager.elements.fontFamily) {
                this.app.uiManager.elements.fontFamily.value = stateData.mainText.fontFamily;
            }
            
            // Update font size UI
            if (this.app.uiManager.elements.fontSize) {
                this.app.uiManager.elements.fontSize.value = stateData.mainText.fontSize;
            }
            
            // Update text color UI
            if (this.app.uiManager.elements.textColor) {
                this.app.uiManager.elements.textColor.value = stateData.mainText.color;
            }

            // Update line spacing UI
            const lineSpacingInput = document.getElementById('lineSpacing');
            if (lineSpacingInput && stateData.mainText.lineSpacing !== undefined) {
                lineSpacingInput.value = stateData.mainText.lineSpacing;
            }

            // Update margin UI
            const marginVerticalInput = document.getElementById('marginVertical');
            if (marginVerticalInput && stateData.mainText.marginVertical !== undefined) {
                marginVerticalInput.value = stateData.mainText.marginVertical;
            }
            const marginHorizontalInput = document.getElementById('marginHorizontal');
            if (marginHorizontalInput && stateData.mainText.marginHorizontal !== undefined) {
                marginHorizontalInput.value = stateData.mainText.marginHorizontal;
            }

            // Update text style buttons (bold, italic, underline, highlight)
            const boldBtn = document.getElementById('mainTextBold');
            if (boldBtn) {
                if (stateData.mainText.fontWeight === 'bold') {
                    boldBtn.classList.add('active');
                } else {
                    boldBtn.classList.remove('active');
                }
            }

            const italicBtn = document.getElementById('mainTextItalic');
            if (italicBtn) {
                if (stateData.mainText.fontStyle === 'italic') {
                    italicBtn.classList.add('active');
                } else {
                    italicBtn.classList.remove('active');
                }
            }

            const underlineBtn = document.getElementById('mainTextUnderline');
            if (underlineBtn) {
                if (stateData.mainText.underline) {
                    underlineBtn.classList.add('active');
                } else {
                    underlineBtn.classList.remove('active');
                }
            }

            const highlightBtn = document.getElementById('mainTextHighlight');
            if (highlightBtn) {
                if (stateData.mainText.highlight) {
                    highlightBtn.classList.add('active');
                } else {
                    highlightBtn.classList.remove('active');
                }
            }

            // Update highlight color UI
            const highlightColorInput = document.getElementById('mainTextHighlightColor');
            if (highlightColorInput && stateData.mainText.highlightColor) {
                highlightColorInput.value = stateData.mainText.highlightColor;
            }

            // Update padding UI
            if (this.app.uiManager.elements.paddingHorizontal) {
                this.app.uiManager.elements.paddingHorizontal.value = stateData.canvas.padding.left;
            }
            if (this.app.uiManager.elements.paddingVertical) {
                this.app.uiManager.elements.paddingVertical.value = stateData.canvas.padding.top;
            }
            
            // Update minimum spot size UI
            if (this.app.uiManager.elements.minSpotSize) {
                this.app.uiManager.elements.minSpotSize.value = stateData.grid.minCellSize;
            }

            // Update position alignment buttons UI
            if (stateData.mainText.alignH && stateData.mainText.alignV) {
                const positioningGrid = document.querySelector('.positioning-grid');
                if (positioningGrid) {
                    // Remove active class from all position buttons
                    positioningGrid.querySelectorAll('.pos-btn').forEach(btn => btn.classList.remove('active'));

                    // Find and activate the button matching the loaded alignment
                    const matchingButton = positioningGrid.querySelector(
                        `.pos-btn[data-horizontal="${stateData.mainText.alignH}"][data-vertical="${stateData.mainText.alignV}"]`
                    );
                    if (matchingButton) {
                        matchingButton.classList.add('active');
                    }
                }
            }

            // UI elements updated successfully
        } finally {
            // Restore original event listener
            this.app.onTextChanged = originalOnTextChanged;
        }
    }
}
