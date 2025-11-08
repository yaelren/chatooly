/**
 * MainTextController.js - Handles text parsing, measurement, and per-line alignment
 * Supports individual alignment for each line of text
 */

class MainTextController {
    constructor() {
        // Text configuration
        this.config = {
            fontSize: 100,
            fontFamily: '"Wix Madefor Display", Arial, sans-serif',
            lineSpacing: 0, // Space between lines in pixels (working implementation)
            marginVertical: 0, // Margin around main text block (top/bottom)
            marginHorizontal: 0, // Margin around main text block (left/right)
            color: '#000000',
            defaultAlignment: 'center',
            fillCanvas: false,
            canvasWidth: 600,
            canvasHeight: 600,
            paddingTop: 20,
            paddingBottom: 20,
            paddingLeft: 20,
            paddingRight: 20,
            maxFontSize: 120,
            minFontSize: 12,
            mode: 'manual', // 'fillCanvas' or 'manual'
            textPositionVertical: 'center', // 'top', 'center', 'bottom'
            textPositionHorizontal: 'center', // 'left', 'center', 'right'
            textStyles: {
                bold: false,
                italic: false,
                underline: false,
                highlight: false,
                highlightColor: '#ffff00'
            }
        };
        
        // Parsed text data
        this.rawText = '';
        this.lines = [];
        this.textBounds = [];
        
        // Canvas for text measurement
        this.measureCanvas = document.createElement('canvas');
        this.measureCtx = this.measureCanvas.getContext('2d');
        
        // TextComponent instance for typography calculations
        this.textComponent = new TextComponent();
        
        // Text frame (auto-sized to content)
        this.frame = {
            x: 50,
            y: 50,
            width: 0,
            height: 0,
            padding: 20
        };
    }
    
    /**
     * Update text configuration
     * @param {Object} newConfig - New configuration values
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        
        // Sync TextComponent with current config
        this.syncTextComponent();
        
        // Recalculate if we have text
        if (this.rawText) {
            this.setText(this.rawText);
        }
    }
    
    /**
     * Sync TextComponent instance with current config
     * @private
     */
    syncTextComponent() {
        this.textComponent.fontFamily = this.config.fontFamily;
        this.textComponent.fontSize = this.config.fontSize;
        this.textComponent.fontWeight = this.config.textStyles?.bold ? 'bold' : 'normal';
        this.textComponent.fontStyle = this.config.textStyles?.italic ? 'italic' : 'normal';
        this.textComponent.color = this.config.color;
        this.textComponent.lineSpacing = this.config.lineSpacing;
    }
    
    /**
     * Set text content and parse into lines
     * @param {string} text - Raw text content
     */
    setText(text) {
        this.rawText = text;

        this.parseLines();
        this.measureLines();
        this.calculateFrame();
        this.positionLines();
    }
    
    /**
     * Wrap text to fit canvas width with specific font size
     * @param {string} text - Text to wrap
     * @param {number} fontSize - Font size to use for measurement
     * @returns {Array} Array of wrapped lines
     * @private
     */
    wrapTextWithFontSize(text, fontSize) {
        const inputLines = text.split('\n');
        const wrappedLines = [];
        
        let fontStyle = '';
        if (this.config.textStyles) {
            if (this.config.textStyles.italic) fontStyle += 'italic ';
            if (this.config.textStyles.bold) fontStyle += 'bold ';
        }
        this.measureCtx.font = `${fontStyle}${fontSize}px ${this.config.fontFamily}`;
        const maxWidth = this.config.canvasWidth - this.config.paddingLeft - this.config.paddingRight;
        
        for (const inputLine of inputLines) {
            if (!inputLine.trim()) {
                wrappedLines.push('');
                continue;
            }
            
            const words = inputLine.split(' ');
            let currentLine = '';
            
            for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const metrics = this.measureCtx.measureText(testLine);
                
                if (metrics.width <= maxWidth) {
                    currentLine = testLine;
                } else {
                    if (currentLine) {
                        wrappedLines.push(currentLine);
                        currentLine = word;
                    } else {
                        // Single word is too long, force it anyway
                        wrappedLines.push(word);
                    }
                }
            }
            
            if (currentLine) {
                wrappedLines.push(currentLine);
            }
        }
        return wrappedLines;
    }
    
    /**
     * Wrap text to fit canvas width
     * @param {string} text - Text to wrap
     * @returns {Array} Array of wrapped lines
     * @private
     */
    wrapTextToCanvas(text) {
        return this.wrapTextWithFontSize(text, this.config.fontSize);
    }
    
    /**
     * Parse raw text into individual lines
     * Each line can have its own alignment
     * @private
     */
    parseLines() {
        if (!this.rawText) {
            this.lines = [];
            return;
        }

        // Save existing line alignments before parsing
        const previousAlignments = {};
        if (this.lines) {
            this.lines.forEach((line, index) => {
                if (line.alignment) {
                    previousAlignments[index] = line.alignment;
                }
            });
        }

        let rawLines = this.wrapTextToCanvas(this.rawText);

        this.lines = rawLines.map((text, index) => ({
            text: text,
            index: index,
            alignment: previousAlignments[index] || this.config.defaultAlignment, // Use previous alignment if exists
            metrics: null,
            bounds: null
        }));
    }
    
    /**
     * Measure each line of text using typography-aware measurements
     * @private
     */
    measureLines() {
        if (this.lines.length === 0) {
            this.textBounds = [];
            return;
        }
        
        // Sync TextComponent with current config before measuring
        this.syncTextComponent();
        
        // Set up measurement context
        let fontStyle = '';
        if (this.config.textStyles) {
            if (this.config.textStyles.italic) fontStyle += 'italic ';
            if (this.config.textStyles.bold) fontStyle += 'bold ';
        }
        const fontString = `${fontStyle}${this.config.fontSize}px ${this.config.fontFamily}`;
        this.measureCtx.font = fontString;
        
        this.textBounds = [];
        
        this.lines.forEach((line, index) => {
            if (line.text.trim()) {
                // Measure the text
                const metrics = this.measureCtx.measureText(line.text);
                
                // Use TextComponent's typography-aware line height calculation
                const typographyHeight = this.textComponent.getLineHeight(line.text, this.config.fontSize);
                
                // DEBUG: Log the height calculation
                
                // Store metrics on the line object
                line.metrics = {
                    width: metrics.width,
                    actualBoundingBoxLeft: metrics.actualBoundingBoxLeft || 0,
                    actualBoundingBoxRight: metrics.actualBoundingBoxRight || metrics.width,
                    actualBoundingBoxAscent: metrics.actualBoundingBoxAscent || this.config.fontSize * 0.8,
                    actualBoundingBoxDescent: metrics.actualBoundingBoxDescent || this.config.fontSize * 0.2,
                    typographyHeight: typographyHeight // Store typography-aware height
                };
                
                // Create bounds object for this line
                // Use typography-aware height instead of basic font size
                const bounds = {
                    text: line.text,
                    index: index,
                    width: metrics.width,
                    height: typographyHeight, // Typography-aware height
                    actualWidth: metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft,
                    actualHeight: (metrics.actualBoundingBoxAscent || this.config.fontSize * 0.8) +
                                 (metrics.actualBoundingBoxDescent || this.config.fontSize * 0.2),
                    x: 0, // Will be set in positionLines()
                    y: 0, // Will be set in positionLines()
                    alignment: line.alignment,
                    // Include style information for grid cells
                    style: {
                        fontSize: this.config.fontSize,
                        fontFamily: this.config.fontFamily,
                        color: this.config.color || '#000000',
                        alignment: line.alignment,
                        bold: this.config.textStyles?.bold || false,
                        italic: this.config.textStyles?.italic || false,
                        underline: this.config.textStyles?.underline || false,
                        highlight: this.config.textStyles?.highlight || false,
                        highlightColor: this.config.textStyles?.highlightColor || '#ffff00'
                    }
                };
                
                this.textBounds.push(bounds);
            } else {
                // Empty line - still takes up vertical space (typography-aware height)
                const emptyLineHeight = this.textComponent.getLineHeight('x', this.config.fontSize); // Use 'x' as reference for x-height
                
                const bounds = {
                    text: '',
                    index: index,
                    width: 0,
                    height: emptyLineHeight, // Typography-aware height for empty lines
                    actualWidth: 0,
                    actualHeight: emptyLineHeight,
                    x: 0,
                    y: 0, // Will be set in positionLines()
                    alignment: line.alignment
                };
                
                this.textBounds.push(bounds);
            }
        });
    }
    
    /**
     * Calculate the overall text frame based on content
     * @private
     */
    calculateFrame() {
        if (this.textBounds.length === 0) {
            this.frame.width = 0;
            this.frame.height = 0;
            return;
        }
        
        // Find maximum width of any line
        const maxWidth = Math.max(...this.textBounds.map(b => b.width));
        
        // Calculate total height using typography-aware heights from text bounds
        let totalHeight = 0;
        this.textBounds.forEach((bounds, index) => {
            totalHeight += bounds.height; // Use typography-aware height
            if (index < this.textBounds.length - 1) {
                totalHeight += this.config.lineSpacing;
            }
        });
        
        // Update frame dimensions (auto-sized to content)
        this.frame.width = maxWidth + this.frame.padding * 2;
        this.frame.height = totalHeight + this.frame.padding * 2;
    }
    
    /**
     * Position each line within the canvas based on its alignment
     * Alignment is relative to the entire canvas, not a text frame
     * @private
     */
    positionLines() {
        if (this.textBounds.length === 0) return;
        
        const canvasWidth = this.config.canvasWidth;
        const canvasHeight = this.config.canvasHeight;
        
        // Calculate total height using typography-aware heights from text bounds
        let totalHeight = 0;
        this.textBounds.forEach((bounds, index) => {
            totalHeight += bounds.height; // Use typography-aware height
            if (index < this.textBounds.length - 1) {
                totalHeight += this.config.lineSpacing;
            }
        });
        
        // Determine vertical positioning (manual mode only)
        let startY;
        switch (this.config.textPositionVertical) {
            case 'top':
                startY = this.config.paddingTop;
                break;
            case 'bottom':
                startY = canvasHeight - this.config.paddingBottom - totalHeight;
                break;
            case 'center':
            default:
                startY = (canvasHeight - totalHeight) / 2;
                break;
        }
        
        this.textBounds.forEach((bounds, index) => {
            // Vertical position: accumulate heights of previous lines + line spacing
            if (index === 0) {
                bounds.y = startY;
            } else {
                // Calculate cumulative height of all previous lines + spacing between lines
                let cumulativeHeight = 0;
                for (let i = 0; i < index; i++) {
                    cumulativeHeight += this.textBounds[i].height + this.config.lineSpacing;
                }
                bounds.y = startY + cumulativeHeight;
            }
            
            // Horizontal position based on line alignment (for individual lines)
            switch (bounds.alignment) {
                case 'center':
                    bounds.x = (canvasWidth - bounds.width) / 2;
                    break;
                case 'right':
                    bounds.x = canvasWidth - this.config.paddingRight - bounds.width;
                    break;
                case 'left':
                default:
                    bounds.x = this.config.paddingLeft;
                    break;
            }
            
            // Override horizontal position if overall text positioning is set (manual mode only)
            // BUT: Only apply if all lines have the same alignment (indicating no per-line customization)
            const hasCustomAlignments = this.textBounds.some((b, i) =>
                i > 0 && b.alignment !== this.textBounds[0].alignment
            );

            if (this.config.mode === 'manual' &&
                this.config.textPositionHorizontal !== 'center' &&
                !hasCustomAlignments) {
                const textBlockWidth = Math.max(...this.textBounds.map(b => b.width));
                let textBlockX;

                switch (this.config.textPositionHorizontal) {
                    case 'left':
                        textBlockX = this.config.paddingLeft;
                        break;
                    case 'right':
                        textBlockX = canvasWidth - this.config.paddingRight - textBlockWidth;
                        break;
                    default:
                        textBlockX = (canvasWidth - textBlockWidth) / 2;
                        break;
                }

                // Adjust individual line position relative to text block
                if (bounds.alignment === 'center') {
                    bounds.x = textBlockX + (textBlockWidth - bounds.width) / 2;
                } else if (bounds.alignment === 'right') {
                    bounds.x = textBlockX + textBlockWidth - bounds.width;
                } else {
                    bounds.x = textBlockX;
                }
            }
        });
    }
    
    /**
     * Set alignment for a specific line
     * @param {number} lineIndex - Index of the line
     * @param {string} alignment - 'left', 'center', or 'right'
     */
    setLineAlignment(lineIndex, alignment) {
        if (lineIndex >= 0 && lineIndex < this.lines.length) {
            this.lines[lineIndex].alignment = alignment;
            
            // Update bounds if they exist
            if (this.textBounds[lineIndex]) {
                this.textBounds[lineIndex].alignment = alignment;
                this.positionLines(); // Recalculate positions
            }
        }
    }
    
    /**
     * Get text bounds for all lines (for spot detection algorithm)
     * @returns {Array} Array of bound objects
     */
    getTextBounds() {
        return this.textBounds;
    }
    
    /**
     * Get text configuration
     * @returns {Object} Current text configuration
     */
    getConfig() {
        return {...this.config};
    }

    /**
     * Get available fonts from TextComponent
     * @returns {Array} Array of font options
     */
    getAvailableFonts() {
        return TextComponent.getAvailableFonts();
    }
    
    /**
     * Get text frame dimensions and position
     * @returns {Object} Frame object with x, y, width, height
     */
    getFrame() {
        return {...this.frame};
    }
    
    /**
     * Set canvas dimensions (updates positioning)
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     */
    setCanvasDimensions(width, height) {
        this.config.canvasWidth = width;
        this.config.canvasHeight = height;
        this.positionLines();
    }
    
    /**
     * Get lines formatted for canvas rendering
     * @returns {Array} Array of line objects for CanvasManager
     */
    getLinesForRender() {
        return this.textBounds.map(bounds => ({
            text: bounds.text,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            alignment: bounds.alignment
        }));
    }
    
    /**
     * Check if a point is within any text bounds
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object|null} Line bounds object or null
     */
    hitTest(x, y) {
        for (let bounds of this.textBounds) {
            if (x >= bounds.x && 
                x <= bounds.x + bounds.width && 
                y >= bounds.y && 
                y <= bounds.y + bounds.height) {
                return bounds;
            }
        }
        return null;
    }
    
    /**
     * Get total text area (sum of all line areas)
     * @returns {number} Total area in pixels
     */
    getTotalTextArea() {
        return this.textBounds.reduce((total, bounds) => {
            return total + (bounds.width * bounds.height);
        }, 0);
    }
    
    /**
     * Get text statistics for debugging
     * @returns {Object} Statistics object
     */
    getStatistics() {
        return {
            totalLines: this.lines.length,
            nonEmptyLines: this.textBounds.filter(b => b.text.trim()).length,
            totalArea: this.getTotalTextArea(),
            frameWidth: this.frame.width,
            frameHeight: this.frame.height,
            maxLineWidth: Math.max(...this.textBounds.map(b => b.width), 0),
            averageLineWidth: this.textBounds.length > 0 ? 
                this.textBounds.reduce((sum, b) => sum + b.width, 0) / this.textBounds.length : 0
        };
    }
    
    /**
     * Export text configuration and lines
     * @returns {Object} Exportable text data
     */
    export() {
        return {
            rawText: this.rawText,
            config: this.config,
            lines: this.lines.map(line => ({
                text: line.text,
                alignment: line.alignment
            })),
            frame: this.frame
        };
    }
    
    /**
     * Import text configuration and lines
     * @param {Object} textData - Imported text data
     */
    import(textData) {
        this.rawText = textData.rawText || '';
        this.config = {...this.config, ...textData.config};
        
        if (textData.lines) {
            // Set text first, then apply alignments
            this.setText(this.rawText);
            textData.lines.forEach((line, index) => {
                if (line.alignment) {
                    this.setLineAlignment(index, line.alignment);
                }
            });
        }
        
        if (textData.frame) {
            this.frame = {...this.frame, ...textData.frame};
            this.positionLines();
        }
    }
    
}