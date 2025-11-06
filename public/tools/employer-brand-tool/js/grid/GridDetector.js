/**
 * GridDetector.js - Unified grid detection that creates ContentCell and MainTextCell directly
 * Replaces SpotDetector by building the complete Grid structure without Spot intermediary
 */

class GridDetector {
    constructor() {
        this.minCellSize = 50; // Minimum cell dimensions in pixels
        this.debugging = false;
        this.debugData = {};
    }

    /**
     * Set minimum cell size
     * @param {number} size - Minimum width/height in pixels
     */
    setMinCellSize(size) {
        this.minCellSize = Math.max(10, size);
    }

    /**
     * Enable/disable debugging
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugging(enabled) {
        this.debugging = enabled;
    }

    /**
     * Main detection method - builds Grid with MainTextCell and ContentCell instances
     * @param {Object} canvas - Canvas with width/height properties
     * @param {Array} textBounds - Array of text line bounding boxes
     * @param {Object} padding - Padding object with top, bottom, left, right
     * @returns {Object} Grid structure with matrix and metadata
     */
    detect(canvas, textBounds, padding = {top: 0, bottom: 0, left: 0, right: 0}, lineSpacing = {vertical: 0, horizontal: 0}) {
        const startTime = performance.now();

        // Initialize GridBuilder for spatial layout discovery
        this.gridBuilder = new GridBuilder();
        this.gridBuilder.startBuild();

        // Initialize debug data
        if (this.debugging) {
            this.debugData = {
                canvasSize: `${canvas.width}x${canvas.height}`,
                textLines: textBounds.length,
                detectedCells: 0,
                processingSteps: []
            };
        }

        const regions = []; // All detected regions (text + content cells)

        // Handle empty text case - single full canvas ContentCell
        if (!textBounds || textBounds.length === 0) {
            const availableWidth = canvas.width - padding.left - padding.right;
            const availableHeight = canvas.height - padding.top - padding.bottom;

            const fullCanvasCell = {
                type: 'content',
                contentType: 'empty',
                x: padding.left,
                y: padding.top,
                width: availableWidth,
                height: availableHeight,
                row: 0,
                col: 0
            };

            if (this.debugging) {
                this.debugData.processingSteps.push('Empty text: created full canvas content cell within padding');
            }

            regions.push(fullCanvasCell);

            // Delegate matrix building to GridBuilder
            const gridResult = this.gridBuilder.buildMatrix(regions, textBounds);

            if (this.debugging) {
                const endTime = performance.now();
                this.debugData.detectedCells = 1;
                this.debugData.detectionTime = Math.round(endTime - startTime);
            }

            return gridResult;
        }

        // Filter out empty lines for processing
        const nonEmptyBounds = textBounds.filter(bounds => bounds.text && bounds.text.trim());

        if (this.debugging) {
            this.debugData.processingSteps.push(`Filtered to ${nonEmptyBounds.length} non-empty lines`);
        }

        // Step 1: Process each text line AND gaps between them
        // Interleave text lines with gap detection for correct row ordering
        let currentRow = 0;

        nonEmptyBounds.forEach((bounds, index) => {
            if (this.debugging) {
                this.debugData.processingSteps.push(`Processing line ${index}: "${bounds.text}"`);
            }

            // Add text region to GridBuilder for spatial discovery
            this.gridBuilder.addTextRegion(bounds, bounds.text, index);

            // Dynamic column assignment based on which cells exist in this row
            let currentCol = 0;

            // Check for content cell to the LEFT of text (respecting left padding and main text cell padding)
            // Position horizontally aligned with text baseline
            const leftCellWidth = bounds.x - padding.left - lineSpacing.horizontal;
            const hasLeftCell = leftCellWidth >= this.minCellSize && bounds.height >= this.minCellSize;

            if (hasLeftCell) {
                const leftCell = {
                    type: 'content',
                    contentType: 'empty',
                    x: padding.left,
                    y: bounds.y, // Same Y as text for proper alignment
                    width: leftCellWidth,
                    height: bounds.height,
                    row: currentRow,
                    col: currentCol  // Dynamic column position
                };
                regions.push(leftCell);

                // Add to GridBuilder
                this.gridBuilder.addSpotRegion(leftCell);

                if (this.debugging) {
                    this.debugData.processingSteps.push(`  Found left cell: ${Math.round(leftCellWidth)}x${Math.round(bounds.height)} at y=${bounds.y}, col=${currentCol}`);
                }

                currentCol++;  // Text will be in next column
            }

            // Add the text region itself - column position depends on whether left cell exists
            const textCell = {
                type: 'main-text',
                text: bounds.text,
                lineIndex: index,
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                style: bounds.style || {},
                row: currentRow,
                col: currentCol,  // Dynamic: col 0 if no left cell, col 1 if left cell exists
                // Add horizontal spacing as a property for rendering
                horizontalSpacing: lineSpacing.horizontal
            };
            regions.push(textCell);
            currentCol++;  // Right cell (if exists) will be in next column

            // Check for content cell to the RIGHT of text (respecting right padding and main text cell padding)
            const rightCellX = bounds.x + bounds.width + lineSpacing.horizontal;
            const rightCellWidth = canvas.width - padding.right - rightCellX;
            if (rightCellWidth >= this.minCellSize && bounds.height >= this.minCellSize) {
                const rightCell = {
                    type: 'content',
                    contentType: 'empty',
                    x: rightCellX,
                    y: bounds.y, // Same Y as text for proper alignment
                    width: rightCellWidth,
                    height: bounds.height,
                    row: currentRow,
                    col: currentCol  // Dynamic column position
                };
                regions.push(rightCell);

                // Add to GridBuilder
                this.gridBuilder.addSpotRegion(rightCell);

                if (this.debugging) {
                    this.debugData.processingSteps.push(`  Found right cell: ${Math.round(rightCellWidth)}x${Math.round(bounds.height)} at y=${bounds.y}, col=${currentCol}`);
                }
            }

            currentRow++;

            // Check for gap AFTER this line (before next line) - accounting for vertical padding
            if (index < nonEmptyBounds.length - 1) {
                const nextLine = nonEmptyBounds[index + 1];
                const gapY = bounds.y + bounds.height + lineSpacing.vertical; // Add bottom padding
                const gapHeight = nextLine.y - lineSpacing.vertical - gapY; // Subtract top padding from next line

                if (gapHeight >= this.minCellSize) {
                    const availableWidth = canvas.width - padding.left - padding.right;
                    const gapCell = {
                        type: 'content',
                        contentType: 'empty',
                        x: padding.left,
                        y: gapY,
                        width: availableWidth,
                        height: gapHeight,
                        row: currentRow,
                        col: 0
                    };
                    regions.push(gapCell);
                    this.gridBuilder.addSpotRegion(gapCell);

                    if (this.debugging) {
                        this.debugData.processingSteps.push(`  Found gap after line: ${Math.round(gapHeight)}px high at row ${currentRow}`);
                    }

                    currentRow++; // Gap gets its own row
                }
            }
        });

        // Step 3: Check for remaining space at the TOP (before first line, respecting top padding and main text cell padding)
        if (nonEmptyBounds.length > 0) {
            const firstLine = nonEmptyBounds[0];
            const topSpaceHeight = firstLine.y - padding.top - lineSpacing.vertical;

            if (topSpaceHeight >= this.minCellSize) {
                const availableWidth = canvas.width - padding.left - padding.right;
                const topCell = {
                    type: 'content',
                    contentType: 'empty',
                    x: padding.left,
                    y: padding.top,
                    width: availableWidth,
                    height: topSpaceHeight,
                    row: -1, // Before first row
                    col: 0
                };
                regions.push(topCell);

                // Add to GridBuilder
                this.gridBuilder.addSpotRegion(topCell);

                if (this.debugging) {
                    this.debugData.processingSteps.push(`Found top space: ${Math.round(topSpaceHeight)}px high`);
                }
            }
        }

        // Step 4: Check for remaining space at the BOTTOM (after last line, respecting bottom padding and main text cell padding)
        if (nonEmptyBounds.length > 0) {
            const lastLine = nonEmptyBounds[nonEmptyBounds.length - 1];
            const bottomSpaceY = lastLine.y + lastLine.height + lineSpacing.vertical;
            const bottomSpaceHeight = canvas.height - padding.bottom - bottomSpaceY;

            if (bottomSpaceHeight >= this.minCellSize) {
                const availableWidth = canvas.width - padding.left - padding.right;
                const bottomCell = {
                    type: 'content',
                    contentType: 'empty',
                    x: padding.left,
                    y: bottomSpaceY,
                    width: availableWidth,
                    height: bottomSpaceHeight,
                    row: currentRow,
                    col: 0
                };
                regions.push(bottomCell);

                // Add to GridBuilder
                this.gridBuilder.addSpotRegion(bottomCell);

                if (this.debugging) {
                    this.debugData.processingSteps.push(`Found bottom space: ${Math.round(bottomSpaceHeight)}px high`);
                }
            }
        }

        // Step 5: Delegate matrix building to GridBuilder
        const gridResult = this.gridBuilder.buildMatrix(regions, textBounds);

        // Final debug info
        const endTime = performance.now();
        const detectionTime = Math.round(endTime - startTime);

        if (this.debugging) {
            this.debugData.detectedCells = regions.length;
            this.debugData.detectionTime = detectionTime;
            this.debugData.processingSteps.push(`Final: ${regions.length} cells in ${detectionTime}ms`);
            this.debugData.processingSteps.push(`Grid: ${gridResult.rows}x${gridResult.cols}`);
        }

        return gridResult;
    }

    /**
     * Get debug information from the last detection
     * @returns {Object} Debug data object
     */
    getDebugInfo() {
        return this.debugData;
    }

    /**
     * Calculate detection statistics
     * @param {Object} gridResult - Grid result from detect()
     * @param {Object} canvas - Canvas dimensions
     * @returns {Object} Statistics object
     */
    getStatistics(gridResult, canvas) {
        if (!gridResult || !canvas) {
            return null;
        }

        const allCells = gridResult.matrix.flat().filter(cell => cell !== null);
        const textCells = allCells.filter(cell => cell instanceof MainTextCell);
        const contentCells = allCells.filter(cell => cell instanceof ContentCell);

        const totalCanvasArea = canvas.width * canvas.height;
        const totalTextArea = textCells.reduce((sum, cell) =>
            sum + (cell.bounds.width * cell.bounds.height), 0);
        const totalContentArea = contentCells.reduce((sum, cell) =>
            sum + (cell.bounds.width * cell.bounds.height), 0);

        return {
            totalCells: allCells.length,
            textCells: textCells.length,
            contentCells: contentCells.length,
            totalCanvasArea: totalCanvasArea,
            totalTextArea: totalTextArea,
            totalContentArea: totalContentArea,
            textCoverage: ((totalTextArea / totalCanvasArea) * 100).toFixed(1) + '%',
            contentCoverage: ((totalContentArea / totalCanvasArea) * 100).toFixed(1) + '%',
            gridDimensions: `${gridResult.rows}x${gridResult.cols}`
        };
    }
}
