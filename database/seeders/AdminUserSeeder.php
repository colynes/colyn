<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@amanibrew.com'],
            ['name' => 'Amani Brew Admin', 'password' => Hash::make('mmanager123')]
        );
        $admin->syncRoles(['Administrator']);

        $manager = User::firstOrCreate(
            ['email' => 'john@amanibrew.com'],
            ['name' => 'John Manager', 'password' => Hash::make('password')]
        );
        $manager->syncRoles(['Manager']);

        $staff = User::firstOrCreate(
            ['email' => 'sarah@amanibrew.com'],
            ['name' => 'Sarah Staff', 'password' => Hash::make('password')]
        );
        $staff->syncRoles(['Staff']);
    }
}
