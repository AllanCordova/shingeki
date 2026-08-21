<?php

namespace App\Enums\Catalog;

enum CatalogImportType: string
{
    case Attacks = 'ATTACKS';
    case Remediations = 'REMEDIATIONS';
}
