<?php

declare(strict_types=1);

require_once __DIR__.'/../includes/layout.php';

renderHeader('Search');

$query = $_GET['q'] ?? '';

if ($query !== '') {
    // Intentionally vulnerable: reflected XSS without encoding.
    echo '<p>Results for: '.$query.'</p>';
} else {
    echo '<p>Try searching for anything.</p>';
}

?>
<form method="get" action="/search.php">
    <label>
        Query
        <input type="text" name="q" value="">
    </label>
    <button type="submit">Search</button>
</form>
<?php

renderFooter();
