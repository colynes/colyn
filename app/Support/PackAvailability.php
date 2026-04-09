<?php

namespace App\Support;

use App\Models\Pack;
use App\Models\Product;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

class PackAvailability
{
    public static function forCollection(Collection $packs, int $branchId): Collection
    {
        if ($packs->isEmpty()) {
            return collect();
        }

        if (!Schema::hasTable('pack_items')) {
            return $packs->mapWithKeys(fn (Pack $pack) => [
                $pack->id => self::buildState(false, 'Out of Stock', 'This pack is not available for ordering right now.'),
            ]);
        }

        $packs->loadMissing('items.product');

        $productIds = $packs
            ->flatMap(fn (Pack $pack) => $pack->items->pluck('product_id'))
            ->filter()
            ->unique()
            ->values();

        $products = Product::query()
            ->withSum(['stocks as branch_stock_quantity' => fn ($query) => $query->where('branch_id', $branchId)], 'quantity')
            ->whereIn('id', $productIds)
            ->get()
            ->keyBy('id');

        return $packs->mapWithKeys(function (Pack $pack) use ($products) {
            return [$pack->id => self::forPack($pack, $products)];
        });
    }

    public static function insufficientStockMessage(Pack $pack, int $branchId, float $orderedQuantity = 1): ?string
    {
        if (!Schema::hasTable('pack_items')) {
            return 'This pack is not available for ordering right now.';
        }

        $pack->loadMissing('items.product');

        if ($pack->items->isEmpty()) {
            return 'This pack is out of stock right now.';
        }

        $requirements = $pack->items
            ->filter(fn ($item) => !empty($item->product_id))
            ->groupBy(fn ($item) => (int) $item->product_id)
            ->map(fn ($items) => (float) $items->sum(fn ($item) => (float) $item->quantity * $orderedQuantity));

        if ($requirements->isEmpty()) {
            return 'This pack is out of stock right now.';
        }

        $products = Product::query()
            ->withSum(['stocks as branch_stock_quantity' => fn ($query) => $query->where('branch_id', $branchId)], 'quantity')
            ->whereIn('id', $requirements->keys())
            ->get()
            ->keyBy('id');

        foreach ($requirements as $productId => $requiredQuantity) {
            $product = $products->get((int) $productId);
            $availableQuantity = (float) ($product?->branch_stock_quantity ?? 0);

            if (!$product || $availableQuantity < $requiredQuantity) {
                $productName = $product?->name ?? 'one of the products in this pack';
                $requiredPerPack = (float) ($pack->items
                    ->where('product_id', (int) $productId)
                    ->sum('quantity'));
                $formattedAvailable = rtrim(rtrim(number_format($availableQuantity, 2, '.', ''), '0'), '.');
                $maxPacks = $requiredPerPack > 0
                    ? (int) floor($availableQuantity / $requiredPerPack)
                    : 0;

                return "{$pack->name} can only be ordered up to {$maxPacks} pack(s) right now because {$productName} has {$formattedAvailable} item(s) available.";
            }
        }

        return null;
    }

    protected static function forPack(Pack $pack, Collection $products): array
    {
        if ($pack->items->isEmpty()) {
            return self::buildState(false, 'Out of Stock', 'This pack is not available because no products have been assigned to it yet.');
        }

        foreach ($pack->items as $item) {
            if (empty($item->product_id)) {
                return self::buildState(false, 'Out of Stock', 'This pack is not available because one of its products is missing.');
            }

            $product = $products->get((int) $item->product_id);
            $availableQuantity = (float) ($product?->branch_stock_quantity ?? 0);
            $requiredQuantity = (float) $item->quantity;

            if (!$product || $availableQuantity < $requiredQuantity) {
                $productName = $item->product?->name ?? $product?->name ?? 'one of the products in this pack';

                return self::buildState(false, 'Out of Stock', "{$productName} is out of stock for this pack.");
            }
        }

        return self::buildState(true, 'Available', null);
    }

    protected static function buildState(bool $isAvailable, string $label, ?string $message): array
    {
        return [
            'is_available' => $isAvailable,
            'availability_label' => $label,
            'availability_message' => $message,
        ];
    }
}
