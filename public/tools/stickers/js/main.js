/*
 * Stickers - Main Logic
 * Create custom text stickers with customizable fonts, colors, shapes, and effects
 */

// ========== CANVAS INITIALIZATION ==========
const canvas = document.getElementById('chatooly-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 1920;
canvas.height = 1080;

// ========== STICKER STATE ==========
const stickerState = {
    text: 'Hello!',
    fontFamily: 'Arial',
    fontSize: 60,
    textColor: '#000000',
    bgColor: '#FFD700',
    borderColor: '#000000',
    shape: 'rounded',
    borderWidth: 3,
    cornerRadius: 20,
    padding: 30,
    shadow: false,
    shadowBlur: 10,
    shadowOffsetX: 5,
    shadowOffsetY: 5
};

// ========== BACKGROUND SYSTEM ==========
Chatooly.backgroundManager.init(canvas);

// Connect background controls
document.getElementById('transparent-bg').addEventListener('change', (e) => {
    Chatooly.backgroundManager.setTransparent(e.target.checked);
    document.getElementById('bg-color-group').style.display = e.target.checked ? 'none' : 'block';
    render();
});

document.getElementById('bg-color').addEventListener('input', (e) => {
    Chatooly.backgroundManager.setBackgroundColor(e.target.value);
    render();
});

document.getElementById('bg-image').addEventListener('change', async (e) => {
    if (e.target.files[0]) {
        await Chatooly.backgroundManager.setBackgroundImage(e.target.files[0]);
        document.getElementById('clear-bg-image').style.display = 'block';
        document.getElementById('bg-fit-group').style.display = 'block';
        render();
    }
});

document.getElementById('clear-bg-image').addEventListener('click', () => {
    Chatooly.backgroundManager.clearBackgroundImage();
    document.getElementById('clear-bg-image').style.display = 'none';
    document.getElementById('bg-fit-group').style.display = 'none';
    document.getElementById('bg-image').value = '';
    render();
});

document.getElementById('bg-fit').addEventListener('change', (e) => {
    Chatooly.backgroundManager.setFit(e.target.value);
    render();
});

// ========== STICKER CONTROLS ==========
document.getElementById('sticker-text').addEventListener('input', (e) => {
    stickerState.text = e.target.value || ' ';
    render();
});

document.getElementById('font-family').addEventListener('change', (e) => {
    stickerState.fontFamily = e.target.value;
    render();
});

document.getElementById('font-size').addEventListener('input', (e) => {
    stickerState.fontSize = parseInt(e.target.value);
    document.getElementById('font-size-value').textContent = stickerState.fontSize;
    render();
});

document.getElementById('text-color').addEventListener('input', (e) => {
    stickerState.textColor = e.target.value;
    render();
});

document.getElementById('bg-color-sticker').addEventListener('input', (e) => {
    stickerState.bgColor = e.target.value;
    render();
});

document.getElementById('border-color').addEventListener('input', (e) => {
    stickerState.borderColor = e.target.value;
    render();
});

document.getElementById('shape').addEventListener('change', (e) => {
    stickerState.shape = e.target.value;
    render();
});

document.getElementById('border-width').addEventListener('input', (e) => {
    stickerState.borderWidth = parseInt(e.target.value);
    document.getElementById('border-width-value').textContent = stickerState.borderWidth;
    render();
});

document.getElementById('corner-radius').addEventListener('input', (e) => {
    stickerState.cornerRadius = parseInt(e.target.value);
    document.getElementById('corner-radius-value').textContent = stickerState.cornerRadius;
    render();
});

document.getElementById('padding').addEventListener('input', (e) => {
    stickerState.padding = parseInt(e.target.value);
    document.getElementById('padding-value').textContent = stickerState.padding;
    render();
});

document.getElementById('shadow').addEventListener('change', (e) => {
    stickerState.shadow = e.target.checked;
    const shadowControls = document.getElementById('shadow-controls');
    const shadowOffsetXGroup = document.getElementById('shadow-offset-group');
    const shadowOffsetYGroup = document.getElementById('shadow-offset-y-group');
    
    if (stickerState.shadow) {
        shadowControls.style.display = 'block';
        shadowOffsetXGroup.style.display = 'block';
        shadowOffsetYGroup.style.display = 'block';
    } else {
        shadowControls.style.display = 'none';
        shadowOffsetXGroup.style.display = 'none';
        shadowOffsetYGroup.style.display = 'none';
    }
    render();
});

document.getElementById('shadow-blur').addEventListener('input', (e) => {
    stickerState.shadowBlur = parseInt(e.target.value);
    document.getElementById('shadow-blur-value').textContent = stickerState.shadowBlur;
    render();
});

document.getElementById('shadow-offset-x').addEventListener('input', (e) => {
    stickerState.shadowOffsetX = parseInt(e.target.value);
    document.getElementById('shadow-offset-x-value').textContent = stickerState.shadowOffsetX;
    render();
});

document.getElementById('shadow-offset-y').addEventListener('input', (e) => {
    stickerState.shadowOffsetY = parseInt(e.target.value);
    document.getElementById('shadow-offset-y-value').textContent = stickerState.shadowOffsetY;
    render();
});

// ========== RENDERING FUNCTIONS ==========
function measureText(text, fontFamily, fontSize) {
    ctx.save();
    ctx.font = `${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    ctx.restore();
    return {
        width: metrics.width,
        height: fontSize * 1.2 // Approximate height
    };
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background FIRST
    Chatooly.backgroundManager.drawToCanvas(ctx, canvas.width, canvas.height);
    
    // Measure text
    const textMetrics = measureText(stickerState.text, stickerState.fontFamily, stickerState.fontSize);
    const textWidth = textMetrics.width;
    const textHeight = textMetrics.height;
    
    // Calculate sticker dimensions
    const padding = stickerState.padding;
    const borderWidth = stickerState.borderWidth;
    const totalPadding = padding * 2 + borderWidth * 2;
    
    let stickerWidth = textWidth + totalPadding;
    let stickerHeight = textHeight + totalPadding;
    
    // Adjust for circle/square shapes
    if (stickerState.shape === 'circle' || stickerState.shape === 'square') {
        const size = Math.max(stickerWidth, stickerHeight);
        stickerWidth = size;
        stickerHeight = size;
    }
    
    // Center position
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const stickerX = centerX - stickerWidth / 2;
    const stickerY = centerY - stickerHeight / 2;
    
    // Set shadow if enabled
    if (stickerState.shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = stickerState.shadowBlur;
        ctx.shadowOffsetX = stickerState.shadowOffsetX;
        ctx.shadowOffsetY = stickerState.shadowOffsetY;
    } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }
    
    // Draw sticker background
    ctx.fillStyle = stickerState.bgColor;
    ctx.strokeStyle = stickerState.borderColor;
    ctx.lineWidth = borderWidth;
    
    if (stickerState.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(centerX, centerY, stickerWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        if (borderWidth > 0) {
            ctx.stroke();
        }
    } else if (stickerState.shape === 'square') {
        ctx.fillRect(stickerX, stickerY, stickerWidth, stickerHeight);
        if (borderWidth > 0) {
            ctx.strokeRect(stickerX, stickerY, stickerWidth, stickerHeight);
        }
    } else if (stickerState.shape === 'pill') {
        const radius = stickerHeight / 2;
        drawRoundedRect(ctx, stickerX, stickerY, stickerWidth, stickerHeight, radius);
        ctx.fill();
        if (borderWidth > 0) {
            ctx.stroke();
        }
    } else { // rounded
        drawRoundedRect(ctx, stickerX, stickerY, stickerWidth, stickerHeight, stickerState.cornerRadius);
        ctx.fill();
        if (borderWidth > 0) {
            ctx.stroke();
        }
    }
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw text
    ctx.fillStyle = stickerState.textColor;
    ctx.font = `${stickerState.fontSize}px ${stickerState.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stickerState.text, centerX, centerY);
}

// ========== HIGH-RESOLUTION EXPORT ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!stickerState.text || stickerState.text.trim() === '') {
        console.warn('No sticker text to export');
        return;
    }
    
    const exportCtx = targetCanvas.getContext('2d');
    const scaledWidth = canvas.width * scale;
    const scaledHeight = canvas.height * scale;
    
    targetCanvas.width = scaledWidth;
    targetCanvas.height = scaledHeight;
    
    // Scale context
    exportCtx.scale(scale, scale);
    
    // Clear canvas
    exportCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background FIRST
    Chatooly.backgroundManager.drawToCanvas(exportCtx, canvas.width, canvas.height);
    
    // Measure text (at original scale)
    const textMetrics = measureText(stickerState.text, stickerState.fontFamily, stickerState.fontSize);
    const textWidth = textMetrics.width;
    const textHeight = textMetrics.height;
    
    // Calculate sticker dimensions
    const padding = stickerState.padding;
    const borderWidth = stickerState.borderWidth;
    const totalPadding = padding * 2 + borderWidth * 2;
    
    let stickerWidth = textWidth + totalPadding;
    let stickerHeight = textHeight + totalPadding;
    
    // Adjust for circle/square shapes
    if (stickerState.shape === 'circle' || stickerState.shape === 'square') {
        const size = Math.max(stickerWidth, stickerHeight);
        stickerWidth = size;
        stickerHeight = size;
    }
    
    // Center position
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const stickerX = centerX - stickerWidth / 2;
    const stickerY = centerY - stickerHeight / 2;
    
    // Set shadow if enabled
    if (stickerState.shadow) {
        exportCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        exportCtx.shadowBlur = stickerState.shadowBlur;
        exportCtx.shadowOffsetX = stickerState.shadowOffsetX;
        exportCtx.shadowOffsetY = stickerState.shadowOffsetY;
    } else {
        exportCtx.shadowColor = 'transparent';
        exportCtx.shadowBlur = 0;
        exportCtx.shadowOffsetX = 0;
        exportCtx.shadowOffsetY = 0;
    }
    
    // Draw sticker background
    exportCtx.fillStyle = stickerState.bgColor;
    exportCtx.strokeStyle = stickerState.borderColor;
    exportCtx.lineWidth = borderWidth;
    
    if (stickerState.shape === 'circle') {
        exportCtx.beginPath();
        exportCtx.arc(centerX, centerY, stickerWidth / 2, 0, Math.PI * 2);
        exportCtx.fill();
        if (borderWidth > 0) {
            exportCtx.stroke();
        }
    } else if (stickerState.shape === 'square') {
        exportCtx.fillRect(stickerX, stickerY, stickerWidth, stickerHeight);
        if (borderWidth > 0) {
            exportCtx.strokeRect(stickerX, stickerY, stickerWidth, stickerHeight);
        }
    } else if (stickerState.shape === 'pill') {
        const radius = stickerHeight / 2;
        drawRoundedRect(exportCtx, stickerX, stickerY, stickerWidth, stickerHeight, radius);
        exportCtx.fill();
        if (borderWidth > 0) {
            exportCtx.stroke();
        }
    } else { // rounded
        drawRoundedRect(exportCtx, stickerX, stickerY, stickerWidth, stickerHeight, stickerState.cornerRadius);
        exportCtx.fill();
        if (borderWidth > 0) {
            exportCtx.stroke();
        }
    }
    
    // Reset shadow
    exportCtx.shadowColor = 'transparent';
    exportCtx.shadowBlur = 0;
    exportCtx.shadowOffsetX = 0;
    exportCtx.shadowOffsetY = 0;
    
    // Draw text
    exportCtx.fillStyle = stickerState.textColor;
    exportCtx.font = `${stickerState.fontSize}px ${stickerState.fontFamily}`;
    exportCtx.textAlign = 'center';
    exportCtx.textBaseline = 'middle';
    exportCtx.fillText(stickerState.text, centerX, centerY);
    
    console.log(`High-res export completed at ${scale}x resolution`);
};

// ========== INITIAL RENDER ==========
// Wait for CDN to load before initial render
if (window.Chatooly && window.Chatooly.backgroundManager) {
    render();
} else {
    window.addEventListener('load', () => {
        setTimeout(render, 100);
    });
}
