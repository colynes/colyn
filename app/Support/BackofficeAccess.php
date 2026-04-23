<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
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

    public static function applyToUserQuery(Builder $query): Builder
    {
        return $query->whereHas('roles', function (Builder $roleQuery): void {
            $roleQuery
                ->where('guard_name', RoleRegistry::WEB_GUARD)
                ->where(function (Builder $nameQuery): void {
                    foreach (self::BACKOFFICE_ROLES as $index => $role) {
                        $method = $index === 0 ? 'whereRaw' : 'orWhereRaw';

                        $nameQuery->{$method}('LOWER(name) = ?', [$role]);
                    }
                });
        });
    }

    public static function usersQuery(): Builder
    {
        return self::applyToUserQuery(User::query());
    }
}
