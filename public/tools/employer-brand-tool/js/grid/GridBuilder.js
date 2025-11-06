/**
 * GridBuilder.js - Builds spatial grid during spot detection
 * Part of the Grid Animation System
 *
 * This class works with GridDetector to build an accurate spatial grid
 * that represents the actual layout discovered during grid detection
 */

class GridBuilder {
    constructor() {
        this.regions = [];  // All discovered regions (text + spots)
        this.rows = [];     // Row boundaries discovered
        this.cols = [];     // Column boundaries discovered
        this.matrix = [];   // Final grid matrix
    }

    /**
     * Start building a new grid
     */
    startBuild() {
        this.regions = [];
        this.rows = [];
        this.cols = [];
        this.matrix = [];
    }

    /**
     * Add a text region discovered during spot detection
     * @param {Object} bounds - Text bounds with x, y, width, height
     * @param {string} text - The text content
     * @param {number} lineIndex - Index of this text line
     */
    addTextRegion(bounds, text, lineIndex) {
        this.regions.push({
            type: 'text',
            bounds: bounds,
            text: text,
            lineIndex: lineIndex,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height
        });

        // Track row boundaries
        this._trackRowBoundaries(bounds.y, bounds.y + bounds.height);

        // Track column boundaries
        this._trackColumnBoundaries(bounds.x, bounds.x + bounds.width);
    }

    /**
     * Add a spot region discovered during detection
     * @param {Object} spot - Spot object with position and dimensions
     */
    addSpotRegion(spot) {
        this.regions.push({
            type: 'spot',
            spot: spot,
            x: spot.x,
            y: spot.y,
            width: spot.width,
            height: spot.height
        });

        // Track row boundaries
        this._trackRowBoundaries(spot.y, spot.y + spot.height);

        // Track column boundaries
        this._trackColumnBoundaries(spot.x, spot.x + spot.width);
    }

    /**
     * Track row boundaries based on Y positions
     * @private
     */
    _trackRowBoundaries(top, bottom) {
        // Add unique Y positions as potential row boundaries
        if (!this.rows.includes(top)) {
            this.rows.push(top);
        }
        if (!this.rows.includes(bottom)) {
            this.rows.push(bottom);
        }
    }

    /**
     * Track column boundaries based on X positions
     * @private
     */
    _trackColumnBoundaries(left, right) {
        // Add unique X positions as potential column boundaries
        if (!this.cols.includes(left)) {
            this.cols.push(left);
        }
        if (!this.cols.includes(right)) {
            this.cols.push(right);
        }
    }

    /**
     * Build grid matrix from detected regions
     * This is the final step after GridDetector has found all regions
     * @param {Array} regions - Detected regions (text + content cells) from GridDetector
     * @param {Array} textBounds - Original text bounds for reference
     * @returns {Object} Grid structure with matrix, rows, cols
     */
    buildMatrix(regions, textBounds) {
        // Sort regions by row, then col
        regions.sort((a, b) => {
            if (a.row !== b.row) return a.row - b.row;
            return a.col - b.col;
        });

        // Determine grid dimensions
        const minRow = Math.min(...regions.map(r => r.row));
        const maxRow = Math.max(...regions.map(r => r.row));
        const maxCol = Math.max(...regions.map(r => r.col));

        const rows = maxRow - minRow + 1;
        const cols = maxCol + 1;

        // Create empty matrix
        this.matrix = Array(rows).fill(null).map(() => Array(cols).fill(null));

        // Fill matrix with cell instances
        regions.forEach(region => {
            const matrixRow = region.row - minRow; // Adjust for negative rows
            const matrixCol = region.col;

            let cell;
            if (region.type === 'main-text') {
                cell = new MainTextCell(region.text, region.lineIndex, matrixRow, matrixCol);
                // Apply style updates to the TextComponent instance
                if (region.style) {
                    cell.updateStyle(region.style);
                }
            } else {
                cell = new ContentCell(region.contentType, matrixRow, matrixCol);
            }

            // Set bounds
            cell.bounds = {
                x: region.x,
                y: region.y,
                width: region.width,
                height: region.height
            };

            this.matrix[matrixRow][matrixCol] = cell;
        });

        return {
            matrix: this.matrix,
            rows: rows,
            cols: cols,
            textBounds: textBounds // Keep reference for rebuild
        };
    }

}