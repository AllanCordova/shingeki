<?php

namespace App\Enums\System;

enum StackKind: string
{
    case Language = 'language';
    case Framework = 'framework';
    case Generic = 'generic';
}
