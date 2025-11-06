/* 
 * Chatooly Tool Template - Configuration
 * Author: Yael Renous - Studio Video
 */

// ========== EDIT THIS: Chatooly Configuration ==========
window.ChatoolyConfig = {
    // REQUIRED: Your tool name
    name: "sticker-tool",
    
    // OPTIONAL: Export settings
    resolution: 2,              // 1, 2, or 4
    buttonPosition: "bottom-right",
    
    // REQUIRED FOR PUBLISHING: Tool metadata
    category: "editors",     // Choose one: "generators", "visualizers", "editors", "utilities", "games", "art"
    tags: ["stickers", "interactive", "design", "creative"],         // Add relevant tags e.g., ["creative", "interactive", "design"]
    description: "Click anywhere to add animated stickers from text or uploaded images",  // Brief description of what your tool does
    version: "1.0.0",
    author: ""        // Your name or handle
};

// Debug: Verify config is loaded correctly
console.log('ChatoolyConfig loaded:', window.ChatoolyConfig);
console.log('Tool name:', window.ChatoolyConfig.name);