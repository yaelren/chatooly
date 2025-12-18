/**
 * 3D Pillar Chart Visualizer - UI Controls
 * Author: Claude Code
 *
 * Handles CSV parsing, UI control interactions,
 * and communication with the main Three.js module.
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // ========== COLLAPSIBLE SECTION CARDS ==========
    const sectionHeaders = document.querySelectorAll('.chatooly-section-header');
    sectionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const card = header.closest('.chatooly-section-card');
            if (card) {
                card.classList.toggle('collapsed');
            }
        });
    });

    // ========== CSV PARSING ==========
    function parseCSV(text) {
        const lines = text.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV must have at least a header row and one data row');
        }

        // Parse header
        const headers = parseCSVLine(lines[0]);

        // Parse data rows
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = parseCSVLine(line);
                // Convert numeric values
                const processedRow = values.map((val, idx) => {
                    if (idx === 0) return val; // Keep label as string
                    const num = parseFloat(val.replace(/[,$]/g, ''));
                    return isNaN(num) ? 0 : num;
                });
                rows.push(processedRow);
            }
        }

        return { headers, rows };
    }

    function parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        return values;
    }

    function displayDataPreview(data) {
        const previewContainer = document.getElementById('data-preview');
        const previewContent = document.getElementById('data-preview-content');

        if (!previewContainer || !previewContent) return;

        // Build table
        let html = '<table class="data-preview-table"><thead><tr>';

        // Headers
        data.headers.forEach(h => {
            html += `<th>${escapeHtml(h)}</th>`;
        });
        html += '</tr></thead><tbody>';

        // Rows (max 5)
        const maxRows = Math.min(data.rows.length, 5);
        for (let i = 0; i < maxRows; i++) {
            html += '<tr>';
            data.rows[i].forEach((cell, idx) => {
                const displayVal = idx === 0 ? cell : formatNumber(cell);
                html += `<td>${escapeHtml(displayVal)}</td>`;
            });
            html += '</tr>';
        }

        if (data.rows.length > 5) {
            html += `<tr><td colspan="${data.headers.length}" style="text-align: center; font-style: italic;">... and ${data.rows.length - 5} more rows</td></tr>`;
        }

        html += '</tbody></table>';

        previewContent.innerHTML = html;
        previewContainer.style.display = 'block';

        // Update series colors if multi-series
        updateSeriesColorInputs(data.headers.length - 1);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function formatNumber(num) {
        if (typeof num !== 'number') return num;
        return num.toLocaleString();
    }

    // ========== SERIES COLORS ==========
    function updateSeriesColorInputs(numSeries) {
        const container = document.getElementById('series-colors-container');
        const colorsDiv = document.getElementById('series-colors');
        const seriesBGroup = document.getElementById('series-b-group');

        // Always show the container (Series A color picker is always visible)
        if (container) {
            container.style.display = 'block';
        }

        // Show/hide Series B based on number of series
        if (seriesBGroup) {
            seriesBGroup.style.display = numSeries >= 2 ? 'block' : 'none';
        }

        // Clear the dynamic series colors div (for 3+ series)
        if (colorsDiv) {
            colorsDiv.innerHTML = '';
            colorsDiv.style.display = 'none';
        }
    }

    // ========== CSV UPLOAD HANDLERS ==========
    const csvUpload = document.getElementById('csv-upload');
    const csvDropZone = document.getElementById('csv-drop-zone');

    if (csvUpload) {
        csvUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleCSVFile(file);
        });
    }

    if (csvDropZone) {
        csvDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            csvDropZone.classList.add('drag-over');
        });

        csvDropZone.addEventListener('dragleave', () => {
            csvDropZone.classList.remove('drag-over');
        });

        csvDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            csvDropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.csv')) {
                handleCSVFile(file);
            }
        });
    }

    function handleCSVFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = parseCSV(e.target.result);
                displayDataPreview(data);

                if (window.ChartApp) {
                    window.ChartApp.state.data = data;
                    window.ChartApp.generateChart();
                    window.ChartApp.playEntranceAnimation();
                }
            } catch (error) {
                alert('Error parsing CSV: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    // ========== LOAD SAMPLE DATA ==========
    const loadSampleBtn = document.getElementById('load-sample');
    if (loadSampleBtn) {
        loadSampleBtn.addEventListener('click', () => {
            const sampleData = {
                headers: ['Quarter', 'Revenue', 'Expenses'],
                rows: [
                    ['Q1 2024', 125000, 85000],
                    ['Q2 2024', 148000, 92000],
                    ['Q3 2024', 132000, 88000],
                    ['Q4 2024', 175000, 105000]
                ]
            };

            displayDataPreview(sampleData);

            if (window.ChartApp) {
                window.ChartApp.state.data = sampleData;
                window.ChartApp.generateChart();
                window.ChartApp.playEntranceAnimation();
            }
        });
    }

    // ========== PILLAR SHAPE ==========
    const pillarShapeSelect = document.getElementById('pillar-shape');
    if (pillarShapeSelect) {
        pillarShapeSelect.addEventListener('change', (e) => {
            if (window.ChartApp) {
                window.ChartApp.state.pillarShape = e.target.value;
                window.ChartApp.generateChart();
            }
        });
    }

    // ========== PILLAR WIDTH ==========
    setupSlider('pillar-width', 'pillar-width-value', (value) => {
        if (window.ChartApp) {
            window.ChartApp.state.pillarWidth = parseFloat(value);
            window.ChartApp.generateChart();
        }
    });

    // ========== MATERIAL TYPE ==========
    const materialTypeSelect = document.getElementById('material-type');
    const matcapPresetGroup = document.getElementById('matcap-preset-group');
    const matcapUploadGroup = document.getElementById('matcap-upload-group');
    const customColorGroup = document.getElementById('custom-color-group');

    if (materialTypeSelect) {
        materialTypeSelect.addEventListener('change', (e) => {
            const type = e.target.value;

            // Show/hide relevant UI groups
            if (matcapPresetGroup) {
                matcapPresetGroup.style.display = type === 'matcap' ? 'block' : 'none';
            }
            if (matcapUploadGroup) {
                matcapUploadGroup.style.display = type === 'custom-matcap' ? 'block' : 'none';
            }
            if (customColorGroup) {
                customColorGroup.style.display = type === 'custom' ? 'block' : 'none';
            }

            if (window.ChartApp) {
                window.ChartApp.state.materialTheme = type;

                // Only update materials if not switching to matcap without a texture loaded
                // (wait for user to select a matcap preset first)
                if (type !== 'matcap' || window.ChartApp.state.customMatcapTexture) {
                    window.ChartApp.updateMaterials();
                }
            }
        });
    }

    // Matcap preset dropdown (supports CDN and local matcaps)
    const matcapPresetSelect = document.getElementById('matcap-preset');
    if (matcapPresetSelect) {
        matcapPresetSelect.addEventListener('change', (e) => {
            if (window.ChartApp) {
                window.ChartApp.loadMatcapPreset(e.target.value);
            }
        });
    }

    // Custom matcap upload
    const matcapUpload = document.getElementById('matcap-upload');
    const matcapPreview = document.getElementById('matcap-preview');
    const matcapPreviewImg = document.getElementById('matcap-preview-img');
    const clearMatcapBtn = document.getElementById('clear-matcap');

    if (matcapUpload) {
        matcapUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const dataURL = event.target.result;

                // Show preview
                if (matcapPreviewImg) {
                    matcapPreviewImg.src = dataURL;
                }
                if (matcapPreview) {
                    matcapPreview.style.display = 'flex';
                }

                // Load into Three.js
                if (window.ChartApp) {
                    window.ChartApp.setCustomMatcapTexture(dataURL);
                }
            };
            reader.readAsDataURL(file);
        });
    }

    if (clearMatcapBtn) {
        clearMatcapBtn.addEventListener('click', () => {
            if (matcapPreview) matcapPreview.style.display = 'none';
            if (matcapPreviewImg) matcapPreviewImg.src = '';
            if (matcapUpload) matcapUpload.value = '';

            if (window.ChartApp) {
                window.ChartApp.clearCustomMatcap();
            }
        });
    }

    // Custom color picker
    const customColorInput = document.getElementById('custom-color');
    if (customColorInput) {
        customColorInput.addEventListener('input', (e) => {
            if (window.ChartApp) {
                window.ChartApp.state.seriesColors[0] = e.target.value;
                window.ChartApp.updateMaterials();
            }
        });
    }

    // ========== SERIES COLOR PICKERS ==========
    // Series A color picker
    const seriesColorA = document.getElementById('series-color-a');
    if (seriesColorA) {
        seriesColorA.addEventListener('input', (e) => {
            if (window.ChartApp) {
                window.ChartApp.state.seriesColors[0] = e.target.value;
                window.ChartApp.updateMaterials();
            }
        });
    }

    // Series B color picker
    const seriesColorB = document.getElementById('series-color-b');
    if (seriesColorB) {
        seriesColorB.addEventListener('input', (e) => {
            if (window.ChartApp) {
                window.ChartApp.state.seriesColors[1] = e.target.value;
                window.ChartApp.updateMaterials();
            }
        });
    }

    // ========== HDRI PRESET HANDLER ==========
    const hdriPresetSelect = document.getElementById('hdri-preset');
    if (hdriPresetSelect) {
        hdriPresetSelect.addEventListener('change', (e) => {
            if (window.ChartApp) {
                window.ChartApp.updateHDRIEnvironment(e.target.value);
            }
        });
    }

    // ========== SHOW HDRI AS BACKGROUND TOGGLE ==========
    setupToggle('show-hdri-bg', (enabled) => {
        if (window.ChartApp) {
            window.ChartApp.setShowHdriBackground(enabled);
        }
    });

    // ========== BACKGROUND BLURRINESS SLIDER ==========
    setupSlider('bg-blur', 'bg-blur-value', (value) => {
        if (window.ChartApp) {
            window.ChartApp.setBackgroundBlurriness(parseFloat(value));
        }
    });

    // ========== LABEL CONTROLS ==========
    const labelModeSelect = document.getElementById('label-mode');
    if (labelModeSelect) {
        labelModeSelect.addEventListener('change', (e) => {
            if (window.ChartApp) {
                window.ChartApp.state.labelMode = e.target.value;
                window.ChartApp.updateLabels();
            }
        });
    }

    setupToggle('show-values', (enabled) => {
        if (window.ChartApp) {
            window.ChartApp.state.showValues = enabled;
            window.ChartApp.updateLabels();
        }
    });

    setupToggle('show-labels', (enabled) => {
        if (window.ChartApp) {
            window.ChartApp.state.showLabels = enabled;
            window.ChartApp.updateLabels();
        }
    });

    setupSlider('font-size', 'font-size-value', (value) => {
        if (window.ChartApp) {
            window.ChartApp.state.fontSize = parseInt(value);
            window.ChartApp.updateLabels();
        }
    });

    // Text color picker
    const textColorInput = document.getElementById('text-color');
    if (textColorInput) {
        textColorInput.addEventListener('input', (e) => {
            if (window.ChartApp) {
                window.ChartApp.state.textColor = e.target.value;
                window.ChartApp.updateLabels();
            }
        });
    }

    // ========== EFFECTS ==========
    setupToggle('bloom-toggle', (enabled) => {
        document.getElementById('bloom-intensity-group').style.display = enabled ? 'block' : 'none';
        if (window.ChartApp) {
            window.ChartApp.state.bloomEnabled = enabled;
            window.ChartApp.updateBloom();
        }
    });

    setupSlider('bloom-intensity', 'bloom-intensity-value', (value) => {
        if (window.ChartApp) {
            window.ChartApp.state.bloomIntensity = parseFloat(value);
            window.ChartApp.updateBloom();
        }
    });

    setupToggle('auto-rotate', (enabled) => {
        document.getElementById('rotation-speed-group').style.display = enabled ? 'block' : 'none';
        if (window.ChartApp) {
            window.ChartApp.state.autoRotate = enabled;
        }
    });

    setupSlider('rotation-speed', 'rotation-speed-value', (value) => {
        if (window.ChartApp) {
            window.ChartApp.state.rotationSpeed = parseFloat(value);
        }
    });

    setupToggle('env-reflections', (enabled) => {
        if (window.ChartApp) {
            window.ChartApp.state.envReflections = enabled;
            window.ChartApp.updateMaterials();
        }
    });

    // ========== LAYOUT ==========
    setupSlider('pillar-spacing', 'pillar-spacing-value', (value) => {
        if (window.ChartApp) {
            window.ChartApp.state.pillarSpacing = parseFloat(value);
            window.ChartApp.generateChart();
        }
    });

    setupSlider('group-spacing', 'group-spacing-value', (value) => {
        if (window.ChartApp) {
            window.ChartApp.state.groupSpacing = parseFloat(value);
            window.ChartApp.generateChart();
        }
    });

    setupSlider('group-x-offset', 'group-x-offset-value', (value) => {
        if (window.ChartApp) {
            window.ChartApp.state.groupXOffset = parseFloat(value);
            window.ChartApp.generateChart();
        }
    });

    setupSlider('max-height', 'max-height-value', (value) => {
        if (window.ChartApp) {
            window.ChartApp.state.maxHeight = parseFloat(value);
            window.ChartApp.generateChart();
        }
    });

    // Camera presets
    document.querySelectorAll('[data-camera]').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.camera;
            if (window.ChartApp) {
                window.ChartApp.setCameraPreset(preset);
            }
        });
    });

    // ========== ANIMATION ==========
    const playAnimationBtn = document.getElementById('play-animation');
    if (playAnimationBtn) {
        playAnimationBtn.addEventListener('click', () => {
            if (window.ChartApp) {
                window.ChartApp.playEntranceAnimation();
            }
        });
    }

    const animationStyleSelect = document.getElementById('animation-style');
    if (animationStyleSelect) {
        animationStyleSelect.addEventListener('change', (e) => {
            if (window.ChartApp) {
                window.ChartApp.state.animationStyle = e.target.value;
            }
        });
    }

    setupSlider('animation-duration', 'animation-duration-value', (value) => {
        if (window.ChartApp) {
            window.ChartApp.state.animationDuration = parseFloat(value);
        }
    });

    setupSlider('stagger-delay', 'stagger-delay-value', (value) => {
        if (window.ChartApp) {
            window.ChartApp.state.staggerDelay = parseFloat(value);
        }
    });

    // ========== BACKGROUND CONTROLS ==========
    const transparentToggle = document.getElementById('transparent-bg');
    if (transparentToggle) {
        transparentToggle.addEventListener('click', () => {
            const isPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;

            transparentToggle.setAttribute('aria-pressed', newState);

            // Show/hide background color picker
            const bgColorGroup = document.getElementById('bg-color-group');
            if (bgColorGroup) {
                bgColorGroup.style.display = newState ? 'none' : 'block';
            }

            // Update Chatooly background manager
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setTransparent(newState);
            }

            // Update Three.js scene
            if (window.ChartApp) {
                window.ChartApp.state.bgTransparent = newState;
                window.ChartApp.updateBackground();
            }
        });
    }

    const bgColorInput = document.getElementById('bg-color');
    if (bgColorInput) {
        bgColorInput.addEventListener('input', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setBackgroundColor(e.target.value);
            }
            if (window.ChartApp) {
                window.ChartApp.state.bgColor = e.target.value;
                window.ChartApp.updateBackground();
            }
        });
    }

    const bgImageInput = document.getElementById('bg-image');
    if (bgImageInput) {
        bgImageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                if (window.Chatooly && window.Chatooly.backgroundManager) {
                    await window.Chatooly.backgroundManager.setBackgroundImage(file);
                    document.getElementById('clear-bg-image').style.display = 'block';
                    document.getElementById('bg-fit-group').style.display = 'block';

                    if (window.ChartApp) {
                        window.ChartApp.updateBackground();
                    }
                }
            } catch (error) {
                alert('Failed to load image: ' + error.message);
            }
        });
    }

    const clearBgImageBtn = document.getElementById('clear-bg-image');
    if (clearBgImageBtn) {
        clearBgImageBtn.addEventListener('click', () => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.clearBackgroundImage();
            }
            document.getElementById('clear-bg-image').style.display = 'none';
            document.getElementById('bg-fit-group').style.display = 'none';
            document.getElementById('bg-image').value = '';

            if (window.ChartApp) {
                window.ChartApp.updateBackground();
            }
        });
    }

    const bgFitSelect = document.getElementById('bg-fit');
    if (bgFitSelect) {
        bgFitSelect.addEventListener('change', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setFit(e.target.value);
            }
            if (window.ChartApp) {
                window.ChartApp.updateBackground();
            }
        });
    }

    // ========== HELPER FUNCTIONS ==========
    function setupSlider(sliderId, valueId, callback) {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(valueId);

        if (slider && valueDisplay) {
            slider.addEventListener('input', (e) => {
                valueDisplay.textContent = e.target.value;
                callback(e.target.value);
            });
        }
    }

    function setupToggle(toggleId, callback) {
        const toggle = document.getElementById(toggleId);
        if (toggle) {
            toggle.addEventListener('click', () => {
                const isPressed = toggle.getAttribute('aria-pressed') === 'true';
                const newState = !isPressed;
                toggle.setAttribute('aria-pressed', newState);
                callback(newState);
            });
        }
    }

    // ========== DEBUG: LOG ALL SETTINGS ==========
    function logAllSettings() {
        if (!window.ChartApp) {
            console.log('ChartApp not initialized');
            return;
        }

        const state = window.ChartApp.state;

        // Format state as copyable JS object
        const settings = {
            // Data
            data: state.data,

            // Pillar settings
            pillarShape: state.pillarShape,
            pillarWidth: state.pillarWidth,
            pillarSpacing: state.pillarSpacing,
            groupSpacing: state.groupSpacing,
            groupXOffset: state.groupXOffset,
            maxHeight: state.maxHeight,

            // Material
            materialTheme: state.materialTheme,
            customColor: state.customColor,
            seriesColors: state.seriesColors,
            matcapPreset: state.matcapPreset,

            // Labels
            labelMode: state.labelMode,
            showValues: state.showValues,
            showLabels: state.showLabels,
            fontSize: state.fontSize,
            textColor: state.textColor,

            // Effects
            bloomEnabled: state.bloomEnabled,
            bloomIntensity: state.bloomIntensity,
            autoRotate: state.autoRotate,
            rotationSpeed: state.rotationSpeed,
            envReflections: state.envReflections,

            // Animation
            animationStyle: state.animationStyle,
            animationDuration: state.animationDuration,
            staggerDelay: state.staggerDelay,

            // Background
            bgColor: state.bgColor,
            bgTransparent: state.bgTransparent,

            // HDRI
            hdriPreset: state.hdriPreset,
            showHdriBackground: state.showHdriBackground,
            backgroundBlurriness: state.backgroundBlurriness
        };

        console.log('='.repeat(60));
        console.log('📊 CHART SETTINGS - Copy this to use as defaults:');
        console.log('='.repeat(60));
        console.log(JSON.stringify(settings, null, 2));
        console.log('='.repeat(60));

        // Also log as a formatted JS object for easy copy-paste
        console.log('\n// As JavaScript object:');
        console.log('const defaultState = ' + JSON.stringify(settings, null, 4) + ';');
    }

    // Keyboard shortcut: Ctrl+Shift+D
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            logAllSettings();
        }
    });
});
