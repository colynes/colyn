<?php

namespace App\Http\Controllers;

use App\Models\Pack;
use App\Models\Branch;
use App\Models\Product;
use App\Models\Promotion;
use App\Support\CartManager;
use App\Support\PackAvailability;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_type' => ['nullable', 'in:product,pack,promotion'],
            'item_id' => ['nullable', 'integer'],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'quantity'   => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $itemType = $validated['item_type'] ?? 'product';
        $itemId = (int) ($validated['item_id'] ?? $validated['product_id'] ?? 0);
        $quantity = $validated['quantity'] ?? 1;

        if ($itemType === 'product') {
            $product = Product::query()
                ->active()
                ->with('currentPrice')
                ->withSum('stocks as stock_quantity', 'quantity')
                ->findOrFail($itemId);

            if (!$product->currentPrice) {
                return back()->with('error', 'This product is not available for ordering right now.');
            }

            $currentLineQuantity = (int) (CartManager::raw()['product-' . $product->id]['quantity'] ?? 0);
            $requestedQuantity = $currentLineQuantity + $quantity;

            if (!$this->productCanBeFulfilled($product->id, $requestedQuantity)) {
                return back()->with('error', $this->limitedStockMessage($product));
            }

            CartManager::addProduct($product->id, $quantity);

            return back()->with('success', "{$product->name} added to cart.");
        }

        if ($itemType === 'pack') {
            $pack = Pack::query()->active()->with('items.product')->findOrFail($itemId);
            $currentLineQuantity = (int) (CartManager::raw()['pack-' . $pack->id]['quantity'] ?? 0);
            $requestedQuantity = $currentLineQuantity + $quantity;
            $stockMessage = $this->resolvePackStockMessage($pack, $requestedQuantity);

            if ($stockMessage) {
                return back()->with('error', $stockMessage);
            }

            CartManager::addItem('pack', $pack->id, $quantity);

            return back()->with('success', "{$pack->name} added to cart.");
        }

        $promotion = Promotion::query()->customerVisible()->findOrFail($itemId);
        CartManager::addItem('promotion', $promotion->id, $quantity);

        return back()->with('success', "{$promotion->title} added to cart.");
    }

    public function update(Request $request, string $lineId)
    {
        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:0', 'max:500'],
        ]);

        if (str_starts_with($lineId, 'product-') && $validated['quantity'] > 0) {
            $productId = (int) str_replace('product-', '', $lineId);
            $product = Product::query()
                ->active()
                ->with('currentPrice')
                ->withSum('stocks as stock_quantity', 'quantity')
                ->find($productId);

            if (!$product || !$product->currentPrice) {
                return back()->with('error', 'This product is not available for ordering right now.');
            }

            if (!$this->productCanBeFulfilled($product->id, (int) $validated['quantity'])) {
                return back()->with('error', $this->limitedStockMessage($product));
            }
        }

        if (str_starts_with($lineId, 'pack-') && $validated['quantity'] > 0) {
            $packId = (int) str_replace('pack-', '', $lineId);
            $pack = Pack::query()->active()->with('items.product')->find($packId);

            if (!$pack) {
                return back()->with('error', 'This pack is not available for ordering right now.');
            }

            $stockMessage = $this->resolvePackStockMessage($pack, (float) $validated['quantity']);

            if ($stockMessage) {
                return back()->with('error', $stockMessage);
            }
        }

        CartManager::update($lineId, $validated['quantity']);

        return back()->with('success', 'Cart updated successfully.');
    }

    public function destroy(string $lineId)
    {
        CartManager::remove($lineId);

        return back()->with('success', 'Item removed from cart.');
    }

    protected function activeBranches()
    {
        return Branch::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get();
    }

    protected function productCanBeFulfilled(int $productId, int $requestedQuantity): bool
    {
        if ($requestedQuantity <= 0) {
            return false;
        }

        foreach ($this->activeBranches() as $branch) {
            $availableQuantity = (float) (Product::query()
                ->withSum(['stocks as branch_stock_quantity' => fn ($query) => $query->where('branch_id', $branch->id)], 'quantity')
                ->whereKey($productId)
                ->value('branch_stock_quantity') ?? 0);

            if ($availableQuantity >= $requestedQuantity) {
                return true;
            }
        }

        return false;
    }

    protected function limitedStockMessage(Product $product): string
    {
        $availableQuantity = rtrim(rtrim(number_format($this->availableProductQuantityForCart($product->id), 2, '.', ''), '0'), '.');
        $unit = $product->unit ?: 'unit';

        return "Only {$availableQuantity} {$unit} of {$product->name} is available right now. Please adjust your quantity to continue your order.";
    }

    protected function availableProductQuantityForCart(int $productId): float
    {
        return $this->activeBranches()
            ->map(fn (Branch $branch) => (float) (Product::query()
                ->withSum(['stocks as branch_stock_quantity' => fn ($query) => $query->where('branch_id', $branch->id)], 'quantity')
                ->whereKey($productId)
                ->value('branch_stock_quantity') ?? 0))
            ->max() ?? 0.0;
    }

    protected function resolvePackStockMessage(Pack $pack, float $requestedQuantity): ?string
    {
        $branches = $this->activeBranches();

        if ($branches->isEmpty()) {
            return 'This pack is not available for ordering right now.';
        }

        $lastMessage = null;

        foreach ($branches as $branch) {
            $stockMessage = PackAvailability::insufficientStockMessage($pack, $branch->id, $requestedQuantity);

            if (!$stockMessage) {
                return null;
            }

            $lastMessage = $stockMessage;
        }

        return $lastMessage ?: 'This pack is not available for ordering right now.';
    }
}
