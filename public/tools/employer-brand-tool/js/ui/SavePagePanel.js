/**
 * SavePagePanel - Inline panel for saving page to preset with editable field configuration
 * 
 * Workflow:
 * 1. Click "Save Page to Preset" button to expand panel in sidebar
 * 2. Display instruction: "Click on canvas cells to make editable"
 * 3. Click canvas cells to open editable cell configuration on the side
 * 4. Configure field name and description for each editable cell
 * 5. Choose new preset or existing preset (first section after expanding)
 * 6. Save page to CMS
 */

class SavePagePanel {
    constructor(app) {
        this.app = app;
        this.presetPageManager = app.presetPageManager;
        this.contentSlotManager = app.presetPageManager.contentSlotManager;

        this.container = null;
        this.isExpanded = false;
        
        // Content slot configuration panel
        this.configPanel = new ContentSlotConfigPanel(app);

        // Track configured slots for this page
        this.configuredSlots = []; // Array of slot objects
        this.configuredCellIds = new Set(); // Set of cell IDs that have slots

        // Currently selected cell for editing
        this.selectedCellId = null;

        // Canvas click handler bound for adding/removing
        this.canvasClickHandler = this.handleCanvasClick.bind(this);
    }

    /**
     * Render the save page panel in the given container
     * @param {HTMLElement} container - Container element
     */
    render(container) {
        this.container = container;
        
        // Initially collapsed
        container.innerHTML = `
            <div class="save-page-panel-content" style="display: none;">
                <!-- Instruction -->
                <div class="save-page-instruction">
                    <p>👆 Click on canvas cells to make editable</p>
                </div>

                <!-- Choose Preset Section (First) -->
                <div class="save-page-preset-choice">
                    <h4>Choose Preset</h4>
                    <div class="preset-radio-group">
                        <label>
                            <input type="radio" name="save-preset-type" value="new" checked>
                            Create New Preset
                        </label>
                        <label>
                            <input type="radio" name="save-preset-type" value="existing">
                            Add to Existing
                        </label>
                    </div>

                    <!-- New Preset Name -->
                    <div id="save-new-preset-container">
                        <input type="text" id="save-new-preset-name" class="preset-name-input" placeholder="Enter preset name..." />
                    </div>

                    <!-- Existing Preset Dropdown -->
                    <div id="save-existing-preset-container" style="display: none;">
                        <select id="save-existing-preset-select" class="preset-dropdown">
                            <option value="">-- Select Preset --</option>
                        </select>
                    </div>
                </div>

                <!-- Editable Slots List -->
            <div class="save-page-editable-list">
                <h4>Editable Slots</h4>
                <div id="save-editable-fields-list" class="editable-fields-container">
                    <!-- Slots will be dynamically populated -->
                </div>

        
                </div>

                <!-- Page Settings -->
                <div class="save-page-settings-section">
                    <h4>Page Settings</h4>
                    <div class="page-settings-row">
                        <div class="page-setting-field">
                            <label>Page Position</label>
                            <select id="save-page-position" class="preset-dropdown">
                                <option value="1">Page 1</option>
                                <option value="2">Page 2</option>
                                <option value="3">Page 3</option>
                                <option value="4">Page 4</option>
                                <option value="5">Page 5</option>
                            </select>
                        </div>
                        <div class="page-setting-field">
                            <label>Page Name</label>
                            <input type="text" id="save-page-name" class="preset-name-input" placeholder="e.g., Hero Banner" value="Page 1" />
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="save-page-actions">
                    <button type="button" class="preset-save-page-action-btn">Save Page</button>
                    <button type="button" class="preset-cancel-page-action-btn">Cancel</button>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        if (!this.container) return;

        // Preset type radio buttons
        const radioButtons = this.container.querySelectorAll('input[name="save-preset-type"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => this.handlePresetTypeChange(e.target.value));
        });

        // Page position select - auto-update page name
        const pagePositionSelect = this.container.querySelector('#save-page-position');
        if (pagePositionSelect) {
            pagePositionSelect.addEventListener('change', (e) => {
                const pageNumber = e.target.value;
                const pageNameInput = this.container.querySelector('#save-page-name');
                if (pageNameInput && pageNameInput.value.match(/^Page \d+$/)) {
                    pageNameInput.value = `Page ${pageNumber}`;
                }
            });
        }

        // Field name/label inputs - update config on change
        const fieldNameInput = this.container.querySelector('#save-field-name');
        const fieldLabelInput = this.container.querySelector('#save-field-label');
        
        if (fieldNameInput) {
            fieldNameInput.addEventListener('input', (e) => {
                if (this.selectedCellId) {
                    this.updateSelectedCellConfig('fieldName', e.target.value);
                }
            });
        }

        if (fieldLabelInput) {
            fieldLabelInput.addEventListener('input', (e) => {
                if (this.selectedCellId) {
                    this.updateSelectedCellConfig('fieldLabel', e.target.value);
                }
            });
        }

        // Remove editable button
        const removeBtn = this.container.querySelector('.preset-cell-remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => this.removeEditableCell());
        }

        // Save button
        const saveBtn = this.container.querySelector('.preset-save-page-action-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSave());
        }

        // Cancel button
        const cancelBtn = this.container.querySelector('.preset-cancel-page-action-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hide());
        }

        // Inline editor header click to collapse/expand
        const inlineHeader = this.container.querySelector('.inline-editor-header');
        if (inlineHeader) {
            inlineHeader.addEventListener('click', (e) => {
                // Don't collapse if clicking remove button
                if (e.target.classList.contains('inline-remove-btn')) return;
                this.toggleInlineEditor();
            });
        }

        // Inline editor remove button
        const inlineRemoveBtn = this.container.querySelector('.inline-remove-btn');
        if (inlineRemoveBtn) {
            inlineRemoveBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent header click
                this.removeSlotFromInlineEditor();
            });
        }

        // Auto-save on input changes
        this.container.addEventListener('input', (e) => {
            if (e.target.closest('#inline-editor-content')) {
                this.autoSaveInlineEditor();
            }
        });

        // Auto-save on select changes
        this.container.addEventListener('change', (e) => {
            if (e.target.closest('#inline-editor-content')) {
                this.autoSaveInlineEditor();
            }
        });
    }

    /**
     * Show/expand the panel
     */
    async show() {
        // 🎯 UPDATED: Load existing content slots from ContentSlotManager
        this.configuredSlots = [...this.contentSlotManager.getAllSlots()];
        
        // Keep configuredCellIds for backward compatibility (will be deprecated)
        this.configuredCellIds.clear();
        this.configuredSlots.forEach(slot => {
            if (slot.sourceContentId) {
                this.configuredCellIds.add(slot.sourceContentId);
            }
            if (slot.sourceElement) {
                this.configuredCellIds.add(slot.sourceElement);
            }
        });
        
        this.selectedCellId = null;

        // Load existing presets for dropdown
        await this.loadExistingPresets();

        // Show panel
        const content = this.container.querySelector('.save-page-panel-content');
        if (content) {
            content.style.display = 'block';
        }

        // Hide cell editor initially
        const cellEditor = this.container.querySelector('#save-cell-editor');
        if (cellEditor) {
            cellEditor.style.display = 'none';
        }

        this.isExpanded = true;

        // Enable canvas overlay mode (visual indicator)
        this.enableCanvasOverlayMode();
        
        // Auto-enable content slot overlay
        if (this.app.contentSlotOverlay && !this.app.contentSlotOverlay.enabled) {
            this.app.contentSlotOverlay.show();
        }

        // Update editable fields list
        this.updateEditableFieldsList();
    }

    /**
     * Hide/collapse the panel
     */
    hide() {
        const content = this.container.querySelector('.save-page-panel-content');
        if (content) {
            content.style.display = 'none';
        }

        this.isExpanded = false;

        // Disable canvas overlay mode
        this.disableCanvasOverlayMode();
        
        // Hide content slot overlay (optional - could leave it on)
        // User might want to keep it visible after closing save panel
        // Uncomment if you want to auto-hide:
        // if (this.app.contentSlotOverlay && this.app.contentSlotOverlay.enabled) {
        //     this.app.contentSlotOverlay.hide();
        // }

        // Clear selection
        this.selectedCellId = null;
    }

    /**
     * Enable canvas overlay mode with lock icons
     */
    enableCanvasOverlayMode() {
        // Create overlay element
        this.overlay = document.createElement('div');
        this.overlay.className = 'save-page-canvas-overlay';
        this.overlay.innerHTML = `
            <div class="save-page-overlay-header">
                <span class="overlay-instruction">🔒 Click cells to make editable</span>
                <button class="overlay-exit-btn" title="Exit Save Mode">✕ Exit</button>
            </div>
        `;
        
        // Add overlay to canvas container
        const canvasContainer = document.getElementById('chatooly-container');
        if (canvasContainer) {
            canvasContainer.style.position = 'relative';
            canvasContainer.appendChild(this.overlay);
        }

        // Exit button handler
        const exitBtn = this.overlay.querySelector('.overlay-exit-btn');
        if (exitBtn) {
            exitBtn.addEventListener('click', () => this.hide());
        }

        // Enable canvas click interactions
        this.enableCanvasClickInteraction();

        // Render lock icons on all cells
        this.renderCellLockIcons();

        // Set flag to prevent normal canvas click behavior
        if (this.app) {
            this.app.savePageModeActive = true;
        }
    }

    /**
     * Disable canvas overlay mode
     */
    disableCanvasOverlayMode() {
        // Remove overlay
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;

        // Disable canvas click interactions
        this.disableCanvasClickInteraction();

        // Clear lock icons
        this.clearCellLockIcons();

        // Clear flag
        if (this.app) {
            this.app.savePageModeActive = false;
        }
    }

    /**
     * Enable canvas click interaction for selecting cells
     */
    enableCanvasClickInteraction() {
        const canvas = document.getElementById('chatooly-canvas') || document.getElementById('chatooly-canvas');
        if (canvas) {
            // Use capture phase to intercept before app.js handler
            canvas.addEventListener('click', this.canvasClickHandler, true);
        }
    }

    /**
     * Disable canvas click interaction
     */
    disableCanvasClickInteraction() {
        const canvas = document.getElementById('chatooly-canvas') || document.getElementById('chatooly-canvas');
        if (canvas) {
            // Remove from capture phase
            canvas.removeEventListener('click', this.canvasClickHandler, true);
        }
    }

    /**
     * Handle canvas click to select cells
     */

    /**
     * Render lock/unlock icons on all cells
     */
    renderCellLockIcons() {
        if (!this.app || !this.app.grid) return;

        // 🎯 NEW APPROACH: Use content slot bounds instead of cell bounds
        // Get all content bounds from grid (same logic as ContentSlotOverlay)
        const allContentBounds = this.getAllContentBounds();
        
        if (allContentBounds.length === 0) {
            console.log('⚠️ No content bounds found for lock icons');
            return;
        }

        let renderedCount = 0;
        allContentBounds.forEach((item) => {
            const { cell, bounds: bbox, type } = item;
            
            // Skip if no bounding box
            if (!bbox || bbox.width === 0 || bbox.height === 0) {
                return;
            }

            const cellId = cell.id !== undefined ? cell.id : `${cell.row}-${cell.col}`;
            const elementId = cell.type === 'main-text' ? `textCell-${cellId}` : `contentCell-${cellId}`;
            
            // Check if cell is editable (registered as content slot)
            const isEditable = this.isSlotRegistered(cell);
            
            console.log(`🔍 Lock icon for cell ${cellId}:`, {
                elementId,
                cellType: cell.type,
                isEditable,
                emoji: isEditable ? '🔓' : '🔒'
            });
            
            // Create lock icon element
            const lockIcon = document.createElement('div');
            lockIcon.className = 'cell-lock-icon';
            if (isEditable) {
                lockIcon.classList.add('unlocked');
            }
            lockIcon.dataset.cellId = cellId;
            lockIcon.dataset.elementId = elementId;
            lockIcon.innerHTML = isEditable ? '🔓' : '🔒';
            
            // Get canvas and its container
            const canvas = document.getElementById('chatooly-canvas');
            if (!canvas) return;
            
            const canvasRect = canvas.getBoundingClientRect();
            const containerRect = canvas.parentElement.getBoundingClientRect();
            
            // Calculate scale factors (canvas internal size vs displayed size)
            const scaleX = canvasRect.width / canvas.width;
            const scaleY = canvasRect.height / canvas.height;
            
            // 🎯 CHANGED: Position using content slot bounds instead of cell bounds
            const canvasOffsetX = canvasRect.left - containerRect.left;
            const canvasOffsetY = canvasRect.top - containerRect.top;
            
            const iconX = canvasOffsetX + (bbox.x * scaleX) + 8;
            const iconY = canvasOffsetY + (bbox.y * scaleY) + 8;
            
            lockIcon.style.left = iconX + 'px';
            lockIcon.style.top = iconY + 'px';
            
            // Click handler for lock icon
            lockIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
                e.preventDefault();
                this.toggleCellLock(elementId, cellId, cell.type);
            });
            
            // Add to overlay
            if (this.overlay) {
                this.overlay.appendChild(lockIcon);
                renderedCount++;
            }
        });
        
        console.log(`🔒 Rendered ${renderedCount} lock icons based on content slot bounds`);
    }

    /**
     * Clear all lock icons
     */
    clearCellLockIcons() {
        if (!this.overlay) return;
        
        const lockIcons = this.overlay.querySelectorAll('.cell-lock-icon');
        lockIcons.forEach(icon => icon.remove());
    }

    /**
     * Update a single lock icon
     */
    updateLockIcon(elementId, isEditable) {
        console.log('🔍 updateLockIcon called:', { elementId, isEditable, overlayExists: !!this.overlay });

        if (!this.overlay) {
            console.error('❌ No overlay found!');
            return;
        }

        const lockIcon = this.overlay.querySelector(`[data-element-id="${elementId}"]`);
        console.log('🔍 Lock icon found:', lockIcon ? 'YES' : 'NO', 'for elementId:', elementId);

        if (lockIcon) {
            lockIcon.innerHTML = isEditable ? '🔓' : '🔒';
            lockIcon.classList.toggle('unlocked', isEditable);
            console.log('✅ Lock icon updated to:', lockIcon.innerHTML);
        } else {
            console.error('❌ Lock icon not found in overlay for:', elementId);
            console.log('Available lock icons:', Array.from(this.overlay.querySelectorAll('[data-element-id]')).map(el => el.dataset.elementId));
        }
    }

    /**
     * Refresh all lock icons in the overlay
     */
    refreshOverlayLockIcons() {
        if (!this.overlay) return;

        console.log('🔄 refreshOverlayLockIcons called');
        
        // 🎯 UPDATED: Check against content slot manager's registered slots
        const allLockIcons = this.overlay.querySelectorAll('[data-element-id]');
        console.log(`📊 Found ${allLockIcons.length} lock icons to refresh`);
        allLockIcons.forEach(lockIcon => {
            const elementId = lockIcon.dataset.elementId;
            const cellId = lockIcon.dataset.cellId;
            
            // Find the cell to check if it's registered
            const cell = this._findCellByElementId(elementId);
            if (!cell) return;
            
            // Check if this cell is registered as a content slot
            const isRegistered = this.isSlotRegistered(cell);
            
            console.log(`  🔄 Refreshing icon for ${elementId}:`, {
                isRegistered,
                emoji: isRegistered ? '🔓' : '🔒',
                hadUnlockedClass: lockIcon.classList.contains('unlocked')
            });
            
            // Update icon
            lockIcon.innerHTML = isRegistered ? '🔓' : '🔒';
            lockIcon.classList.toggle('unlocked', isRegistered);
        });
    }

    /**
     * Check if cell is editable
     */
    isCellEditable(elementId) {
        // 🎯 UPDATED: Check if cell is registered as content slot
        const cell = this._findCellByElementId(elementId);
        if (!cell) return false;
        
        return this.isSlotRegistered(cell);
    }

    /**
     * Get all content bounds from grid (similar to ContentSlotOverlay)
     * @returns {Array} Array of content bound objects with {cell, bounds, type}
     */
    getAllContentBounds() {
        const bounds = [];
        
        const grid = this.app.grid;
        if (!grid || !grid.layerManager) return bounds;
        
        // Main text cells
        const mainTextLayer = grid.layerManager.getLayer('main-text');
        if (mainTextLayer && mainTextLayer.getCellCount() > 0) {
            const mainTextCells = mainTextLayer.getCells();
            mainTextCells.forEach((cell) => {
                if (cell && cell.text && cell.text.trim()) {
                    try {
                        const bbox = this.contentSlotManager.captureBoundingBox(cell);
                        bounds.push({
                            cell: cell,
                            bounds: bbox,
                            type: 'text'
                        });
                    } catch (error) {
                        console.warn(`Failed to capture main text cell ${cell.id} bounds:`, error);
                    }
                }
            });
        }
        
        // All content cells
        const allLayers = grid.layerManager.getAllLayers();
        allLayers.forEach(layer => {
            if (layer.id === 'main-text') return;
            
            const layerCells = layer.getCells();
            layerCells.forEach(cell => {
                if (cell.contentType === 'empty') return;
                if (cell.contentType === 'text' && (!cell.content || !cell.content.text || !cell.content.text.trim())) return;
                if (cell.contentType === 'media' && (!cell.content || !cell.content.media)) return;
                
                try {
                    const bbox = this.contentSlotManager.captureBoundingBox(cell);
                    bounds.push({
                        cell: cell,
                        bounds: bbox,
                        type: cell.contentType
                    });
                } catch (error) {
                    console.warn(`Failed to capture bounds for cell ${cell.id}:`, error);
                }
            });
        });
        
        return bounds;
    }

    /**
     * Check if cell is registered as a content slot
     * @param {GridCell} cell - Cell to check
     * @returns {boolean} True if registered
     */
    isSlotRegistered(cell) {
        const slots = this.contentSlotManager.getAllSlots();
        const isRegistered = slots.some(slot => 
            slot.sourceContentId === cell.contentId || 
            slot.sourceElement === cell.id ||
            (cell.type === 'main-text' && slot.sourceElement === 'main-text')
        );
        
        console.log('🔍 isSlotRegistered check:', {
            cellId: cell.id,
            cellContentId: cell.contentId,
            cellType: cell.type,
            isRegistered,
            totalSlots: slots.length,
            matchingSlots: slots.filter(s => 
                s.sourceContentId === cell.contentId || 
                s.sourceElement === cell.id ||
                (cell.type === 'main-text' && s.sourceElement === 'main-text')
            ).map(s => s.slotId)
        });
        
        return isRegistered;
    }

    /**
     * Toggle cell lock/unlock
     */
    /**
     * Find cell by element ID
     */
    _findCellByElementId(elementId) {
        const grid = this.app.grid;
        if (!grid) return null;

        if (elementId === 'mainText') {
            const allCells = grid.getAllCells();
            return allCells.find(c => c.type === 'main-text');
        } else if (elementId.startsWith('textCell-')) {
            const cellIdStr = elementId.replace('textCell-', '');
            const cellId = parseInt(cellIdStr);
            return grid.getCellById(cellId);
        } else if (elementId.startsWith('contentCell-')) {
            const cellIdStr = elementId.replace('contentCell-', '');
            const cellId = parseInt(cellIdStr);
            return grid.getCellById(cellId);
        }

        return null;
    }

    toggleCellLock(elementId, cellId, cellType) {
        console.log('🔒 toggleCellLock called:', { elementId, cellId, cellType });

        // Get the cell
        const cell = this._findCellByElementId(elementId);
        if (!cell) {
            console.error('Cell not found:', elementId);
            return;
        }

        // Check if cell is already registered as content slot
        const alreadyConfigured = this.isSlotRegistered(cell);
        console.log('🔍 Already configured?', alreadyConfigured);

        if (alreadyConfigured) {
            console.log('✏️ Cell already unlocked, opening editor for existing slot');
            // Find and edit existing slot
            const slots = this.contentSlotManager.getAllSlots();
            const slot = slots.find(s =>
                s.sourceContentId === cell.contentId ||
                s.sourceElement === cell.id ||
                (cell.type === 'main-text' && s.sourceElement === 'main-text')
            );
            if (slot) {
                // Find slot in configuredSlots for inline editor
                const slotIndex = this.configuredSlots.findIndex(s => s.slotId === slot.slotId);
                if (slotIndex >= 0) {
                    this.showInlineEditor(this.configuredSlots[slotIndex], slotIndex);
                } else {
                    // If not in configuredSlots, add it from contentSlotManager
                    this.configuredSlots.push(slot);
                    this.showInlineEditor(slot, this.configuredSlots.length - 1);
                }
            }
        } else {
            console.log('✨ Cell is locked, creating slot and unlocking immediately');
            // Create a new slot with defaults
            const newSlot = this._createDefaultSlot(cell, elementId);

            // ✅ IMMEDIATELY add to configuredSlots
            this.configuredSlots.push(newSlot);

            // ✅ IMMEDIATELY add to ContentSlotManager
            this.app.presetPageManager.contentSlotManager.addSlot(newSlot);

            // ✅ IMMEDIATELY update lock icon to unlocked
            this.updateLockIcon(elementId, true);

            // ✅ IMMEDIATELY refresh all lock icons
            this.refreshOverlayLockIcons();

            // ✅ Update the editable fields list
            this.updateEditableFieldsList();

            console.log('✅ Slot created and cell unlocked:', newSlot.slotId);
        }
    }

    /**
     * Create default slot configuration for a cell
     */
    _createDefaultSlot(cell, elementId) {
        const cellType = cell.type || 'content';
        // Check both cell.type for main-text AND cell.contentType for content cells with text
        const isText = cellType === 'main-text' || cell.contentType === 'text';

        // Generate unique slot ID using timestamp to prevent duplicates
        const timestamp = Date.now();
        const uniqueId = `${cell.id}-${timestamp}`;
        
        // Generate unique field name based on type and existing slots
        const existingSlots = this.configuredSlots || [];
        const typePrefix = isText ? 'text' : 'media';
        
        // Count existing slots of this type
        const sameTypeCount = existingSlots.filter(s => s.type === (isText ? 'text' : 'image')).length;
        const fieldNumber = sameTypeCount + 1;
        
        const fieldName = `${typePrefix}${fieldNumber}`;
        const fieldLabel = isText ? `Text ${fieldNumber}` : `Media ${fieldNumber}`;

        return {
            slotId: `${uniqueId}-slot`,
            sourceElement: cell.id,
            sourceContentId: cell.contentId || `${cellType}-${cell.row}-${cell.col}`,
            type: isText ? 'text' : 'image',
            boundingBox: this.app.presetPageManager.contentSlotManager.captureBoundingBox(cell),
            fieldName: fieldName,
            fieldLabel: fieldLabel,
            fieldDescription: '',
            required: true,
            constraints: isText ? {
                maxCharacters: 100,
                minFontSize: 50,
                maxFontSize: 100,
                alignment: 'center'
            } : {
                fitMode: 'cover',
                maxFileSize: 10485760,
                allowedFormats: ['jpg', 'png', 'webp', 'gif']
            },
            styling: isText ? {
                fontFamily: cell.content?.fontFamily || 'Inter',
                fontWeight: cell.content?.fontWeight || 'normal',
                color: cell.content?.color || '#000000'
            } : {}
        };
    }

    /**
     * Show inline editor for creating a new slot
     */
    showInlineEditorForNewSlot(slot, elementId, cellId) {
        // Store info for new slot creation
        this.currentEditingSlotIndex = -1; // -1 indicates new slot
        this.newSlotData = { slot, elementId, cellId };

        // Add temporary slot to list for inline editing
        this.configuredSlots.push(slot);
        const tempIndex = this.configuredSlots.length - 1;
        
        // Refresh list to show new slot
        this.updateEditableFieldsList();
        
        // Find the newly added slot item and expand it
        const slotItems = this.container.querySelectorAll('.configured-slot-item');
        if (slotItems[tempIndex]) {
            const contentSection = slotItems[tempIndex].querySelector('.slot-edit-content');
            const icon = slotItems[tempIndex].querySelector('.collapse-icon');
            if (contentSection && icon) {
                contentSection.style.display = 'block';
                icon.textContent = '▼';
            }
            
            // Scroll to it
            slotItems[tempIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    handleCanvasClick(event) {
        // Stop all propagation and default behavior
        event.stopPropagation();
        event.stopImmediatePropagation();
        event.preventDefault();
        
        const canvas = document.getElementById('chatooly-canvas') || document.getElementById('chatooly-canvas');
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;

        // Find cell at click position
        const cell = this.app.grid.getCellAt(x, y);
        if (!cell || (cell.isEmpty && cell.isEmpty())) {
            return;
        }

        // Get cell ID
        const cellId = cell.id !== undefined ? cell.id : `${cell.row}-${cell.col}`;
        const cellType = cell.type;

        // Determine element ID
        let elementId;
        if (cellType === 'main-text') {
            elementId = `textCell-${cellId}`;
        } else if (cellType === 'content') {
            elementId = `contentCell-${cellId}`;
        } else {
            return;
        }

        // Toggle lock instead of just showing editor
        this.toggleCellLock(elementId, cellId, cellType);
    }

    /**
     * Show the cell editor for a specific cell
     */
    showCellEditor(elementId, cellId, cellType) {
        this.selectedCellId = elementId;

        // Ensure config exists
        if (elementId.startsWith('textCell-')) {
            const id = elementId.replace('textCell-', '');
            if (!this.editableConfig.textCells[id]) {
                this.editableConfig.textCells[id] = { editable: true, fieldName: '', fieldLabel: '' };
            } else {
                this.editableConfig.textCells[id].editable = true;
            }
        } else if (elementId.startsWith('contentCell-')) {
            const id = elementId.replace('contentCell-', '');
            if (!this.editableConfig.contentCells[id]) {
                this.editableConfig.contentCells[id] = { editable: true, fieldName: '', fieldLabel: '' };
            } else {
                this.editableConfig.contentCells[id].editable = true;
            }
        }

        // Get current config
        const config = this.getConfigForElementId(elementId);

        // Show editor
        const cellEditor = this.container.querySelector('#save-cell-editor');
        if (cellEditor) {
            cellEditor.style.display = 'block';

            // Populate fields
            const fieldNameInput = this.container.querySelector('#save-field-name');
            const fieldLabelInput = this.container.querySelector('#save-field-label');

            if (fieldNameInput) {
                fieldNameInput.value = config.fieldName || '';
            }
            if (fieldLabelInput) {
                fieldLabelInput.value = config.fieldLabel || '';
            }
        }

        // Update editable fields list
        this.updateEditableFieldsList();
    }

    /**
     * Get config object for element ID
     */
    getConfigForElementId(elementId) {
        if (elementId === 'mainText') {
            return this.editableConfig.mainText;
        } else if (elementId.startsWith('textCell-')) {
            const cellId = elementId.replace('textCell-', '');
            return this.editableConfig.textCells[cellId] || { editable: false, fieldName: null, fieldLabel: null };
        } else if (elementId.startsWith('contentCell-')) {
            const cellId = elementId.replace('contentCell-', '');
            return this.editableConfig.contentCells[cellId] || { editable: false, fieldName: null, fieldLabel: null };
        } else if (elementId === 'background-color') {
            return this.editableConfig.background.color;
        } else if (elementId === 'background-image') {
            return this.editableConfig.background.image || { editable: false, fieldName: null };
        }
        return { editable: false, fieldName: null, fieldLabel: null };
    }

    /**
     * Update selected cell config
     */
    updateSelectedCellConfig(field, value) {
        if (!this.selectedCellId) return;

        const config = this.getConfigForElementId(this.selectedCellId);
        if (config) {
            config[field] = value;
        }

        // Update editable fields list
        this.updateEditableFieldsList();
    }

    /**
     * Remove editable cell
     */
    removeEditableCell() {
        if (!this.selectedCellId) return;

        // Remove from config
        if (this.selectedCellId === 'mainText') {
            this.editableConfig.mainText.editable = false;
        } else if (this.selectedCellId.startsWith('textCell-')) {
            const cellId = this.selectedCellId.replace('textCell-', '');
            if (this.editableConfig.textCells[cellId]) {
                delete this.editableConfig.textCells[cellId];
            }
        } else if (this.selectedCellId.startsWith('contentCell-')) {
            const cellId = this.selectedCellId.replace('contentCell-', '');
            if (this.editableConfig.contentCells[cellId]) {
                delete this.editableConfig.contentCells[cellId];
            }
        }

        // Hide cell editor
        const cellEditor = this.container.querySelector('#save-cell-editor');
        if (cellEditor) {
            cellEditor.style.display = 'none';
        }

        this.selectedCellId = null;

        // Update editable fields list
        this.updateEditableFieldsList();
    }

    /**
     * Update editable fields list display - now shows configured content slots
     */
    updateEditableFieldsList() {
        const listContainer = this.container.querySelector('#save-editable-fields-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (this.configuredSlots.length === 0) {
            listContainer.innerHTML = '<p class="no-fields-message">No editable slots yet</p>';
            return;
        }

        // Show configured slots
        this.configuredSlots.forEach((slot, index) => {
            const item = document.createElement('div');
            item.className = 'configured-slot-item';
            item.dataset.slotIndex = index;
            
            // Create header with collapse/expand
            const header = document.createElement('div');
            header.className = 'field-list-header';
            header.style.cursor = 'pointer';
            header.innerHTML = `
                <div class="field-list-label">
                    <span class="collapse-icon" style="margin-right: 8px; display: inline-block; width: 12px;">▼</span>
                    <strong>${slot.fieldLabel}</strong>
                    <span class="slot-type-badge">${slot.type}</span>
                </div>
                <div class="field-list-details">
                    <span class="field-detail-id" style="font-family: monospace; font-size: 11px; color: #9ca3af;">${slot.fieldName}</span>
                    <span style="margin: 0 6px; color: #d1d5db;">•</span>
                    <span class="field-detail-name">${slot.fieldDescription || 'No description'}</span>
                    <button class="slot-delete-btn" data-slot-index="${index}" style="margin-left: 10px; padding: 2px 6px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer;">×</button>
                </div>
            `;
            
            // Create expandable content section
            const contentSection = document.createElement('div');
            contentSection.className = 'slot-edit-content';
            contentSection.style.display = 'none';
            contentSection.style.padding = '12px 10px';
            contentSection.style.background = 'transparent';
            contentSection.style.borderTop = '1px solid rgba(255, 255, 255, 0.05)';
            contentSection.style.marginTop = '8px';
            
            // Build form based on slot type
            if (slot.type === 'text') {
                contentSection.innerHTML = this._buildTextSlotForm(slot);
            } else {
                contentSection.innerHTML = this._buildImageSlotForm(slot);
            }
            
            // Toggle expand/collapse on header click
            header.addEventListener('click', (e) => {
                // Don't toggle if clicking delete button
                if (e.target.classList.contains('slot-delete-btn')) return;
                
                const icon = header.querySelector('.collapse-icon');
                if (contentSection.style.display === 'none') {
                    contentSection.style.display = 'block';
                    icon.textContent = '▼';
                    this.currentEditingSlotIndex = index;
                } else {
                    contentSection.style.display = 'none';
                    icon.textContent = '▶';
                }
            });
            
            // Delete button handler
            const deleteBtn = header.querySelector('.slot-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteSlotFromList(index);
            });
            
            // Auto-save on input changes within this slot
            contentSection.addEventListener('input', (e) => {
                // Only update currentEditingSlotIndex if not in NEW SLOT mode (-1)
                if (this.currentEditingSlotIndex !== -1) {
                    this.currentEditingSlotIndex = index;
                }
                this.autoSaveInlineEditor();

                // Update header if field name or description changed
                if (e.target.id === 'inline-field-label' || e.target.id === 'inline-field-description') {
                    const fieldLabel = contentSection.querySelector('#inline-field-label')?.value || slot.fieldLabel;
                    const fieldDescription = contentSection.querySelector('#inline-field-description')?.value || 'No description';
                    const fieldName = this._generateFieldId(fieldLabel);
                    
                    header.querySelector('.field-list-label strong').textContent = fieldLabel;
                    header.querySelector('.field-detail-id').textContent = fieldName;
                    header.querySelector('.field-detail-name').textContent = fieldDescription;
                }
            });

            contentSection.addEventListener('change', (e) => {
                // Only update currentEditingSlotIndex if not in NEW SLOT mode (-1)
                if (this.currentEditingSlotIndex !== -1) {
                    this.currentEditingSlotIndex = index;
                }
                this.autoSaveInlineEditor();
            });
            
            item.appendChild(header);
            item.appendChild(contentSection);
            listContainer.appendChild(item);
        });
    }

    /**
     * Show inline editor for a slot (now handled by list expansion)
     */
    showInlineEditor(slot, slotIndex) {
        // Find the slot item in the list and expand it
        const slotItems = this.container.querySelectorAll('.configured-slot-item');
        if (slotItems[slotIndex]) {
            const contentSection = slotItems[slotIndex].querySelector('.slot-edit-content');
            const icon = slotItems[slotIndex].querySelector('.collapse-icon');
            if (contentSection && icon) {
                contentSection.style.display = 'block';
                icon.textContent = '▼';
            }
            
            // Scroll to it
            slotItems[slotIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Build form for text slot
     */
    _buildTextSlotForm(slot) {
        const inputStyle = 'background: transparent; border: 1px solid #d1d5db; padding: 8px; border-radius: 4px; width: 100%; box-sizing: border-box;';
        return `
            <div class="inline-form-group" style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 600; color: #111827;">Field Label *</label>
                <input type="text" id="inline-field-label" value="${slot.fieldLabel || ''}" placeholder="e.g., Main Headline" style="${inputStyle}" />
                <small style="display: block; margin-top: 4px; font-size: 11px; color: #6b7280;">Displayed to end-users filling the form</small>
            </div>
            <div class="inline-form-group" style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #6b7280;">Field ID: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${slot.fieldName || 'auto-generated'}</code></label>
                <small style="display: block; font-size: 10px; color: #9ca3af;">Auto-generated from label (used internally)</small>
            </div>
            <div class="inline-form-group" style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 13px; color: #374151;">Description</label>
                <textarea id="inline-field-description" placeholder="Help text for end-users" style="${inputStyle} min-height: 60px; resize: vertical;">${slot.fieldDescription || ''}</textarea>
            </div>
            <div class="inline-form-group" style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 13px; color: #374151;">Max Characters</label>
                <input type="number" id="inline-max-chars" value="${slot.constraints?.maxCharacters || 100}" min="1" style="${inputStyle}" />
            </div>
            <div class="inline-form-group" style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 13px; color: #374151;">Min Font Size (px)</label>
                <input type="number" id="inline-min-font" value="${slot.constraints?.minFontSize || 50}" min="1" style="${inputStyle}" />
            </div>
            <div class="inline-form-group" style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 13px; color: #374151;">Max Font Size (px)</label>
                <input type="number" id="inline-max-font" value="${slot.constraints?.maxFontSize || 100}" min="1" style="${inputStyle}" />
            </div>
        `;
    }

    /**
     * Build form for image slot
     */
    _buildImageSlotForm(slot) {
        const inputStyle = 'background: transparent; border: 1px solid #d1d5db; padding: 8px; border-radius: 4px; width: 100%; box-sizing: border-box;';
        return `
            <div class="inline-form-group" style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-size: 14px; font-weight: 600; color: #111827;">Field Label *</label>
                <input type="text" id="inline-field-label" value="${slot.fieldLabel || ''}" placeholder="e.g., Company Logo" style="${inputStyle}" />
                <small style="display: block; margin-top: 4px; font-size: 11px; color: #6b7280;">Displayed to end-users filling the form</small>
            </div>
            <div class="inline-form-group" style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 12px; color: #6b7280;">Field ID: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-size: 11px;">${slot.fieldName || 'auto-generated'}</code></label>
                <small style="display: block; font-size: 10px; color: #9ca3af;">Auto-generated from label (used internally)</small>
            </div>
            <div class="inline-form-group" style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 13px; color: #374151;">Description</label>
                <textarea id="inline-field-description" placeholder="Help text for end-users" style="${inputStyle} min-height: 60px; resize: vertical;">${slot.fieldDescription || ''}</textarea>
            </div>
            <div class="inline-form-group" style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 13px; color: #374151;">Fit Mode</label>
                <select id="inline-fit-mode" style="${inputStyle}">
                    <option value="cover" ${slot.constraints?.fitMode === 'cover' ? 'selected' : ''}>Cover (crop to fill)</option>
                    <option value="free" ${slot.constraints?.fitMode === 'free' ? 'selected' : ''}>Free (scale proportionally)</option>
                </select>
            </div>
        `;
    }

    /**
     * Hide inline editor (no longer used - slots expand inline)
     */
    hideInlineEditor() {
        this.currentEditingSlotIndex = null;
        this.newSlotData = null;
    }



    /**
     * Auto-save inline editor changes as user types
     */
    autoSaveInlineEditor() {
        // Debounce to avoid too many updates
        clearTimeout(this._autoSaveTimeout);
        this._autoSaveTimeout = setTimeout(() => {
            this._saveInlineEditorChangesInternal(false); // false = no UI refresh
        }, 300);
    }



    /**
     * Save changes from inline editor (internal version)
     * @param {boolean} refreshUI - Whether to refresh the UI after saving
     */
    /**
     * Generate field ID from field label
     * @param {string} label - Field label (e.g., "Company Logo")
     * @returns {string} Field ID (e.g., "companyLogo")
     */
    _generateFieldId(label) {
        if (!label) return '';
        
        // Convert to camelCase
        return label
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special chars
            .split(/\s+/) // Split on whitespace
            .map((word, index) => {
                if (index === 0) return word; // First word lowercase
                return word.charAt(0).toUpperCase() + word.slice(1); // Capitalize rest
            })
            .join('');
    }

    _saveInlineEditorChangesInternal(refreshUI = true) {
        console.log('💾 _saveInlineEditorChangesInternal called');
        console.log('📍 currentEditingSlotIndex:', this.currentEditingSlotIndex);
        console.log('📦 newSlotData exists:', !!this.newSlotData);

        // Get form values
        const fieldLabel = this.container.querySelector('#inline-field-label')?.value;
        const fieldDescription = this.container.querySelector('#inline-field-description')?.value;
        
        // Auto-generate fieldName from fieldLabel
        const fieldName = this._generateFieldId(fieldLabel);

        // Validate
        if (!fieldLabel || !fieldName) {
            alert('Field Label is required');
            return;
        }

        // Check if creating new slot or editing existing
        // Use newSlotData as primary indicator of new slot creation
        if (this.newSlotData && this.currentEditingSlotIndex === -1) {
            console.log('🆕 Entering NEW SLOT CREATION branch');
            // NEW SLOT CREATION
            if (!this.newSlotData) {
                console.error('No newSlotData available for new slot');
                return;
            }

            const { slot, elementId, cellId } = this.newSlotData;

            // Update slot with form values
            slot.fieldName = fieldName;
            slot.fieldLabel = fieldLabel;
            slot.fieldDescription = fieldDescription;
            slot.required = true; // Always required

            // Update type-specific constraints
            if (slot.type === 'text') {
                const maxChars = this.container.querySelector('#inline-max-chars')?.value;
                const minFont = this.container.querySelector('#inline-min-font')?.value;
                const maxFont = this.container.querySelector('#inline-max-font')?.value;
                if (!slot.constraints) slot.constraints = {};
                slot.constraints.maxCharacters = parseInt(maxChars) || 100;
                slot.constraints.minFontSize = parseInt(minFont) || 50;
                slot.constraints.maxFontSize = parseInt(maxFont) || 100;
            } else if (slot.type === 'image' || slot.type === 'media') {
                const fitMode = this.container.querySelector('#inline-fit-mode')?.value;
                if (!slot.constraints) slot.constraints = {};
                slot.constraints.fitMode = fitMode || 'cover';
            }

            // Add to content slot manager
            console.log('📝 Adding slot to ContentSlotManager:', slot.slotId);
            this.app.presetPageManager.contentSlotManager.addSlot(slot);

            // Verify it was added
            const allSlots = this.app.presetPageManager.contentSlotManager.getAllSlots();
            const verifySlot = allSlots.find(s => s.slotId === slot.slotId);
            console.log('✅ Slot added to ContentSlotManager:', verifySlot ? 'YES' : 'NO');
            console.log('📊 Total slots in ContentSlotManager:', allSlots.length);
            console.log('📋 All slot IDs:', allSlots.map(s => s.slotId));

            // NOTE: Slot already added to configuredSlots in showInlineEditorForNewSlot (line 610)
            // So we DON'T push it again here, just find its index
            const slotIndex = this.configuredSlots.findIndex(s => s.slotId === slot.slotId);
            console.log('📍 Slot found at index:', slotIndex);

            // Track as configured
            this.configuredCellIds.add(cellId);
            if (slot.sourceContentId) {
                this.configuredCellIds.add(slot.sourceContentId);
            }

            // Update lock icon to unlocked
            console.log('🔓 About to update lock icon for:', elementId);
            this.updateLockIcon(elementId, true);

            // Force refresh overlay to ensure icon updates
            if (this.overlay && this.overlay.parentElement) {
                console.log('🔄 Refreshing all overlay lock icons');
                this.refreshOverlayLockIcons();
            }

            // Switch to edit mode for this slot (so auto-save works on subsequent changes)
            this.currentEditingSlotIndex = slotIndex;

            // Clear newSlotData
            this.newSlotData = null;

            // ALWAYS refresh UI for new slots (even during auto-save)
            this.updateEditableFieldsList();

            console.log('✅ New slot created:', slot.slotId, 'elementId:', elementId);
        } else {
            console.log('✏️ Entering EDITING EXISTING SLOT branch');
            console.log('📍 currentEditingSlotIndex value:', this.currentEditingSlotIndex);

            // EDITING EXISTING SLOT
            if (this.currentEditingSlotIndex === null) return;

            const slot = this.configuredSlots[this.currentEditingSlotIndex];
            if (!slot) {
                console.error('❌ No slot found at index:', this.currentEditingSlotIndex);
                return;
            }

            console.log('✏️ Updating existing slot:', slot.slotId);

            // Update slot
            slot.fieldName = fieldName;
            slot.fieldLabel = fieldLabel;
            slot.fieldDescription = fieldDescription;
            slot.required = true; // Always required

            // Update type-specific constraints
            if (slot.type === 'text') {
                const maxChars = this.container.querySelector('#inline-max-chars')?.value;
                const minFont = this.container.querySelector('#inline-min-font')?.value;
                const maxFont = this.container.querySelector('#inline-max-font')?.value;
                if (!slot.constraints) slot.constraints = {};
                slot.constraints.maxCharacters = parseInt(maxChars) || 100;
                slot.constraints.minFontSize = parseInt(minFont) || 50;
                slot.constraints.maxFontSize = parseInt(maxFont) || 100;
            } else if (slot.type === 'image' || slot.type === 'media') {
                const fitMode = this.container.querySelector('#inline-fit-mode')?.value;
                if (!slot.constraints) slot.constraints = {};
                slot.constraints.fitMode = fitMode || 'cover';
            }

            // Update in content slot manager
            this.app.presetPageManager.contentSlotManager.updateSlot(slot.slotId, slot);

            console.log('✅ Slot updated:', slot.slotId);
        }

        // Refresh UI if requested
        if (refreshUI) {
            this.updateEditableFieldsList();
        }
    }

    /**
     * Remove slot from inline editor
     */
    removeSlotFromInlineEditor() {
        // Can't remove a slot that hasn't been created yet
        if (this.currentEditingSlotIndex === -1) {
            this.hideInlineEditor();
            return;
        }

        if (this.currentEditingSlotIndex === null) return;

        const slot = this.configuredSlots[this.currentEditingSlotIndex];
        if (!slot) return;

        // Confirm removal
        if (!confirm(`Remove slot "${slot.fieldLabel}"?`)) {
            return;
        }

        // Remove from array
        this.configuredSlots.splice(this.currentEditingSlotIndex, 1);

        // Remove from content slot manager
        this.app.presetPageManager.contentSlotManager.removeSlot(slot.slotId);

        // Update lock icon
        const elementId = this._getElementIdForSlot(slot);
        if (elementId) {
            this.updateLockIcon(elementId, false);
            this.configuredCellIds.delete(slot.sourceElement);
            if (slot.sourceContentId) {
                this.configuredCellIds.delete(slot.sourceContentId);
            }
        }

        // Refresh UI
        this.updateEditableFieldsList();
        this.hideInlineEditor();

        console.log('🗑️ Slot removed:', slot.slotId);
    }

    /**
     * Delete slot from list (via × button)
     */
    deleteSlotFromList(slotIndex) {
        const slot = this.configuredSlots[slotIndex];
        if (!slot) return;

        // Confirm removal
        if (!confirm(`Remove slot "${slot.fieldLabel}"?`)) {
            return;
        }

        // Remove from array
        this.configuredSlots.splice(slotIndex, 1);

        // Remove from content slot manager
        this.app.presetPageManager.contentSlotManager.removeSlot(slot.slotId);

        // Update lock icon
        const elementId = this._getElementIdForSlot(slot);
        if (elementId) {
            this.updateLockIcon(elementId, false);
            this.configuredCellIds.delete(slot.sourceElement);
            if (slot.sourceContentId) {
                this.configuredCellIds.delete(slot.sourceContentId);
            }
        }

        // If this was the slot being edited, hide editor
        if (this.currentEditingSlotIndex === slotIndex) {
            this.hideInlineEditor();
        } else if (this.currentEditingSlotIndex > slotIndex) {
            // Adjust index if we removed an earlier slot
            this.currentEditingSlotIndex--;
        }

        // Refresh UI
        this.updateEditableFieldsList();

        console.log('🗑️ Slot removed:', slot.slotId);
    }

    /**
     * Get element ID for a slot (to update lock icon)
     */
    _getElementIdForSlot(slot) {
        if (slot.type === 'main-text') {
            return 'mainText';
        } else if (slot.type === 'text') {
            return `textCell-${slot.sourceElement}`;
        } else {
            return `contentCell-${slot.sourceElement}`;
        }
    }

    /**
     * Create field list item
     */
    createFieldListItem(elementId, label, config) {
        const item = document.createElement('div');
        item.className = 'editable-field-list-item';
        
        const fieldName = config.fieldName || '(unnamed)';
        const fieldLabel = config.fieldLabel || '(no label)';

        // Get content preview for this cell
        const previewData = this.getCellContentPreview(elementId);
        const formattedPreview = previewData.isText ? `["${previewData.text}"]` : `[${previewData.text}]`;
        console.log('📝 Creating field list item:', { elementId, label, previewData });

        item.innerHTML = `
            <div class="field-list-header">
                <div class="field-list-label">
                    ${label} ${formattedPreview}
                </div>
                <div class="field-list-details">
                    <span class="field-detail-name">${fieldName}</span>
                    <span class="field-detail-divider">•</span>
                    <span class="field-detail-label">${fieldLabel}</span>
                </div>
            </div>
            <div class="field-list-editor" style="display: none;">
                <h5 class="field-editor-title">Set name and label</h5>
                <div class="cell-editor-field">
                    <label>Field Name</label>
                    <input type="text" class="field-name-input preset-name-input" placeholder="e.g., heroHeadline" value="${config.fieldName || ''}" />
                </div>
                <div class="cell-editor-field">
                    <label>Field Label</label>
                    <input type="text" class="field-label-input preset-name-input" placeholder="e.g., Hero Headline" value="${config.fieldLabel || ''}" />
                </div>
                <div class="cell-editor-actions">
                    <button type="button" class="preset-cell-remove-btn">Remove Editable</button>
                </div>
            </div>
        `;

        const header = item.querySelector('.field-list-header');
        const editor = item.querySelector('.field-list-editor');
        const fieldNameInput = item.querySelector('.field-name-input');
        const fieldLabelInput = item.querySelector('.field-label-input');
        const removeBtn = item.querySelector('.preset-cell-remove-btn');

        // Toggle editor on click
        header.addEventListener('click', () => {
            const isExpanded = editor.style.display === 'block';
            
            // Close all other editors first
            const allEditors = this.container.querySelectorAll('.field-list-editor');
            allEditors.forEach(e => e.style.display = 'none');
            
            // Toggle this editor
            editor.style.display = isExpanded ? 'none' : 'block';
            item.classList.toggle('expanded', !isExpanded);
            
            this.selectedCellId = isExpanded ? null : elementId;
        });

        // Update config when inputs change
        fieldNameInput.addEventListener('input', (e) => {
            config.fieldName = e.target.value;
            const detailName = item.querySelector('.field-detail-name');
            if (detailName) {
                detailName.textContent = e.target.value || '(unnamed)';
            }
        });

        fieldLabelInput.addEventListener('input', (e) => {
            config.fieldLabel = e.target.value;
            const detailLabel = item.querySelector('.field-detail-label');
            if (detailLabel) {
                detailLabel.textContent = e.target.value || '(no label)';
            }
        });

        // Remove editable field
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleCellLock(elementId);
        });

        return item;
    }


    /**
     * Get content preview for a cell
     * @param {string} elementId - Element ID (e.g., 'main-text', 'text-3', 'content-5')
     * @returns {string} Content preview text
     */
    getCellContentPreview(elementId) {
        // Parse element ID to get cell ID and type
        if (elementId === 'main-text') {
            // Get main text content
            const textEngine = this.app.textEngine;
            if (textEngine && textEngine.textBounds && textEngine.textBounds.length > 0) {
                const firstLine = textEngine.textBounds[0];
                if (firstLine && firstLine.text) {
                    const text = firstLine.text.trim();
                    const displayText = text.length > 30 ? text.substring(0, 30) + '...' : text;
                    return { text: displayText, isText: true };
                }
            }
            return { text: '(empty)', isText: false };
        }

        // Parse cell ID from elementId (e.g., 'textCell-3' -> 3, 'contentCell-5' -> 5)
        const match = elementId.match(/(\d+)$/);
        if (!match) {
            return { text: '(unknown)', isText: false };
        }

        const cellId = parseInt(match[1]);
        const cell = this.app.grid.getCellById(cellId);

        console.log('🔍 Looking up cell:', { elementId, cellId, cell });

        if (!cell) {
            return { text: '(not found)', isText: false };
        }

        // Check if it's a content cell
        if (cell.cellType === 'content' || cell.type === 'content') {
            const contentType = cell.contentType;
            
            if (contentType === 'empty') {
                return { text: '(empty)', isText: false };
            } else if (contentType === 'media') {
                // Check if there's actual media content
                if (cell.content && cell.content.mediaUrl) {
                    return { text: 'Image', isText: false };
                }
                return { text: 'Media', isText: false };
            } else if (contentType === 'fill') {
                return { text: 'Color', isText: false };
            } else if (contentType === 'text') {
                // Get text content
                if (cell.content && cell.content.text) {
                    const text = cell.content.text.trim();
                    const displayText = text.length > 30 ? text.substring(0, 30) + '...' : text;
                    return { text: displayText, isText: true };
                }
                return { text: 'Text', isText: false };
            }
        }

        // For main text cells
        if (cell.cellType === 'main-text' || cell.type === 'main-text') {
            if (cell.text) {
                const text = cell.text.trim();
                const displayText = text.length > 30 ? text.substring(0, 30) + '...' : text;
                return { text: displayText, isText: true };
            }
            return { text: 'Main Text', isText: false };
        }

        return { text: '', isText: false };
    }

    /**
     * Load existing presets into dropdown
     */
    async loadExistingPresets() {
        const presets = await this.presetPageManager.getAllPresets();
        const select = this.container.querySelector('#save-existing-preset-select');

        if (!select) return;

        // Clear existing options
        select.innerHTML = '<option value="">-- Select Preset --</option>';

        // Add presets
        presets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.presetId;
            option.textContent = `${preset.presetName} (${preset.pageCount} pages)`;
            select.appendChild(option);
        });
    }

    /**
     * Handle preset type change (new vs existing)
     */
    handlePresetTypeChange(type) {
        const newContainer = this.container.querySelector('#save-new-preset-container');
        const existingContainer = this.container.querySelector('#save-existing-preset-container');

        if (type === 'new') {
            newContainer.style.display = 'block';
            existingContainer.style.display = 'none';
        } else {
            newContainer.style.display = 'none';
            existingContainer.style.display = 'block';
        }
    }

    /**
     * Handle save button click
     */
    async handleSave() {
        try {
            // Get form values
            const presetType = this.container.querySelector('input[name="save-preset-type"]:checked').value;
            const pageName = this.container.querySelector('#save-page-name').value.trim();
            const pagePosition = parseInt(this.container.querySelector('#save-page-position').value);

            // Validate
            if (!pageName) {
                alert('Please enter a page name');
                return;
            }

            let presetName, presetId;

            if (presetType === 'new') {
                presetName = this.container.querySelector('#save-new-preset-name').value.trim();
                if (!presetName) {
                    alert('Please enter a preset name');
                    return;
                }
            } else {
                presetId = this.container.querySelector('#save-existing-preset-select').value;
                if (!presetId) {
                    alert('Please select a preset');
                    return;
                }
            }

            // Clear content slot manager and add configured slots
            this.contentSlotManager.clearSlots();
            this.configuredSlots.forEach(slot => {
                this.contentSlotManager.addSlot(slot);
            });

            // Capture current page (will include content slots)
            const pageData = this.presetPageManager.captureCurrentPage(pagePosition, pageName);
            
            console.log(`✅ Page captured with ${pageData.contentSlots.length} content slots`);

            // Save
            if (presetType === 'new') {
                await this.presetPageManager.saveToNewPreset(presetName, pageData, pagePosition);
                alert(`✅ Page saved to new preset: ${presetName}`);
            } else {
                await this.presetPageManager.addPageToExistingPreset(presetId, pageData, pagePosition);
                alert(`✅ Page added to existing preset`);
            }

            this.hide();

            // Refresh preset list in UI if needed
            if (this.app.presetUI) {
                this.app.presetUI.loadPresets();
            }

        } catch (error) {
            console.error('Error saving page:', error);
            alert(`Error saving page: ${error.message}`);
        }
    }
}
