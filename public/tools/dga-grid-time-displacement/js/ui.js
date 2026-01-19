/**
 * Grid Time Displacement - UI Handlers
 *
 * Event handlers for all UI controls, section collapsing,
 * and conditional visibility logic.
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // ============================================
    // Utility Functions
    // ============================================

    /**
     * Setup slider with value display
     */
    function setupSlider(id, settingKey, callback = null, decimals = 0) {
        const slider = document.getElementById(id);
        const valueDisplay = document.getElementById(id + '-value');

        if (!slider) return;

        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            settings[settingKey] = value;

            if (valueDisplay) {
                valueDisplay.textContent = decimals > 0 ? value.toFixed(decimals) : value;
            }

            if (callback) callback(value);
        });
    }

    /**
     * Setup toggle switch
     */
    function setupToggle(id, settingKey, callback = null) {
        const toggle = document.getElementById(id);

        if (!toggle) return;

        toggle.addEventListener('click', () => {
            const isPressed = toggle.getAttribute('aria-pressed') === 'true';
            const newValue = !isPressed;

            toggle.setAttribute('aria-pressed', newValue);
            settings[settingKey] = newValue;

            if (callback) callback(newValue);
        });
    }

    /**
     * Setup select dropdown
     */
    function setupSelect(id, settingKey, callback = null) {
        const select = document.getElementById(id);

        if (!select) return;

        select.addEventListener('change', (e) => {
            settings[settingKey] = e.target.value;
            if (callback) callback(e.target.value);
        });
    }

    /**
     * Setup color picker
     */
    function setupColorPicker(id, settingKey, callback = null) {
        const picker = document.getElementById(id);

        if (!picker) return;

        picker.addEventListener('input', (e) => {
            settings[settingKey] = e.target.value;
            if (callback) callback(e.target.value);
        });
    }

    // ============================================
    // Section Collapse Handling
    // ============================================

    document.querySelectorAll('.chatooly-section-header').forEach(header => {
        header.addEventListener('click', () => {
            const card = header.closest('.chatooly-section-card');
            card.classList.toggle('collapsed');
        });
    });

    // ============================================
    // Video/Sequence Upload Controls
    // ============================================

    document.getElementById('video-upload').addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const detected = window.detectMediaType(files);
        if (!detected) {
            alert('Please upload video files (MP4, WebM, MOV) or PNG image sequence.');
            return;
        }

        try {
            if (detected.type === 'video') {
                await window.loadVideo(detected.files[0]);
            } else if (detected.type === 'sequence') {
                await window.loadPNGSequence(detected.files);
            }
            window.updateDisplacementMap();
        } catch (error) {
            console.error('Failed to load media:', error);
            alert('Failed to load media. Please try a different file.');
        }
    });

    document.getElementById('clear-video').addEventListener('click', () => {
        window.clearVideo();
        document.getElementById('video-fit-group').style.display = 'none';
    });

    // Video fit mode dropdown
    setupSelect('video-fit', 'videoFit', () => {
        // Recalculate video rect when fit mode changes
        if (window.recalculateVideoRect) {
            window.recalculateVideoRect();
        }
        if (window.render) window.render();
    });

    // ============================================
    // Grid Settings Controls
    // ============================================

    setupSlider('grid-cols', 'gridCols', () => {
        window.updateDisplacementMap();
    });

    setupSlider('grid-rows', 'gridRows', () => {
        window.updateDisplacementMap();
    });

    // ============================================
    // Grid Appearance Controls
    // ============================================

    setupToggle('show-grid', 'showGrid', (value) => {
        document.getElementById('grid-style-controls').style.display =
            value ? 'block' : 'none';
    });

    setupColorPicker('grid-color', 'gridColor');

    setupSlider('grid-width', 'gridWidth');

    // ============================================
    // Displacement Mode Controls
    // ============================================

    function updateModeVisibility(mode) {
        document.getElementById('random-settings').style.display =
            mode === 'random' ? 'block' : 'none';
        document.getElementById('linear-settings').style.display =
            mode === 'linear' ? 'block' : 'none';
        document.getElementById('circular-settings').style.display =
            mode === 'circular' ? 'block' : 'none';

        window.updateDisplacementMap();
    }

    setupSelect('displacement-mode', 'displacementMode', updateModeVisibility);

    // ============================================
    // Random Mode Controls
    // ============================================

    setupSlider('noise-size', 'noiseSize', () => {
        window.updateDisplacementMap();
    }, 1);

    setupSlider('noise-contrast', 'noiseContrast', () => {
        window.updateDisplacementMap();
    }, 1);

    setupToggle('noise-animated', 'noiseAnimated', (value) => {
        document.getElementById('noise-animation-speed-group').style.display =
            value ? 'block' : 'none';
    });

    setupSlider('noise-speed', 'noiseAnimationSpeed', null, 1);

    document.getElementById('regenerate-noise').addEventListener('click', () => {
        window.regenerateNoise();
    });

    // ============================================
    // Linear Mode Controls
    // ============================================

    setupSelect('linear-direction', 'linearDirection', () => {
        window.updateDisplacementMap();
    });

    setupToggle('linear-from-center', 'linearFromCenter', () => {
        window.updateDisplacementMap();
    });

    // ============================================
    // Circular Mode Controls
    // ============================================

    setupSlider('circular-x', 'circularCenterX', (value) => {
        settings.circularCenterX = value / 100;
        window.updateDisplacementMap();
    });

    setupSlider('circular-y', 'circularCenterY', (value) => {
        settings.circularCenterY = value / 100;
        window.updateDisplacementMap();
    });

    // ============================================
    // Playback Controls
    // ============================================

    setupSlider('max-offset', 'maxFrameOffset');

    document.getElementById('play-pause').addEventListener('click', (e) => {
        const isPlaying = window.togglePlayback();
        e.target.textContent = isPlaying ? 'Pause' : 'Play';
    });

    document.getElementById('restart').addEventListener('click', () => {
        window.restartPlayback();
    });

    // ============================================
    // Background Controls
    // ============================================

    setupToggle('transparent-bg', null, (value) => {
        // Track locally for render functions
        window.bgTransparent = value;

        if (window.Chatooly && window.Chatooly.backgroundManager) {
            Chatooly.backgroundManager.setTransparent(value);
        }

        document.getElementById('bg-color-group').style.display =
            value ? 'none' : 'block';

        if (window.render) window.render();
    });

    setupColorPicker('bg-color', null, (value) => {
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            Chatooly.backgroundManager.setBackgroundColor(value);
        }

        if (window.render) window.render();
    });

    document.getElementById('bg-image').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (window.Chatooly && window.Chatooly.backgroundManager) {
            await Chatooly.backgroundManager.setBackgroundImage(file);
        }

        document.getElementById('clear-bg-image').style.display = 'block';
        document.getElementById('bg-fit-group').style.display = 'block';

        if (window.render) window.render();
    });

    document.getElementById('clear-bg-image').addEventListener('click', () => {
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            Chatooly.backgroundManager.clearBackgroundImage();
        }

        document.getElementById('clear-bg-image').style.display = 'none';
        document.getElementById('bg-fit-group').style.display = 'none';
        document.getElementById('bg-image').value = '';

        if (window.render) window.render();
    });

    setupSelect('bg-fit', null, (value) => {
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            Chatooly.backgroundManager.setFit(value);
        }

        if (window.render) window.render();
    });

    // ============================================
    // Initialize UI State
    // ============================================

    // Set initial mode visibility
    updateModeVisibility(settings.displacementMode);

    console.log('UI handlers initialized');
});
