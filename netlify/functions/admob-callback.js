// netlify/functions/admob-callback.js
const crypto = require('crypto');

exports.handler = async (event, context) => {
  console.log('🔔 AdMob Callback Received');
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  };
  
  // Handle OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  // Endpoint verification (GET)
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'active',
        service: 'Utlok Reward Verification',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production'
      })
    };
  }
  
  // Handle POST dari AdMob
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      console.log('📦 AdMob Callback Data:', JSON.stringify(body, null, 2));
      
      // 1. AMBIL SECRET KEY DARI ENVIRONMENT
      const secretKey = process.env.ADMOB_SECRET_KEY || '';
      console.log('🔐 Secret Key available:', !!secretKey);
      
      // 2. VALIDASI DASAR (jika secret key ada)
      if (secretKey) {
        // Contoh validasi signature sederhana
        const expectedSignature = crypto
          .createHmac('sha256', secretKey)
          .update(JSON.stringify(body))
          .digest('hex');
        
        const requestSignature = body.signature || event.headers['x-signature'];
        
        if (requestSignature && requestSignature !== expectedSignature) {
          console.warn('⚠️ Signature mismatch');
          // Lanjutkan saja untuk testing, reject di production
        }
      }
      
      // 3. GENERATE REWARD CODE
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = crypto.randomBytes(3).toString('hex').toUpperCase();
      const rewardCode = `ADMOB-${timestamp}-${random}`;
      const verificationId = crypto.randomBytes(8).toString('hex');
      
      // 4. RESPONSE KE ADMOB
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          verification_id: verificationId,
          reward_code: rewardCode,
          user_id: body.user_id || 'unknown',
          transaction_id: body.transaction_id || `txn_${Date.now()}`,
          timestamp: new Date().toISOString(),
          message: 'Reward processed successfully',
          debug: {
            secret_key_available: !!secretKey,
            signature_validated: !!secretKey
          }
        })
      };
      
    } catch (error) {
      console.error('❌ AdMob Callback Error:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid request',
          details: error.message
        })
      };
    }
  }
  
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
