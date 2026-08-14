<?php

use App\Services\Remediation\CodePatchApplier;
use App\Services\Remediation\FindingLocation;

test('replaces matched snippet when present in file', function () {
    $applier = new CodePatchApplier;
    $content = "<?php\n\$query = \$_GET['q'];\necho \$query;\n";
    $location = new FindingLocation(
        file: 'search.php',
        startLine: 2,
        endLine: 3,
        matchedSnippet: "echo \$query;",
    );

    $patched = $applier->apply($content, $location, "echo htmlspecialchars(\$query, ENT_QUOTES, 'UTF-8');");

    expect($patched)->toContain('htmlspecialchars')
        ->and($patched)->not->toContain("echo \$query;");
});

test('replaces entire heredoc block when finding starts on echo heredoc line', function () {
    $applier = new CodePatchApplier;
    $content = implode("\n", [
        '<?php',
        '$ticket = $_GET["ticket"] ?? "";',
        'echo <<<HTML',
        '<script>var ticket = {$ticket};</script>',
        'HTML;',
        'renderFooter();',
    ]);
    $location = new FindingLocation(
        file: 'capture.php',
        startLine: 3,
        endLine: 3,
    );

    $patched = $applier->apply($content, $location, '?><script>safe</script><?php');

    expect($patched)->toContain('<script>safe</script>')
        ->and($patched)->not->toContain('<<<HTML')
        ->and($patched)->not->toContain('var ticket = {$ticket}');
});

test('replaces line range when snippet is not found', function () {
    $applier = new CodePatchApplier;
    $content = "line1\nline2\nline3\n";
    $location = new FindingLocation(
        file: 'file.txt',
        startLine: 2,
        endLine: 2,
    );

    $patched = $applier->apply($content, $location, 'fixed');

    expect($patched)->toBe("line1\nfixed\nline3\n");
});

test('expands sql fix to remove dangling query sink and rebuild user', function () {
    $applier = new CodePatchApplier;
    $content = implode("\n", [
        '<?php',
        '$email = $_POST["email"] ?? "";',
        '$sql = "SELECT * FROM users WHERE email = \'".$email."\'";',
        '$result = db()->query($sql);',
        '$user = $result ? $result->fetch(PDO::FETCH_ASSOC) : false;',
        'if ($user) { loginUser($user); }',
    ]);
    $location = new FindingLocation(
        file: 'login.php',
        startLine: 3,
        endLine: 3,
        matchedSnippet: '$sql = "SELECT * FROM users WHERE email = \'".$email."\'";',
    );
    $replacement = implode("\n", [
        "\$stmt = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');",
        '$stmt->execute([$email]);',
        '$user = $stmt->fetch(PDO::FETCH_ASSOC) ?: false;',
    ]);

    $patched = $applier->apply($content, $location, $replacement);

    expect($patched)->toContain('prepare(')
        ->and($patched)->not->toContain('$sql')
        ->and($patched)->not->toContain('db()->query')
        ->and($patched)->toContain('if ($user) { loginUser($user); }');
});

test('expands sql fix to remove dangling exec sink', function () {
    $applier = new CodePatchApplier;
    $content = implode("\n", [
        '<?php',
        '$email = $_POST["email"] ?? "";',
        '$sql = "UPDATE users SET email = \'".$email."\'";',
        'db()->exec($sql);',
        '$message = "ok";',
    ]);
    $location = new FindingLocation(
        file: 'profile.php',
        startLine: 3,
        endLine: 3,
        matchedSnippet: '$sql = "UPDATE users SET email = \'".$email."\'";',
    );
    $replacement = implode("\n", [
        "\$stmt = db()->prepare('UPDATE users SET email = :email');",
        "\$stmt->execute(['email' => \$email]);",
    ]);

    $patched = $applier->apply($content, $location, $replacement);

    expect($patched)->toContain('prepare(')
        ->and($patched)->not->toContain('$sql')
        ->and($patched)->not->toContain('db()->exec')
        ->and($patched)->toContain('$message = "ok";');
});

test('does not expand when replacement drops a variable still needed later', function () {
    $applier = new CodePatchApplier;
    $content = implode("\n", [
        '<?php',
        '$sql = "SELECT 1";',
        '$result = db()->query($sql);',
        '$user = $result->fetch();',
        'render($user);',
    ]);
    $location = new FindingLocation(
        file: 'x.php',
        startLine: 2,
        endLine: 2,
        matchedSnippet: '$sql = "SELECT 1";',
    );
    // Replacement forgets to rebuild $user, which is used afterwards.
    $patched = $applier->apply($content, $location, "\$stmt = db()->prepare('SELECT 1');");

    // Falls back to replacing only the snippet line, leaving the dangling sink
    // so the service-level guard can skip the file instead of breaking it.
    expect($patched)->toContain('$result = db()->query($sql);');
});

test('counts occurrences ignoring line endings', function () {
    $applier = new CodePatchApplier;
    $content = "foo\r\nbar\nfoo\n";

    expect($applier->occurrences($content, 'foo'))->toBe(2)
        ->and($applier->occurrences($content, 'bar'))->toBe(1)
        ->and($applier->occurrences($content, 'missing'))->toBe(0)
        ->and($applier->occurrences($content, ''))->toBe(0);
});
