<?php
// version-check.php untuk V29
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-cache');

error_reporting(0);

$current_version = $_GET['version'] ?? '';
if (empty($current_version)) {
    echo json_encode(["status" => "error", "message" => "Missing version"]);
    exit;
}

// ✅ VERSI TERBARU: V29
$latest_version = "V29";
$min_required_version = "V27";
$blocked_versions = ["V27", "V28"]; // 🔴 BLOKIR V27 & V28
$legacy_versions = ["V24", "V25", "V26"];

// Helper functions
function normalizeVersion($v) {
    preg_match('/\d+/', $v, $matches);
    return $matches[0] ?? "0";
}

function compareVersions($v1, $v2) {
    return version_compare(normalizeVersion($v1), normalizeVersion($v2));
}

// Determine update type
$update_type = "none";
$update_required = false;

// 🔴 V27 & V28: FORCE UPDATE
if (in_array($current_version, $blocked_versions)) {
    $update_type = "force";
    $update_required = true;
    $message = "🚫 **UPDATE WAJIB V29**\n\nVersi $current_version memiliki bug kritis. Update ke V29 untuk melanjutkan.";
}
// 🔴 V24-V26: FORCE UPDATE (legacy)
elseif (in_array($current_version, $legacy_versions)) {
    $update_type = "force";
    $update_required = true;
    $message = "🚫 **UPDATE WAJIB**\n\nVersi $current_version tidak didukung lagi. Update ke V29.";
}
// 🔴 Versi dibawah V24: FORCE UPDATE
elseif (compareVersions($current_version, $min_required_version) < 0) {
    $update_type = "force";
    $update_required = true;
    $message = "⚠️ **UPDATE WAJIB**\n\nVersi $current_version tidak didukung. Update ke V29.";
}
// 🔴 Ada versi lebih baru: SOFT UPDATE
elseif (compareVersions($current_version, $latest_version) < 0) {
    $update_type = "soft";
    $update_required = true;
    $message = "✨ **UPDATE TERSEDIA V29**\n\nVersi baru tersedia dengan fitur terbaru!";
}
// ✅ Sudah versi terbaru
else {
    $message = "✅ **APLIKASI TERBARU**\n\nAnda sudah menggunakan V29.";
}

// Release notes
$release_notes = [
    "V29" => [
        "🎯 **MAJOR UPDATE V29**: Memperbaiki sistem Bintang pada fitur Kuis",
        "⚡ **PERFORMANCE OPTIMIZATION**: Menambah Kategori Trigonometri",
        "📱 **QUALITY IMPROVEMENTS**: Menambah dan memperbaharui Soal",
        "📊 **UPDATE CHECK**: Cek pembaruan otomatis",
        "🐛 **CRITICAL BUG FIXES**: Perbaikan bug V27 dan V28"
    ]
];

$response = [
    "status" => "success",
    "latest_version" => $latest_version,
    "update_type" => $update_type,
    "update_required" => $update_required,
    "message" => $message,
    "min_required_version" => $min_required_version,
    "blocked_versions" => $blocked_versions,
    "play_store_url" => "https://play.google.com/store/apps/details?id=" . ($_GET['package'] ?? 'com.rovihan.utbksnbt'),
    "release_notes" => $release_notes[$latest_version] ?? [],
    "platform" => $_GET['platform'] ?? 'android',
    "timestamp" => date('Y-m-d H:i:s'),
    "app_name" => "Giat UTBK SNBT"
];

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
