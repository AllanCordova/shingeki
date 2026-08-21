<?php

namespace App\Enums\Remediation;

enum RemediationRunType: string
{
    case CatalogSuggestion = 'catalog_suggestion';
    case AiSuggestion = 'ai_suggestion';
}
