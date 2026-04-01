<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Support\CartManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class StorefrontController extends Controller
{
    public function index(Request $request)
    {
        if (!Schema::hasTable('categories') || !Schema::hasTable('products') || !Schema::hasTable('product_prices')) {
            return Inertia::render('Home', [
                'categories' => [],
                'products'   => [],
                'cart'       => [
                    'items'      => [],
                    'count'      => 0,
                    'line_count' => 0,
                    'subtotal'   => 0,
                ],
                'activeCategory' => null,
            ]);
        }

        $activeCategory = null;

        if ($request->filled('category')) {
            $activeCategory = Category::query()
                ->active()
                ->where('slug', $request->string('category'))
                ->first(['id', 'name', 'slug']);
        }

        $categories = Category::query()
            ->active()
            ->withCount([
                'products' => fn($query) => $query->active(),
            ])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->take(6)
            ->get(['id', 'name', 'description', 'slug'])
            ->map(fn(Category $category) => [
                'id'             => $category->id,
                'name'           => $category->name,
                'description'    => $category->description ?: 'Fresh products prepared for fast ordering.',
                'slug'           => $category->slug,
                'products_count' => $category->products_count,
            ]);

        $products = Product::query()
            ->active()
            ->with(['category', 'currentPrice', 'stocks'])
            ->withSum('stocks as stock_quantity', 'quantity')
            ->when($activeCategory, fn($query) => $query->where('category_id', $activeCategory->id))
            ->orderBy('name')
            ->take(8)
            ->get()
            ->filter(fn(Product $product) => $product->currentPrice !== null)
            ->map(function (Product $product) {
                $stockQuantity = (float) ($product->stock_quantity ?? 0);
                $lowStockAlert = (float) ($product->stocks->max('reorder_level') ?? 0);
                $status = $stockQuantity <= 0
                    ? 'Out of Stock'
                    : ($lowStockAlert > 0 && $stockQuantity <= $lowStockAlert ? 'Low Stock' : 'In Stock');

                return [
                    'id'             => $product->id,
                    'name'           => $product->name,
                    'description'    => $product->description ?: 'Fresh stock ready for your next order.',
                    'category'       => $product->category?->name,
                    'unit'           => $product->unit,
                    'price'          => (float) ($product->currentPrice->promo_price ?? $product->currentPrice->price ?? 0),
                    'stock_quantity' => $stockQuantity,
                    'status'         => $status,
                ];
            })
            ->values();

        return Inertia::render('Home', [
            'categories'     => $categories,
            'products'       => $products,
            'cart'           => CartManager::summary(),
            'activeCategory' => $activeCategory ? [
                'id'   => $activeCategory->id,
                'name' => $activeCategory->name,
                'slug' => $activeCategory->slug,
            ] : null,
        ]);
    }
}
