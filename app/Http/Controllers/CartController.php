<?php

namespace App\Http\Controllers;

use App\Models\Pack;
use App\Models\Product;
use App\Models\Promotion;
use App\Support\CartManager;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'item_type' => ['nullable', 'in:product,pack,promotion'],
            'item_id' => ['nullable', 'integer'],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'quantity'   => ['nullable', 'integer', 'min:1'],
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

            if ($requestedQuantity > (float) ($product->stock_quantity ?? 0)) {
                return back()->with('error', 'Only ' . rtrim(rtrim(number_format((float) ($product->stock_quantity ?? 0), 2, '.', ''), '0'), '.') . ' unit(s) of ' . $product->name . ' are available right now.');
            }

            CartManager::addProduct($product->id, $quantity);

            return back()->with('success', "{$product->name} added to cart.");
        }

        if ($itemType === 'pack') {
            $pack = Pack::query()->active()->findOrFail($itemId);
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
            'quantity' => ['required', 'integer', 'min:0'],
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

            if ($validated['quantity'] > (float) ($product->stock_quantity ?? 0)) {
                return back()->with('error', 'Only ' . rtrim(rtrim(number_format((float) ($product->stock_quantity ?? 0), 2, '.', ''), '0'), '.') . ' unit(s) of ' . $product->name . ' are available right now.');
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
}
