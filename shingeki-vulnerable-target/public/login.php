<?php

declare(strict_types=1);

require_once __DIR__.'/../includes/layout.php';
require_once __DIR__.'/../includes/db.php';

renderHeader('Login');

$message = null;
$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $password = $_POST['password'] ?? '';

    try {
        // Intentionally vulnerable: string concatenation (SQL injection).
        $sql = "SELECT * FROM users WHERE email = '".$email."' AND password = '".$password."' LIMIT 1";
        $result = db()->query($sql);
        $user = $result ? $result->fetch(PDO::FETCH_ASSOC) : false;

        if ($user) {
            $message = 'Welcome, '.htmlspecialchars((string) $user['email'], ENT_QUOTES).'!';
        } else {
            $error = 'Invalid credentials.';
        }
    } catch (Throwable $exception) {
        $error = 'Database error: '.$exception->getMessage();
    }
}

if ($message !== null) {
    echo '<p style="color:green;">'.htmlspecialchars($message, ENT_QUOTES).'</p>';
}

if ($error !== null) {
    echo '<p style="color:red;">'.htmlspecialchars($error, ENT_QUOTES).'</p>';
}

?>
<form method="post" action="/login.php">
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
<?php

renderFooter();
