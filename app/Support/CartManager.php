<?php

namespace App\Support;

use App\Models\Pack;
use App\Models\Product;
use App\Models\Promotion;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

class CartManager
{
    protected const SESSION_KEY = 'cart.items';
    protected const MAX_LINE_QUANTITY = 500;

    public static function raw(): array
    {
        return self::normalizeRaw(session()->get(self::SESSION_KEY, []));
    }

    public static function add(int $productId, int $quantity = 1): void
    {
        self::addItem('product', $productId, $quantity);
    }

    public static function addProduct(int $productId, int $quantity = 1): void
    {
        self::add($productId, $quantity);
    }

    public static function addItem(string $type, int $sourceId, int $quantity = 1): void
    {
        $items = self::raw();
        $lineId = self::lineId($type, $sourceId);
        $currentQuantity = (int) ($items[$lineId]['quantity'] ?? 0);

        $items[$lineId] = [
            'type' => $type,
            'source_id' => $sourceId,
            'quantity' => min(self::MAX_LINE_QUANTITY, max(1, $currentQuantity + $quantity)),
        ];

        session()->put(self::SESSION_KEY, $items);
    }

    public static function update(string $lineId, int $quantity): void
    {
        $items = self::raw();

        if ($quantity <= 0) {
            unset($items[$lineId]);
        } elseif (isset($items[$lineId])) {
            $items[$lineId]['quantity'] = min(self::MAX_LINE_QUANTITY, $quantity);
        }

        session()->put(self::SESSION_KEY, $items);
    }

    public static function remove(string $lineId): void
    {
        $items = self::raw();
        unset($items[$lineId]);

        session()->put(self::SESSION_KEY, $items);
    }

    public static function clear(): void
    {
        session()->forget(self::SESSION_KEY);
    }

    public static function details(): Collection
    {
        $items = self::raw();

        if (empty($items)) {
            return collect();
        }

        $productIds = collect($items)->where('type', 'product')->pluck('source_id')->map(fn ($id) => (int) $id)->values()->all();
        $packIds = collect($items)->where('type', 'pack')->pluck('source_id')->map(fn ($id) => (int) $id)->values()->all();
        $promotionIds = collect($items)->where('type', 'promotion')->pluck('source_id')->map(fn ($id) => (int) $id)->values()->all();

        $products = collect();
        $packs = collect();
        $promotions = collect();

        if (Schema::hasTable('products') && Schema::hasTable('product_prices') && Schema::hasTable('stocks') && !empty($productIds)) {
            $products = Product::query()
                ->active()
                ->with(['category', 'currentPrice'])
                ->withSum('stocks as stock_quantity', 'quantity')
                ->whereIn('id', $productIds)
                ->get()
                ->keyBy('id');
        }

        if (Schema::hasTable('packs') && !empty($packIds)) {
            $packs = Pack::query()
                ->active()
                ->whereIn('id', $packIds)
                ->get()
                ->keyBy('id');
        }

        if (Schema::hasTable('promotions') && !empty($promotionIds)) {
            $promotions = Promotion::query()
                ->customerVisible()
                ->whereIn('id', $promotionIds)
                ->get()
                ->keyBy('id');
        }

        return collect($items)
            ->map(function (array $item, string $lineId) use ($products, $packs, $promotions) {
                $type = $item['type'] ?? 'product';
                $sourceId = (int) ($item['source_id'] ?? 0);
                $quantity = min(self::MAX_LINE_QUANTITY, max(1, (int) ($item['quantity'] ?? 1)));

                return match ($type) {
                    'product' => self::mapProductItem($products->get($sourceId), $lineId, $quantity),
                    'pack' => self::mapPackItem($packs->get($sourceId), $lineId, $quantity),
                    'promotion' => self::mapPromotionItem($promotions->get($sourceId), $lineId, $quantity),
                    default => null,
                };
            })
            ->filter()
            ->values();
    }

    public static function summary(): array
    {
        $items = self::details();

        return [
            'items' => $items->all(),
            'count' => $items->sum('quantity'),
            'line_count' => $items->count(),
            'subtotal' => round((float) $items->sum('subtotal'), 2),
        ];
    }

    protected static function mapProductItem(?Product $product, string $lineId, int $quantity): ?array
    {
        if (!$product || !$product->currentPrice) {
            return null;
        }

        $price = (float) ($product->currentPrice->promo_price ?? $product->currentPrice->price ?? 0);

        return [
            'line_id' => $lineId,
            'item_type' => 'product',
            'item_id' => $product->id,
            'product_id' => $product->id,
            'name' => $product->name,
            'description' => $product->description ?: 'Prepared fresh and ready for your next order.',
            'category' => $product->category?->name,
            'unit' => $product->unit,
            'price' => $price,
            'quantity' => $quantity,
            'stock_quantity' => (float) ($product->stock_quantity ?? 0),
            'subtotal' => round($price * $quantity, 2),
        ];
    }

    protected static function mapPackItem(?Pack $pack, string $lineId, int $quantity): ?array
    {
        if (!$pack) {
            return null;
        }

        $price = (float) $pack->price;

        return [
            'line_id' => $lineId,
            'item_type' => 'pack',
            'item_id' => $pack->id,
            'product_id' => null,
            'name' => $pack->name,
            'description' => $pack->description,
            'category' => 'Pack',
            'unit' => 'pack',
            'price' => $price,
            'quantity' => $quantity,
            'stock_quantity' => null,
            'subtotal' => round($price * $quantity, 2),
        ];
    }

    protected static function mapPromotionItem(?Promotion $promotion, string $lineId, int $quantity): ?array
    {
        if (!$promotion) {
            return null;
        }

        return [
            'line_id' => $lineId,
            'item_type' => 'promotion',
            'item_id' => $promotion->id,
            'product_id' => null,
            'name' => $promotion->title,
            'description' => $promotion->description,
            'category' => 'Promotion',
            'unit' => 'offer',
            'price' => 0,
            'quantity' => $quantity,
            'stock_quantity' => null,
            'subtotal' => 0,
        ];
    }

    protected static function normalizeRaw(array $items): array
    {
        $normalized = [];

        foreach ($items as $key => $value) {
            if (is_array($value) && isset($value['type'], $value['source_id'])) {
                $normalized[(string) $key] = [
                    'type' => (string) $value['type'],
                    'source_id' => (int) $value['source_id'],
                    'quantity' => min(self::MAX_LINE_QUANTITY, max(1, (int) ($value['quantity'] ?? 1))),
                ];
                continue;
            }

            if (is_numeric($key)) {
                $lineId = self::lineId('product', (int) $key);
                $normalized[$lineId] = [
                    'type' => 'product',
                    'source_id' => (int) $key,
                    'quantity' => min(self::MAX_LINE_QUANTITY, max(1, (int) $value)),
                ];
            }
        }

        return $normalized;
    }

    protected static function lineId(string $type, int $sourceId): string
    {
        return $type . '-' . $sourceId;
    }
}
