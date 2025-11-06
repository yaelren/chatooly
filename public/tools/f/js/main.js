/*
 * Your Tool Name - Main Logic
 * Author: Your Name
 *
 * This is where you write your tool's functionality.
 *
 * IMPORTANT REMINDERS:
 *
 * 1. Canvas Element:
 *    - Your visual output must use id="chatooly-canvas"
 *    - This is what gets exported as PNG
 *
 * 2. Canvas Resize Events:
 *    - Listen for 'chatooly:canvas-resized' event if using interactive canvas
 *    - Scale your elements when canvas dimensions change
 *
 * 3. Mouse Coordinates:
 *    - Use window.Chatooly.utils.mapMouseToCanvas(event, canvas) for accurate coords
 *
 * 4. High-Res Export (optional):
 *    - Define window.renderHighResolution(targetCanvas, scale) for better exports
 *
 * Check START_HERE.md for complete documentation and examples.
 */

// ========== CANVAS INITIALIZATION ==========
// CRITICAL: Set canvas dimensions BEFORE Chatooly CDN initializes
// This prevents the canvas from defaulting to 150x300px (browser default)
const canvas = document.getElementById('chatooly-canvas');
canvas.width = 1920;   // HD resolution width (1920x1080)
canvas.height = 1080;  // HD resolution height

// ========== BACKGROUND SYSTEM ==========
// AI AGENT: Initialize background manager here
// Chatooly.backgroundManager.init(canvas);
//
// Then connect these event listeners (see claude-rules/08-background-system.md):
// - transparent-bg (toggle button - use getAttribute('aria-pressed') to check state)
// - bg-color (color picker)
// - bg-image (file upload)
// - clear-bg-image (X button)
// - bg-fit (dropdown)
//
// Don't forget to render background FIRST in your render loop!

// Your tool code goes below this line
// ==========================================