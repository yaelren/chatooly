/**
 * ContentSlotTypes.js - Type definitions for Content Slots system
 *
 * Content Slots enable locked layout editing:
 * - Designer creates layouts with editable zones
 * - End-users fill content within constraints
 * - Bounds auto-captured from cell.bounds
 * - Text auto-fits, images crop/scale
 */

/**
 * @typedef {Object} BoundingBox
 * @property {number} x - X coordinate (pixels)
 * @property {number} y - Y coordinate (pixels)
 * @property {number} width - Width (pixels)
 * @property {number} height - Height (pixels)
 */

/**
 * @typedef {Object} TextSlotConstraints
 * @property {number} maxCharacters - Maximum character count
 * @property {string} fontSizeMode - 'auto-fit' or 'fixed'
 * @property {number} minFontSize - Minimum font size for auto-fit (pixels)
 * @property {number} maxFontSize - Maximum font size for auto-fit (pixels)
 * @property {boolean} wordWrap - Enable word wrapping
 * @property {string} verticalAlign - 'top' | 'center' | 'bottom'
 * @property {string} horizontalAlign - 'left' | 'center' | 'right'
 */

/**
 * @typedef {Object} ImageSlotConstraints
 * @property {string} fitMode - 'cover' (crop to fill) or 'free' (scale proportionally)
 * @property {string} focalPoint - 'center' | 'top' | 'bottom' | 'left' | 'right'
 * @property {number} maxFileSize - Maximum file size in bytes (default: 10MB)
 * @property {string[]} allowedFormats - Allowed file formats (e.g., ['jpg', 'png', 'webp', 'gif'])
 */

/**
 * @typedef {Object} TextSlotStyling
 * @property {string} fontFamily - Font family name
 * @property {string} fontWeight - 'normal' | 'bold'
 * @property {string} color - Hex color code
 */

/**
 * @typedef {Object} ContentSlot
 * @property {string} slotId - Unique slot identifier
 * @property {string} sourceElement - Source cell ID or element reference
 * @property {string} sourceContentId - Source cell contentId (UUID)
 * @property {string} type - 'text' | 'image'
 * @property {BoundingBox} boundingBox - Auto-captured from cell.bounds
 * @property {TextSlotConstraints|ImageSlotConstraints} constraints - Type-specific constraints
 * @property {TextSlotStyling|Object} styling - Locked styling properties
 * @property {string} defaultContent - Default content (text or image URL)
 * @property {string} fieldName - Form field name (for end-user form)
 * @property {string} fieldLabel - Form field label
 * @property {string} fieldDescription - Form field description/help text
 * @property {boolean} required - Whether field is required
 */

/**
 * @typedef {Object} ExportConfig
 * @property {string} defaultFormat - 'image' | 'video'
 * @property {number} videoDuration - Video duration in seconds (if video)
 * @property {number} videoFPS - Video FPS (if video)
 * @property {string} imageFormat - 'png' | 'jpg' (if image)
 */

/**
 * Default values for text slots
 */
const DEFAULT_TEXT_CONSTRAINTS = {
    maxCharacters: 100,
    fontSizeMode: 'auto-fit',
    minFontSize: 16,
    maxFontSize: 72,
    wordWrap: true,
    verticalAlign: 'center',
    horizontalAlign: 'center'
};

/**
 * Default values for image slots
 */
const DEFAULT_IMAGE_CONSTRAINTS = {
    fitMode: 'cover',
    focalPoint: 'center',
    maxFileSize: 10485760, // 10MB
    allowedFormats: ['jpg', 'png', 'webp', 'gif']
};

/**
 * Default export configuration
 */
const DEFAULT_EXPORT_CONFIG = {
    defaultFormat: 'image',
    videoDuration: 5,
    videoFPS: 60,
    imageFormat: 'png'
};

// Export defaults
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEFAULT_TEXT_CONSTRAINTS,
        DEFAULT_IMAGE_CONSTRAINTS,
        DEFAULT_EXPORT_CONFIG
    };
}
