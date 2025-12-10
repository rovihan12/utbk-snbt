// Netlify Function untuk verifikasi reward iklan
const crypto = require('crypto');

exports.handler = async (event, context) => {
  console.log('📱 Permintaan verifikasi diterima');
  
  // Hanya terima POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ 
        error: 'Method not allowed. Gunakan POST.' 
      })
    };
  }

  try {
    // Parse data dari request
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Format JSON tidak valid',
          details: parseError.message 
        })
      };
    }
    
    console.log('📦 Data diterima:', JSON.stringify(data, null, 2));
    
    // Data yang HARUS ada dari AdMob
    const {
      user_id,           // ID user dari aplikasi Anda
      reward_amount = 1, // Jumlah reward (default 1 bintang)
      reward_item = 'Bintang', // Item reward
      signature,         // Signature dari AdMob
      timestamp,         // Waktu request
      custom_data        // Data custom dari aplikasi
    } = data;
    
    console.log('🔍 Detail request:');
    console.log('   User ID:', user_id);
    console.log('   Reward:', reward_amount, reward_item);
    console.log('   Timestamp:', timestamp);
    console.log('   Custom Data:', custom_data);
    
    // VALIDASI 1: Data wajib
    if (!user_id || !signature || !timestamp) {
      console.error('❌ Data tidak lengkap');
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          verified: false, 
          error: 'Data tidak lengkap. Wajib: user_id, signature, timestamp' 
        })
      };
    }
    
    // VALIDASI 2: Ambil secret key dari environment variables
    // Ini akan diatur nanti di Netlify Dashboard
    const SECRET_KEY = process.env.ADMOB_SECRET_KEY;
    
    if (!SECRET_KEY) {
      console.error('❌ Secret key tidak ditemukan');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          verified: false, 
          error: 'Server configuration error: No secret key' 
        })
      };
    }
    
    console.log('✅ Secret key tersedia');
    
    // VALIDASI 3: Buat string untuk verifikasi signature
    // Format harus sama dengan yang di-generate AdMob
    const verificationString = `${user_id}:${reward_amount}:${reward_item}:${timestamp}`;
    
    console.log('🔐 String verifikasi:', verificationString);
    
    // Generate expected signature (HMAC SHA256)
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(verificationString)
      .digest('hex');
    
    console.log('🔐 Signature yang diharapkan:', expectedSignature);
    console.log('🔐 Signature dari AdMob:', signature);
    
    // VALIDASI 4: Bandingkan signature
    if (signature !== expectedSignature) {
      console.error('❌ Signature tidak cocok');
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          verified: false, 
          message: 'Signature tidak valid',
          details: {
            received: signature,
            expected: expectedSignature
          }
        })
      };
    }
    
    console.log('✅ Signature valid!');
    
    // VALIDASI 5: Cek timestamp (maksimal 10 menit yang lalu)
    const currentTime = Date.now();
    const requestTime = parseInt(timestamp, 10);
    
    // Validasi angka
    if (isNaN(requestTime)) {
      console.error('❌ Timestamp tidak valid');
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          verified: false, 
          error: 'Timestamp tidak valid' 
        })
      };
    }
    
    // Cek jika request lebih dari 10 menit yang lalu
    const timeDifference = Math.abs(currentTime - requestTime);
    const TEN_MINUTES = 10 * 60 * 1000; // 10 menit dalam milidetik
    
    if (timeDifference > TEN_MINUTES) {
      console.error('❌ Request expired:', timeDifference, 'ms');
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          verified: false, 
          message: 'Request expired (lebih dari 10 menit)' 
        })
      };
    }
    
    console.log('✅ Timestamp valid');
    
    // 🎉 SEMUA VALIDASI BERHASIL! BERI REWARD
    
    // Di sini Anda bisa:
    // 1. Simpan ke database (Firebase/Firestore)
    // 2. Update user balance
    // 3. Log transaksi
    
    console.log('💰 Memberikan reward ke user:', user_id);
    console.log('   Jumlah:', reward_amount);
    console.log('   Item:', reward_item);
    
    // Contoh: Simpan ke log
    const transactionLog = {
      userId: user_id,
      rewardAmount: reward_amount,
      rewardItem: reward_item,
      timestamp: new Date().toISOString(),
      requestTime: new Date(requestTime).toISOString(),
      verified: true,
      serverTimestamp: Date.now()
    };
    
    console.log('📝 Log transaksi:', JSON.stringify(transactionLog, null, 2));
    
    // TODO: Tambahkan kode untuk update database user Anda di sini
    // Contoh jika menggunakan Firebase:
    // await updateUserReward(user_id, reward_amount);
    
    // Response sukses
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        verified: true,
        message: 'Reward berhasil diverifikasi',
        reward: {
          userId: user_id,
          amount: reward_amount,
          item: reward_item,
          transactionId: `TRX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        },
        timestamp: new Date().toISOString(),
        serverTime: currentTime,
        success: true
      })
    };
    
  } catch (error) {
    console.error('🔥 Error verifikasi:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        verified: false, 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};
