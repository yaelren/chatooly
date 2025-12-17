/*
 * Paper Scroll Tool - UI Controls
 * Author: Chatooly
 *
 * Handles all UI interactions and control bindings
 */

document.addEventListener('DOMContentLoaded', () => {
    setupImageControls();
    setupPathControls();
    setupPlaneControls();
    setupAnimationControls();
    setupCameraControls();
    setupBackgroundControls();
});

// ========== IMAGE CONTROLS ==========
function setupImageControls() {
    const imageUpload = document.getElementById('image-upload');
    const clearImages = document.getElementById('clear-images');
    const imageList = document.getElementById('image-list');

    // Multiple image upload
    imageUpload.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        for (const file of files) {
            try {
                const imageData = await window.PaperScrollTool.addImage(file);
                addImageToList(imageData);
            } catch (error) {
                console.error('Failed to load image:', error);
            }
        }

        // Clear input so same file can be uploaded again
        e.target.value = '';
    });

    // Clear all images
    clearImages.addEventListener('click', () => {
        window.PaperScrollTool.clearAllImages();
        imageList.innerHTML = '';
    });
}

function addImageToList(imageData) {
    const imageList = document.getElementById('image-list');

    const item = document.createElement('div');
    item.className = 'image-list-item';
    item.dataset.id = imageData.id;
    item.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 8px;
        margin-bottom: 4px;
        background: var(--chatooly-color-surface, #333);
        border-radius: 4px;
        font-size: 12px;
    `;

    const name = document.createElement('span');
    name.textContent = imageData.name.length > 20
        ? imageData.name.substring(0, 17) + '...'
        : imageData.name;
    name.style.overflow = 'hidden';
    name.style.textOverflow = 'ellipsis';
    name.style.whiteSpace = 'nowrap';
    name.style.flex = '1';

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'chatooly-btn';
    removeBtn.style.cssText = `
        padding: 2px 8px;
        min-width: auto;
        margin-left: 8px;
    `;
    removeBtn.addEventListener('click', () => {
        window.PaperScrollTool.removeImage(imageData.id);
        item.remove();
    });

    item.appendChild(name);
    item.appendChild(removeBtn);
    imageList.appendChild(item);
}

// ========== PATH CONTROLS ==========
function setupPathControls() {
    const directionSelect = document.getElementById('direction-select');
    const bendSlider = document.getElementById('bend-slider');
    const bendValue = document.getElementById('bend-value');
    const spacingSlider = document.getElementById('spacing-slider');
    const spacingValue = document.getElementById('spacing-value');
    const fillPathToggle = document.getElementById('fill-path-toggle');
    const fillCountGroup = document.getElementById('fill-count-group');
    const fillCountSlider = document.getElementById('fill-count-slider');
    const fillCountValue = document.getElementById('fill-count-value');

    // Direction
    directionSelect.addEventListener('change', (e) => {
        window.PaperScrollTool.state.direction = e.target.value;
        window.PaperScrollTool.generatePath();
    });

    // Bend Amount
    bendSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        bendValue.textContent = value + '%';
        window.PaperScrollTool.state.bendAmount = value;
        window.PaperScrollTool.generatePath();
    });

    // Plane Spacing
    spacingSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        spacingValue.textContent = value.toFixed(1);
        window.PaperScrollTool.state.planeSpacing = value;
        window.PaperScrollTool.generatePath();
    });

    // Fill Path Toggle
    fillPathToggle.addEventListener('click', () => {
        const isPressed = fillPathToggle.getAttribute('aria-pressed') === 'true';
        const newState = !isPressed;
        fillPathToggle.setAttribute('aria-pressed', newState);
        window.PaperScrollTool.state.fillPath = newState;

        // Show/hide fill count slider
        fillCountGroup.style.display = newState ? 'block' : 'none';

        // Rebuild planes with new setting
        window.PaperScrollTool.rebuildPlanes();
    });

    // Fill Path Count
    fillCountSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        fillCountValue.textContent = value;
        window.PaperScrollTool.state.fillPathCount = value;

        // Rebuild planes if fill mode is active
        if (window.PaperScrollTool.state.fillPath) {
            window.PaperScrollTool.rebuildPlanes();
        }
    });

    // Path Scale
    const pathScaleSlider = document.getElementById('path-scale-slider');
    const pathScaleValue = document.getElementById('path-scale-value');

    pathScaleSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        pathScaleValue.textContent = value.toFixed(1);
        window.PaperScrollTool.state.pathScale = value;
        window.PaperScrollTool.generatePath();
    });

    // Debug Path Toggle
    const debugPathToggle = document.getElementById('debug-path-toggle');

    debugPathToggle.addEventListener('click', () => {
        const isPressed = debugPathToggle.getAttribute('aria-pressed') === 'true';
        const newState = !isPressed;
        debugPathToggle.setAttribute('aria-pressed', newState);
        window.PaperScrollTool.setPathDebugVisible(newState);
    });
}

// ========== PLANE CONTROLS ==========
function setupPlaneControls() {
    const rotationSlider = document.getElementById('rotation-slider');
    const rotationValue = document.getElementById('rotation-value');
    const flexSlider = document.getElementById('flex-slider');
    const flexValue = document.getElementById('flex-value');
    const sizeModeSelect = document.getElementById('size-mode-select');
    const sizeSlider = document.getElementById('size-slider');
    const sizeValue = document.getElementById('size-value');

    // Plane Rotation (X axis)
    rotationSlider.addEventListener('input', (e) => {
        const degrees = parseInt(e.target.value);
        rotationValue.textContent = degrees + '°';
        window.PaperScrollTool.state.planeRotationX = THREE.MathUtils.degToRad(degrees);
    });

    // Paper Flex Intensity
    flexSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        flexValue.textContent = value.toFixed(1);
        window.PaperScrollTool.state.flexIntensity = value;
    });

    // Plane Size Mode
    sizeModeSelect.addEventListener('change', (e) => {
        window.PaperScrollTool.state.sizeMode = e.target.value;
        window.PaperScrollTool.rebuildPlanes();
    });

    // Plane Size
    sizeSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        sizeValue.textContent = value.toFixed(1);
        window.PaperScrollTool.state.planeSize = value;
        window.PaperScrollTool.rebuildPlanes();
    });
}

// ========== ANIMATION CONTROLS ==========
function setupAnimationControls() {
    const playToggle = document.getElementById('play-toggle');
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    const positionSlider = document.getElementById('position-slider');
    const positionValue = document.getElementById('position-value');

    // Play/Pause Toggle
    playToggle.addEventListener('click', () => {
        const isPressed = playToggle.getAttribute('aria-pressed') === 'true';
        const newState = !isPressed;
        playToggle.setAttribute('aria-pressed', newState);
        window.PaperScrollTool.state.isAnimating = newState;
    });

    // Conveyor Speed
    speedSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        speedValue.textContent = value.toFixed(2);
        window.PaperScrollTool.state.speed = value;
    });

    // Manual Position (when not animating)
    positionSlider.addEventListener('input', (e) => {
        if (!window.PaperScrollTool.state.isAnimating) {
            const value = parseInt(e.target.value);
            positionValue.textContent = value + '%';
            window.PaperScrollTool.state.conveyorPosition = value / 100;
        }
    });
}

// ========== CAMERA CONTROLS ==========
function setupCameraControls() {
    const orbitToggle = document.getElementById('orbit-toggle');
    const resetCamera = document.getElementById('reset-camera');

    // Orbit Controls Toggle
    orbitToggle.addEventListener('click', () => {
        const isPressed = orbitToggle.getAttribute('aria-pressed') === 'true';
        const newState = !isPressed;
        orbitToggle.setAttribute('aria-pressed', newState);
        window.PaperScrollTool.setOrbitEnabled(newState);
    });

    // Reset Camera
    resetCamera.addEventListener('click', () => {
        window.PaperScrollTool.resetCamera();
    });
}

// ========== BACKGROUND CONTROLS ==========
function setupBackgroundControls() {
    const transparentToggle = document.getElementById('transparent-bg');
    const bgColor = document.getElementById('bg-color');
    const bgImage = document.getElementById('bg-image');
    const clearBgImage = document.getElementById('clear-bg-image');
    const bgFit = document.getElementById('bg-fit');
    const bgColorGroup = document.getElementById('bg-color-group');
    const bgFitGroup = document.getElementById('bg-fit-group');

    // Transparent Background Toggle
    transparentToggle.addEventListener('click', () => {
        const isPressed = transparentToggle.getAttribute('aria-pressed') === 'true';
        const newState = !isPressed;
        transparentToggle.setAttribute('aria-pressed', newState);

        if (window.Chatooly && window.Chatooly.backgroundManager) {
            window.Chatooly.backgroundManager.setTransparent(newState);
        }

        // Show/hide background color picker
        bgColorGroup.style.display = newState ? 'none' : 'block';

        window.PaperScrollTool.updateBackground();
    });

    // Background Color
    bgColor.addEventListener('input', (e) => {
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            window.Chatooly.backgroundManager.setBackgroundColor(e.target.value);
        }
        window.PaperScrollTool.updateBackground();
    });

    // Background Image Upload
    bgImage.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                await window.Chatooly.backgroundManager.setBackgroundImage(file);
            }
            clearBgImage.style.display = 'block';
            bgFitGroup.style.display = 'block';
            window.PaperScrollTool.updateBackground();
        } catch (error) {
            console.error('Failed to load background image:', error);
            alert('Failed to load image: ' + error.message);
        }
    });

    // Clear Background Image
    clearBgImage.addEventListener('click', () => {
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            window.Chatooly.backgroundManager.clearBackgroundImage();
        }
        clearBgImage.style.display = 'none';
        bgFitGroup.style.display = 'none';
        bgImage.value = '';
        window.PaperScrollTool.updateBackground();
    });

    // Background Fit Mode
    bgFit.addEventListener('change', (e) => {
        if (window.Chatooly && window.Chatooly.backgroundManager) {
            window.Chatooly.backgroundManager.setFit(e.target.value);
        }
        window.PaperScrollTool.updateBackground();
    });
}
