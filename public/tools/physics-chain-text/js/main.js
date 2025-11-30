/*
 * Physics Chain Text - Main Logic
 * Interactive physics-based chain where each letter becomes a bead
 * Supports multiple chains
 */

// ========== GLOBAL VARIABLES ==========
let p5Instance;
let chains = []; // Array of chain objects
let draggedBead = null;
let draggedChain = null; // Track which chain is being dragged
let dragOffset = { x: 0, y: 0 };
let isDragging = false;
let isDraggingAnchor = false; // Track if we're dragging the anchor
let hoveredAnchorChain = null; // Track which chain's anchor is being hovered

// Chain properties (will be controlled by UI - applied to selected chain)
let chainLength = 40;
let beadSize = 50;
let bounciness = 0.95;
let gravity = 0.5;
let chainColor = '#ff5500';
let strokeColor = '#ff5500';
let strokeWidth = 2; // Width of chain connection lines
let fontColor = '#ffffff';
let beadShape = 'circle'; // Shape for bead heads: circle, square, triangle, diamond, hexagon, star
let inputText = 'HELLO';
let selectedChainId = null;

// Wind properties (global)
let windStrength = 0;
let windDirection = 0; // in degrees
let windVariation = 0.2;
let windTime = 0;

// Canvas dimensions
let canvasWidth = 1920;
let canvasHeight = 1080;

// Chain ID counter
let nextChainId = 1;

// ========== CHAIN CLASS ==========
class Chain {
    constructor(id, text, x, y) {
        this.id = id;
        this.text = text;
        this.anchorX = x;
        this.anchorY = y;
        this.beads = [];
        this.chainColor = chainColor;
        this.strokeColor = strokeColor;
        this.strokeWidth = strokeWidth;
        this.fontColor = fontColor;
        this.chainLength = chainLength;
        this.beadSize = beadSize;
        this.bounciness = bounciness;
        this.beadShape = beadShape;
        this.createBeads();
    }
    
    createBeads() {
        this.beads = [];
        const letters = this.text.toUpperCase().split('');
        
        for (let i = 0; i < letters.length; i++) {
            const letter = letters[i];
            if (letter === ' ') continue; // Skip spaces
            
            const x = this.anchorX;
            const y = this.anchorY + (this.beads.length * this.chainLength);
            
            const bead = new Bead(x, y, letter, this.beads.length, this);
            bead.isAnchored = this.beads.length === 0;
            this.beads.push(bead);
        }
    }
    
    update(p) {
        // If anchor is being dragged, don't update physics yet
        if (isDraggingAnchor && draggedChain === this) {
            // Just update bead positions relative to anchor
            if (this.beads.length > 0) {
                const anchorBead = this.beads[0];
                const offsetX = this.anchorX - anchorBead.x;
                const offsetY = this.anchorY - anchorBead.y;
                
                this.beads.forEach(bead => {
                    bead.x += offsetX;
                    bead.y += offsetY;
                    bead.prevX += offsetX;
                    bead.prevY += offsetY;
                });
            }
            return;
        }
        
        // Update each bead
        for (let bead of this.beads) {
            bead.update(p, this);
        }
        
        // Constrain distances between beads
        for (let i = 1; i < this.beads.length; i++) {
            this.beads[i].constrainDistance(this.beads[i - 1]);
        }
        
        // Keep anchor bead at anchor position
        if (this.beads.length > 0) {
            const anchorBead = this.beads[0];
            anchorBead.x = this.anchorX;
            anchorBead.y = this.anchorY;
        }
    }
    
    draw(p) {
        if (this.beads.length === 0) return;
        
        // Draw connections
        p.stroke(this.strokeColor);
        p.strokeWeight(this.strokeWidth);
        p.noFill();
        
        for (let i = 1; i < this.beads.length; i++) {
            p.line(this.beads[i - 1].x, this.beads[i - 1].y, this.beads[i].x, this.beads[i].y);
        }
        
        // Draw beads
        for (let bead of this.beads) {
            // Check if this is the anchor bead and if it's being hovered
            const isHovered = bead.isAnchored && hoveredAnchorChain === this;
            
            // Draw bead shape with hover effect for anchor
            if (isHovered) {
                // Highlight the anchor bead on hover
                p.fill(this.chainColor);
                p.stroke(255, 200, 0); // Yellow highlight
                p.strokeWeight(3);
            } else {
                p.fill(this.chainColor);
                p.stroke(this.strokeColor);
                p.strokeWeight(2);
            }
            this.drawBeadShape(p, bead.x, bead.y, bead.radius, this.beadShape);
            
            // Draw letter
            p.fill(this.fontColor);
            p.noStroke();
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(bead.radius * 0.8);
            p.text(bead.letter, bead.x, bead.y);
        }
    }
    
    drawBeadShape(p, x, y, radius, shape) {
        const size = radius * 2;
        
        switch(shape) {
            case 'circle':
                p.circle(x, y, size);
                break;
                
            case 'square':
                p.rectMode(p.CENTER);
                p.rect(x, y, size, size);
                break;
                
            case 'triangle':
                p.beginShape();
                for (let i = 0; i < 3; i++) {
                    const angle = (i * p.TWO_PI / 3) - p.PI / 2;
                    const px = x + p.cos(angle) * radius;
                    const py = y + p.sin(angle) * radius;
                    p.vertex(px, py);
                }
                p.endShape(p.CLOSE);
                break;
                
            case 'diamond':
                p.beginShape();
                p.vertex(x, y - radius);
                p.vertex(x + radius, y);
                p.vertex(x, y + radius);
                p.vertex(x - radius, y);
                p.endShape(p.CLOSE);
                break;
                
            case 'hexagon':
                p.beginShape();
                for (let i = 0; i < 6; i++) {
                    const angle = (i * p.TWO_PI / 6) - p.PI / 2;
                    const px = x + p.cos(angle) * radius;
                    const py = y + p.sin(angle) * radius;
                    p.vertex(px, py);
                }
                p.endShape(p.CLOSE);
                break;
                
            case 'star':
                p.beginShape();
                const outerRadius = radius;
                const innerRadius = radius * 0.5;
                for (let i = 0; i < 10; i++) {
                    const angle = (i * p.TWO_PI / 10) - p.PI / 2;
                    const r = i % 2 === 0 ? outerRadius : innerRadius;
                    const px = x + p.cos(angle) * r;
                    const py = y + p.sin(angle) * r;
                    p.vertex(px, py);
                }
                p.endShape(p.CLOSE);
                break;
                
            default:
                p.circle(x, y, size);
        }
    }
}

// ========== BEAD CLASS ==========
class Bead {
    constructor(x, y, letter, index, chain) {
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
        this.letter = letter;
        this.index = index;
        this.chain = chain;
        this.radius = chain ? chain.beadSize / 2 : beadSize / 2;
        this.isAnchored = index === 0;
    }
    
    update(p, chain) {
        if (this.isAnchored) {
            // First bead stays at anchor position
            this.x = chain.anchorX;
            this.y = chain.anchorY;
            this.prevX = this.x;
            this.prevY = this.y;
            return;
        }
        
        // Verlet integration for smooth physics
        const vx = (this.x - this.prevX) * chain.bounciness;
        const vy = (this.y - this.prevY) * chain.bounciness;
        
        this.prevX = this.x;
        this.prevY = this.y;
        
        // Calculate wind force with variation
        let windForceX = 0;
        let windForceY = 0;
        
        if (windStrength > 0) {
            // Base wind direction in radians
            const baseAngle = (windDirection * Math.PI) / 180;
            
            // Add variation based on time and position
            const variation = (Math.sin(windTime * 0.1 + this.index * 0.5) * windVariation);
            const windAngle = baseAngle + variation;
            
            // Calculate wind force
            windForceX = Math.cos(windAngle) * windStrength;
            windForceY = Math.sin(windAngle) * windStrength;
        }
        
        // Apply forces: gravity + wind
        this.x += vx + windForceX;
        this.y += vy + gravity + windForceY;
        
        // Boundary constraints
        const margin = this.radius;
        if (p5Instance && p5Instance.width) {
            if (this.x < margin) {
                this.x = margin;
                this.prevX = this.x + vx * 0.5;
            }
            if (this.x > p5Instance.width - margin) {
                this.x = p5Instance.width - margin;
                this.prevX = this.x + vx * 0.5;
            }
            if (this.y < margin) {
                this.y = margin;
                this.prevY = this.y + vy * 0.5;
            }
            if (this.y > p5Instance.height - margin) {
                this.y = p5Instance.height - margin;
                this.prevY = this.y + vy * 0.5;
            }
        }
    }
    
    constrainDistance(prevBead) {
        if (!prevBead) return;
        
        const dx = this.x - prevBead.x;
        const dy = this.y - prevBead.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const targetDistance = this.chain.chainLength;
        
        if (distance > 0) {
            const diff = (targetDistance - distance) / distance;
            const offsetX = dx * diff * 0.5;
            const offsetY = dy * diff * 0.5;
            
            if (!this.isAnchored) {
                this.x += offsetX;
                this.y += offsetY;
            }
            if (!prevBead.isAnchored) {
                prevBead.x -= offsetX;
                prevBead.y -= offsetY;
            }
        }
    }
}

// ========== P5.JS INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    // Wait for p5.js to load
    if (typeof p5 !== 'undefined') {
        initP5();
    } else {
        window.addEventListener('load', () => {
            if (typeof p5 !== 'undefined') {
                initP5();
            }
        });
    }
    
    // Setup UI controls
    setTimeout(setupUIControls, 100);
});

function initP5() {
    const sketch = (p) => {
        // ========== P5.JS SETUP ==========
        p.setup = function() {
            // Get the container element
            const container = document.getElementById('chatooly-canvas-container');
            if (!container) {
                console.error('chatooly-canvas-container not found');
                return;
            }

            // Create canvas with proper dimensions
            let canvas = p.createCanvas(canvasWidth, canvasHeight);
            canvas.parent('chatooly-canvas-container');
            
            // CRITICAL: Set canvas ID to "chatooly-canvas" for highest export priority
            canvas.elt.id = 'chatooly-canvas';
            
            // Create initial chain
            if (chains.length === 0) {
                createNewChain();
            }
            
            // Listen for canvas resize events
            document.addEventListener('chatooly:canvas-resized', onCanvasResized);
            
            // Initialize background manager
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.init(canvas.elt);
                setupBackgroundControls();
            }
        };

        // ========== P5.JS DRAW LOOP ==========
        p.draw = function() {
            // Draw background FIRST
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                const ctx = p.drawingContext;
                window.Chatooly.backgroundManager.drawToCanvas(ctx, p.width, p.height);
            } else {
                p.background(43, 43, 43); // Fallback dark background
            }
            
            // Check for anchor hover
            hoveredAnchorChain = null;
            if (!isDragging && !isDraggingAnchor) {
                for (let chain of chains) {
                    if (chain.beads.length > 0) {
                        const anchorBead = chain.beads[0];
                        const dx = p.mouseX - anchorBead.x;
                        const dy = p.mouseY - anchorBead.y;
                        const dist = p.sqrt(dx * dx + dy * dy);
                        
                        if (dist < anchorBead.radius * 2) {
                            hoveredAnchorChain = chain;
                            // Change cursor to indicate draggable
                            if (p5Instance && p5Instance.canvas) {
                                p5Instance.canvas.style.cursor = 'grab';
                            }
                            break;
                        }
                    }
                }
            }
            
            // Reset cursor if not hovering
            if (!hoveredAnchorChain && p5Instance && p5Instance.canvas) {
                p5Instance.canvas.style.cursor = 'default';
            }
            
            // Update physics for all chains
            updatePhysics(p);
            
            // Draw all chains
            for (let chain of chains) {
                chain.draw(p);
            }
        };

        // ========== MOUSE INTERACTION ==========
        p.mousePressed = function() {
            // Use p5.js mouse coordinates directly
            const mx = p.mouseX;
            const my = p.mouseY;
            
            // First check if clicking on an anchor bead (first bead)
            for (let chain of chains) {
                if (chain.beads.length > 0) {
                    const anchorBead = chain.beads[0];
                    const dx = mx - anchorBead.x;
                    const dy = my - anchorBead.y;
                    const dist = p.sqrt(dx * dx + dy * dy);
                    
                    if (dist < anchorBead.radius * 2) {
                        // Dragging anchor - move entire chain
                        isDraggingAnchor = true;
                        draggedChain = chain;
                        dragOffset.x = mx - chain.anchorX;
                        dragOffset.y = my - chain.anchorY;
                        selectedChainId = chain.id;
                        updateChainUI(chain);
                        // Change cursor to grabbing
                        if (p5Instance && p5Instance.canvas) {
                            p5Instance.canvas.style.cursor = 'grabbing';
                        }
                        return;
                    }
                }
            }
            
            // Otherwise, find closest bead
            let minDist = Infinity;
            let closestBead = null;
            let closestChain = null;
            
            for (let chain of chains) {
                for (let bead of chain.beads) {
                    if (bead.isAnchored) continue; // Skip anchor beads (already checked above)
                    
                    const dx = mx - bead.x;
                    const dy = my - bead.y;
                    const dist = p.sqrt(dx * dx + dy * dy);
                    
                    if (dist < bead.radius * 2 && dist < minDist) {
                        minDist = dist;
                        closestBead = bead;
                        closestChain = chain;
                    }
                }
            }
            
            if (closestBead) {
                isDragging = true;
                draggedBead = closestBead;
                draggedChain = closestChain;
                dragOffset.x = mx - closestBead.x;
                dragOffset.y = my - closestBead.y;
                selectedChainId = closestChain.id;
                updateChainUI(closestChain);
            }
        };

        p.mouseReleased = function() {
            isDragging = false;
            isDraggingAnchor = false;
            draggedBead = null;
            draggedChain = null;
            // Reset cursor
            if (p5Instance && p5Instance.canvas) {
                p5Instance.canvas.style.cursor = 'default';
            }
        };

        p.mouseDragged = function() {
            // Handled in updatePhysics
        };
    };

    p5Instance = new p5(sketch);
}

// ========== PHYSICS UPDATE ==========
function updatePhysics(p) {
    if (!p5Instance) return;
    
    // Update wind time for variation
    windTime += 1;
    
    // Update all chains
    for (let chain of chains) {
        chain.update(p);
    }
    
    // Handle mouse dragging
    if (isDraggingAnchor && draggedChain) {
        // Use p5.js mouse coordinates directly
        draggedChain.anchorX = p.mouseX - dragOffset.x;
        draggedChain.anchorY = p.mouseY - dragOffset.y;
    } else if (isDragging && draggedBead && draggedChain) {
        // Use p5.js mouse coordinates directly
        draggedBead.x = p.mouseX - dragOffset.x;
        draggedBead.y = p.mouseY - dragOffset.y;
    }
}

// ========== CHAIN MANAGEMENT ==========
function createNewChain() {
    const id = nextChainId++;
    const startX = canvasWidth / 2 + (chains.length * 100);
    const startY = 100;
    const chain = new Chain(id, inputText, startX, startY);
    chains.push(chain);
    selectedChainId = id;
    updateChainsList();
    updateChainUI(chain);
    return chain;
}

function deleteChain(id) {
    chains = chains.filter(chain => chain.id !== id);
    if (selectedChainId === id) {
        selectedChainId = chains.length > 0 ? chains[0].id : null;
        if (selectedChainId) {
            const chain = chains.find(c => c.id === selectedChainId);
            if (chain) updateChainUI(chain);
        }
    }
    updateChainsList();
}

function getSelectedChain() {
    if (!selectedChainId) return chains.length > 0 ? chains[0] : null;
    return chains.find(c => c.id === selectedChainId) || chains[0] || null;
}

// ========== UI UPDATES ==========
function updateChainsList() {
    const list = document.getElementById('chains-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    chains.forEach(chain => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px; margin-bottom: 8px; border: 2px solid var(--chatooly-color-border); background: var(--chatooly-color-background);';
        
        const text = document.createElement('span');
        text.textContent = `Chain ${chain.id}: "${chain.text}"`;
        text.style.cssText = 'flex: 1; cursor: pointer;';
        text.addEventListener('click', () => {
            selectedChainId = chain.id;
            updateChainUI(chain);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.className = 'chatooly-btn';
        deleteBtn.style.cssText = 'min-width: auto; padding: 4px 8px; margin-left: 8px;';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChain(chain.id);
        });
        
        if (selectedChainId === chain.id) {
            item.style.borderColor = 'var(--chatooly-color-primary)';
        }
        
        item.appendChild(text);
        item.appendChild(deleteBtn);
        list.appendChild(item);
    });
}

function updateChainUI(chain) {
    if (!chain) return;
    
    // Update text input
    const textInput = document.getElementById('chain-text');
    if (textInput) textInput.value = chain.text;
    
    // Update color inputs
    const chainColorInput = document.getElementById('chain-color');
    if (chainColorInput) chainColorInput.value = chain.chainColor;
    
    const strokeColorInput = document.getElementById('stroke-color');
    if (strokeColorInput) strokeColorInput.value = chain.strokeColor;
    
    const strokeWidthSlider = document.getElementById('stroke-width');
    if (strokeWidthSlider) {
        strokeWidthSlider.value = chain.strokeWidth;
        const valueDisplay = document.getElementById('stroke-width-value');
        if (valueDisplay) valueDisplay.textContent = chain.strokeWidth;
    }
    
    const fontColorInput = document.getElementById('font-color');
    if (fontColorInput) fontColorInput.value = chain.fontColor;
    
    // Update sliders
    const chainLengthSlider = document.getElementById('chain-length');
    if (chainLengthSlider) {
        chainLengthSlider.value = chain.chainLength;
        const valueDisplay = document.getElementById('chain-length-value');
        if (valueDisplay) valueDisplay.textContent = chain.chainLength;
    }
    
    const beadSizeSlider = document.getElementById('bead-size');
    if (beadSizeSlider) {
        beadSizeSlider.value = chain.beadSize;
        const valueDisplay = document.getElementById('bead-size-value');
        if (valueDisplay) valueDisplay.textContent = chain.beadSize;
    }
    
    const beadShapeSelect = document.getElementById('bead-shape');
    if (beadShapeSelect) beadShapeSelect.value = chain.beadShape;
    
    const bouncinessSlider = document.getElementById('bounciness');
    if (bouncinessSlider) {
        bouncinessSlider.value = chain.bounciness;
        const valueDisplay = document.getElementById('bounciness-value');
        if (valueDisplay) valueDisplay.textContent = chain.bounciness.toFixed(2);
    }
}

// ========== TEXT TO CHAIN ==========
function updateChainFromText() {
    const chain = getSelectedChain();
    if (!chain) return;
    
    chain.text = inputText;
    chain.createBeads();
}

// ========== MOUSE COORDINATE MAPPING ==========
function getMouseCoords(p) {
    if (!p5Instance) return { x: 0, y: 0 };
    
    const canvas = document.getElementById('chatooly-canvas');
    if (!canvas) return { x: p.mouseX, y: p.mouseY };
    
    if (window.Chatooly && window.Chatooly.utils && window.Chatooly.utils.mapMouseToCanvas) {
        const rect = canvas.getBoundingClientRect();
        const fakeEvent = {
            clientX: p.mouseX + rect.left,
            clientY: p.mouseY + rect.top
        };
        return window.Chatooly.utils.mapMouseToCanvas(fakeEvent, canvas);
    }
    
    return { x: p.mouseX, y: p.mouseY };
}

// ========== CANVAS RESIZE HANDLING ==========
function onCanvasResized(e) {
    if (!e.detail || !e.detail.canvas || !p5Instance) return;
    
    const newWidth = e.detail.canvas.width;
    const newHeight = e.detail.canvas.height;
    
    if (newWidth && newHeight) {
        const oldWidth = p5Instance.width || canvasWidth;
        const oldHeight = p5Instance.height || canvasHeight;
        
        p5Instance.resizeCanvas(newWidth, newHeight);
        canvasWidth = newWidth;
        canvasHeight = newHeight;
        
        // Scale all chains
        if (chains.length > 0 && oldWidth > 0 && oldHeight > 0) {
            const scaleX = newWidth / oldWidth;
            const scaleY = newHeight / oldHeight;
            
            chains.forEach(chain => {
                chain.anchorX *= scaleX;
                chain.anchorY *= scaleY;
                chain.beads.forEach(bead => {
                    bead.x *= scaleX;
                    bead.y *= scaleY;
                    bead.prevX *= scaleX;
                    bead.prevY *= scaleY;
                });
            });
        }
    }
}

// ========== BACKGROUND CONTROLS ==========
function setupBackgroundControls() {
    const transparentToggle = document.getElementById('transparent-bg');
    if (transparentToggle) {
        transparentToggle.addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setTransparent(isPressed);
            }
        });
    }
    
    const bgColor = document.getElementById('bg-color');
    if (bgColor) {
        bgColor.addEventListener('input', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setBackgroundColor(e.target.value);
            }
        });
    }
    
    const bgImage = document.getElementById('bg-image');
    if (bgImage) {
        bgImage.addEventListener('change', async (e) => {
            if (e.target.files[0] && window.Chatooly && window.Chatooly.backgroundManager) {
                await window.Chatooly.backgroundManager.setBackgroundImage(e.target.files[0]);
                document.getElementById('clear-bg-image').style.display = 'block';
                document.getElementById('bg-fit-group').style.display = 'block';
            }
        });
    }
    
    const clearBg = document.getElementById('clear-bg-image');
    if (clearBg) {
        clearBg.addEventListener('click', () => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.clearBackgroundImage();
                document.getElementById('clear-bg-image').style.display = 'none';
                document.getElementById('bg-fit-group').style.display = 'none';
                document.getElementById('bg-image').value = '';
            }
        });
    }
    
    const bgFit = document.getElementById('bg-fit');
    if (bgFit) {
        bgFit.addEventListener('change', (e) => {
            if (window.Chatooly && window.Chatooly.backgroundManager) {
                window.Chatooly.backgroundManager.setFit(e.target.value);
            }
        });
    }
}

// ========== UI CONTROL HANDLERS ==========
function setupUIControls() {
    // Add chain button
    const addChainBtn = document.getElementById('add-chain-btn');
    if (addChainBtn) {
        addChainBtn.addEventListener('click', () => {
            createNewChain();
        });
    }
    
    // Text input
    const textInput = document.getElementById('chain-text');
    if (textInput) {
        textInput.addEventListener('input', (e) => {
            inputText = e.target.value;
            const chain = getSelectedChain();
            if (chain) {
                chain.text = inputText;
                chain.createBeads();
            }
        });
    }
    
    // Chain length
    const chainLengthSlider = document.getElementById('chain-length');
    const chainLengthValue = document.getElementById('chain-length-value');
    if (chainLengthSlider) {
        chainLengthSlider.addEventListener('input', (e) => {
            chainLength = parseFloat(e.target.value);
            if (chainLengthValue) chainLengthValue.textContent = chainLength;
            const chain = getSelectedChain();
            if (chain) {
                chain.chainLength = chainLength;
                chain.createBeads();
            }
        });
    }
    
    // Bead size
    const beadSizeSlider = document.getElementById('bead-size');
    const beadSizeValue = document.getElementById('bead-size-value');
    if (beadSizeSlider) {
        beadSizeSlider.addEventListener('input', (e) => {
            beadSize = parseFloat(e.target.value);
            if (beadSizeValue) beadSizeValue.textContent = beadSize;
            const chain = getSelectedChain();
            if (chain) {
                chain.beadSize = beadSize;
                chain.beads.forEach(bead => {
                    bead.radius = beadSize / 2;
                });
            }
        });
    }
    
    // Bounciness
    const bouncinessSlider = document.getElementById('bounciness');
    const bouncinessValue = document.getElementById('bounciness-value');
    if (bouncinessSlider) {
        bouncinessSlider.addEventListener('input', (e) => {
            bounciness = parseFloat(e.target.value);
            if (bouncinessValue) bouncinessValue.textContent = bounciness.toFixed(2);
            const chain = getSelectedChain();
            if (chain) {
                chain.bounciness = bounciness;
            }
        });
    }
    
    // Gravity (global)
    const gravitySlider = document.getElementById('gravity');
    const gravityValue = document.getElementById('gravity-value');
    if (gravitySlider) {
        gravitySlider.addEventListener('input', (e) => {
            gravity = parseFloat(e.target.value);
            if (gravityValue) gravityValue.textContent = gravity.toFixed(1);
        });
    }
    
    // Chain color (bead color)
    const chainColorInput = document.getElementById('chain-color');
    if (chainColorInput) {
        chainColorInput.addEventListener('input', (e) => {
            chainColor = e.target.value;
            const chain = getSelectedChain();
            if (chain) {
                chain.chainColor = chainColor;
            }
        });
    }
    
    // Stroke color
    const strokeColorInput = document.getElementById('stroke-color');
    if (strokeColorInput) {
        strokeColorInput.addEventListener('input', (e) => {
            strokeColor = e.target.value;
            const chain = getSelectedChain();
            if (chain) {
                chain.strokeColor = strokeColor;
            }
        });
    }
    
    // Stroke width
    const strokeWidthSlider = document.getElementById('stroke-width');
    const strokeWidthValue = document.getElementById('stroke-width-value');
    if (strokeWidthSlider) {
        strokeWidthSlider.addEventListener('input', (e) => {
            strokeWidth = parseFloat(e.target.value);
            if (strokeWidthValue) strokeWidthValue.textContent = strokeWidth;
            const chain = getSelectedChain();
            if (chain) {
                chain.strokeWidth = strokeWidth;
            }
        });
    }
    
    // Font color
    const fontColorInput = document.getElementById('font-color');
    if (fontColorInput) {
        fontColorInput.addEventListener('input', (e) => {
            fontColor = e.target.value;
            const chain = getSelectedChain();
            if (chain) {
                chain.fontColor = fontColor;
            }
        });
    }
    
    // Bead shape
    const beadShapeSelect = document.getElementById('bead-shape');
    if (beadShapeSelect) {
        beadShapeSelect.addEventListener('change', (e) => {
            beadShape = e.target.value;
            const chain = getSelectedChain();
            if (chain) {
                chain.beadShape = beadShape;
            }
        });
    }
    
    // Wind strength
    const windStrengthSlider = document.getElementById('wind-strength');
    const windStrengthValue = document.getElementById('wind-strength-value');
    if (windStrengthSlider) {
        windStrengthSlider.addEventListener('input', (e) => {
            windStrength = parseFloat(e.target.value);
            if (windStrengthValue) windStrengthValue.textContent = windStrength.toFixed(1);
        });
    }
    
    // Wind direction
    const windDirectionSlider = document.getElementById('wind-direction');
    const windDirectionValue = document.getElementById('wind-direction-value');
    if (windDirectionSlider) {
        windDirectionSlider.addEventListener('input', (e) => {
            windDirection = parseFloat(e.target.value);
            if (windDirectionValue) windDirectionValue.textContent = Math.round(windDirection);
        });
    }
    
    // Wind variation
    const windVariationSlider = document.getElementById('wind-variation');
    const windVariationValue = document.getElementById('wind-variation-value');
    if (windVariationSlider) {
        windVariationSlider.addEventListener('input', (e) => {
            windVariation = parseFloat(e.target.value);
            if (windVariationValue) windVariationValue.textContent = windVariation.toFixed(1);
        });
    }
}

// ========== HIGH-RESOLUTION EXPORT ==========
window.renderHighResolution = function(targetCanvas, scale) {
    if (!chains || chains.length === 0) {
        console.warn('No chains to export');
        return;
    }
    
    if (!p5Instance) {
        console.warn('p5 instance not available');
        return;
    }
    
    const ctx = targetCanvas.getContext('2d');
    const scaledWidth = canvasWidth * scale;
    const scaledHeight = canvasHeight * scale;
    
    targetCanvas.width = scaledWidth;
    targetCanvas.height = scaledHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, scaledWidth, scaledHeight);
    
    // Draw background
    if (window.Chatooly && window.Chatooly.backgroundManager) {
        window.Chatooly.backgroundManager.drawToCanvas(ctx, scaledWidth, scaledHeight);
    } else {
        ctx.fillStyle = '#2b2b2b';
        ctx.fillRect(0, 0, scaledWidth, scaledHeight);
    }
    
    // Scale context
    ctx.scale(scale, scale);
    
    // Draw all chains
    for (let chain of chains) {
        // Draw connections
        ctx.strokeStyle = chain.strokeColor;
        ctx.lineWidth = chain.strokeWidth;
        ctx.beginPath();
        
        for (let i = 1; i < chain.beads.length; i++) {
            ctx.moveTo(chain.beads[i - 1].x, chain.beads[i - 1].y);
            ctx.lineTo(chain.beads[i].x, chain.beads[i].y);
        }
        ctx.stroke();
        
        // Draw beads
        for (let bead of chain.beads) {
            // Draw bead shape
            ctx.fillStyle = chain.chainColor;
            ctx.strokeStyle = chain.strokeColor;
            ctx.lineWidth = 2;
            drawBeadShapeHighRes(ctx, bead.x, bead.y, bead.radius, chain.beadShape);
            
            // Draw letter
            ctx.fillStyle = chain.fontColor;
            ctx.font = `${bead.radius * 0.8}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(bead.letter, bead.x, bead.y);
        }
        
        // Anchor point is now the first bead, no separate circle needed
    }
    
    console.log(`High-res export completed at ${scale}x resolution`);
};

// Helper function for high-res export shapes
function drawBeadShapeHighRes(ctx, x, y, radius, shape) {
    const size = radius * 2;
    
    ctx.beginPath();
    
    switch(shape) {
        case 'circle':
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            break;
            
        case 'square':
            ctx.rect(x - radius, y - radius, size, size);
            break;
            
        case 'triangle':
            for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI * 2 / 3) - Math.PI / 2;
                const px = x + Math.cos(angle) * radius;
                const py = y + Math.sin(angle) * radius;
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.closePath();
            break;
            
        case 'diamond':
            ctx.moveTo(x, y - radius);
            ctx.lineTo(x + radius, y);
            ctx.lineTo(x, y + radius);
            ctx.lineTo(x - radius, y);
            ctx.closePath();
            break;
            
        case 'hexagon':
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI * 2 / 6) - Math.PI / 2;
                const px = x + Math.cos(angle) * radius;
                const py = y + Math.sin(angle) * radius;
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.closePath();
            break;
            
        case 'star':
            const outerRadius = radius;
            const innerRadius = radius * 0.5;
            for (let i = 0; i < 10; i++) {
                const angle = (i * Math.PI * 2 / 10) - Math.PI / 2;
                const r = i % 2 === 0 ? outerRadius : innerRadius;
                const px = x + Math.cos(angle) * r;
                const py = y + Math.sin(angle) * r;
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.closePath();
            break;
            
        default:
            ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
    
    ctx.fill();
    ctx.stroke();
}
