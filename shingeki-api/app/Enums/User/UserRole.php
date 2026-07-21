<?php

namespace App\Enums\User;

enum UserRole: string
{
    case User = 'USER';
    case Admin = 'ADMIN';
    case Specialist = 'SPECIALIST';

    /**
     * @return list<UserRole>
     */
    public static function catalogManagers(): array
    {
        return [self::Admin, self::Specialist];
    }

    public function isAdmin(): bool
    {
        return $this === self::Admin;
    }

    public function canManageCatalog(): bool
    {
        return in_array($this, self::catalogManagers(), true);
    }

    public function canBulkImportCatalog(): bool
    {
        return $this->canManageCatalog();
    }

    public function canModifyOwnedCatalogItem(string $ownerUserId, string $actorUserId): bool
    {
        if (! $this->canManageCatalog()) {
            return false;
        }

        return $this->isAdmin() || $ownerUserId === $actorUserId;
    }

    public function canUseManualProxy(): bool
    {
        return $this->isAdmin() || $this === self::Specialist;
    }
}
