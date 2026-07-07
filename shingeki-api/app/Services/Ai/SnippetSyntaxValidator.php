<?php

namespace App\Services\Ai;

use App\Models\Stack;

class SnippetSyntaxValidator
{
    public function validateForStack(Stack $stack, string $code): bool
    {
        $code = trim($code);

        if ($code === '') {
            return false;
        }

        return match ($stack->slug) {
            'vanilla_php', 'laravel' => $this->validatePhp($code),
            'express', 'react' => $this->validateJavaScript($code),
            default => true,
        };
    }

    public function validatePhpFile(string $content): bool
    {
        $content = trim($content);

        if ($content === '') {
            return false;
        }

        if (! str_starts_with($content, '<?php')) {
            $content = "<?php\n".$content;
        }

        $path = tempnam(sys_get_temp_dir(), 'shingeki-php-file-');

        if ($path === false) {
            return true;
        }

        file_put_contents($path, $content);
        exec('php -l '.escapeshellarg($path).' 2>&1', $output, $exitCode);
        @unlink($path);

        return $exitCode === 0;
    }

    private function validatePhp(string $code): bool
    {
        $wrapped = "<?php\n".$code;
        $path = tempnam(sys_get_temp_dir(), 'shingeki-php-');

        if ($path === false) {
            return true;
        }

        file_put_contents($path, $wrapped);
        exec('php -l '.escapeshellarg($path).' 2>&1', $output, $exitCode);
        @unlink($path);

        return $exitCode === 0;
    }

    private function validateJavaScript(string $code): bool
    {
        $path = tempnam(sys_get_temp_dir(), 'shingeki-js-');

        if ($path === false) {
            return true;
        }

        file_put_contents($path, $code);
        exec('node --check '.escapeshellarg($path).' 2>&1', $output, $exitCode);
        @unlink($path);

        return $exitCode === 0;
    }
}
