/*
 * 2D DVD Screensaver Tool - UI Controls
 * Author: Claude Code
 *
 * Handles all UI control event bindings and interactions.
 */

(function() {
    'use strict';

    // Wait for main.js to initialize
    function waitForTool() {
        if (typeof window.dvdScreensaver === 'undefined') {
            setTimeout(waitForTool, 100);
            return;
        }
        initUI();
    }

    function initUI() {
        const { settings } = window.dvdScreensaver;

        console.log('2D DVD Screensaver UI: Initializing controls...');

        // ========== HELPER FUNCTIONS ==========
        function setupSlider(id, settingKey, callback = null, decimals = 1) {
            const element = document.getElementById(id);
            const valueDisplay = document.getElementById(id + '-value');

            if (!element) return;

            element.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                settings[settingKey] = value;
                if (valueDisplay) valueDisplay.textContent = value.toFixed(decimals);
                if (callback) callback(value);
            });
        }

        function setupToggle(id, settingKey, callback = null) {
            const button = document.getElementById(id);
            if (!button) return;

            button.addEventListener('click', () => {
                settings[settingKey] = !settings[settingKey];
                button.setAttribute('aria-pressed', settings[settingKey]);
                if (callback) callback(settings[settingKey]);
            });
        }

        function setupSelect(id, settingKey, callback = null) {
            const element = document.getElementById(id);
            if (!element) return;

            element.addEventListener('change', (e) => {
                settings[settingKey] = e.target.value;
                if (callback) callback(e.target.value);
            });
        }

        function setupColorPicker(id, settingKey, callback = null) {
            const input = document.getElementById(id);
            if (!input) return;

            input.addEventListener('input', (e) => {
                settings[settingKey] = e.target.value;
                if (callback) callback(e.target.value);
            });
        }

        function showElement(id, show = true) {
            const el = document.getElementById(id);
            if (el) el.style.display = show ? 'block' : 'none';
        }

        // ========== SECTION 1: MEDIA SOURCE ==========

        // Combined Media Upload (Image or Video)
        const mediaUpload = document.getElementById('media-upload');
        const mediaInfo = document.getElementById('media-info');
        const mediaName = document.getElementById('media-name');
        const mediaDimensions = document.getElementById('media-dimensions');
        const clearMedia = document.getElementById('clear-media');

        if (mediaUpload) {
            mediaUpload.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        let result;
                        // Check if video by MIME type or file extension (for MOV files)
                        const isVideo = file.type.startsWith('video/') ||
                                       file.name.toLowerCase().endsWith('.mov') ||
                                       file.name.toLowerCase().endsWith('.webm') ||
                                       file.name.toLowerCase().endsWith('.mp4');
                        if (isVideo) {
                            result = await window.dvdScreensaver.mediaManager.loadVideo(file);
                        } else {
                            result = await window.dvdScreensaver.mediaManager.loadImage(file);
                        }
                        if (mediaInfo) mediaInfo.style.display = 'flex';
                        if (mediaName) mediaName.textContent = result.name;
                        if (mediaDimensions) mediaDimensions.textContent = `${result.width} x ${result.height}`;
                    } catch (err) {
                        console.error('Failed to load media:', err);
                        alert('Failed to load media: ' + err.message);
                    }
                }
            });
        }

        if (clearMedia) {
            clearMedia.addEventListener('click', async () => {
                // Reset to default DVD logo
                await window.dvdScreensaver.mediaManager.loadDefault();
                if (mediaInfo) mediaInfo.style.display = 'none';
                if (mediaUpload) mediaUpload.value = '';
            });
        }

        // Object Size
        setupSlider('object-size', 'objectSize', null, 0);

        // ========== SECTION 2: MOVEMENT ==========

        setupSelect('start-position', 'startPosition');
        setupSlider('initial-speed', 'initialSpeed', (value) => {
            window.dvdScreensaver.updateAllObjectSpeeds(value);
        });
        setupSlider('bounce-angle-variation', 'bounceAngleVariation');

        // Add Object Button
        const addObjectBtn = document.getElementById('add-object');
        if (addObjectBtn) {
            addObjectBtn.addEventListener('click', () => {
                window.dvdScreensaver.spawnDVDObject();
            });
        }

        // Reset Button
        const resetBtn = document.getElementById('reset-objects');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                window.dvdScreensaver.resetToDefaults();
            });
        }

        // Debug Bounds Toggle
        const debugBoundsToggle = document.getElementById('debug-bounds-enabled');
        if (debugBoundsToggle) {
            debugBoundsToggle.addEventListener('click', () => {
                const isPressed = debugBoundsToggle.getAttribute('aria-pressed') === 'true';
                debugBoundsToggle.setAttribute('aria-pressed', !isPressed);
                window.dvdScreensaver.toggleDebugBounds(!isPressed);
            });
        }

        // Debug Collider Toggle
        const debugColliderToggle = document.getElementById('debug-collider-enabled');
        if (debugColliderToggle) {
            debugColliderToggle.addEventListener('click', () => {
                const isPressed = debugColliderToggle.getAttribute('aria-pressed') === 'true';
                debugColliderToggle.setAttribute('aria-pressed', !isPressed);
                window.dvdScreensaver.toggleDebugCollider(!isPressed);
            });
        }

        // ========== SECTION 3: BOUNCE EFFECTS ==========

        // Speed Burst
        setupToggle('speed-burst-enabled', 'speedBurstEnabled', (enabled) => {
            showElement('speed-burst-settings', enabled);
        });
        setupSlider('burst-multiplier', 'burstMultiplier', null, 1);
        setupSlider('burst-duration', 'burstDuration', null, 2);
        setupSelect('burst-fade-curve', 'burstFadeCurve');

        // Split
        setupToggle('split-enabled', 'splitEnabled', (enabled) => {
            showElement('split-settings', enabled);
        });
        setupSlider('split-max-objects', 'splitMaxObjects', null, 0);

        // Spin on Hit
        setupToggle('rotation-on-hit-enabled', 'rotationOnHitEnabled', (enabled) => {
            showElement('spin-on-hit-settings', enabled);
        });
        setupToggle('spin-lerp-enabled', 'spinLerpEnabled', (enabled) => {
            showElement('spin-lerp-speed-group', enabled);
        });
        setupSlider('spin-lerp-speed', 'spinLerpSpeed');

        // ========== SECTION 4: TRAIL ==========

        setupToggle('trail-enabled', 'trailEnabled', (enabled) => {
            showElement('trail-settings', enabled);
            window.dvdScreensaver.toggleTrail(enabled);
        });

        // Trail Style selector
        setupSelect('trail-style', 'trailStyle', (value) => {
            showElement('ghost-settings', value === 'ghost');
            showElement('solid-settings', value === 'solid');
            window.dvdScreensaver.setTrailStyle(value);
        });

        // Ghost trail sliders
        setupSlider('ghost-opacity', 'ghostOpacityFade', null, 2);
        setupSlider('ghost-scale', 'ghostScaleFade', null, 2);

        // Solid trail sliders
        setupSlider('solid-spacing', 'solidTrailSpacing', null, 0);
        setupSlider('solid-max', 'solidTrailMaxCopies', null, 0);
        setupSlider('solid-lifespan', 'solidTrailLifespan', null, 1);

        // ========== SECTION 5: ROTATION BEHAVIOR ==========

        // Simple Rotate
        setupToggle('simple-rotate-enabled', 'simpleRotateEnabled', (enabled) => {
            showElement('simple-rotate-settings', enabled);
            // Disable Aligned Hit Side when Simple Rotate is enabled
            if (enabled && settings.alignedHitEnabled) {
                settings.alignedHitEnabled = false;
                const alignedBtn = document.getElementById('aligned-hit-enabled');
                if (alignedBtn) alignedBtn.setAttribute('aria-pressed', 'false');
                showElement('aligned-hit-settings', false);
            }
        });
        setupSlider('spin-speed', 'spinSpeed', null, 0);

        // Aligned Hit Side
        setupToggle('aligned-hit-enabled', 'alignedHitEnabled', (enabled) => {
            showElement('aligned-hit-settings', enabled);
            // Disable Simple Rotate when Aligned Hit Side is enabled
            if (enabled && settings.simpleRotateEnabled) {
                settings.simpleRotateEnabled = false;
                const simpleBtn = document.getElementById('simple-rotate-enabled');
                if (simpleBtn) simpleBtn.setAttribute('aria-pressed', 'false');
                showElement('simple-rotate-settings', false);
            }
        });
        setupSelect('hit-side', 'hitSide');
        setupSelect('aligned-spin-direction', 'alignedHitSpinDirection');

        // ========== SECTION 6: BACKGROUND ==========

        // Background Type - Handled by Chatooly.backgroundManager
        // But we also handle local settings for when running standalone

        setupToggle('transparent-bg', 'bgTransparent', (enabled) => {
            // When transparent is enabled, hide color/image options
            showElement('bg-color-group', !enabled);
            // Add/remove CSS class for transparency
            const canvas = document.getElementById('chatooly-canvas');
            if (canvas) {
                if (enabled) {
                    canvas.classList.add('chatooly-canvas-transparent');
                } else {
                    canvas.classList.remove('chatooly-canvas-transparent');
                }
            }
        });

        setupColorPicker('bg-color', 'bgColor');

        // Background Image Upload
        const bgImageUpload = document.getElementById('bg-image');
        const clearBgImage = document.getElementById('clear-bg-image');
        const bgFitGroup = document.getElementById('bg-fit-group');

        if (bgImageUpload) {
            bgImageUpload.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        await window.dvdScreensaver.setBackgroundImage(file);
                        if (clearBgImage) clearBgImage.style.display = 'block';
                        if (bgFitGroup) bgFitGroup.style.display = 'block';
                    } catch (err) {
                        console.error('Failed to load background image:', err);
                        alert('Failed to load background image: ' + err.message);
                    }
                }
            });
        }

        if (clearBgImage) {
            clearBgImage.addEventListener('click', () => {
                window.dvdScreensaver.clearBackgroundImage();
                clearBgImage.style.display = 'none';
                if (bgFitGroup) bgFitGroup.style.display = 'none';
                if (bgImageUpload) bgImageUpload.value = '';
            });
        }

        setupSelect('bg-fit', 'bgFit');

        // ========== SECTION COLLAPSIBILITY ==========
        setupSectionCollapse();

        console.log('2D DVD Screensaver UI: Controls initialized');
    }

    // Setup collapsible sections
    function setupSectionCollapse() {
        const sectionHeaders = document.querySelectorAll('.chatooly-section-header');

        sectionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.chatooly-section-card');
                const content = section.querySelector('.chatooly-section-content');

                if (content) {
                    const isCollapsed = content.style.display === 'none';
                    content.style.display = isCollapsed ? 'block' : 'none';
                    section.classList.toggle('collapsed', !isCollapsed);
                }
            });
        });
    }

    // Start initialization
    waitForTool();

})();
