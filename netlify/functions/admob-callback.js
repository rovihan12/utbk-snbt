const crypto = require('crypto');

exports.handler = async (event, context) => {
  console.log('🔔 AdMob Callback Received - Path:', event.path);
  console.log('📡 Method:', event.httpMethod);
  console.log('🌐 IP:', event.headers['client-ip']);
  console.log('🕐 Time:', new Date().toISOString());
  
  // Enable CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Signature'
  };
  
  // ====================== HANDLE OPTIONS (CORS Preflight) ======================
  if (event.httpMethod === 'OPTIONS') {
    console.log('🔄 CORS Preflight request');
    return { 
      statusCode: 200, 
      headers, 
      body: '' 
    };
  }
  
  // ====================== HANDLE GET (Endpoint Verification) ======================
  if (event.httpMethod === 'GET') {
    console.log('📋 GET request - Endpoint verification');
    
    // Ambil secret key dari environment (tampilkan hanya info, bukan value)
    const secretKeyExists = !!process.env.ADMOB_SECRET_KEY;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'active',
        service: 'Utlok Reward Verification System',
        endpoint: 'AdMob Callback Handler',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        capabilities: {
          reward_generation: true,
          signature_verification: secretKeyExists,
          ip_filtering: true,
          logging: true
        },
        urls: {
          verification_form: 'https://utbk-reward-verification.netlify.app',
          api_docs: 'https://utbk-reward-verification.netlify.app/docs'
        },
        message: 'AdMob callback endpoint is ready and accepting POST requests'
      }, null, 2)
    };
  }
  
  // ====================== HANDLE POST (AdMob Reward Callback) ======================
  if (event.httpMethod === 'POST') {
    console.log('📨 POST request - Processing AdMob reward');
    
    try {
      // Parse request body
      const body = event.body ? JSON.parse(event.body) : {};
      
      // Log request data (sensitive info di-mask)
      const safeLogData = {
        ...body,
        signature: body.signature ? '[HIDDEN]' : undefined,
        user_id: body.user_id ? body.user_id.substring(0, 3) + '***' : undefined
      };
      
      console.log('📦 AdMob Request Data:', JSON.stringify(safeLogData, null, 2));
      console.log('📏 Body size:', event.body?.length || 0, 'bytes');
      console.log('👤 User Agent:', event.headers['user-agent'] || 'Unknown');
      
      // ====================== VALIDATION ======================
      const validationErrors = [];
      
      // 1. Validasi required fields
      const requiredFields = ['user_id', 'transaction_id'];
      for (const field of requiredFields) {
        if (!body[field]) {
          validationErrors.push(`Missing required field: ${field}`);
        }
      }
      
      // 2. Validasi timestamp (jika ada)
      if (body.timestamp) {
        const requestTime = new Date(body.timestamp);
        const currentTime = new Date();
        const timeDiff = Math.abs(currentTime - requestTime) / (1000 * 60); // dalam menit
        
        if (timeDiff > 10) { // Maksimal 10 menit
          validationErrors.push(`Timestamp too old: ${timeDiff.toFixed(2)} minutes`);
        }
      }
      
      // 3. Validasi signature menggunakan ADMOB_SECRET_KEY
      const secretKey = process.env.ADMOB_SECRET_KEY || '';
      let signatureValid = false;
      
      if (secretKey && body.signature) {
        try {
          // Generate expected signature
          const dataToSign = {
            user_id: body.user_id,
            transaction_id: body.transaction_id,
            timestamp: body.timestamp || new Date().toISOString(),
            reward_type: body.reward_type || 'video_reward'
          };
          
          const expectedSignature = crypto
            .createHmac('sha256', secretKey)
            .update(JSON.stringify(dataToSign))
            .digest('hex');
          
          signatureValid = body.signature === expectedSignature;
          
          if (!signatureValid) {
            validationErrors.push('Signature validation failed');
            console.warn('⚠️ Signature mismatch');
            console.log('Expected:', expectedSignature.substring(0, 10) + '...');
            console.log('Received:', body.signature.substring(0, 10) + '...');
          }
        } catch (sigError) {
          console.error('Signature validation error:', sigError);
          validationErrors.push('Signature validation error');
        }
      } else if (body.signature && !secretKey) {
        validationErrors.push('Signature provided but no ADMOB_SECRET_KEY set');
      }
      
      // 4. Validasi IP Address (Google Cloud IP ranges)
      const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'];
      const googleIPRanges = [
        '34.0.0.0/8',
        '35.0.0.0/8', 
        '104.154.0.0/15',
        '104.196.0.0/14',
        '107.178.192.0/18',
        '108.59.80.0/20',
        '130.211.0.0/16',
        '146.148.0.0/16'
      ];
      
      const isGoogleIP = checkIPInRange(clientIP, googleIPRanges);
      if (!isGoogleIP) {
        console.warn(`⚠️ Non-Google IP: ${clientIP}`);
        // Tidak dianggap error untuk testing, tapi log warning
      }
      
      // Jika ada validation errors, return error
      if (validationErrors.length > 0) {
        console.error('❌ Validation errors:', validationErrors);
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Validation failed',
            validation_errors: validationErrors,
            timestamp: new Date().toISOString()
          })
        };
      }
      
      // ====================== PROCESS REWARD ======================
      console.log('🎯 Processing reward for user:', body.user_id);
      
      // Generate unique reward code
      const timestampCode = Date.now().toString(36).toUpperCase();
      const randomCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      const rewardCode = `ADMOB-${timestampCode}-${randomCode}`;
      
      // Generate verification ID
      const verificationId = crypto.randomBytes(10).toString('hex');
      
      // Determine reward value based on type
      let rewardValue = 50; // Default
      if (body.reward_type === 'video_reward') rewardValue = 50;
      if (body.reward_type === 'survey_reward') rewardValue = 100;
      if (body.reward_type === 'offer_wall') rewardValue = body.reward_amount || 75;
      
      // Create expiration date (30 days from now)
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      // Log successful processing
      console.log('✅ Reward generated:', {
        reward_code: rewardCode,
        user_id: body.user_id,
        transaction_id: body.transaction_id,
        verification_id: verificationId,
        value: rewardValue
      });
      
      // ====================== PREPARE RESPONSE ======================
      const responseData = {
        success: true,
        verification: {
          id: verificationId,
          status: 'completed',
          timestamp: new Date().toISOString()
        },
        reward: {
          code: rewardCode,
          type: body.reward_type || 'video_reward',
          value: rewardValue,
          currency: 'points',
          expires_at: expiresAt.toISOString()
        },
        user: {
          id: body.user_id,
          transaction_id: body.transaction_id
        },
        metadata: {
          validation: {
            signature_valid: signatureValid,
            ip_valid: isGoogleIP,
            timestamp_valid: true
          },
          environment: process.env.NODE_ENV || 'production',
          version: '1.0.0'
        },
        instructions: {
          verify_url: 'https://utbk-reward-verification.netlify.app',
          support_email: 'support@utlok.com',
          expiry_days: 30
        }
      };
      
      console.log('📤 Sending response to AdMob');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(responseData, null, 2)
      };
      
    } catch (error) {
      console.error('❌ AdMob Callback Error:', error);
      console.error('Stack:', error.stack);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Internal server error',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          error_code: 'SERVER_ERROR',
          timestamp: new Date().toISOString(),
          support_contact: 'support@utlok.com'
        })
      };
    }
  }
  
  // ====================== METHOD NOT ALLOWED ======================
  console.warn('⚠️ Method not allowed:', event.httpMethod);
  
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({
      error: 'Method not allowed',
      allowed_methods: ['GET', 'POST', 'OPTIONS'],
      timestamp: new Date().toISOString()
    })
  };
};

// ====================== HELPER FUNCTIONS ======================

/**
 * Check if IP is in CIDR range
 * @param {string} ip - IP address to check
 * @param {string[]} ranges - Array of CIDR ranges
 * @returns {boolean}
 */
function checkIPInRange(ip, ranges) {
  if (!ip || !ranges || ranges.length === 0) return true; // Skip if no IP or ranges
  
  try {
    const ipToInt = (ip) => {
      return ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0) >>> 0;
    };
    
    const ipInt = ipToInt(ip);
    
    for (const range of ranges) {
      const [subnet, bits] = range.split('/');
      const subnetInt = ipToInt(subnet);
      const mask = ~((1 << (32 - parseInt(bits, 10))) - 1) >>> 0;
      
      if ((ipInt & mask) === (subnetInt & mask)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('IP range check error:', error);
    return true; // Return true on error to not block requests
  }
}

/**
 * Generate a secure random string
 * @param {number} length - Length of random string
 * @returns {string}
 */
function generateSecureRandom(length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
    .toUpperCase();
}
