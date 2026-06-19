<?php

namespace App\Enums;

enum CatalogImportType: string
{
    case Attacks = 'ATTACKS';
    case Remediations = 'REMEDIATIONS';
}
