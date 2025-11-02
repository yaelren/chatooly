/*
 * Materials Module - Balloon Material Presets
 * Author: Studio Video
 *
 * Defines material presets for different balloon types and provides
 * functions to create and apply materials to letter meshes.
 */

// ========== MATERIAL PRESETS ==========
const MATERIAL_PRESETS = {
    'helium-latex': {
        name: 'Helium Latex',
        description: 'Smooth, translucent balloon with subtle sheen',
        metalness: 0.1,
        roughness: 0.25,
        clearcoat: 0.8,
        clearcoatRoughness: 0.15,
        reflectivity: 0.9,
        opacity: 0.68,  // More transparent
        envMapIntensity: 1.0,
        transmission: 0.35,  // Increased transparency
        useBackgroundEnv: true
    },
    'helium-foil': {
        name: 'Helium Foil',
        description: 'Reflective foil balloon with matcap shading',
        type: 'matcap',
        matcapPath: 'assets/foil-matcap.jpg'
    },
    'custom-matcap': {
        name: 'Custom Matcap',
        description: 'Upload your own matcap texture',
        type: 'matcap',
        useCustomTexture: true
    }
};

// ========== MATERIALS NAMESPACE ==========
const Materials = {
    /**
     * Create a balloon material with specified color and material preset
     * @param {number} colorIndex - Index for color palette cycling
     * @param {string} materialType - Material preset key (default: from settings)
     * @returns {THREE.MeshPhysicalMaterial|THREE.MeshMatcapMaterial} Material instance
     */
    createBalloonMaterial: function(colorIndex, materialType = null) {
        // Use provided material type or fall back to current setting
        const presetKey = materialType || InflatableText.settings.selectedMaterial;
        const preset = MATERIAL_PRESETS[presetKey];

        if (!preset) {
            console.warn(`⚠️ Material preset "${presetKey}" not found, using helium-latex`);
            preset = MATERIAL_PRESETS['helium-latex'];
        }

        // Get color from palette, cycling through if index exceeds palette length
        const palette = InflatableText.settings.letterColors;
        const colorHex = palette[colorIndex % palette.length];
        const color = new THREE.Color(colorHex);

        // Check if this is a matcap material
        if (preset.type === 'matcap') {
            // Create MeshMatcapMaterial
            const matcapOptions = {
                color: color,
                side: THREE.DoubleSide
            };

            // Load matcap texture based on preset type
            if (preset.useCustomTexture) {
                // Use custom uploaded texture
                if (InflatableText.settings.customMatcapTexture) {
                    matcapOptions.matcap = InflatableText.settings.customMatcapTexture;
                }
            } else if (preset.matcapPath) {
                // Load from file path
                const textureLoader = new THREE.TextureLoader();
                matcapOptions.matcap = textureLoader.load(preset.matcapPath);
            }

            const material = new THREE.MeshMatcapMaterial(matcapOptions);
            return material;
        }

        // Determine which environment map to use
        let envMap = null;
        // Check if this material should use background as environment map
        const shouldUseBackgroundEnv = preset.useBackgroundEnv !== false; // Default to true if not specified

        if (InflatableText.settings.useBackgroundAsEnv && shouldUseBackgroundEnv) {
            // Auto-detect background type and use appropriate environment map
            if (InflatableText.settings.transparentBg) {
                // Transparent background - no environment map
                envMap = null;
            } else if (InflatableText.settings.backgroundImage && InflatableText.settings.backgroundImageEnvMap) {
                // Background image - use converted image as environment map
                envMap = InflatableText.settings.backgroundImageEnvMap;
            } else {
                // Solid color background - create solid color environment map
                envMap = Materials.createSolidColorEnvironmentMap(InflatableText.settings.backgroundColor);
            }
        }

        // Create material with preset properties
        const material = new THREE.MeshPhysicalMaterial({
            color: color,
            metalness: preset.metalness,
            roughness: preset.roughness,
            clearcoat: preset.clearcoat,
            clearcoatRoughness: preset.clearcoatRoughness,
            reflectivity: preset.reflectivity,
            transparent: true,
            opacity: preset.opacity,
            side: THREE.DoubleSide,
            envMap: envMap,
            envMapIntensity: preset.envMapIntensity,
            transmission: preset.transmission || 0.0,
            ior: 1.5 // Index of refraction for transmission
        });

        return material;
    },

    /**
     * Apply current material preset to all existing letters
     * Updates materials in-place and disposes old materials
     */
    applyMaterialToAllLetters: function() {
        if (!InflatableText.letterMeshes || InflatableText.letterMeshes.length === 0) {
            console.log('ℹ️ No letters to apply material to');
            return;
        }

        const materialType = InflatableText.settings.selectedMaterial;
        console.log(`🎨 Applying "${MATERIAL_PRESETS[materialType].name}" material to ${InflatableText.letterMeshes.length} letters`);

        InflatableText.letterMeshes.forEach((letterObj, index) => {
            // Create new material with same color index
            const newMaterial = Materials.createBalloonMaterial(index, materialType);

            // Dispose old material to free memory
            if (letterObj.mesh.material) {
                letterObj.mesh.material.dispose();
            }

            // Apply new material
            letterObj.mesh.material = newMaterial;
        });

        console.log('✅ Material applied to all letters');
    },

    /**
     * Get list of all available material presets
     * @returns {Array} Array of preset objects with key, name, and description
     */
    getAvailablePresets: function() {
        return Object.keys(MATERIAL_PRESETS).map(key => ({
            key: key,
            name: MATERIAL_PRESETS[key].name,
            description: MATERIAL_PRESETS[key].description
        }));
    },

    /**
     * Update environment map on all existing materials
     * Simple logic: if useBackgroundAsEnv is true, use background as environment map
     */
    updateAllMaterialsEnvironmentMap: function() {
        // Determine which environment map to use
        let envMap = null;
        
        if (InflatableText.settings.useBackgroundAsEnv) {
            // Auto-detect background type and use appropriate environment map
            if (InflatableText.settings.transparentBg) {
                // Transparent background - no environment map
                envMap = null;
                console.log('🌍 Background is transparent - no environment map');
            } else if (InflatableText.settings.backgroundImage && InflatableText.settings.backgroundImageEnvMap) {
                // Background image - use converted image as environment map
                envMap = InflatableText.settings.backgroundImageEnvMap;
                console.log('🌍 Using background image as environment map');
            } else {
                // Solid color background - create solid color environment map
                envMap = Materials.createSolidColorEnvironmentMap(InflatableText.settings.backgroundColor);
                console.log(`🌍 Using background color as environment map: ${InflatableText.settings.backgroundColor}`);
            }
        } else {
            // Checkbox unchecked - no environment map
            envMap = null;
            console.log('🌍 Environment map disabled');
        }

        // Update all existing letter materials
        InflatableText.letterMeshes.forEach((letterObj) => {
            if (letterObj.mesh && letterObj.mesh.material) {
                letterObj.mesh.material.envMap = envMap;
                letterObj.mesh.material.needsUpdate = true;
            }
        });

        console.log('🔄 Environment map updated on all materials');
    },

    /**
     * Create a solid color environment map
     * @param {string} color - Hex color for environment
     */
    createSolidColorEnvironmentMap: function(color) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Fill with solid color
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 512, 512);

        // Convert to texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.needsUpdate = true;

        return texture;
    }
};

// Make Materials globally available
window.Materials = Materials;
