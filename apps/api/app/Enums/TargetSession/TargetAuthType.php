<?php

namespace App\Enums\TargetSession;

enum TargetAuthType: string
{
    case Cookie = 'cookie';
    case Bearer = 'bearer';
}
