/**
 * ExportFormatSelector.js - UI component for selecting export format per page
 *
 * Designer can choose:
 * - Default format: Image (PNG/JPG) or Video (MP4)
 * - Video settings: Duration, FPS
 * - Image format: PNG or JPG
 */

class ExportFormatSelector {
    constructor(container, initialConfig = null) {
        this.container = container;
        this.config = initialConfig || this._getDefaultConfig();

        this.formatRadios = null;
        this.videoSettings = null;
        this.imageSettings = null;

        this.render();
    }

    /**
     * Get default export configuration
     */
    _getDefaultConfig() {
        return {
            defaultFormat: 'image',
            videoDuration: 5,
            videoFPS: 60,
            imageFormat: 'png'
        };
    }

    /**
     * Render the export format selector
     */
    render() {
        this.container.innerHTML = `
            <div class="export-format-selector">
                <h4>Default Export Format</h4>
                <p class="export-format-description">
                    Choose how this page will be exported by default. End-users can override this.
                </p>

                <!-- Format Selection -->
                <div class="export-format-options">
                    <label class="export-format-radio">
                        <input type="radio"
                               name="exportFormat"
                               value="image"
                               ${this.config.defaultFormat === 'image' ? 'checked' : ''}>
                        <div class="export-format-card">
                            <div class="export-format-icon">🖼️</div>
                            <div class="export-format-label">
                                <strong>Image</strong>
                                <small>Static PNG or JPG</small>
                            </div>
                        </div>
                    </label>

                    <label class="export-format-radio">
                        <input type="radio"
                               name="exportFormat"
                               value="video"
                               ${this.config.defaultFormat === 'video' ? 'checked' : ''}>
                        <div class="export-format-card">
                            <div class="export-format-icon">🎬</div>
                            <div class="export-format-label">
                                <strong>Video</strong>
                                <small>Animated MP4</small>
                            </div>
                        </div>
                    </label>
                </div>

                <!-- Image Settings -->
                <div class="export-settings export-image-settings"
                     style="display: ${this.config.defaultFormat === 'image' ? 'block' : 'none'};">
                    <h5>Image Settings</h5>
                    <label>
                        Format
                        <select id="exportImageFormat">
                            <option value="png" ${this.config.imageFormat === 'png' ? 'selected' : ''}>PNG (Lossless)</option>
                            <option value="jpg" ${this.config.imageFormat === 'jpg' ? 'selected' : ''}>JPG (Compressed)</option>
                        </select>
                    </label>
                </div>

                <!-- Video Settings -->
                <div class="export-settings export-video-settings"
                     style="display: ${this.config.defaultFormat === 'video' ? 'block' : 'none'};">
                    <h5>Video Settings</h5>

                    <label>
                        Duration
                        <div class="export-slider-input">
                            <input type="range"
                                   id="exportVideoDuration"
                                   min="1"
                                   max="30"
                                   step="1"
                                   value="${this.config.videoDuration}">
                            <span class="export-slider-value">${this.config.videoDuration}s</span>
                        </div>
                    </label>

                    <label>
                        Frame Rate
                        <select id="exportVideoFPS">
                            <option value="30" ${this.config.videoFPS === 30 ? 'selected' : ''}>30 FPS (Standard)</option>
                            <option value="60" ${this.config.videoFPS === 60 ? 'selected' : ''}>60 FPS (Smooth)</option>
                        </select>
                    </label>

                    <div class="export-info-box">
                        <strong>💡 Tip:</strong> Videos capture cell animations. If you have animated cells, they'll play during the video export.
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Format radio buttons
        const formatRadios = this.container.querySelectorAll('input[name="exportFormat"]');
        formatRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.config.defaultFormat = e.target.value;
                this.updateVisibility();
            });
        });

        // Video duration slider
        const durationSlider = this.container.querySelector('#exportVideoDuration');
        if (durationSlider) {
            durationSlider.addEventListener('input', (e) => {
                this.config.videoDuration = parseInt(e.target.value);
                this.container.querySelector('.export-slider-value').textContent = `${e.target.value}s`;
            });
        }

        // Video FPS selector
        const fpsSelect = this.container.querySelector('#exportVideoFPS');
        if (fpsSelect) {
            fpsSelect.addEventListener('change', (e) => {
                this.config.videoFPS = parseInt(e.target.value);
            });
        }

        // Image format selector
        const imageFormatSelect = this.container.querySelector('#exportImageFormat');
        if (imageFormatSelect) {
            imageFormatSelect.addEventListener('change', (e) => {
                this.config.imageFormat = e.target.value;
            });
        }
    }

    /**
     * Update visibility of settings sections based on selected format
     */
    updateVisibility() {
        const imageSettings = this.container.querySelector('.export-image-settings');
        const videoSettings = this.container.querySelector('.export-video-settings');

        if (this.config.defaultFormat === 'image') {
            imageSettings.style.display = 'block';
            videoSettings.style.display = 'none';
        } else {
            imageSettings.style.display = 'none';
            videoSettings.style.display = 'block';
        }
    }

    /**
     * Get current export configuration
     * @returns {Object} Export configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Set export configuration
     * @param {Object} config - Export configuration
     */
    setConfig(config) {
        this.config = { ...this._getDefaultConfig(), ...config };
        this.render();
    }

    /**
     * Reset to default configuration
     */
    reset() {
        this.config = this._getDefaultConfig();
        this.render();
    }
}
