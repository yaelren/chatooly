# Software Requirements Specification: Chatooly

## 1. Introduction

### 1.1 Purpose
Chatooly is the central platform where design tools are published, hosted, discovered, and used. Tools are served directly at tools.chatooly.com/[toolname] for optimal performance and user experience.

### 1.2 Repository Information
- **Repository Name**: studio-video-tool-hub
- **Main Site URL**: studiovideotoolhub.com
- **Tools URL Pattern**: tools.studiovideotoolhub.com/[toolname]
- **Technologies**: Node.js, Next.js/Vercel, Enhanced CDN System
- **Hosting**: Vercel with subdomain routing

### 1.3 Platform Vision
Studio Video Tool Hub revolutionizes creative tool creation by providing:
- **Ultra-minimal templates** (10 lines of HTML)
- **Config-driven UI generation** (JSON-based tool definition)
- **Unified design system** (automatic styling via CDN)
- **Direct tool hosting** (native performance, no iframes)
- **Creator-first experience** (powerful analytics and publishing)

## 2. System Architecture

### 2.1 High-Level Architecture
```
┌─────────────────────────────────────────────────┐
│                  Frontend (Next.js)              │
├─────────────────────────────────────────────────┤
│                    API Layer                     │
├─────────────┬───────────┬──────────┬───────────┤
│    Auth     │  Storage  │   CMS    │ Analytics │
│ (Wix/Auth0) │   (S3)    │  (Wix)   │ (Custom)  │
└─────────────┴───────────┴──────────┴───────────┘
```

### 2.2 Component Structure
```
chatooly/
├── frontend/               # Next.js application
│   ├── pages/
│   │   ├── index.js       # Homepage/gallery
│   │   ├── create.js      # Creation guide
│   │   └── dashboard.js   # Creator dashboard
│   ├── components/
│   ├── styles/
│   └── public/
├── backend/               # API server
│   ├── routes/
│   │   ├── tools.js      # Tool CRUD operations
│   │   ├── publish.js    # Publishing endpoint
│   │   └── analytics.js  # Usage tracking
│   ├── middleware/
│   ├── services/
│   └── utils/
├── tools/                # Published tool files
│   ├── [toolname]/       # Each tool in its directory
│   │   ├── index.html
│   │   ├── tool.js
│   │   ├── style.css
│   │   └── assets/
│   └── ...
├── database/             # Database schemas
│   ├── models/
│   └── migrations/
└── infrastructure/       # Deployment configs
    ├── vercel.json
    ├── nginx.conf        # Subdomain routing
    └── docker/
```

## 3. Functional Requirements

### 3.1 Public Features

#### FR-HUB-1: Tool Gallery
```javascript
// Homepage displays tool grid
{
  featured: Tool[],        // Curated tools
  recent: Tool[],         // Latest additions
  popular: Tool[],        // Most used
  categories: Category[]   // Browse by type
}
```

#### FR-HUB-2: Tool Discovery
- Search by name, description, tags
- Filter by category, author, date
- Sort by popularity, recent, trending
- Tag-based recommendations

#### FR-HUB-3: Tool Pages
Tools are served directly at their own URLs:
- Direct access at tools.chatooly.com/[toolname]
- No iframe embedding - native performance
- Clean URLs for sharing
- Full browser capabilities
- SEO-friendly structure
- Analytics tracking via CDN

#### FR-HUB-4: Tool Execution
- Tools run natively in the browser
- Full access to browser APIs
- No sandboxing limitations
- Optimal performance
- Direct asset loading
- CDN integration for shared features

### 3.2 Creator Features

#### FR-HUB-5: Publishing API
```javascript
POST /api/tools/publish
{
  config: Object,      // chatooly.config.json
  files: {
    'index.html': String,
    'tool.js': String,
    'style.css': String,
    'assets/': Binary[]
  }
}

Response:
{
  success: Boolean,
  toolId: String,
  url: String,
  message: String
}
```

#### FR-HUB-6: Creator Dashboard
- View all published tools
- Usage analytics
- Edit tool metadata
- Manage versions
- Download statistics

#### FR-HUB-7: Authentication
- GitHub OAuth integration
- Optional email/password
- API key generation
- Rate limiting

### 3.3 Administrative Features

#### FR-HUB-8: Content Moderation
- Tool approval queue
- Report system
- Automated scanning
- Manual review tools

#### FR-HUB-9: Analytics Dashboard
- Platform-wide statistics
- Tool performance metrics
- User engagement data
- Revenue tracking (future)

## 4. Database Schema

### 4.1 Tools Collection
```javascript
{
  _id: ObjectId,
  slug: String,              // URL-friendly name (used in tools.chatooly.com/[slug])
  name: String,
  description: String,
  author: {
    userId: ObjectId,
    name: String,
    avatar: String
  },
  config: Object,           // chatooly.config.json
  files: {
    path: String,           // Local path in tools/ directory
    size: Number,
    lastModified: Date
  },
  metadata: {
    category: String,
    tags: [String],
    version: String,
    license: String,
    exportFormats: [String]
  },
  stats: {
    views: Number,
    uses: Number,
    exports: Number,
    likes: Number
  },
  url: String,              // Full URL: tools.chatooly.com/[slug]
  status: String,           // draft, published, archived
  featured: Boolean,
  createdAt: Date,
  updatedAt: Date,
  publishedAt: Date
}
```

### 4.2 Users Collection
```javascript
{
  _id: ObjectId,
  username: String,
  email: String,
  profile: {
    name: String,
    bio: String,
    avatar: String,
    website: String,
    social: {
      github: String,
      twitter: String
    }
  },
  auth: {
    provider: String,       // github, email
    providerId: String
  },
  apiKeys: [{
    key: String,
    name: String,
    createdAt: Date,
    lastUsed: Date
  }],
  stats: {
    toolsCreated: Number,
    totalViews: Number,
    totalExports: Number
  },
  createdAt: Date,
  lastLogin: Date
}
```

### 4.3 Analytics Collection
```javascript
{
  _id: ObjectId,
  toolId: ObjectId,
  event: String,           // view, use, export
  data: {
    format: String,        // for exports
    duration: Number,      // for usage
    referrer: String
  },
  user: {
    ip: String,           // hashed
    country: String,
    device: String
  },
  timestamp: Date
}
```

## 5. API Specifications

### 5.1 Public Endpoints

#### GET /api/tools
Query parameters:
- `page`: number (default: 1)
- `limit`: number (default: 20)
- `sort`: string (popular|recent|trending)
- `category`: string
- `search`: string

Response:
```json
{
  "tools": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 8
  }
}
```

#### GET /api/tools/:id
Get individual tool data

#### POST /api/tools/:id/stats
Track tool usage

### 5.2 Authenticated Endpoints

#### POST /api/tools/publish
Publish new tool (requires API key)

#### PUT /api/tools/:id
Update tool metadata

#### DELETE /api/tools/:id
Archive/delete tool

#### GET /api/dashboard
Get creator statistics

### 5.3 Webhook Endpoints

#### POST /api/webhooks/github
GitHub integration for auto-publishing

## 6. User Interface Design

### 6.1 Homepage Layout
```
┌─────────────────────────────────────┐
│          Chatooly Header            │
├─────────────────────────────────────┤
│                                     │
│      Create Amazing Design Tools    │
│         with AI Assistance          │
│                                     │
│  [Browse Tools]  [Create a Tool]    │
│                                     │
├─────────────────────────────────────┤
│  Featured Tools                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │     │ │     │ │     │ │     │  │
│  └─────┘ └─────┘ └─────┘ └─────┘  │
├─────────────────────────────────────┤
│  Browse by Category                 │
│  [Animation] [Color] [Typography]   │
├─────────────────────────────────────┤
│  Recent Tools                       │
│  • Tool 1 by @creator              │
│  • Tool 2 by @creator              │
└─────────────────────────────────────┘
```

### 6.2 Tool Page Direct Access
```
User visits: tools.chatooly.com/gradient-animator

Server:
1. Checks if tool exists in database
2. Serves tool files directly from tools/gradient-animator/
3. Injects analytics tracking
4. Tool runs natively in browser

Benefits:
- Fast loading
- SEO friendly
- Clean URLs for sharing
- Full browser capabilities
- No iframe limitations
```

## 7. Security Requirements

### 7.1 Tool Security
- Input validation on upload
- Content Security Policy headers
- File type restrictions
- Code scanning for malicious patterns
- Resource usage monitoring
- Regular security audits

### 7.2 Upload Security
- File type validation
- Virus scanning
- Code analysis for malicious patterns
- Size limits (10MB per tool)

### 7.3 API Security
- Rate limiting (100 requests/hour)
- API key authentication
- CORS configuration
- Input validation

### 7.4 User Privacy
- GDPR compliance
- Anonymous usage tracking
- Secure password storage
- Data encryption

## 8. Performance Requirements

### 8.1 Response Times
- Homepage load: <2s
- Tool page load: <3s
- API responses: <200ms
- Search results: <500ms

### 8.2 Scalability
- Support 10,000+ tools
- Handle 100,000+ daily users
- 1M+ API calls/day
- Auto-scaling infrastructure

### 8.3 Availability
- 99.9% uptime SLA
- CDN for static assets
- Database replication
- Automated backups

## 9. Integration Requirements

### 9.1 Wix Headless CMS
```javascript
// Wix configuration
{
  siteId: process.env.WIX_SITE_ID,
  apiKey: process.env.WIX_API_KEY,
  collections: {
    tools: 'tools',
    users: 'members',
    analytics: 'analytics'
  }
}
```

### 9.2 Storage Integration
- AWS S3 or Cloudflare R2
- Tool files storage
- Asset optimization
- CDN distribution

### 9.3 Analytics Services
- Google Analytics
- Custom analytics engine
- Real-time dashboards
- Export capabilities

## 10. Deployment

### 10.1 Infrastructure
```yaml
# vercel.json
{
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/next"
    },
    {
      "src": "backend/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "backend/index.js" },
    { "src": "/(.*)", "dest": "frontend/$1" }
  ]
}

# Subdomain Configuration
# tools.chatooly.com → serves from /tools directory
# chatooly.com → main platform
```

### 10.2 Environment Variables
```
NODE_ENV=production
DATABASE_URL=
WIX_SITE_ID=
WIX_API_KEY=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SESSION_SECRET=
```

### 10.3 CI/CD Pipeline
1. GitHub Actions for testing
2. Automated deployment on merge
3. Preview deployments for PRs
4. Rollback capabilities

## 11. Monitoring & Maintenance

### 11.1 Monitoring
- Uptime monitoring
- Error tracking (Sentry)
- Performance monitoring
- User analytics

### 11.2 Maintenance Tasks
- Database cleanup
- Cache invalidation
- Security updates
- Performance optimization

### 11.3 Backup Strategy
- Daily database backups
- Tool files versioning
- Disaster recovery plan
- Data retention policy

## 12. Future Enhancements

### 12.1 Phase 2 Features
- Tool versioning system
- Collaborative editing
- Premium tool marketplace
- API for external embedding

### 12.2 Phase 3 Features
- Mobile app
- Desktop tool creator
- AI-powered tool generation
- Revenue sharing program

### 12.3 Long-term Vision
- Plugin ecosystem
- White-label solutions
- Enterprise features
- Global CDN expansion