# Studio Video Tool Hub - UI Design & Implementation Tasks

Focus on layout, styling, and gallery design for the main platform.

## ✅ Completed Tasks

- [x] Basic repository structure exploration
- [x] Design specifications defined

## 🚧 In Progress

- [ ] **Homepage Layout & Styling**
  - Create main page structure (header + gallery)
  - Implement reaction-diffusion P5.js animated background
  - Random pastel color selection on page load
  - Set up responsive CSS grid for 3-column tool gallery
  - Style square thumbnail cards with hover effects

## 📋 Planned Tasks

### Phase 1: Core Layout & Styling
- [ ] **Reaction-Diffusion Background Implementation**
  - Integrate P5.js reaction-diffusion algorithm
  - Random pastel color palette array (pink, lavender, mint, peach, sky blue, etc.)
  - Select random color on each page load
  - Full viewport coverage behind content
  - Mouse interaction for adding reaction points
  - Performance optimization (consider size parameter for performance)
  - Ensure gallery content layers properly above animation
  - Test across screen sizes and devices

- [ ] **Gallery Grid System**
  - 3-column CSS Grid on desktop
  - Responsive breakpoints (2-col tablet, 1-col mobile)  
  - Square aspect ratio thumbnails (1:1)
  - Proper spacing and gaps

- [ ] **Tool Card Design**
  - Square thumbnail containers
  - Tool name overlay/caption
  - Creator attribution
  - Hover effects (scale, shadow, transitions)

### Phase 2: Enhanced Interactions
- [ ] **Thumbnail Hover Effects**
  - Smooth scale transformations
  - Shadow/glow effects
  - Maintain accessibility
  - Touch-friendly for mobile

- [ ] **Responsive Design**
  - Mobile-optimized thumbnail sizes
  - Touch interactions
  - Proper breakpoint behavior
  - Performance on mobile devices

### Phase 3: Integration & Polish
- [ ] **Dynamic Content**
  - Connect to tool data structure
  - Handle loading states
  - Error handling for missing thumbnails
  - Implement click-to-navigate

- [ ] **Performance & Accessibility**  
  - Image optimization
  - Lazy loading
  - Alt text and keyboard navigation
  - Core Web Vitals optimization

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