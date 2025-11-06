/**
 * FontManager.js - Manages custom font uploads and loading
 * Handles font file uploads to Wix Media Manager, CSS @font-face generation, and CDN-based persistence
 */

class FontManager {
    constructor() {
        this.customFonts = new Map(); // Map of fontName -> fontData

        // Auto-detect environment for API URL
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalhost) {
            // Development - use separate backend server on port 3001
            this.mediaApiUrl = 'http://localhost:3001/api/media/upload';
        } else {
            // Production - use relative API path (Vercel serverless function)
            this.mediaApiUrl = '/api/media/upload';
        }

        // Note: loadCustomFontsFromStorage() is async and must be called explicitly
        // after construction by the caller (e.g., UIManager.initializeFontUpload())
    }

    /**
     * Load custom fonts from Wix Data Collections
     */
    async loadCustomFontsFromStorage() {
        try {
            // Check if WixAPI is available
            if (!window.wixAPI) {
                console.warn('⚠️ WixAPI not initialized - skipping font loading');
                return;
            }

            console.log(`📡 Fetching custom fonts from Wix Data Collections...`);

            // Load fonts from Wix Data Collections
            const fonts = await window.wixAPI.loadCustomFonts();

            console.log(`📦 Found ${fonts.length} custom font(s) in Wix Data`);

            // Load all fonts from CDN in parallel
            const loadPromises = fonts.map(async (fontData) => {
                try {
                    this.customFonts.set(fontData.name, fontData);
                    await this.loadFont(fontData);
                    
                } catch (error) {
                    console.warn(`   ⚠️ Failed to load font "${fontData.name}":`, error);
                }
            });

            await Promise.all(loadPromises);
            console.log(`✅ All custom fonts loaded and available in dropdown`);
        } catch (error) {
            console.warn('Failed to load custom fonts from Wix Data:', error);
        }
    }

    /**
     * Note: Fonts are now stored in Wix Media Manager backend.
     * No need to save to localStorage - fonts persist on CDN.
     */

    /**
     * Upload and process a font file - uploads to Wix Media Manager CDN
     * @param {File} file - Font file (woff, woff2, ttf, otf)
     * @returns {Promise<Object>} Font data object with CDN URL
     */
    async uploadFont(file) {
        // Validate file type
        const validTypes = ['font/woff', 'font/woff2', 'application/font-woff', 'application/font-woff2', 'font/ttf', 'font/otf'];
        const fileExtension = file.name.toLowerCase().split('.').pop();
        const validExtensions = ['woff', 'woff2', 'ttf', 'otf'];

        if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
            throw new Error('Invalid font file type. Please upload a WOFF, WOFF2, TTF, or OTF file.');
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('Font file is too large. Maximum size is 5MB.');
        }

        // Extract font name before upload
        const fontName = this.extractFontName(file.name);

        // Check if font name already exists
        if (this.customFonts.has(fontName)) {
            throw new Error(`Font "${fontName}" already exists. Please rename or delete the existing font first.`);
        }

        try {
            // Upload to Wix Media Manager via backend API
            console.log(`📤 Uploading font "${fontName}" to Wix Media Manager...`);
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(this.mediaApiUrl, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to upload font to media manager');
            }

            const result = await response.json();

            if (!result.success || !result.file || !result.file.fileUrl) {
                throw new Error('Upload succeeded but no CDN URL returned');
            }

            // Create font data object with CDN URL
            const fontData = {
                name: fontName,
                family: this.generateFontFamily(fontName),
                fileName: file.name,
                cdnUrl: result.file.fileUrl, // Wix CDN URL
                uploadedAt: new Date().toISOString(),
                size: file.size,
                mimeType: result.file.mimeType
            };

            // Store metadata in memory
            this.customFonts.set(fontData.name, fontData);

            // Save font metadata to Wix Data Collections for persistence
            if (window.wixAPI) {
                try {
                    await window.wixAPI.saveCustomFont(fontData);
                    console.log(`💾 Font metadata saved to Wix Data Collections`);
                } catch (error) {
                    console.warn('⚠️ Failed to save font to Wix Data:', error);
                    // Continue anyway - font is already uploaded to CDN
                }
            }

            // Load font from CDN
            await this.loadFont(fontData);

            console.log(`✅ Font "${fontName}" uploaded successfully to CDN`);
            return fontData;

        } catch (error) {
            console.error('Font upload failed:', error);
            throw error;
        }
    }

    /**
     * Extract font name from filename
     * @param {string} fileName - Font file name
     * @returns {string} Clean font name
     */
    extractFontName(fileName) {
        // Remove extension and clean up the name
        let name = fileName.replace(/\.[^/.]+$/, '');
        
        // Remove common suffixes
        name = name.replace(/-?(regular|normal|medium|bold|light|thin|heavy|black)$/i, '');
        
        // Convert to title case
        name = name.split(/[-_\s]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        
        return name || 'Custom Font';
    }

    /**
     * Generate CSS font-family value
     * @param {string} fontName - Font name
     * @returns {string} CSS font-family value
     */
    generateFontFamily(fontName) {
        return `"${fontName}", Arial, sans-serif`;
    }

    /**
     * Load font into the page using CSS @font-face from CDN URL
     * @param {Object} fontData - Font data object with cdnUrl
     * @returns {Promise<void>}
     */
    async loadFont(fontData) {
        // Check if font is already loaded
        if (document.querySelector(`style[data-font="${fontData.name}"]`)) {
            console.log(`Font "${fontData.name}" already loaded`);
            return;
        }

        // Use CDN URL
        const fontUrl = fontData.cdnUrl;
        if (!fontUrl) {
            throw new Error(`No CDN URL for font "${fontData.name}"`);
        }

        // Determine font format from filename or MIME type
        let format = 'woff2';
        const fileName = fontData.fileName.toLowerCase();
        if (fileName.endsWith('.woff')) {
            format = 'woff';
        } else if (fileName.endsWith('.ttf')) {
            format = 'truetype';
        } else if (fileName.endsWith('.otf')) {
            format = 'opentype';
        }

        // Create CSS @font-face rule
        const css = `
            @font-face {
                font-family: "${fontData.name}";
                src: url(${fontUrl}) format('${format}');
                font-display: swap;
            }
        `;

        // Add to page
        const style = document.createElement('style');
        style.setAttribute('data-font', fontData.name);
        style.textContent = css;
        document.head.appendChild(style);

        // Wait for font to be ready
        try {
            await document.fonts.ready;
        } catch (error) {
            console.warn('Font loading check failed:', error);
        }
    }

    /**
     * Load font from CDN URL directly (used when loading presets)
     * @param {Object} fontData - Font data object with cdnUrl, name, fileName
     * @returns {Promise<void>}
     */
    async loadFontFromCDN(fontData) {
        // Add to local registry if not already present
        if (!this.customFonts.has(fontData.name)) {
            this.customFonts.set(fontData.name, fontData);
        }

        // Load the font
        await this.loadFont(fontData);
    }

    /**
     * Get all custom fonts
     * @returns {Array} Array of font data objects
     */
    getCustomFonts() {
        return Array.from(this.customFonts.values());
    }

    /**
     * Get custom font by name
     * @param {string} name - Font name
     * @returns {Object|null} Font data object or null
     */
    getCustomFont(name) {
        return this.customFonts.get(name) || null;
    }

    /**
     * Remove custom font
     * @param {string} name - Font name
     * @returns {boolean} Success status
     */
    async removeCustomFont(name) {
        if (this.customFonts.has(name)) {
            // Remove CSS
            const style = document.querySelector(`style[data-font="${name}"]`);
            if (style) {
                style.remove();
            }

            // Remove from memory
            this.customFonts.delete(name);

            // Remove from Wix Data Collections
            if (window.wixAPI) {
                try {
                    await window.wixAPI.deleteCustomFont(name);
                    console.log(`🗑️ Font "${name}" removed from Wix Data Collections`);
                } catch (error) {
                    console.warn('⚠️ Failed to delete font from Wix Data:', error);
                }
            }

            return true;
        }
        return false;
    }

    /**
     * Check if font is loaded and ready
     * @param {string} fontFamily - CSS font-family value
     * @returns {Promise<boolean>} Font ready status
     */
    async isFontReady(fontFamily) {
        return new Promise((resolve) => {
            // Create a test element
            const testElement = document.createElement('span');
            testElement.style.fontFamily = fontFamily;
            testElement.style.fontSize = '72px';
            testElement.style.position = 'absolute';
            testElement.style.left = '-9999px';
            testElement.style.top = '-9999px';
            testElement.textContent = 'abcdefghijklmnopqrstuvwxyz0123456789';
            
            document.body.appendChild(testElement);
            
            // Measure with default font
            const defaultWidth = testElement.offsetWidth;
            
            // Measure with custom font
            testElement.style.fontFamily = fontFamily;
            
            // Check if font loaded (width should be different)
            setTimeout(() => {
                const customWidth = testElement.offsetWidth;
                document.body.removeChild(testElement);
                
                // Font is ready if width changed (indicating custom font loaded)
                resolve(customWidth !== defaultWidth);
            }, 100);
        });
    }

    /**
     * Get font file size in human readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Human readable size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Validate font file before upload
     * @param {File} file - Font file
     * @returns {Object} Validation result
     */
    validateFontFile(file) {
        const result = {
            valid: true,
            errors: []
        };

        // Check file type
        const validTypes = ['font/woff', 'font/woff2', 'application/font-woff', 'application/font-woff2', 'font/ttf', 'font/otf'];
        const fileExtension = file.name.toLowerCase().split('.').pop();
        const validExtensions = ['woff', 'woff2', 'ttf', 'otf'];

        if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
            result.valid = false;
            result.errors.push('Invalid file type. Please upload a WOFF, WOFF2, TTF, or OTF file.');
        }

        // Check file size
        if (file.size > 5 * 1024 * 1024) {
            result.valid = false;
            result.errors.push('File is too large. Maximum size is 5MB.');
        }

        // Check if font name already exists
        const fontName = this.extractFontName(file.name);
        if (this.customFonts.has(fontName)) {
            result.valid = false;
            result.errors.push(`Font "${fontName}" already exists. Please rename or delete it first.`);
        }

        return result;
    }

    /**
     * Get font data by family name (extracts name from font-family CSS value)
     * @param {string} fontFamily - CSS font-family value like '"Custom Font", Arial, sans-serif'
     * @returns {Object|null} Font data object or null
     */
    getFontByFamily(fontFamily) {
        // Extract font name from CSS font-family value
        const match = fontFamily.match(/"([^"]+)"/);
        if (match && match[1]) {
            return this.getCustomFont(match[1]);
        }
        return null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FontManager;
}
