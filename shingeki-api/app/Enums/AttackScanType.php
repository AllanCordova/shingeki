<?php

namespace App\Enums;

enum AttackScanType: string
{
    case Dast = 'DAST';
    case Sast = 'SAST';
}
