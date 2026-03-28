<?php
declare(strict_types=1);

const CNRS26_SESSION_KEY = 'cnrs26_authenticated';

function cnrs26_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_set_cookie_params([
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function cnrs26_normalize_next_path($candidate): string
{
    $candidate = trim((string) ($candidate ?? ''));
    if ($candidate === '') {
        return '';
    }
    if ($candidate[0] !== '/') {
        return '';
    }
    if (strncmp($candidate, '//', 2) === 0) {
        return '';
    }
    if (strpos($candidate, '/../') !== false || substr($candidate, -3) === '/..') {
        return '';
    }
    return $candidate;
}

function cnrs26_portal_url(string $nextPath = ''): string
{
    $nextPath = cnrs26_normalize_next_path($nextPath);
    if ($nextPath === '') {
        return '/cnrs26';
    }
    return '/cnrs26?next=' . rawurlencode($nextPath);
}

function cnrs26_is_authenticated(): bool
{
    cnrs26_start_session();
    return ($_SESSION[CNRS26_SESSION_KEY] ?? false) === true;
}

function cnrs26_set_authenticated(bool $authenticated): void
{
    cnrs26_start_session();
    if ($authenticated) {
        session_regenerate_id(true);
        $_SESSION[CNRS26_SESSION_KEY] = true;
        return;
    }
    unset($_SESSION[CNRS26_SESSION_KEY]);
}

function cnrs26_credentials(): array
{
    $username = getenv('CNRS26_USERNAME');
    $password = getenv('CNRS26_PASSWORD');

    return [
        $username !== false && $username !== '' ? $username : 'durghy',
        $password !== false && $password !== '' ? $password : '1Team@w0rk',
    ];
}

function cnrs26_read_json_payload(): array
{
    $rawInput = file_get_contents('php://input');
    if (!is_string($rawInput) || trim($rawInput) === '') {
        return [];
    }

    $decoded = json_decode($rawInput, true);
    return is_array($decoded) ? $decoded : [];
}

function cnrs26_json_response(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=UTF-8');
    echo json_encode($payload);
    exit;
}

function cnrs26_redirect(string $location, int $statusCode = 302): void
{
    header('Location: ' . $location, true, $statusCode);
    exit;
}

function cnrs26_protected_resources(): array
{
    return [
        'teleprompter' => [
            'path' => __DIR__ . '/cnrs_teleprompter.html',
            'content_type' => 'text/html; charset=UTF-8',
            'filename' => 'cnrs_teleprompter.html',
        ],
        'presentation' => [
            'path' => __DIR__ . '/CNRS26_Salunkhe_short.pdf',
            'content_type' => 'application/pdf',
            'filename' => 'CNRS26_Salunkhe_short.pdf',
        ],
        'script' => [
            'path' => __DIR__ . '/cnrs_performance_script.md',
            'content_type' => 'text/markdown; charset=UTF-8',
            'filename' => 'cnrs_performance_script.md',
        ],
        'annotated_speech' => [
            'path' => __DIR__ . '/cnrs_presentation_speech_annotated.txt',
            'content_type' => 'text/plain; charset=UTF-8',
            'filename' => 'cnrs_presentation_speech_annotated.txt',
        ],
    ];
}

