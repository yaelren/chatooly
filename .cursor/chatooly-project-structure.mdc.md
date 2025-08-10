---
description: Project structure and file organization guidelines for Chatooly
globs:
alwaysApply: false
---

# Chatooly Project Structure

## Repository Organization

- We have three separate repositories for modularity
- CDN repository for shared functionality
- Template repository for tool creation
- Hub repository for the main platform

```tree
chatooly/
├── chatooly-cdn/        # Shared JavaScript library
│   ├── core.js          # Main library file
│   ├── core.dev.js      # Development version
│   ├── core.min.js      # Minified production version
│   ├── utils/           # Export utilities
│   │   ├── export-png.js
│   │   ├── export-svg.js
│   │   ├── export-css.js
│   │   └── analytics.js
│   ├── examples/        # Integration examples
│   ├── tests/           # Unit tests
│   ├── package.json
│   └── README.md
│
├── chatooly-template/   # Tool creation template
│   ├── index.html       # Main HTML structure
│   ├── tool.js          # Tool logic placeholder
│   ├── style.css        # Tool styling
│   ├── chatooly.config.json  # Tool metadata
│   ├── .chatooly/       # Chatooly-specific files
│   │   ├── instructions.mdc  # AI assistant context
│   │   ├── publish.js        # Publishing script
│   │   └── examples/         # Code patterns
│   ├── assets/          # Images, fonts, etc.
│   ├── preview.png      # Tool preview
│   ├── package.json
│   └── README.md
│
└── chatooly/            # Main platform (hub)
    ├── frontend/        # Next.js or React app
    │   ├── pages/       # Page components
    │   │   ├── index.js          # Gallery homepage
    │   │   ├── tools/[id].js     # Individual tool pages
    │   │   ├── create.js         # Creation guide
    │   │   └── dashboard.js      # Creator dashboard
    │   ├── components/  # Reusable components
    │   ├── styles/      # Global styles
    │   └── public/      # Static assets
    ├── backend/         # API server
    │   ├── routes/      # API endpoints
    │   │   ├── tools.js          # Tool CRUD
    │   │   ├── publish.js        # Publishing endpoint
    │   │   └── analytics.js      # Usage tracking
    │   ├── middleware/
    │   ├── services/
    │   └── utils/
    ├── database/        # Database schemas
    ├── infrastructure/  # Deployment configs
    └── tools/           # Deployed tool files
        ├── gradient-animator/
        │   ├── index.html
        │   ├── tool.js
        │   └── style.css
        └── svg-morpher/
            ├── index.html
            ├── tool.js
            └── style.css
```

## File Naming and Organization

### General Rules
- Use kebab-case for file names (e.g., `export-png.js`)
- Use PascalCase for React components (e.g., `ToolCard.jsx`)
- Use camelCase for JavaScript variables and functions
- Keep file names descriptive and specific

### CDN Repository
- Core functionality in root directory
- Utilities in `utils/` folder
- Each export type gets its own file
- Test files mirror source structure in `tests/`

### Template Repository
- Main files stay in root for simplicity
- Chatooly-specific files in `.chatooly/`
- Assets in `assets/` folder
- Keep structure minimal for easy understanding

### Hub Repository
- Follow Next.js/React conventions
- API routes in `backend/routes/`
- Database models in `database/models/`
- Shared utilities in appropriate `utils/` folders
- Tool files stored in `tools/` directory for direct serving

## Component Organization

### CDN Components
```javascript
// Each major feature is a module
Chatooly = {
  // Core modules
  init: Function,
  export: Object,
  publish: Object,
  ui: Object,
  utils: Object,
  analytics: Object
}
```

### Template Structure
- `index.html` - Entry point, includes CDN
- `tool.js` - Where creators add their logic
- `style.css` - Tool-specific styling
- `chatooly.config.json` - Metadata and configuration

### Hub Components
- Page components in `pages/`
- Reusable UI components in `components/`
- API logic in `backend/`
- Business logic in `services/`

## Development Workflow

1. **CDN Development**
   - Make changes in `chatooly-cdn/`
   - Test locally with example files
   - Build minified version
   - Deploy to GitHub Pages

2. **Template Updates**
   - Modify template files
   - Test tool creation flow
   - Update AI instructions
   - Push to GitHub

3. **Hub Development**
   - Frontend and backend in same repo
   - Use environment variables for configuration
   - Test publishing flow end-to-end
   - Deploy main site to chatooly.com
   - Deploy tools to tools.chatooly.com/[toolname]

## Best Practices

- Keep CDN lightweight (<50KB)
- Template should work out-of-the-box
- Hub API should be RESTful and well-documented
- Maintain backward compatibility in CDN
- Use semantic versioning across all repos