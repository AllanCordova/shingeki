<?php

namespace App\Services\Remediation;

use InvalidArgumentException;

class CodePatchApplier
{
    public function apply(
        string $content,
        FindingLocation $location,
        string $replacement,
    ): string {
        $replacement = rtrim($replacement, "\r\n");

        $snippet = $location->matchedSnippet;

        // When the flagged snippet assigns a variable (e.g. `$sql = "..."`), the
        // vulnerability often spans into later sink lines (`db()->exec($sql)`).
        // Replace the whole tainted span so no dangling sink survives.
        if (is_string($snippet) && trim($snippet) !== '' && $this->assignsVariable($snippet)) {
            $span = $this->snippetLineSpan($content, $snippet);

            if ($span !== null) {
                [$start, $end] = $span;
                $end = $this->expandTaintedSpan($content, $start, $end, $replacement);

                return $this->replaceLineRange($content, $start, $end, $replacement);
            }
        }

        if (is_string($snippet) && trim($snippet) !== '') {
            $patched = $this->replaceSnippet($content, $snippet, $replacement);

            if ($patched !== null) {
                return $patched;
            }
        }

        return $this->replaceLineRange(
            $content,
            $location->startLine,
            $this->resolveEndLine($content, $location->startLine, $location->endLineOrStart()),
            $replacement,
        );
    }

    /**
     * Grow the replaced span forward to swallow lines that keep using a variable
     * assigned inside the original span (the SQL injection source → sink chain),
     * but only when the replacement re-defines every variable still needed later.
     */
    private function expandTaintedSpan(string $content, int $start, int $end, string $replacement): int
    {
        $lines = preg_split("/\r\n|\n|\r/", $this->normalizeLineEndings($content)) ?: [];
        $total = count($lines);

        $tainted = $this->assignedVariables(implode("\n", array_slice($lines, $start - 1, $end - $start + 1)));

        if ($tainted === []) {
            return $end;
        }

        $expandedEnd = $end;

        for ($index = $end + 1; $index <= $total; $index++) {
            $line = $lines[$index - 1] ?? '';

            if (trim($line) === '') {
                break;
            }

            $propagatesChain = $this->assignedVariables($line) !== []
                && $this->referencesAnyVariable($line, $tainted);
            $leftoverSink = $this->isSqlSinkLine($line)
                && $this->assignedVariables($line) === []
                && $this->referencesAnyVariable($line, $tainted);

            if (! $propagatesChain && ! $leftoverSink) {
                break;
            }

            $expandedEnd = $index;
            $tainted = array_values(array_unique([...$tainted, ...$this->assignedVariables($line)]));
        }

        if ($expandedEnd === $end) {
            return $end;
        }

        $exported = $this->exportedVariables($lines, $start, $expandedEnd, $total);

        foreach ($exported as $variable) {
            if (! $this->replacementAssigns($replacement, $variable)) {
                return $end;
            }
        }

        return $expandedEnd;
    }

    /**
     * Variables assigned within lines [start, end] that are still referenced after `end`.
     *
     * @param  list<string>  $lines
     * @return list<string>
     */
    private function exportedVariables(array $lines, int $start, int $end, int $total): array
    {
        $assigned = $this->assignedVariables(implode("\n", array_slice($lines, $start - 1, $end - $start + 1)));
        $after = implode("\n", array_slice($lines, $end, max(0, $total - $end)));

        return array_values(array_filter(
            $assigned,
            fn (string $variable): bool => $this->referencesAnyVariable($after, [$variable]),
        ));
    }

    private function assignsVariable(string $code): bool
    {
        return $this->assignedVariables($code) !== [];
    }

    /**
     * @return list<string>
     */
    private function assignedVariables(string $code): array
    {
        if (preg_match_all('/(\$[a-zA-Z_]\w*)\s*=(?!=)/', $code, $matches) === false) {
            return [];
        }

        return array_values(array_unique($matches[1] ?? []));
    }

    /**
     * @param  list<string>  $variables
     */
    private function referencesAnyVariable(string $code, array $variables): bool
    {
        foreach ($variables as $variable) {
            if (preg_match('/'.preg_quote($variable, '/').'(?![a-zA-Z0-9_])/', $code) === 1) {
                return true;
            }
        }

        return false;
    }

    private function replacementAssigns(string $replacement, string $variable): bool
    {
        return preg_match('/'.preg_quote($variable, '/').'\s*=(?!=)/', $replacement) === 1;
    }

    private function isSqlSinkLine(string $line): bool
    {
        return preg_match('/->\s*(exec|query|prepare)\s*\(|mysqli_query\s*\(/i', $line) === 1;
    }

    /**
     * @return array{0: int, 1: int}|null
     */
    private function snippetLineSpan(string $content, string $snippet): ?array
    {
        $normContent = $this->normalizeLineEndings($content);
        $normSnippet = trim($this->normalizeLineEndings($snippet));

        if ($normSnippet === '') {
            return null;
        }

        $position = strpos($normContent, $normSnippet);

        if ($position === false) {
            $firstLine = trim((string) (preg_split("/\n/", $normSnippet)[0] ?? ''));

            if ($firstLine === '') {
                return null;
            }

            $lines = preg_split("/\n/", $normContent) ?: [];

            foreach ($lines as $offset => $line) {
                if (str_contains($line, $firstLine)) {
                    $lineNumber = $offset + 1;

                    return [$lineNumber, $lineNumber];
                }
            }

            return null;
        }

        $startLine = substr_count(substr($normContent, 0, $position), "\n") + 1;
        $snippetLineCount = substr_count($normSnippet, "\n") + 1;

        return [$startLine, $startLine + $snippetLineCount - 1];
    }

    private function resolveEndLine(string $content, int $startLine, int $endLine): int
    {
        if ($endLine > $startLine) {
            return $endLine;
        }

        $lines = preg_split("/\r\n|\n|\r/", $this->normalizeLineEndings($content)) ?: [];

        if ($startLine < 1 || $startLine > count($lines)) {
            return $endLine;
        }

        $start = $lines[$startLine - 1];

        if (! preg_match('/<<<\s*[\'"]?([A-Za-z_][A-Za-z0-9_]*)[\'"]?\s*$/', $start, $matches)) {
            return $endLine;
        }

        $marker = $matches[1];

        for ($index = $startLine; $index < count($lines); $index++) {
            if (trim($lines[$index]) === $marker.';' || trim($lines[$index]) === $marker) {
                return $index + 1;
            }
        }

        return $endLine;
    }

    private function replaceSnippet(string $content, string $snippet, string $replacement): ?string
    {
        $snippet = trim($snippet);

        if ($snippet === '') {
            return null;
        }

        if (str_contains($content, $snippet)) {
            return str_replace($snippet, $replacement, $content);
        }

        $normalizedContent = $this->normalizeLineEndings($content);
        $normalizedSnippet = $this->normalizeLineEndings($snippet);

        if (str_contains($normalizedContent, $normalizedSnippet)) {
            return str_replace($normalizedSnippet, $replacement, $normalizedContent);
        }

        return null;
    }

    private function replaceLineRange(
        string $content,
        int $startLine,
        int $endLine,
        string $replacement,
    ): string {
        if ($startLine < 1) {
            throw new InvalidArgumentException('start_line must be >= 1.');
        }

        if ($endLine < $startLine) {
            throw new InvalidArgumentException('end_line must be >= start_line.');
        }

        $lines = preg_split("/\r\n|\n|\r/", $this->normalizeLineEndings($content)) ?: [];

        if ($startLine > count($lines)) {
            throw new InvalidArgumentException("start_line {$startLine} is outside the file (".count($lines).' lines).');
        }

        $startIndex = $startLine - 1;
        $deleteCount = min($endLine, count($lines)) - $startLine + 1;
        $replacementLines = $replacement === ''
            ? []
            : (preg_split("/\r\n|\n|\r/", $replacement) ?: []);

        array_splice($lines, $startIndex, $deleteCount, $replacementLines);

        return implode("\n", $lines);
    }

    /**
     * Count occurrences of a snippet within content, ignoring line-ending differences.
     */
    public function occurrences(string $content, string $needle): int
    {
        $needle = trim($needle);

        if ($needle === '') {
            return 0;
        }

        return substr_count(
            $this->normalizeLineEndings($content),
            $this->normalizeLineEndings($needle),
        );
    }

    private function normalizeLineEndings(string $content): string
    {
        return str_replace("\r\n", "\n", str_replace("\r", "\n", $content));
    }
}
