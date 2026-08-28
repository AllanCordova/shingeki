<?php

namespace App\Enums\Attack;

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
