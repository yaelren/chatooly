# Chatooly Hub - POC Implementation Tasks

Basic static file hosting for tool deployment with staging/live structure.

## ✅ Completed Tasks

- [ ] (Start here)

## 🚧 In Progress

- [ ] Create basic repository structure
  - tools/staging/ directory
  - tools/live/ directory
  - vercel.json for routing
  - Optional: simple index.html gallery

## 📋 Planned Tasks

- [ ] Vercel configuration
  - Static file serving setup
  - Subdomain routing (staging-tools, tools)
  - Deploy configuration
- [ ] Tool hosting structure
  - Each tool in own directory
  - Direct file serving (no API)
- [ ] Manual promotion workflow
  - Command-line tool promotion
  - Re-deployment after promotion
- [ ] Optional: Simple gallery page
  - List tools in live/ directory
  - Basic HTML page with links
  - No database - just filesystem

## 📁 Implementation Details

### File Structure
```
chatooly/
├── tools/
│   ├── staging/            # Auto-deployed tools
│   │   └── example-tool/
│   │       ├── index.html
│   │       ├── tool.js
│   │       └── style.css
│   └── live/              # Manually promoted tools
│       └── approved-tool/
├── index.html             # Optional gallery
├── vercel.json           # Routing config
└── README.md             # Admin instructions
```

### Vercel Routing
```json
{
  "routes": [
    { "src": "/tools/(.*)", "dest": "/tools/$1" },
    { "src": "/(.*)", "dest": "/$1" }
  ]
}
```

### Manual Promotion
```bash
# Promote tool from staging to live
cp -r tools/staging/toolname tools/live/toolname
vercel deploy
```

## 🔴 Critical Path
1. Basic directory structure  
2. Vercel deployment
3. Test tool serving
4. Promotion workflow