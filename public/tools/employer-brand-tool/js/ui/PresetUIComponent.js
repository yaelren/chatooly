/**
 * PresetUIComponent.js - Cloud-only preset UI controls
 * Handles user interactions for saving, loading, and managing presets in Wix cloud
 */

class PresetUIComponent {
    constructor(app) {
        this.app = app;
        this.presetManager = null; // Will be set when PresetManager is initialized
        this.currentPresetId = null; // Track currently selected preset
    }

    /**
     * Initialize the preset UI component
     * @param {PresetManager} presetManager - PresetManager instance
     */
    initialize(presetManager) {
        this.presetManager = presetManager;
        this.setupEventListeners();
    }

    /**
     * Render the preset controls in the specified container
     * @param {HTMLElement} container - Container to render controls in
     */
    render(container) {
        if (!container) {
            console.error('PresetUIComponent: No container provided');
            return;
        }

        container.innerHTML = `
            <div class="preset-controls preset-cloud-controls">
                <!-- Save Section -->
                <div class="preset-section preset-save-section">
                    <h3>Save New Preset</h3>
                    <p class="preset-description">Save your current design locally or to the cloud</p>
                    <div class="preset-save-controls">
                        <input
                            type="text"
                            id="presetNameInput"
                            class="preset-name-input"
                            placeholder="Enter preset name..."
                            maxlength="50">
                        <div class="preset-save-buttons">
                            <button type="button" class="preset-save-local-btn">
                                Save Locally
                            </button>
                            <button type="button" class="preset-save-cloud-btn">
                                Save to Cloud
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Load Local File Section -->
                <div class="preset-section preset-load-local-section">
                    <h3>Load Local Preset</h3>
                    <p class="preset-description">Upload a preset file from your computer</p>
                    <div class="preset-load-file-controls">
                        <input
                            type="file"
                            id="presetFileInput"
                            accept=".json"
                            style="display: none;">
                        <button type="button" class="preset-load-file-btn">
                            Choose File
                        </button>
                        <span id="selectedFileName" class="selected-file-name"></span>
                    </div>
                </div>

                <!-- Load Section -->
                <div class="preset-section preset-load-section">
                    <h3>Load Preset</h3>
                    <p class="preset-description">Select a preset from your cloud library</p>
                    <div class="preset-load-controls">
                        <select id="presetDropdown" class="preset-dropdown">
                            <option value="">-- Select Preset --</option>
                        </select>
                        <div class="preset-action-buttons">
                            <button type="button" class="preset-load-cloud-btn">
                                Load
                            </button>
                            <button type="button" class="preset-delete-btn">
                                Delete
                            </button>
                            <button type="button" class="preset-refresh-btn">
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();

        // Populate dropdown on render
        this.populatePresetDropdown();
    }

    /**
     * Setup event listeners for preset controls
     */
    setupEventListeners() {
        // Save locally button
        const saveLocalBtn = document.querySelector('.preset-save-local-btn');
        if (saveLocalBtn) {
            saveLocalBtn.addEventListener('click', () => this.handleSaveLocally());
        }

        // Save to cloud button
        const saveCloudBtn = document.querySelector('.preset-save-cloud-btn');
        if (saveCloudBtn) {
            saveCloudBtn.addEventListener('click', () => this.handleSaveToCloud());
        }

        // Enter key on name input = save to cloud (default)
        const nameInput = document.getElementById('presetNameInput');
        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleSaveToCloud();
                }
            });
        }

        // Load local file button
        const loadFileBtn = document.querySelector('.preset-load-file-btn');
        const fileInput = document.getElementById('presetFileInput');
        if (loadFileBtn && fileInput) {
            loadFileBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleLoadFromFile(e));
        }

        // Load from cloud button
        const loadBtn = document.querySelector('.preset-load-cloud-btn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => this.handleLoadFromCloud());
        }

        // Delete preset button
        const deleteBtn = document.querySelector('.preset-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.handleDeletePreset());
        }

        // Refresh dropdown button
        const refreshBtn = document.querySelector('.preset-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.populatePresetDropdown());
        }

        // Dropdown selection change
        const dropdown = document.getElementById('presetDropdown');
        if (dropdown) {
            dropdown.addEventListener('change', (e) => {
                this.currentPresetId = e.target.value;
            });
        }
    }

    /**
     * Populate preset dropdown from Wix cloud
     */
    async populatePresetDropdown() {
        if (!this.presetManager) {
            console.error('PresetManager not initialized');
            return;
        }

        const dropdown = document.getElementById('presetDropdown');
        if (!dropdown) return;

        try {
            console.log('🔄 Fetching presets from cloud...');

            // Fetch presets from Wix
            const presets = await this.presetManager.listCloudPresets();

            // Clear dropdown
            dropdown.innerHTML = '<option value="">-- Select Preset --</option>';

            // Add presets to dropdown
            if (presets.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = '(No presets saved yet)';
                option.disabled = true;
                dropdown.appendChild(option);
                console.log('ℹ️ No presets found in cloud');
            } else {
                presets.forEach(preset => {
                    const option = document.createElement('option');
                    option.value = preset._id;
                    option.textContent = preset.name || 'Unnamed Preset';
                    dropdown.appendChild(option);
                });
                console.log(`✅ Loaded ${presets.length} presets into dropdown`);
            }

        } catch (error) {
            console.error('❌ Failed to populate dropdown:', error);
            dropdown.innerHTML = '<option value="">-- Error loading presets --</option>';
            this.showError('Failed to load presets from cloud');
        }
    }

    /**
     * Handle save to cloud button click
     */
    async handleSaveToCloud() {
        if (!this.presetManager) {
            this.showError('Preset system not initialized');
            return;
        }

        const nameInput = document.getElementById('presetNameInput');
        const presetName = nameInput?.value.trim();

        if (!presetName) {
            this.showError('Please enter a preset name');
            nameInput?.focus();
            return;
        }

        // Check for video warnings (background or cell videos)
        const hasBgVideo = this.hasBackgroundVideo();
        const hasCellVideos = this.hasCellVideos();

        if (hasBgVideo || hasCellVideos) {
            let message = '⚠️ Local Video Content Detected\n\n';

            if (hasBgVideo && hasCellVideos) {
                message += 'Local background and cell videos cannot be saved in presets.\n';
            } else if (hasBgVideo) {
                message += 'Local background video cannot be saved in presets.\n';
            } else {
                message += 'Local cell videos cannot be saved in presets.\n';
            }

            message += 'The preset will be saved without the local videos.\n\n';
            message += 'Note: Videos uploaded through Media Manager ARE saved correctly.\n';
            message += 'Only locally-loaded videos are excluded.\n\n';
            message += 'Continue?';

            const proceed = confirm(message);
            if (!proceed) return;
        }

        try {
            this.showLoading('Saving to cloud...');

            // Save to cloud (uploads assets automatically)
            await this.presetManager.saveToCloud(presetName);

            // Clear input
            nameInput.value = '';

            // Refresh dropdown
            await this.populatePresetDropdown();

            this.showSuccess(`✅ Preset "${presetName}" saved to cloud!`);

        } catch (error) {
            console.error('❌ Save to cloud failed:', error);
            this.showError(`Failed to save preset: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Handle load from cloud button click
     */
    async handleLoadFromCloud() {
        if (!this.presetManager) {
            this.showError('Preset system not initialized');
            return;
        }

        if (!this.currentPresetId) {
            this.showError('Please select a preset to load');
            return;
        }

        try {
            this.showLoading('Loading from cloud...');

            // Load preset from Wix
            const preset = await this.presetManager.loadFromCloud(this.currentPresetId);

            this.showSuccess(`✅ Preset "${preset.name}" loaded successfully!`);

        } catch (error) {
            console.error('❌ Load from cloud failed:', error);
            this.showError(`Failed to load preset: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Handle delete preset button click
     */
    async handleDeletePreset() {
        if (!this.presetManager) {
            this.showError('Preset system not initialized');
            return;
        }

        if (!this.currentPresetId) {
            this.showError('Please select a preset to delete');
            return;
        }

        // Get preset name for confirmation
        const dropdown = document.getElementById('presetDropdown');
        const selectedOption = dropdown?.options[dropdown.selectedIndex];
        const presetName = selectedOption?.textContent || 'this preset';

        // Confirm deletion
        const confirmed = confirm(
            `🗑️ Delete Preset?\n\n` +
            `Are you sure you want to delete "${presetName}"?\n\n` +
            `This action cannot be undone.`
        );

        if (!confirmed) return;

        try {
            this.showLoading('Deleting preset...');

            // Delete from Wix
            await this.presetManager.deleteFromCloud(this.currentPresetId);

            // Clear selection
            this.currentPresetId = null;

            // Refresh dropdown
            await this.populatePresetDropdown();

            this.showSuccess(`✅ Preset "${presetName}" deleted from cloud`);

        } catch (error) {
            console.error('❌ Delete from cloud failed:', error);
            this.showError(`Failed to delete preset: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Handle save locally button click (downloads JSON file)
     */
    async handleSaveLocally() {
        if (!this.presetManager) {
            this.showError('Preset system not initialized');
            return;
        }

        const nameInput = document.getElementById('presetNameInput');
        const presetName = nameInput?.value.trim();

        if (!presetName) {
            this.showError('Please enter a preset name');
            return;
        }

        try {
            this.showLoading('Saving locally...');

            // Serialize state (without uploading images to cloud)
            const state = this.presetManager.serializeState(presetName);

            // Create JSON blob
            const jsonString = JSON.stringify(state, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });

            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${presetName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;

            // Trigger download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Clear input
            nameInput.value = '';

            this.showSuccess(`✅ Preset "${presetName}" downloaded to your computer!`);

        } catch (error) {
            console.error('❌ Local save failed:', error);
            this.showError(`Failed to save locally: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Handle load from file (uploaded JSON)
     */
    async handleLoadFromFile(event) {
        if (!this.presetManager) {
            this.showError('Preset system not initialized');
            return;
        }

        const file = event.target.files[0];
        if (!file) return;

        try {
            this.showLoading(`Loading ${file.name}...`);

            // Show selected file name
            const fileNameSpan = document.getElementById('selectedFileName');
            if (fileNameSpan) {
                fileNameSpan.textContent = file.name;
            }

            // Read file
            const text = await file.text();
            const stateData = JSON.parse(text);

            // Deserialize state
            await this.presetManager.deserializeState(stateData);

            this.showSuccess(`✅ Preset "${stateData.presetName || file.name}" loaded successfully!`);

        } catch (error) {
            console.error('❌ Load from file failed:', error);
            this.showError(`Failed to load file: ${error.message}`);
        } finally {
            this.hideLoading();
            // Clear file input
            event.target.value = '';
        }
    }

    /**
     * Check if there's a background video
     * @returns {boolean} True if background video exists
     */
    hasBackgroundVideo() {
        return this.app.canvasManager.backgroundManager.backgroundVideo !== null;
    }

    /**
     * Check if there are any cell videos that are NOT from CDN
     * @returns {boolean} True if any cell has non-CDN video content
     */
    hasCellVideos() {
        if (!this.app.grid) return false;

        const allCells = this.app.grid.getAllCells();
        return allCells.some(cell => {
            if (cell && cell.type === 'content' && cell.content && cell.content.media instanceof HTMLVideoElement) {
                const videoSrc = cell.content.media.src;
                // Only warn about videos that are NOT from Wix CDN (those can be saved)
                // Wix uses both video.wixstatic.com and static.wixstatic.com
                return !videoSrc || !videoSrc.includes('.wixstatic.com/');
            }
            return false;
        });
    }

    /**
     * Show loading indicator
     * @param {string} message - Loading message
     */
    showLoading(message) {
        let loadingEl = document.getElementById('presetLoading');
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.id = 'presetLoading';
            loadingEl.className = 'preset-loading';
            loadingEl.innerHTML = `
                <div class="preset-loading-content">
                    <div class="preset-spinner"></div>
                    <span class="preset-loading-text">${message}</span>
                </div>
            `;
            document.body.appendChild(loadingEl);
        } else {
            loadingEl.querySelector('.preset-loading-text').textContent = message;
        }
        loadingEl.style.display = 'flex';
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        const loadingEl = document.getElementById('presetLoading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.showMessage(message, 'error');
    }

    /**
     * Show message (success or error)
     * @param {string} message - Message to show
     * @param {string} type - Message type ('success' or 'error')
     */
    showMessage(message, type) {
        // Remove existing message
        const existingMessage = document.getElementById('presetMessage');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageEl = document.createElement('div');
        messageEl.id = 'presetMessage';
        messageEl.className = `preset-message preset-message-${type}`;
        messageEl.innerHTML = `
            <div class="preset-message-content">
                <span class="preset-message-icon">${type === 'success' ? '✅' : '❌'}</span>
                <span class="preset-message-text">${message}</span>
                <button type="button" class="preset-message-close">&times;</button>
            </div>
        `;

        // Add close functionality
        const closeBtn = messageEl.querySelector('.preset-message-close');
        closeBtn.addEventListener('click', () => messageEl.remove());

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 5000);

        document.body.appendChild(messageEl);

        // Auto-scroll to message
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}
