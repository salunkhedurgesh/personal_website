<?php
declare(strict_types=1);

require __DIR__ . '/auth_common.php';

$action = $_GET['action'] ?? '';

if ($action === 'login') {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        cnrs26_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
    }

    $payload = cnrs26_read_json_payload();
    if ($payload === []) {
        $payload = $_POST;
    }

    $username = trim((string) ($payload['username'] ?? ''));
    $password = (string) ($payload['password'] ?? '');
    $nextPath = cnrs26_normalize_next_path($payload['next'] ?? '');
    [$expectedUsername, $expectedPassword] = cnrs26_credentials();

    if ($username === $expectedUsername && $password === $expectedPassword) {
        cnrs26_set_authenticated(true);
        cnrs26_json_response([
            'ok' => true,
            'redirect' => $nextPath !== '' ? $nextPath : '/cnrs26',
        ]);
    }

    cnrs26_set_authenticated(false);
    cnrs26_json_response([
        'ok' => false,
        'message' => 'Access denied. Please check the username and password.',
    ], 401);
}

if ($action === 'logout') {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        cnrs26_json_response(['ok' => false, 'message' => 'Method not allowed.'], 405);
    }

    cnrs26_set_authenticated(false);
    cnrs26_json_response(['ok' => true]);
}

if ($action === 'session') {
    cnrs26_json_response(['authenticated' => cnrs26_is_authenticated()]);
}

cnrs26_json_response(['ok' => false, 'message' => 'Not found.'], 404);
