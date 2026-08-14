<?php

namespace App\Enums\Attack;

enum DispatchProbeOutcome: string
{
    case Clean = 'clean';
    case Error = 'error';
    case Vulnerable = 'vulnerable';
}
