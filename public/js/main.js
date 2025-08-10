// Main JavaScript for Chatooly Hub

class ChatoolyHub {
    constructor() {
        this.toolsGrid = document.getElementById('tools-grid');
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
            // Load all tools
            const tools = await this.fetchTools();
            this.renderTools(tools, this.toolsGrid);
        } catch (error) {
            console.error('Error loading tools:', error);
            this.toolsGrid.innerHTML = '<div class="no-tools">Error loading tools. Please try again later.</div>';
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
        const knownTools = [
            'test-api',
            'windy-text',
            'fisheye-tool'
        ];
        
        const discoveredTools = [];
        
        for (const toolSlug of knownTools) {
            try {
                // Check if tool exists by trying to fetch its index.html
                const response = await fetch(`/tools/${toolSlug}/index.html`, { method: 'HEAD' });
                if (response.ok) {
                    // Try to get metadata from chatooly-config.js if it exists
                    const configResponse = await fetch(`/tools/${toolSlug}/js/chatooly-config.js`);
                    let metadata = {
                        name: toolSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                        description: 'A Chatooly design tool',
                        author: 'Anonymous',
                        category: 'tools',
                        slug: toolSlug,
                        createdAt: new Date().toISOString()
                    };
                    
                    if (configResponse.ok) {
                        try {
                            const configText = await configResponse.text();
                            // Extract metadata from config file (basic parsing)
                            const nameMatch = configText.match(/name:\s*["']([^"']+)["']/);
                            const descMatch = configText.match(/description:\s*["']([^"']+)["']/);
                            const authorMatch = configText.match(/author:\s*["']([^"']+)["']/);
                            
                            if (nameMatch) metadata.name = nameMatch[1];
                            if (descMatch) metadata.description = descMatch[1];
                            if (authorMatch) metadata.author = authorMatch[1];
                        } catch (e) {
                            console.warn(`Could not parse config for ${toolSlug}:`, e);
                        }
                    }
                    
                    discoveredTools.push(metadata);
                }
            } catch (e) {
                // Tool doesn't exist, continue
            }
        }
        
        return discoveredTools;
    }

    renderTools(tools, container) {
        if (!tools.length) {
            container.innerHTML = '<div class="no-tools">No tools available yet. Check back soon!</div>';
            return;
        }

        container.innerHTML = tools.map(tool => `
            <div class="tool-card">
                <h3 class="tool-name">
                    <a href="/tools/${tool.slug}/" class="tool-link">
                        ${tool.name}
                    </a>
                </h3>
                <p class="tool-description">${tool.description}</p>
                <div class="tool-meta">
                    <span class="tool-author">by ${tool.author}</span>
                    <span class="tool-category">${tool.category}</span>
                </div>
                <div class="tool-date">
                    ${new Date(tool.createdAt).toLocaleDateString()}
                </div>
            </div>
        `).join('');
    }

    addTool(tool) {
        const container = this.toolsGrid;
        
        const toolCard = document.createElement('div');
        toolCard.className = 'tool-card';
        toolCard.innerHTML = `
            <h3 class="tool-name">
                <a href="/tools/${tool.slug}/" class="tool-link">
                    ${tool.name}
                </a>
            </h3>
            <p class="tool-description">${tool.description}</p>
            <div class="tool-meta">
                <span class="tool-author">by ${tool.author}</span>
                <span class="tool-category">${tool.category}</span>
            </div>
            <div class="tool-date">
                ${new Date(tool.createdAt).toLocaleDateString()}
            </div>
        `;

        // Remove "no tools" message if it exists
        const noToolsMsg = container.querySelector('.no-tools');
        if (noToolsMsg) {
            container.removeChild(noToolsMsg);
        }

        container.appendChild(toolCard);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatoolyHub = new ChatoolyHub();
});