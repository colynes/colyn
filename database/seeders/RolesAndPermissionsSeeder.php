<?php

namespace Database\Seeders;

use App\Support\RoleRegistry;
use Illuminate\Database\Seeder;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        RoleRegistry::ensureBaselineRolesAndPermissions();
    }
}
