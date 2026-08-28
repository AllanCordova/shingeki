<?php

namespace App\Enums\Signature;

enum SignatureStatus: string
{
    case Permitted = 'PERMITTED';
    case Denied = 'DENIED';
}
