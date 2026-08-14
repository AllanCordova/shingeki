<?php

namespace App\Services\Remediation\Source;

class SourceFileNormalizer
{
    public static function normalize(?string $path): ?string
    {
        if ($path === null) {
            return null;
        }

        $path = trim(str_replace('\\', '/', $path));

        if ($path === '') {
            return null;
        }

        if (preg_match('#/tmp/shingeki-sast-[^/]+/repo/(.+)$#', $path, $matches) === 1) {
            return ltrim($matches[1], '/');
        }

        if (preg_match('#/lab/vulnerable-target/(.+)$#', $path, $matches) === 1) {
            return ltrim($matches[1], '/');
        }

        if (preg_match('#/shingeki-vulnerable-target/(.+)$#', $path, $matches) === 1) {
            return ltrim($matches[1], '/');
        }

        return ltrim($path, '/');
    }

    /**
     * @return array{file: string, start_line: int, end_line: int|null}|null
     */
    public static function locationFromResult(
        ?string $sourceFile,
        ?int $startLine,
        ?int $endLine,
        ?string $vulnerableRoute,
    ): ?array {
        $file = self::normalize($sourceFile);
        $line = $startLine;
        $end = $endLine;

        if ($file === null || $line === null || $line < 1) {
            $parsed = self::parseRoute($vulnerableRoute);

            if ($parsed === null) {
                return null;
            }

            $file ??= $parsed['file'];
            $line ??= $parsed['line'];
            $end ??= $parsed['line'];
        }

        if ($file === null || $line === null || $line < 1) {
            return null;
        }

        return [
            'file' => $file,
            'start_line' => $line,
            'end_line' => ($end !== null && $end >= $line) ? $end : null,
        ];
    }

    public static function formatLabel(?array $location): ?string
    {
        if ($location === null) {
            return null;
        }

        $file = $location['file'] ?? null;
        $start = $location['start_line'] ?? null;
        $end = $location['end_line'] ?? null;

        if (! is_string($file) || $file === '' || ! is_int($start) || $start < 1) {
            return null;
        }

        if (is_int($end) && $end > $start) {
            return "{$file}:{$start}-{$end}";
        }

        return "{$file}:{$start}";
    }

    /**
     * @return array{
     *   source_file: string|null,
     *   start_line: int|null,
     *   end_line: int|null,
     *   source_location: array{file: string, start_line: int, end_line: int|null, label: string}|null
     * }
     */
    public static function formatForApi(
        ?string $sourceFile,
        ?int $startLine,
        ?int $endLine,
        ?string $vulnerableRoute,
    ): array {
        $sourceLocation = self::locationFromResult($sourceFile, $startLine, $endLine, $vulnerableRoute);
        $normalizedFile = self::normalize($sourceFile) ?? ($sourceLocation['file'] ?? null);

        return [
            'source_file' => $normalizedFile,
            'start_line' => $sourceLocation['start_line'] ?? $startLine,
            'end_line' => $sourceLocation['end_line'] ?? $endLine,
            'source_location' => $sourceLocation !== null ? [
                'file' => $sourceLocation['file'],
                'start_line' => $sourceLocation['start_line'],
                'end_line' => $sourceLocation['end_line'],
                'label' => self::formatLabel($sourceLocation),
            ] : null,
        ];
    }

    /**
     * @return array{file: string, line: int}|null
     */
    private static function parseRoute(?string $vulnerableRoute): ?array
    {
        if ($vulnerableRoute === null || $vulnerableRoute === '') {
            return null;
        }

        if (str_starts_with($vulnerableRoute, 'http://') || str_starts_with($vulnerableRoute, 'https://')) {
            return null;
        }

        if (! str_contains($vulnerableRoute, ':')) {
            return null;
        }

        $position = strrpos($vulnerableRoute, ':');
        $file = substr($vulnerableRoute, 0, $position);
        $line = substr($vulnerableRoute, $position + 1);

        if ($file === '' || ! ctype_digit($line)) {
            return null;
        }

        $normalizedFile = self::normalize($file);

        if ($normalizedFile === null) {
            return null;
        }

        return [
            'file' => $normalizedFile,
            'line' => (int) $line,
        ];
    }
}
