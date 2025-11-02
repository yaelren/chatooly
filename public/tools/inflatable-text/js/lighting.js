/*
 * Lighting Module - Scene Lighting and Environment Setup
 * Author: Studio Video
 *
 * Manages all lighting in the scene including ambient, directional lights,
 * and procedural environment maps for realistic reflections.
 */

// ========== LIGHTING NAMESPACE ==========
const Lighting = {
    /**
     * Initialize all scene lights
     * Creates ambient, key, fill, and rim lights
     */
    setupLighting: function() {
        // Ambient light for overall illumination
        InflatableText.lights.ambient = new THREE.AmbientLight(0xffffff, InflatableText.settings.ambientIntensity);
        InflatableText.scene.add(InflatableText.lights.ambient);

        // Main directional light (key light)
        InflatableText.lights.main = new THREE.DirectionalLight(0xffffff, InflatableText.settings.mainLightIntensity);
        InflatableText.lights.main.position.set(10, 20, 10);
        InflatableText.lights.main.castShadow = true;
        InflatableText.scene.add(InflatableText.lights.main);

        // Fill light (softer, from opposite side)
        InflatableText.lights.fill = new THREE.DirectionalLight(0x88ccff, InflatableText.settings.fillLightIntensity);
        InflatableText.lights.fill.position.set(-10, 5, -5);
        InflatableText.scene.add(InflatableText.lights.fill);

        // Rim light (for balloon edge glow) - positioned more from the side to reduce front halo
        InflatableText.lights.rim = new THREE.DirectionalLight(0xaaccff, InflatableText.settings.rimLightIntensity);
        InflatableText.lights.rim.position.set(-5, 10, -15);
        InflatableText.scene.add(InflatableText.lights.rim);

        // Create default environment map for metallic reflections
        Lighting.createDefaultEnvironmentMap();

        console.log('✅ Lighting setup complete');
    },

    /**
     * Create a procedural gradient environment map for reflections
     * Used by metallic and reflective materials
     */
    createDefaultEnvironmentMap: function() {
        // Create a simple procedural environment map for reflections
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Create gradient (sky to ground)
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#87CEEB');    // Sky blue
        gradient.addColorStop(0.5, '#E0E0E0'); // Horizon
        gradient.addColorStop(1, '#404040');    // Ground
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        // Add some noise/variation for interesting reflections
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const size = Math.random() * 30 + 10;
            const opacity = Math.random() * 0.3;
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Convert to texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.needsUpdate = true;

        // Store as default environment map
        if (!InflatableText.settings.environmentMap) {
            InflatableText.settings.environmentMap = texture;
        }

        console.log('✅ Default environment map created');
    },

    /**
     * Update light intensities
     * @param {Object} intensities - Object with light intensity values
     */
    updateLightIntensities: function(intensities) {
        if (intensities.ambient !== undefined && InflatableText.lights.ambient) {
            InflatableText.lights.ambient.intensity = intensities.ambient;
            InflatableText.settings.ambientIntensity = intensities.ambient;
        }
        if (intensities.main !== undefined && InflatableText.lights.main) {
            InflatableText.lights.main.intensity = intensities.main;
            InflatableText.settings.mainLightIntensity = intensities.main;
        }
        if (intensities.fill !== undefined && InflatableText.lights.fill) {
            InflatableText.lights.fill.intensity = intensities.fill;
            InflatableText.settings.fillLightIntensity = intensities.fill;
        }
        if (intensities.rim !== undefined && InflatableText.lights.rim) {
            InflatableText.lights.rim.intensity = intensities.rim;
            InflatableText.settings.rimLightIntensity = intensities.rim;
        }
    },

    /**
     * Update main light position (useful for light-follows-mouse feature)
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     */
    updateMainLightPosition: function(x, y, z) {
        if (InflatableText.lights.main) {
            InflatableText.lights.main.position.set(x, y, z);
        }
    },

    /**
     * Update rim light position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     */
    updateRimLightPosition: function(x, y, z) {
        if (InflatableText.lights.rim) {
            InflatableText.lights.rim.position.set(x, y, z);
            InflatableText.settings.rimLightPosition = { x, y, z };
        }
    },

    /**
     * Update fill light position
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     */
    updateFillLightPosition: function(x, y, z) {
        if (InflatableText.lights.fill) {
            InflatableText.lights.fill.position.set(x, y, z);
            InflatableText.settings.fillLightPosition = { x, y, z };
        }
    },

    /**
     * Toggle lights on/off
     * @param {Object} toggles - Object with light visibility states
     */
    toggleLights: function(toggles) {
        if (toggles.ambient !== undefined && InflatableText.lights.ambient) {
            InflatableText.lights.ambient.visible = toggles.ambient;
            InflatableText.settings.ambientEnabled = toggles.ambient;
        }
        if (toggles.main !== undefined && InflatableText.lights.main) {
            InflatableText.lights.main.visible = toggles.main;
            InflatableText.settings.mainLightEnabled = toggles.main;
        }
        if (toggles.fill !== undefined && InflatableText.lights.fill) {
            InflatableText.lights.fill.visible = toggles.fill;
            InflatableText.settings.fillLightEnabled = toggles.fill;
        }
        if (toggles.rim !== undefined && InflatableText.lights.rim) {
            InflatableText.lights.rim.visible = toggles.rim;
            InflatableText.settings.rimLightEnabled = toggles.rim;
        }
    }
};

// Make Lighting globally available
window.Lighting = Lighting;
