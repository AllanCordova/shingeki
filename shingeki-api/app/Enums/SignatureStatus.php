<?php

namespace App\Enums;

enum SignatureStatus: string
{
    case Permitted = 'PERMITTED';
    case Denied = 'DENIED';
}
