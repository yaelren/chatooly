/**
 * ContentSlotConfigPanel.js - UI for configuring content slot constraints
 *
 * Designer workflow:
 * 1. Click cell → "Make Editable"
 * 2. Panel opens with configuration form
 * 3. Enter field metadata (name, label, description)
 * 4. Configure type-specific constraints
 * 5. Save slot configuration
 */

class ContentSlotConfigPanel {
    constructor(app) {
        this.app = app;
        this.contentSlotManager = app.presetPageManager.contentSlotManager;

        this.panel = null;
        this.currentCell = null;
        this.onSaveCallback = null;
        this.onCancelCallback = null;

        this.createPanel();
    }

    /**
     * Create panel HTML structure
     */
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.className = 'content-slot-config-panel';
        this.panel.style.display = 'none';
        this.panel.innerHTML = `
            <div class="slot-config-header">
                <h3>Configure Editable Field</h3>
                <button class="slot-config-close" title="Cancel">&times;</button>
            </div>

            <div class="slot-config-body">
                <!-- Cell Info -->
                <div class="slot-config-section">
                    <div class="slot-info">
                        <strong>Cell:</strong> <span id="slotCellId"></span>
                        <br>
                        <strong>Type:</strong> <span id="slotCellType"></span>
                    </div>
                </div>

                <!-- Field Metadata -->
                <div class="slot-config-section">
                    <h4>Field Information</h4>

                    <label>
                        Field Name <span class="required">*</span>
                        <input type="text"
                               id="slotFieldName"
                               placeholder="e.g., headline, companyLogo"
                               pattern="[a-zA-Z0-9_]+"
                               title="Letters, numbers, and underscores only">
                        <small>Used internally (letters, numbers, underscores)</small>
                    </label>

                    <label>
                        Field Label <span class="required">*</span>
                        <input type="text"
                               id="slotFieldLabel"
                               placeholder="e.g., Hero Headline, Company Logo">
                        <small>Shown to end-users in form</small>
                    </label>

                    <label>
                        Description (Optional)
                        <textarea id="slotFieldDescription"
                                  rows="2"
                                  placeholder="Help text for end-users"></textarea>
                    </label>

                    <label class="slot-checkbox">
                        <input type="checkbox" id="slotRequired">
                        Required field
                    </label>
                </div>

                <!-- Text Constraints (shown for text slots) -->
                <div class="slot-config-section" id="textConstraintsSection" style="display: none;">
                    <h4>Text Constraints</h4>

                    <label>
                        Maximum Characters
                        <input type="number"
                               id="slotMaxCharacters"
                               min="1"
                               max="1000"
                               value="100">
                        <small>Character limit for user input</small>
                    </label>

                    <div class="slot-font-range">
                        <label>Font Size Range (Auto-Fit)</label>
                        <div class="slot-font-inputs">
                            <div>
                                <label>Min</label>
                                <input type="number"
                                       id="slotMinFontSize"
                                       min="8"
                                       max="200"
                                       value="24">
                                <span>px</span>
                            </div>
                            <div>
                                <label>Max</label>
                                <input type="number"
                                       id="slotMaxFontSize"
                                       min="8"
                                       max="200"
                                       value="72">
                                <span>px</span>
                            </div>
                        </div>
                        <small>Font size will auto-fit within this range</small>
                    </div>

                    <label>
                        Alignment
                        <select id="slotTextAlign">
                            <option value="center">Center</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                        </select>
                    </label>
                </div>

                <!-- Image Constraints (shown for image slots) -->
                <div class="slot-config-section" id="imageConstraintsSection" style="display: none;">
                    <h4>Image Constraints</h4>

                    <label>
                        Fit Mode
                        <select id="slotFitMode">
                            <option value="cover">Cover (crop to fill)</option>
                            <option value="free">Free (scale proportionally)</option>
                        </select>
                        <small>How image fills the bounding box</small>
                    </label>

                    <label>
                        Maximum File Size
                        <select id="slotMaxFileSize">
                            <option value="5242880">5 MB</option>
                            <option value="10485760" selected>10 MB</option>
                            <option value="20971520">20 MB</option>
                        </select>
                    </label>

                    <label>
                        Allowed Formats
                        <div class="slot-format-checkboxes">
                            <label class="slot-checkbox">
                                <input type="checkbox" value="jpg" checked> JPG
                            </label>
                            <label class="slot-checkbox">
                                <input type="checkbox" value="png" checked> PNG
                            </label>
                            <label class="slot-checkbox">
                                <input type="checkbox" value="webp" checked> WebP
                            </label>
                            <label class="slot-checkbox">
                                <input type="checkbox" value="gif" checked> GIF
                            </label>
                        </div>
                    </label>
                </div>
            </div>

            <div class="slot-config-footer">
                <button class="slot-config-cancel">Cancel</button>
                <button class="slot-config-save">Save Slot</button>
            </div>
        `;

        document.body.appendChild(this.panel);
        this.attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close button
        this.panel.querySelector('.slot-config-close').addEventListener('click', () => {
            this.hide();
            if (this.onCancelCallback) this.onCancelCallback();
        });

        // Cancel button
        this.panel.querySelector('.slot-config-cancel').addEventListener('click', () => {
            this.hide();
            if (this.onCancelCallback) this.onCancelCallback();
        });

        // Save button
        this.panel.querySelector('.slot-config-save').addEventListener('click', () => {
            this.handleSave();
        });

        // Validate field name on input
        const fieldNameInput = this.panel.querySelector('#slotFieldName');
        fieldNameInput.addEventListener('input', (e) => {
            // Remove invalid characters
            e.target.value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
        });

        // Auto-generate field name from label
        const fieldLabelInput = this.panel.querySelector('#slotFieldLabel');
        fieldLabelInput.addEventListener('input', (e) => {
            if (!fieldNameInput.value) {
                // Auto-generate camelCase field name from label
                const label = e.target.value;
                const fieldName = label
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, '')
                    .split(/\s+/)
                    .map((word, i) => i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))
                    .join('');
                fieldNameInput.value = fieldName;
            }
        });
    }

    /**
     * Show panel for a cell
     * @param {GridCell} cell - Cell to configure
     * @param {Function} onSave - Callback when configuration is saved
     * @param {Function} onCancel - Callback when configuration is cancelled
     */
    show(cell, onSave = null, onCancel = null) {
        console.log('📥 ContentSlotConfigPanel.show() received:');
        console.log('   → cell:', cell);
        console.log('   → onSave type:', typeof onSave);
        console.log('   → onCancel type:', typeof onCancel);
        this.currentCell = cell;
        this.onSaveCallback = onSave;
        this.onCancelCallback = onCancel;

        // Update cell info
        this.panel.querySelector('#slotCellId').textContent = cell.id || 'Unknown';
        this.panel.querySelector('#slotCellType').textContent = this._getCellTypeName(cell.type);

        // Show appropriate constraint section
        const isText = cell.type === 'main-text' || cell.type === 'text';
        this.panel.querySelector('#textConstraintsSection').style.display = isText ? 'block' : 'none';
        this.panel.querySelector('#imageConstraintsSection').style.display = isText ? 'none' : 'block';

        // Pre-fill with intelligent defaults
        this._prefillDefaults(cell);

        // Show panel
        this.panel.style.display = 'flex';
    }

    /**
     * Hide panel
     */
    hide() {
        this.panel.style.display = 'none';
        this.currentCell = null;
        this.onSaveCallback = null;
        this.onCancelCallback = null;
        this._resetForm();
    }

    /**
     * Get human-readable cell type name
     */
    _getCellTypeName(type) {
        const names = {
            'main-text': 'Main Text',
            'text': 'Text Cell',
            'content': 'Image/Media Cell',
            'spot': 'Content Spot'
        };
        return names[type] || type;
    }

    /**
     * Pre-fill form with intelligent defaults based on cell
     */
    _prefillDefaults(cell) {
        const isText = cell.type === 'main-text' || cell.type === 'text';

        // Generate default field name and label
        const defaultName = this._generateDefaultFieldName(cell);
        const defaultLabel = this._generateDefaultFieldLabel(cell);

        this.panel.querySelector('#slotFieldName').value = defaultName;
        this.panel.querySelector('#slotFieldLabel').value = defaultLabel;
        this.panel.querySelector('#slotFieldDescription').value = '';
        this.panel.querySelector('#slotRequired').checked = false;

        if (isText) {
            // Text constraints
            const currentFontSize = this._getCurrentFontSize(cell);
            this.panel.querySelector('#slotMaxCharacters').value = 100;
            this.panel.querySelector('#slotMinFontSize').value = Math.max(16, Math.floor(currentFontSize * 0.5));
            this.panel.querySelector('#slotMaxFontSize').value = Math.max(currentFontSize, 72);
            this.panel.querySelector('#slotTextAlign').value = 'center';
        } else {
            // Image constraints
            this.panel.querySelector('#slotFitMode').value = 'cover';
            this.panel.querySelector('#slotMaxFileSize').value = '10485760';
            // Reset format checkboxes to all checked
            this.panel.querySelectorAll('.slot-format-checkboxes input[type="checkbox"]').forEach(cb => {
                cb.checked = true;
            });
        }
    }

    /**
     * Generate default field name from cell
     */
    _generateDefaultFieldName(cell) {
        if (cell.type === 'main-text') return 'mainHeadline';
        const cellIdStr = String(cell.id || '');
        if (cell.type === 'text') return `text${cellIdStr.replace(/\D/g, '') || '1'}`;
        if (cell.type === 'content' || cell.type === 'spot') return `image${cellIdStr.replace(/\D/g, '') || '1'}`;
        return 'field1';
    }

    /**
     * Generate default field label from cell
     */
    _generateDefaultFieldLabel(cell) {
        if (cell.type === 'main-text') return 'Main Headline';
        const cellIdStr = String(cell.id || '');
        if (cell.type === 'text') return `Text ${cellIdStr.replace(/\D/g, '') || '1'}`;
        if (cell.type === 'content' || cell.type === 'spot') return `Image ${cellIdStr.replace(/\D/g, '') || '1'}`;
        return 'Field 1';
    }

    /**
     * Get current font size from cell
     */
    _getCurrentFontSize(cell) {
        if (cell.type === 'main-text' && this.app.mainTextComponent) {
            return this.app.mainTextComponent.fontSize;
        }
        if (cell.type === 'text' && cell.content && cell.content.fontSize) {
            return cell.content.fontSize;
        }
        return 48;
    }

    /**
     * Reset form to defaults
     */
    _resetForm() {
        this.panel.querySelector('#slotFieldName').value = '';
        this.panel.querySelector('#slotFieldLabel').value = '';
        this.panel.querySelector('#slotFieldDescription').value = '';
        this.panel.querySelector('#slotRequired').checked = false;
    }

    /**
     * Validate form inputs
     */
    _validateForm() {
        const fieldName = this.panel.querySelector('#slotFieldName').value.trim();
        const fieldLabel = this.panel.querySelector('#slotFieldLabel').value.trim();

        if (!fieldName) {
            alert('Field name is required');
            return false;
        }

        if (!fieldLabel) {
            alert('Field label is required');
            return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(fieldName)) {
            alert('Field name can only contain letters, numbers, and underscores');
            return false;
        }

        // Validate font size range for text
        if (this.currentCell.type === 'main-text' || this.currentCell.type === 'text') {
            const minFont = parseInt(this.panel.querySelector('#slotMinFontSize').value);
            const maxFont = parseInt(this.panel.querySelector('#slotMaxFontSize').value);

            if (minFont >= maxFont) {
                alert('Minimum font size must be less than maximum font size');
                return false;
            }
        }

        return true;
    }

    /**
     * Get configuration from form
     */
    _getConfiguration() {
        const isText = this.currentCell.type === 'main-text' || this.currentCell.type === 'text';

        const config = {
            fieldName: this.panel.querySelector('#slotFieldName').value.trim(),
            fieldLabel: this.panel.querySelector('#slotFieldLabel').value.trim(),
            fieldDescription: this.panel.querySelector('#slotFieldDescription').value.trim(),
            required: this.panel.querySelector('#slotRequired').checked,
            constraints: {}
        };

        if (isText) {
            // Text constraints
            config.constraints = {
                maxCharacters: parseInt(this.panel.querySelector('#slotMaxCharacters').value),
                minFontSize: parseInt(this.panel.querySelector('#slotMinFontSize').value),
                maxFontSize: parseInt(this.panel.querySelector('#slotMaxFontSize').value),
                horizontalAlign: this.panel.querySelector('#slotTextAlign').value,
                fontSizeMode: 'auto-fit',
                wordWrap: true,
                verticalAlign: 'center'
            };
        } else {
            // Image constraints
            const formatCheckboxes = this.panel.querySelectorAll('.slot-format-checkboxes input[type="checkbox"]:checked');
            const allowedFormats = Array.from(formatCheckboxes).map(cb => cb.value);

            config.constraints = {
                fitMode: this.panel.querySelector('#slotFitMode').value,
                maxFileSize: parseInt(this.panel.querySelector('#slotMaxFileSize').value),
                allowedFormats: allowedFormats,
                focalPoint: 'center'
            };
        }

        return config;
    }

    /**
     * Handle save button click
     */
    handleSave() {
        if (!this.currentCell) {
            console.error('No cell selected');
            return;
        }

        // Validate form
        if (!this._validateForm()) {
            return;
        }

        // Get configuration
        const config = this._getConfiguration();

        try {
            // Create content slot
            const slot = this.contentSlotManager.createSlotFromCell(this.currentCell, config);

            // Add to manager
            this.contentSlotManager.addSlot(slot);

            console.log('✅ Content slot created:', slot);

            // Call save callback with slot BEFORE hiding (hide() clears callbacks!)
            console.log('🔍 Checking callback:', typeof this.onSaveCallback);
            if (this.onSaveCallback) {
                console.log('📞 Calling onSaveCallback...');
                this.onSaveCallback(slot);
                console.log('✅ onSaveCallback completed');
            } else {
                console.warn('⚠️ No onSaveCallback registered!');
            }

            // Hide panel (this clears callbacks)
            this.hide();

        } catch (error) {
            console.error('❌ Failed to create content slot:', error);
            alert(`Failed to create content slot: ${error.message}`);
        }
    }
}
