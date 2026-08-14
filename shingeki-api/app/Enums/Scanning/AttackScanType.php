<?php

namespace App\Enums\Scanning;

enum AttackScanType: string
{
    case Dast = 'DAST';
    case Sast = 'SAST';

    public function label(): string
    {
        return $this->value;
    }
}
