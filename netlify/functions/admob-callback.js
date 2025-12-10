const crypto = require('crypto');

exports.handler = async (event, context) => {
  console.log('🔔 AdMob Callback Received');
  
  // Enable CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  
  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  // Endpoint verification untuk AdMob (GET)
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'active',
        service: 'Utlok Reward Verification',
        timestamp: new Date().toISOString(),
        message: 'AdMob callback endpoint is ready'
      })
    };
  }
  
  // Handle POST dari AdMob
  if (event.httpMethod === 'POST') {
    try {
      // Parse data dari AdMob
      const body = JSON.parse(event.body || '{}');
      
      console.log('📦 AdMob Callback Data:', JSON.stringify(body, null, 2));
      
      // Data yang dikirim AdMob biasanya berisi:
      // - user_id
      // - reward_type
      // - transaction_id
      // - signature (untuk verifikasi)
      // - timestamp
      
      const {
        user_id,
        reward_type = 'default',
        transaction_id,
        signature,
        timestamp,
        custom_data = {}
      } = body;
      
      // 1. VALIDASI SIGNATURE (jika AdMob mengirim)
      const isValidSignature = validateAdMobSignature(body);
      
      // 2. PROSES REWARD
      const rewardCode = generateRewardCode(user_id, transaction_id);
      const verificationId = crypto.randomBytes(8).toString('hex');
      
      // 3. SIMPAN KE DATABASE (jika ada)
      // await saveAdMobReward({ user_id, transaction_id, rewardCode, verificationId });
      
      // 4. RESPONSE KE ADMOB (format yang diharapkan AdMob)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          verification_id: verificationId,
          reward_code: rewardCode,
          user_id: user_id,
          transaction_id: transaction_id,
          timestamp: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 hari
          message: 'Reward processed successfully'
        })
      };
      
    } catch (error) {
      console.error('❌ AdMob Callback Error:', error);
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid request format',
          details: error.message
        })
      };
    }
  }
  
  // Method not allowed
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};

// Fungsi untuk validasi signature dari AdMob
function validateAdMobSignature(data) {
  // Implementasi validasi signature
  // Biasanya AdMob akan mengirim signature yang perlu divalidasi
  // dengan secret key Anda
  
  const secretKey = process.env.ADMOB_SECRET_KEY || '';
  
  if (!secretKey || !data.signature) {
    console.log('⚠️ No signature or secret key, skipping validation');
    return true; // Atau false tergantung kebijakan
  }
  
  try {
    // Contoh validasi HMAC SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(JSON.stringify(data))
      .digest('hex');
    
    return data.signature === expectedSignature;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

// Fungsi generate reward code untuk user
function generateRewardCode(userId, transactionId) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `UTLOK-${timestamp}-${random}`;
}
