/**
 * Chatooly Hub - Publishing API Endpoint (Working Version)
 * Simplified for Vercel deployment
 */

// Create URL-safe tool slug
function createToolSlug(toolName) {
  return toolName.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')         // Spaces to hyphens
    .replace(/-+/g, '-')          // Multiple hyphens to single
    .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
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
    
    // Generate unique tool name (simplified)
    const uniqueName = createToolSlug(requestedName);
    console.log(`Tool slug generated: ${uniqueName}`);
    
    // Log what would be saved (since Vercel filesystem is read-only)
    console.log(`Would save ${Object.keys(files).length} files:`);
    Object.keys(files).forEach(filename => {
      const size = typeof files[filename] === 'string' ? files[filename].length : 0;
      console.log(`  - ${filename} (${size} chars)`);
    });
    
    // Return success response
    const response = {
      success: true,
      url: `https://studiovideotoolhub.vercel.app/tools/${uniqueName}`,
      actualName: uniqueName,
      requestedName: requestedName,
      publishedAt: new Date().toISOString(),
      message: 'Tool processed successfully! (Note: Auto-deployment coming soon)',
      metadata: {
        ...metadata,
        slug: uniqueName,
        fileCount: Object.keys(files).length
      }
    };
    
    console.log(`Tool processed successfully: ${uniqueName}`);
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Publishing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
}