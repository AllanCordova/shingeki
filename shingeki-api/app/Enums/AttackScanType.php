<?php

namespace App\Enums;

enum AttackScanType: string
{
    case Dast = 'DAST';
    case Sast = 'SAST';

    public function label(): string
    {
        return $this->value;
    }
}
