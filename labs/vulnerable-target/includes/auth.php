<?php

declare(strict_types=1);

require_once __DIR__.'/db.php';

function ensureSessionStarted(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
}

function currentUser(): ?array
{
    ensureSessionStarted();

    $userId = $_SESSION['user_id'] ?? null;
    if (! is_int($userId) && ! is_string($userId)) {
        return null;
    }

    $stmt = db()->prepare('SELECT id, email, bio FROM users WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => (int) $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    return $user ?: null;
}

function loginUser(array $user): void
{
    ensureSessionStarted();

    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['user_email'] = (string) $user['email'];
}

function logoutUser(): void
{
    ensureSessionStarted();

    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            (bool) $params['secure'],
            (bool) $params['httponly'],
        );
    }

    session_destroy();
}

/**
 * @return array{id: int|string, email: string, bio: string|null}
 */
function requireAuth(): array
{
    $user = currentUser();
    if ($user === null) {
        $next = $_SERVER['REQUEST_URI'] ?? '/dashboard.php';
        header('Location: /login.php?next='.rawurlencode($next));
        exit;
    }

    return $user;
}

function isAuthenticated(): bool
{
    return currentUser() !== null;
}
