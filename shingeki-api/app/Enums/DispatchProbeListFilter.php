<?php

namespace App\Enums;

enum DispatchProbeListFilter: string
{
    case All = 'all';
    case Vulnerable = 'vulnerable';
    case Clean = 'clean';
}
