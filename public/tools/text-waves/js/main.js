/*
 * Text Waves - Main Logic
 * Create animated text flowing along customizable wave patterns
 */

const canvas = document.getElementById('chatooly-canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 1200;
canvas.height = 800;

// Text Waves Tool State
const tool = {
    text: 'studio video //',
    splitMode: 'character',
    textFlow: 'horizontal',
    waveTypeX: 'sine',
    waveTypeY: 'sine',
    amplitudeX: 100,
    amplitudeY: 50,
    frequencyX: 0.01,
    frequencyY: 0.02,
    speedX: 1,
    speedY: 1,
    repetitions: 10,
    textColors: ['#FFFFFF'],
    blendMode: 'difference',
    fontFamily: 'Wix Madefor Text',
    fontSize: 24,
    fontWeight: 'bold',
    fontStyle: 'normal',
    textHighlight: false,
    highlightColor: '#FFFF00',
    letterSpacing: -0.1,
    bgColor: '#CCFD50',
    bgTransparent: false,
    bgImage: null,
    bgFit: 'cover',
    segmentIcon: null,
    iconSize: 20,
    rotateText: true,
    direction: 'right',
    showWavePath: true,
    waveShape: 'circle',
    waveColor: '#FF1493',
    waveOpacity: 0.31,
    waveMarkerSize: 60,
    timeX: 0,
    timeY: 0
};

// Entrance animation state (exposed globally for UI.js)
window.entranceProgress = 0;
window.ENTRANCE_DURATION = 60;
window.isEntranceAnimating = true;
window.entranceSpeed = 1;
window.entranceType = 'split';
window.entranceEasing = 'easeInCubic';
window.entranceDelay = 1.2;
window.entranceDelayFrames = 1.2 * 60; // 1.2 seconds * 60fps = 72 frames

// Function to reset entrance animation (exposed globally for UI.js)
window.resetEntranceAnimation = function() {
    window.entranceProgress = 0;
    window.isEntranceAnimating = true;
    window.entranceDelayFrames = window.entranceDelay * 60;
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
        } else {
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
    drawBackground();

    ctx.font = `${tool.fontStyle} ${tool.fontWeight} ${tool.fontSize}px ${tool.fontFamily}, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.globalCompositeOperation = tool.blendMode;

    const parts = splitText(tool.text, tool.splitMode);
    const spacing = tool.fontSize * tool.letterSpacing;
    const iconSpacing = tool.segmentIcon ? tool.iconSize + spacing : 0;

    let totalSize = 0;
    parts.forEach(part => {
        if (tool.textFlow === 'horizontal') {
            totalSize += ctx.measureText(part).width + spacing + iconSpacing;
        } else {
            totalSize += tool.fontSize + spacing + iconSpacing;
        }
    });

    const easingFunc = easingFunctions[window.entranceEasing] || easingFunctions.easeOutCubic;
    const easedProgress = easingFunc(window.entranceProgress);

    let segmentIndex = 0;

    for (let rep = 0; rep < tool.repetitions; rep++) {
        let offset = 0;

        parts.forEach((part, i) => {
            const partWidth = ctx.measureText(part).width;
            let basePos, x, y, waveInputX, waveInputY, offsetX, offsetY;

            if (tool.textFlow === 'horizontal') {
                const startX = canvas.width / 2 - (totalSize * tool.repetitions) / 2;
                basePos = startX + rep * totalSize + offset + partWidth / 2;

                waveInputX = basePos * tool.frequencyX + tool.timeX;
                waveInputY = basePos * tool.frequencyY + tool.timeY;

                offsetX = calculateWave(tool.waveTypeX, waveInputX) * tool.amplitudeX;
                offsetY = calculateWave(tool.waveTypeY, waveInputY) * tool.amplitudeY;

                const finalX = basePos + offsetX;
                const finalY = canvas.height / 2 + offsetY;

                const singleRepSize = totalSize / tool.repetitions;
                const centerX = canvas.width / 2 - singleRepSize / 2 + offset;
                const centerY = canvas.height / 2;

                if (window.entranceType === 'split') {
                    x = centerX + (finalX - centerX) * easedProgress;
                    y = centerY + (finalY - centerY) * easedProgress;
                } else if (window.entranceType === 'fade') {
                    x = finalX;
                    y = finalY;
                } else if (window.entranceType === 'scale') {
                    x = finalX;
                    y = finalY;
                } else if (window.entranceType === 'slide') {
                    const slideStartX = -partWidth;
                    x = slideStartX + (finalX - slideStartX) * easedProgress;
                    y = finalY;
                }

                offset += partWidth + spacing + iconSpacing;
            } else {
                const startY = canvas.height / 2 - (totalSize * tool.repetitions) / 2;
                basePos = startY + rep * totalSize + offset + tool.fontSize / 2;

                waveInputX = basePos * tool.frequencyX + tool.timeX;
                waveInputY = basePos * tool.frequencyY + tool.timeY;

                offsetX = calculateWave(tool.waveTypeX, waveInputX) * tool.amplitudeX;
                offsetY = calculateWave(tool.waveTypeY, waveInputY) * tool.amplitudeY;

                const finalX = canvas.width / 2 + offsetX;
                const finalY = basePos + offsetY;

                const singleRepSize = totalSize / tool.repetitions;
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2 - singleRepSize / 2 + offset;

                if (window.entranceType === 'split') {
                    x = centerX + (finalX - centerX) * easedProgress;
                    y = centerY + (finalY - centerY) * easedProgress;
                } else if (window.entranceType === 'fade') {
                    x = finalX;
                    y = finalY;
                } else if (window.entranceType === 'scale') {
                    x = finalX;
                    y = finalY;
                } else if (window.entranceType === 'slide') {
                    const slideStartY = -tool.fontSize;
                    x = finalX;
                    y = slideStartY + (finalY - slideStartY) * easedProgress;
                }

                offset += tool.fontSize + spacing + iconSpacing;
            }

            if (tool.showWavePath) {
                drawWaveMarker(x, y, tool.waveShape, tool.waveMarkerSize, tool.waveColor, tool.waveOpacity);
            }

            let rotation = 0;
            if (tool.rotateText) {
                const dxX = calculateWaveDerivative(tool.waveTypeX, waveInputX, tool.amplitudeX, tool.frequencyX);
                const dxY = calculateWaveDerivative(tool.waveTypeY, waveInputY, tool.amplitudeY, tool.frequencyY);
                const finalRotation = Math.atan2(dxY, 1 + dxX);
                rotation = finalRotation * easedProgress;
            }

            const colorIndex = segmentIndex % tool.textColors.length;
            ctx.fillStyle = tool.textColors[colorIndex];

            let opacity = 1;
            let scale = 1;

            if (window.entranceType === 'fade') {
                opacity = easedProgress;
            } else if (window.entranceType === 'scale') {
                scale = easedProgress;
            }

            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.scale(scale, scale);

            if (tool.textHighlight) {
                const textMetrics = ctx.measureText(part);
                const textHeight = tool.fontSize;
                ctx.fillStyle = tool.highlightColor;
                ctx.fillRect(-textMetrics.width / 2, -textHeight / 2, textMetrics.width, textHeight);
                ctx.fillStyle = tool.textColors[colorIndex];
            }

            ctx.fillText(part, 0, 0);
            ctx.restore();

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
                ctx.drawImage(tool.segmentIcon, -tool.iconSize / 2, -tool.iconSize / 2, tool.iconSize, tool.iconSize);
                ctx.restore();
            }

            if (part.trim().length > 0) {
                segmentIndex++;
            }
        });
    }

    ctx.globalCompositeOperation = 'source-over';

    if (window.isEntranceAnimating && window.entranceProgress < 1) {
        if (window.entranceDelayFrames > 0) {
            window.entranceDelayFrames--;
            window.entranceProgress = 0;
        } else {
            window.entranceProgress += (1 / window.ENTRANCE_DURATION) * window.entranceSpeed;
            if (window.entranceProgress >= 1) {
                window.entranceProgress = 1;
                window.isEntranceAnimating = false;
            }
        }
    }

    if (!window.isEntranceAnimating) {
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

// Animation loop (exposed globally for UI.js)
window.isPlaying = true;
window.animationId = null;

window.animate = function() {
    render();
    if (window.isPlaying) {
        window.animationId = requestAnimationFrame(window.animate);
    }
}
window.animate();

// High-resolution export function (MANDATORY)
window.renderHighResolution = function(targetCanvas, scale) {
    const exportCtx = targetCanvas.getContext('2d');
    targetCanvas.width = canvas.width * scale;
    targetCanvas.height = canvas.height * scale;

    exportCtx.scale(scale, scale);

    if (tool.bgTransparent) {
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

    exportCtx.font = `${tool.fontStyle} ${tool.fontWeight} ${tool.fontSize}px ${tool.fontFamily}, sans-serif`;
    exportCtx.textBaseline = 'middle';
    exportCtx.textAlign = 'center';
    exportCtx.globalCompositeOperation = tool.blendMode;

    const parts = splitText(tool.text, tool.splitMode);
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

    let segmentIndex = 0;

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

            const colorIndex = segmentIndex % tool.textColors.length;
            exportCtx.fillStyle = tool.textColors[colorIndex];

            exportCtx.save();
            exportCtx.translate(x, y);
            exportCtx.rotate(rotation);

            if (tool.textHighlight) {
                const textMetrics = exportCtx.measureText(part);
                const textHeight = tool.fontSize;
                exportCtx.fillStyle = tool.highlightColor;
                exportCtx.fillRect(-textMetrics.width / 2, -textHeight / 2, textMetrics.width, textHeight);
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
                exportCtx.drawImage(tool.segmentIcon, -tool.iconSize / 2, -tool.iconSize / 2, tool.iconSize, tool.iconSize);
                exportCtx.restore();
            }

            if (part.trim().length > 0) {
                segmentIndex++;
            }
        });
    }

    exportCtx.globalCompositeOperation = 'source-over';

    console.log(`High-res export completed at ${scale}x resolution`);
};

// ===== Video Export Hook: Reset Animation Before Recording =====
if (window.Chatooly && window.Chatooly.animationMediaRecorder) {
    const originalBeginRecording = window.Chatooly.animationMediaRecorder.beginRecording;

    window.Chatooly.animationMediaRecorder.beginRecording = function(duration) {
        console.log('🎬 Video export starting - resetting entrance animation');
        window.resetEntranceAnimation();

        if (!window.isPlaying) {
            window.isPlaying = true;
            window.animate();
        }

        originalBeginRecording.call(this, duration);
    };

    console.log('✅ Video export hook installed - entrance animation will restart on export');
} else {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.Chatooly && window.Chatooly.animationMediaRecorder) {
                const originalBeginRecording = window.Chatooly.animationMediaRecorder.beginRecording;

                window.Chatooly.animationMediaRecorder.beginRecording = function(duration) {
                    console.log('🎬 Video export starting - resetting entrance animation');
                    window.resetEntranceAnimation();

                    if (!window.isPlaying) {
                        window.isPlaying = true;
                        window.animate();
                    }

                    originalBeginRecording.call(this, duration);
                };

                console.log('✅ Video export hook installed - entrance animation will restart on export');
            }
        }, 1000);
    });
}
