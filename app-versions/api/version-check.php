<?php
// version-check.php untuk V28
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-cache, no-store, must-revalidate');

error_reporting(0);

// Get parameters from request
$current_version = $_GET['version'] ?? '';
$package_name = $_GET['package'] ?? '';
$platform = $_GET['platform'] ?? 'android';

// Log the request
error_log("Version Check - Version: $current_version, Package: $package_name, Platform: $platform");

// Validate parameters
if (empty($current_version)) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Missing version parameter"
    ]);
    exit;
}

// ✅ VERSI TERBARU: UPDATE KE V28
$latest_version = "V28";  // 🔴 UPDATE: DARI "V27" KE "V28"
$min_required_version = "V26";  // 🔴 UPDATE: DARI "V25" KE "V26"
$blocked_versions = ["V27"];    // 🔴 TAMBAHKAN: BLOKIR V27 (karena ada bug kritis)

// Initialize response variables
$update_required = false;
$update_type = "none";
$message = "";

// Custom version comparison function
function compareVersions($ver1, $ver2) {
    // Normalize version strings
    $v1 = strtolower(preg_replace('/[^0-9]/', '', $ver1));
    $v2 = strtolower(preg_replace('/[^0-9]/', '', $ver2));
    
    // Handle empty values
    if (empty($v1)) $v1 = "0";
    if (empty($v2)) $v2 = "0";
    
    return version_compare($v1, $v2);
}

// Versi development/beta check
function isDevelopmentVersion($version) {
    return stripos($version, 'dev') !== false || 
           stripos($version, 'beta') !== false ||
           stripos($version, 'alpha') !== false ||
           stripos($version, 'rc') !== false;
}

// Check if current version is blocked
if (in_array($current_version, $blocked_versions)) {
    // FORCE UPDATE untuk versi yang diblokir (V27)
    $update_required = true;
    $update_type = "force";
    $message = "🚫 **UPDATE WAJIB V28**\n\n" .
               "Versi V27 memiliki bug kritis pada sistem kuis. " .
               "Anda **harus** update ke versi V28 untuk melanjutkan penggunaan aplikasi.";
    
} else {
    // Development versions selalu soft update
    if (isDevelopmentVersion($current_version)) {
        $compare_current_latest = compareVersions($current_version, $latest_version);
        
        if ($compare_current_latest < 0) {
            $update_required = true;
            $update_type = "soft";
            $message = "🎉 Versi development baru $latest_version tersedia!";
        } else {
            $update_required = false;
            $update_type = "none";
            $message = "✅ Anda menggunakan versi development terbaru.";
        }
        
    } else {
        // Production version check dengan strategi khusus:
        // - V24 dan V25: Force update (tidak didukung lagi)
        // - V26: Force update (wajib update ke V28)
        // - V27: BLOCKED (sudah dihandle di atas)
        
        $compare_current_min = compareVersions($current_version, $min_required_version);
        $compare_current_latest = compareVersions($current_version, $latest_version);

        // VERSI V24 dan V25 (TIDAK DIDUKUNG LAGI - FORCE UPDATE)
        if ($current_version === "V24" || $current_version === "V25") {
            $update_required = true;
            $update_type = "force";
            $message = "🚫 **UPDATE WAJIB**\n\n" .
                       "Versi $current_version sudah tidak didukung karena perubahan besar dalam sistem.\n\n" .
                       "Anda **harus** update ke V28 untuk melanjutkan penggunaan aplikasi.";
            
        } elseif ($compare_current_min < 0) {
            // Current version is less than minimum required - FORCE UPDATE
            // Ini untuk versi dibawah V24 (V1-V23)
            $update_required = true;
            $update_type = "force";
            $message = "⚠️ **UPDATE WAJIB**\n\n" .
                       "Versi aplikasi Anda ($current_version) sudah tidak didukung.\n\n" .
                       "Silakan update ke versi $latest_version untuk terus menggunakan aplikasi " .
                       "dan mendapatkan fitur terbaru serta perbaikan keamanan.";
            
        } elseif ($compare_current_latest < 0) {
            // Current version is less than latest - FORCE UPDATE untuk V26
            // (V27 sudah dihandle sebagai blocked version di atas)
            $update_required = true;
            $update_type = "force";
            $message = "⚡ **UPDATE WAJIB V28**\n\n" .
                       "Versi baru $latest_version sudah tersedia dengan perbaikan bug kritis!\n\n" .
                       "Untuk melanjutkan penggunaan aplikasi, Anda **harus** update ke V28. " .
                       "Update ini penting untuk stabilitas dan pengalaman pengguna yang lebih baik.";
            
        } else {
            // Current version is up to date or newer - NO UPDATE
            $update_required = false;
            $update_type = "none";
            $message = "✅ **APLIKASI TERBARU**\n\n" .
                       "Anda sudah menggunakan versi $current_version (terbaru).\n\n" .
                       "Terima kasih telah menggunakan aplikasi Giat UTBK SNBT!";
        }
    }
}

// Prepare release notes for each version
$release_notes = [
    "V28" => [
        "🎯 **MAJOR UPDATE V28**: Perbaikan sistem kuis dan performa",
        "🔧 **QUIZ SYSTEM FIX**: Perbaikan bug pada sistem kuis level",
        "⚡ **PERFORMANCE OPTIMIZATION**: Optimasi memori dan kecepatan",
        "📊 **DATA SYNC FIXED**: Perbaikan sinkronisasi data dengan Firebase",
        "🎮 **LEGENDA STATUS**: Sistem status LEGENDA UTBK yang diperbaiki",
        "🔔 **NOTIFICATION FIX**: Perbaikan sistem notifikasi",
        "📱 **UI IMPROVEMENTS**: Perbaikan antarmuka pengguna",
        "🐛 **BUG FIXES**: Perbaikan berbagai bug dan crash"
    ],
    "V27" => [
        "🌟 **GRAND UPDATE V27**: Perubahan besar dengan banyak fitur baru",
        "🎯 **ENHANCED NAVIGATION**: Sistem navigasi yang lebih intuitif",
        "📊 **IMPROVED ANALYTICS**: Analisis belajar yang lebih detail",
        "🔔 **SMART NOTIFICATIONS**: Notifikasi yang lebih cerdas dan relevan",
        "📱 **UI/UX REDESIGN**: Tampilan baru yang lebih modern",
        "⚡ **PERFORMANCE BOOST**: 50% lebih cepat dari versi sebelumnya",
        "💾 **MEMORY OPTIMIZATION**: Konsumsi memori lebih rendah",
        "🛡️ **SECURITY ENHANCEMENT**: Keamanan data yang ditingkatkan",
        "📚 **CONTENT UPDATE**: Materi SNBT 2025 yang diperbarui",
        "🎮 **INTERACTIVE QUIZ**: Kuis yang lebih interaktif"
    ],
    "V26" => [
        "🚀 **FORCE UPDATE SYSTEM**: Implementasi sistem pembaruan otomatis",
        "📱 **NAVIGASI FIXED**: Perbaikan navigasi menu Akun Saya",
        "🔧 **BUG FIXES**: Perbaikan berbagai crash dan error",
        "🎯 **PERFORMANCE**: Optimasi startup time 40% lebih cepat",
        "💾 **MEMORY OPTIMIZATION**: Penggunaan RAM lebih efisien",
        "📊 **DATA INTEGRITY**: Sistem penyimpanan data lebih aman",
        "🔔 **NOTIFICATION**: Sistem notifikasi diperbarui",
        "⚡ **STABILITY**: Aplikasi lebih stabil dan responsif"
    ],
    "V25" => [
        "🎉 Sistem notifikasi real-time dari GitHub",
        "📚 Update bank soal SNBT 2025 terbaru",
        "🚀 Optimasi performa dan perbaikan bug",
        "📱 UI/UX yang lebih responsif"
    ]
];

// Get release notes for current latest version
$current_release_notes = $release_notes[$latest_version] ?? [
    "Perbaikan bug dan optimasi performa",
    "Update konten terbaru",
    "Peningkatan keamanan"
];

// Build response
$response = [
    "status" => "success",
    "latest_version" => $latest_version,
    "update_type" => $update_type,
    "update_required" => $update_required,
    "message" => $message,
    "min_required_version" => $min_required_version,
    "blocked_versions" => $blocked_versions,
    "play_store_url" => "https://play.google.com/store/apps/details?id=" . urlencode($package_name),
    "release_notes" => $current_release_notes,
    "platform" => $platform,
    "timestamp" => date('Y-m-d H:i:s'),
    "app_name" => "Giat UTBK SNBT"
];

// Untuk development/beta versions, tambahkan info khusus
if (isDevelopmentVersion($current_version)) {
    $response["is_development"] = true;
    $response["warning"] = "Anda menggunakan versi development. Fitur mungkin tidak stabil.";
}

// Untuk V26, tambahkan catatan khusus
if ($current_version === "V26") {
    $response["note"] = "Versi ini masih didukung, namun wajib update ke V28 untuk perbaikan bug kritis.";
}

// Untuk V27 (blocked version), tambahkan warning khusus
if ($current_version === "V27") {
    $response["critical_warning"] = "VERSI INI DIBLOKIR karena bug kritis pada sistem kuis. Harap update segera!";
}

// Send JSON response
echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
?>
