/**
 * Layer.js - Individual layer class for the layer system
 * Part of the Layer Management System
 */

class Layer {
    constructor(id, name, order, visible = true) {
        this.id = id;
        this.name = name;
        this.order = order; // Lower numbers render first (behind)
        this.visible = visible;
        this.cells = new Set(); // Cells assigned to this layer
    }
    
    /**
     * Add a cell to this layer
     * @param {GridCell} cell - Cell to add
     */
    addCell(cell) {
        this.cells.add(cell);
        cell.layerId = this.id;
    }
    
    /**
     * Remove a cell from this layer
     * @param {GridCell} cell - Cell to remove
     */
    removeCell(cell) {
        this.cells.delete(cell);
        cell.layerId = null;
    }
    
    /**
     * Toggle layer visibility
     * @param {boolean} visible - Whether layer should be visible
     */
    setVisible(visible) {
        this.visible = visible;
    }
    
    /**
     * Get all cells in this layer as an array
     * @returns {Array} Array of cells in this layer
     */
    getCells() {
        return Array.from(this.cells);
    }
    
    /**
     * Get the number of cells in this layer
     * @returns {number} Number of cells
     */
    getCellCount() {
        return this.cells.size;
    }
    
    /**
     * Check if this layer contains a specific cell
     * @param {GridCell} cell - Cell to check
     * @returns {boolean} True if cell is in this layer
     */
    hasCell(cell) {
        return this.cells.has(cell);
    }
    
    /**
     * Clear all cells from this layer
     */
    clear() {
        this.cells.forEach(cell => {
            cell.layerId = null;
        });
        this.cells.clear();
    }
}

