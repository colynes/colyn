<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function index(): JsonResponse
    {
        try {
            $products = Product::query()
                ->with(['category:id,name', 'currentPrice'])
                ->active()
                ->orderBy('name')
                ->get(['id', 'category_id', 'name', 'slug', 'description', 'sku', 'unit', 'weight', 'is_active'])
                ->map(function (Product $product) {
                    $currentPrice = $product->currentPrice;
                    $effectivePrice = $currentPrice?->effective_price;

                    return [
                        'id' => $product->id,
                        'category_id' => $product->category_id,
                        'category_name' => $product->category?->name,
                        'name' => $product->name,
                        'slug' => $product->slug,
                        'description' => $product->description,
                        'sku' => $product->sku,
                        'unit' => $product->unit,
                        'weight' => $product->weight !== null ? (float) $product->weight : null,
                        'is_active' => (bool) $product->is_active,
                        'price' => $effectivePrice !== null ? (float) $effectivePrice : null,
                        'regular_price' => $currentPrice?->price !== null ? (float) $currentPrice->price : null,
                        'promo_price' => $currentPrice?->promo_price !== null ? (float) $currentPrice->promo_price : null,
                        'price_effective_from' => optional($currentPrice?->effective_from)->toIso8601String(),
                        'price_effective_to' => optional($currentPrice?->effective_to)->toIso8601String(),
                    ];
                })
                ->values();

            return response()->json([
                'success' => true,
                'message' => 'Products fetched successfully.',
                'data' => [
                    'products' => $products,
                ],
            ], 200);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'message' => 'Unable to fetch products right now.',
                'data' => null,
            ], 500);
        }
    }
}
