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
    
    if (rewardCode.length < 8 || rewardCode.length > 20) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          verified: false,
          error: 'Code must be 8-20 characters',
          code: 'INVALID_LENGTH'
        })
      };
    }
    
    // LOGIKA VERIFIKASI (CONTOH)
    let verified = false;
    let details = '';
    
    // Contoh: Kode harus mengandung UTLOK dan angka
    if (rewardCode.includes('UTLOK')) {
      const numbers = rewardCode.replace(/\D/g, '');
      if (numbers.length >= 3) {
        verified = true;
        details = 'Premium reward code detected';
      }
    } 
    // Contoh: Kode khusus untuk testing
    else if (rewardCode === 'TEST123456' || rewardCode === 'DEMO2024') {
      verified = true;
      details = 'Test code accepted';
    }
    // Contoh: Validasi checksum sederhana
    else if (/^[A-Z0-9]{12}$/.test(rewardCode)) {
      // Simulasi validasi checksum
      const lastChar = rewardCode.charAt(rewardCode.length - 1);
      if (['A', 'B', 'C', '1', '2', '3'].includes(lastChar)) {
        verified = true;
        details = 'Standard reward code';
      }
    }
    
    // Generate verification ID
    const verificationId = crypto.randomBytes(8).toString('hex');
    
    // Response sukses
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        verified,
        message: verified ? 'Reward verified successfully!' : 'Invalid reward code',
        details,
        rewardCode,
        verificationId,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 hari
        code: verified ? 'VERIFIED' : 'INVALID_CODE'
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
        code: 'SERVER_ERROR'
      })
    };
  }
};
