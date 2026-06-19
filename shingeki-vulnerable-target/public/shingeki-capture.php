<?php

declare(strict_types=1);

require_once __DIR__.'/../includes/layout.php';

$ticket = $_GET['ticket'] ?? '';
$apiBase = getenv('SHINGEKI_API_BASE_URL') ?: 'http://host.docker.internal:8000/api';
$message = null;
$error = null;

if ($ticket === '') {
    $error = 'Missing capture ticket.';
} else {
    $cookieHeader = $_SERVER['HTTP_COOKIE'] ?? '';

    if ($cookieHeader === '') {
        $error = 'No session cookie found. Log in on the target first.';
    } else {
        $payload = json_encode(['cookie' => $cookieHeader], JSON_THROW_ON_ERROR);

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => 10,
            ],
        ]);

        $response = @file_get_contents(
            rtrim($apiBase, '/').'/target-session/capture/'.rawurlencode($ticket),
            false,
            $context,
        );

        if ($response === false) {
            $error = 'Failed to send session to Shingeki API.';
        } else {
            $decoded = json_decode($response, true);
            if (! is_array($decoded) || ! ($decoded['connected'] ?? false)) {
                $error = is_array($decoded) ? ($decoded['message'] ?? 'Capture rejected.') : 'Capture rejected.';
            } else {
                $message = 'Session connected. You can close this window.';
            }
        }
    }
}

renderHeader('Shingeki capture');

if ($message !== null) {
    echo '<p style="color:green;">'.htmlspecialchars($message, ENT_QUOTES).'</p>';
    echo '<script>
      if (window.opener) {
        window.opener.postMessage({ type: "shingeki-target-session-connected" }, "*");
      }
      setTimeout(function(){ window.close(); }, 1200);
    </script>';
}

if ($error !== null) {
    echo '<p style="color:red;">'.htmlspecialchars($error, ENT_QUOTES).'</p>';
}

renderFooter();
