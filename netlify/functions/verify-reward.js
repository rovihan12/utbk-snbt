const crypto = require('crypto');

exports.handler = async (event, context) => {
  console.log('🚀 Function called! Path:', event.path);
  
  // Hanya terima POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }
  
  try {
    const data = JSON.parse(event.body);
    console.log('📦 Data received:', data);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        verified: true,
        message: 'Server is working!',
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message })
    };
  }
};
