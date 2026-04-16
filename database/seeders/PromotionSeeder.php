<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\Promotion;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class PromotionSeeder extends Seeder
{
    public function run(): void
    {
        if (!Schema::hasTable('promotions')) {
            return;
        }

        DB::transaction(function (): void {
            $products = Product::query()
                ->with('currentPrice')
                ->whereIn('sku', $this->allPromotionSkus())
                ->get()
                ->keyBy('sku');

            ProductPrice::query()->update(['promo_price' => null]);

            $promotionSlugs = [];

            foreach ($this->promotions() as $promotionData) {
                $linkedProducts = collect($promotionData['products'])->map(function (array $productData) use ($products): array {
                    $product = $products->get($productData['sku']);

                    if (! $product || ! $product->currentPrice) {
                        throw new \RuntimeException("Promotion seeding failed: product [{$productData['sku']}] is missing or has no active price.");
                    }

                    $basePrice = (float) ($product->currentPrice->price ?? 0);

                    ProductPrice::query()
                        ->whereKey($product->currentPrice->id)
                        ->update(['promo_price' => $productData['promo_price']]);

                    return [
                        'name' => $product->name,
                        'base_price' => $basePrice,
                        'promo_price' => (float) $productData['promo_price'],
                        'discount_amount' => max(0, $basePrice - (float) $productData['promo_price']),
                    ];
                });

                $promotion = Promotion::updateOrCreate(
                    ['slug' => $promotionData['slug']],
                    [
                        'title' => $promotionData['title'],
                        'description' => $promotionData['description_prefix'] . ' Featured products: ' . $linkedProducts->pluck('name')->implode(', ') . '.',
                        'discount_label' => 'Save up to TZS ' . number_format((float) $linkedProducts->max('discount_amount'), 0),
                        'cta_text' => $promotionData['cta_text'],
                        'starts_at' => $promotionData['starts_at'],
                        'ends_at' => $promotionData['ends_at'],
                        'is_active' => true,
                    ]
                );

                $promotionSlugs[] = $promotion->slug;
            }

            Promotion::query()
                ->whereNotIn('slug', $promotionSlugs)
                ->update(['is_active' => false]);
        });
    }

    protected function allPromotionSkus(): array
    {
        return collect($this->promotions())
            ->flatMap(fn (array $promotion) => collect($promotion['products'])->pluck('sku'))
            ->unique()
            ->values()
            ->all();
    }

    protected function promotions(): array
    {
        return [
            [
                'title' => 'Sausage Weekend Saver',
                'slug' => Str::slug('Sausage Weekend Saver'),
                'description_prefix' => 'Weekend grilling prices on the most popular Happy Sausages lines.',
                'cta_text' => 'Shop sausage offers',
                'starts_at' => now()->startOfDay(),
                'ends_at' => now()->addDays(10)->endOfDay(),
                'products' => [
                    ['sku' => 'HS-SAU-VIENNA', 'promo_price' => 7200],
                    ['sku' => 'HS-SAU-BBQ-BEEF', 'promo_price' => 12900],
                    ['sku' => 'HS-SAU-CHICKEN', 'promo_price' => 12500],
                ],
            ],
            [
                'title' => 'Butcher Steak Week',
                'slug' => Str::slug('Butcher Steak Week'),
                'description_prefix' => 'Sharp Tanzania-ready steak pricing for customers buying premium beef cuts this week.',
                'cta_text' => 'Shop steak week',
                'starts_at' => now()->startOfDay(),
                'ends_at' => now()->addDays(14)->endOfDay(),
                'products' => [
                    ['sku' => 'HS-BEEF-FILLET', 'promo_price' => 28900],
                    ['sku' => 'HS-BEEF-RUMP', 'promo_price' => 21900],
                    ['sku' => 'HS-BEEF-SIRLOIN', 'promo_price' => 23900],
                ],
            ],
            [
                'title' => 'Poultry Value Days',
                'slug' => Str::slug('Poultry Value Days'),
                'description_prefix' => 'Lower prices on everyday poultry cuts for households stocking up this week.',
                'cta_text' => 'Shop poultry offers',
                'starts_at' => now()->startOfDay(),
                'ends_at' => now()->addDays(7)->endOfDay(),
                'products' => [
                    ['sku' => 'HS-POULTRY-BROILER', 'promo_price' => 10200],
                    ['sku' => 'HS-POULTRY-DRUMSTICKS', 'promo_price' => 13900],
                    ['sku' => 'HS-POULTRY-WINGS', 'promo_price' => 16200],
                ],
            ],
        ];
    }
}
