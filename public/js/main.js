// Main JavaScript for Chatooly Hub

class ChatoolyHub {
    constructor() {
        this.toolsList = document.getElementById('tools-list');
        this.init();
    }

    init() {
        console.log('Chatooly Hub initialized');
        this.loadTools();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Smooth scrolling for navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    async loadTools() {
        try {
            const tools = await this.fetchTools();
            this.renderTools(tools);
        } catch (error) {
            console.error('Error loading tools:', error);
            this.toolsList.innerHTML = '<div class="no-tools">Error loading tools. Please try again later.</div>';
        }
    }

    async fetchTools() {
        try {
            // Use the catalog API to get all tools
            const response = await fetch('/api/catalog');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            
            return data.tools || [];
        } catch (error) {
            console.warn('Could not fetch tools from API, trying static discovery:', error);
            
            // Fallback: try to discover tools by making requests to known paths
            return this.discoverToolsStatic();
        }
    }

    async discoverToolsStatic() {
        // Static tool data for local development
        const tools = [
            {
                name: 'BG Gradient Tool',
                slug: 'bg-gradient-tool',
                author: 'Studio Video',
                category: 'art'
            },
            {
                name: 'Dragon Generator',
                slug: 'dragon-generator',
                author: 'Studio Video',
                category: 'generators'
            },
            {
                name: 'Fire Generator',
                slug: 'fire-generator',
                author: 'Studio Video',
                category: 'generators'
            },
            {
                name: 'Homriki',
                slug: 'homriki',
                author: 'Studio Video',
                category: 'art'
            },
            {
                name: 'Image Dithering',
                slug: 'image-dithering',
                author: 'Studio Video',
                category: 'editors'
            },
            {
                name: 'Sticker Maker',
                slug: 'sticker-maker',
                author: 'Studio Video',
                category: 'art'
            },
            {
                name: 'Text Waves',
                slug: 'text-waves',
                author: 'Studio Video',
                category: 'text'
            },
            {
                name: 'Type Shaper',
                slug: 'type-shaper',
                author: 'Studio Video',
                category: 'text'
            },
            {
                name: 'Physics Chain Text',
                slug: 'physics-chain-text',
                author: 'Studio Video',
                category: 'text'
            },
            {
                name: 'Sliced Typography',
                slug: 'sliced-typography',
                author: 'Omer',
                category: 'art'
            },
            {
                name: 'Liquid Typography',
                slug: 'liquid-typography',
                author: 'Studio Video',
                category: 'text'
            }
        ];

        return tools;
    }

    renderTools(tools) {
        if (!tools.length) {
            this.toolsList.innerHTML = '<div class="no-tools">No tools available yet. Check back soon!</div>';
            return;
        }

        // Use relative paths to work with both server root configurations
        // If server root is 'public': tools/ resolves to /tools/
        // If server root is project root and page is at /public/index.html: tools/ resolves to /public/tools/
        this.toolsList.innerHTML = tools.map(tool => `
            <div class="tool-item">
                <a href="tools/${tool.slug}/" class="tool-link">
                    <span class="tool-name">${tool.name}</span>
                    <span class="tool-creator">by ${tool.author}</span>
                </a>
            </div>
        `).join('');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatoolyHub = new ChatoolyHub();
    
    // Initialize Chatooly CDN for export functionality
    if (window.Chatooly) {
        Chatooly.init({
            name: 'Chatooly Hub',
            enableZoom: false,
            enableCanvasArea: false
        });
    }
});