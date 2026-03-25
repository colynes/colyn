<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;
use App\Models\Product;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Beef'     => 'All beef products',
            'Chicken'  => 'Poultry products',
            'Pork'     => 'Pork products',
            'Sausages' => 'Various sausage types',
            'Eggs'     => 'Egg and egg products',
        ];

        foreach ($categories as $name => $desc) {
            $cat = Category::create([
                'name'        => $name,
                'description' => $desc,
                'is_active'   => true,
            ]);

            // Add sample product to each
            if ($name === 'Chicken') {
                $p = Product::create([
                    'category_id' => $cat->id,
                    'name'        => 'Inter-chick Chicken',
                    'unit'        => 'kg',
                ]);
                $p->prices()->create(['price' => 7500, 'effective_from' => now()]);
            } elseif ($name === 'Beef') {
                $p = Product::create([
                    'category_id' => $cat->id,
                    'name'        => 'Premium Ribeye Steak',
                    'unit'        => 'kg',
                ]);
                $p->prices()->create(['price' => 25000, 'effective_from' => now()]);
            }
        }
    }
}
