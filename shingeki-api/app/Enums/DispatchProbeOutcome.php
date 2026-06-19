<?php

namespace App\Enums;

enum DispatchProbeOutcome: string
{
    case Clean = 'clean';
    case Error = 'error';
    case Vulnerable = 'vulnerable';
}
