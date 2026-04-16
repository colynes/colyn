<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\Stock;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InventorySeeder extends Seeder
{
    private const DEFAULT_STOCK_QUANTITY = 50;
    private const DEFAULT_MIN_STOCK = 10;
    private const DEFAULT_REORDER_LEVEL = 15;
    private const CATALOG_PRICE_EFFECTIVE_FROM = '2026-01-01 00:00:00';

    public function run(): void
    {
        DB::transaction(function (): void {
            $catalog = $this->catalog();
            $activeBranches = Branch::query()
                ->where('is_active', true)
                ->get(['id']);

            $catalogCategorySlugs = [];
            $catalogProductSkus = [];

            foreach ($catalog as $index => $categoryData) {
                $category = Category::withTrashed()->updateOrCreate(
                    ['slug' => $categoryData['slug']],
                    [
                        'name' => $categoryData['name'],
                        'description' => $categoryData['description'],
                        'is_active' => true,
                        'sort_order' => ($index + 1) * 10,
                    ]
                );

                if ($category->trashed()) {
                    $category->restore();
                }

                $catalogCategorySlugs[] = $category->slug;

                foreach ($categoryData['products'] as $productData) {
                    $product = Product::withTrashed()->updateOrCreate(
                        ['sku' => $productData['sku']],
                        [
                            'category_id' => $category->id,
                            'name' => $productData['name'],
                            'slug' => $productData['slug'],
                            'description' => null,
                            'supplier_name' => 'Happy Sausages',
                            'supplier_contact' => null,
                            'barcode' => null,
                            'unit' => $productData['unit'],
                            'weight' => null,
                            'is_active' => true,
                        ]
                    );

                    if ($product->trashed()) {
                        $product->restore();
                    }

                    $catalogProductSkus[] = $product->sku;

                    ProductPrice::updateOrCreate(
                        [
                            'product_id' => $product->id,
                            'effective_from' => self::CATALOG_PRICE_EFFECTIVE_FROM,
                        ],
                        [
                            'price' => $productData['price'],
                            'promo_price' => null,
                            'effective_to' => null,
                        ]
                    );

                    // Stock is branch-scoped in this schema, so seed the default
                    // quantity for every active branch that already exists.
                    foreach ($activeBranches as $branch) {
                        Stock::updateOrCreate(
                            [
                                'product_id' => $product->id,
                                'branch_id' => $branch->id,
                            ],
                            [
                                'quantity' => self::DEFAULT_STOCK_QUANTITY,
                                'min_stock' => self::DEFAULT_MIN_STOCK,
                                'reorder_level' => self::DEFAULT_REORDER_LEVEL,
                            ]
                        );
                    }
                }
            }

            $this->retireLegacyProducts($catalogProductSkus);
            $this->retireLegacyCategories($catalogCategorySlugs);
        });
    }

    protected function retireLegacyProducts(array $catalogProductSkus): void
    {
        Product::query()
            ->whereNotIn('sku', $catalogProductSkus)
            ->get()
            ->each(function (Product $product): void {
                $product->update(['is_active' => false]);

                if (! $product->trashed()) {
                    $product->delete();
                }
            });
    }

    protected function retireLegacyCategories(array $catalogCategorySlugs): void
    {
        Category::query()
            ->whereNotIn('slug', $catalogCategorySlugs)
            ->get()
            ->each(function (Category $category): void {
                $category->update(['is_active' => false]);

                if (! $category->trashed()) {
                    $category->delete();
                }
            });
    }

    protected function catalog(): array
    {
        return [
            [
                'name' => 'Sausages',
                'slug' => 'sausages',
                'description' => 'Happy Sausages sausage range.',
                'products' => [
                    [
                        'name' => 'Vienna Sausages',
                        'slug' => Str::slug('Vienna Sausages'),
                        'sku' => 'HS-SAU-VIENNA',
                        'unit' => 'pack',
                        'price' => 8000.00,
                    ],
                    [
                        'name' => 'Vienna Sausages Mini',
                        'slug' => Str::slug('Vienna Sausages Mini'),
                        'sku' => 'HS-SAU-VIENNA-MINI',
                        'unit' => 'pack',
                        'price' => 6800.00,
                    ],
                    [
                        'name' => 'Beef Barbecue Sausages',
                        'slug' => Str::slug('Beef Barbecue Sausages'),
                        'sku' => 'HS-SAU-BBQ-BEEF',
                        'unit' => 'pack',
                        'price' => 14500.00,
                    ],
                    [
                        'name' => 'Beef Barbecue Sausages Mini',
                        'slug' => Str::slug('Beef Barbecue Sausages Mini'),
                        'sku' => 'HS-SAU-BBQ-BEEF-MINI',
                        'unit' => 'pack',
                        'price' => 9800.00,
                    ],
                    [
                        'name' => 'Chicken Sausages',
                        'slug' => Str::slug('Chicken Sausages'),
                        'sku' => 'HS-SAU-CHICKEN',
                        'unit' => 'pack',
                        'price' => 13800.00,
                    ],
                    [
                        'name' => 'Pork Sausages',
                        'slug' => Str::slug('Pork Sausages'),
                        'sku' => 'HS-SAU-PORK',
                        'unit' => 'pack',
                        'price' => 14500.00,
                    ],
                    [
                        'name' => 'Cocktail Sausages',
                        'slug' => Str::slug('Cocktail Sausages'),
                        'sku' => 'HS-SAU-COCKTAIL',
                        'unit' => 'pack',
                        'price' => 9000.00,
                    ],
                ],
            ],
            [
                'name' => 'Fresh Beef & Prime Cuts',
                'slug' => 'fresh-beef-prime-cuts',
                'description' => 'Happy Sausages fresh beef and prime cuts.',
                'products' => [
                    [
                        'name' => 'Beef Fillet',
                        'slug' => Str::slug('Beef Fillet'),
                        'sku' => 'HS-BEEF-FILLET',
                        'unit' => 'kg',
                        'price' => 32000.00,
                    ],
                    [
                        'name' => 'T-Bone Steak',
                        'slug' => Str::slug('T-Bone Steak'),
                        'sku' => 'HS-BEEF-TBONE',
                        'unit' => 'kg',
                        'price' => 28500.00,
                    ],
                    [
                        'name' => 'Rump Steak',
                        'slug' => Str::slug('Rump Steak'),
                        'sku' => 'HS-BEEF-RUMP',
                        'unit' => 'kg',
                        'price' => 24500.00,
                    ],
                    [
                        'name' => 'Sirloin Steak',
                        'slug' => Str::slug('Sirloin Steak'),
                        'sku' => 'HS-BEEF-SIRLOIN',
                        'unit' => 'kg',
                        'price' => 26000.00,
                    ],
                    [
                        'name' => 'Beef Mince',
                        'slug' => Str::slug('Beef Mince'),
                        'sku' => 'HS-BEEF-MINCE',
                        'unit' => 'kg',
                        'price' => 19500.00,
                    ],
                    [
                        'name' => 'Beef Stew',
                        'slug' => Str::slug('Beef Stew'),
                        'sku' => 'HS-BEEF-STEW',
                        'unit' => 'kg',
                        'price' => 21000.00,
                    ],
                    [
                        'name' => 'Beef Topside',
                        'slug' => Str::slug('Beef Topside'),
                        'sku' => 'HS-BEEF-TOPSIDE',
                        'unit' => 'kg',
                        'price' => 23500.00,
                    ],
                    [
                        'name' => 'Beef Silverside',
                        'slug' => Str::slug('Beef Silverside'),
                        'sku' => 'HS-BEEF-SILVERSIDE',
                        'unit' => 'kg',
                        'price' => 22500.00,
                    ],
                ],
            ],
            [
                'name' => 'Lamb & Goat',
                'slug' => 'lamb-goat',
                'description' => 'Happy Sausages lamb and goat range.',
                'products' => [
                    [
                        'name' => 'Lamb/Goat Leg',
                        'slug' => Str::slug('Lamb/Goat Leg'),
                        'sku' => 'HS-LG-LEG',
                        'unit' => 'kg',
                        'price' => 22000.00,
                    ],
                    [
                        'name' => 'Lamb/Goat Chops',
                        'slug' => Str::slug('Lamb/Goat Chops'),
                        'sku' => 'HS-LG-CHOPS',
                        'unit' => 'kg',
                        'price' => 22000.00,
                    ],
                    [
                        'name' => 'Lamb/Goat Ribs',
                        'slug' => Str::slug('Lamb/Goat Ribs'),
                        'sku' => 'HS-LG-RIBS',
                        'unit' => 'kg',
                        'price' => 20500.00,
                    ],
                    [
                        'name' => 'Lamb Roast Rolled',
                        'slug' => Str::slug('Lamb Roast Rolled'),
                        'sku' => 'HS-LAMB-ROAST-ROLLED',
                        'unit' => 'kg',
                        'price' => 23000.00,
                    ],
                    [
                        'name' => 'Lamb Shank',
                        'slug' => Str::slug('Lamb Shank'),
                        'sku' => 'HS-LAMB-SHANK',
                        'unit' => 'kg',
                        'price' => 18500.00,
                    ],
                    [
                        'name' => 'Lamb Stew',
                        'slug' => Str::slug('Lamb Stew'),
                        'sku' => 'HS-LAMB-STEW',
                        'unit' => 'kg',
                        'price' => 19000.00,
                    ],
                ],
            ],
            [
                'name' => 'Poultry',
                'slug' => 'poultry',
                'description' => 'Happy Sausages poultry range.',
                'products' => [
                    [
                        'name' => 'Broiler Chicken',
                        'slug' => Str::slug('Broiler Chicken'),
                        'sku' => 'HS-POULTRY-BROILER',
                        'unit' => 'pcs',
                        'price' => 11200.00,
                    ],
                    [
                        'name' => 'Kroiler Chicken',
                        'slug' => Str::slug('Kroiler Chicken'),
                        'sku' => 'HS-POULTRY-KROILER',
                        'unit' => 'pcs',
                        'price' => 13500.00,
                    ],
                    [
                        'name' => 'Chicken Breast',
                        'slug' => Str::slug('Chicken Breast'),
                        'sku' => 'HS-POULTRY-BREAST',
                        'unit' => 'kg',
                        'price' => 19500.00,
                    ],
                    [
                        'name' => 'Chicken Fillet',
                        'slug' => Str::slug('Chicken Fillet'),
                        'sku' => 'HS-POULTRY-FILLET',
                        'unit' => 'kg',
                        'price' => 20500.00,
                    ],
                    [
                        'name' => 'Chicken Drumsticks',
                        'slug' => Str::slug('Chicken Drumsticks'),
                        'sku' => 'HS-POULTRY-DRUMSTICKS',
                        'unit' => 'kg',
                        'price' => 15500.00,
                    ],
                    [
                        'name' => 'Chicken Wings',
                        'slug' => Str::slug('Chicken Wings'),
                        'sku' => 'HS-POULTRY-WINGS',
                        'unit' => 'kg',
                        'price' => 18000.00,
                    ],
                ],
            ],
            [
                'name' => 'Pork Products',
                'slug' => 'pork-products',
                'description' => 'Happy Sausages pork range.',
                'products' => [
                    [
                        'name' => 'Bacon Back',
                        'slug' => Str::slug('Bacon Back'),
                        'sku' => 'HS-PORK-BACON-BACK',
                        'unit' => 'pack',
                        'price' => 24800.00,
                    ],
                    [
                        'name' => 'Bacon Streaky',
                        'slug' => Str::slug('Bacon Streaky'),
                        'sku' => 'HS-PORK-BACON-STREAKY',
                        'unit' => 'pack',
                        'price' => 25600.00,
                    ],
                    [
                        'name' => 'Ham Cooked',
                        'slug' => Str::slug('Ham Cooked'),
                        'sku' => 'HS-PORK-HAM-COOKED',
                        'unit' => 'pack',
                        'price' => 18500.00,
                    ],
                    [
                        'name' => 'Ham Smoked',
                        'slug' => Str::slug('Ham Smoked'),
                        'sku' => 'HS-PORK-HAM-SMOKED',
                        'unit' => 'pack',
                        'price' => 19800.00,
                    ],
                    [
                        'name' => 'Pork Chops',
                        'slug' => Str::slug('Pork Chops'),
                        'sku' => 'HS-PORK-CHOPS',
                        'unit' => 'kg',
                        'price' => 20000.00,
                    ],
                ],
            ],
            [
                'name' => 'Imported Beef',
                'slug' => 'imported-beef',
                'description' => 'Reserved for imported beef products once verified source data is available.',
                'products' => [
                    // Intentionally left empty until imported beef products are explicitly supported by source data.
                ],
            ],
        ];
    }
}
