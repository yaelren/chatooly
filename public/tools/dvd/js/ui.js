/*
 * Chatooly UI Controls
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize standard background controls
    const canvas = document.getElementById('chatooly-canvas');
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        Chatooly.backgroundManager.init(canvas);
        
        const transparentToggle = document.getElementById('transparent-bg');
        if (transparentToggle) {
            transparentToggle.addEventListener('click', (e) => {
                const isPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
                const newState = !isPressed;
                transparentToggle.setAttribute('aria-pressed', newState);
                Chatooly.backgroundManager.setTransparent(newState);
                // No bg-color-group anymore, but handled if exists
                const bgColorGroup = document.getElementById('bg-color-group');
                if (bgColorGroup) bgColorGroup.style.display = newState ? 'none' : 'block';
            });
        }
        
        const bgFitSelect = document.getElementById('bg-fit');
        if (bgFitSelect) {
            bgFitSelect.addEventListener('change', (e) => {
                // Update both standard manager and our custom state
                if (window.Chatooly && Chatooly.backgroundManager) {
                    Chatooly.backgroundManager.setFit(e.target.value);
                }
                if (window.toolState) {
                    window.toolState.bgFit = e.target.value;
                }
            });
        }
    }

    // --- Collapsible Sections ---
    // Make headers toggle their content
    document.querySelectorAll('.chatooly-section-header').forEach(header => {
        header.style.cursor = 'pointer';
        // Add indicator arrow if not present (optional style enhancement)
        // header.innerHTML = '▼ ' + header.innerHTML; 
        
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            if (content && content.classList.contains('chatooly-section-content')) {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
            }
        });
    });

    // --- DVD Tool Specific Bindings ---
    const state = window.toolState;
    const bind = (id, prop, type='string', callback=null) => {
        const elem = document.getElementById(id);
        if(!elem) return;
        elem.addEventListener('input', e => {
            let val = e.target.value;
            if(type === 'int') val = parseInt(val);
            if(type === 'float') val = parseFloat(val);
            if (window.toolState) window.toolState[prop] = val;
            if(callback) callback(val);
        });
    };

    // Helper for toggles
    const bindToggle = (id, prop, callback=null) => {
        const btn = document.getElementById(id);
        if(!btn) return;
        btn.addEventListener('click', () => {
            const isPressed = btn.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            btn.setAttribute('aria-pressed', newState);
            
            // Special handling for bgModeToggle to update state string
            if (prop === 'bgMode') {
                if (window.toolState) window.toolState.bgMode = newState ? 'image' : 'color';
                if (callback) callback(newState);
            } else {
                if (window.toolState) window.toolState[prop] = newState;
                if (callback) callback(newState);
            }
        });
    };

    // Content Controls
    document.querySelectorAll('input[name="contentType"]').forEach(r => {
        r.addEventListener('change', e => {
            if (window.toolState) {
                window.toolState.contentType = e.target.value;
                
                const isTextLike = window.toolState.contentType === 'text' || window.toolState.contentType === 'clock';
                document.getElementById('textControls').classList.toggle('hidden', !isTextLike);
                document.getElementById('textContentWrapper').classList.toggle('hidden', window.toolState.contentType !== 'text');
                document.getElementById('imageControls').classList.toggle('hidden', window.toolState.contentType !== 'image');
                
                // Re-init elements
                if (window.toolElements) {
                    window.toolElements.forEach(el => {
                        if(window.toolState.contentType === 'clock') el.displayedTime = new Date().toLocaleTimeString();
                        el.measure();
                        el.initChars();
                    });
                }
            }
        });
    });

    bind('textContent', 'text', 'string', () => window.toolElements.forEach(el => { el.measure(); el.initChars(); }));
    bind('fontSize', 'fontSize', 'int', () => window.toolElements.forEach(el => { el.measure(); el.initChars(); }));
    bind('fontFamily', 'font', 'string', () => window.toolElements.forEach(el => { el.measure(); el.initChars(); }));
    bind('textColor', 'textColor');
    bind('textAlign', 'textAlign', 'string', () => window.toolElements.forEach(el => { el.measure(); el.initChars(); }));
    bind('letterSpacing', 'letterSpacing', 'int', () => window.toolElements.forEach(el => { el.measure(); el.initChars(); }));
    bind('lineHeight', 'lineHeight', 'float', () => window.toolElements.forEach(el => { el.measure(); el.initChars(); }));
    
    // Helper for Palette UI
    const initPaletteUI = (inputId, addBtnId, containerId, stateProp) => {
        const input = document.getElementById(inputId);
        const addBtn = document.getElementById(addBtnId);
        const container = document.getElementById(containerId);

        // --- NEW: Live Update for Background Color Input ---
        if (stateProp === 'bgColorPalette' && input) {
            input.addEventListener('input', (e) => {
                const color = e.target.value;
                if (window.Chatooly && Chatooly.backgroundManager) {
                    Chatooly.backgroundManager.setBackgroundColor(color);
                }
                
                // If user is picking a color, assume they want to be in 'color' mode
                if (window.toolState && window.toolState.bgMode === 'image') {
                     const toggle = document.getElementById('bgModeToggle');
                     if (toggle && toggle.getAttribute('aria-pressed') === 'true') {
                         toggle.click(); // Switch to color mode
                     }
                }
            });
        }
        
        const render = () => {
            container.innerHTML = '';
            const colors = window.toolState[stateProp] || [];
            
            if (colors.length === 0) {
                container.innerHTML = '<span style="font-size:11px; opacity:0.5; padding:4px;">No colors added</span>';
                return;
            }

            colors.forEach((color, index) => {
                const item = document.createElement('div');
                item.className = 'palette-item';
                item.style.backgroundColor = color;
                item.title = color + " (Click to remove)";
                item.addEventListener('click', () => {
                    window.toolState[stateProp].splice(index, 1);
                    render();
                });
                container.appendChild(item);
            });
        };
        
        addBtn.addEventListener('click', () => {
            const color = input.value;
            if (!window.toolState[stateProp]) window.toolState[stateProp] = [];
            window.toolState[stateProp].push(color);
            
            // Special handling for Background Palette: 
            // If it's the first color added, set it as background immediately
            if (stateProp === 'bgColorPalette' && window.toolState[stateProp].length === 1 && window.Chatooly) {
                Chatooly.backgroundManager.setBackgroundColor(color);
            }
            
            render();
        });
        
        // Initial Render
        render();
    };

    // Init Palettes
    initPaletteUI('paletteColor_Text', 'btnAddPalette_Text', 'paletteContainer_Text', 'textColorPalette');
    initPaletteUI('paletteColor_Bg', 'btnAddPalette_Bg', 'paletteContainer_Bg', 'bgColorPalette');
    
    // Ensure background palette input matches current background on init
    const bgInput = document.getElementById('paletteColor_Bg');
    if (bgInput) {
        // Default is usually black #000000 from main.js, sync it just in case
        bgInput.value = '#000000';
    }

    // Set initial background color from palette if exists
    if (window.toolState && window.toolState.bgColorPalette && window.toolState.bgColorPalette.length > 0 && window.Chatooly) {
         Chatooly.backgroundManager.setBackgroundColor(window.toolState.bgColorPalette[0]);
         if (bgInput) bgInput.value = window.toolState.bgColorPalette[0];
    }

    bindToggle('changeColorOnHit', 'changeColorOnHit');
    
    bindToggle('enableHighlight', 'highlight', (checked) => {
        document.getElementById('highlightColor').classList.toggle('hidden', !checked);
        window.toolElements.forEach(el => el.measure());
    });
    bind('highlightColor', 'highlightColor');
    
    // Helper to load media (Image or Video)
    const loadMedia = (file) => {
        return new Promise((resolve) => {
            const isVideo = file.type.startsWith('video/');
            const url = URL.createObjectURL(file);
            
            if (isVideo) {
                const vid = document.createElement('video');
                vid.src = url;
                vid.loop = true;
                vid.muted = true;
                vid.autoplay = true;
                vid.playsInline = true;
                vid.onloadeddata = () => {
                    vid.play().catch(e => console.warn("Video play failed", e));
                    resolve(vid);
                };
            } else {
                const img = new Image();
                img.src = url;
                img.onload = () => resolve(img);
            }
        });
    };

    // Helper to create preview with remove button
    const createPreview = (file, container, onRemove) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'media-preview-wrapper';
        
        const isVideo = file.type.startsWith('video/');
        const el = isVideo ? document.createElement('video') : document.createElement('img');
        el.src = URL.createObjectURL(file);
        el.className = 'media-preview-item';
        if (isVideo) {
            el.muted = true;
            el.loop = true;
            el.autoplay = true;
        }
        
        const removeBtn = document.createElement('div');
        removeBtn.className = 'media-remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            wrapper.remove();
            if (onRemove) onRemove();
        };
        
        wrapper.appendChild(el);
        wrapper.appendChild(removeBtn);
        container.appendChild(wrapper);
    };

    // Main Content Image Upload
    document.getElementById('imageUpload').addEventListener('change', async e => {
        const f = e.target.files[0]; 
        // Clear input so same file can be selected again if needed
        e.target.value = ''; 
        
        if(!f) return;
        
        // Preview
        const container = document.getElementById('imageContentPreview');
        container.innerHTML = '';
        createPreview(f, container, () => {
            // On remove
            if (window.toolState) window.toolState.img = null;
        });
        
        // Load for Canvas
        const media = await loadMedia(f);
        if (window.toolState) window.toolState.img = media;
        if (window.toolElements) window.toolElements.forEach(el => el.measure());
    });
    bind('imageSize', 'imgHeight', 'int', () => window.toolElements.forEach(el => el.measure()));

    // Behavior Controls
    bindToggle('enableExplosions', 'explosions');
    bindToggle('enableDeterioration', 'deterioration', (checked) => {
        document.getElementById('detOptions').classList.toggle('hidden', !checked);
        if(!checked && window.toolElements) {
            window.toolElements.forEach(el => { el.chaosLevel = 0; el.rotation = 0; el.initChars(); });
        }
    });
    document.querySelectorAll('input[name="detSeverity"]').forEach(r => {
        r.addEventListener('change', e => { if (window.toolState) window.toolState.detSeverity = e.target.value; });
    });

    bindToggle('enableSplitting', 'enableSplitting', (checked) => {
        document.getElementById('splitOptions').classList.toggle('hidden', !checked);
    });
    bind('splitGenerations', 'splitGenerations', 'int');
    bind('splitChildren', 'splitChildren', 'int');
    bind('splitScale', 'splitScale', 'float');

    bindToggle('enableTrails', 'trails', (checked) => {
        document.getElementById('trailOptions').classList.toggle('hidden', !checked);
    });
    bind('trailLength', 'trailAlpha', 'int');
    
    bindToggle('enableGlow', 'glow');

    // Performance
    bind('fpsControl', 'fps', 'int', (val) => {
        document.getElementById('fpsValue').innerText = val;
    });
    bind('speed', 'speed', 'int', (val) => {
        if (window.toolElements) {
            window.toolElements.forEach(el => {
                el.dx = (el.dx > 0 ? 1 : -1) * val;
                el.dy = (el.dy > 0 ? 1 : -1) * val;
            });
        }
    });
    
    document.getElementById('btnPause').addEventListener('click', (e) => {
        if (window.toolState) {
            window.toolState.running = !window.toolState.running;
            e.target.innerText = window.toolState.running ? "PAUSE" : "RESUME";
            if(window.toolState.running) {
                // Main loop will be restarted if necessary in main.js
            }
        }
    });
    
    document.getElementById('btnReset').addEventListener('click', () => {
        if (window.restartTool) window.restartTool();
        if (window.toolState) window.toolState.lastBgSwitchTime = 0;
    });
    
    // Updated Background Controls
    bindToggle('bgModeToggle', 'bgMode', (val) => {
        // val is boolean (pressed = true). 
        // We want 'image' if true, 'color' if false.
        const mode = val ? 'image' : 'color';
        // Logic handled inside bindToggle special case above but duplicating logic here for clarity if needed
        
        // If switched to color, ensure background color is correct
        if (mode === 'color' && window.toolState && window.Chatooly && Chatooly.backgroundManager) {
            const color = (window.toolState.bgColorPalette && window.toolState.bgColorPalette.length > 0) 
                         ? window.toolState.bgColorPalette[0] : '#000000';
            Chatooly.backgroundManager.setBackgroundColor(color);
        }
    });

    bindToggle('bgAnimationOnHit', 'bgAnimationOnHit');
    
    // --- Background Pool & Foreground ---
    document.getElementById('bgPoolUpload').addEventListener('change', async e => {
        const files = Array.from(e.target.files);
        // Clear input so same files can be re-selected
        e.target.value = '';
        
        if (files.length === 0) return;
        
        const previewContainer = document.getElementById('bgPoolPreview');
        // Note: We do NOT clear previous previews here to allow appending
        
        // Ensure pool exists
        if (!window.toolState) return;
        if (!window.toolState.bgPool) window.toolState.bgPool = [];
        
        // Show Image Fit controls if hidden
        const fitGroup = document.getElementById('bg-fit-group');
        if (fitGroup) fitGroup.style.display = 'block';
        
        for (const f of files) {
            // Load Media first
            const media = await loadMedia(f);
            
            // Add to pool
            window.toolState.bgPool.push(media);
            
            // Set as current immediately so user sees the change
            window.toolState.currentBgFromPool = media;
            
            // Create Preview with remove logic
            createPreview(f, previewContainer, () => {
                // Find and remove from array
                const index = window.toolState.bgPool.indexOf(media);
                if (index > -1) {
                    window.toolState.bgPool.splice(index, 1);
                    
                    // If we removed the current background, update it
                    if (window.toolState.currentBgFromPool === media) {
                        if (window.toolState.bgPool.length > 0) {
                            // Switch to another one
                            window.toolState.currentBgFromPool = window.toolState.bgPool[0];
                        } else {
                            // No images left
                            window.toolState.currentBgFromPool = null;
                        }
                    }
                }
            });
        }
        
        // Auto-switch to Image Mode if files are uploaded
        if (window.toolState.bgMode !== 'image') {
             const toggle = document.getElementById('bgModeToggle');
             if (toggle && toggle.getAttribute('aria-pressed') !== 'true') {
                 toggle.click(); // Trigger click to update UI state properly
             }
        }
    });

    document.getElementById('fgUpload').addEventListener('change', async e => {
        const f = e.target.files[0]; 
        e.target.value = '';
        
        if(!f) return;
        
        // Preview
        const container = document.getElementById('fgPreview');
        container.innerHTML = '';
        
        // Load first
        const media = await loadMedia(f);
        if (window.toolState) window.toolState.fgImage = media;
        
        createPreview(f, container, () => {
            if (window.toolState) window.toolState.fgImage = null;
        });
    });
});

