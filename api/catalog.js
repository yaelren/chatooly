/**
 * Chatooly Hub - Catalog API
 * Returns a list of all available tools
 */

import fs from 'fs';
import path from 'path';

// Get the public directory path
const publicDir = path.join(process.cwd(), 'public');
const toolsDir = path.join(publicDir, 'tools');

// Helper to read tool metadata from chatooly-config.js
async function readToolMetadata(toolPath, toolSlug) {
    const metadata = {
        name: toolSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        slug: toolSlug,
        description: 'A Chatooly design tool',
        author: 'Anonymous',
        category: 'tools',
        version: '1.0.0',
        url: `/tools/${toolSlug}`,
        createdAt: new Date().toISOString()
    };

    try {
        // Try to read chatooly-config.js
        const configPath = path.join(toolPath, 'js', 'chatooly-config.js');
        if (fs.existsSync(configPath)) {
            const configContent = fs.readFileSync(configPath, 'utf8');
            
            // Basic parsing of config file
            const nameMatch = configContent.match(/name:\s*['"`]([^'"`]+)['"`]/);
            const descMatch = configContent.match(/description:\s*['"`]([^'"`]+)['"`]/);
            const authorMatch = configContent.match(/author:\s*['"`]([^'"`]+)['"`]/);
            const categoryMatch = configContent.match(/category:\s*['"`]([^'"`]+)['"`]/);
            
            if (nameMatch) metadata.name = nameMatch[1];
            if (descMatch) metadata.description = descMatch[1];
            if (authorMatch) metadata.author = authorMatch[1];
            if (categoryMatch) metadata.category = categoryMatch[1];
        }
        
        // Get file stats for creation time
        const stats = fs.statSync(path.join(toolPath, 'index.html'));
        metadata.createdAt = stats.birthtime.toISOString();
        
    } catch (error) {
        console.warn(`Could not read metadata for ${toolSlug}:`, error.message);
    }
    
    return metadata;
}

// Discover all tools in the tools directory
async function discoverTools() {
    const tools = [];
    
    try {
        if (!fs.existsSync(toolsDir)) {
            console.warn('Tools directory not found:', toolsDir);
            return tools;
        }
        
        const toolDirs = fs.readdirSync(toolsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name)
            .filter(name => !name.startsWith('.') && name !== 'staging' && name !== 'live');
        
        for (const toolSlug of toolDirs) {
            const toolPath = path.join(toolsDir, toolSlug);
            const indexPath = path.join(toolPath, 'index.html');
            
            // Only include tools that have an index.html file
            if (fs.existsSync(indexPath)) {
                const metadata = await readToolMetadata(toolPath, toolSlug);
                tools.push(metadata);
            }
        }
        
        // Sort by creation date (newest first)
        tools.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
    } catch (error) {
        console.error('Error discovering tools:', error);
    }
    
    return tools;
}

// Main API handler
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            message: 'Method not allowed. Use GET.'
        });
    }
    
    try {
        console.log('Discovering tools...');
        const tools = await discoverTools();
        
        console.log(`Found ${tools.length} tools:`, tools.map(t => t.slug));
        
        return res.status(200).json({
            success: true,
            tools: tools,
            count: tools.length,
            lastUpdated: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Catalog API error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message,
            tools: [],
            count: 0
        });
    }
}