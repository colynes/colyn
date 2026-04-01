<?php

namespace Database\Seeders;

use App\Models\Promotion;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class PromotionSeeder extends Seeder
{
    public function run(): void
    {
        if (!Schema::hasTable('promotions')) {
            return;
        }

        $promotions = [
            [
                'title' => 'Weekend Brew Deal',
                'description' => 'Get 10% off selected coffee orders this weekend.',
                'discount_label' => '10% Off',
                'cta_text' => 'Shop weekend deal',
                'starts_at' => now()->startOfDay(),
                'ends_at' => now()->setDate(2026, 4, 15)->endOfDay(),
                'is_active' => true,
            ],
            [
                'title' => 'Combo Saver Offer',
                'description' => 'Buy more and save on special combo purchases.',
                'discount_label' => 'Save TZS 5,000',
                'cta_text' => 'Explore combos',
                'starts_at' => now()->startOfDay(),
                'ends_at' => now()->setDate(2026, 4, 30)->endOfDay(),
                'is_active' => true,
            ],
        ];

        foreach ($promotions as $promotion) {
            Promotion::updateOrCreate(
                ['title' => $promotion['title']],
                $promotion
            );
        }
    }
}
