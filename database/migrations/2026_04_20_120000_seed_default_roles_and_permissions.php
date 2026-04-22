<?php

use App\Support\RoleRegistry;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tableNames = config('permission.table_names');
        $rolesTable = $tableNames['roles'] ?? 'roles';
        $permissionsTable = $tableNames['permissions'] ?? 'permissions';

        if (!Schema::hasTable($rolesTable) || !Schema::hasTable($permissionsTable)) {
            return;
        }

        RoleRegistry::ensureBaselineRolesAndPermissions();
    }

    public function down(): void
    {
        // Keep baseline roles and permissions in place during rollback.
    }
};
