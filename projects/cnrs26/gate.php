<?php
declare(strict_types=1);

require __DIR__ . '/auth_common.php';

$resource = (string) ($_GET['resource'] ?? '');
$nextPath = cnrs26_normalize_next_path($_GET['next'] ?? '');
$resources = cnrs26_protected_resources();
$selected = $resources[$resource] ?? null;

if (!is_array($selected)) {
    http_response_code(404);
    echo 'Not found.';
    exit;
}

if (!cnrs26_is_authenticated()) {
    cnrs26_redirect(cnrs26_portal_url($nextPath));
}

$filePath = $selected['path'];
if (!is_file($filePath)) {
    http_response_code(404);
    echo 'Not found.';
    exit;
}

header('Content-Type: ' . $selected['content_type']);
header('Content-Length: ' . (string) filesize($filePath));
header('X-Content-Type-Options: nosniff');

if ($resource === 'presentation') {
    header('Content-Disposition: inline; filename="' . $selected['filename'] . '"');
}

readfile($filePath);
exit;
