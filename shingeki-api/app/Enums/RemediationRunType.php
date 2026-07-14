<?php

namespace App\Enums;

enum RemediationRunType: string
{
    case CatalogSuggestion = 'catalog_suggestion';
    case AiSuggestion = 'ai_suggestion';
}
