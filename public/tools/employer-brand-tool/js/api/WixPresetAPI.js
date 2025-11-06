/**
 * Wix Headless API Wrapper for Cloud Preset Storage (REST API)
 *
 * Uses Wix REST API directly instead of SDK packages for browser compatibility
 * Handles all interactions with Wix Headless backend:
 * - Image uploads to Wix Media Manager
 * - Preset save/load/delete operations
 * - Data collection management
 */

export class WixPresetAPI {
    constructor() {
        this.clientId = null;
        this.apiKey = null;  // Optional API key for Media Manager
        this.siteId = null;  // Required for Media Manager API calls
        this.accessToken = null;
        this.initialized = false;
        this.collectionName = 'presets';
        this.baseURL = 'https://www.wixapis.com';
    }

    /**
     * Initialize Wix API with OAuth client ID, optional API key, and site ID
     * @param {string} clientId - Wix OAuth Client ID
     * @param {string|null} apiKey - Optional Wix API Key for Media Manager
     * @param {string|null} siteId - Wix Site ID (required for Media Manager)
     */
    async initialize(clientId, apiKey = null, siteId = null) {
        try {
            console.log('🔄 Initializing Wix REST API...');
            this.clientId = clientId;
            this.apiKey = apiKey;
            this.siteId = siteId;

            if (apiKey) {
                console.log('🔑 API Key provided - Media Manager uploads will use admin authentication');
                console.log('   ⚠️ API key exposed in browser - use only for personal/demo projects');
            }

            if (siteId) {
                console.log('🆔 Site ID provided - Media Manager API calls enabled');
                console.log(`   → Site ID: ${siteId}`);
            }

            // Try loading existing tokens first
            const hasExistingTokens = this.loadTokens();

            if (hasExistingTokens) {
                // Check if token is still valid
                await this.ensureValidToken();
            } else {
                // Generate new visitor access token
                await this.generateAccessToken();
            }

            console.log('✅ Wix REST API initialized successfully');
            this.initialized = true;

        } catch (error) {
            console.error('❌ Failed to initialize Wix REST API:', error);
            throw new Error(`Wix initialization failed: ${error.message}`);
        }
    }

    /**
     * Generate visitor access token using OAuth
     * Uses Wix OAuth2 anonymous grant type for visitor access
     * Tokens expire after 4 hours (14,400 seconds)
     */
    async generateAccessToken() {
        try {
            console.log('🎫 Generating visitor access token...');
            console.log('   → Client ID:', this.clientId);

            // Wix OAuth2 endpoint for token generation
            const tokenEndpoint = 'https://www.wixapis.com/oauth2/token';

            // Request visitor (anonymous) token
            const response = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientId: this.clientId,
                    grantType: 'anonymous'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Token generation failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            // Store tokens
            this.accessToken = data.access_token;
            this.refreshToken = data.refresh_token;
            this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

            console.log('✅ Visitor token generated successfully');
            console.log('   → Token type:', data.token_type);
            console.log('   → Expires in:', data.expires_in, 'seconds (4 hours)');
            console.log('   → Token expiry:', new Date(this.tokenExpiresAt).toLocaleString());

            // Store tokens in localStorage for persistence
            this.saveTokens();

        } catch (error) {
            console.error('❌ Failed to generate access token:', error);
            throw error;
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken() {
        try {
            console.log('🔄 Refreshing access token...');

            if (!this.refreshToken) {
                throw new Error('No refresh token available');
            }

            const tokenEndpoint = 'https://www.wixapis.com/oauth2/token';

            const response = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientId: this.clientId,
                    grantType: 'refresh_token',
                    refreshToken: this.refreshToken
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            // Update tokens
            this.accessToken = data.access_token;
            this.refreshToken = data.refresh_token || this.refreshToken;
            this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

            console.log('✅ Token refreshed successfully');
            console.log('   → New expiry:', new Date(this.tokenExpiresAt).toLocaleString());

            // Save updated tokens
            this.saveTokens();

        } catch (error) {
            console.error('❌ Failed to refresh token:', error);
            // If refresh fails, generate new token
            await this.generateAccessToken();
        }
    }

    /**
     * Check if token is expired and refresh if needed
     */
    async ensureValidToken() {
        const now = Date.now();
        const buffer = 5 * 60 * 1000; // 5 minutes buffer

        if (!this.accessToken || now >= (this.tokenExpiresAt - buffer)) {
            console.log('⚠️ Token expired or expiring soon, refreshing...');
            if (this.refreshToken) {
                await this.refreshAccessToken();
            } else {
                await this.generateAccessToken();
            }
        }
    }

    /**
     * Save tokens to localStorage for persistence
     */
    saveTokens() {
        try {
            localStorage.setItem('wix_access_token', this.accessToken);
            localStorage.setItem('wix_refresh_token', this.refreshToken);
            localStorage.setItem('wix_token_expires_at', this.tokenExpiresAt.toString());
            console.log('💾 Tokens saved to localStorage');
        } catch (error) {
            console.warn('⚠️ Failed to save tokens to localStorage:', error);
        }
    }

    /**
     * Load tokens from localStorage
     */
    loadTokens() {
        try {
            this.accessToken = localStorage.getItem('wix_access_token');
            this.refreshToken = localStorage.getItem('wix_refresh_token');
            const expiresAt = localStorage.getItem('wix_token_expires_at');
            if (expiresAt) {
                this.tokenExpiresAt = parseInt(expiresAt);
            }

            if (this.accessToken) {
                console.log('📦 Loaded existing tokens from localStorage');
                console.log('   → Expiry:', new Date(this.tokenExpiresAt).toLocaleString());
                return true;
            }
            return false;
        } catch (error) {
            console.warn('⚠️ Failed to load tokens from localStorage:', error);
            return false;
        }
    }

    /**
     * Check if API is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('WixPresetAPI not initialized. Call initialize() first.');
        }
    }

    /**
     * Convert image element to blob
     * @param {HTMLImageElement|HTMLCanvasElement} imageElement
     * @returns {Promise<Blob>}
     */
    async imageToBlob(imageElement) {
        return new Promise((resolve, reject) => {
            // If it's already a canvas, convert directly
            if (imageElement instanceof HTMLCanvasElement) {
                imageElement.toBlob(blob => {
                    if (blob) resolve(blob);
                    else reject(new Error('Failed to convert canvas to blob'));
                }, 'image/png');
                return;
            }

            // If it's an image, draw to canvas first
            const canvas = document.createElement('canvas');
            canvas.width = imageElement.naturalWidth || imageElement.width;
            canvas.height = imageElement.naturalHeight || imageElement.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imageElement, 0, 0);

            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to convert image to blob'));
            }, 'image/png');
        });
    }

    /**
     * Convert video element to blob
     * Records video frames using MediaRecorder API
     * @param {HTMLVideoElement} videoElement
     * @param {string} mimeType - Target MIME type (e.g., 'video/webm', 'video/mp4')
     * @returns {Promise<Blob>}
     */
    async videoToBlob(videoElement, mimeType = 'video/webm') {
        return new Promise((resolve, reject) => {
            try {
                // Check if we can capture the video stream
                if (!videoElement.captureStream && !videoElement.mozCaptureStream) {
                    reject(new Error('Video capture not supported in this browser'));
                    return;
                }

                // Get video stream
                const stream = videoElement.captureStream ?
                    videoElement.captureStream() :
                    videoElement.mozCaptureStream();

                // Determine best available codec
                let codecMimeType = mimeType;
                if (!MediaRecorder.isTypeSupported(codecMimeType)) {
                    // Try WebM with VP9
                    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                        codecMimeType = 'video/webm;codecs=vp9';
                    }
                    // Try WebM with VP8
                    else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
                        codecMimeType = 'video/webm;codecs=vp8';
                    }
                    // Fallback to basic WebM
                    else if (MediaRecorder.isTypeSupported('video/webm')) {
                        codecMimeType = 'video/webm';
                    }
                    else {
                        reject(new Error(`No supported video codec found. Requested: ${mimeType}`));
                        return;
                    }
                    console.log(`   → Using codec: ${codecMimeType} (fallback from ${mimeType})`);
                }

                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: codecMimeType
                });

                const chunks = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: codecMimeType });
                    resolve(blob);
                };

                mediaRecorder.onerror = (event) => {
                    reject(new Error(`MediaRecorder error: ${event.error}`));
                };

                // Start recording
                mediaRecorder.start();

                // Record for duration of video or max 30 seconds
                const recordDuration = Math.min(videoElement.duration * 1000, 30000);

                setTimeout(() => {
                    mediaRecorder.stop();
                    stream.getTracks().forEach(track => track.stop());
                }, recordDuration);

            } catch (error) {
                reject(new Error(`Video to blob conversion failed: ${error.message}`));
            }
        });
    }

    /**
     * Upload media (image, GIF, video) to Wix Media Manager
     * Falls back to data URLs for images/GIFs if Wix upload fails
     * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|Blob} mediaElement
     * @param {string} filename - Custom filename with extension
     * @param {string} mimeType - MIME type (e.g., 'image/png', 'video/mp4', 'image/gif')
     * @returns {Promise<string>} - Media URL (Wix CDN URL or data URL fallback)
     */
    async uploadMedia(mediaElement, filename, mimeType) {
        this.ensureInitialized();

        const mediaType = mimeType.split('/')[0]; // 'image', 'video', etc.

        try {
            console.log(`📤 Uploading ${mediaType} to Wix Media Manager: ${filename}`);

            // Ensure token is valid
            await this.ensureValidToken();

            // Convert media to blob
            let blob;
            if (mediaElement instanceof Blob) {
                blob = mediaElement;
            } else if (mediaElement instanceof HTMLVideoElement) {
                blob = await this.videoToBlob(mediaElement, mimeType);
            } else {
                // Image or canvas
                blob = await this.imageToBlob(mediaElement);
            }

            console.log(`   → Blob size: ${(blob.size / 1024).toFixed(2)} KB`);
            console.log(`   → MIME type: ${mimeType}`);

            // Generate upload URL from Wix
            const uploadData = await this.generateMediaUploadUrl(mimeType, filename);
            console.log(`   → Upload URL generated`);
            console.log(`   → File ID: ${uploadData.fileId}`);

            // Upload blob to Wix CDN
            const cdnUrl = await this.uploadToWixCDN(uploadData.uploadUrl, blob);
            console.log(`✅ ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} uploaded to Wix CDN`);
            console.log(`   → CDN URL: ${cdnUrl}`);

            return cdnUrl;

        } catch (error) {
            console.error(`❌ Wix ${mediaType} upload failed:`, error);

            // Fallback to data URL for images only (backwards compatibility)
            if (mediaType === 'image' && !(mediaElement instanceof Blob)) {
                try {
                    console.log(`⚠️ Falling back to data URL for ${mediaType}...`);
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    if (mediaElement instanceof HTMLCanvasElement) {
                        canvas.width = mediaElement.width;
                        canvas.height = mediaElement.height;
                        ctx.drawImage(mediaElement, 0, 0);
                    } else {
                        canvas.width = mediaElement.naturalWidth || mediaElement.width;
                        canvas.height = mediaElement.naturalHeight || mediaElement.height;
                        ctx.drawImage(mediaElement, 0, 0);
                    }

                    const dataURL = canvas.toDataURL(mimeType);
                    console.log(`⚠️ Using data URL fallback (${(dataURL.length / 1024).toFixed(2)} KB)`);
                    return dataURL;

                } catch (fallbackError) {
                    console.error('❌ Fallback failed:', fallbackError);
                    throw new Error(`Failed to process ${mediaType}: ${fallbackError.message}`);
                }
            }

            // No fallback for videos or blobs
            throw new Error(`Failed to upload ${mediaType}: ${error.message}`);
        }
    }

    /**
     * Legacy method - redirects to uploadMedia
     * @deprecated Use uploadMedia() instead
     */
    async uploadImage(imageElement, filename = null) {
        return this.uploadMedia(imageElement, filename || `image-${Date.now()}.png`, 'image/png');
    }

    /**
     * Generate upload URL from Wix Media Manager
     * @param {string} mimeType - MIME type (e.g., 'image/png')
     * @param {string} filename - Optional filename
     * @returns {Promise<{uploadUrl: string, fileId: string}>}
     */
    async generateMediaUploadUrl(mimeType, filename = null) {
        try {
            const endpoint = `${this.baseURL}/site-media/v1/files/generate-upload-url`;

            const requestBody = {
                mimeType: mimeType
            };

            // Add fileName if provided (optional parameter)
            if (filename) {
                requestBody.fileName = filename;
            }

            // Use API key for Media Manager if available, otherwise use OAuth token
            const authToken = this.apiKey || this.accessToken;
            const authType = this.apiKey ? 'API Key (admin)' : 'OAuth Token (visitor)';

            console.log('   🔍 DEBUG: Request details');
            console.log('   → Auth type:', authType);
            console.log('   → API key format:', this.apiKey ? `${this.apiKey.substring(0, 20)}...` : 'none');
            console.log('   → API key prefix:', this.apiKey ? this.apiKey.split('.')[0] : 'none');
            console.log('   → Request body:', JSON.stringify(requestBody, null, 2));
            console.log('   → Endpoint:', endpoint);

            // ⚠️ IMPORTANT: Wix API Keys might need different header format
            // Check if API key needs "wix-site-id" or "wix-account-id" headers
            const headers = {
                'Content-Type': 'application/json'
            };

            if (this.apiKey) {
                // API Key authentication
                // IST tokens (Instance Tokens) need Bearer prefix
                // JWS tokens (Account API Keys) use direct format
                const authHeader = this.apiKey.startsWith('IST.')
                    ? `Bearer ${this.apiKey}`
                    : this.apiKey.startsWith('JWS.')
                        ? this.apiKey
                        : `Bearer ${this.apiKey}`; // Default to Bearer for unknown formats

                headers['Authorization'] = authHeader;
                console.log('   🔑 Token type:', this.apiKey.split('.')[0]);
                console.log('   → Auth format:', authHeader.substring(0, 40) + '...');

                // Try adding wix-site-id header if available (IST tokens may need this)
                if (this.siteId) {
                    headers['wix-site-id'] = this.siteId;
                    console.log('   → Site ID header:', this.siteId);
                }
            } else {
                // OAuth token authentication
                headers['Authorization'] = `Bearer ${this.accessToken}`;
                console.log('   ✅ Using OAuth Bearer token');
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            console.log('   → Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Upload URL generation failed: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            return {
                uploadUrl: data.uploadUrl,
                fileId: data.fileId
            };

        } catch (error) {
            console.error('❌ Failed to generate upload URL:', error);
            throw error;
        }
    }

    /**
     * Upload blob to Wix CDN using upload URL
     * @param {string} uploadUrl - Upload URL from generateMediaUploadUrl
     * @param {Blob} blob - Image blob
     * @returns {Promise<string>} - CDN URL
     */
    async uploadToWixCDN(uploadUrl, blob) {
        try {
            const response = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': blob.type || 'application/octet-stream'
                },
                body: blob
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`CDN upload failed: ${response.status} ${errorText}`);
            }

            // Extract CDN URL from upload URL (before query params)
            const cdnUrl = uploadUrl.split('?')[0];
            return cdnUrl;

        } catch (error) {
            console.error('❌ Failed to upload to CDN:', error);
            throw error;
        }
    }

    /**
     * Save preset to browser localStorage (fallback until Wix OAuth is fully set up)
     * @param {string} name - Preset name
     * @param {object} settings - Complete preset settings
     * @returns {Promise<object>} - Created preset item
     */
    async savePreset(name, settings) {
        this.ensureInitialized();

        try {
            console.log(`💾 Saving preset to Wix Data Collections: "${name}"`);

            // Ensure token is valid
            await this.ensureValidToken();

            // Save to Wix Data Collections using correct v2 API format
            const response = await fetch(`${this.baseURL}/wix-data/v2/items`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dataCollectionId: this.collectionName,
                    dataItem: {
                        data: {
                            name: name,
                            settings: settings
                        }
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Wix Data Collections save failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ Preset saved to Wix Data Collections`);
            console.log(`   → Preset ID: ${result.dataItem.data._id}`);
            console.log(`   → Preset Name: ${result.dataItem.data.name}`);

            // Return in expected format with system fields at root level
            return {
                _id: result.dataItem.data._id,
                name: result.dataItem.data.name,
                settings: result.dataItem.data.settings,
                _createdDate: result.dataItem.data._createdDate,
                _updatedDate: result.dataItem.data._updatedDate
            };

        } catch (error) {
            console.error('❌ Failed to save preset to Wix:', error);
            throw new Error(`Failed to save preset: ${error.message}`);
        }
    }

    /**
     * Get localStorage usage information
     * @returns {Object} Storage usage stats
     */
    getStorageInfo() {
        try {
            const presetsKey = 'wix_presets';
            const presetsJSON = localStorage.getItem(presetsKey) || '[]';
            const presets = JSON.parse(presetsJSON);

            // Calculate size in bytes (approximate)
            const totalSize = new Blob([presetsJSON]).size;
            const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);

            // Estimate quota (typically 5-10MB)
            const estimatedQuotaMB = 5;
            const usagePercent = ((totalSize / (estimatedQuotaMB * 1024 * 1024)) * 100).toFixed(1);

            return {
                presetCount: presets.length,
                totalSize: totalSize,
                totalSizeMB: totalSizeMB,
                usagePercent: usagePercent,
                estimatedQuotaMB: estimatedQuotaMB
            };
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return null;
        }
    }

    /**
     * List all presets from localStorage (fallback)
     * @returns {Promise<Array>} - Array of preset items
     */
    async listPresets() {
        this.ensureInitialized();

        try {
            console.log('📋 Fetching preset list from Wix Data Collections...');

            // Ensure token is valid
            await this.ensureValidToken();

            // Query Wix Data Collections using correct v2 API format
            const response = await fetch(`${this.baseURL}/wix-data/v2/items/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dataCollectionId: this.collectionName,
                    query: {
                        sort: [{ fieldName: '_createdDate', order: 'desc' }]
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Wix Data Collections query failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            const rawItems = result.dataItems || [];

            // Transform to expected format (flatten data structure)
            const presets = rawItems.map(item => ({
                _id: item.data._id,
                name: item.data.name,
                settings: item.data.settings,
                _createdDate: item.data._createdDate,
                _updatedDate: item.data._updatedDate
            }));

            console.log(`✅ Found ${presets.length} presets in Wix Data Collections`);

            return presets;

        } catch (error) {
            console.error('❌ Failed to list presets:', error);
            return [];
        }
    }

    /**
     * Load preset by ID from localStorage (fallback)
     * @param {string} presetId - Preset _id
     * @returns {Promise<object>} - Preset item
     */
    async loadPreset(presetId) {
        this.ensureInitialized();

        try {
            console.log(`📥 Loading preset from Wix Data Collections: ${presetId}`);

            // Ensure token is valid
            await this.ensureValidToken();

            // Fetch from Wix Data Collections using correct v2 API format
            const response = await fetch(`${this.baseURL}/wix-data/v2/items/${presetId}?dataCollectionId=${this.collectionName}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Preset not found: ${presetId}`);
                }
                const errorText = await response.text();
                throw new Error(`Wix Data Collections load failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ Preset loaded from Wix: "${result.dataItem.data.name}"`);
            console.log(`   → Created: ${new Date(result.dataItem.data._createdDate.$date).toLocaleString()}`);

            // Return in expected format (flatten data structure)
            return {
                _id: result.dataItem.data._id,
                name: result.dataItem.data.name,
                settings: result.dataItem.data.settings,
                _createdDate: result.dataItem.data._createdDate,
                _updatedDate: result.dataItem.data._updatedDate
            };

        } catch (error) {
            console.error('❌ Failed to load preset:', error);
            throw new Error(`Failed to load preset: ${error.message}`);
        }
    }

    /**
     * Delete preset by ID from localStorage (fallback)
     * @param {string} presetId - Preset _id
     * @returns {Promise<void>}
     */
    async deletePreset(presetId) {
        this.ensureInitialized();

        try {
            console.log(`🗑️ Deleting preset from Wix Data Collections: ${presetId}`);

            // Ensure token is valid
            await this.ensureValidToken();

            // Delete from Wix Data Collections using correct v2 API format
            const response = await fetch(`${this.baseURL}/wix-data/v2/items/${presetId}?dataCollectionId=${this.collectionName}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Preset not found: ${presetId}`);
                }
                const errorText = await response.text();
                throw new Error(`Wix Data Collections delete failed: ${response.status} - ${errorText}`);
            }

            console.log(`✅ Preset deleted from Wix Data Collections`);
            console.log(`   → Preset ID: ${presetId}`);

        } catch (error) {
            console.error('❌ Failed to delete preset:', error);
            throw new Error(`Failed to delete preset: ${error.message}`);
        }
    }

    /**
     * List files from Wix Media Manager
     * @param {string} folderId - Optional folder ID to filter by
     * @returns {Promise<Array>} - Array of file objects with structure:
     *   {
     *     id: string,
     *     fileUrl: string,           // CDN URL
     *     displayName: string,
     *     mimeType: string,          // e.g., "image/png", "video/mp4"
     *     sizeInBytes: number,
     *     createdDate: string,
     *     labels: string[]
     *   }
     */
    async listMediaFiles(folderId = null) {
        this.ensureInitialized();

        try {
            console.log('📋 Fetching files from Wix Media Manager...');

            // Check if API key is available (required for Media Manager access)
            if (!this.apiKey) {
                throw new Error('Media Manager access requires an API Key. OAuth tokens do not have permission to list files.');
            }

            // Build endpoint with optional folder filter
            const endpoint = `${this.baseURL}/site-media/v1/files`;
            const url = folderId ? `${endpoint}?parentFolderId=${folderId}` : endpoint;

            console.log(`   → Endpoint: ${url}`);
            console.log(`   → Using IST token for authentication`);

            // Use API key for Media Manager (same format as upload)
            const authHeader = this.apiKey.startsWith('IST.')
                ? `Bearer ${this.apiKey}`
                : this.apiKey.startsWith('JWS.')
                    ? this.apiKey
                    : `Bearer ${this.apiKey}`;

            const headers = {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            };

            // Add site ID if available (IST tokens may need this)
            if (this.siteId) {
                headers['wix-site-id'] = this.siteId;
                console.log(`   → Site ID: ${this.siteId}`);
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });

            console.log(`   → Response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to list media files: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const files = data.files || [];

            console.log(`✅ Found ${files.length} files in Media Manager`);
            if (files.length > 0) {
                console.log(`   → First file: ${files[0].displayName} (${files[0].mimeType})`);
            }

            return files;

        } catch (error) {
            console.error('❌ Failed to list media files:', error);
            throw new Error(`Failed to list media files: ${error.message}`);
        }
    }

    // ============================================
    // CUSTOM FONTS MANAGEMENT
    // ============================================

    /**
     * Save a custom font to Wix Data Collections
     * @param {Object} fontData - Font metadata object
     * @returns {Promise<string>} - Font record ID
     */
    async saveCustomFont(fontData) {
        try {
            console.log(`💾 Saving custom font to Wix Data: ${fontData.name}`);

            // Ensure token is valid
            await this.ensureValidToken();

            const fontRecord = {
                name: fontData.name,
                family: fontData.family,
                fileName: fontData.fileName,
                cdnUrl: fontData.cdnUrl,
                mimeType: fontData.mimeType,
                size: fontData.size || 0,
                uploadedAt: new Date().toISOString()
            };

            // Use same pattern as preset saving
            const response = await fetch(`${this.baseURL}/wix-data/v2/items`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dataCollectionId: 'CustomFonts',
                    dataItem: { data: fontRecord }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to save font: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log(`✅ Font saved with ID: ${data.dataItem.data._id}`);
            return data.dataItem.data._id;

        } catch (error) {
            console.error('❌ Failed to save custom font:', error);
            throw new Error(`Failed to save custom font: ${error.message}`);
        }
    }

    /**
     * Load all custom fonts from Wix Data Collections
     * @returns {Promise<Array>} - Array of font metadata objects
     */
    async loadCustomFonts() {
        try {
            console.log(`📥 Loading custom fonts from Wix Data Collections...`);

            // Ensure token is valid
            await this.ensureValidToken();

            // Use same pattern as preset loading
            const response = await fetch(`${this.baseURL}/wix-data/v2/items/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dataCollectionId: 'CustomFonts',
                    query: {
                        sort: [{ fieldName: 'uploadedAt', order: 'DESC' }]
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to load fonts: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            const rawItems = result.dataItems || [];

            // Transform to expected format (flatten data structure like presets)
            const fonts = rawItems.map(item => ({
                name: item.data.name,
                family: item.data.family,
                fileName: item.data.fileName,
                cdnUrl: item.data.cdnUrl,
                mimeType: item.data.mimeType,
                size: item.data.size,
                uploadedAt: item.data.uploadedAt
            }));

            console.log(`✅ Loaded ${fonts.length} custom font(s) from Wix Data`);
            return fonts;

        } catch (error) {
            console.error('❌ Failed to load custom fonts:', error);
            // Return empty array on error so app doesn't break
            return [];
        }
    }

    /**
     * Delete a custom font from Wix Data Collections
     * @param {string} fontName - Name of the font to delete
     * @returns {Promise<boolean>} - Success status
     */
    async deleteCustomFont(fontName) {
        try {
            console.log(`🗑️ Deleting custom font from Wix Data: ${fontName}`);

            // Ensure token is valid
            await this.ensureValidToken();

            // First, query to find the font by name using same pattern as preset loading
            const queryResponse = await fetch(`${this.baseURL}/wix-data/v2/items/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dataCollectionId: 'CustomFonts',
                    query: {
                        filter: { name: { $eq: fontName } }
                    }
                })
            });

            if (!queryResponse.ok) {
                throw new Error(`Failed to query font: ${queryResponse.status}`);
            }

            const queryData = await queryResponse.json();
            if (!queryData.dataItems || queryData.dataItems.length === 0) {
                console.log(`⚠️ Font "${fontName}" not found in Wix Data`);
                return false;
            }

            const fontId = queryData.dataItems[0].data._id;

            // Delete the font using same pattern as preset deletion
            const deleteResponse = await fetch(`${this.baseURL}/wix-data/v2/items/${fontId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    dataCollectionId: 'CustomFonts'
                })
            });

            if (!deleteResponse.ok) {
                throw new Error(`Failed to delete font: ${deleteResponse.status}`);
            }

            console.log(`✅ Font "${fontName}" deleted from Wix Data`);
            return true;

        } catch (error) {
            console.error('❌ Failed to delete custom font:', error);
            return false;
        }
    }
}
