<?php

namespace App\Enums\Notifications;

enum UserNotificationType: string
{
    case AttackDispatch = 'attack_dispatch';
    case CatalogImport = 'catalog_import';
}
