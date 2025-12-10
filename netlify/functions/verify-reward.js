const crypto = require('crypto');

exports.handler = async (event, context) => {
  console.log('🚀 Function called! Path:', event.path);
  
  // Enable CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  // Hanya terima POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        error: 'Method not allowed. Use POST.',
        code: 'METHOD_NOT_ALLOWED'
      })
    };
  }
  
  try {
    const data = JSON.parse(event.body || '{}');
    const rewardCode = data.rewardCode || '';
    
    console.log('📦 Verifying code:', rewardCode);
    
    // VALIDASI DASAR
    if (!rewardCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          verified: false,
          error: 'Reward code is required',
          code: 'MISSING_CODE'
        })
      };
    }
    
    if (rewardCode.length < 8 || rewardCode.length > 50) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          verified: false,
          error: 'Code must be 8-50 characters',
          code: 'INVALID_LENGTH'
        })
      };
    }
    
    // LOGIKA VERIFIKASI (DIPERBARUI DENGAN ADMOB SUPPORT)
    let verified = false;
    let details = '';
    let rewardType = 'standard';
    let rewardValue = 0;
    let expiresAt = null;
    
    // ====================== ADMOB REWARD CODE ======================
    if (rewardCode.startsWith('ADMOB-')) {
      console.log('🔍 Detected AdMob reward code');
      
      // Format: ADMOB-TIMESTAMP-RANDOM
      const parts = rewardCode.split('-');
      if (parts.length === 3 && parts[0] === 'ADMOB') {
        try {
          const timestamp = parseInt(parts[1], 36);
          const ageInHours = (Date.now() - timestamp) / (1000 * 60 * 60);
          
          if (ageInHours <= 720) { // Valid 30 hari (720 jam)
            verified = true;
            details = 'AdMob rewarded advertisement code';
            rewardType = 'admob';
            rewardValue = 50; // Default points for AdMob rewards
            expiresAt = new Date(timestamp + 30 * 24 * 60 * 60 * 1000).toISOString();
            
            console.log('✅ AdMob code valid, age:', ageInHours.toFixed(2), 'hours');
          } else {
            details = 'AdMob code expired (30 days limit)';
            console.log('❌ AdMob code expired, age:', ageInHours.toFixed(2), 'hours');
          }
        } catch (error) {
          details = 'Invalid AdMob code format';
          console.error('AdMob code parse error:', error);
        }
      } else {
        details = 'Invalid AdMob code format';
      }
    }
    
    // ====================== UTLOK PREMIUM CODE ======================
    else if (rewardCode.includes('UTLOK')) {
      const numbers = rewardCode.replace(/\D/g, '');
      if (numbers.length >= 3) {
        verified = true;
        details = 'Premium reward code detected';
        rewardType = 'premium';
        rewardValue = 100;
      }
    } 
    
    // ====================== TEST CODES ======================
    else if (rewardCode === 'TEST123456' || rewardCode === 'DEMO2024') {
      verified = true;
      details = 'Test code accepted';
      rewardType = 'test';
      rewardValue = 10;
    }
    
    // ====================== STANDARD CODE VALIDATION ======================
    else if (/^[A-Z0-9]{12}$/.test(rewardCode)) {
      const lastChar = rewardCode.charAt(rewardCode.length - 1);
      if (['A', 'B', 'C', '1', '2', '3'].includes(lastChar)) {
        verified = true;
        details = 'Standard reward code';
        rewardType = 'standard';
        rewardValue = 25;
      }
    }
    
    // ====================== GENERIC ALPHANUMERIC CODE ======================
    else if (/^[A-Z0-9]{8,20}$/.test(rewardCode)) {
      // Basic validation for generic codes
      verified = true;
      details = 'Generic reward code';
      rewardType = 'generic';
      rewardValue = 15;
    }
    
    // Generate verification ID
    const verificationId = crypto.randomBytes(8).toString('hex');
    
    // Set expiration if not set
    if (!expiresAt) {
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 hari default
    }
    
    // Log untuk analytics
    console.log(`📊 Analytics: Code=${rewardCode}, Verified=${verified}, Type=${rewardType}, Value=${rewardValue}`);
    
    // Response sukses
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        verified,
        message: verified ? '🎉 Reward verified successfully!' : '❌ Invalid reward code',
        details,
        reward: {
          code: rewardCode,
          type: rewardType,
          value: rewardValue,
          currency: 'points'
        },
        verification: {
          id: verificationId,
          timestamp: new Date().toISOString(),
          expires_at: expiresAt
        },
        metadata: {
          code_format: rewardCode.startsWith('ADMOB-') ? 'admob' : 'standard',
          length: rewardCode.length,
          environment: process.env.NODE_ENV || 'production'
        },
        next_steps: verified ? [
          'Your reward points have been credited',
          'Use points in the rewards store',
          'Share with friends for bonus points'
        ] : [
          'Check the code for typos',
          'Ensure the code hasn\'t expired',
          'Contact support if issue persists'
        ],
        support: {
          email: 'support@utlok.com',
          website: 'https://utlok.com/support'
        }
      })
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString()
      })
    };
  }
};
