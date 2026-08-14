<?php

namespace App\Enums\TargetAccess;

enum TargetAuthType: string
{
    case Cookie = 'cookie';
    case Bearer = 'bearer';
}
