/**
 * TextPositioning.js - Utility for consistent text positioning calculations
 * Centralizes all text positioning logic including baseline calculations
 */

class TextPositioning {
    /**
     * Calculate the baseline rendering position for text
     * @param {Object} bounds - Text bounds {x, y, width, height}
     * @param {TextComponent} textComponent - TextComponent instance with font metrics
     * @param {string} text - The text to render
     * @param {number} fontSize - Font size (optional, defaults to textComponent.fontSize)
     * @returns {number} Y position for baseline rendering
     */
    static calculateBaselineY(bounds, textComponent, text, fontSize = null) {
        const actualFontSize = fontSize || textComponent.fontSize;
        const fontMetrics = textComponent.getFontMetrics(actualFontSize);
        
        if (!fontMetrics) {
            // Fallback: use bounds.y + fontSize * 0.8 (approximate baseline)
            return bounds.y + (actualFontSize * 0.8);
        }
        
        const hasCapitals = textComponent.hasCapitalLetters(text);
        if (hasCapitals) {
            // For baseline alignment: baseline = lineY + capHeight
            return bounds.y + fontMetrics.capHeight;
        } else {
            // For baseline alignment: baseline = lineY + xHeight
            return bounds.y + fontMetrics.xHeight;
        }
    }
    
    /**
     * Calculate the horizontal text position based on alignment
     * @param {Object} bounds - Text bounds {x, y, width, height}
     * @param {string} alignment - Text alignment ('left', 'center', 'right')
     * @returns {number} X position for text rendering
     */
    static calculateTextX(bounds, alignment) {
        switch (alignment) {
            case 'left':
                return bounds.x;
            case 'center':
                return bounds.x + bounds.width / 2;
            case 'right':
                return bounds.x + bounds.width; // Right edge for right-aligned text
            default:
                return bounds.x;
        }
    }
    
    /**
     * Calculate underline position based on baseline and font metrics
     * @param {number} baselineY - Baseline Y position
     * @param {TextComponent} textComponent - TextComponent instance
     * @param {number} fontSize - Font size (optional, defaults to textComponent.fontSize)
     * @returns {number} Y position for underline
     */
    static calculateUnderlineY(baselineY, textComponent, fontSize = null) {
        const actualFontSize = fontSize || textComponent.fontSize;
        const fontMetrics = textComponent.getFontMetrics(actualFontSize);
        
        if (fontMetrics) {
            // Position underline below baseline using descent
            return baselineY + fontMetrics.descent;
        } else {
            // Fallback: position below baseline
            return baselineY + (actualFontSize * 0.2);
        }
    }
    
    /**
     * Calculate underline horizontal position based on text alignment
     * @param {number} textX - Text X position
     * @param {string} alignment - Text alignment
     * @param {number} textWidth - Width of the text
     * @returns {number} X position for underline start
     */
    static calculateUnderlineX(textX, alignment, textWidth) {
        switch (alignment) {
            case 'left':
                return textX;
            case 'center':
                return textX - textWidth / 2;
            case 'right':
                return textX - textWidth;
            default:
                return textX;
        }
    }
    
    /**
     * Get complete positioning information for text rendering
     * @param {Object} bounds - Text bounds {x, y, width, height}
     * @param {TextComponent} textComponent - TextComponent instance
     * @param {string} text - The text to render
     * @param {string} alignment - Text alignment ('left', 'center', 'right')
     * @param {number} fontSize - Font size (optional, defaults to textComponent.fontSize)
     * @returns {Object} Complete positioning information
     */
    static getTextPositioning(bounds, textComponent, text, alignment, fontSize = null) {
        const textX = this.calculateTextX(bounds, alignment);
        const baselineY = this.calculateBaselineY(bounds, textComponent, text, fontSize);
        
        return {
            textX,
            baselineY,
            underlineY: this.calculateUnderlineY(baselineY, textComponent, fontSize),
            underlineX: this.calculateUnderlineX(textX, alignment, 0) // textWidth will be calculated when needed
        };
    }
}
