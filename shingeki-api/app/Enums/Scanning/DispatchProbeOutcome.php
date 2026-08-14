<?php

namespace App\Enums\Scanning;

enum DispatchProbeOutcome: string
{
    case Clean = 'clean';
    case Error = 'error';
    case Vulnerable = 'vulnerable';
}
