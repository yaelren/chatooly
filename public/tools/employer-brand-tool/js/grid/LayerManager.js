/**
 * LayerManager.js - Core layer management system
 * Part of the Layer Management System
 */

class LayerManager {
    constructor() {
        this.layers = new Map();
        this.initializeDefaultLayers();
    }
    
    /**
     * Initialize the default layers
     * @private
     */
    initializeDefaultLayers() {
        const defaultLayers = [
            { id: 'background', name: 'Background', order: 0 },
            { id: 'behind-main-text', name: 'Behind Main Text', order: 1 },
            { id: 'main-text', name: 'Main Text', order: 2 },
            { id: 'above-main-text', name: 'Above Main Text', order: 3 }
        ];
        
        defaultLayers.forEach(layerData => {
            this.layers.set(layerData.id, new Layer(
                layerData.id, 
                layerData.name, 
                layerData.order
            ));
        });
    }
    
    /**
     * Get a layer by ID
     * @param {string} layerId - Layer ID
     * @returns {Layer|null} Layer instance or null if not found
     */
    getLayer(layerId) {
        return this.layers.get(layerId) || null;
    }
    
    /**
     * Get all layers sorted by order
     * @returns {Array} Array of Layer instances sorted by order
     */
    getSortedLayers() {
        return Array.from(this.layers.values())
            .filter(layer => layer.visible)
            .sort((a, b) => a.order - b.order);
    }
    
    /**
     * Get all layers (including invisible ones) sorted by order
     * @returns {Array} Array of all Layer instances sorted by order
     */
    getAllLayers() {
        return Array.from(this.layers.values())
            .sort((a, b) => a.order - b.order);
    }
    
    /**
     * Assign a cell to a specific layer
     * @param {GridCell} cell - Cell to assign
     * @param {string} layerId - Target layer ID
     * @returns {boolean} True if assignment was successful
     */
    assignCellToLayer(cell, layerId) {
        if (!cell) return false;
        
        // Remove from current layer
        if (cell.layerId) {
            const currentLayer = this.layers.get(cell.layerId);
            if (currentLayer) {
                currentLayer.removeCell(cell);
            }
        }
        
        // Add to new layer
        const newLayer = this.layers.get(layerId);
        if (newLayer) {
            newLayer.addCell(cell);
            return true;
        }
        
        return false;
    }
    
    /**
     * Get the default layer for a cell type
     * @param {string} cellType - Type of cell ('main-text', 'content', etc.)
     * @returns {string} Default layer ID
     */
    getDefaultLayerForCellType(cellType) {
        switch (cellType) {
            case 'main-text':
                return 'main-text';
            case 'content':
            default:
                return 'behind-main-text';
        }
    }
    
    /**
     * Toggle layer visibility
     * @param {string} layerId - Layer ID
     * @param {boolean} visible - Whether layer should be visible
     */
    setLayerVisible(layerId, visible) {
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.setVisible(visible);
        }
    }
    
    /**
     * Get layer visibility
     * @param {string} layerId - Layer ID
     * @returns {boolean} Layer visibility
     */
    isLayerVisible(layerId) {
        const layer = this.layers.get(layerId);
        return layer ? layer.visible : false;
    }
    
    /**
     * Get all cells from all visible layers
     * @returns {Array} Array of all cells from visible layers
     */
    getAllCellsFromVisibleLayers() {
        const cells = [];
        this.getSortedLayers().forEach(layer => {
            cells.push(...layer.getCells());
        });
        return cells;
    }
    
    /**
     * Get layer statistics
     * @returns {Object} Statistics about all layers
     */
    getLayerStats() {
        const stats = {};
        this.getAllLayers().forEach(layer => {
            stats[layer.id] = {
                name: layer.name,
                order: layer.order,
                visible: layer.visible,
                cellCount: layer.getCellCount()
            };
        });
        return stats;
    }
    
    /**
     * Clear all cells from all layers
     */
    clearAllLayers() {
        this.layers.forEach(layer => {
            layer.clear();
        });
    }
    
    /**
     * Reset layer manager to default state
     */
    reset() {
        this.clearAllLayers();
        this.layers.clear();
        this.initializeDefaultLayers();
    }
}
