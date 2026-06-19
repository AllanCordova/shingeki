<?php

declare(strict_types=1);

require_once __DIR__.'/../includes/layout.php';
require_once __DIR__.'/../includes/auth.php';

$user = requireAuth();

renderHeader('Profile');

$message = null;
$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $bio = $_POST['bio'] ?? '';

    try {
        // Intentionally vulnerable: unsanitized email in UPDATE (SQL injection).
        $sql = "UPDATE users SET email = '".$email."', bio = '".$bio."' WHERE id = ".(int) $user['id'];
        db()->exec($sql);

        $stmt = db()->prepare('SELECT id, email, bio FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => (int) $user['id']]);
        $updated = $stmt->fetch(PDO::FETCH_ASSOC) ?: $user;

        loginUser($updated);
        $user = $updated;
        $message = 'Profile updated.';
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
<form method="post" action="/profile.php">
    <label>
        Email
        <input type="text" name="email" value="<?= htmlspecialchars((string) $user['email'], ENT_QUOTES) ?>">
    </label>
    <label>
        Bio
        <textarea name="bio" rows="4"><?= htmlspecialchars((string) ($user['bio'] ?? ''), ENT_QUOTES) ?></textarea>
    </label>
    <button type="submit">Save profile</button>
</form>
<?php

renderFooter();
