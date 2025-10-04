/*
 * Text Waves - Main Logic
 * Create animated text flowing along customizable wave patterns
 */

const canvas = document.getElementById('chatooly-canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 1200;
canvas.height = 800;

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

// Preset system state
let isApplyingPreset = false; // Flag to prevent auto-switch during preset application
let overallSpeedMultiplier = 1;
let patternSizeMultiplier = 50; // Start at default pattern size
let baseAmplitudeX = 50; // Store base amplitudes for preset
let baseAmplitudeY = 50;
let baseSpeedX = 1; // Store base speeds for preset
let baseSpeedY = 1;

// Text Waves Tool State
const tool = {
    text: 'studio video //',
    splitMode: 'character',
    textFlow: 'horizontal', // 'horizontal' or 'vertical'
    waveTypeX: 'sine',
    waveTypeY: 'sine',
    amplitudeX: 100,
    amplitudeY: 50,
    frequencyX: 0.01,
    frequencyY: 0.02,
    speedX: 1,
    speedY: 1,
    repetitions: 10,
    textColors: ['#FFFFFF'], // White
    blendMode: 'difference',
    fontFamily: 'Wix Madefor Text',
    fontSize: 24,
    fontWeight: 'bold',
    fontStyle: 'normal',
    textHighlight: false,
    highlightColor: '#FFFF00',
    letterSpacing: -0.1,
    bgColor: '#CCFD50', // Neon green background
    bgTransparent: false,
    bgImage: null,
    bgFit: 'cover',
    segmentIcon: null,
    iconSize: 20,
    rotateText: true,
    direction: 'right', // 'right', 'left', or 'none'
    showWavePath: true,
    waveShape: 'circle',
    waveColor: '#FF1493', // Hot pink
    waveOpacity: 0.31,
    waveMarkerSize: 60,
    timeX: 0,
    timeY: 0
};

// Entrance animation state
let entranceProgress = 0; // 0 = centered, 1 = fully split
const ENTRANCE_DURATION = 60; // frames for entrance animation
let isEntranceAnimating = true;
let entranceSpeed = 1; // Speed multiplier for entrance animation
let entranceType = 'split'; // Type of entrance animation
let entranceEasing = 'linear'; // Easing function to use
let entranceDelay = 0; // Delay in seconds before starting entrance
let entranceDelayFrames = 0; // Frame counter for delay

// Function to reset entrance animation
function resetEntranceAnimation() {
    entranceProgress = 0;
    isEntranceAnimating = true;
    entranceDelayFrames = entranceDelay * 60; // Convert seconds to frames (60fps)
}

// Easing functions
const easingFunctions = {
    linear: (t) => t,
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeInCubic: (t) => t * t * t,
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
    easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
    easeOutBack: (t) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    easeInOutBack: (t) => {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        return t < 0.5
            ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
            : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
    },
    easeOutElastic: (t) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
};

// Wave calculation functions
function calculateWave(type, value) {
    switch(type) {
        case 'sine':
            return Math.sin(value);
        case 'cosine':
            return Math.cos(value);
        case 'tangent':
            // Clamp tangent to prevent extreme values
            const tan = Math.tan(value);
            return Math.max(-2, Math.min(2, tan));
        case 'none':
            return 0;
        default:
            return 0;
    }
}

// Calculate wave derivative for rotation
function calculateWaveDerivative(type, value, amplitude, frequency) {
    switch(type) {
        case 'sine':
            return Math.cos(value) * amplitude * frequency;
        case 'cosine':
            return -Math.sin(value) * amplitude * frequency;
        case 'tangent':
            const sec = 1 / Math.cos(value);
            return Math.max(-2, Math.min(2, sec * sec * amplitude * frequency));
        case 'none':
            return 0;
        default:
            return 0;
    }
}

// Split text based on mode
function splitText(text, mode) {
    switch(mode) {
        case 'character':
            return text.split('');
        case 'word':
            return text.split(/(\s+)/);
        case 'sentence':
            return text.split(/([.!?]+\s*)/);
        default:
            return text.split('');
    }
}

// Draw background with proper fit
function drawBackground() {
    // If transparent background is enabled, clear to transparent
    if (tool.bgTransparent) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    if (tool.bgImage) {
        const imgAspect = tool.bgImage.width / tool.bgImage.height;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (tool.bgFit === 'cover') {
            if (imgAspect > canvasAspect) {
                drawHeight = canvas.height;
                drawWidth = drawHeight * imgAspect;
                offsetX = -(drawWidth - canvas.width) / 2;
                offsetY = 0;
            } else {
                drawWidth = canvas.width;
                drawHeight = drawWidth / imgAspect;
                offsetX = 0;
                offsetY = -(drawHeight - canvas.height) / 2;
            }
        } else if (tool.bgFit === 'contain') {
            if (imgAspect > canvasAspect) {
                drawWidth = canvas.width;
                drawHeight = drawWidth / imgAspect;
                offsetX = 0;
                offsetY = (canvas.height - drawHeight) / 2;
            } else {
                drawHeight = canvas.height;
                drawWidth = drawHeight * imgAspect;
                offsetX = (canvas.width - drawWidth) / 2;
                offsetY = 0;
            }
            ctx.fillStyle = tool.bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else { // fill (stretch)
            drawWidth = canvas.width;
            drawHeight = canvas.height;
            offsetX = 0;
            offsetY = 0;
        }

        ctx.drawImage(tool.bgImage, offsetX, offsetY, drawWidth, drawHeight);
    } else {
        ctx.fillStyle = tool.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// Draw wave marker shapes
function drawWaveMarker(x, y, shape, size, color, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    switch(shape) {
        case 'circle':
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'square':
            ctx.fillRect(x - size, y - size, size * 2, size * 2);
            break;
        case 'cross':
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x, y + size);
            ctx.moveTo(x - size, y);
            ctx.lineTo(x + size, y);
            ctx.stroke();
            break;
        case 'rhombus':
            ctx.beginPath();
            ctx.moveTo(x, y - size);
            ctx.lineTo(x + size, y);
            ctx.lineTo(x, y + size);
            ctx.lineTo(x - size, y);
            ctx.closePath();
            ctx.fill();
            break;
    }

    ctx.restore();
}

// Render function
function render() {
    // Clear canvas with background
    drawBackground();

    // Set text properties
    ctx.font = `${tool.fontStyle} ${tool.fontWeight} ${tool.fontSize}px ${tool.fontFamily}, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.globalCompositeOperation = tool.blendMode;

    // Split text
    const parts = splitText(tool.text, tool.splitMode);

    // Calculate spacing and total size based on text flow
    const spacing = tool.fontSize * tool.letterSpacing;
    const iconSpacing = tool.segmentIcon ? tool.iconSize + spacing : 0;

    let totalSize = 0;
    parts.forEach(part => {
        if (tool.textFlow === 'horizontal') {
            totalSize += ctx.measureText(part).width + spacing + iconSpacing;
        } else {
            // For vertical flow, approximate height based on font size
            totalSize += tool.fontSize + spacing + iconSpacing;
        }
    });

    // Calculate entrance animation progress with selected easing
    const easingFunc = easingFunctions[entranceEasing] || easingFunctions.easeOutCubic;
    const easedProgress = easingFunc(entranceProgress);

    // Track segment index for color cycling
    let segmentIndex = 0;

    // Render text with repetitions
    for (let rep = 0; rep < tool.repetitions; rep++) {
        let offset = 0;

        parts.forEach((part, i) => {
            const partWidth = ctx.measureText(part).width;

            let basePos, x, y, waveInputX, waveInputY, offsetX, offsetY;

            if (tool.textFlow === 'horizontal') {
                // HORIZONTAL FLOW: Text flows left-to-right
                const startX = canvas.width / 2 - (totalSize * tool.repetitions) / 2;
                basePos = startX + rep * totalSize + offset + partWidth / 2;

                // Wave input based on horizontal position
                waveInputX = basePos * tool.frequencyX + tool.timeX;
                waveInputY = basePos * tool.frequencyY + tool.timeY;

                offsetX = calculateWave(tool.waveTypeX, waveInputX) * tool.amplitudeX;
                offsetY = calculateWave(tool.waveTypeY, waveInputY) * tool.amplitudeY;

                // Final position with wave
                const finalX = basePos + offsetX;
                const finalY = canvas.height / 2 + offsetY;

                // Calculate center position - text laid out horizontally in center
                const singleRepSize = totalSize / tool.repetitions;
                const centerX = canvas.width / 2 - singleRepSize / 2 + offset;
                const centerY = canvas.height / 2;

                // Apply entrance animation based on type
                if (entranceType === 'split') {
                    x = centerX + (finalX - centerX) * easedProgress;
                    y = centerY + (finalY - centerY) * easedProgress;
                } else if (entranceType === 'fade') {
                    x = finalX;
                    y = finalY;
                } else if (entranceType === 'scale') {
                    x = finalX;
                    y = finalY;
                } else if (entranceType === 'slide') {
                    const slideStartX = -partWidth;
                    x = slideStartX + (finalX - slideStartX) * easedProgress;
                    y = finalY;
                }

                offset += partWidth + spacing + iconSpacing;
            } else {
                // VERTICAL FLOW: Text flows top-to-bottom
                const startY = canvas.height / 2 - (totalSize * tool.repetitions) / 2;
                basePos = startY + rep * totalSize + offset + tool.fontSize / 2;

                // Wave input based on vertical position
                waveInputX = basePos * tool.frequencyX + tool.timeX;
                waveInputY = basePos * tool.frequencyY + tool.timeY;

                offsetX = calculateWave(tool.waveTypeX, waveInputX) * tool.amplitudeX;
                offsetY = calculateWave(tool.waveTypeY, waveInputY) * tool.amplitudeY;

                // Final position - X is center + wave offset, Y is base position + wave offset
                const finalX = canvas.width / 2 + offsetX;
                const finalY = basePos + offsetY;

                // Calculate center position - text laid out vertically in center
                const singleRepSize = totalSize / tool.repetitions;
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2 - singleRepSize / 2 + offset;

                // Apply entrance animation based on type
                if (entranceType === 'split') {
                    x = centerX + (finalX - centerX) * easedProgress;
                    y = centerY + (finalY - centerY) * easedProgress;
                } else if (entranceType === 'fade') {
                    x = finalX;
                    y = finalY;
                } else if (entranceType === 'scale') {
                    x = finalX;
                    y = finalY;
                } else if (entranceType === 'slide') {
                    const slideStartY = -tool.fontSize;
                    x = finalX;
                    y = slideStartY + (finalY - slideStartY) * easedProgress;
                }

                offset += tool.fontSize + spacing + iconSpacing;
            }

            // Draw wave path visualization
            if (tool.showWavePath) {
                drawWaveMarker(x, y, tool.waveShape, tool.waveMarkerSize, tool.waveColor, tool.waveOpacity);
            }

            // Calculate rotation if enabled - gradual rotation during entrance
            let rotation = 0;
            if (tool.rotateText) {
                const dxX = calculateWaveDerivative(tool.waveTypeX, waveInputX, tool.amplitudeX, tool.frequencyX);
                const dxY = calculateWaveDerivative(tool.waveTypeY, waveInputY, tool.amplitudeY, tool.frequencyY);
                const finalRotation = Math.atan2(dxY, 1 + dxX);
                // Gradually rotate from 0 to final rotation during entrance
                rotation = finalRotation * easedProgress;
            }

            // Get color for this segment (cycle through colors array)
            const colorIndex = segmentIndex % tool.textColors.length;
            ctx.fillStyle = tool.textColors[colorIndex];

            // Apply entrance effects based on type
            let opacity = 1;
            let scale = 1;

            if (entranceType === 'fade') {
                opacity = easedProgress;
            } else if (entranceType === 'scale') {
                scale = easedProgress;
            }

            // Draw text part with rotation and entrance effects
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.scale(scale, scale);

            // Draw highlight background if enabled
            if (tool.textHighlight) {
                const textMetrics = ctx.measureText(part);
                const textHeight = tool.fontSize;
                ctx.fillStyle = tool.highlightColor;
                ctx.fillRect(-textMetrics.width / 2, -textHeight / 2, textMetrics.width, textHeight);
                // Reset text color after highlight
                ctx.fillStyle = tool.textColors[colorIndex];
            }

            ctx.fillText(part, 0, 0);
            ctx.restore();

            // Draw segment icon after text
            if (tool.segmentIcon && part.trim().length > 0) {
                let iconX, iconY;
                if (tool.textFlow === 'horizontal') {
                    iconX = x + partWidth / 2 + iconSpacing / 2;
                    iconY = y;
                } else {
                    iconX = x;
                    iconY = y + tool.fontSize / 2 + iconSpacing / 2;
                }

                ctx.save();
                ctx.translate(iconX, iconY);
                ctx.rotate(rotation);
                ctx.drawImage(
                    tool.segmentIcon,
                    -tool.iconSize / 2,
                    -tool.iconSize / 2,
                    tool.iconSize,
                    tool.iconSize
                );
                ctx.restore();
            }

            // Only increment segment index for non-whitespace parts
            if (part.trim().length > 0) {
                segmentIndex++;
            }
        });
    }

    // Reset blend mode
    ctx.globalCompositeOperation = 'source-over';

    // Update entrance animation progress
    if (isEntranceAnimating && entranceProgress < 1) {
        // Handle delay first
        if (entranceDelayFrames > 0) {
            entranceDelayFrames--;
            // Keep progress at 0 during delay
            entranceProgress = 0;
        } else {
            // Start animating after delay
            entranceProgress += (1 / ENTRANCE_DURATION) * entranceSpeed;
            if (entranceProgress >= 1) {
                entranceProgress = 1;
                isEntranceAnimating = false;
            }
        }
    }

    // Update time for both axes based on direction (only after entrance is complete)
    if (!isEntranceAnimating) {
        if (tool.direction === 'right') {
            tool.timeX += 0.02 * tool.speedX;
            tool.timeY += 0.02 * tool.speedY;
        } else if (tool.direction === 'left') {
            tool.timeX -= 0.02 * tool.speedX;
            tool.timeY -= 0.02 * tool.speedY;
        } else if (tool.direction === 'down') {
            tool.timeX += 0.02 * tool.speedX;
            tool.timeY += 0.02 * tool.speedY;
        } else if (tool.direction === 'up') {
            tool.timeX -= 0.02 * tool.speedX;
            tool.timeY -= 0.02 * tool.speedY;
        }
    }
}

// Animation loop
let isPlaying = true;
let animationId;

function animate() {
    render();
    if (isPlaying) {
        animationId = requestAnimationFrame(animate);
    }
}
animate();

// ===== Color Management UI =====
function renderColorInputs() {
    const container = document.getElementById('text-colors-container');
    container.innerHTML = '';

    tool.textColors.forEach((color, index) => {
        const colorWrapper = document.createElement('div');
        colorWrapper.style.cssText = 'position: relative; display: inline-block;';

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = color;
        colorInput.style.cssText = 'width: 50px; height: 50px; border: 2px solid #555; border-radius: 4px; cursor: pointer;';
        colorInput.addEventListener('input', (e) => {
            tool.textColors[index] = e.target.value;
        });

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.type = 'button';
        removeBtn.style.cssText = 'position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; padding: 0; font-size: 14px; line-height: 18px; background: #ff4444; color: white; border: none; border-radius: 50%; cursor: pointer;';
        removeBtn.addEventListener('click', () => {
            if (tool.textColors.length > 1) {
                tool.textColors.splice(index, 1);
                renderColorInputs();
            }
        });

        colorWrapper.appendChild(colorInput);
        if (tool.textColors.length > 1) {
            colorWrapper.appendChild(removeBtn);
        }
        container.appendChild(colorWrapper);
    });
}

// Initialize color inputs
renderColorInputs();

// Apply infinity preset on load
document.getElementById('pattern-preset').value = 'infinity';
applyPreset('infinity');

// Play/Pause button
document.getElementById('play-pause-btn').addEventListener('click', (e) => {
    isPlaying = !isPlaying;
    e.target.textContent = isPlaying ? '⏸' : '▶';
    e.target.style.background = isPlaying ? 'rgba(255, 255, 255, 0.1)' : 'transparent';

    if (isPlaying) {
        animate();
    }
});

// Replay button
document.getElementById('replay-btn').addEventListener('click', () => {
    resetEntranceAnimation();
    if (!isPlaying) {
        isPlaying = true;
        document.getElementById('play-pause-btn').textContent = '⏸';
        document.getElementById('play-pause-btn').style.background = 'rgba(255, 255, 255, 0.1)';
        animate();
    }
});

// Add color button
document.getElementById('add-color-btn').addEventListener('click', () => {
    tool.textColors.push('#ffffff');
    renderColorInputs();
});

// Event Listeners
document.getElementById('text-input').addEventListener('input', (e) => {
    tool.text = e.target.value;
    resetEntranceAnimation();
});

document.getElementById('split-mode').addEventListener('change', (e) => {
    tool.splitMode = e.target.value;

    // Update spacing label based on split mode
    const spacingLabel = document.getElementById('spacing-label');
    const labelMap = {
        'character': 'Space Between Characters',
        'word': 'Space Between Words',
        'sentence': 'Space Between Sentences'
    };
    spacingLabel.textContent = labelMap[e.target.value] || 'Space Between Characters';
});

document.getElementById('wave-type-x').addEventListener('change', (e) => {
    tool.waveTypeX = e.target.value;
});

document.getElementById('wave-type-y').addEventListener('change', (e) => {
    tool.waveTypeY = e.target.value;
});

// Amplitude X
document.getElementById('amplitude-x').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    tool.amplitudeX = value;
    document.getElementById('amplitude-x-input').value = value;
});
document.getElementById('amplitude-x-input').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) || 0;
    tool.amplitudeX = value;
    document.getElementById('amplitude-x').value = value;
});

// Amplitude Y
document.getElementById('amplitude-y').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    tool.amplitudeY = value;
    document.getElementById('amplitude-y-input').value = value;
});
document.getElementById('amplitude-y-input').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) || 0;
    tool.amplitudeY = value;
    document.getElementById('amplitude-y').value = value;
});

// Speed X
document.getElementById('speed-x').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    tool.speedX = value;
    document.getElementById('speed-x-input').value = value;
});
document.getElementById('speed-x-input').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) || 0;
    tool.speedX = value;
    document.getElementById('speed-x').value = value;
});

// Speed Y
document.getElementById('speed-y').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    tool.speedY = value;
    document.getElementById('speed-y-input').value = value;
});
document.getElementById('speed-y-input').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) || 0;
    tool.speedY = value;
    document.getElementById('speed-y').value = value;
});

// Frequency X
document.getElementById('frequency-x').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    tool.frequencyX = value;
    document.getElementById('frequency-x-input').value = value;
});
document.getElementById('frequency-x-input').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) || 0;
    tool.frequencyX = value;
    document.getElementById('frequency-x').value = value;
});

// Frequency Y
document.getElementById('frequency-y').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    tool.frequencyY = value;
    document.getElementById('frequency-y-input').value = value;
});
document.getElementById('frequency-y-input').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) || 0;
    tool.frequencyY = value;
    document.getElementById('frequency-y').value = value;
});

document.getElementById('repetitions').addEventListener('input', (e) => {
    tool.repetitions = parseInt(e.target.value);
    document.getElementById('repetitions-input').value = tool.repetitions;
});

document.getElementById('repetitions-input').addEventListener('input', (e) => {
    tool.repetitions = parseInt(e.target.value);
    document.getElementById('repetitions').value = tool.repetitions;
});

document.getElementById('rotate-text').addEventListener('change', (e) => {
    tool.rotateText = e.target.checked;
});

document.getElementById('text-flow').addEventListener('change', (e) => {
    tool.textFlow = e.target.value;

    // Update direction options and label based on text flow
    const directionSelect = document.getElementById('direction');
    const directionLabel = document.getElementById('direction-label');

    if (e.target.value === 'horizontal') {
        // Show horizontal directions
        directionSelect.innerHTML = `
            <option value="right">Right →</option>
            <option value="left">Left ←</option>
        `;
        directionLabel.textContent = 'Movement Direction';
        tool.direction = 'right';
    } else {
        // Show vertical directions
        directionSelect.innerHTML = `
            <option value="down">Down ↓</option>
            <option value="up">Up ↑</option>
        `;
        directionLabel.textContent = 'Movement Direction';
        tool.direction = 'down';
    }
});

document.getElementById('direction').addEventListener('change', (e) => {
    tool.direction = e.target.value;
});

document.getElementById('show-wave-path').addEventListener('change', (e) => {
    tool.showWavePath = e.target.checked;
    const waveGuideOptions = document.getElementById('wave-guide-options');
    const waveGuideHeader = document.getElementById('wave-guide-header');

    if (e.target.checked) {
        // Enable and show options
        waveGuideOptions.style.display = 'block';
        waveGuideOptions.style.opacity = '1';
        waveGuideHeader.style.opacity = '1';
    } else {
        // Gray out and hide options
        waveGuideOptions.style.display = 'none';
        waveGuideHeader.style.opacity = '0.5';
    }
});

document.getElementById('wave-shape').addEventListener('change', (e) => {
    tool.waveShape = e.target.value;
});

document.getElementById('wave-color').addEventListener('input', (e) => {
    tool.waveColor = e.target.value;
});

document.getElementById('wave-opacity').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    tool.waveOpacity = value;
    document.getElementById('wave-opacity-input').value = value;
});

document.getElementById('wave-opacity-input').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) || 0;
    tool.waveOpacity = Math.max(0, Math.min(1, value));
    document.getElementById('wave-opacity').value = tool.waveOpacity;
});

// Wave Marker Size
document.getElementById('wave-marker-size').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    tool.waveMarkerSize = value;
    document.getElementById('wave-marker-size-input').value = value;
});
document.getElementById('wave-marker-size-input').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) || 2;
    tool.waveMarkerSize = value;
    document.getElementById('wave-marker-size').value = value;
});

document.getElementById('blend-mode').addEventListener('change', (e) => {
    tool.blendMode = e.target.value;
});

document.getElementById('font-family').addEventListener('change', (e) => {
    if (e.target.value === '__upload__') {
        // Trigger file upload
        document.getElementById('custom-font-upload').click();
        // Reset to previous font until upload completes
        e.target.value = tool.fontFamily;
    } else {
        tool.fontFamily = e.target.value;
    }
});

// Custom Font Upload Handler
document.getElementById('custom-font-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            // Extract font name from filename (without extension)
            const fontName = file.name.replace(/\.(woff|woff2|ttf|otf)$/i, '');

            // Determine font format from file extension
            const extension = file.name.split('.').pop().toLowerCase();
            let format = 'truetype';
            if (extension === 'woff') format = 'woff';
            else if (extension === 'woff2') format = 'woff2';
            else if (extension === 'otf') format = 'opentype';

            // Create @font-face CSS rule
            const fontFace = new FontFace(fontName, `url(${event.target.result})`, {
                style: 'normal',
                weight: 'normal'
            });

            // Load the font
            fontFace.load().then((loadedFont) => {
                // Add font to document
                document.fonts.add(loadedFont);

                // Add to font-family dropdown if not already there
                const fontSelect = document.getElementById('font-family');
                const optionExists = Array.from(fontSelect.options).some(opt => opt.value === fontName);

                if (!optionExists) {
                    const option = document.createElement('option');
                    option.value = fontName;
                    option.textContent = fontName + ' (Custom)';
                    // Insert after Wix Madefor fonts
                    fontSelect.insertBefore(option, fontSelect.options[2]);
                }

                // Set as selected font
                fontSelect.value = fontName;
                tool.fontFamily = fontName;

                console.log(`✅ Custom font "${fontName}" loaded successfully`);
            }).catch((error) => {
                console.error('❌ Error loading custom font:', error);
                alert('Error loading font. Please ensure the file is a valid font format (WOFF, WOFF2, TTF, or OTF).');
            });
        };
        reader.readAsDataURL(file);
    }
});

// Font Size
document.getElementById('font-size').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    tool.fontSize = value;
    document.getElementById('font-size-input').value = value;
});
document.getElementById('font-size-input').addEventListener('input', (e) => {
    const value = parseInt(e.target.value) || 12;
    tool.fontSize = value;
    document.getElementById('font-size').value = value;
});

// Bold button toggle
document.getElementById('bold-btn').addEventListener('click', (e) => {
    tool.fontWeight = tool.fontWeight === 'bold' ? 'normal' : 'bold';
    e.target.style.background = tool.fontWeight === 'bold' ? '#667eea' : '#333';
});

// Italic button toggle
document.getElementById('italic-btn').addEventListener('click', (e) => {
    tool.fontStyle = tool.fontStyle === 'italic' ? 'normal' : 'italic';
    e.target.style.background = tool.fontStyle === 'italic' ? '#667eea' : '#333';
});

// Highlight button toggle
document.getElementById('highlight-btn').addEventListener('click', (e) => {
    tool.textHighlight = !tool.textHighlight;
    e.target.style.background = tool.textHighlight ? '#667eea' : '#333';
    // Show/hide highlight color picker (now directly under H button)
    document.getElementById('highlight-color').style.display = tool.textHighlight ? 'block' : 'none';
});

document.getElementById('highlight-color').addEventListener('input', (e) => {
    tool.highlightColor = e.target.value;
});

// Letter spacing
document.getElementById('letter-spacing').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    tool.letterSpacing = value;
    document.getElementById('letter-spacing-input').value = value;
});
document.getElementById('letter-spacing-input').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) || 0;
    tool.letterSpacing = value;
    document.getElementById('letter-spacing').value = value;
});

document.getElementById('transparent-bg').addEventListener('change', (e) => {
    tool.bgTransparent = e.target.checked;
    // Show/hide background color picker
    document.getElementById('bg-color-group').style.display = e.target.checked ? 'none' : 'block';

    // Toggle checkerboard background for visual feedback
    if (e.target.checked) {
        canvas.classList.add('transparent-bg');
    } else {
        canvas.classList.remove('transparent-bg');
    }
});

document.getElementById('bg-color').addEventListener('input', (e) => {
    tool.bgColor = e.target.value;
});

document.getElementById('bg-fit').addEventListener('change', (e) => {
    tool.bgFit = e.target.value;
});

document.getElementById('bg-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                tool.bgImage = img;
                // Show background fit options and clear button when image is uploaded
                document.getElementById('bg-fit-group').style.display = 'block';
                document.getElementById('clear-bg-image').style.display = 'block';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        // Hide background fit options and clear button when no image
        tool.bgImage = null;
        document.getElementById('bg-fit-group').style.display = 'none';
        document.getElementById('clear-bg-image').style.display = 'none';
    }
});

document.getElementById('clear-bg-image').addEventListener('click', () => {
    // Clear the background image
    tool.bgImage = null;
    document.getElementById('bg-image').value = '';
    document.getElementById('bg-fit-group').style.display = 'none';
    document.getElementById('clear-bg-image').style.display = 'none';
});

document.getElementById('segment-icon').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                tool.segmentIcon = img;
                // Show icon size controls when icon is uploaded
                document.getElementById('icon-size-group').style.display = 'block';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        // Hide icon size controls when no icon
        tool.segmentIcon = null;
        document.getElementById('icon-size-group').style.display = 'none';
    }
});

// Icon Size
document.getElementById('icon-size').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    tool.iconSize = value;
    document.getElementById('icon-size-input').value = value;
});
document.getElementById('icon-size-input').addEventListener('input', (e) => {
    const value = parseInt(e.target.value) || 10;
    tool.iconSize = value;
    document.getElementById('icon-size').value = value;
});

// ===== Preset System Functions =====
function applyPreset(presetName) {
    if (presetName === 'custom') {
        // Custom mode - user has full control
        return;
    }

    const preset = PATTERN_PRESETS[presetName];
    if (!preset) return;

    isApplyingPreset = true; // Prevent auto-switch to custom

    // Store base values from preset (before multipliers)
    baseAmplitudeX = preset.h.amplitude;
    baseAmplitudeY = preset.v.amplitude;
    baseSpeedX = preset.h.speed;
    baseSpeedY = preset.v.speed;

    // Calculate actual values with multipliers
    const sizeScale = patternSizeMultiplier / 50; // 50 is the default base size

    // Apply horizontal wave settings
    tool.waveTypeX = preset.h.type;
    tool.amplitudeX = preset.h.amplitude * sizeScale;
    tool.frequencyX = preset.h.frequency;
    tool.speedX = preset.h.speed * overallSpeedMultiplier;

    document.getElementById('wave-type-x').value = preset.h.type;
    document.getElementById('amplitude-x').value = tool.amplitudeX;
    document.getElementById('amplitude-x-input').value = tool.amplitudeX;
    document.getElementById('frequency-x').value = preset.h.frequency;
    document.getElementById('frequency-x-input').value = preset.h.frequency;
    document.getElementById('speed-x').value = tool.speedX;
    document.getElementById('speed-x-input').value = tool.speedX;

    // Apply vertical wave settings
    tool.waveTypeY = preset.v.type;
    tool.amplitudeY = preset.v.amplitude * sizeScale;
    tool.frequencyY = preset.v.frequency;
    tool.speedY = preset.v.speed * overallSpeedMultiplier;

    document.getElementById('wave-type-y').value = preset.v.type;
    document.getElementById('amplitude-y').value = tool.amplitudeY;
    document.getElementById('amplitude-y-input').value = tool.amplitudeY;
    document.getElementById('frequency-y').value = preset.v.frequency;
    document.getElementById('frequency-y-input').value = preset.v.frequency;
    document.getElementById('speed-y').value = tool.speedY;
    document.getElementById('speed-y-input').value = tool.speedY;

    setTimeout(() => { isApplyingPreset = false; }, 100);
}

function switchToCustom() {
    if (!isApplyingPreset) {
        document.getElementById('pattern-preset').value = 'custom';
        // Store current values as base for quick controls
        baseAmplitudeX = tool.amplitudeX;
        baseAmplitudeY = tool.amplitudeY;
        baseSpeedX = tool.speedX;
        baseSpeedY = tool.speedY;
    }
}

// ===== Preset Control Event Listeners =====

// Pattern Preset Selector
document.getElementById('pattern-preset').addEventListener('change', (e) => {
    const selectedPreset = e.target.value;
    applyPreset(selectedPreset);

    // Show/hide sections based on preset selection
    const presetControlsSection = document.getElementById('preset-controls-section');
    const customAnimationSection = document.getElementById('custom-params-section');

    if (selectedPreset === 'custom') {
        // Hide preset controls, show custom animation sections
        presetControlsSection.style.display = 'none';
        customAnimationSection.style.display = 'block';
        customAnimationSection.classList.remove('collapsed');
    } else {
        // Show preset controls, hide custom animation sections
        presetControlsSection.style.display = 'block';
        customAnimationSection.style.display = 'none';
    }
});

// Entrance Type Control
document.getElementById('entrance-type').addEventListener('change', (e) => {
    entranceType = e.target.value;
    resetEntranceAnimation();
});

// Entrance Easing Control
document.getElementById('entrance-easing').addEventListener('change', (e) => {
    entranceEasing = e.target.value;
    resetEntranceAnimation();
});

// Entrance Delay Control
document.getElementById('entrance-delay').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    entranceDelay = value;
    document.getElementById('entrance-delay-input').value = value;
});

document.getElementById('entrance-delay-input').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) || 0;
    entranceDelay = value;
    document.getElementById('entrance-delay').value = Math.min(value, 5); // Clamp slider max
});

// Entrance Speed Control
document.getElementById('entrance-speed').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    entranceSpeed = value;
    document.getElementById('entrance-speed-input').value = value;
});

document.getElementById('entrance-speed-input').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) || 0.1;
    entranceSpeed = value;
    document.getElementById('entrance-speed').value = value;
});

// Overall Speed Control
document.getElementById('overall-speed').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    overallSpeedMultiplier = value;
    document.getElementById('overall-speed-input').value = value;

    // Apply to both speed controls
    const currentPreset = document.getElementById('pattern-preset').value;
    if (currentPreset !== 'custom') {
        applyPreset(currentPreset);
    } else {
        // In custom mode, scale from base speeds
        tool.speedX = baseSpeedX * value;
        tool.speedY = baseSpeedY * value;
        document.getElementById('speed-x').value = tool.speedX;
        document.getElementById('speed-x-input').value = tool.speedX;
        document.getElementById('speed-y').value = tool.speedY;
        document.getElementById('speed-y-input').value = tool.speedY;
    }
});

document.getElementById('overall-speed-input').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) || 0;
    overallSpeedMultiplier = value;
    document.getElementById('overall-speed').value = value;

    const currentPreset = document.getElementById('pattern-preset').value;
    if (currentPreset !== 'custom') {
        applyPreset(currentPreset);
    } else {
        tool.speedX = baseSpeedX * value;
        tool.speedY = baseSpeedY * value;
        document.getElementById('speed-x').value = tool.speedX;
        document.getElementById('speed-x-input').value = tool.speedX;
        document.getElementById('speed-y').value = tool.speedY;
        document.getElementById('speed-y-input').value = tool.speedY;
    }
});

// Pattern Size Control
document.getElementById('pattern-size').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    patternSizeMultiplier = value;
    document.getElementById('pattern-size-input').value = value;

    // Apply to both amplitude controls
    const currentPreset = document.getElementById('pattern-preset').value;
    if (currentPreset !== 'custom') {
        // Re-apply preset with new size multiplier
        applyPreset(currentPreset);
    } else {
        // In custom mode, scale from base amplitudes
        const sizeScale = value / 50;
        tool.amplitudeX = baseAmplitudeX * sizeScale;
        tool.amplitudeY = baseAmplitudeY * sizeScale;
        document.getElementById('amplitude-x').value = tool.amplitudeX;
        document.getElementById('amplitude-x-input').value = tool.amplitudeX;
        document.getElementById('amplitude-y').value = tool.amplitudeY;
        document.getElementById('amplitude-y-input').value = tool.amplitudeY;
    }
});

document.getElementById('pattern-size-input').addEventListener('input', (e) => {
    const value = parseFloat(e.target.value) || 10;
    patternSizeMultiplier = value;
    document.getElementById('pattern-size').value = value;

    const currentPreset = document.getElementById('pattern-preset').value;
    if (currentPreset !== 'custom') {
        applyPreset(currentPreset);
    } else {
        const sizeScale = value / 50;
        tool.amplitudeX = baseAmplitudeX * sizeScale;
        tool.amplitudeY = baseAmplitudeY * sizeScale;
        document.getElementById('amplitude-x').value = tool.amplitudeX;
        document.getElementById('amplitude-x-input').value = tool.amplitudeX;
        document.getElementById('amplitude-y').value = tool.amplitudeY;
        document.getElementById('amplitude-y-input').value = tool.amplitudeY;
    }
});

// ===== Collapsible Sections Toggle =====

// Main sections
const sectionPairs = [
    { header: 'text-header', content: 'text-section' },
    { header: 'animation-header', content: 'animation-section' },
    { header: 'background-header', content: 'background-section' },
    { header: 'wave-guide-header', content: 'wave-guide-section' }
];

sectionPairs.forEach(pair => {
    const header = document.getElementById(pair.header);
    const content = document.getElementById(pair.content);

    header.addEventListener('click', () => {
        header.classList.toggle('expanded');
        content.classList.toggle('collapsed');
    });
});

// Horizontal Movement parameter section
const horizontalHeader = document.getElementById('horizontal-header');
const horizontalSection = document.getElementById('horizontal-movement-section');

horizontalHeader.addEventListener('click', () => {
    horizontalHeader.classList.toggle('expanded');
    horizontalSection.classList.toggle('collapsed');
});

// Vertical Movement parameter section
const verticalHeader = document.getElementById('vertical-header');
const verticalSection = document.getElementById('vertical-movement-section');

verticalHeader.addEventListener('click', () => {
    verticalHeader.classList.toggle('expanded');
    verticalSection.classList.toggle('collapsed');
});

// ===== Subsection Toggle (Entrance/Wave Animation) =====
const entranceAnimationHeader = document.getElementById('entrance-animation-header');
const entranceAnimationSection = document.getElementById('entrance-animation-section');
const waveAnimationHeader = document.getElementById('wave-animation-header');
const waveAnimationSection = document.getElementById('wave-animation-section');

if (entranceAnimationHeader && entranceAnimationSection) {
    entranceAnimationHeader.addEventListener('click', () => {
        entranceAnimationHeader.classList.toggle('expanded');
        entranceAnimationSection.classList.toggle('collapsed');
    });
}

if (waveAnimationHeader && waveAnimationSection) {
    waveAnimationHeader.addEventListener('click', () => {
        waveAnimationHeader.classList.toggle('expanded');
        waveAnimationSection.classList.toggle('collapsed');
    });
}

// ===== Swap Horizontal & Vertical Movement Button =====
document.getElementById('swap-movement-btn').addEventListener('click', () => {
    // Store current horizontal values
    const tempType = tool.waveTypeX;
    const tempAmplitude = tool.amplitudeX;
    const tempFrequency = tool.frequencyX;
    const tempSpeed = tool.speedX;
    const tempBaseAmplitude = baseAmplitudeX;
    const tempBaseSpeed = baseSpeedX;

    // Swap: Horizontal ← Vertical
    tool.waveTypeX = tool.waveTypeY;
    tool.amplitudeX = tool.amplitudeY;
    tool.frequencyX = tool.frequencyY;
    tool.speedX = tool.speedY;
    baseAmplitudeX = baseAmplitudeY;
    baseSpeedX = baseSpeedY;

    // Swap: Vertical ← Temp (old Horizontal)
    tool.waveTypeY = tempType;
    tool.amplitudeY = tempAmplitude;
    tool.frequencyY = tempFrequency;
    tool.speedY = tempSpeed;
    baseAmplitudeY = tempBaseAmplitude;
    baseSpeedY = tempBaseSpeed;

    // Update UI controls for Horizontal
    document.getElementById('wave-type-x').value = tool.waveTypeX;
    document.getElementById('amplitude-x').value = tool.amplitudeX;
    document.getElementById('amplitude-x-input').value = tool.amplitudeX;
    document.getElementById('frequency-x').value = tool.frequencyX;
    document.getElementById('frequency-x-input').value = tool.frequencyX;
    document.getElementById('speed-x').value = tool.speedX;
    document.getElementById('speed-x-input').value = tool.speedX;

    // Update UI controls for Vertical
    document.getElementById('wave-type-y').value = tool.waveTypeY;
    document.getElementById('amplitude-y').value = tool.amplitudeY;
    document.getElementById('amplitude-y-input').value = tool.amplitudeY;
    document.getElementById('frequency-y').value = tool.frequencyY;
    document.getElementById('frequency-y-input').value = tool.frequencyY;
    document.getElementById('speed-y').value = tool.speedY;
    document.getElementById('speed-y-input').value = tool.speedY;

    // Switch to custom mode
    switchToCustom();
});

// ===== Surprise Me Button =====
document.getElementById('surprise-me-btn').addEventListener('click', () => {
    // Color palettes from the images
    const colorPalettes = [
        // Palette 1: Hex colors
        { bg: '#233B24', text: ['#1C2968', '#643C94', '#4A2930', '#DA3A2E', '#F3AEC6', '#6396FF', '#CCFD50'] },
        // Palette 2: Pantone inspired
        { bg: '#0F0E54', text: ['#D9F20C', '#FF5733', '#6A4C93', '#E8E8E8'] },
        { bg: '#20-0199', text: ['#D9F20C', '#FF5733', '#6A4C93', '#E8E8E8'] },
        // Palette 3: Interior design
        { bg: '#D6D0C5', text: ['#A6171C', '#F1C045'] },
        { bg: '#A6171C', text: ['#D6D0C5', '#F1C045'] },
        // Palette 4: Bold primary
        { bg: '#D20001', text: ['#FEC6E9', '#0212EE', '#F3F3E9'] },
        { bg: '#0212EE', text: ['#D20001', '#FEC6E9', '#F3F3E9'] },
        { bg: '#FEC6E9', text: ['#D20001', '#0212EE', '#F3F3E9'] },
        // Palette 5: Neon contrast
        { bg: '#D9F20C', text: ['#0F0E54'] },
        { bg: '#0F0E54', text: ['#D9F20C'] },
        // Additional vibrant combos
        { bg: '#1C2968', text: ['#CCFD50', '#F3AEC6', '#6396FF'] },
        { bg: '#643C94', text: ['#F3AEC6', '#CCFD50', '#6396FF'] },
        { bg: '#000000', text: ['#D9F20C', '#FF5733', '#6A4C93'] },
        { bg: '#E8E8E8', text: ['#A6171C', '#0212EE', '#D20001'] }
    ];

    // Select random palette
    const palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];

    // Apply background color
    tool.bgColor = palette.bg;
    document.getElementById('bg-color').value = palette.bg;

    // Apply text colors (use all colors from palette)
    tool.textColors = [...palette.text];
    renderColorInputs();

    // Random split mode
    const splitModes = ['character', 'word', 'sentence'];
    const randomSplitMode = splitModes[Math.floor(Math.random() * splitModes.length)];
    tool.splitMode = randomSplitMode;
    document.getElementById('split-mode').value = randomSplitMode;

    // Random text repetitions (1-6)
    const randomRepetitions = Math.floor(Math.random() * 6 + 1);
    tool.repetitions = randomRepetitions;
    document.getElementById('repetitions').value = randomRepetitions;
    document.getElementById('repetitions-input').value = randomRepetitions;

    // Switch to custom mode and show custom parameters section
    document.getElementById('pattern-preset').value = 'custom';
    const presetControlsSection = document.getElementById('preset-controls-section');
    const customAnimationSection = document.getElementById('custom-params-section');

    presetControlsSection.style.display = 'none';
    customAnimationSection.style.display = 'block';
    customAnimationSection.classList.remove('collapsed');

    // Expand horizontal and vertical movement sections so user can see what was randomized
    const horizontalHeader = document.getElementById('horizontal-header');
    const horizontalSection = document.getElementById('horizontal-movement-section');
    const verticalHeader = document.getElementById('vertical-header');
    const verticalSection = document.getElementById('vertical-movement-section');

    horizontalHeader.classList.add('expanded');
    horizontalSection.classList.remove('collapsed');
    verticalHeader.classList.add('expanded');
    verticalSection.classList.remove('collapsed');

    // Randomly select wave types (less likely to be 'none')
    const horizontalTypes = ['sine', 'cosine', 'tangent', 'sine', 'cosine'];
    const randomWaveTypeX = horizontalTypes[Math.floor(Math.random() * horizontalTypes.length)];
    tool.waveTypeX = randomWaveTypeX;
    document.getElementById('wave-type-x').value = randomWaveTypeX;

    const verticalTypes = ['sine', 'cosine', 'tangent', 'sine', 'cosine'];
    const randomWaveTypeY = verticalTypes[Math.floor(Math.random() * verticalTypes.length)];
    tool.waveTypeY = randomWaveTypeY;
    document.getElementById('wave-type-y').value = randomWaveTypeY;

    // Random amplitudes (20 - 200)
    const randomAmplitudeX = Math.floor(Math.random() * 180 + 20);
    tool.amplitudeX = randomAmplitudeX;
    baseAmplitudeX = randomAmplitudeX;
    document.getElementById('amplitude-x').value = randomAmplitudeX;
    document.getElementById('amplitude-x-input').value = randomAmplitudeX;

    const randomAmplitudeY = Math.floor(Math.random() * 180 + 20);
    tool.amplitudeY = randomAmplitudeY;
    baseAmplitudeY = randomAmplitudeY;
    document.getElementById('amplitude-y').value = randomAmplitudeY;
    document.getElementById('amplitude-y-input').value = randomAmplitudeY;

    // Random frequencies (0.005 - 0.05)
    const randomFrequencyX = (Math.random() * 0.045 + 0.005).toFixed(3);
    tool.frequencyX = parseFloat(randomFrequencyX);
    document.getElementById('frequency-x').value = randomFrequencyX;
    document.getElementById('frequency-x-input').value = randomFrequencyX;

    const randomFrequencyY = (Math.random() * 0.045 + 0.005).toFixed(3);
    tool.frequencyY = parseFloat(randomFrequencyY);
    document.getElementById('frequency-y').value = randomFrequencyY;
    document.getElementById('frequency-y-input').value = randomFrequencyY;

    // Random speeds (0.2 - 3)
    const randomSpeedX = (Math.random() * 2.8 + 0.2).toFixed(1);
    tool.speedX = parseFloat(randomSpeedX);
    baseSpeedX = parseFloat(randomSpeedX);
    document.getElementById('speed-x').value = randomSpeedX;
    document.getElementById('speed-x-input').value = randomSpeedX;

    const randomSpeedY = (Math.random() * 2.8 + 0.2).toFixed(1);
    tool.speedY = parseFloat(randomSpeedY);
    baseSpeedY = parseFloat(randomSpeedY);
    document.getElementById('speed-y').value = randomSpeedY;
    document.getElementById('speed-y-input').value = randomSpeedY;

    // Random text flow (50% chance vertical)
    const textFlows = ['horizontal', 'vertical'];
    const randomTextFlow = textFlows[Math.floor(Math.random() * textFlows.length)];
    tool.textFlow = randomTextFlow;
    document.getElementById('text-flow').value = randomTextFlow;

    // Update direction dropdown based on text flow and select random direction
    const directionSelect = document.getElementById('direction');
    if (randomTextFlow === 'horizontal') {
        directionSelect.innerHTML = `
            <option value="right">Right →</option>
            <option value="left">Left ←</option>
        `;
        const horizontalDirections = ['right', 'left'];
        const randomDirection = horizontalDirections[Math.floor(Math.random() * horizontalDirections.length)];
        tool.direction = randomDirection;
        directionSelect.value = randomDirection;
    } else {
        directionSelect.innerHTML = `
            <option value="down">Down ↓</option>
            <option value="up">Up ↑</option>
        `;
        const verticalDirections = ['down', 'up'];
        const randomDirection = verticalDirections[Math.floor(Math.random() * verticalDirections.length)];
        tool.direction = randomDirection;
        directionSelect.value = randomDirection;
    }

    // Random font size with weighted distribution (favor extremes)
    // 40% small (12-40px), 40% large (120-200px), 20% medium (40-120px)
    const sizeCategory = Math.random();
    let randomFontSize;
    if (sizeCategory < 0.4) {
        // Small fonts (12-40px)
        randomFontSize = Math.floor(Math.random() * 29 + 12);
    } else if (sizeCategory < 0.8) {
        // Large fonts (120-200px)
        randomFontSize = Math.floor(Math.random() * 81 + 120);
    } else {
        // Medium fonts (40-120px)
        randomFontSize = Math.floor(Math.random() * 81 + 40);
    }
    tool.fontSize = randomFontSize;
    document.getElementById('font-size').value = randomFontSize;
    document.getElementById('font-size-input').value = randomFontSize;

    // Random font weight (50% chance)
    const randomBold = Math.random() > 0.5;
    tool.fontWeight = randomBold ? 'bold' : 'normal';
    document.getElementById('bold-btn').style.background = randomBold ? '#667eea' : '#333';

    // Random font style (30% chance)
    const randomItalic = Math.random() > 0.7;
    tool.fontStyle = randomItalic ? 'italic' : 'normal';
    document.getElementById('italic-btn').style.background = randomItalic ? '#667eea' : '#333';

    // Random highlight (20% chance)
    const randomHighlight = Math.random() < 0.2;
    tool.textHighlight = randomHighlight;
    document.getElementById('highlight-btn').style.background = randomHighlight ? '#667eea' : '#333';
    document.getElementById('highlight-color').style.display = randomHighlight ? 'block' : 'none';

    if (randomHighlight) {
        // Random highlight color (vibrant)
        const hlHue = Math.floor(Math.random() * 360);
        const hlSaturation = Math.floor(Math.random() * 30 + 70);
        const hlLightness = Math.floor(Math.random() * 40 + 40);
        const hlColor = `hsl(${hlHue}, ${hlSaturation}%, ${hlLightness}%)`;

        const tempDiv3 = document.createElement('div');
        tempDiv3.style.color = hlColor;
        document.body.appendChild(tempDiv3);
        const computedHlColor = window.getComputedStyle(tempDiv3).color;
        document.body.removeChild(tempDiv3);

        const hlRgb = computedHlColor.match(/\d+/g);
        if (hlRgb) {
            const hlHex = '#' + hlRgb.map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
            tool.highlightColor = hlHex;
            document.getElementById('highlight-color').value = hlHex;
        }
    }

    // Random letter spacing (0.3 - 1.2)
    const randomSpacing = (Math.random() * 0.9 + 0.3).toFixed(1);
    tool.letterSpacing = parseFloat(randomSpacing);
    document.getElementById('letter-spacing').value = randomSpacing;
    document.getElementById('letter-spacing-input').value = randomSpacing;

    // Random blend mode (normal, difference, screen only)
    const blendModes = ['source-over', 'difference', 'screen'];
    const randomBlend = blendModes[Math.floor(Math.random() * blendModes.length)];
    tool.blendMode = randomBlend;
    document.getElementById('blend-mode').value = randomBlend;

    // Random rotate text (70% chance yes)
    const randomRotate = Math.random() > 0.3;
    tool.rotateText = randomRotate;
    document.getElementById('rotate-text').checked = randomRotate;

    // Random wave guide visibility (40% chance - slightly higher)
    const showGuide = Math.random() < 0.4;
    tool.showWavePath = showGuide;
    document.getElementById('show-wave-path').checked = showGuide;

    if (showGuide) {
        // Random guide shape
        const shapes = ['circle', 'square', 'cross', 'rhombus'];
        const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
        tool.waveShape = randomShape;
        document.getElementById('wave-shape').value = randomShape;

        // Random guide marker size (2 - 80) - much much larger range for dramatic effects
        const randomMarkerSize = Math.floor(Math.random() * 78 + 2);
        tool.waveMarkerSize = randomMarkerSize;
        document.getElementById('wave-marker-size').value = randomMarkerSize;
        document.getElementById('wave-marker-size-input').value = randomMarkerSize;

        // Random guide color (vibrant)
        const guideHue = Math.floor(Math.random() * 360);
        const guideSaturation = Math.floor(Math.random() * 30 + 70);
        const guideLightness = Math.floor(Math.random() * 40 + 40);
        const guideColor = `hsl(${guideHue}, ${guideSaturation}%, ${guideLightness}%)`;

        // Convert to hex
        const tempDiv2 = document.createElement('div');
        tempDiv2.style.color = guideColor;
        document.body.appendChild(tempDiv2);
        const computedGuideColor = window.getComputedStyle(tempDiv2).color;
        document.body.removeChild(tempDiv2);

        const guideRgb = computedGuideColor.match(/\d+/g);
        if (guideRgb) {
            const guideHex = '#' + guideRgb.map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
            tool.waveColor = guideHex;
            document.getElementById('wave-color').value = guideHex;
        }
    }

    // Reset entrance animation for surprise
    resetEntranceAnimation();

    console.log('✦ Surprise! New random configuration applied');
});

// ===== Auto-switch to Custom on Manual Changes =====
// Add listeners to all wave controls to auto-switch to custom
const waveControls = [
    'wave-type-x', 'wave-type-y',
    'amplitude-x', 'amplitude-x-input',
    'amplitude-y', 'amplitude-y-input',
    'frequency-x', 'frequency-x-input',
    'frequency-y', 'frequency-y-input',
    'speed-x', 'speed-x-input',
    'speed-y', 'speed-y-input'
];

waveControls.forEach(controlId => {
    const element = document.getElementById(controlId);
    if (element) {
        element.addEventListener('input', switchToCustom);
        element.addEventListener('change', switchToCustom);
    }
});

// High-resolution export function (MANDATORY)
window.renderHighResolution = function(targetCanvas, scale) {
    const exportCtx = targetCanvas.getContext('2d');
    targetCanvas.width = canvas.width * scale;
    targetCanvas.height = canvas.height * scale;

    exportCtx.scale(scale, scale);

    // Draw background
    if (tool.bgTransparent) {
        // Clear to transparent for export
        exportCtx.clearRect(0, 0, canvas.width, canvas.height);
    } else if (tool.bgImage) {
        const imgAspect = tool.bgImage.width / tool.bgImage.height;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (tool.bgFit === 'cover') {
            if (imgAspect > canvasAspect) {
                drawHeight = canvas.height;
                drawWidth = drawHeight * imgAspect;
                offsetX = -(drawWidth - canvas.width) / 2;
                offsetY = 0;
            } else {
                drawWidth = canvas.width;
                drawHeight = drawWidth / imgAspect;
                offsetX = 0;
                offsetY = -(drawHeight - canvas.height) / 2;
            }
        } else if (tool.bgFit === 'contain') {
            if (imgAspect > canvasAspect) {
                drawWidth = canvas.width;
                drawHeight = drawWidth / imgAspect;
                offsetX = 0;
                offsetY = (canvas.height - drawHeight) / 2;
            } else {
                drawHeight = canvas.height;
                drawWidth = drawHeight * imgAspect;
                offsetX = (canvas.width - drawWidth) / 2;
                offsetY = 0;
            }
            exportCtx.fillStyle = tool.bgColor;
            exportCtx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            drawWidth = canvas.width;
            drawHeight = canvas.height;
            offsetX = 0;
            offsetY = 0;
        }

        exportCtx.drawImage(tool.bgImage, offsetX, offsetY, drawWidth, drawHeight);
    } else {
        exportCtx.fillStyle = tool.bgColor;
        exportCtx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Set text properties
    exportCtx.font = `${tool.fontStyle} ${tool.fontWeight} ${tool.fontSize}px ${tool.fontFamily}, sans-serif`;
    exportCtx.textBaseline = 'middle';
    exportCtx.textAlign = 'center';
    exportCtx.globalCompositeOperation = tool.blendMode;

    // Split text
    const parts = splitText(tool.text, tool.splitMode);

    // Calculate spacing and total size based on text flow
    const spacing = tool.fontSize * tool.letterSpacing;
    const iconSpacing = tool.segmentIcon ? tool.iconSize + spacing : 0;

    let totalSize = 0;
    parts.forEach(part => {
        if (tool.textFlow === 'horizontal') {
            totalSize += exportCtx.measureText(part).width + spacing + iconSpacing;
        } else {
            totalSize += tool.fontSize + spacing + iconSpacing;
        }
    });

    // Track segment index for color cycling
    let segmentIndex = 0;

    // Render text with repetitions (capture current frame)
    for (let rep = 0; rep < tool.repetitions; rep++) {
        let offset = 0;

        parts.forEach((part, i) => {
            const partWidth = exportCtx.measureText(part).width;

            let basePos, x, y, waveInputX, waveInputY, offsetX, offsetY;

            if (tool.textFlow === 'horizontal') {
                const startX = canvas.width / 2 - (totalSize * tool.repetitions) / 2;
                basePos = startX + rep * totalSize + offset + partWidth / 2;

                waveInputX = basePos * tool.frequencyX + tool.timeX;
                waveInputY = basePos * tool.frequencyY + tool.timeY;

                offsetX = calculateWave(tool.waveTypeX, waveInputX) * tool.amplitudeX;
                offsetY = calculateWave(tool.waveTypeY, waveInputY) * tool.amplitudeY;

                x = basePos + offsetX;
                y = canvas.height / 2 + offsetY;

                offset += partWidth + spacing + iconSpacing;
            } else {
                const startY = canvas.height / 2 - (totalSize * tool.repetitions) / 2;
                basePos = startY + rep * totalSize + offset + tool.fontSize / 2;

                waveInputX = basePos * tool.frequencyX + tool.timeX;
                waveInputY = basePos * tool.frequencyY + tool.timeY;

                offsetX = calculateWave(tool.waveTypeX, waveInputX) * tool.amplitudeX;
                offsetY = calculateWave(tool.waveTypeY, waveInputY) * tool.amplitudeY;

                x = canvas.width / 2 + offsetX;
                y = basePos + offsetY;

                offset += tool.fontSize + spacing + iconSpacing;
            }

            // Draw wave path visualization
            if (tool.showWavePath) {
                exportCtx.save();
                exportCtx.globalAlpha = tool.waveOpacity;
                exportCtx.fillStyle = tool.waveColor;
                exportCtx.strokeStyle = tool.waveColor;
                exportCtx.lineWidth = 2;

                switch(tool.waveShape) {
                    case 'circle':
                        exportCtx.beginPath();
                        exportCtx.arc(x, y, tool.waveMarkerSize, 0, Math.PI * 2);
                        exportCtx.fill();
                        break;
                    case 'square':
                        exportCtx.fillRect(x - tool.waveMarkerSize, y - tool.waveMarkerSize,
                                         tool.waveMarkerSize * 2, tool.waveMarkerSize * 2);
                        break;
                    case 'cross':
                        exportCtx.beginPath();
                        exportCtx.moveTo(x, y - tool.waveMarkerSize);
                        exportCtx.lineTo(x, y + tool.waveMarkerSize);
                        exportCtx.moveTo(x - tool.waveMarkerSize, y);
                        exportCtx.lineTo(x + tool.waveMarkerSize, y);
                        exportCtx.stroke();
                        break;
                    case 'rhombus':
                        exportCtx.beginPath();
                        exportCtx.moveTo(x, y - tool.waveMarkerSize);
                        exportCtx.lineTo(x + tool.waveMarkerSize, y);
                        exportCtx.lineTo(x, y + tool.waveMarkerSize);
                        exportCtx.lineTo(x - tool.waveMarkerSize, y);
                        exportCtx.closePath();
                        exportCtx.fill();
                        break;
                }

                exportCtx.restore();
            }

            let rotation = 0;
            if (tool.rotateText) {
                const dxX = calculateWaveDerivative(tool.waveTypeX, waveInputX, tool.amplitudeX, tool.frequencyX);
                const dxY = calculateWaveDerivative(tool.waveTypeY, waveInputY, tool.amplitudeY, tool.frequencyY);
                rotation = Math.atan2(dxY, 1 + dxX);
            }

            // Get color for this segment (cycle through colors array)
            const colorIndex = segmentIndex % tool.textColors.length;
            exportCtx.fillStyle = tool.textColors[colorIndex];

            exportCtx.save();
            exportCtx.translate(x, y);
            exportCtx.rotate(rotation);

            // Draw highlight background if enabled
            if (tool.textHighlight) {
                const textMetrics = exportCtx.measureText(part);
                const textHeight = tool.fontSize;
                exportCtx.fillStyle = tool.highlightColor;
                exportCtx.fillRect(-textMetrics.width / 2, -textHeight / 2, textMetrics.width, textHeight);
                // Reset text color after highlight
                exportCtx.fillStyle = tool.textColors[colorIndex];
            }

            exportCtx.fillText(part, 0, 0);
            exportCtx.restore();

            if (tool.segmentIcon && part.trim().length > 0) {
                let iconX, iconY;
                if (tool.textFlow === 'horizontal') {
                    iconX = x + partWidth / 2 + iconSpacing / 2;
                    iconY = y;
                } else {
                    iconX = x;
                    iconY = y + tool.fontSize / 2 + iconSpacing / 2;
                }

                exportCtx.save();
                exportCtx.translate(iconX, iconY);
                exportCtx.rotate(rotation);
                exportCtx.drawImage(
                    tool.segmentIcon,
                    -tool.iconSize / 2,
                    -tool.iconSize / 2,
                    tool.iconSize,
                    tool.iconSize
                );
                exportCtx.restore();
            }

            // Only increment segment index for non-whitespace parts
            if (part.trim().length > 0) {
                segmentIndex++;
            }
        });
    }

    // Reset blend mode
    exportCtx.globalCompositeOperation = 'source-over';

    console.log(`High-res export completed at ${scale}x resolution`);
};

// ===== Video Export Hook: Reset Animation Before Recording =====
// Hook into Chatooly CDN's video recording to restart entrance animation
if (window.Chatooly && window.Chatooly.animationMediaRecorder) {
    const originalBeginRecording = window.Chatooly.animationMediaRecorder.beginRecording;

    window.Chatooly.animationMediaRecorder.beginRecording = function(duration) {
        console.log('🎬 Video export starting - resetting entrance animation');

        // Reset entrance animation state
        resetEntranceAnimation();

        // Ensure animation is playing
        if (!isPlaying) {
            isPlaying = true;
            animate();
        }

        // Call original recording function
        originalBeginRecording.call(this, duration);
    };

    console.log('✅ Video export hook installed - entrance animation will restart on export');
} else {
    // If CDN not loaded yet, wait for it
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.Chatooly && window.Chatooly.animationMediaRecorder) {
                const originalBeginRecording = window.Chatooly.animationMediaRecorder.beginRecording;

                window.Chatooly.animationMediaRecorder.beginRecording = function(duration) {
                    console.log('🎬 Video export starting - resetting entrance animation');

                    // Reset entrance animation state
                    resetEntranceAnimation();

                    // Ensure animation is playing
                    if (!isPlaying) {
                        isPlaying = true;
                        animate();
                    }

                    // Call original recording function
                    originalBeginRecording.call(this, duration);
                };

                console.log('✅ Video export hook installed - entrance animation will restart on export');
            }
        }, 1000); // Wait 1s for CDN to initialize
    });
}
