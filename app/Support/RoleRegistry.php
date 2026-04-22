<?php

namespace App\Support;

use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleRegistry
{
    public const WEB_GUARD = 'web';

    public const ADMINISTRATOR = 'Administrator';
    public const MANAGER = 'Manager';
    public const STAFF = 'Staff';
    public const CUSTOMER = 'Customer';

    public const PERMISSIONS = [
        'manage users',
        'manage inventory',
        'manage orders',
        'view analytics',
    ];

    public const ROLE_PERMISSIONS = [
        self::ADMINISTRATOR => self::PERMISSIONS,
        self::MANAGER => ['manage inventory', 'manage orders', 'view analytics'],
        self::STAFF => ['manage orders'],
        self::CUSTOMER => [],
    ];

    public static function ensureRole(string $roleName, string $guardName = self::WEB_GUARD): Role
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return Role::findOrCreate($roleName, $guardName);
    }

    public static function ensureCustomerRole(): Role
    {
        return self::ensureRole(self::CUSTOMER);
    }

    public static function ensureBaselineRolesAndPermissions(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $permissionName) {
            Permission::findOrCreate($permissionName, self::WEB_GUARD);
        }

        foreach (self::ROLE_PERMISSIONS as $roleName => $permissionNames) {
            $role = Role::findOrCreate($roleName, self::WEB_GUARD);
            $role->syncPermissions($permissionNames);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
