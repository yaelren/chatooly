/*
 * Chatooly UI Controls
 * Author: Yael Renous - Studio Video
 *
 * This file handles UI-specific functionality like collapsible sections,
 * control visibility toggles, and other interface interactions.
 *
 * 🤖 AI AGENTS: Put UI control logic here, NOT in main.js
 * - Collapsible sections
 * - Show/hide control groups
 * - Button interactions that don't affect canvas
 * - Form validation and UI state management
 */

// Setup collapsible sections
document.addEventListener('DOMContentLoaded', () => {
    const backgroundHeader = document.getElementById('background-header');
    const backgroundSection = document.getElementById('background-section');

    if (backgroundHeader && backgroundSection) {
        backgroundHeader.style.cursor = 'pointer';

        backgroundHeader.addEventListener('click', () => {
            const isOpen = backgroundSection.style.display !== 'none';
            backgroundSection.style.display = isOpen ? 'none' : 'block';

            const toggle = backgroundHeader.querySelector('.section-toggle');
            if (toggle) {
                toggle.textContent = isOpen ? '▶' : '▼';
            }
        });
    }

    // Monochrome toggle - show/hide multi-color controls (inverse: show when NOT monochrome)
    const monochromeToggle = document.getElementById('monochrome');
    const multiColorControls = document.getElementById('multi-color-controls');
    if (monochromeToggle && multiColorControls) {
        monochromeToggle.addEventListener('change', (e) => {
            multiColorControls.style.display = e.target.checked ? 'none' : 'block';
        });
    }

    // Animation toggle - show/hide speed and percentage controls
    const animatedToggle = document.getElementById('animated');
    const speedControl = document.getElementById('speed-control');
    const percentageControl = document.getElementById('percentage-control');
    if (animatedToggle) {
        animatedToggle.addEventListener('change', (e) => {
            if (speedControl) speedControl.style.display = e.target.checked ? 'block' : 'none';
            if (percentageControl) percentageControl.style.display = e.target.checked ? 'block' : 'none';
        });
    }

    // Animation speed display
    const speedSlider = document.getElementById('animation-speed');
    const speedValue = document.getElementById('speed-value');
    if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', (e) => {
            speedValue.textContent = e.target.value;
        });
    }

    // Animation percentage display
    const percentageSlider = document.getElementById('animation-percentage');
    const percentageValue = document.getElementById('percentage-value');
    if (percentageSlider && percentageValue) {
        percentageSlider.addEventListener('input', (e) => {
            percentageValue.textContent = e.target.value + '%';
        });
    }

    // Cell size display
    const cellSizeSlider = document.getElementById('cell-size');
    const cellSizeValue = document.getElementById('cell-size-value');
    if (cellSizeSlider && cellSizeValue) {
        cellSizeSlider.addEventListener('input', (e) => {
            cellSizeValue.textContent = e.target.value;
        });
    }

    // Brightness display
    const brightnessSlider = document.getElementById('brightness');
    const brightnessValue = document.getElementById('brightness-value');
    if (brightnessSlider && brightnessValue) {
        brightnessSlider.addEventListener('input', (e) => {
            brightnessValue.textContent = e.target.value;
        });
    }

    // Contrast display
    const contrastSlider = document.getElementById('contrast');
    const contrastValue = document.getElementById('contrast-value');
    if (contrastSlider && contrastValue) {
        contrastSlider.addEventListener('input', (e) => {
            contrastValue.textContent = e.target.value;
        });
    }

    // Dither intensity display
    const ditherIntensitySlider = document.getElementById('dither-intensity');
    const ditherIntensityValue = document.getElementById('dither-intensity-value');
    if (ditherIntensitySlider && ditherIntensityValue) {
        ditherIntensitySlider.addEventListener('input', (e) => {
            ditherIntensityValue.textContent = e.target.value + '%';
        });
    }

});
