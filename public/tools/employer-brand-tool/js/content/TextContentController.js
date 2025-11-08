/**
 * TextContentController.js - Handles text cell controls and interactions
 * Extends ContentController for text-specific functionality
 */

class TextContentController extends ContentController {
    constructor(app) {
        super(app);
        this.contentType = 'text';
    }
    
    /**
     * Get default content for text spots
     * @returns {Object} Default content object
     */
    getDefaultContent() {
        return {
            text: '',
            color: '#808080',
            textAlign: 'center',
            positionH: 'center',
            positionV: 'middle',
            styles: {},
            fontSize: 'auto',
            fontFamily: '"Wix Madefor Display", Arial, sans-serif',
            padding: 1,
            highlightColor: '#ffff00'
        };
    }
    
    /**
     * Create controls for text spots
     * @param {ContentCell} cell - Cell object
     * @param {HTMLElement} container - Container for controls
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement[]} Array of created control elements
     */
    createControls(cell, container, context = 'sidebar') {
        // Initialize content if needed
        this.initializeContent(cell);

        const controls = [];

        // Text input
        const textGroup = this.createTextInput(cell, context);
        container.appendChild(textGroup);
        controls.push(textGroup);

        // Font family control
        const fontFamilyGroup = this.createFontFamilyControl(cell, context);
        container.appendChild(fontFamilyGroup);
        controls.push(fontFamilyGroup);

        // Font size control
        const fontSizeGroup = this.createFontSizeControl(cell, context);
        container.appendChild(fontSizeGroup);
        controls.push(fontSizeGroup);

        // Text alignment
        const alignmentGroup = this.createAlignmentControl(cell, context);
        container.appendChild(alignmentGroup);
        controls.push(alignmentGroup);

        // Position alignment
        const positionGroup = this.createPositionControl(cell, context);
        container.appendChild(positionGroup);
        controls.push(positionGroup);

        // Text color and styling (combined inline)
        const colorStyleGroup = this.createColorAndStyleControl(cell, context);
        container.appendChild(colorStyleGroup);
        controls.push(colorStyleGroup);

        // Highlight color (only show if highlight is enabled)
        if (cell.content.styles?.highlight) {
            const highlightColorGroup = this.createHighlightColorControl(cell, context);
            container.appendChild(highlightColorGroup);
            controls.push(highlightColorGroup);
        }

        // Background controls
        const backgroundGroup = this.createBackgroundControls(cell, context);
        container.appendChild(backgroundGroup);
        controls.push(backgroundGroup);

        return controls;
    }
    
    /**
     * Create text input control
     * @param {ContentCell} cell - Cell object
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement} Text input control element
     * @private
     */
    createTextInput(cell, context) {
        const textGroup = this.createControlGroup(context);
        textGroup.innerHTML = `
            <label>Text</label>
            <textarea class="spot-text-input" placeholder="Enter text..." rows="3">${cell.content.text || ''}</textarea>
        `;

        const textInput = textGroup.querySelector('.spot-text-input');
        this.addControlListener(textInput, 'input', () => {
            this.updateContent(cell, { text: textInput.value }, true);
        });

        return textGroup;
    }
    
    /**
     * Create font family control
     * @param {ContentCell} cell - Cell object
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement} Font family control element
     * @private
     */
    createFontFamilyControl(cell, context) {
        const fontFamilyGroup = this.createControlGroup(context);
        fontFamilyGroup.innerHTML = `<label>Font Family</label>`;

        const fontSelect = document.createElement('select');
        fontSelect.className = 'spot-font-family';

        // Get available fonts from TextComponent (single source of truth)
        const fonts = TextComponent.getAvailableFonts();

        fonts.forEach(font => {
            const option = document.createElement('option');
            option.value = font.value;
            option.textContent = font.name;
            
            // Mark custom fonts with italic style
            if (font.isCustom) {
                option.style.fontStyle = 'italic';
            }
            
            if (font.value === (cell.content.fontFamily || '"Wix Madefor Display", Arial, sans-serif')) {
                option.selected = true;
            }
            fontSelect.appendChild(option);
        });

        // Add separator and upload option
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '───────────────';
        fontSelect.appendChild(separator);

        const uploadOption = document.createElement('option');
        uploadOption.value = '__upload_font__';
        uploadOption.textContent = '📁 Upload custom font...';
        uploadOption.style.fontStyle = 'italic';
        uploadOption.style.color = '#999';
        fontSelect.appendChild(uploadOption);

        this.addControlListener(fontSelect, 'change', () => {
            const selectedValue = fontSelect.value;
            
            // Handle upload option
            if (selectedValue === '__upload_font__') {
                this.showFontUploadModal(cell);
                // Reset to previous selection
                fontSelect.value = cell.content.fontFamily || '"Wix Madefor Display", Arial, sans-serif';
                return;
            }
            
            this.updateContent(cell, { fontFamily: selectedValue }, true);
        });

        fontFamilyGroup.appendChild(fontSelect);
        return fontFamilyGroup;
    }

    /**
     * Show font upload modal for spot text
     * @param {ContentCell} cell - Cell object
     * @private
     */
    showFontUploadModal(cell) {
        // Initialize FontManager if not already done
        if (typeof FontManager !== 'undefined' && !window.fontManager) {
            window.fontManager = new FontManager();
        }

        // Initialize FontUploadComponent if not already done
        if (typeof FontUploadComponent !== 'undefined' && !this.fontUploadComponent) {
            this.fontUploadComponent = new FontUploadComponent(window.fontManager);
        }

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'font-upload-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Upload Custom Font</h3>
                        <button type="button" class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <!-- Font upload UI will be populated here -->
                    </div>
                </div>
            </div>
        `;

        // Add styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const overlay = modal.querySelector('.modal-overlay');
        overlay.style.cssText = `
            background: rgba(0, 0, 0, 0.8);
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const content = modal.querySelector('.modal-content');
        content.style.cssText = `
            background: var(--chatooly-color-surface, #1a1a1a);
            border-radius: 8px;
            max-width: 500px;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            border: 1px solid var(--chatooly-color-border, #3a3a3a);
        `;

        const header = modal.querySelector('.modal-header');
        header.style.cssText = `
            padding: 20px;
            border-bottom: 1px solid var(--chatooly-color-border, #3a3a3a);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--chatooly-color-background, #121212);
        `;

        const headerTitle = header.querySelector('h3');
        headerTitle.style.cssText = `
            margin: 0;
            color: var(--chatooly-color-text, #e5e5e5);
            font-size: 18px;
        `;

        const body = modal.querySelector('.modal-body');
        body.style.cssText = `
            padding: 20px;
            max-height: 60vh;
            overflow-y: auto;
        `;

        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.style.cssText = `
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--chatooly-color-text, #e5e5e5);
        `;

        // Create font upload UI in modal
        if (this.fontUploadComponent) {
            this.fontUploadComponent.createUploadUI(
                body,
                () => {
                    // Refresh font family dropdown when fonts change
                    this.refreshFontFamilyDropdown(cell);
                    // Close modal after successful upload
                    setTimeout(() => {
                        if (modal.parentNode) {
                            modal.parentNode.removeChild(modal);
                        }
                    }, 2000);
                }
            );
        }

        // Add event listeners
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(modal);
            }
        });

        document.body.appendChild(modal);
    }

    /**
     * Refresh font family dropdown for a specific cell
     * @param {ContentCell} cell - Cell object
     * @private
     */
    refreshFontFamilyDropdown(cell) {
        // Find the font family select for this cell
        const cellElement = cell.element || document.querySelector(`[data-cell-id="${cell.id}"]`);
        if (cellElement) {
            const fontSelect = cellElement.querySelector('.spot-font-family');
            if (fontSelect) {
                // Get current value
                const currentValue = fontSelect.value;
                
                // Clear and repopulate options
                fontSelect.innerHTML = '';
                const fonts = TextComponent.getAvailableFonts();
                
                fonts.forEach(font => {
                    const option = document.createElement('option');
                    option.value = font.value;
                    option.textContent = font.name;
                    
                    // Mark custom fonts
                    if (font.isCustom) {
                        option.textContent += ' (Custom)';
                        option.style.fontStyle = 'italic';
                    }
                    
                    if (font.value === currentValue) {
                        option.selected = true;
                    }
                    
                    fontSelect.appendChild(option);
                });

                // Add separator and upload option
                const separator = document.createElement('option');
                separator.disabled = true;
                separator.textContent = '───────────────';
                fontSelect.appendChild(separator);

                const uploadOption = document.createElement('option');
                uploadOption.value = '__upload_font__';
                uploadOption.textContent = '📁 Upload custom font...';
                uploadOption.style.fontStyle = 'italic';
                uploadOption.style.color = '#999';
                fontSelect.appendChild(uploadOption);
            }
        }
    }

    /**
     * Create font size control
     * @param {ContentCell} cell - Cell object
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement} Font size control element
     * @private
     */
    createFontSizeControl(cell, context) {
        const fontSizeGroup = this.createControlGroup(context);

        // Calculate max font size based on cell dimensions
        const padding = cell.content.padding || 0;
        const availableHeight = cell.height - (padding * 2);
        const maxFontSize = Math.min(availableHeight * 0.8, 72);
        const currentFontSize = cell.content.fontSize === 'auto' ? maxFontSize : cell.content.fontSize || maxFontSize;

        fontSizeGroup.innerHTML = `
            <label>Font Size: <span class="font-size-value">${cell.content.fontSize === 'auto' ? 'Auto' : currentFontSize + 'px'}</span></label>
            <input type="range" class="spot-font-size" min="8" max="${Math.floor(maxFontSize)}" step="1" value="${currentFontSize}">
            <label style="margin-top: 8px;">
                <input type="checkbox" class="auto-size-checkbox" ${cell.content.fontSize === 'auto' ? 'checked' : ''}>
                Auto-fit to cell
            </label>
        `;

        const fontSizeSlider = fontSizeGroup.querySelector('.spot-font-size');
        const fontSizeValue = fontSizeGroup.querySelector('.font-size-value');
        const autoSizeCheckbox = fontSizeGroup.querySelector('.auto-size-checkbox');

        const updateFontSize = () => {
            if (autoSizeCheckbox.checked) {
                this.updateContent(cell, { fontSize: 'auto' }, true);
                fontSizeValue.textContent = 'Auto';
                fontSizeSlider.disabled = true;
            } else {
                const size = parseInt(fontSizeSlider.value);
                this.updateContent(cell, { fontSize: size }, true);
                fontSizeValue.textContent = size + 'px';
                fontSizeSlider.disabled = false;
            }
        };

        this.addControlListener(fontSizeSlider, 'input', updateFontSize);
        this.addControlListener(autoSizeCheckbox, 'change', updateFontSize);

        return fontSizeGroup;
    }
    
    /**
     * Create text alignment control
     * @param {ContentCell} cell - Cell object
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement} Alignment control element
     * @private
     */
    createAlignmentControl(cell, context) {
        const alignmentGroup = this.createControlGroup(context);
        alignmentGroup.innerHTML = `<label>Text Alignment</label>`;

        const alignmentDiv = document.createElement('div');
        alignmentDiv.className = 'spot-text-alignment';

        const alignments = [
            { value: 'left', label: '<span class="align-icon"></span>', title: 'Align Left', iconClass: 'align-left-icon' },
            { value: 'center', label: '<span class="align-icon"></span>', title: 'Align Center', iconClass: 'align-center-icon' },
            { value: 'right', label: '<span class="align-icon"></span>', title: 'Align Right', iconClass: 'align-right-icon' }
        ];

        alignments.forEach(align => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'align-btn';
            btn.innerHTML = align.label;
            btn.title = align.title;
            btn.classList.add(align.iconClass);

            if (align.value === (cell.content.textAlign || 'center')) {
                btn.classList.add('active');
            }

            this.addControlListener(btn, 'click', () => {
                alignmentDiv.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateContent(cell, { textAlign: align.value }, true);
            });

            alignmentDiv.appendChild(btn);
        });

        alignmentGroup.appendChild(alignmentDiv);
        return alignmentGroup;
    }
    
    /**
     * Create position alignment control
     * @param {ContentCell} cell - Cell object
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement} Position control element
     * @private
     */
    createPositionControl(cell, context) {
        const positionGroup = this.createControlGroup(context);
        positionGroup.innerHTML = `<label>Position in Cell</label>`;

        const positionGrid = document.createElement('div');
        positionGrid.className = 'positioning-grid';

        const positions = [
            { h: 'left', v: 'top', icon: '↖', title: 'Top Left' },
            { h: 'center', v: 'top', icon: '↑', title: 'Top Center' },
            { h: 'right', v: 'top', icon: '↗', title: 'Top Right' },
            { h: 'left', v: 'middle', icon: '←', title: 'Middle Left' },
            { h: 'center', v: 'middle', icon: '•', title: 'Center' },
            { h: 'right', v: 'middle', icon: '→', title: 'Middle Right' },
            { h: 'left', v: 'bottom', icon: '↙', title: 'Bottom Left' },
            { h: 'center', v: 'bottom', icon: '↓', title: 'Bottom Center' },
            { h: 'right', v: 'bottom', icon: '↘', title: 'Bottom Right' }
        ];

        positions.forEach(pos => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pos-btn';
            btn.textContent = pos.icon;
            btn.title = pos.title;

            const currentPosH = cell.content.positionH || 'center';
            const currentPosV = cell.content.positionV || 'middle';

            if (pos.h === currentPosH && pos.v === currentPosV) {
                btn.classList.add('active');
            }

            this.addControlListener(btn, 'click', () => {
                positionGrid.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateContent(cell, {
                    positionH: pos.h,
                    positionV: pos.v
                }, true);
            });

            positionGrid.appendChild(btn);
        });

        positionGroup.appendChild(positionGrid);
        return positionGroup;
    }
    
    /**
     * Create combined color and styling control (compact inline layout)
     * @param {ContentCell} cell - Cell object
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement} Combined control element
     * @private
     */
    createColorAndStyleControl(cell, context) {
        const group = this.createControlGroup(context);
        group.className = (context === 'popup' ? 'chatooly-control-group' : 'spot-control-section') + ' color-style-row';
        
        // Create container for inline layout
        const container = document.createElement('div');
        container.className = 'text-color-style-container';
        
        container.innerHTML = `
            <label>Text Color:</label>
            <input type="color" class="spot-text-color" value="${cell.content.color || '#000000'}">
            <div class="style-buttons-inline">
                <button type="button" class="style-btn ${cell.content.styles?.bold ? 'active' : ''}" data-style="bold" title="Bold">B</button>
                <button type="button" class="style-btn ${cell.content.styles?.italic ? 'active' : ''}" data-style="italic" title="Italic">I</button>
                <button type="button" class="style-btn ${cell.content.styles?.underline ? 'active' : ''}" data-style="underline" title="Underline">U</button>
                <button type="button" class="style-btn ${cell.content.styles?.highlight ? 'active' : ''}" data-style="highlight" title="Highlight">H</button>
            </div>
        `;
        
        // Color input listener
        const colorInput = container.querySelector('.spot-text-color');
        this.addControlListener(colorInput, 'input', () => {
            this.updateContent(cell, { color: colorInput.value }, true);
        });
        
        // Style button listeners
        const styleButtons = container.querySelectorAll('.style-btn');
        styleButtons.forEach(btn => {
            this.addControlListener(btn, 'click', () => {
                const styleKey = btn.dataset.style;
                btn.classList.toggle('active');
                const currentStyles = { ...cell.content.styles };
                currentStyles[styleKey] = !currentStyles[styleKey];
                this.updateContent(cell, { styles: currentStyles }, true);

                // If highlight was toggled, recreate controls to show/hide highlight color
                if (styleKey === 'highlight') {
                    this.app.uiManager?.updateSpotsUI();
                }
            });
        });
        
        group.appendChild(container);
        return group;
    }
    
    /**
     * Create text styling control (legacy - kept for compatibility)
     * @param {ContentCell} cell - Cell object
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement} Styling control element
     * @private
     */
    createStylingControl(cell, context) {
        const stylingGroup = this.createControlGroup(context);
        stylingGroup.innerHTML = `<label>Text Style</label>`;

        const stylingDiv = document.createElement('div');
        stylingDiv.className = 'spot-text-styling';

        const styles = [
            { key: 'bold', label: 'B' },
            { key: 'italic', label: 'I' },
            { key: 'underline', label: 'U' },
            { key: 'highlight', label: 'H' }
        ];

        styles.forEach(style => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'style-btn';
            btn.textContent = style.label;

            if (cell.content.styles?.[style.key]) {
                btn.classList.add('active');
            }

            this.addControlListener(btn, 'click', () => {
                btn.classList.toggle('active');
                const currentStyles = { ...cell.content.styles };
                currentStyles[style.key] = !currentStyles[style.key];
                this.updateContent(cell, { styles: currentStyles }, true);

                // If highlight was toggled, recreate controls to show/hide highlight color
                if (style.key === 'highlight') {
                    // Force UI update to show/hide highlight color control
                    this.app.uiManager?.updateSpotsUI();
                }
            });

            stylingDiv.appendChild(btn);
        });

        stylingGroup.appendChild(stylingDiv);
        return stylingGroup;
    }
    
    /**
     * Create text color control (legacy - kept for compatibility)
     * @param {ContentCell} cell - Cell object
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement} Color control element
     * @private
     */
    createColorControl(cell, context) {
        const colorGroup = this.createControlGroup(context);
        colorGroup.innerHTML = `
            <label>Text Color</label>
            <input type="color" class="spot-text-color" value="${cell.content.color || '#000000'}">
        `;

        const colorInput = colorGroup.querySelector('.spot-text-color');
        this.addControlListener(colorInput, 'input', () => {
            this.updateContent(cell, { color: colorInput.value }, true);
        });

        return colorGroup;
    }
    
    /**
     * Create highlight color control
     * @param {ContentCell} cell - Cell object
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement} Highlight color control element
     * @private
     */
    createHighlightColorControl(cell, context) {
        const highlightColorGroup = this.createControlGroup(context);
        highlightColorGroup.innerHTML = `
            <label>Highlight Color</label>
            <input type="color" class="spot-highlight-color" value="${cell.content.highlightColor || '#ffff00'}">
        `;

        const colorInput = highlightColorGroup.querySelector('.spot-highlight-color');
        this.addControlListener(colorInput, 'input', () => {
            this.updateContent(cell, { highlightColor: colorInput.value }, true);
        });

        return highlightColorGroup;
    }

    /**
     * Create background controls for image/text cells
     * @param {ContentCell} cell - Cell object
     * @param {string} context - 'sidebar' or 'popup'
     * @returns {HTMLElement} Created background controls element
     * @protected
     */
    createBackgroundControls(cell, context) {
        const group = this.createControlGroup(context);
        group.innerHTML = `
            <label>Background:</label>
            <label>
                <input type="checkbox" id="textFillWithBackgroundColor" ${cell.content.fillWithBackgroundColor ? 'checked' : ''}>
                Fill with global background color
            </label>
        `;

        // Add event listeners
        const checkbox = group.querySelector('#textFillWithBackgroundColor');

        checkbox.addEventListener('change', (e) => {
            cell.content.fillWithBackgroundColor = e.target.checked;
            this.app.render();
        });

        return group;
    }
}