/**
 * 3D Tetris Block Builder - Main Logic
 * Build text and shapes using Tetris blocks with 3D effects
 */

class TetrisBlockBuilder {
    constructor() {
        this.canvas = document.getElementById('chatooly-canvas');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.animationId = null;

        // Canvas resize tracking
        this.previousCanvasSize = { width: 0, height: 0 };

        // Block objects
        this.blockObjects = [];
        this.blockGroup = null;
        this.hasBlocks = false; // Track if blocks have been generated

        // Animation state
        this.animationState = {
            autoRotate: false,  // Default: off
            rotationSpeed: 0.005,
            floatingAnimation: false,
            cameraDistance: 15,
            lighting: 1.0,
            cameraMovement: 'none',
            cameraTime: 0
        };

        // Block configuration
        this.blockConfig = {
            spacing: 1.2,
            size: 0.8,
            depth: 0.5,
            rotationX: 0,
            rotationY: 0,
            perspective: 45,
            letterSpacing: 1.0
        };

        // Animation state for Tetris drop
        this.tetrisAnimation = {
            enabled: false,
            blocks: [],
            startTime: 0,
            duration: 2000, // 2 seconds
            speed: 1.0,
            order: 'left-to-right',
            easing: 'bounce'
        };

        // Background rendering
        this.backgroundTexture = null;

        // Tetris block definitions (I, O, T, S, Z, J, L)
        this.tetrisBlocks = this.initializeTetrisBlocks();

        // Color palettes
        this.colorPalettes = {
            classic: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xff8800],
            rainbow: [0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x4b0082, 0x9400d3],
            monochrome: [0xffffff, 0xcccccc, 0x999999, 0x666666, 0x333333, 0x000000]
        };

        this.init();
    }

    initializeTetrisBlocks() {
        // SRS (Super Rotation System) tetromino definitions
        // Each tetromino has 4 rotations (0°, 90°, 180°, 270°)
        // Each rotation is a matrix where 1 = block, 0 = empty
        // Coordinates are relative to the piece's pivot point
        return {
            'I': {
                name: 'I-Piece',
                color: 0x00FFFF,
                matrixSize: 4,
                rotations: [
                    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],  // 0° (horizontal)
                    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],  // 90° (vertical)
                    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],  // 180° (horizontal flipped)
                    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]   // 270° (vertical flipped)
                ]
            },
            'J': {
                name: 'J-Piece',
                color: 0x0000FF,
                matrixSize: 3,
                rotations: [
                    [[1,0,0],[1,1,1],[0,0,0]],  // 0°
                    [[0,1,1],[0,1,0],[0,1,0]],  // 90°
                    [[0,0,0],[1,1,1],[0,0,1]],  // 180°
                    [[0,1,0],[0,1,0],[1,1,0]]   // 270°
                ]
            },
            'L': {
                name: 'L-Piece',
                color: 0xFF7F00,
                matrixSize: 3,
                rotations: [
                    [[0,0,1],[1,1,1],[0,0,0]],  // 0°
                    [[0,1,0],[0,1,0],[0,1,1]],  // 90°
                    [[0,0,0],[1,1,1],[1,0,0]],  // 180°
                    [[1,1,0],[0,1,0],[0,1,0]]   // 270°
                ]
            },
            'O': {
                name: 'O-Piece',
                color: 0xFFFF00,
                matrixSize: 2,
                rotations: [
                    [[1,1],[1,1]],  // All rotations are the same (square)
                    [[1,1],[1,1]],
                    [[1,1],[1,1]],
                    [[1,1],[1,1]]
                ]
            },
            'S': {
                name: 'S-Piece',
                color: 0x00FF00,
                matrixSize: 3,
                rotations: [
                    [[0,1,1],[1,1,0],[0,0,0]],  // 0°
                    [[0,1,0],[0,1,1],[0,0,1]],  // 90°
                    [[0,0,0],[0,1,1],[1,1,0]],  // 180°
                    [[1,0,0],[1,1,0],[0,1,0]]   // 270°
                ]
            },
            'T': {
                name: 'T-Piece',
                color: 0x800080,
                matrixSize: 3,
                rotations: [
                    [[0,1,0],[1,1,1],[0,0,0]],  // 0°
                    [[0,1,0],[0,1,1],[0,1,0]],  // 90°
                    [[0,0,0],[1,1,1],[0,1,0]],  // 180°
                    [[0,1,0],[1,1,0],[0,1,0]]   // 270°
                ]
            },
            'Z': {
                name: 'Z-Piece',
                color: 0xFF0000,
                matrixSize: 3,
                rotations: [
                    [[1,1,0],[0,1,1],[0,0,0]],  // 0°
                    [[0,0,1],[0,1,1],[0,1,0]],  // 90°
                    [[0,0,0],[1,1,0],[0,1,1]],  // 180°
                    [[0,1,0],[1,1,0],[1,0,0]]   // 270°
                ]
            }
        };
    }

    // Convert SRS matrix to relative positions for rendering
    // Returns positions relative to bottom-left corner (0,0) of the tetromino
    // This matches the coordinate system used in the font definition
    matrixToPositions(matrix, matrixSize) {
        const positions = [];
        // Find the bottom-left occupied cell
        let minRow = matrixSize, minCol = matrixSize;
        for (let row = 0; row < matrixSize; row++) {
            for (let col = 0; col < matrixSize; col++) {
                if (matrix[row][col] === 1) {
                    minRow = Math.min(minRow, row);
                    minCol = Math.min(minCol, col);
                }
            }
        }
        
        // Convert to positions relative to bottom-left
        // In matrix: row 0 is top, row increases downward
        // In our system: y=0 is bottom, y increases upward
        for (let row = 0; row < matrixSize; row++) {
            for (let col = 0; col < matrixSize; col++) {
                if (matrix[row][col] === 1) {
                    const x = col - minCol;
                    const y = (matrixSize - 1 - row) - (matrixSize - 1 - minRow); // Flip y
                    positions.push([x, y]);
                }
            }
        }
        return positions;
    }

    init() {
        this.initThreeJS();
        this.setupEventListeners();
        this.setupBackgroundManager();
        // Wait a bit for DOM to be ready before generating blocks
        setTimeout(() => {
            this.generateDefaultBlocks();
        }, 200);
        this.render();
    }

    initThreeJS() {
        // Set initial canvas dimensions
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.width = '800px';
        this.canvas.style.height = '600px';

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, this.canvas.offsetWidth / this.canvas.offsetHeight, 0.1, 1000);
        this.camera.position.set(0, 0, this.animationState.cameraDistance);
        this.camera.lookAt(0, 0, 0);

        // Renderer with critical export settings
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance",
            alpha: true
        });

        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(this.canvas.offsetWidth, this.canvas.offsetHeight);
        // Set dark background as default (will be overridden by backgroundManager if needed)
        this.renderer.setClearColor(0x1a1a1a, 1);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4 * this.animationState.lighting);
        ambientLight.userData.originalIntensity = 0.4;
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8 * this.animationState.lighting);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.userData.originalIntensity = 0.8;
        this.scene.add(directionalLight);

        // Point light for more dramatic effect
        const pointLight = new THREE.PointLight(0xffffff, 0.5 * this.animationState.lighting);
        pointLight.position.set(-10, 10, 10);
        pointLight.userData.originalIntensity = 0.5;
        this.scene.add(pointLight);
    }

    setupEventListeners() {
        // Canvas resize handling - Chatooly CDN event
        document.addEventListener('chatooly:canvas-resized', (e) => {
            console.log('Chatooly canvas resize event received');
            this.onCanvasResized(e);
        });
        
        // Also listen for window resize as backup
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Check if canvas size actually changed
                const currentWidth = this.canvas.offsetWidth;
                const currentHeight = this.canvas.offsetHeight;
                if (currentWidth !== this.previousCanvasSize.width || 
                    currentHeight !== this.previousCanvasSize.height) {
                    console.log('Window resize detected, canvas size changed');
                    // Trigger manual resize event
                    const fakeEvent = {
                        detail: {
                            canvas: this.canvas
                        }
                    };
                    this.onCanvasResized(fakeEvent);
                }
            }, 300);
        });

        // Generate button
        document.getElementById('generate-blocks').addEventListener('click', () => this.generateBlocks());
        
        // Export JSON button
        document.getElementById('export-json').addEventListener('click', () => {
            if (window.exportTetrisProject) {
                window.exportTetrisProject();
            }
        });

        // Text input
        document.getElementById('text-input').addEventListener('input', () => {
            if (document.getElementById('shape-template').value === 'text') {
                this.generateBlocks();
            }
        });

        // Shape template
        document.getElementById('shape-template').addEventListener('change', () => this.generateBlocks());

        // Block controls
        document.getElementById('block-type').addEventListener('change', () => this.generateBlocks());
        document.getElementById('block-spacing').addEventListener('input', (e) => {
            this.blockConfig.spacing = parseFloat(e.target.value);
            document.getElementById('block-spacing-value').textContent = e.target.value;
            this.updateBlockPositions();
        });
        document.getElementById('block-size').addEventListener('input', (e) => {
            this.blockConfig.size = parseFloat(e.target.value);
            document.getElementById('block-size-value').textContent = e.target.value;
            this.generateBlocks();
        });

        // Letter spacing control
        document.getElementById('letter-spacing').addEventListener('input', (e) => {
            this.blockConfig.letterSpacing = parseFloat(e.target.value);
            document.getElementById('letter-spacing-value').textContent = e.target.value;
            if (document.getElementById('shape-template').value === 'text') {
                this.generateBlocks();
            }
        });

        // Tetris animation toggle
        document.getElementById('tetris-animation').addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            this.tetrisAnimation.enabled = !isPressed;
            const speedGroup = document.getElementById('animation-speed-group');
            const orderGroup = document.getElementById('animation-order-group');
            const easingGroup = document.getElementById('animation-easing-group');
            if (this.tetrisAnimation.enabled) {
                speedGroup.style.display = 'block';
                orderGroup.style.display = 'block';
                easingGroup.style.display = 'block';
                if (this.hasBlocks) {
                    this.startTetrisAnimation();
                }
            } else {
                speedGroup.style.display = 'none';
                orderGroup.style.display = 'none';
                easingGroup.style.display = 'none';
            }
        });

        // Animation controls
        document.getElementById('animation-speed').addEventListener('input', (e) => {
            this.tetrisAnimation.speed = parseFloat(e.target.value);
            document.getElementById('animation-speed-value').textContent = e.target.value;
            this.tetrisAnimation.duration = 2000 / this.tetrisAnimation.speed;
        });
        document.getElementById('animation-order').addEventListener('change', (e) => {
            this.tetrisAnimation.order = e.target.value;
        });
        document.getElementById('animation-easing').addEventListener('change', (e) => {
            this.tetrisAnimation.easing = e.target.value;
        });

        // Color controls
        document.getElementById('color-mode').addEventListener('change', (e) => {
            const customGroup = document.getElementById('custom-color-group');
            customGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
            this.generateBlocks();
        });
        document.getElementById('block-color').addEventListener('input', () => this.generateBlocks());
        document.getElementById('material-type').addEventListener('change', () => this.generateBlocks());

        // 3D effects
        document.getElementById('depth').addEventListener('input', (e) => {
            this.blockConfig.depth = parseFloat(e.target.value);
            document.getElementById('depth-value').textContent = e.target.value;
            this.updateBlockDepths();
        });
        document.getElementById('perspective').addEventListener('input', (e) => {
            this.blockConfig.perspective = parseFloat(e.target.value);
            document.getElementById('perspective-value').textContent = e.target.value;
            this.updateCameraPerspective();
        });
        document.getElementById('rotation-x').addEventListener('input', (e) => {
            this.blockConfig.rotationX = parseFloat(e.target.value) * Math.PI / 180;
            document.getElementById('rotation-x-value').textContent = e.target.value;
            this.updateBlockRotation();
        });
        document.getElementById('rotation-y').addEventListener('input', (e) => {
            this.blockConfig.rotationY = parseFloat(e.target.value) * Math.PI / 180;
            document.getElementById('rotation-y-value').textContent = e.target.value;
            this.updateBlockRotation();
        });

        // Animation controls
        document.getElementById('auto-rotate').addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            this.animationState.autoRotate = !isPressed;
        });
        document.getElementById('rotation-speed').addEventListener('input', (e) => {
            this.animationState.rotationSpeed = parseFloat(e.target.value) * 0.01;
            document.getElementById('rotation-speed-value').textContent = e.target.value;
        });
        document.getElementById('floating-animation').addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            this.animationState.floatingAnimation = !isPressed;
        });
        document.getElementById('camera-distance').addEventListener('input', (e) => {
            this.animationState.cameraDistance = parseFloat(e.target.value);
            document.getElementById('camera-distance-value').textContent = e.target.value;
            this.updateCameraPosition();
        });
        document.getElementById('lighting').addEventListener('input', (e) => {
            this.animationState.lighting = parseFloat(e.target.value);
            document.getElementById('lighting-value').textContent = e.target.value;
            this.updateLighting();
        });
        document.getElementById('lighting-preset').addEventListener('change', (e) => {
            this.applyLightingPreset(e.target.value);
        });
        document.getElementById('camera-movement').addEventListener('change', (e) => {
            this.animationState.cameraMovement = e.target.value;
        });
    }

    setupBackgroundManager() {
        if (!window.Chatooly || !window.Chatooly.backgroundManager) {
            setTimeout(() => this.setupBackgroundManager(), 100);
            return;
        }

        Chatooly.backgroundManager.init(this.canvas);

        document.getElementById('transparent-bg').addEventListener('click', (e) => {
            const isPressed = e.target.getAttribute('aria-pressed') === 'true';
            const newState = !isPressed;
            e.target.setAttribute('aria-pressed', newState);
            Chatooly.backgroundManager.setTransparent(newState);
            document.getElementById('bg-color-group').style.display = newState ? 'none' : 'block';
            this.updateBackground();
        });

        document.getElementById('bg-color').addEventListener('input', (e) => {
            Chatooly.backgroundManager.setBackgroundColor(e.target.value);
            this.updateBackground();
        });

        document.getElementById('bg-image').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                await Chatooly.backgroundManager.setBackgroundImage(file);
                document.getElementById('clear-bg-image').style.display = 'block';
                document.getElementById('bg-fit-group').style.display = 'block';
                this.updateBackground();
            } catch (error) {
                alert('Failed to load image: ' + error.message);
            }
        });

        document.getElementById('clear-bg-image').addEventListener('click', () => {
            Chatooly.backgroundManager.clearBackgroundImage();
            document.getElementById('clear-bg-image').style.display = 'none';
            document.getElementById('bg-fit-group').style.display = 'none';
            document.getElementById('bg-image').value = '';
            this.updateBackground();
        });

        document.getElementById('bg-fit').addEventListener('change', (e) => {
            Chatooly.backgroundManager.setFit(e.target.value);
            this.updateBackground();
        });
    }

    updateBackground() {
        if (!window.Chatooly || !window.Chatooly.backgroundManager) {
            // Fallback to dark background if backgroundManager not available
            this.renderer.setClearColor(0x1a1a1a, 1);
            this.scene.background = null;
            return;
        }

        const bg = Chatooly.backgroundManager.getBackgroundState();

        if (bg.bgTransparent) {
            this.renderer.setClearAlpha(0);
            this.scene.background = null;
            if (this.backgroundTexture) {
                this.backgroundTexture.dispose();
                this.backgroundTexture = null;
            }
            return;
        }

        if (bg.bgImage && bg.bgImageURL) {
            if (this.backgroundTexture) {
                this.backgroundTexture.dispose();
                this.backgroundTexture = null;
            }

            const canvasWidth = this.renderer.domElement.width;
            const canvasHeight = this.renderer.domElement.height;
            const dims = Chatooly.backgroundManager.calculateImageDimensions(canvasWidth, canvasHeight);

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvasWidth;
            tempCanvas.height = canvasHeight;
            const ctx = tempCanvas.getContext('2d');

            ctx.fillStyle = bg.bgColor;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, dims.offsetX, dims.offsetY, dims.drawWidth, dims.drawHeight);
                this.backgroundTexture = new THREE.CanvasTexture(tempCanvas);
                this.backgroundTexture.needsUpdate = true;
                this.scene.background = this.backgroundTexture;
                const color = new THREE.Color(bg.bgColor);
                this.renderer.setClearColor(color, 1);
                this.renderer.setClearAlpha(1);
            };
            img.onerror = () => {
                const fallbackColor = new THREE.Color(bg.bgColor);
                this.renderer.setClearColor(fallbackColor, 1);
                this.renderer.setClearAlpha(1);
                this.scene.background = null;
            };
            img.src = bg.bgImageURL;
        } else {
            const color = new THREE.Color(bg.bgColor);
            this.renderer.setClearColor(color, 1);
            this.renderer.setClearAlpha(1);
            this.scene.background = null;
            if (this.backgroundTexture) {
                this.backgroundTexture.dispose();
                this.backgroundTexture = null;
            }
        }
    }

    onCanvasResized(e) {
        if (!this.renderer || !this.camera) {
            console.warn('Renderer or camera not ready for resize');
            return;
        }

        const canvas = e.detail.canvas || this.canvas;
        const newWidth = canvas.offsetWidth || canvas.width;
        const newHeight = canvas.offsetHeight || canvas.height;

        console.log('Canvas resized to:', newWidth, 'x', newHeight);
        console.log('Current block count:', this.blockObjects.length);
        console.log('hasBlocks flag:', this.hasBlocks);

        // Verify renderer is still connected to the canvas
        if (this.renderer.domElement !== canvas) {
            console.warn('Renderer canvas mismatch! Reconnecting...');
            // Reconnect renderer to canvas if needed
            // Note: Three.js renderer can't easily change canvas, so we'll regenerate
        }

        // Update camera and renderer
        this.camera.aspect = newWidth / newHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(newWidth, newHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Update background
        this.updateBackground();

        // CRITICAL: Regenerate blocks if they were previously created
        // The canvas gets cleared by the browser when dimensions change
        // So we MUST recreate all blocks
        if (this.hasBlocks) {
            console.log('Blocks exist, regenerating after resize...');
            // Use longer delay to ensure canvas is fully ready
            setTimeout(() => {
                if (this.hasBlocks && this.scene) {
                    console.log('Regenerating blocks now - scene has', this.scene.children.length, 'children');
                    this.generateBlocks();
                    // Force a render to make sure blocks are visible
                    this.renderer.render(this.scene, this.camera);
                } else {
                    console.warn('Cannot regenerate: hasBlocks=', this.hasBlocks, 'scene=', !!this.scene);
                }
            }, 200);
        } else {
            console.log('No blocks to regenerate');
        }

        this.previousCanvasSize = { width: newWidth, height: newHeight };
    }

    generateDefaultBlocks() {
        // Generate default "TETRIS" text
        this.generateBlocks();
    }

    generateBlocks() {
        // Clear existing blocks
        this.clearBlocks();

        if (!this.scene) {
            console.error('Scene not initialized');
            return;
        }

        const shapeTemplate = document.getElementById('shape-template').value;
        let pattern = [];

        if (shapeTemplate === 'text') {
            const textInput = document.getElementById('text-input').value.toUpperCase();
            // Handle multi-line text - split by newlines and process each line
            const lines = textInput.split('\n');
            pattern = [];
            let yOffset = 0;
            const lineHeight = 6; // Space between lines
            
            lines.forEach((line, lineIndex) => {
                if (line.trim().length > 0) {
                    const linePattern = this.textToPattern(line, yOffset);
                    pattern = pattern.concat(linePattern);
                }
                yOffset += lineHeight; // Move down for next line
            });
        } else {
            pattern = this.getShapePattern(shapeTemplate);
        }

        console.log('Pattern generated:', pattern.length, 'cells');

        if (pattern.length === 0) {
            console.warn('No pattern cells to render');
            return;
        }

        // Create block group
        this.blockGroup = new THREE.Group();
        this.scene.add(this.blockGroup);

        // Generate blocks for pattern
        const blockType = document.getElementById('block-type').value;
        const colorMode = document.getElementById('color-mode').value;
        const materialType = document.getElementById('material-type').value;

        let blockCount = 0;
        const blockData = []; // Store block data for animation
        
        // Check if pattern is pixels (from text) or cells (from shapes)
        const isPixelPattern = pattern.length > 0 && pattern[0].pixelIndex !== undefined;
        
        if (isPixelPattern) {
            // Pattern is pixels - create individual cubes with tetromino colors
            pattern.forEach((pixel, index) => {
                if (pixel && pixel.value === 1) {
                    // Create a single cube (not a full tetromino)
                    const cube = this.createPixelCube(
                        pixel.x,
                        pixel.y,
                        colorMode,
                        materialType,
                        pixel.pixelIndex || index
                    );
                    
                    this.blockGroup.add(cube);
                    this.blockObjects.push(cube);
                    blockData.push({
                        block: cube,
                        cellY: pixel.y,
                        index: index
                    });
                    blockCount++;
                }
            });
        } else {
            // Pattern is cells (from shapes) - use old method with tetromino blocks
            pattern.forEach((cell, index) => {
                if (cell && cell.value === 1) {
                    const block = this.createTetrisBlock(
                        cell.x,
                        cell.y,
                        blockType,
                        colorMode,
                        materialType,
                        index
                    );
                    
                    this.blockGroup.add(block);
                    this.blockObjects.push(block);
                    blockData.push({
                        block: block,
                        cellY: cell.y,
                        index: index
                    });
                    blockCount++;
                }
            });
        }

        console.log('Created', blockCount, 'blocks');

        // Center the group
        this.centerBlockGroup();
        this.updateBlockRotation();
        this.updateBlockDepths();
        
        // Store final positions for animation (after centering)
        this.tetrisAnimation.blocks = blockData.map(data => {
            // Store current local position as final position
            const finalLocalPos = data.block.position.clone();
            return {
                block: data.block,
                finalLocalPosition: finalLocalPos,
                cellY: data.cellY,
                index: data.index
            };
        });
        
        // Mark that blocks have been generated
        this.hasBlocks = true;
        
        // Start Tetris animation if enabled
        if (this.tetrisAnimation.enabled) {
            this.startTetrisAnimation();
        }
        
        console.log('Block group centered and positioned');
    }

    // Pixel-based font - each letter is a grid of pixels
    // Each pixel gets a tetromino color, but we render individual cubes
    // This ensures letters are clear and readable
    getPixelFont() {
        // 5x4 pixel font (5 rows, 4 columns per letter)
        const font = {
            'A': [
                [0,1,1,0],
                [1,0,0,1],
                [1,1,1,1],
                [1,0,0,1],
                [1,0,0,1]
            ],
            'B': [
                [1,1,1,0],
                [1,0,0,1],
                [1,1,1,0],
                [1,0,0,1],
                [1,1,1,0]
            ],
            'C': [
                [0,1,1,0],
                [1,0,0,0],
                [1,0,0,0],
                [1,0,0,0],
                [0,1,1,0]
            ],
            'D': [
                [1,1,1,0],
                [1,0,0,1],
                [1,0,0,1],
                [1,0,0,1],
                [1,1,1,0]
            ],
            'E': [
                [1,1,1,1],
                [1,0,0,0],
                [1,1,1,0],
                [1,0,0,0],
                [1,1,1,1]
            ],
            'F': [
                [1,1,1,1],
                [1,0,0,0],
                [1,1,1,0],
                [1,0,0,0],
                [1,0,0,0]
            ],
            'G': [
                [0,1,1,0],
                [1,0,0,0],
                [1,0,1,1],
                [1,0,0,1],
                [0,1,1,0]
            ],
            'H': [
                [1,0,0,1],
                [1,0,0,1],
                [1,1,1,1],
                [1,0,0,1],
                [1,0,0,1]
            ],
            'I': [
                [1,1,1],
                [0,1,0],
                [0,1,0],
                [0,1,0],
                [1,1,1]
            ],
            'J': [
                [0,0,1],
                [0,0,1],
                [0,0,1],
                [1,0,1],
                [0,1,0]
            ],
            'K': [
                [1,0,0,1],
                [1,0,1,0],
                [1,1,0,0],
                [1,0,1,0],
                [1,0,0,1]
            ],
            'L': [
                [1,0,0,0],
                [1,0,0,0],
                [1,0,0,0],
                [1,0,0,0],
                [1,1,1,1]
            ],
            'M': [
                [1,0,0,0,1],
                [1,1,0,1,1],
                [1,0,1,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1]
            ],
            'N': [
                [1,0,0,1],
                [1,1,0,1],
                [1,0,1,1],
                [1,0,0,1],
                [1,0,0,1]
            ],
            'O': [
                [0,1,1,0],
                [1,0,0,1],
                [1,0,0,1],
                [1,0,0,1],
                [0,1,1,0]
            ],
            'P': [
                [1,1,1,0],
                [1,0,0,1],
                [1,1,1,0],
                [1,0,0,0],
                [1,0,0,0]
            ],
            'Q': [
                [0,1,1,0],
                [1,0,0,1],
                [1,0,0,1],
                [1,0,1,1],
                [0,1,1,1]
            ],
            'R': [
                [1,1,1,0],
                [1,0,0,1],
                [1,1,1,0],
                [1,0,1,0],
                [1,0,0,1]
            ],
            'S': [
                [0,1,1,0],
                [1,0,0,0],
                [0,1,1,0],
                [0,0,0,1],
                [1,1,1,0]
            ],
            'T': [
                [1,1,1],
                [0,1,0],
                [0,1,0],
                [0,1,0],
                [0,1,0]
            ],
            'U': [
                [1,0,0,1],
                [1,0,0,1],
                [1,0,0,1],
                [1,0,0,1],
                [0,1,1,0]
            ],
            'V': [
                [1,0,0,1],
                [1,0,0,1],
                [1,0,0,1],
                [0,1,0,1],
                [0,0,1,0]
            ],
            'W': [
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,1,0,1],
                [1,1,0,1,1],
                [1,0,0,0,1]
            ],
            'X': [
                [1,0,0,1],
                [0,1,1,0],
                [0,0,0,0],
                [0,1,1,0],
                [1,0,0,1]
            ],
            'Y': [
                [1,0,0,1],
                [0,1,0,1],
                [0,0,1,0],
                [0,0,1,0],
                [0,0,1,0]
            ],
            'Z': [
                [1,1,1,1],
                [0,0,0,1],
                [0,1,1,0],
                [1,0,0,0],
                [1,1,1,1]
            ],
            ' ': [
                [0,0,0,0],
                [0,0,0,0],
                [0,0,0,0],
                [0,0,0,0],
                [0,0,0,0]
            ]
        };
        return font;
    }

    // Get tetromino color for a pixel based on position
    // This creates visual variety while keeping letters clear
    getTetrominoColorForPixel(x, y, index) {
        const tetrominoTypes = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        // Use position to determine which tetromino color to use
        const colorIndex = (x + y * 4 + index) % tetrominoTypes.length;
        const type = tetrominoTypes[colorIndex];
        return this.tetrisBlocks[type].color;
    }

    // Old method - keeping for reference but not using
    getTetrominoFont() {
        return {
            'A': [
                {type: 'I', x: 0, y: 0, rotation: 1},  // Left vertical leg
                {type: 'I', x: 3, y: 0, rotation: 1},  // Right vertical leg
                {type: 'I', x: 1, y: 2, rotation: 0},  // Horizontal bar in middle
                {type: 'T', x: 1, y: 4, rotation: 2}   // Inverted T on top
            ],
            'B': [
                {type: 'I', x: 0, y: 0, rotation: 1},  // Vertical I on left (full height 0-4)
                {type: 'O', x: 2, y: 3, rotation: 0},  // Top O on right (rows 3-4)
                {type: 'O', x: 2, y: 1, rotation: 0},  // Bottom O on right (rows 1-2)
                {type: 'I', x: 1, y: 2, rotation: 0}   // Middle horizontal connecting bar
            ],
            'C': [
                {type: 'I', x: 0, y: 0, rotation: 1},  // Vertical bar on left (brown)
                {type: 'I', x: 0, y: 0, rotation: 0}   // Horizontal bar at bottom (dark green)
            ],
            'D': [
                {type: 'I', x: 0, y: 0, rotation: 1},  // Vertical I on left
                {type: 'I', x: 3, y: 0, rotation: 1},  // Vertical I on right
                {type: 'I', x: 0, y: 4, rotation: 0},  // Horizontal I on top
                {type: 'I', x: 0, y: 0, rotation: 0}   // Horizontal I on bottom
            ],
            'E': [
                {type: 'I', x: 0, y: 4, rotation: 0},  // Horizontal bar at top (dark red/dark blue)
                {type: 'I', x: 0, y: 2, rotation: 0},  // Horizontal bar in middle (brown/purple)
                {type: 'I', x: 0, y: 0, rotation: 0}   // Horizontal bar at bottom (dark blue/dark red)
            ],
            'F': [
                {type: 'I', x: 0, y: 0, rotation: 1},  // Vertical I left (full height 0-4)
                {type: 'I', x: 0, y: 4, rotation: 0},  // Horizontal I top (full width)
                {type: 'I', x: 0, y: 2, rotation: 0}   // Horizontal I middle (partial width)
            ],
            'G': [
                {type: 'I', x: 0, y: 0, rotation: 1},  // Vertical I left
                {type: 'L', x: 0, y: 4, rotation: 0},  // L on top
                {type: 'J', x: 0, y: 0, rotation: 0},  // J on bottom
                {type: 'O', x: 2, y: 0, rotation: 0}   // O at bottom right for hook
            ],
            'H': [
                {type: 'I', x: 0, y: 2, rotation: 1},  // Top-left vertical (purple, rows 2-4)
                {type: 'I', x: 0, y: 0, rotation: 1},  // Bottom-left vertical (brown, rows 0-1)
                {type: 'I', x: 1, y: 2, rotation: 0},  // Horizontal bar in middle (red)
                {type: 'I', x: 3, y: 0, rotation: 1}   // Right vertical I
            ],
            'I': [
                {type: 'I', x: 1, y: 0, rotation: 1}   // Single vertical I (full height)
            ],
            'J': [
                {type: 'I', x: 2, y: 1, rotation: 1},  // Vertical I on right (rows 1-4)
                {type: 'I', x: 0, y: 0, rotation: 0},  // Horizontal I at bottom (full width)
                {type: 'J', x: 0, y: 0, rotation: 0}   // J tetromino at bottom-left for hook
            ],
            'K': [
                {type: 'I', x: 0, y: 0, rotation: 1},  // Vertical I on left
                {type: 'L', x: 2, y: 3, rotation: 0},  // L pointing up-right (top)
                {type: 'L', x: 2, y: 0, rotation: 2}   // L pointing down-right (bottom)
            ],
            'L': [
                {type: 'L', x: 0, y: 0, rotation: 0}   // Single L-shape block (olive green)
            ],
            'M': [
                {type: 'I', x: 0, y: 0, rotation: 1},  // Left vertical I (full height)
                {type: 'I', x: 4, y: 0, rotation: 1},  // Right vertical I (full height)
                {type: 'T', x: 1, y: 4, rotation: 2}   // Inverted T at top connecting left to middle
            ],
            'N': [
                {type: 'L', x: 0, y: 3, rotation: 0},  // L-shape at top-left (brown)
                {type: 'L', x: 2, y: 0, rotation: 2}   // L-shape at bottom-right (olive green, rotated)
            ],
            'O': [
                {type: 'I', x: 0, y: 0, rotation: 1},  // Left vertical (rows 0-3)
                {type: 'I', x: 3, y: 0, rotation: 1},  // Right vertical (rows 0-3)
                {type: 'I', x: 0, y: 4, rotation: 0},  // Top horizontal
                {type: 'I', x: 0, y: 0, rotation: 0}   // Bottom horizontal
            ],
            'P': [
                {type: 'I', x: 0, y: 0, rotation: 1},  // Vertical I on left (full height 0-4)
                {type: 'O', x: 2, y: 3, rotation: 0},  // O block at top-right (rows 3-4)
                {type: 'I', x: 1, y: 2, rotation: 0}   // Horizontal I in middle connecting to O
            ],
            'Q': [
                {type: 'J', x: 0, y: 0, rotation: 0},  // Same base as O
                {type: 'L', x: 2, y: 0, rotation: 0},
                {type: 'J', x: 0, y: 4, rotation: 1},
                {type: 'L', x: 2, y: 4, rotation: 1},
                {type: 'I', x: 3, y: 0, rotation: 1}   // I at bottom-right for tail
            ],
            'R': [
                {type: 'I', x: 0, y: 0, rotation: 1},  // Vertical I on left (full height)
                {type: 'O', x: 2, y: 3, rotation: 0},  // O block at top-right
                {type: 'I', x: 0, y: 2, rotation: 0},  // Horizontal I in middle
                {type: 'L', x: 2, y: 0, rotation: 0}   // L at bottom right for diagonal leg
            ],
            'S': [
                {type: 'L', x: 0, y: 3, rotation: 0},  // L-shape at top-left (yellow)
                {type: 'O', x: 2, y: 3, rotation: 0},  // Small block at top-right (green)
                {type: 'I', x: 1, y: 2, rotation: 1},  // Vertical block in middle (blue)
                {type: 'L', x: 0, y: 0, rotation: 2},  // L-shape at bottom-left (red, rotated)
                {type: 'O', x: 2, y: 0, rotation: 0}   // Small block at bottom-right (orange)
            ],
            'T': [
                {type: 'I', x: 0, y: 4, rotation: 0},  // Horizontal I for roof (top)
                {type: 'I', x: 1, y: 0, rotation: 1}   // Vertical I centered (rows 0-3)
            ],
            'U': [
                {type: 'I', x: 0, y: 0, rotation: 1},  // Left vertical I
                {type: 'I', x: 3, y: 0, rotation: 1},  // Right vertical I
                {type: 'I', x: 0, y: 0, rotation: 0}   // Horizontal I at bottom
            ],
            'V': [
                {type: 'L', x: 0, y: 0, rotation: 1},  // Left diagonal (L shape)
                {type: 'J', x: 2, y: 0, rotation: 1}   // Right diagonal (J shape) - forms V
            ],
            'W': [
                {type: 'I', x: 0, y: 0, rotation: 1},  // Left vertical I
                {type: 'I', x: 3, y: 0, rotation: 1},  // Right vertical I
                {type: 'I', x: 1, y: 0, rotation: 1},  // Middle vertical I
                {type: 'T', x: 1, y: 0, rotation: 1}   // T pointing up at bottom
            ],
            'X': [
                {type: 'Z', x: 0, y: 2, rotation: 0},  // Z block diagonal (top-left to bottom-right)
                {type: 'S', x: 1, y: 0, rotation: 0}   // S block diagonal (bottom-left to top-right)
            ],
            'Y': [
                {type: 'L', x: 0, y: 3, rotation: 0},  // L forming V at top (left)
                {type: 'J', x: 2, y: 3, rotation: 0},  // J forming V at top (right)
                {type: 'I', x: 1, y: 0, rotation: 1}   // I centered at bottom (rows 0-1)
            ],
            'Z': [
                {type: 'I', x: 0, y: 4, rotation: 0},  // Horizontal I top
                {type: 'Z', x: 0, y: 1, rotation: 0},  // Z tetromino diagonal
                {type: 'I', x: 0, y: 0, rotation: 0}   // Horizontal I bottom
            ],
            '0': [
                {type: 'J', x: 0, y: 3, rotation: 0},  // Same as O
                {type: 'L', x: 2, y: 3, rotation: 0},
                {type: 'J', x: 0, y: 0, rotation: 1},
                {type: 'L', x: 2, y: 0, rotation: 1}
            ],
            '1': [
                {type: 'I', x: 1, y: 0, rotation: 1}   // Vertical I
            ],
            '2': [
                {type: 'I', x: 0, y: 3, rotation: 0},  // Top horizontal
                {type: 'S', x: 0, y: 1, rotation: 0},  // Middle diagonal
                {type: 'I', x: 0, y: 0, rotation: 0}   // Bottom horizontal
            ],
            '3': [
                {type: 'I', x: 0, y: 3, rotation: 0},  // Top
                {type: 'I', x: 2, y: 0, rotation: 1},  // Right side
                {type: 'I', x: 0, y: 1, rotation: 0},  // Middle
                {type: 'I', x: 0, y: 0, rotation: 0}   // Bottom
            ],
            '4': [
                {type: 'L', x: 0, y: 0, rotation: 1},  // Left vertical
                {type: 'I', x: 0, y: 1, rotation: 0},  // Middle horizontal
                {type: 'J', x: 2, y: 0, rotation: 1}   // Right vertical
            ],
            '5': [
                {type: 'I', x: 0, y: 3, rotation: 0},  // Top
                {type: 'Z', x: 0, y: 1, rotation: 0},  // Middle diagonal
                {type: 'I', x: 0, y: 0, rotation: 0}   // Bottom
            ],
            '6': [
                {type: 'I', x: 0, y: 3, rotation: 0},  // Top
                {type: 'L', x: 0, y: 0, rotation: 1},  // Left vertical
                {type: 'I', x: 0, y: 1, rotation: 0},  // Middle
                {type: 'I', x: 0, y: 0, rotation: 0}   // Bottom
            ],
            '7': [
                {type: 'I', x: 0, y: 3, rotation: 0},  // Top
                {type: 'Z', x: 0, y: 0, rotation: 0}   // Diagonal down
            ],
            '8': [
                {type: 'I', x: 0, y: 3, rotation: 0},  // Top
                {type: 'O', x: 1, y: 1, rotation: 0},  // Middle O
                {type: 'I', x: 0, y: 0, rotation: 0}   // Bottom
            ],
            '9': [
                {type: 'I', x: 0, y: 3, rotation: 0},  // Top
                {type: 'I', x: 0, y: 1, rotation: 0},  // Middle
                {type: 'J', x: 2, y: 0, rotation: 1},  // Right vertical
                {type: 'I', x: 0, y: 0, rotation: 0}   // Bottom
            ],
            ' ': []  // Space - no blocks
        };
    }

    textToPattern(text, yOffset = 0) {
        const pixelFont = this.getPixelFont();
        const pixels = []; // List of individual pixels (cubes) to create
        let xOffset = 0;

        for (let i = 0; i < text.length; i++) {
            const char = text[i].toUpperCase();
            const letterGrid = pixelFont[char] || pixelFont[' '];
            
            if (!letterGrid || letterGrid.length === 0) {
                xOffset += 4 + this.blockConfig.letterSpacing;
                continue;
            }

            const letterWidth = letterGrid[0] ? letterGrid[0].length : 4;
            let pixelIndex = 0;

            // Convert pixel grid to individual cubes
            for (let row = 0; row < letterGrid.length; row++) {
                for (let col = 0; col < letterGrid[row].length; col++) {
                    if (letterGrid[row][col] === 1) {
                        pixels.push({
                            x: xOffset + col,
                            y: yOffset + row, // Add yOffset for multi-line support
                            value: 1,
                            pixelIndex: pixelIndex + i * 1000 // Unique index for color selection
                        });
                    }
                    pixelIndex++;
                }
            }

            xOffset += letterWidth + this.blockConfig.letterSpacing;
        }

        return pixels;
    }

    getShapePattern(shape) {
        const patterns = {
            'heart': [
                [0,1,0,1,0],
                [1,1,1,1,1],
                [1,1,1,1,1],
                [0,1,1,1,0],
                [0,0,1,0,0]
            ],
            'star': [
                [0,0,1,0,0],
                [0,1,1,1,0],
                [1,1,1,1,1],
                [0,1,1,1,0],
                [0,0,1,0,0]
            ],
            'diamond': [
                [0,0,1,0,0],
                [0,1,1,1,0],
                [1,1,1,1,1],
                [0,1,1,1,0],
                [0,0,1,0,0]
            ],
            'arrow': [
                [0,0,1,0,0],
                [0,1,1,1,0],
                [1,1,1,1,1],
                [0,0,1,0,0],
                [0,0,1,0,0]
            ],
            'smiley': [
                [0,1,0,1,0],
                [1,0,0,0,1],
                [0,0,0,0,0],
                [1,1,0,1,1],
                [0,1,1,1,0]
            ]
        };

        const patternData = patterns[shape] || patterns['heart'];
        const pattern = [];

        for (let row = 0; row < patternData.length; row++) {
            for (let col = 0; col < patternData[row].length; col++) {
                if (patternData[row][col] === 1) {
                    pattern.push({ x: col, y: row, value: 1 });
                }
            }
        }

        return pattern;
    }

    // Create a single pixel cube (for pixel-based letters)
    createPixelCube(x, y, colorMode, materialType, index) {
        const blockSize = this.blockConfig.size;
        const depth = this.blockConfig.depth;
        
        // Get color based on tetromino type (for visual variety)
        let color = 0x00ff00;
        if (colorMode === 'classic') {
            // Use tetromino colors based on position
            color = this.getTetrominoColorForPixel(x, y, index);
        } else if (colorMode === 'rainbow') {
            const colors = this.colorPalettes.rainbow;
            color = colors[index % colors.length];
        } else if (colorMode === 'monochrome') {
            const colors = this.colorPalettes.monochrome;
            color = colors[index % colors.length];
        } else if (colorMode === 'custom') {
            const colorHex = document.getElementById('block-color').value;
            color = parseInt(colorHex.replace('#', ''), 16);
        }

        // Create material
        let material;
        switch (materialType) {
            case 'emissive':
                material = new THREE.MeshStandardMaterial({
                    color: color,
                    emissive: new THREE.Color(color).multiplyScalar(0.5),
                    metalness: 0.2,
                    roughness: 0.3
                });
                break;
            case 'metal':
                material = new THREE.MeshPhysicalMaterial({
                    color: color,
                    metalness: 0.9,
                    roughness: 0.1
                });
                break;
            case 'glass':
                material = new THREE.MeshPhysicalMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.7,
                    metalness: 0.1,
                    roughness: 0.05,
                    clearcoat: 1.0,
                    clearcoatRoughness: 0.1
                });
                break;
            case 'neon':
                material = new THREE.MeshStandardMaterial({
                    color: color,
                    emissive: new THREE.Color(color).multiplyScalar(0.8),
                    transparent: true,
                    opacity: 0.9
                });
                break;
            default: // standard
                material = new THREE.MeshStandardMaterial({
                    color: color,
                    metalness: 0.3,
                    roughness: 0.5
                });
        }

        // Create single cube
        const geometry = new THREE.BoxGeometry(blockSize, blockSize, depth);
        const cube = new THREE.Mesh(geometry, material);
        
        cube.position.set(
            x * this.blockConfig.spacing,
            -y * this.blockConfig.spacing,
            depth / 2
        );
        
        cube.castShadow = true;
        cube.receiveShadow = true;
        
        // Store metadata
        cube.userData = {
            blockType: 'pixel',
            color: color
        };

        return cube;
    }

    createTetrisBlock(x, y, blockType, colorMode, materialType, index, rotationIndex = null) {
        // Select block shape
        let blockShape = blockType;
        if (blockType === 'random') {
            const shapes = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
            blockShape = shapes[Math.floor(Math.random() * shapes.length)];
        }

        const blockDef = this.tetrisBlocks[blockShape] || this.tetrisBlocks['O'];
        
        // Use provided rotation or random
        if (rotationIndex === null) {
            rotationIndex = Math.floor(Math.random() * 4);
        }
        const matrix = blockDef.rotations[rotationIndex];
        
        // Convert matrix to positions
        const positions = this.matrixToPositions(matrix, blockDef.matrixSize);
        
        const blockGroup = new THREE.Group();

        // Get color - use block's default color if classic mode
        let color = blockDef.color;
        if (colorMode === 'classic') {
            // Use classic Tetris colors per block type
            color = blockDef.color;
        } else if (colorMode === 'rainbow') {
            const colors = this.colorPalettes.rainbow;
            color = colors[index % colors.length];
        } else if (colorMode === 'monochrome') {
            const colors = this.colorPalettes.monochrome;
            color = colors[index % colors.length];
        } else if (colorMode === 'custom') {
            const colorHex = document.getElementById('block-color').value;
            color = parseInt(colorHex.replace('#', ''), 16);
        }

        // Create material
        let material;
        const blockSize = this.blockConfig.size;
        const depth = this.blockConfig.depth;

        switch (materialType) {
            case 'emissive':
                material = new THREE.MeshStandardMaterial({
                    color: color,
                    emissive: new THREE.Color(color).multiplyScalar(0.5),
                    metalness: 0.2,
                    roughness: 0.3
                });
                break;
            case 'metal':
                material = new THREE.MeshPhysicalMaterial({
                    color: color,
                    metalness: 0.9,
                    roughness: 0.1
                });
                break;
            case 'glass':
                material = new THREE.MeshPhysicalMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.7,
                    metalness: 0.1,
                    roughness: 0.05,
                    clearcoat: 1.0,
                    clearcoatRoughness: 0.1
                });
                break;
            case 'neon':
                material = new THREE.MeshStandardMaterial({
                    color: color,
                    emissive: new THREE.Color(color).multiplyScalar(0.8),
                    transparent: true,
                    opacity: 0.9
                });
                break;
            default: // standard
                material = new THREE.MeshStandardMaterial({
                    color: color,
                    metalness: 0.3,
                    roughness: 0.5
                });
        }

        // Create cubes for each cell in the tetromino block
        positions.forEach(([bx, by]) => {
            const geometry = new THREE.BoxGeometry(blockSize, blockSize, depth);
            const cube = new THREE.Mesh(geometry, material.clone());
            
            // Position: pattern position (x, y) + tetromino offset (bx, by)
            cube.position.set(
                (x + bx) * this.blockConfig.spacing,
                -(y + by) * this.blockConfig.spacing,
                depth / 2
            );
            
            cube.castShadow = true;
            cube.receiveShadow = true;
            blockGroup.add(cube);
        });

        // Store block metadata for animation
        blockGroup.userData = {
            blockType: blockShape,
            rotationIndex: rotationIndex,
            color: color
        };

        return blockGroup;
    }

    centerBlockGroup() {
        if (!this.blockGroup || this.blockObjects.length === 0) {
            console.warn('No blocks to center');
            return;
        }

        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(this.blockGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        console.log('Block group bounds:', { center, size });
        
        // Center the group at origin
        this.blockGroup.position.sub(center);
        
        console.log('Block group centered at:', this.blockGroup.position);
    }

    updateBlockPositions() {
        if (!this.blockGroup) return;
        // Positions are updated when regenerating, so just regenerate
        this.generateBlocks();
    }

    updateBlockDepths() {
        if (!this.blockObjects.length) return;

        this.blockObjects.forEach(blockGroup => {
            blockGroup.children.forEach(cube => {
                const depth = this.blockConfig.depth;
                cube.geometry.dispose();
                cube.geometry = new THREE.BoxGeometry(
                    this.blockConfig.size,
                    this.blockConfig.size,
                    depth
                );
                cube.position.z = depth / 2;
            });
        });
    }

    updateBlockRotation() {
        if (!this.blockGroup) return;
        this.blockGroup.rotation.x = this.blockConfig.rotationX;
        this.blockGroup.rotation.y = this.blockConfig.rotationY;
    }

    updateCameraPerspective() {
        if (!this.camera) return;
        this.camera.fov = 45 + this.blockConfig.perspective;
        this.camera.updateProjectionMatrix();
    }

    updateCameraPosition() {
        if (!this.camera) return;
        // Only update if camera movement is 'none'
        if (this.animationState.cameraMovement === 'none') {
            const distance = this.animationState.cameraDistance;
            this.camera.position.set(0, 0, distance);
            this.camera.lookAt(0, 0, 0);
        }
    }

    updateLighting() {
        if (!this.scene) return;
        this.scene.children.forEach(child => {
            if (child instanceof THREE.AmbientLight) {
                child.intensity = 0.4 * this.animationState.lighting;
            } else if (child instanceof THREE.DirectionalLight || child instanceof THREE.PointLight) {
                child.intensity = child.userData.originalIntensity * this.animationState.lighting;
            }
        });
    }

    applyLightingPreset(preset) {
        if (!this.scene) return;
        
        // Remove existing lights (except ambient)
        const lightsToRemove = [];
        this.scene.children.forEach(child => {
            if (child instanceof THREE.DirectionalLight || 
                child instanceof THREE.PointLight ||
                child instanceof THREE.SpotLight) {
                lightsToRemove.push(child);
            }
        });
        lightsToRemove.forEach(light => this.scene.remove(light));

        const baseIntensity = this.animationState.lighting;

        switch (preset) {
            case 'studio':
                // Soft studio lighting
                const studioKey = new THREE.DirectionalLight(0xffffff, 0.8 * baseIntensity);
                studioKey.position.set(5, 8, 5);
                studioKey.castShadow = true;
                this.scene.add(studioKey);
                
                const studioFill = new THREE.DirectionalLight(0xffffff, 0.3 * baseIntensity);
                studioFill.position.set(-5, 3, -5);
                this.scene.add(studioFill);
                break;
                
            case 'neon':
                // Neon rim lighting
                const neon1 = new THREE.PointLight(0x00ffff, 1.2 * baseIntensity);
                neon1.position.set(10, 0, 10);
                this.scene.add(neon1);
                
                const neon2 = new THREE.PointLight(0xff00ff, 1.2 * baseIntensity);
                neon2.position.set(-10, 0, 10);
                this.scene.add(neon2);
                
                const neon3 = new THREE.PointLight(0xffff00, 1.2 * baseIntensity);
                neon3.position.set(0, 10, -10);
                this.scene.add(neon3);
                break;
                
            case 'dramatic':
                // Dramatic spotlight
                const spotlight = new THREE.SpotLight(0xffffff, 2.0 * baseIntensity);
                spotlight.position.set(0, 15, 10);
                spotlight.angle = Math.PI / 6;
                spotlight.penumbra = 0.3;
                spotlight.castShadow = true;
                this.scene.add(spotlight);
                
                const rim = new THREE.DirectionalLight(0x4444ff, 0.5 * baseIntensity);
                rim.position.set(-10, 5, -10);
                this.scene.add(rim);
                break;
                
            case 'ambient':
            default:
                // Ambient only (already exists)
                break;
        }
    }

    clearBlocks() {
        if (this.blockGroup) {
            this.blockGroup.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.scene.remove(this.blockGroup);
            this.blockGroup = null;
        }
        this.blockObjects = [];
        // Don't reset hasBlocks here - we want to regenerate after resize
    }

    startTetrisAnimation() {
        if (!this.tetrisAnimation.blocks || this.tetrisAnimation.blocks.length === 0) {
            return;
        }

        console.log('Starting Tetris drop animation with', this.tetrisAnimation.blocks.length, 'tetrominoes');
        
        this.tetrisAnimation.startTime = Date.now();
        
        // Sort blocks based on animation order
        const sortedBlocks = this.sortBlocksForAnimation([...this.tetrisAnimation.blocks]);
        
        // Set initial positions - blocks start from top
        const startHeight = 20; // Start from high above
        const baseDelay = 50; // Base delay between blocks (ms)
        
        sortedBlocks.forEach((blockData, index) => {
            // Get current local position
            const currentLocalPos = blockData.block.position.clone();
            
            // Store final position (already in local coordinates)
            blockData.finalLocalPosition = currentLocalPos.clone();
            
            // Calculate start position and delay based on order
            const delay = index * baseDelay / this.tetrisAnimation.speed;
            blockData.startLocalPosition = new THREE.Vector3(
                currentLocalPos.x,
                startHeight + (Math.random() * 5), // Add slight randomness
                currentLocalPos.z
            );
            blockData.animationStartTime = this.tetrisAnimation.startTime + delay;
            
            // Set block to start position
            blockData.block.position.copy(blockData.startLocalPosition);
        });
    }

    sortBlocksForAnimation(blocks) {
        const order = this.tetrisAnimation.order;
        
        switch (order) {
            case 'left-to-right':
                return blocks.sort((a, b) => {
                    const aPos = a.block.position.x;
                    const bPos = b.block.position.x;
                    return aPos - bPos;
                });
                
            case 'right-to-left':
                return blocks.sort((a, b) => {
                    const aPos = a.block.position.x;
                    const bPos = b.block.position.x;
                    return bPos - aPos;
                });
                
            case 'top-to-bottom':
                return blocks.sort((a, b) => {
                    const aPos = a.block.position.y;
                    const bPos = b.block.position.y;
                    return bPos - aPos; // Y is inverted in 3D
                });
                
            case 'bottom-to-top':
                return blocks.sort((a, b) => {
                    const aPos = a.block.position.y;
                    const bPos = b.block.position.y;
                    return aPos - bPos;
                });
                
            case 'by-letter':
                // Group by approximate letter position (x coordinate ranges)
                return blocks.sort((a, b) => {
                    const aX = Math.floor(a.block.position.x / 5);
                    const bX = Math.floor(b.block.position.x / 5);
                    if (aX !== bX) return aX - bX;
                    return a.block.position.y - b.block.position.y;
                });
                
            case 'by-color':
                return blocks.sort((a, b) => {
                    const aColor = a.block.userData?.color || 0;
                    const bColor = b.block.userData?.color || 0;
                    return aColor - bColor;
                });
                
            case 'random':
            default:
                const shuffled = [...blocks];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                return shuffled;
        }
    }

    updateTetrisAnimation() {
        if (!this.tetrisAnimation.enabled || !this.tetrisAnimation.blocks || this.tetrisAnimation.blocks.length === 0) {
            return;
        }

        const currentTime = Date.now();
        let allComplete = true;
        
        // Easing functions
        const easingFunctions = {
            smooth: (t) => t * t * (3 - 2 * t), // Smoothstep
            snappy: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, // Ease in-out
            bounce: (t) => {
                if (t < 1 / 2.75) {
                    return 7.5625 * t * t;
                } else if (t < 2 / 2.75) {
                    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
                } else if (t < 2.5 / 2.75) {
                    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
                } else {
                    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
                }
            },
            elastic: (t) => {
                if (t === 0 || t === 1) return t;
                return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
            },
            playful: (t) => {
                // Combination of bounce and elastic
                if (t < 0.5) {
                    return 0.5 * (1 - Math.cos(Math.PI * t));
                } else {
                    const bounce = 1 - Math.pow(2, -10 * (t - 0.5)) * Math.sin((t - 0.5) * 10 * Math.PI / 3);
                    return 0.5 + 0.5 * bounce;
                }
            }
        };
        
        const easingFunc = easingFunctions[this.tetrisAnimation.easing] || easingFunctions.bounce;

        this.tetrisAnimation.blocks.forEach((blockData) => {
            if (!blockData.startLocalPosition || !blockData.finalLocalPosition) return;
            
            // Calculate progress for this specific block
            const blockElapsed = Math.max(0, currentTime - blockData.animationStartTime);
            const blockProgress = Math.min(blockElapsed / this.tetrisAnimation.duration, 1);
            
            if (blockProgress < 1) {
                allComplete = false;
            }
            
            // Apply easing
            const easedProgress = easingFunc(blockProgress);
            
            // Interpolate position (already in local coordinates)
            const currentPos = new THREE.Vector3().lerpVectors(
                blockData.startLocalPosition,
                blockData.finalLocalPosition,
                easedProgress
            );
            
            blockData.block.position.copy(currentPos);
            
            // Add slight rotation during fall for realism
            if (blockProgress < 1) {
                const rotationAmount = (1 - blockProgress) * 0.2;
                blockData.block.rotation.z = Math.sin(blockProgress * Math.PI * 2) * rotationAmount;
            } else {
                blockData.block.rotation.z = 0;
            }
        });

        // If all animations complete, disable it
        if (allComplete) {
            this.tetrisAnimation.enabled = false;
            // Reset toggle button
            const toggle = document.getElementById('tetris-animation');
            if (toggle) {
                toggle.setAttribute('aria-pressed', 'false');
            }
        }
    }

    render() {
        // Update Tetris animation
        if (this.tetrisAnimation.enabled) {
            this.updateTetrisAnimation();
        }

        // Auto-rotation
        if (this.animationState.autoRotate && this.blockGroup && !this.tetrisAnimation.enabled) {
            this.blockGroup.rotation.y += this.animationState.rotationSpeed;
        }

        // Floating animation
        if (this.animationState.floatingAnimation && this.blockGroup && !this.tetrisAnimation.enabled) {
            const time = Date.now() * 0.001;
            this.blockGroup.position.y = Math.sin(time) * 0.5;
        }

        // Camera movement
        this.updateCameraMovement();

        this.renderer.render(this.scene, this.camera);
        this.animationId = requestAnimationFrame(() => this.render());
    }

    updateCameraMovement() {
        if (!this.camera || !this.blockGroup) return;
        
        const time = Date.now() * 0.001;
        this.animationState.cameraTime = time;
        
        const distance = this.animationState.cameraDistance;
        const movement = this.animationState.cameraMovement;
        
        switch (movement) {
            case 'orbit':
                // Circular orbit around the blocks
                const orbitRadius = distance;
                const orbitSpeed = 0.2;
                this.camera.position.x = Math.cos(time * orbitSpeed) * orbitRadius;
                this.camera.position.z = Math.sin(time * orbitSpeed) * orbitRadius;
                this.camera.position.y = distance * 0.3;
                this.camera.lookAt(0, 0, 0);
                break;
                
            case 'parallax':
                // Subtle parallax movement
                const parallaxAmount = 2;
                this.camera.position.x = Math.sin(time * 0.3) * parallaxAmount;
                this.camera.position.y = Math.cos(time * 0.2) * parallaxAmount;
                this.camera.position.z = distance;
                this.camera.lookAt(0, 0, 0);
                break;
                
            case 'dolly':
                // Dolly in and out
                const dollyRange = 5;
                const dollySpeed = 0.5;
                const dollyOffset = Math.sin(time * dollySpeed) * dollyRange;
                this.camera.position.set(0, 0, distance + dollyOffset);
                this.camera.lookAt(0, 0, 0);
                break;
                
            case 'none':
            default:
                // Static camera (handled by updateCameraPosition)
                break;
        }
    }

    // High-resolution export function
    renderHighResolution(targetCanvas, scale) {
        if (!this.renderer || !this.scene || !this.camera) {
            console.warn('Tetris Block Builder not ready for high-res export');
            return;
        }

        const originalWidth = this.canvas.offsetWidth;
        const originalHeight = this.canvas.offsetHeight;
        const exportWidth = originalWidth * scale;
        const exportHeight = originalHeight * scale;

        targetCanvas.width = exportWidth;
        targetCanvas.height = exportHeight;

        const exportRenderer = new THREE.WebGLRenderer({
            canvas: targetCanvas,
            antialias: true,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance",
            alpha: true
        });

        exportRenderer.setPixelRatio(scale);
        exportRenderer.setSize(originalWidth, originalHeight);

        if (!window.Chatooly || !window.Chatooly.backgroundManager) {
            exportRenderer.setClearColor(0x1a1a1a, 1);
        } else {
            const bg = Chatooly.backgroundManager.getBackgroundState();
            if (bg.bgTransparent) {
                exportRenderer.setClearAlpha(0);
                exportRenderer.setClearColor(0x000000, 0);
            } else if (bg.bgImage && bg.bgImageURL) {
                const color = new THREE.Color(bg.bgColor);
                exportRenderer.setClearColor(color, 1);
                const scaledCanvas = document.createElement('canvas');
                scaledCanvas.width = exportWidth;
                scaledCanvas.height = exportHeight;
                const scaledCtx = scaledCanvas.getContext('2d');
                scaledCtx.fillStyle = bg.bgColor;
                scaledCtx.fillRect(0, 0, exportWidth, exportHeight);
                const dims = Chatooly.backgroundManager.calculateImageDimensions(exportWidth, exportHeight);
                const img = new Image();
                img.onload = () => {
                    scaledCtx.drawImage(img, dims.offsetX, dims.offsetY, dims.drawWidth, dims.drawHeight);
                    const highResTexture = new THREE.CanvasTexture(scaledCanvas);
                    highResTexture.needsUpdate = true;
                    this.scene.background = highResTexture;
                    const exportCamera = this.camera.clone();
                    exportCamera.aspect = exportWidth / exportHeight;
                    exportCamera.updateProjectionMatrix();
                    exportRenderer.render(this.scene, exportCamera);
                    this.scene.background = this.backgroundTexture;
                    highResTexture.dispose();
                };
                img.src = bg.bgImageURL;
                return;
            } else {
                const color = new THREE.Color(bg.bgColor);
                exportRenderer.setClearColor(color, 1);
                exportRenderer.setClearAlpha(1);
            }
        }

        exportRenderer.shadowMap.enabled = true;
        exportRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const exportCamera = this.camera.clone();
        exportCamera.aspect = exportWidth / exportHeight;
        exportCamera.updateProjectionMatrix();

        exportRenderer.render(this.scene, exportCamera);
        exportRenderer.dispose();

        console.log(`High-res Tetris Block Builder export completed at ${scale}x resolution`);
    }
}

// Export project as JSON
window.exportTetrisProject = function() {
    if (!window.tetrisBuilder || !window.tetrisBuilder.hasBlocks) {
        alert('No blocks to export. Please generate blocks first.');
        return;
    }
    
    const project = {
        version: '1.0.0',
        metadata: {
            text: document.getElementById('text-input').value,
            shapeTemplate: document.getElementById('shape-template').value,
            blockType: document.getElementById('block-type').value,
            colorMode: document.getElementById('color-mode').value,
            materialType: document.getElementById('material-type').value,
            letterSpacing: window.tetrisBuilder.blockConfig.letterSpacing,
            blockSpacing: window.tetrisBuilder.blockConfig.spacing,
            blockSize: window.tetrisBuilder.blockConfig.size,
            depth: window.tetrisBuilder.blockConfig.depth,
            rotationX: window.tetrisBuilder.blockConfig.rotationX,
            rotationY: window.tetrisBuilder.blockConfig.rotationY
        },
        blocks: [],
        animation: {
            enabled: window.tetrisBuilder.tetrisAnimation.enabled,
            speed: window.tetrisBuilder.tetrisAnimation.speed,
            order: window.tetrisBuilder.tetrisAnimation.order,
            easing: window.tetrisBuilder.tetrisAnimation.easing,
            duration: window.tetrisBuilder.tetrisAnimation.duration
        },
        effects: {
            autoRotate: window.tetrisBuilder.animationState.autoRotate,
            rotationSpeed: window.tetrisBuilder.animationState.rotationSpeed,
            floatingAnimation: window.tetrisBuilder.animationState.floatingAnimation,
            cameraDistance: window.tetrisBuilder.animationState.cameraDistance,
            cameraMovement: window.tetrisBuilder.animationState.cameraMovement,
            lighting: window.tetrisBuilder.animationState.lighting
        }
    };
    
    // Export block data
    window.tetrisBuilder.blockObjects.forEach((blockGroup, index) => {
        const blockData = {
            index: index,
            blockType: blockGroup.userData?.blockType || 'O',
            rotationIndex: blockGroup.userData?.rotationIndex || 0,
            color: blockGroup.userData?.color || 0x00ff00,
            position: {
                x: blockGroup.position.x,
                y: blockGroup.position.y,
                z: blockGroup.position.z
            },
            rotation: {
                x: blockGroup.rotation.x,
                y: blockGroup.rotation.y,
                z: blockGroup.rotation.z
            },
            cubes: []
        };
        
        blockGroup.children.forEach(cube => {
            blockData.cubes.push({
                position: {
                    x: cube.position.x,
                    y: cube.position.y,
                    z: cube.position.z
                }
            });
        });
        
        project.blocks.push(blockData);
    });
    
    // Download JSON file
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tetris-project-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Tetris project exported:', project);
};

// Global export function required by Chatooly CDN
window.renderHighResolution = function(targetCanvas, scale) {
    if (window.tetrisBuilder && window.tetrisBuilder.renderHighResolution) {
        window.tetrisBuilder.renderHighResolution(targetCanvas, scale);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.tetrisBuilder = new TetrisBlockBuilder();
});
