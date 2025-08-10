/**
 * Chatooly Hub - Publishing API with GitHub Integration
 * Creates files directly in GitHub repository via API
 */

// GitHub configuration
const GITHUB_OWNER = 'yaelren'; // Your GitHub username
const GITHUB_REPO = 'chatooly'; // Your repository name
const GITHUB_BRANCH = 'main';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Set this in Vercel environment variables

// Create URL-safe tool slug
function createToolSlug(toolName) {
  return toolName.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')         // Spaces to hyphens
    .replace(/-+/g, '-')          // Multiple hyphens to single
    .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
}

// Create a file in GitHub via API
async function createGitHubFile(path, content, message) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  
  // Convert content to base64 (GitHub API requirement)
  const base64Content = Buffer.from(content).toString('base64');
  
  try {
    // First, check if file exists (for updates)
    const checkResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });
    
    let sha = null;
    if (checkResponse.ok) {
      const existingFile = await checkResponse.json();
      sha = existingFile.sha; // Need SHA for updates
    }
    
    // Create or update file
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        content: base64Content,
        branch: GITHUB_BRANCH,
        sha: sha // Include SHA if updating existing file
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub API error: ${error.message || response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to create file ${path}:`, error);
    throw error;
  }
}

// Create multiple files as a single commit (more efficient)
async function createMultipleFiles(toolSlug, files) {
  const results = [];
  const errors = [];
  
  // Create each file
  for (const [filename, content] of Object.entries(files)) {
    const filePath = `public/tools/${toolSlug}/${filename}`;
    
    try {
      console.log(`Creating file: ${filePath}`);
      const result = await createGitHubFile(
        filePath,
        content,
        `Add ${filename} for tool: ${toolSlug}`
      );
      results.push({ path: filePath, success: true });
    } catch (error) {
      console.error(`Failed to create ${filePath}:`, error);
      errors.push({ path: filePath, error: error.message });
    }
  }
  
  return { results, errors };
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
  
  // Check if GitHub token is configured
  if (!GITHUB_TOKEN) {
    console.error('GitHub token not configured');
    return res.status(500).json({
      success: false,
      message: 'GitHub integration not configured. Please set GITHUB_TOKEN environment variable.'
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
    console.log(`Files to publish: ${Object.keys(files).join(', ')}`);
    
    // Generate unique tool slug
    const toolSlug = createToolSlug(requestedName);
    console.log(`Tool slug: ${toolSlug}`);
    
    // Create files in GitHub
    console.log('Creating files in GitHub repository...');
    const { results, errors } = await createMultipleFiles(toolSlug, files);
    
    if (errors.length > 0) {
      console.error('Some files failed to upload:', errors);
      
      if (results.length === 0) {
        // All files failed
        return res.status(500).json({
          success: false,
          message: 'Failed to publish tool - no files were uploaded',
          errors: errors
        });
      }
      // Partial success
      console.warn('Tool published with some errors');
    }
    
    // Return success response
    const response = {
      success: true,
      url: `https://studiovideotoolhub.vercel.app/tools/${toolSlug}`,
      actualName: toolSlug,
      requestedName: requestedName,
      publishedAt: new Date().toISOString(),
      message: errors.length > 0 
        ? `Tool published with ${errors.length} errors. Check logs for details.`
        : 'Tool published successfully! It will be live in 1-2 minutes.',
      metadata: {
        ...metadata,
        slug: toolSlug,
        filesUploaded: results.length,
        filesFailed: errors.length,
        totalFiles: Object.keys(files).length
      },
      details: {
        uploaded: results.map(r => r.path),
        failed: errors.map(e => e.path)
      }
    };
    
    console.log(`Tool published: ${toolSlug} (${results.length}/${Object.keys(files).length} files)`);
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Publishing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
}