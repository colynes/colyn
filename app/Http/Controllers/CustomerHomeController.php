<?php

namespace App\Http\Controllers;

use App\Models\Pack;
use App\Models\Product;
use App\Models\Promotion;
use App\Support\CartManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class CustomerHomeController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $roleKeys = $user?->getRoleNames()->map(fn ($role) => strtolower($role)) ?? collect();

        if (!$user) {
            return redirect()->route('home');
        }

        if ($roleKeys->intersect(['administrator', 'admin', 'manager', 'staff'])->isNotEmpty()) {
            return redirect()->route('dashboard');
        }

        if (!$roleKeys->contains('customer')) {
            return redirect()->route('home');
        }

        $promotions = Promotion::query()
            ->customerVisible()
            ->latest('starts_at')
            ->get()
            ->map(function (Promotion $promotion) {
                $isClosed = $promotion->ends_at && $promotion->ends_at->isPast();

                return [
                'id' => $promotion->id,
                'title' => $promotion->title,
                'description' => $promotion->description,
                'discount_label' => $promotion->discount_label,
                'cta_text' => $promotion->cta_text ?: 'Shop now',
                'starts_at' => optional($promotion->starts_at)->toFormattedDateString(),
                'ends_at' => optional($promotion->ends_at)->toFormattedDateString(),
                'status_label' => $isClosed ? 'Promotion Closed' : 'Active Promotion',
                'is_closed' => $isClosed,
            ];
            });

        if ($promotions->isEmpty()) {
            $promotions = collect([
                [
                    'id' => 'fallback-weekend-brew',
                    'title' => 'Weekend Brew Deal',
                    'description' => 'Get 10% off selected coffee orders this weekend.',
                    'discount_label' => '10% Off',
                    'cta_text' => 'Shop weekend deal',
                    'starts_at' => now()->toFormattedDateString(),
                    'ends_at' => 'Apr 15, 2026',
                    'status_label' => 'Active Promotion',
                    'is_closed' => false,
                ],
                [
                    'id' => 'fallback-combo-saver',
                    'title' => 'Combo Saver Offer',
                    'description' => 'Buy more and save on special combo purchases.',
                    'discount_label' => 'Save TZS 5,000',
                    'cta_text' => 'Explore combos',
                    'starts_at' => now()->toFormattedDateString(),
                    'ends_at' => 'Apr 30, 2026',
                    'status_label' => 'Active Promotion',
                    'is_closed' => false,
                ],
            ]);
        }

        $hasPackItemsTable = Schema::hasTable('pack_items');
        $hasComesWithColumn = Schema::hasColumn('packs', 'comes_with');

        $packsQuery = Pack::query()
            ->active();

        if ($hasPackItemsTable) {
            $packsQuery->with(['items.product:id,name,unit']);
        }

        $packs = $packsQuery
            ->orderBy('name')
            ->get()
            ->map(function (Pack $pack) use ($hasPackItemsTable, $hasComesWithColumn) {
                $comesWith = $hasComesWithColumn ? $pack->comes_with : null;

                return [
                    'id' => $pack->id,
                    'name' => $pack->name,
                    'slug' => $pack->slug,
                    'description' => $comesWith ?: $pack->description,
                    'comes_with' => $comesWith,
                    'items' => $hasPackItemsTable
                        ? $pack->items->map(fn ($item) => [
                            'product_name' => $item->product?->name,
                            'quantity' => (float) $item->quantity,
                            'unit' => $item->product?->unit,
                        ])->values()
                        : collect(),
                    'price' => (float) $pack->price,
                ];
            });

        if ($packs->isEmpty()) {
            $packs = collect([
                [
                    'id' => 'fallback-starter-pack',
                    'name' => 'Starter Pack',
                    'slug' => 'starter-pack',
                    'description' => 'A simple starter bundle for first-time customers.',
                    'price' => 25000,
                ],
                [
                    'id' => 'fallback-family-pack',
                    'name' => 'Family Pack',
                    'slug' => 'family-pack',
                    'description' => 'A larger pack suitable for families or group use.',
                    'price' => 60000,
                ],
                [
                    'id' => 'fallback-premium-pack',
                    'name' => 'Premium Pack',
                    'slug' => 'premium-pack',
                    'description' => 'A premium selection bundle with higher quantity and value.',
                    'price' => 95000,
                ],
            ]);
        }

        $products = Product::query()
            ->active()
            ->with(['category', 'currentPrice', 'stocks'])
            ->withSum('stocks as stock_quantity', 'quantity')
            ->orderBy('name')
            ->take(12)
            ->get()
            ->filter(fn (Product $product) => $product->currentPrice !== null)
            ->map(function (Product $product) {
                $stockQuantity = (float) ($product->stock_quantity ?? 0);
                $lowStockAlert = (float) ($product->stocks->max('reorder_level') ?? 0);
                $status = $stockQuantity <= 0
                    ? 'Out of Stock'
                    : ($lowStockAlert > 0 && $stockQuantity <= $lowStockAlert ? 'Low Stock' : 'In Stock');

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'description' => $product->description ?: 'Fresh stock ready for your next order.',
                    'category' => $product->category?->name,
                    'price' => (float) ($product->currentPrice->promo_price ?? $product->currentPrice->price ?? 0),
                    'unit' => $product->unit,
                    'status' => $status,
                    'stock_quantity' => $stockQuantity,
                    'image' => $product->image ?? null,
                ];
            })
            ->values();

        return Inertia::render('CustomerHome', [
            'promotions' => $promotions,
            'packs' => $packs,
            'products' => $products,
            'cart' => CartManager::summary(),
        ]);
    }
}
