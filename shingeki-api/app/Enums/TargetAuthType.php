<?php

namespace App\Enums;

enum TargetAuthType: string
{
    case Cookie = 'cookie';
    case Bearer = 'bearer';
}
