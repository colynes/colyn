<?php

namespace Database\Seeders;

use App\Models\Pack;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class PackSeeder extends Seeder
{
    public function run(): void
    {
        if (!Schema::hasTable('packs')) {
            return;
        }

        $packs = [
            [
                'name' => 'Starter Pack',
                'description' => 'A simple starter bundle for first-time customers.',
                'price' => 25000,
            ],
            [
                'name' => 'Family Pack',
                'description' => 'A larger pack suitable for families or group use.',
                'price' => 60000,
            ],
            [
                'name' => 'Premium Pack',
                'description' => 'A premium selection bundle with higher quantity and value.',
                'price' => 95000,
            ],
        ];

        foreach ($packs as $pack) {
            Pack::updateOrCreate(
                ['name' => $pack['name']],
                $pack + ['is_active' => true]
            );
        }
    }
}
