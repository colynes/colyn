<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Collection;

class BackofficeAccess
{
    public const BACKOFFICE_ROLES = [
        'administrator',
        'admin',
        'manager',
        'staff',
    ];

    public static function roleKeys(?User $user): Collection
    {
        return $user?->getRoleNames()
            ->map(fn ($role) => strtolower((string) $role))
            ?? collect();
    }

    public static function hasBackofficeAccess(?User $user): bool
    {
        $roles = self::roleKeys($user);

        return $roles->intersect(self::BACKOFFICE_ROLES)->isNotEmpty();
    }
}
