/**
 * WixMultiPagePresetAdapter.js - Multi-Page Preset Storage with Wix CMS
 *
 * Implements the Multi-Page Presets v3 schema for Wix Data Collections.
 * Wraps WixPresetAPI to provide multi-page preset operations.
 *
 * Collection Schema: MultiPagePresets
 * - presetName: Text (Display name)
 * - description: Text (Optional description)
 * - page1-5: Rich Content (JSON stringified page data)
 *
 * Related: claudedocs/wix-cms-schema.md
 */

export class WixMultiPagePresetAdapter {
    constructor(wixAPI) {
        this.wixAPI = wixAPI;
        this.collectionName = 'MultiPagePresets';
        this.MAX_PAGES = 5;
    }

    /**
     * Initialize the adapter (delegates to WixPresetAPI)
     * @param {string} clientId - Wix OAuth Client ID
     * @param {string|null} apiKey - Optional Wix API Key
     * @param {string|null} siteId - Wix Site ID
     */
    async initialize(clientId, apiKey = null, siteId = null) {
        await this.wixAPI.initialize(clientId, apiKey, siteId);
        console.log('✅ WixMultiPagePresetAdapter initialized');
    }

    /**
     * Save complete multi-page preset to Wix CMS
     * @param {Object} preset - Preset object with presetName, description, page1-5
     * @returns {Promise<string>} - Preset ID
     */
    async savePreset(preset) {
        try {
            console.log(`💾 Saving multi-page preset: "${preset.presetName}"`);

            // Validate preset structure
            this.validatePreset(preset);

            // Ensure token is valid
            await this.wixAPI.ensureValidToken();

            // Build data item for Wix Data Collections v2 API
            const dataItem = {
                presetName: preset.presetName,
                description: preset.description || '',
                page1: preset.page1 || null,
                page2: preset.page2 || null,
                page3: preset.page3 || null,
                page4: preset.page4 || null,
                page5: preset.page5 || null
            };

            // Count pages
            const pageCount = [dataItem.page1, dataItem.page2, dataItem.page3, dataItem.page4, dataItem.page5]
                .filter(p => p !== null).length;

            console.log(`   → Pages: ${pageCount}`);

            // Insert into Wix Data Collections
            const response = await fetch(`${this.wixAPI.baseURL}/wix-data/v2/items`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.wixAPI.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dataCollectionId: this.collectionName,
                    dataItem: { data: dataItem }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Wix save failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            const presetId = result.dataItem.data._id;

            console.log(`✅ Multi-page preset saved`);
            console.log(`   → Preset ID: ${presetId}`);
            console.log(`   → Name: ${preset.presetName}`);
            console.log(`   → Pages: ${pageCount}`);

            return presetId;

        } catch (error) {
            console.error('❌ Failed to save multi-page preset:', error);
            throw new Error(`Failed to save preset: ${error.message}`);
        }
    }

    /**
     * Update existing multi-page preset
     * @param {string} presetId - Preset ID
     * @param {Object} updates - Fields to update (presetName, description, page1-5)
     * @returns {Promise<void>}
     */
    async updatePreset(presetId, updates) {
        try {
            console.log(`🔄 Updating preset: ${presetId}`);

            // Ensure token is valid
            await this.wixAPI.ensureValidToken();

            // Build fieldModifications array for PATCH request
            // Wix PATCH API requires fieldModifications structure, not dataItem.data
            const excludeFields = ['_id', '_owner', '_createdDate', '_updatedDate'];
            const fieldModifications = [];

            for (const key in updates) {
                if (!excludeFields.includes(key) && updates.hasOwnProperty(key)) {
                    // Only include fields with actual values (not null/undefined)
                    if (updates[key] !== null && updates[key] !== undefined) {
                        fieldModifications.push({
                            fieldPath: key,
                            action: 'SET_FIELD',
                            setFieldOptions: {
                                value: updates[key]
                            }
                        });

                        console.log(`🔧 Field modification: ${key} (${String(updates[key]).length} chars)`);
                    }
                }
            }

            console.log(`🔍 DEBUG: ${fieldModifications.length} field modifications prepared`);

            // Validate that we have at least one field to update
            if (fieldModifications.length === 0) {
                console.log(`ℹ️ No fields to update - skipping update for preset: ${presetId}`);
                return; // Success - nothing to update
            }

            // Use correct Wix PATCH API structure with fieldModifications
            const updateBody = {
                dataCollectionId: this.collectionName,
                patch: {
                    dataItemId: presetId,
                    fieldModifications: fieldModifications
                }
            };

            console.log('📤 Sending PATCH request with', fieldModifications.length, 'modifications');

            const response = await fetch(`${this.wixAPI.baseURL}/wix-data/v2/items/${presetId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.wixAPI.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Wix update failed: ${response.status} - ${errorText}`);
            }

            console.log(`✅ Preset updated: ${presetId}`);

        } catch (error) {
            console.error('❌ Failed to update preset:', error);
            throw new Error(`Failed to update preset: ${error.message}`);
        }
    }

    /**
     * Add page to existing preset
     * @param {string} presetId - Preset ID
     * @param {number} pageNumber - Page position (1-5)
     * @param {string} pageData - JSON stringified page data
     * @returns {Promise<void>}
     */
    async addPageToPreset(presetId, pageNumber, pageData) {
        try {
            console.log(`📄 Adding page ${pageNumber} to preset: ${presetId}`);

            this.validatePageNumber(pageNumber);

            const pageKey = `page${pageNumber}`;
            await this.updatePreset(presetId, { [pageKey]: pageData });

            console.log(`✅ Page ${pageNumber} added to preset`);

        } catch (error) {
            console.error('❌ Failed to add page to preset:', error);
            throw new Error(`Failed to add page: ${error.message}`);
        }
    }

    /**
     * Load complete multi-page preset from Wix CMS
     * @param {string} presetId - Preset ID
     * @returns {Promise<Object>} - Preset object with all pages
     */
    async loadPreset(presetId) {
        try {
            console.log(`📥 Loading multi-page preset: ${presetId}`);

            // Ensure token is valid
            await this.wixAPI.ensureValidToken();

            // Fetch from Wix Data Collections
            const response = await fetch(`${this.wixAPI.baseURL}/wix-data/v2/items/${presetId}?dataCollectionId=${this.collectionName}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.wixAPI.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Preset not found: ${presetId}`);
                }
                const errorText = await response.text();
                throw new Error(`Wix load failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            const data = result.dataItem.data;

            // Build preset object
            const preset = {
                _id: data._id,
                presetName: data.presetName,
                description: data.description || '',
                page1: data.page1 || null,
                page2: data.page2 || null,
                page3: data.page3 || null,
                page4: data.page4 || null,
                page5: data.page5 || null,
                _createdDate: data._createdDate,
                _updatedDate: data._updatedDate
            };

            const pageCount = [preset.page1, preset.page2, preset.page3, preset.page4, preset.page5]
                .filter(p => p !== null).length;

            console.log(`✅ Preset loaded: "${preset.presetName}"`);
            console.log(`   → Pages: ${pageCount}`);

            return preset;

        } catch (error) {
            console.error('❌ Failed to load preset:', error);
            throw new Error(`Failed to load preset: ${error.message}`);
        }
    }

    /**
     * Load specific page from preset
     * @param {string} presetId - Preset ID
     * @param {number} pageNumber - Page position (1-5)
     * @returns {Promise<Object>} - Parsed page data object
     */
    async loadPage(presetId, pageNumber) {
        try {
            console.log(`📄 Loading page ${pageNumber} from preset: ${presetId}`);

            this.validatePageNumber(pageNumber);

            const preset = await this.loadPreset(presetId);
            const pageKey = `page${pageNumber}`;
            const pageDataString = preset[pageKey];

            if (!pageDataString) {
                throw new Error(`Page ${pageNumber} does not exist in this preset`);
            }

            // Parse JSON string to object
            const pageData = JSON.parse(pageDataString);

            console.log(`✅ Page ${pageNumber} loaded`);
            console.log(`   → Page Name: ${pageData.pageName}`);
            console.log(`   → Content Slots: ${pageData.contentSlots?.length || 0}`);

            return pageData;

        } catch (error) {
            console.error('❌ Failed to load page:', error);
            throw new Error(`Failed to load page: ${error.message}`);
        }
    }

    /**
     * List all multi-page presets
     * @returns {Promise<Array>} - Array of preset summaries
     */
    async listPresets() {
        try {
            console.log('📋 Listing all multi-page presets...');

            // Ensure token is valid
            await this.wixAPI.ensureValidToken();

            // Query Wix Data Collections
            const response = await fetch(`${this.wixAPI.baseURL}/wix-data/v2/items/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.wixAPI.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dataCollectionId: this.collectionName,
                    query: {
                        sort: [{ fieldName: 'presetName', order: 'ASC' }]
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Wix query failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            const rawItems = result.dataItems || [];

            // Transform to summary format with page info
            const presets = rawItems.map(item => {
                const data = item.data;
                const pages = [];

                for (let i = 1; i <= this.MAX_PAGES; i++) {
                    const pageDataString = data[`page${i}`];
                    if (pageDataString) {
                        try {
                            const pageData = JSON.parse(pageDataString);
                            pages.push({
                                pageNumber: i,
                                pageName: pageData.pageName || `Page ${i}`
                            });
                        } catch (e) {
                            console.warn(`Failed to parse page ${i} for preset ${data._id}`);
                        }
                    }
                }

                return {
                    _id: data._id,
                    presetName: data.presetName,
                    description: data.description || '',
                    pageCount: pages.length,
                    pages: pages,
                    _createdDate: data._createdDate,
                    _updatedDate: data._updatedDate
                };
            });

            console.log(`✅ Found ${presets.length} multi-page presets`);

            return presets;

        } catch (error) {
            console.error('❌ Failed to list presets:', error);
            return [];
        }
    }

    /**
     * Delete multi-page preset from Wix CMS
     * @param {string} presetId - Preset ID
     * @returns {Promise<void>}
     */
    async deletePreset(presetId) {
        try {
            console.log(`🗑️ Deleting preset: ${presetId}`);

            // Ensure token is valid
            await this.wixAPI.ensureValidToken();

            // Delete from Wix Data Collections
            const response = await fetch(`${this.wixAPI.baseURL}/wix-data/v2/items/${presetId}?dataCollectionId=${this.collectionName}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.wixAPI.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Preset not found: ${presetId}`);
                }
                const errorText = await response.text();
                throw new Error(`Wix delete failed: ${response.status} - ${errorText}`);
            }

            console.log(`✅ Preset deleted: ${presetId}`);

        } catch (error) {
            console.error('❌ Failed to delete preset:', error);
            throw new Error(`Failed to delete preset: ${error.message}`);
        }
    }

    /**
     * Get preset summary with page count
     * @param {string} presetId - Preset ID
     * @returns {Promise<Object>} - Preset summary
     */
    async getPresetSummary(presetId) {
        try {
            const preset = await this.loadPreset(presetId);

            const pages = [];
            for (let i = 1; i <= this.MAX_PAGES; i++) {
                const pageDataString = preset[`page${i}`];
                if (pageDataString) {
                    const pageData = JSON.parse(pageDataString);
                    pages.push({
                        pageNumber: i,
                        pageName: pageData.pageName || `Page ${i}`,
                        contentSlotCount: pageData.contentSlots?.length || 0
                    });
                }
            }

            return {
                _id: preset._id,
                presetName: preset.presetName,
                description: preset.description,
                pageCount: pages.length,
                pages: pages
            };

        } catch (error) {
            console.error('❌ Failed to get preset summary:', error);
            throw new Error(`Failed to get preset summary: ${error.message}`);
        }
    }

    /**
     * Validate preset structure
     * @private
     */
    validatePreset(preset) {
        if (!preset.presetName) {
            throw new Error('Preset name is required');
        }

        // Check if at least one page exists
        const hasPages = [preset.page1, preset.page2, preset.page3, preset.page4, preset.page5]
            .some(p => p !== null && p !== undefined);

        if (!hasPages) {
            throw new Error('At least one page is required');
        }

        // Validate page data size (64KB limit per Rich Content field)
        const MAX_PAGE_SIZE = 60000; // 60KB safety margin
        for (let i = 1; i <= this.MAX_PAGES; i++) {
            const pageData = preset[`page${i}`];
            if (pageData && pageData.length > MAX_PAGE_SIZE) {
                throw new Error(`Page ${i} exceeds maximum size (60KB). Current: ${(pageData.length / 1024).toFixed(1)}KB`);
            }
        }

        return true;
    }

    /**
     * Validate page number range
     * @private
     */
    validatePageNumber(pageNumber) {
        if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > this.MAX_PAGES) {
            throw new Error(`Page number must be between 1 and ${this.MAX_PAGES}`);
        }
        return true;
    }

    /**
     * Upload media using wrapped WixPresetAPI
     * @param {HTMLImageElement|HTMLVideoElement|Blob} mediaElement
     * @param {string} filename
     * @param {string} mimeType
     * @returns {Promise<string>} - CDN URL
     */
    async uploadMedia(mediaElement, filename, mimeType) {
        return await this.wixAPI.uploadMedia(mediaElement, filename, mimeType);
    }
}
