export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Chatooly-Source');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  
  try {
    const body = req.body;
    
    return res.status(200).json({
      success: true,
      message: 'Publish API working!',
      url: `https://studiovideotoolhub.vercel.app/tools/${body.toolName || 'test'}`,
      actualName: body.toolName || 'test',
      requestedName: body.toolName || 'test',
      publishedAt: new Date().toISOString(),
      metadata: body.metadata || {}
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}