<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use App\Http\Requests\StoreProductRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::query()
            ->with(['category', 'currentPrice', 'stocks'])
            ->when($request->search, fn($q) =>
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('sku', 'like', "%{$request->search}%"))
            ->when($request->category_id, fn($q) => $q->where('category_id', $request->category_id))
            ->when($request->status !== null && $request->status !== '', fn($q) =>
                $q->where('is_active', $request->status === 'active'))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $categories = Category::active()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Inventory/Products', [
            'products'   => $products,
            'categories' => $categories,
            'filters'    => $request->only(['search', 'category_id', 'status']),
        ]);
    }

    public function store(StoreProductRequest $request)
    {
        $product = Product::create($request->validated());

        // Create initial price if provided
        if ($request->filled('price')) {
            $product->prices()->create([
                'price'          => $request->price,
                'promo_price'    => $request->promo_price,
                'effective_from' => now(),
            ]);
        }

        return back()->with('success', 'Product created successfully.');
    }

    public function update(StoreProductRequest $request, Product $product)
    {
        $product->update($request->validated());

        // Update/create pricing
        if ($request->filled('price')) {
            $product->prices()->updateOrCreate(
                ['effective_to' => null],
                ['price' => $request->price, 'promo_price' => $request->promo_price]
            );
        }

        return back()->with('success', 'Product updated successfully.');
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return back()->with('success', 'Product deleted.');
    }

    public function toggleStatus(Product $product)
    {
        $product->update(['is_active' => !$product->is_active]);
        return back()->with('success', 'Product status updated.');
    }
}
