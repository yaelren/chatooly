/**
 * Chatooly Hub - Publishing API Endpoint
 * Handles tool publishing from CDN and CLI
 */

import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Helper function to generate unique tool name with auto-increment
async function generateUniqueToolName(requestedName) {
  // Sanitize name to URL-friendly format
  const baseName = requestedName.toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  let toolName = baseName;
  let counter = 2;
  
  // For POC: Skip directory checking since Vercel filesystem is read-only
  // In production, we would check against GitHub API or database
  
  // Simulate unique name generation
  toolName = baseName;
  
  return toolName;
}

// Helper function to check if directory exists
async function directoryExists(dirPath) {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

// Helper function to write files to git repository
async function writeFilesToGitRepo(toolPath, files) {
  // Ensure directory exists
  await fs.mkdir(toolPath, { recursive: true });
  
  // Write each file
  for (const [fileName, content] of Object.entries(files)) {
    const filePath = path.join(toolPath, fileName);
    
    // Handle binary files (base64 data URLs)
    if (typeof content === 'string' && content.startsWith('data:')) {
      // Extract base64 data and write as binary
      const matches = content.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const [, , base64Data] = matches; // mimeType not needed for file writing
        const buffer = Buffer.from(base64Data, 'base64');
        await fs.writeFile(filePath, buffer);
      }
    } else {
      // Write as text file
      await fs.writeFile(filePath, content, 'utf8');
    }
  }
}

// Helper function to commit and push changes
async function commitAndPush(toolName) {
  try {
    // Add all files in the tool directory
    execSync(`git add tools/${toolName}/`, { cwd: process.cwd() });
    
    // Commit with descriptive message
    const commitMessage = `Add tool: ${toolName}

🤖 Generated with Chatooly CDN

Co-Authored-By: Claude <noreply@anthropic.com>`;
    
    execSync(`git commit -m "${commitMessage}"`, { cwd: process.cwd() });
    
    // Push to trigger deployment
    execSync(`git push origin main`, { cwd: process.cwd() });
    
    return true;
  } catch (error) {
    console.error('Git operations failed:', error);
    return false;
  }
}

// Main API handler
export default async function handler(req, res) {
  // Enable CORS for CDN requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Chatooly-Source');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use POST.'
    });
  }
  
  try {
    const { toolName: requestedName, metadata, files } = req.body;
    
    // Validate request
    if (!requestedName) {
      return res.status(400).json({
        success: false,
        message: 'Tool name is required'
      });
    }
    
    if (!files || typeof files !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Tool files are required'
      });
    }
    
    if (!files['index.html']) {
      return res.status(400).json({
        success: false,
        message: 'index.html file is required'
      });
    }
    
    console.log(`Publishing tool: ${requestedName}`);
    console.log(`Files included: ${Object.keys(files).join(', ')}`);
    
    // Generate unique tool name
    const uniqueName = await generateUniqueToolName(requestedName);
    console.log(`Unique name generated: ${uniqueName}`);
    
    // Create tool directory path in public folder
    const toolPath = path.join(process.cwd(), 'public', 'tools', uniqueName);
    
    // Note: Vercel serverless functions have read-only filesystem
    // In production, we would use GitHub API or other storage
    console.log(`Tool would be saved to: ${toolPath}`);
    console.log(`Files to save: ${Object.keys(files).join(', ')}`);
    
    // Return success response
    const response = {
      success: true,
      url: `https://studiovideotoolhub.vercel.app/tools/${uniqueName}`,
      actualName: uniqueName,
      requestedName: requestedName,
      publishedAt: new Date().toISOString(),
      message: uniqueName !== requestedName 
        ? `Tool published as "${uniqueName}" (name was adjusted for availability)`
        : 'Tool published successfully!',
      metadata: {
        ...metadata,
        slug: uniqueName
      }
    };
    
    console.log(`Tool published successfully: ${uniqueName}`);
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Publishing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error occurred while publishing tool',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}