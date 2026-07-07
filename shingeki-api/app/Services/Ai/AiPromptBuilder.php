<?php

namespace App\Services\Ai;

use App\Models\Stack;

class AiPromptBuilder
{
    public function systemPrompt(Stack $stack): string
    {
        $path = resource_path('ai/prompts/'.$stack->slug.'.md');
        $fallback = resource_path('ai/prompts/default.md');

        if (is_file($path)) {
            return (string) file_get_contents($path);
        }

        if (is_file($fallback)) {
            return (string) file_get_contents($fallback);
        }

        return 'You are a security remediation assistant. Respond only with valid JSON.';
    }

    /**
     * @param  array<string, mixed>  $finding
     * @param  array<string, mixed>  $sourceContext
     * @param  list<array<string, mixed>>  $catalogSnippets
     */
    public function userPrompt(array $finding, array $sourceContext, array $catalogSnippets, Stack $stack): string
    {
        $catalog = $catalogSnippets === []
            ? 'No catalog snippet available for this stack.'
            : json_encode($catalogSnippets, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $findingJson = json_encode($finding, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $sourceJson = json_encode($sourceContext, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
Analyze this security finding for stack "{$stack->name}" ({$stack->slug}).

Return JSON with this exact shape:
{
  "location": { "file": string|null, "line": number|null },
  "root_cause": string,
  "risk_summary": string,
  "suggested_fix": { "description": string, "code": string },
  "validation": { "why_this_fixes": string, "confidence": "high"|"medium"|"low", "syntax_valid": boolean },
  "references": string[]
}

Rules:
- Ground the fix in the provided source excerpt and finding evidence.
- Do not invent files, frameworks, or APIs not implied by the stack and excerpt.
- suggested_fix.code must replace the ENTIRE vulnerable block from the source excerpt (from start line through end of statement/heredoc), not a single line insertion.
- Do not leave placeholder comments such as "/* ... */" or duplicate old vulnerable code below the fix.
- The substituted code must be valid PHP when merged back into the file.
- Prefer minimal, production-ready fixes aligned with the catalog example when present.
- Set location.file and location.line from the finding when known.

Finding:
{$findingJson}

Source context:
{$sourceJson}

Catalog examples for this stack:
{$catalog}
PROMPT;
    }
}
