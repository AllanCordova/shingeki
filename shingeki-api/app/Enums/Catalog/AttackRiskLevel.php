<?php

namespace App\Enums\Catalog;

enum AttackRiskLevel: string
{
    case Low = 'LOW';
    case Medium = 'MEDIUM';
    case High = 'HIGH';
}
