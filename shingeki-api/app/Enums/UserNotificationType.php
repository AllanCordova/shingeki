<?php

namespace App\Enums;

enum UserNotificationType: string
{
    case AttackDispatch = 'attack_dispatch';
    case CatalogImport = 'catalog_import';
}
