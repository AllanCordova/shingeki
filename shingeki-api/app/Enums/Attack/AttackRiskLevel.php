<?php

namespace App\Enums\Attack;

enum AttackRiskLevel: string
{
    case Low = 'LOW';
    case Medium = 'MEDIUM';
    case High = 'HIGH';
}
