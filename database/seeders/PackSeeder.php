<?php

namespace Database\Seeders;

use App\Models\Pack;
use App\Models\PackItem;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class PackSeeder extends Seeder
{
    public function run(): void
    {
        if (!Schema::hasTable('packs') || !Schema::hasTable('pack_items')) {
            return;
        }

        DB::transaction(function (): void {
            $products = Product::query()
                ->with('currentPrice')
                ->whereIn('sku', $this->allPackSkus())
                ->get()
                ->keyBy('sku');

            $packSlugs = [];

            foreach ($this->packs() as $packData) {
                $items = collect($packData['items'])->map(function (array $item) use ($products): array {
                    $product = $products->get($item['sku']);

                    if (! $product || ! $product->currentPrice) {
                        throw new \RuntimeException("Pack seeding failed: product [{$item['sku']}] is missing or has no active price.");
                    }

                    $unitPrice = (float) ($product->currentPrice->price ?? 0);

                    return [
                        'sku' => $item['sku'],
                        'product' => $product,
                        'quantity' => (float) $item['quantity'],
                        'subtotal' => $unitPrice * (float) $item['quantity'],
                    ];
                });

                $fullPrice = round((float) $items->sum('subtotal'), 2);
                $packPrice = max(0, $fullPrice - (float) $packData['discount_amount']);
                $comesWith = $items
                    ->map(fn (array $item) => rtrim(rtrim(number_format($item['quantity'], 2, '.', ''), '0'), '.') . ' ' . $item['product']->unit . ' ' . $item['product']->name)
                    ->implode(', ');

                $pack = Pack::updateOrCreate(
                    ['slug' => $packData['slug']],
                    [
                        'name' => $packData['name'],
                        'description' => $packData['description'],
                        'comes_with' => $comesWith,
                        'price' => $packPrice,
                        'is_active' => true,
                    ]
                );

                $packSlugs[] = $pack->slug;

                foreach ($items as $item) {
                    PackItem::updateOrCreate(
                        [
                            'pack_id' => $pack->id,
                            'product_id' => $item['product']->id,
                        ],
                        [
                            'quantity' => $item['quantity'],
                        ]
                    );
                }

                PackItem::query()
                    ->where('pack_id', $pack->id)
                    ->whereNotIn('product_id', $items->pluck('product.id')->all())
                    ->delete();
            }

            Pack::query()
                ->whereNotIn('slug', $packSlugs)
                ->update(['is_active' => false]);
        });
    }

    protected function allPackSkus(): array
    {
        return collect($this->packs())
            ->flatMap(fn (array $pack) => collect($pack['items'])->pluck('sku'))
            ->unique()
            ->values()
            ->all();
    }

    protected function packs(): array
    {
        return [
            [
                'name' => 'Happy Grill Pack',
                'slug' => Str::slug('Happy Grill Pack'),
                'description' => 'Built for weekend braais with barbecue sausages and pork chops at a better bundled price.',
                'discount_amount' => 7800,
                'items' => [
                    ['sku' => 'HS-SAU-BBQ-BEEF', 'quantity' => 2],
                    ['sku' => 'HS-SAU-CHICKEN', 'quantity' => 1],
                    ['sku' => 'HS-PORK-CHOPS', 'quantity' => 1],
                ],
            ],
            [
                'name' => 'Family Essentials Box',
                'slug' => Str::slug('Family Essentials Box'),
                'description' => 'A practical mix of mince, stew, and drumsticks for the week ahead.',
                'discount_amount' => 12000,
                'items' => [
                    ['sku' => 'HS-BEEF-MINCE', 'quantity' => 2],
                    ['sku' => 'HS-BEEF-STEW', 'quantity' => 2],
                    ['sku' => 'HS-POULTRY-DRUMSTICKS', 'quantity' => 2],
                ],
            ],
            [
                'name' => 'Premium Steak & Chops Box',
                'slug' => Str::slug('Premium Steak & Chops Box'),
                'description' => 'A premium box for customers shopping fillet, steaks, and lamb chops in one order.',
                'discount_amount' => 8500,
                'items' => [
                    ['sku' => 'HS-BEEF-FILLET', 'quantity' => 1],
                    ['sku' => 'HS-BEEF-TBONE', 'quantity' => 1],
                    ['sku' => 'HS-BEEF-SIRLOIN', 'quantity' => 1],
                    ['sku' => 'HS-LG-CHOPS', 'quantity' => 1],
                ],
            ],
            [
                'name' => 'Breakfast Pork Pack',
                'slug' => Str::slug('Breakfast Pork Pack'),
                'description' => 'A breakfast-ready pack with bacon, ham, and vienna sausages for homes and small cafes.',
                'discount_amount' => 11700,
                'items' => [
                    ['sku' => 'HS-PORK-BACON-BACK', 'quantity' => 1],
                    ['sku' => 'HS-PORK-BACON-STREAKY', 'quantity' => 1],
                    ['sku' => 'HS-PORK-HAM-COOKED', 'quantity' => 1],
                    ['sku' => 'HS-PORK-HAM-SMOKED', 'quantity' => 1],
                    ['sku' => 'HS-SAU-VIENNA', 'quantity' => 1],
                ],
            ],
        ];
    }
}
