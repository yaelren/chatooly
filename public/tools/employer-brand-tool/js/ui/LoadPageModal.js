/**
 * LoadPageModal - Modal for loading saved pages from presets
 *
 * Workflow:
 * 1. Show modal with list of all presets
 * 2. Designer selects a preset
 * 3. Show available pages (1-5) with names
 * 4. Designer clicks page to load
 * 5. Canvas updates with page content
 */

class LoadPageModal {
    constructor(app) {
        this.app = app;
        this.presetPageManager = app.presetPageManager;

        this.modal = null;
        this.isVisible = false;
        this.selectedPresetId = null;
        this.availablePages = [];

        this.createModal();
    }

    /**
     * Create modal HTML structure
     */
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'load-page-modal-overlay';
        this.modal.style.display = 'none';
        this.modal.innerHTML = `
            <div class="load-page-modal">
                <div class="load-page-modal-header">
                    <h2>Load Page from Preset</h2>
                    <button class="load-page-modal-close">&times;</button>
                </div>

                <div class="load-page-modal-body">
                    <!-- Preset Selection -->
                    <div class="load-page-preset-selection">
                        <h3>Select Preset</h3>
                        <select id="load-page-preset-select" class="load-page-preset-dropdown">
                            <option value="">-- Select a Preset --</option>
                        </select>
                        <p class="preset-info" id="preset-info-text"></p>
                    </div>

                    <!-- Page Selection Grid -->
                    <div class="load-page-pages-section" id="load-page-pages-section" style="display: none;">
                        <h3>Available Pages</h3>
                        <p class="pages-hint">Click a page to load it into the canvas</p>
                        <div class="load-page-pages-grid" id="load-page-pages-grid">
                            <!-- Page cards will be rendered here -->
                        </div>
                    </div>

                    <!-- Empty State -->
                    <div class="load-page-empty-state" id="load-page-empty-state">
                        <p>No presets found. Create a preset by clicking "Save Page to Preset" first.</p>
                    </div>
                </div>

                <div class="load-page-modal-footer">
                    <button class="load-page-modal-cancel">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close buttons
        this.modal.querySelector('.load-page-modal-close').addEventListener('click', () => this.hide());
        this.modal.querySelector('.load-page-modal-cancel').addEventListener('click', () => this.hide());

        // Preset selection
        this.modal.querySelector('#load-page-preset-select').addEventListener('change', (e) => {
            this.handlePresetSelection(e.target.value);
        });

        // Close on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
    }

    /**
     * Show modal
     */
    async show() {
        // Load available presets
        await this.loadPresets();

        // Show modal
        this.modal.style.display = 'flex';
        this.isVisible = true;
    }

    /**
     * Hide modal
     */
    hide() {
        this.modal.style.display = 'none';
        this.isVisible = false;
        this.selectedPresetId = null;
        this.availablePages = [];

        // Reset UI state - hide pages section and clear selection
        this.modal.querySelector('#load-page-pages-section').style.display = 'none';
        this.modal.querySelector('#preset-info-text').textContent = '';
        const dropdown = this.modal.querySelector('#load-page-preset-select');
        if (dropdown) {
            dropdown.value = '';
        }
    }

    /**
     * Load presets into dropdown
     */
    async loadPresets() {
        const presets = await this.presetPageManager.getAllPresets();
        const dropdown = this.modal.querySelector('#load-page-preset-select');
        const emptyState = this.modal.querySelector('#load-page-empty-state');

        // Clear existing options
        dropdown.innerHTML = '<option value="">-- Select a Preset --</option>';

        if (presets.length === 0) {
            emptyState.style.display = 'block';
            dropdown.disabled = true;
            return;
        }

        emptyState.style.display = 'none';
        dropdown.disabled = false;

        // Add presets to dropdown
        presets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.presetId;
            option.textContent = `${preset.presetName} (${preset.pageCount} ${preset.pageCount === 1 ? 'page' : 'pages'})`;
            dropdown.appendChild(option);
        });
    }

    /**
     * Handle preset selection
     */
    async handlePresetSelection(presetId) {
        if (!presetId) {
            // Hide pages section
            this.modal.querySelector('#load-page-pages-section').style.display = 'none';
            this.modal.querySelector('#preset-info-text').textContent = '';
            return;
        }

        this.selectedPresetId = presetId;

        // Get preset details
        const presets = await this.presetPageManager.getAllPresets();
        const preset = presets.find(p => p.presetId === presetId);

        if (!preset) {
            console.error('Preset not found:', presetId);
            return;
        }

        // Update info text
        const infoText = this.modal.querySelector('#preset-info-text');
        infoText.textContent = `${preset.pages.length} ${preset.pages.length === 1 ? 'page' : 'pages'} available`;

        // Show pages section
        this.availablePages = preset.pages;
        this.renderPages();
        this.modal.querySelector('#load-page-pages-section').style.display = 'block';
    }

    /**
     * Render available pages as cards
     */
    renderPages() {
        const pagesGrid = this.modal.querySelector('#load-page-pages-grid');
        pagesGrid.innerHTML = '';

        if (this.availablePages.length === 0) {
            pagesGrid.innerHTML = '<p class="no-pages-message">No pages found in this preset.</p>';
            return;
        }

        // Create page card for each available page
        this.availablePages.forEach(page => {
            const pageCard = this.createPageCard(page);
            pagesGrid.appendChild(pageCard);
        });
    }

    /**
     * Create page card element
     */
    createPageCard(page) {
        const card = document.createElement('div');
        card.className = 'load-page-card';
        card.dataset.pageNumber = page.pageNumber;

        card.innerHTML = `
            <div class="page-card-header">
                <span class="page-number">Page ${page.pageNumber}</span>
            </div>
            <div class="page-card-body">
                <h4 class="page-name">${page.pageName || 'Untitled Page'}</h4>
                <p class="page-preview">Click to load</p>
            </div>
        `;

        // Add click handler
        card.addEventListener('click', () => {
            this.handlePageLoad(page.pageNumber);
        });

        return card;
    }

    /**
     * Handle page load
     */
    async handlePageLoad(pageNumber) {
        if (!this.selectedPresetId) {
            console.error('No preset selected');
            return;
        }

        try {
            console.log(`Loading page ${pageNumber} from preset ${this.selectedPresetId}`);

            // Load page using PresetPageManager
            await this.presetPageManager.loadPage(this.selectedPresetId, pageNumber);

            // Show success message
            alert(`✅ Page ${pageNumber} loaded successfully`);

            // Hide modal
            this.hide();

        } catch (error) {
            console.error('Error loading page:', error);
            alert(`❌ Error loading page: ${error.message}`);
        }
    }
}
