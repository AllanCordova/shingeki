<?php

namespace App\Enums\Attack;

enum DispatchProbeListFilter: string
{
    case All = 'all';
    case Vulnerable = 'vulnerable';
    case Clean = 'clean';
}
