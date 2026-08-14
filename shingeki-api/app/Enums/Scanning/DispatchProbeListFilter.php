<?php

namespace App\Enums\Scanning;

enum DispatchProbeListFilter: string
{
    case All = 'all';
    case Vulnerable = 'vulnerable';
    case Clean = 'clean';
}
