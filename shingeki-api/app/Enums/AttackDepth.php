<?php

namespace App\Enums;

enum AttackDepth: string
{
    case Quick = 'quick';
    case Full = 'full';

    public function label(): string
    {
        return match ($this) {
            self::Quick => 'Rápido',
            self::Full => 'Completo',
        };
    }
}
