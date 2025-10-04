/*
 * Text Waves - Pattern Presets
 * Predefined wave pattern configurations
 */

// ===== Pattern Presets Configuration =====
const PATTERN_PRESETS = {
    wave: {
        name: 'Wave',
        h: { type: 'none', amplitude: 0, frequency: 0.02, speed: 0 },
        v: { type: 'sine', amplitude: 50, frequency: 0.02, speed: 1 }
    },
    circle: {
        name: 'Circle',
        h: { type: 'sine', amplitude: 100, frequency: 0.02, speed: 1 },
        v: { type: 'cosine', amplitude: 100, frequency: 0.02, speed: 1 }
    },
    bounce: {
        name: 'Bounce',
        h: { type: 'none', amplitude: 0, frequency: 0.02, speed: 0 },
        v: { type: 'tangent', amplitude: 80, frequency: 0.015, speed: 1 }
    },
    zigzag: {
        name: 'Zigzag',
        h: { type: 'tangent', amplitude: 60, frequency: 0.03, speed: 1 },
        v: { type: 'tangent', amplitude: 60, frequency: 0.025, speed: 1 }
    },
    figure8: {
        name: 'Figure-8',
        h: { type: 'sine', amplitude: 80, frequency: 0.02, speed: 1 },
        v: { type: 'sine', amplitude: 80, frequency: 0.04, speed: 1 }
    },
    spiral: {
        name: 'Spiral',
        h: { type: 'sine', amplitude: 100, frequency: 0.02, speed: 1.5 },
        v: { type: 'sine', amplitude: 100, frequency: 0.02, speed: 0.5 }
    },
    infinity: {
        name: 'Infinity',
        h: { type: 'sine', amplitude: 100, frequency: 0.01, speed: 1 },
        v: { type: 'sine', amplitude: 50, frequency: 0.02, speed: 1 }
    },
    'vertical-wave': {
        name: 'Vertical Wave',
        h: { type: 'sine', amplitude: 50, frequency: 0.02, speed: 1 },
        v: { type: 'none', amplitude: 0, frequency: 0.02, speed: 0 }
    },
    straight: {
        name: 'Straight',
        h: { type: 'none', amplitude: 0, frequency: 0.02, speed: 0 },
        v: { type: 'none', amplitude: 0, frequency: 0.02, speed: 0 }
    }
};

// Preset system state (exposed globally for UI.js)
window.isApplyingPreset = false;
window.overallSpeedMultiplier = 1;
window.patternSizeMultiplier = 50;
window.baseAmplitudeX = 50;
window.baseAmplitudeY = 50;
window.baseSpeedX = 1;
window.baseSpeedY = 1;
