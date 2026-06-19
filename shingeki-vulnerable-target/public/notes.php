<?php

declare(strict_types=1);

require_once __DIR__.'/../includes/layout.php';
require_once __DIR__.'/../includes/auth.php';
require_once __DIR__.'/../includes/db.php';

$user = requireAuth();

renderHeader('Notes');

$query = $_GET['q'] ?? '';

if ($query !== '') {
    // Intentionally vulnerable: reflected XSS without encoding.
    echo '<p>Notes matching: '.$query.'</p>';
} else {
    echo '<p>Search your saved notes.</p>';
}

$stmt = db()->prepare('SELECT body FROM notes WHERE user_id = :user_id ORDER BY id ASC');
$stmt->execute(['user_id' => (int) $user['id']]);
$notes = $stmt->fetchAll(PDO::FETCH_ASSOC);

if ($notes !== []) {
    echo '<ul>';
    foreach ($notes as $note) {
        echo '<li>'.htmlspecialchars((string) $note['body'], ENT_QUOTES).'</li>';
    }
    echo '</ul>';
}

?>
<form method="get" action="/notes.php">
    <label>
        Query
        <input type="text" name="q" value="">
    </label>
    <button type="submit">Search notes</button>
</form>
<?php

renderFooter();
