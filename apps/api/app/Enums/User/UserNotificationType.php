<?php

namespace App\Enums\User;

enum UserNotificationType: string
{
    case AttackDispatch = 'attack_dispatch';
    case CatalogImport = 'catalog_import';
}
