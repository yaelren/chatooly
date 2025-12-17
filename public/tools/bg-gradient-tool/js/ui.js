/*
 * Chatooly UI Controls
 * Author: Yael Renous - Studio Video
 *
 * This file handles UI-specific functionality like collapsible sections,
 * control visibility toggles, and other interface interactions.
 */

// Default colors for new shapes
const defaultShapeColors = ['#BAB6FF', '#E1FF97', '#B6D3FE', '#FFB6C1', '#98FB98', '#DDA0DD'];

document.addEventListener('DOMContentLoaded', () => {
    // Setup collapsible section cards
    setupSectionCards();

    // Setup slider value displays
    setupSliderValueDisplays();

    // Setup toggle buttons
    setupToggles();

    // Setup global shape type controls
    setupGlobalShapeType();

    // Setup shape management (add/remove buttons)
    setupShapeManagement();
});

/**
 * Setup collapsible section cards with Chatooly UI pattern
 */
function setupSectionCards() {
    const sectionHeaders = document.querySelectorAll('.chatooly-section-header');

    sectionHeaders.forEach(header => {
        header.addEventListener('click', () => toggleSection(header));
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSection(header);
            }
        });
    });
}

function toggleSection(header) {
    const targetId = header.getAttribute('data-target');
    const content = document.getElementById(targetId);
    if (!content) return;

    const isExpanded = header.getAttribute('aria-expanded') === 'true';
    header.setAttribute('aria-expanded', !isExpanded);
    content.style.display = isExpanded ? 'none' : 'block';
}

/**
 * Setup slider value displays that update in real-time
 */
function setupSliderValueDisplays() {
    const sliderConfigs = [
        { sliderId: 'blur-amount', valueId: 'blur-amount-value', format: (v) => `${v}px` },
        { sliderId: 'movement-speed', valueId: 'movement-speed-value', format: (v) => v },
        { sliderId: 'spacing', valueId: 'spacing-value', format: (v) => `${v}px` },
        { sliderId: 'grain-amount', valueId: 'grain-amount-value', format: (v) => `${v}%` },
        { sliderId: 'polygon-sides', valueId: 'polygon-sides-value', format: (v) => v }
    ];

    sliderConfigs.forEach(config => {
        const slider = document.getElementById(config.sliderId);
        const valueDisplay = document.getElementById(config.valueId);

        if (slider && valueDisplay) {
            slider.addEventListener('input', () => {
                valueDisplay.textContent = config.format(slider.value);
            });
        }
    });
}

/**
 * Setup toggle buttons with Chatooly UI pattern
 */
function setupToggles() {
    // Transparent background toggle
    const transparentToggle = document.getElementById('transparent-bg-toggle');
    if (transparentToggle) {
        transparentToggle.addEventListener('click', () => {
            const isPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
            transparentToggle.setAttribute('aria-pressed', !isPressed);

            // Dispatch change event for main.js to handle
            document.dispatchEvent(new CustomEvent('toggle-change', {
                detail: { id: 'transparent-bg', value: !isPressed }
            }));

            // Hide/show background color group
            const bgColorGroup = document.getElementById('bg-color-group');
            if (bgColorGroup) {
                bgColorGroup.style.display = !isPressed ? 'none' : 'flex';
            }
        });
    }

    // Grain toggle
    const grainToggle = document.getElementById('grain-toggle');
    if (grainToggle) {
        grainToggle.addEventListener('click', () => {
            const isPressed = grainToggle.getAttribute('aria-pressed') === 'true';
            grainToggle.setAttribute('aria-pressed', !isPressed);

            document.dispatchEvent(new CustomEvent('toggle-change', {
                detail: { id: 'grain', value: !isPressed }
            }));

            // Show/hide grain amount slider
            const grainAmountGroup = document.getElementById('grain-amount-group');
            if (grainAmountGroup) {
                grainAmountGroup.style.display = !isPressed ? 'block' : 'none';
            }
        });
    }
}

/**
 * Setup global shape type controls
 */
function setupGlobalShapeType() {
    const shapeTypeSelect = document.getElementById('global-shape-type');
    const polygonSidesGroup = document.getElementById('polygon-sides-group');
    const polygonSidesSlider = document.getElementById('polygon-sides');
    const randomizeAllBtn = document.getElementById('randomize-all');
    const randomCurvedGroup = document.getElementById('random-curved-group');
    const randomCurvedToggle = document.getElementById('random-curved-toggle');

    if (shapeTypeSelect) {
        shapeTypeSelect.addEventListener('change', () => {
            const type = shapeTypeSelect.value;
            const isRandom = type === 'random';

            // Show/hide polygon sides
            if (polygonSidesGroup) {
                polygonSidesGroup.style.display = type === 'polygon' ? 'block' : 'none';
            }

            // Show/hide randomize all button
            if (randomizeAllBtn) {
                randomizeAllBtn.style.display = isRandom ? 'block' : 'none';
            }

            // Show/hide curved/sharp toggle
            if (randomCurvedGroup) {
                randomCurvedGroup.style.display = isRandom ? 'flex' : 'none';
            }

            // Notify main.js
            document.dispatchEvent(new CustomEvent('global-shape-type-change', {
                detail: { type: type }
            }));
        });
    }

    // Curved/Sharp toggle for random shapes
    if (randomCurvedToggle) {
        randomCurvedToggle.addEventListener('click', () => {
            const isPressed = randomCurvedToggle.getAttribute('aria-pressed') === 'true';
            randomCurvedToggle.setAttribute('aria-pressed', !isPressed);

            document.dispatchEvent(new CustomEvent('toggle-change', {
                detail: { id: 'random-curved', value: !isPressed }
            }));
        });
    }

    if (polygonSidesSlider) {
        polygonSidesSlider.addEventListener('input', () => {
            document.dispatchEvent(new CustomEvent('global-polygon-sides-change', {
                detail: { sides: parseInt(polygonSidesSlider.value) }
            }));
        });
    }

    if (randomizeAllBtn) {
        randomizeAllBtn.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('randomize-all-shapes'));
        });
    }
}

/**
 * Setup shape card management (add button only - remove is per-card X button)
 */
function setupShapeManagement() {
    const addBtn = document.getElementById('add-shape');

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const shapesList = document.getElementById('shapes-list');
            const existingShapes = shapesList.querySelectorAll('.shape-card').length;
            const colorIndex = existingShapes % defaultShapeColors.length;
            const shapeId = addShapeCard(defaultShapeColors[colorIndex]);

            // Notify main.js to add shape data
            document.dispatchEvent(new CustomEvent('shape-added', {
                detail: { id: shapeId, color: defaultShapeColors[colorIndex], scale: 1 }
            }));
        });
    }
}

/**
 * Add a new shape card to the UI and return its ID
 */
function addShapeCard(color = '#ffffff') {
    const template = document.getElementById('shape-card-template');
    const shapesList = document.getElementById('shapes-list');

    if (!template || !shapesList) return null;

    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.shape-card');

    // Assign unique ID
    const shapeId = `shape-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    card.setAttribute('data-shape-id', shapeId);

    // Update title
    const shapeCount = shapesList.querySelectorAll('.shape-card').length + 1;
    card.querySelector('.shape-card-title').textContent = `Shape ${shapeCount}`;

    // Set initial color
    const colorInput = card.querySelector('.shape-color');
    if (colorInput) colorInput.value = color;

    // Setup event listeners for this card
    setupShapeCardListeners(card, shapeId);

    // Add to DOM
    shapesList.appendChild(card);

    return shapeId;
}

/**
 * Setup event listeners for a shape card
 */
function setupShapeCardListeners(card, shapeId) {
    const colorInput = card.querySelector('.shape-color');
    const scaleSlider = card.querySelector('.shape-scale');
    const scaleValue = card.querySelector('.shape-scale-value');
    const removeBtn = card.querySelector('.shape-remove-btn');

    // Color change
    if (colorInput) {
        colorInput.addEventListener('input', () => {
            document.dispatchEvent(new CustomEvent('shape-updated', {
                detail: { id: shapeId, property: 'color', value: colorInput.value }
            }));
        });
    }

    // Scale change
    if (scaleSlider && scaleValue) {
        scaleSlider.addEventListener('input', () => {
            scaleValue.textContent = parseFloat(scaleSlider.value).toFixed(1);
            document.dispatchEvent(new CustomEvent('shape-updated', {
                detail: { id: shapeId, property: 'scale', value: parseFloat(scaleSlider.value) }
            }));
        });
    }

    // Remove button
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            const shapesList = document.getElementById('shapes-list');
            const shapes = shapesList.querySelectorAll('.shape-card');

            // Only allow removal if more than 1 shape exists
            if (shapes.length > 1) {
                card.remove();
                updateShapeTitles();

                // Notify main.js
                document.dispatchEvent(new CustomEvent('shape-removed', {
                    detail: { id: shapeId }
                }));
            }
        });
    }
}

/**
 * Update shape card titles after removal
 */
function updateShapeTitles() {
    const shapesList = document.getElementById('shapes-list');
    const cards = shapesList.querySelectorAll('.shape-card');
    cards.forEach((card, index) => {
        card.querySelector('.shape-card-title').textContent = `Shape ${index + 1}`;
    });
}

/**
 * Create initial shapes - called from main.js after init
 * Returns the generated shape IDs so main.js can sync them
 */
window.createInitialShapeCards = function(colors) {
    const shapeIds = [];
    colors.forEach(color => {
        const shapeId = addShapeCard(color);
        shapeIds.push(shapeId);
    });
    return shapeIds;
};
