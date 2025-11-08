/**
 * Media Picker Modal Component
 *
 * Displays a modal dialog for browsing and selecting files from Wix Media Manager.
 * Features:
 * - Grid view with thumbnails
 * - Upload new files to Media Manager
 * - Choice between Media Manager (CDN) or Local only storage
 * - Promise-based API
 */

class MediaPickerModal {
    constructor(wixAPI) {
        this.wixAPI = wixAPI;
        this.files = [];
        this.selectedFile = null;
        this.resolve = null;
        this.reject = null;

        // API endpoints - auto-detect environment
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        // Use separate backend API server on port 3001 for local dev
        if (isLocalhost) {
            this.apiBase = 'http://localhost:3001/api';
        } else {
            // Production - use relative API
            this.apiBase = '/api';
        }

        console.log('🔧 MediaPickerModal API base:', this.apiBase);
        console.log('   → Current location:', window.location.href);
    }

    /**
     * Fetch files from backend API
     */
    async fetchFiles() {
        try {
            console.log('📡 Fetching media files from backend...');
            const response = await fetch(`${this.apiBase}/media/list`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `API error: ${response.status}`);
            }

            const data = await response.json();
            console.log(`✅ Loaded ${data.count} media files from backend`);

            this.files = data.files || [];
            return this.files;

        } catch (error) {
            console.error('❌ Failed to fetch media:', error);
            throw error;
        }
    }

    /**
     * Upload file to Media Manager or use locally
     * @param {File} file - File to upload
     * @param {boolean} uploadToMediaManager - True to upload, false for local only
     */
    async uploadFile(file, uploadToMediaManager = true) {
        if (!uploadToMediaManager) {
            // Local mode - create object URL for temporary use
            console.log('📁 Using local file (not uploaded to Media Manager)');
            const objectUrl = URL.createObjectURL(file);

            return {
                fileUrl: objectUrl,
                fileName: file.name,
                mimeType: file.type,
                isLocal: true  // Marker for local-only files
            };
        }

        try {
            // Show upload loader
            this.showUploadLoader(file.name);

            console.log('📤 Uploading to Media Manager via backend...');
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.apiBase}/media/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `Upload failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Upload successful:', data.file.fileUrl);

            return data.file;

        } catch (error) {
            console.error('❌ Upload failed:', error);
            throw error;
        } finally {
            // Hide upload loader
            this.hideUploadLoader();
        }
    }

    /**
     * Show the media picker modal
     * @returns {Promise<Object>} - Resolves with selected file or rejects if cancelled
     */
    async show() {
        try {
            // Fetch files from backend
            await this.fetchFiles();

            // Create and display modal
            const modal = this.createModalHTML();
            document.body.appendChild(modal);

            // Setup event listeners
            this.setupEventListeners(modal);

            // Return promise that resolves with selected file
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });

        } catch (error) {
            console.error('❌ Failed to show media picker:', error);
            alert(`Failed to load media: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create modal HTML structure
     * @returns {HTMLElement} - Modal container element
     */
    createModalHTML() {
        const modal = document.createElement('div');
        modal.className = 'media-picker-modal';
        modal.innerHTML = `
            <div class="media-picker-overlay"></div>
            <div class="media-picker-content">
                <div class="media-picker-header">
                    <h2>📁 Browse Media Manager</h2>
                    <button class="media-picker-upload-btn">➕ Upload New</button>
                    <button class="media-picker-close">&times;</button>
                </div>

                <div class="media-picker-body">
                    ${this.files.length === 0 ? this.createEmptyState() : this.renderFileGrid()}
                </div>

                <div class="media-picker-footer">
                    <button class="media-picker-cancel">Cancel</button>
                </div>
            </div>

            <!-- Hidden file input -->
            <input type="file" class="media-picker-file-input" accept="image/*,video/*,.json,.lottie,application/json" style="display: none;">
        `;
        return modal;
    }

    /**
     * Create empty state HTML
     */
    createEmptyState() {
        return `
            <div class="media-picker-empty">
                <p>📁 No media files yet</p>
                <button class="media-picker-upload-btn-large">Upload Your First File</button>
            </div>
        `;
    }

    /**
     * Render file grid HTML
     * @returns {string} - Grid HTML
     */
    renderFileGrid() {
        return `
            <div class="media-picker-grid">
                ${this.files.map(file => this.renderFileItem(file)).join('')}
            </div>
        `;
    }

    /**
     * Render individual file item
     */
    renderFileItem(file) {
        const isVideo = file.mimeType?.startsWith('video/');
        const isLottie = file.mimeType === 'application/json' ||
                         file.fileName?.endsWith('.json') ||
                         file.fileName?.endsWith('.lottie');
        const thumbnailUrl = file.fileUrl;
        const sizeKB = (file.sizeInBytes / 1024).toFixed(1);

        let mediaContent;
        if (isLottie) {
            mediaContent = `
                <div class="media-picker-lottie-container" data-lottie-url="${thumbnailUrl}">
                    <div class="lottie-icon">🎬</div>
                    <div class="lottie-label">Lottie</div>
                </div>`;
        } else if (isVideo) {
            mediaContent = `<video src="${thumbnailUrl}" class="media-picker-thumbnail"></video>`;
        } else {
            mediaContent = `<img src="${thumbnailUrl}" alt="${file.displayName}" class="media-picker-thumbnail" crossorigin="anonymous">`;
        }

        return `
            <div class="media-picker-item" data-file-id="${file.id}">
                ${mediaContent}
                <div class="media-picker-item-info">
                    <div class="media-picker-item-name">${file.displayName || file.fileName}</div>
                    <div class="media-picker-item-size">${sizeKB} KB</div>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners(modal) {
        // Close button
        modal.querySelector('.media-picker-close').addEventListener('click', () => {
            this.close();
            this.reject(new Error('User cancelled'));
        });

        // Cancel button
        modal.querySelector('.media-picker-cancel').addEventListener('click', () => {
            this.close();
            this.reject(new Error('User cancelled'));
        });

        // Overlay click
        modal.querySelector('.media-picker-overlay').addEventListener('click', () => {
            this.close();
            this.reject(new Error('User cancelled'));
        });

        // File selection
        modal.querySelectorAll('.media-picker-item').forEach(item => {
            item.addEventListener('click', () => {
                const fileId = item.dataset.fileId;
                const selectedFile = this.files.find(f => f.id === fileId);
                if (selectedFile) {
                    console.log('✅ File selected:', selectedFile.fileName);
                    this.close();
                    this.resolve(selectedFile);
                }
            });
        });

        // Upload button clicks
        const uploadButtons = modal.querySelectorAll('.media-picker-upload-btn, .media-picker-upload-btn-large');
        uploadButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleUploadClick(modal));
        });

        // File input change
        const fileInput = modal.querySelector('.media-picker-file-input');
        fileInput.addEventListener('change', (e) => this.handleFileSelected(e, modal));
    }

    /**
     * Handle upload button click
     */
    handleUploadClick(modal) {
        const fileInput = modal.querySelector('.media-picker-file-input');
        fileInput.click();
    }

    /**
     * Handle file selected from input
     */
    async handleFileSelected(event, modal) {
        const file = event.target.files[0];
        if (!file) return;

        // Reset file input
        event.target.value = '';

        // Show upload mode choice dialog
        const uploadToMediaManager = await this.showUploadModeDialog(file);

        if (uploadToMediaManager === null) {
            // User cancelled
            return;
        }

        try {
            const uploadedFile = await this.uploadFile(file, uploadToMediaManager);

            // If uploaded to Media Manager, refresh the grid
            if (!uploadedFile.isLocal) {
                await this.fetchFiles();
                this.refreshGrid(modal);
            }

            // Auto-select the uploaded file
            this.close();
            this.resolve(uploadedFile);

        } catch (error) {
            alert(`Upload failed: ${error.message}`);
        }
    }

    /**
     * Show upload mode dialog (Media Manager vs Local)
     */
    async showUploadModeDialog(file) {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'upload-mode-dialog';
            dialog.innerHTML = `
                <div class="upload-mode-overlay"></div>
                <div class="upload-mode-content">
                    <h3>Upload: ${file.name}</h3>
                    <p>Where should this file be saved?</p>

                    <label class="upload-mode-option">
                        <input type="radio" name="uploadMode" value="mediaManager" checked>
                        <div>
                            <strong>📦 Media Manager (recommended)</strong>
                            <ul>
                                <li>Permanent CDN URL</li>
                                <li>Loads in any preset</li>
                                <li>Tiny preset size (~80 bytes)</li>
                            </ul>
                        </div>
                    </label>

                    <label class="upload-mode-option">
                        <input type="radio" name="uploadMode" value="local">
                        <div>
                            <strong>💾 Local only (temporary)</strong>
                            <ul>
                                <li>Not uploaded to cloud</li>
                                <li>Only works in this session</li>
                                <li>Won't load in saved presets</li>
                            </ul>
                        </div>
                    </label>

                    <div class="upload-mode-actions">
                        <button class="upload-mode-cancel">Cancel</button>
                        <button class="upload-mode-upload">Upload</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            dialog.querySelector('.upload-mode-cancel').addEventListener('click', () => {
                dialog.remove();
                resolve(null);
            });

            dialog.querySelector('.upload-mode-overlay').addEventListener('click', () => {
                dialog.remove();
                resolve(null);
            });

            dialog.querySelector('.upload-mode-upload').addEventListener('click', () => {
                const selected = dialog.querySelector('input[name="uploadMode"]:checked').value;
                dialog.remove();
                resolve(selected === 'mediaManager');
            });
        });
    }

    /**
     * Refresh file grid
     */
    refreshGrid(modal) {
        const body = modal.querySelector('.media-picker-body');
        body.innerHTML = this.files.length === 0 ? this.createEmptyState() : this.renderFileGrid();

        // Re-attach event listeners for new items
        modal.querySelectorAll('.media-picker-item').forEach(item => {
            item.addEventListener('click', () => {
                const fileId = item.dataset.fileId;
                const selectedFile = this.files.find(f => f.id === fileId);
                if (selectedFile) {
                    console.log('✅ File selected:', selectedFile.fileName);
                    this.close();
                    this.resolve(selectedFile);
                }
            });
        });

        // Re-attach upload button listeners
        const uploadButtons = modal.querySelectorAll('.media-picker-upload-btn, .media-picker-upload-btn-large');
        uploadButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleUploadClick(modal));
        });
    }

    /**
     * Show upload loader
     */
    showUploadLoader(fileName) {
        // Remove existing loader if any
        this.hideUploadLoader();

        const loader = document.createElement('div');
        loader.className = 'upload-loader-overlay';
        loader.innerHTML = `
            <div class="upload-loader-content">
                <div class="upload-spinner"></div>
                <div class="upload-loader-text">Uploading to Media Manager...</div>
                <div class="upload-loader-subtext">${fileName}</div>
            </div>
        `;
        document.body.appendChild(loader);
    }

    /**
     * Hide upload loader
     */
    hideUploadLoader() {
        const loader = document.querySelector('.upload-loader-overlay');
        if (loader) {
            loader.remove();
        }
    }

    /**
     * Close modal
     */
    close() {
        const modal = document.querySelector('.media-picker-modal');
        if (modal) {
            modal.remove();
        }
        // Also hide loader if still showing
        this.hideUploadLoader();
    }
}
