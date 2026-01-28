// Main JavaScript for Chatooly Hub

class ChatoolyHub {
    constructor() {
        this.toolsList = document.getElementById('tools-list');
        this.searchInput = document.getElementById('search-input');
        this.sortButtons = document.querySelectorAll('.sort-btn');
        this.allTools = [];
        this.currentSort = { field: 'date', direction: 'desc' };
        this.init();
    }

    init() {
        console.log('Chatooly Hub initialized');
        this.loadTools();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Search input
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => {
                this.applyFiltersAndSort();
            });
        }

        // Sort buttons
        this.sortButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const sortField = btn.dataset.sort;

                // Toggle direction if same field, otherwise default to appropriate direction
                if (this.currentSort.field === sortField) {
                    this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    this.currentSort.field = sortField;
                    // Default: name/author ascending, date descending (newest first)
                    this.currentSort.direction = sortField === 'date' ? 'desc' : 'asc';
                }

                // Update active button
                this.sortButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update button text with direction indicator
                this.updateSortButtonIndicators();

                this.applyFiltersAndSort();
            });
        });

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

    updateSortButtonIndicators() {
        this.sortButtons.forEach(btn => {
            const field = btn.dataset.sort;
            const baseText = field.charAt(0).toUpperCase() + field.slice(1);
            if (this.currentSort.field === field) {
                const arrow = this.currentSort.direction === 'asc' ? '↑' : '↓';
                btn.textContent = `${baseText} ${arrow}`;
            } else {
                btn.textContent = baseText;
            }
        });
    }

    async loadTools() {
        try {
            const tools = await this.fetchTools();
            this.allTools = tools;
            this.updateSortButtonIndicators();
            this.applyFiltersAndSort();
        } catch (error) {
            console.error('Error loading tools:', error);
            this.toolsList.innerHTML = '<div class="no-tools">Error loading tools. Please try again later.</div>';
        }
    }

    applyFiltersAndSort() {
        let tools = [...this.allTools];

        // Filter by search term
        const searchTerm = this.searchInput?.value?.toLowerCase() || '';
        if (searchTerm) {
            tools = tools.filter(tool => {
                const name = (tool.name || '').toLowerCase();
                const author = (tool.author || '').toLowerCase();
                const description = (tool.description || '').toLowerCase();
                return name.includes(searchTerm) ||
                       author.includes(searchTerm) ||
                       description.includes(searchTerm);
            });
        }

        // Sort
        tools = this.sortTools(tools);

        this.renderTools(tools);
    }

    sortTools(tools) {
        const { field, direction } = this.currentSort;
        const multiplier = direction === 'asc' ? 1 : -1;

        return tools.sort((a, b) => {
            if (field === 'date') {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return (dateA - dateB) * multiplier;
            } else if (field === 'name') {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB) * multiplier;
            } else if (field === 'author') {
                const authorA = (a.author || '').toLowerCase();
                const authorB = (b.author || '').toLowerCase();
                return authorA.localeCompare(authorB) * multiplier;
            }
            return 0;
        });
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
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
                category: 'art',
                createdAt: '2024-01-01T00:00:00Z'
            },
            {
                name: 'Dragon Generator',
                slug: 'dragon-generator',
                author: 'Studio Video',
                category: 'generators',
                createdAt: '2024-01-02T00:00:00Z'
            },
            {
                name: 'Fire Generator',
                slug: 'fire-generator',
                author: 'Studio Video',
                category: 'generators',
                createdAt: '2024-01-03T00:00:00Z'
            },
            {
                name: 'Homriki',
                slug: 'homriki',
                author: 'Studio Video',
                category: 'art',
                createdAt: '2024-01-04T00:00:00Z'
            },
            {
                name: 'Image Dithering',
                slug: 'image-dithering',
                author: 'Studio Video',
                category: 'editors',
                createdAt: '2024-01-05T00:00:00Z'
            },
            {
                name: 'Sticker Maker',
                slug: 'sticker-maker',
                author: 'Studio Video',
                category: 'art',
                createdAt: '2024-01-06T00:00:00Z'
            },
            {
                name: 'Text Waves',
                slug: 'text-waves',
                author: 'Studio Video',
                category: 'text',
                createdAt: '2024-01-07T00:00:00Z'
            },
            {
                name: 'Type Shaper',
                slug: 'type-shaper',
                author: 'Studio Video',
                category: 'text',
                createdAt: '2024-01-08T00:00:00Z'
            },
            {
                name: 'Physics Chain Text',
                slug: 'physics-chain-text',
                author: 'Studio Video',
                category: 'text',
                createdAt: '2024-01-09T00:00:00Z'
            },
            {
                name: 'Sliced Typography',
                slug: 'sliced-typography',
                author: 'Omer',
                category: 'art',
                createdAt: '2024-01-10T00:00:00Z'
            },
            {
                name: 'Liquid Typography',
                slug: 'liquid-typography',
                author: 'Studio Video',
                category: 'text',
                createdAt: '2024-01-11T00:00:00Z'
            },
            {
                name: '*DGA*: 3D Trail',
                slug: 'dga-3d-trail',
                author: 'Yael Renous - Studio Video',
                category: '3d',
                createdAt: '2024-01-12T00:00:00Z'
            },
            {
                name: '*DGA*: 3D Type Shaper',
                slug: 'dga-3d-type-shaper',
                author: 'Yael Renous - Studio Video',
                category: 'generators',
                createdAt: '2024-01-13T00:00:00Z'
            },
            {
                name: '*DGA*: MatCap Tool',
                slug: 'dga-matcap-tool',
                author: 'Yael Renous - Studio Video',
                category: '3d',
                createdAt: '2024-01-14T00:00:00Z'
            }
        ];

        return tools;
    }

    renderTools(tools) {
        if (!tools.length) {
            const searchTerm = this.searchInput?.value || '';
            if (searchTerm) {
                this.toolsList.innerHTML = '<div class="no-tools">No tools match your search.</div>';
            } else {
                this.toolsList.innerHTML = '<div class="no-tools">No tools available yet. Check back soon!</div>';
            }
            return;
        }

        this.toolsList.innerHTML = tools.map(tool => {
            const dateStr = this.formatDate(tool.createdAt);
            const datePart = dateStr ? ` <span class="tool-date">| ${dateStr}</span>` : '';

            return `
            <div class="tool-item">
                <a href="tools/${tool.slug}/" class="tool-link">
                    <span class="tool-name">${tool.name}</span>
                    <span class="tool-meta">by ${tool.author}${datePart}</span>
                </a>
            </div>
        `}).join('');
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
