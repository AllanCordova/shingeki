<?php

declare(strict_types=1);

require_once __DIR__.'/../includes/auth.php';

function safeNext(mixed $next): string
{
    if (! is_string($next) || $next === '') {
        return '/dashboard.php';
    }

    if (str_starts_with($next, 'http://') || str_starts_with($next, 'https://')) {
        $parts = parse_url($next);
        if ($parts !== false && isset($parts['path'])) {
            $next = $parts['path'].(isset($parts['query']) ? '?'.$parts['query'] : '');
        }
    }

    if (! str_starts_with($next, '/')) {
        return '/dashboard.php';
    }

    return $next;
}

$error = null;

if (isAuthenticated()) {
    header('Location: '.safeNext($_GET['next'] ?? '/dashboard.php'));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    try {
        // Intentionally vulnerable: string concatenation (SQL injection).
        $sql = "SELECT * FROM users WHERE email = '".$email."' AND password = '".$password."' LIMIT 1";
        $result = db()->query($sql);
        $user = $result ? $result->fetch(PDO::FETCH_ASSOC) : false;

        if ($user) {
            loginUser($user);

            header('Location: '.safeNext($_GET['next'] ?? $_POST['next'] ?? '/dashboard.php'));
            exit;
        }

        $error = 'Invalid credentials.';
    } catch (Throwable $exception) {
        $error = 'Database error: '.$exception->getMessage();
    }
}

require_once __DIR__.'/../includes/layout.php';

renderHeader('Login');

if ($error !== null) {
    echo '<p style="color:red;">'.htmlspecialchars($error, ENT_QUOTES).'</p>';
}

$next = $_GET['next'] ?? '';

?>
<p>Sign in to access protected lab routes (dashboard, profile, notes, secure files).</p>
<form method="post" action="/login.php<?= $next !== '' ? '?next='.htmlspecialchars(rawurlencode($next), ENT_QUOTES) : '' ?>">
    <?php if ($next !== ''): ?>
        <input type="hidden" name="next" value="<?= htmlspecialchars($next, ENT_QUOTES) ?>">
    <?php endif; ?>
    <label>
        Email
        <input type="text" name="email" value="guest@vuln.local">
    </label>
    <label>
        Password
        <input type="password" name="password" value="guest123">
    </label>
    <button type="submit">Sign in</button>
</form>
<p><small>Demo users: <code>guest@vuln.local</code> / <code>guest123</code>, <code>admin@vuln.local</code> / <code>super-secret</code></small></p>
<?php

renderFooter();
