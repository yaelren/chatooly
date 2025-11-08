/**
 * FontUploadComponent.js - UI component for font upload functionality
 * Provides upload interface and font management controls
 */

class FontUploadComponent {
    constructor(fontManager) {
        this.fontManager = fontManager;
        this.uploadContainer = null;
        this.fontListContainer = null;
        this.onFontsChanged = null; // Callback for when fonts change
    }

    /**
     * Create font upload UI
     * @param {HTMLElement} container - Container element
     * @param {Function} onFontsChanged - Callback when fonts change
     * @returns {HTMLElement} Created UI element
     */
    createUploadUI(container, onFontsChanged = null) {
        this.onFontsChanged = onFontsChanged;
        
        const uploadSection = document.createElement('div');
        uploadSection.className = 'font-upload-section';
        uploadSection.innerHTML = `
            <div class="font-upload-header">
                <h4>Custom Fonts</h4>
                <button type="button" class="font-upload-btn" title="Upload Custom Font">
                    <span class="upload-icon">📁</span>
                    Upload Font
                </button>
            </div>
            <div class="font-upload-dropzone" style="display: none;">
                <div class="dropzone-content">
                    <div class="dropzone-icon">📁</div>
                    <p>Drop font files here or click to browse</p>
                    <p class="dropzone-hint">Supports WOFF, WOFF2, TTF, OTF (max 5MB)</p>
                    <input type="file" class="font-file-input" accept=".woff,.woff2,.ttf,.otf" multiple>
                </div>
            </div>
            <div class="font-upload-progress" style="display: none;">
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-text">Uploading...</div>
            </div>
            <div class="font-upload-error" style="display: none;">
                <div class="error-icon">⚠️</div>
                <div class="error-message"></div>
            </div>
        `;

        this.uploadContainer = uploadSection;
        this.setupUploadEventListeners();
        this.updateFontList();

        container.appendChild(uploadSection);
        return uploadSection;
    }

    /**
     * Create font list UI
     * @param {HTMLElement} container - Container element
     * @returns {HTMLElement} Created UI element
     */
    createFontListUI(container) {
        const fontListSection = document.createElement('div');
        fontListSection.className = 'font-list-section';
        fontListSection.innerHTML = `
            <div class="font-list-header">
                <h4>Uploaded Fonts</h4>
            </div>
            <div class="font-list-content">
                <!-- Font list will be populated here -->
            </div>
        `;

        this.fontListContainer = fontListSection.querySelector('.font-list-content');
        this.updateFontList();

        container.appendChild(fontListSection);
        return fontListSection;
    }

    /**
     * Setup event listeners for upload functionality
     */
    setupUploadEventListeners() {
        const uploadBtn = this.uploadContainer.querySelector('.font-upload-btn');
        const dropzone = this.uploadContainer.querySelector('.font-upload-dropzone');
        const fileInput = this.uploadContainer.querySelector('.font-file-input');

        // Upload button click
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });

        // Drag and drop functionality
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });

        dropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            this.handleFileSelection(e.dataTransfer.files);
        });

        // Click to browse
        dropzone.addEventListener('click', () => {
            fileInput.click();
        });
    }

    /**
     * Handle file selection
     * @param {FileList} files - Selected files
     */
    async handleFileSelection(files) {
        if (!files || files.length === 0) return;

        const fileArray = Array.from(files);
        const validFiles = [];

        // Validate files
        for (const file of fileArray) {
            const validation = this.fontManager.validateFontFile(file);
            if (validation.valid) {
                validFiles.push(file);
            } else {
                this.showError(validation.errors.join(', '));
            }
        }

        if (validFiles.length === 0) return;

        // Show dropzone and start upload
        this.showDropzone(false);
        this.showProgress(true);

        try {
            // Upload files one by one and track the last uploaded font
            let lastUploadedFont = null;
            for (const file of validFiles) {
                lastUploadedFont = await this.fontManager.uploadFont(file);
            }

            this.showProgress(false);
            this.updateFontList();
            this.notifyFontsChanged(lastUploadedFont); // Pass the last uploaded font
            this.showSuccess(`${validFiles.length} font(s) uploaded successfully!`);

        } catch (error) {
            this.showProgress(false);
            this.showError(error.message);
        }
    }

    /**
     * Show/hide dropzone
     * @param {boolean} show - Whether to show dropzone
     */
    showDropzone(show) {
        const dropzone = this.uploadContainer.querySelector('.font-upload-dropzone');
        dropzone.style.display = show ? 'block' : 'none';
    }

    /**
     * Show/hide progress indicator
     * @param {boolean} show - Whether to show progress
     */
    showProgress(show) {
        const progress = this.uploadContainer.querySelector('.font-upload-progress');
        progress.style.display = show ? 'block' : 'none';
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        const errorDiv = this.uploadContainer.querySelector('.font-upload-error');
        const errorMessage = errorDiv.querySelector('.error-message');
        
        errorMessage.textContent = message;
        errorDiv.style.display = 'block';

        // Hide error after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        // Create temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'font-upload-success';
        successDiv.innerHTML = `
            <div class="success-icon">✅</div>
            <div class="success-message">${message}</div>
        `;
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        document.body.appendChild(successDiv);

        // Remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    /**
     * Update font list display
     */
    updateFontList() {
        if (!this.fontListContainer) return;

        const customFonts = this.fontManager.getCustomFonts();
        
        if (customFonts.length === 0) {
            this.fontListContainer.innerHTML = `
                <div class="no-fonts-message">
                    <p>No custom fonts uploaded yet.</p>
                    <p class="hint">Upload font files to use them in your designs.</p>
                </div>
            `;
            return;
        }

        this.fontListContainer.innerHTML = customFonts.map(font => `
            <div class="font-item" data-font-name="${font.name}">
                <div class="font-info">
                    <div class="font-name">
                        ${font.name}
                        ${font.cdnUrl ? '<span class="cloud-badge" title="Stored in Media Manager">☁️</span>' : ''}
                    </div>
                    <div class="font-details">
                        <span class="font-file">${font.fileName}</span>
                        <span class="font-size">${this.fontManager.formatFileSize(font.size)}</span>
                    </div>
                </div>
                <div class="font-actions">
                    <button type="button" class="font-preview-btn" title="Preview Font">
                        <span class="preview-icon">👁️</span>
                    </button>
                    <button type="button" class="font-remove-btn" title="Remove Font">
                        <span class="remove-icon">🗑️</span>
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners to font items
        this.fontListContainer.querySelectorAll('.font-preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fontItem = e.target.closest('.font-item');
                const fontName = fontItem.dataset.fontName;
                this.previewFont(fontName);
            });
        });

        this.fontListContainer.querySelectorAll('.font-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fontItem = e.target.closest('.font-item');
                const fontName = fontItem.dataset.fontName;
                this.removeFont(fontName);
            });
        });
    }

    /**
     * Preview font in a modal
     * @param {string} fontName - Font name
     */
    previewFont(fontName) {
        const font = this.fontManager.getCustomFont(fontName);
        if (!font) return;

        // Create preview modal
        const modal = document.createElement('div');
        modal.className = 'font-preview-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Font Preview: ${fontName}</h3>
                        <button type="button" class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="font-preview-text" style="font-family: ${font.family};">
                            <div class="preview-sample" style="font-size: 48px; margin-bottom: 20px;">
                                The quick brown fox jumps over the lazy dog
                            </div>
                            <div class="preview-sample" style="font-size: 36px; margin-bottom: 20px;">
                                ABCDEFGHIJKLMNOPQRSTUVWXYZ
                            </div>
                            <div class="preview-sample" style="font-size: 36px; margin-bottom: 20px;">
                                abcdefghijklmnopqrstuvwxyz
                            </div>
                            <div class="preview-sample" style="font-size: 36px; margin-bottom: 20px;">
                                0123456789 !@#$%^&*()
                            </div>
                        </div>
                        <div class="font-info">
                            <p><strong>File:</strong> ${font.fileName}</p>
                            <p><strong>Size:</strong> ${this.fontManager.formatFileSize(font.size)}</p>
                            <p><strong>Uploaded:</strong> ${new Date(font.uploadedAt).toLocaleDateString()}</p>
                            <p><strong>Storage:</strong> ${font.cdnUrl ? '☁️ Media Manager (CDN)' : '💾 Local Only'}</p>
                        </div>
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
            background: white;
            border-radius: 8px;
            max-width: 600px;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;

        const header = modal.querySelector('.modal-header');
        header.style.cssText = `
            padding: 20px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
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
        `;

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
     * Remove font
     * @param {string} fontName - Font name
     */
    removeFont(fontName) {
        if (confirm(`Are you sure you want to remove "${fontName}"? This action cannot be undone.`)) {
            const success = this.fontManager.removeCustomFont(fontName);
            if (success) {
                this.updateFontList();
                this.notifyFontsChanged();
                this.showSuccess(`Font "${fontName}" removed successfully.`);
            } else {
                this.showError(`Failed to remove font "${fontName}".`);
            }
        }
    }

    /**
     * Notify that fonts have changed
     * @param {Object} uploadedFont - The newly uploaded font data (optional)
     */
    notifyFontsChanged(uploadedFont = null) {
        if (this.onFontsChanged) {
            this.onFontsChanged(uploadedFont);
        }
    }

    /**
     * Refresh the font list
     */
    refresh() {
        this.updateFontList();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FontUploadComponent;
}
