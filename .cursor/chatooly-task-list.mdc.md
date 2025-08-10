---
description: Guidelines for creating and managing task lists for Chatooly development
globs: 
alwaysApply: false
---

# Chatooly Task List Management

Guidelines for tracking development progress across the three Chatooly repositories

## Task List Structure

1. Create task lists in each repository root:
   - `chatooly-cdn/TASKS.mdc` - CDN development tasks
   - `chatooly-template/TASKS.mdc` - Template development tasks
   - `chatooly/TASKS.mdc` - Hub platform tasks
   - `CHATOOLY_ROADMAP.mdc` - Overall project roadmap (in main project folder)

2. Structure each task file with these sections:
   ```markdown
   # [Repository Name] Implementation Tasks
   
   Current status and goals for this component.
   
   ## ✅ Completed Tasks
   
   - [x] Task that has been completed
   - [x] Another completed task with brief description
   
   ## 🚧 In Progress
   
   - [ ] Current task being worked on
     - Details about implementation
     - Any blockers or dependencies
   
   ## 📋 Planned Tasks
   
   - [ ] Next priority task
   - [ ] Future enhancement
   
   ## 📁 Implementation Details
   
   ### Architecture Decisions
   - Decision 1 and rationale
   - Decision 2 and rationale
   
   ### File Structure
   - `path/to/file.js` - Purpose and status
   - `path/to/another.js` - Purpose and status
   
   ### Dependencies
   - External libraries used
   - Integration points with other repos
   ```

## Task List Examples

### CDN Tasks Example
```markdown
# Chatooly CDN Implementation Tasks

Core JavaScript library providing shared functionality for all tools.

## ✅ Completed Tasks

- [x] Create basic core.js structure
- [x] Implement development mode detection
- [x] Add export button injection
- [x] Create basic styling system

## 🚧 In Progress

- [ ] PNG export functionality
  - Using html2canvas library
  - Need to handle cross-origin images
- [ ] SVG export functionality
  - Extract and clean SVG elements
  - Preserve animations

## 📋 Planned Tasks

- [ ] GIF export for animations
- [ ] Analytics integration
- [ ] Performance optimization
- [ ] CDN deployment automation
```

### Template Tasks Example
```markdown
# Chatooly Template Implementation Tasks

Starter kit for designers to create tools with AI assistance.

## ✅ Completed Tasks

- [x] Basic HTML/CSS/JS structure
- [x] Chatooly config file format
- [x] AI instruction template

## 🚧 In Progress

- [ ] Publishing script implementation
  - Package files for upload
  - Validate required files
  - API integration

## 📋 Planned Tasks

- [ ] Multiple template variations
- [ ] Example tool implementations
- [ ] Video tutorial creation
```

## Cross-Repository Coordination

1. **Integration Points Tracking**
   ```markdown
   ## Integration Dependencies
   
   ### CDN → Template
   - [ ] CDN script URL in template
   - [ ] Config format compatibility
   - [ ] Export format support
   
   ### Template → Hub
   - [ ] Publishing API contract
   - [ ] File upload format
   - [ ] Metadata validation
   ```

2. **Version Compatibility**
   ```markdown
   ## Version Compatibility Matrix
   
   | CDN Version | Template Version | Hub Version | Status |
   |-------------|------------------|-------------|--------|
   | 1.0.0       | 1.0.0           | 1.0.0       | ✅ Stable |
   | 1.1.0       | 1.0.0           | 1.0.0       | ⚠️ Testing |
   ```

## Task Prioritization

Use these labels for task priority:
- 🔴 **Critical** - Blocks other work
- 🟡 **High** - Core functionality
- 🟢 **Normal** - Standard features
- 🔵 **Low** - Nice to have

Example:
```markdown
## 📋 Planned Tasks

- [ ] 🔴 Fix CORS issues in CDN
- [ ] 🟡 Implement publishing API
- [ ] 🟢 Add tool categories
- [ ] 🔵 Dark mode support
```

## Progress Tracking

1. **Daily Updates**
   - Move tasks between sections
   - Add completion notes
   - Document any blockers

2. **Weekly Summary**
   ```markdown
   ## Week of [Date]
   
   ### Completed
   - CDN: Export functionality complete
   - Template: Publishing script ready
   - Hub: Basic API endpoints
   
   ### Blockers
   - Need Wix API credentials
   - CORS configuration issues
   
   ### Next Week Focus
   - Complete Hub gallery page
   - Test end-to-end flow
   ```

## AI Assistant Instructions

When working with Chatooly task lists:

1. Check relevant TASKS.mdc before starting work
2. Update task status after completing work
3. Add new tasks discovered during implementation
4. Document file paths and purposes
5. Note integration points between repositories
6. Flag dependencies or blockers
7. Keep task descriptions concise but clear
8. Use checkboxes for all tasks
9. Move completed tasks to appropriate section
10. Add implementation notes for complex tasks