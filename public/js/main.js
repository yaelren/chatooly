// Main JavaScript for Chatooly Hub

class ChatoolyHub {
    constructor() {
        this.liveToolsGrid = document.getElementById('live-tools-grid');
        this.stagingToolsGrid = document.getElementById('staging-tools-grid');
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
            // Load live tools
            const liveTools = await this.fetchTools('live');
            this.renderTools(liveTools, this.liveToolsGrid);

            // Load staging tools
            const stagingTools = await this.fetchTools('staging');
            this.renderTools(stagingTools, this.stagingToolsGrid);
        } catch (error) {
            console.error('Error loading tools:', error);
        }
    }

    async fetchTools(environment) {
        // In a real implementation, this would make API calls
        // For now, return empty array as placeholder
        return [];
    }

    renderTools(tools, container) {
        if (!tools.length) {
            container.innerHTML = '<div class="no-tools">No tools available yet. Check back soon!</div>';
            return;
        }

        container.innerHTML = tools.map(tool => `
            <div class="tool-card">
                <h3 class="tool-name">
                    <a href="/tools/${tool.environment}/${tool.slug}" class="tool-link">
                        ${tool.name}
                    </a>
                </h3>
                <p class="tool-description">${tool.description}</p>
                <div class="tool-meta">
                    <span class="tool-author">by ${tool.author}</span>
                    <span class="tool-category">${tool.category}</span>
                </div>
            </div>
        `).join('');
    }

    addTool(tool) {
        const container = tool.environment === 'live' ? this.liveToolsGrid : this.stagingToolsGrid;
        
        const toolCard = document.createElement('div');
        toolCard.className = 'tool-card';
        toolCard.innerHTML = `
            <h3 class="tool-name">
                <a href="/tools/${tool.environment}/${tool.slug}" class="tool-link">
                    ${tool.name}
                </a>
            </h3>
            <p class="tool-description">${tool.description}</p>
            <div class="tool-meta">
                <span class="tool-author">by ${tool.author}</span>
                <span class="tool-category">${tool.category}</span>
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