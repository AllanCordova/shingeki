<?php

namespace App\Enums\TargetAccess;

enum SignatureStatus: string
{
    case Permitted = 'PERMITTED';
    case Denied = 'DENIED';
}
