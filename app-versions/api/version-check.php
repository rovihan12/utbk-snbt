<?php
// version-check.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Enable error logging for debugging (optional)
error_reporting(0); // Disable in production

// Get parameters from request
$current_version = $_GET['version'] ?? '';
$package_name = $_GET['package'] ?? '';

// Log the request for debugging
error_log("Version Check - Version: $current_version, Package: $package_name");

// Validate parameters
if (empty($current_version) || empty($package_name)) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Missing parameters: version and package are required"
    ]);
    exit;
}

// Version configuration - UPDATE INI SETIAP RILIS BARU
$latest_version = "V20";
$min_required_version = "V19";

// Initialize response variables
$update_required = false;
$update_type = "none";
$message = "";

// Custom version comparison function for V-prefixed versions
function compareVersions($ver1, $ver2) {
    // Remove 'V' prefix and convert to lowercase for case-insensitive comparison
    $v1 = strtolower(str_replace('V', '', $ver1));
    $v2 = strtolower(str_replace('V', '', $ver2));
    
    return version_compare($v1, $v2);
}

// Determine update type based on version comparison
$compare_current_min = compareVersions($current_version, $min_required_version);
$compare_current_latest = compareVersions($current_version, $latest_version);

if ($compare_current_min < 0) {
    // Current version is less than minimum required - FORCE UPDATE
    $update_required = true;
    $update_type = "force";
    $message = "⚠️ Versi aplikasi Anda ($current_version) sudah tidak didukung. " .
               "Silakan update ke versi $latest_version untuk terus menggunakan aplikasi. " .
               "Versi minimum yang didukung adalah $min_required_version.";
    
} elseif ($compare_current_latest < 0) {
    // Current version is less than latest - SOFT UPDATE
    $update_required = true;
    $update_type = "soft";
    $message = "🎉 Versi baru $latest_version tersedia! " .
               "Update sekarang untuk mendapatkan fitur terbaru dan perbaikan performa.";
    
} else {
    // Current version is up to date - NO UPDATE
    $update_required = false;
    $update_type = "none";
    $message = "✅ Aplikasi Anda sudah menggunakan versi terbaru ($current_version). " .
               "Terima kasih telah menggunakan aplikasi kami!";
}

// Prepare release notes based on version
$release_notes = [
    "V20" => [
        "🚀 Performa aplikasi 2x lebih cepat",
        "🐛 Perbaikan bug crash pada beberapa device",
        "📚 Update materi UTBK 2024 terbaru",
        "🎨 UI/UX yang lebih modern dan intuitif",
        "💾 Optimisasi penggunaan memori dan storage"
    ],
    "V19" => [
        "🔧 Stabilisasi aplikasi",
        "📖 Penambahan bank soal baru",
        "⚡ Perbaikan loading time"
    ]
];

// Get release notes for current latest version
$current_release_notes = $release_notes[$latest_version] ?? [
    "Perbaikan bug dan peningkatan performa",
    "Update konten terbaru",
    "Optimisasi aplikasi"
];

// Build response
$response = [
    "status" => "success",
    "latest_version" => $latest_version,
    "update_type" => $update_type,
    "update_required" => $update_required,
    "message" => $message,
    "min_required_version" => $min_required_version,
    "play_store_url" => "https://play.google.com/store/apps/details?id=" . urlencode($package_name),
    "release_notes" => $current_release_notes,
    "debug_info" => [ // Optional: Remove in production
        "received_version" => $current_version,
        "received_package" => $package_name,
        "comparison_result" => [
            "current_vs_min" => $compare_current_min,
            "current_vs_latest" => $compare_current_latest
        ]
    ]
];

// Send JSON response
echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

// Log response for monitoring
error_log("Version Check Response: " . json_encode([
    'version' => $current_version,
    'update_required' => $update_required,
    'update_type' => $update_type
]));

?>
