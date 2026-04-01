<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Product;
use App\Models\Category;
use App\Http\Requests\StoreProductRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductController extends Controller
{
    protected function ensureBackoffice(): void
    {
        abort_if(auth()->user()?->hasRole('Customer'), 403);
    }

    public function index(Request $request)
    {
        $this->ensureBackoffice();

        $products = Product::query()
            ->with(['category', 'currentPrice', 'stocks'])
            ->withSum('stocks as stock_quantity', 'quantity')
            ->when($request->search, fn($q) =>
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('sku', 'like', "%{$request->search}%"))
            ->when($request->category_id, fn($q) => $q->where('category_id', $request->category_id))
            ->when($request->status !== null && $request->status !== '', fn($q) =>
                $q->where('is_active', $request->status === 'active'))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString()
            ->through(function (Product $product) {
                $stockQuantity = (float) ($product->stock_quantity ?? 0);
                $lowStockAlert = (float) ($product->stocks->max('reorder_level') ?? 0);
                $status = $stockQuantity <= 0
                    ? 'Out of Stock'
                    : ($lowStockAlert > 0 && $stockQuantity <= $lowStockAlert ? 'Low Stock' : 'In Stock');

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'description' => $product->description,
                    'supplier_name' => $product->supplier_name,
                    'supplier_contact' => $product->supplier_contact,
                    'unit' => $product->unit,
                    'weight' => $product->weight,
                    'stock_quantity' => $stockQuantity,
                    'status' => $status,
                    'is_active' => (bool) $product->is_active,
                    'low_stock_alert' => $lowStockAlert,
                    'category' => $product->category ? [
                        'id' => $product->category->id,
                        'name' => $product->category->name,
                    ] : null,
                    'current_price' => $product->currentPrice ? [
                        'price' => (float) $product->currentPrice->price,
                        'promo_price' => $product->currentPrice->promo_price !== null ? (float) $product->currentPrice->promo_price : null,
                    ] : null,
                ];
            });

        $categories = Category::active()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Inventory/Products', [
            'products'   => $products,
            'categories' => $categories,
            'filters'    => $request->only(['search', 'category_id', 'status']),
        ]);
    }

    public function store(StoreProductRequest $request)
    {
        $this->ensureBackoffice();

        $validated = $request->validated();
        $product = Product::create(collect($validated)->except('low_stock_alert')->all());

        // Create initial price if provided
        if ($request->filled('price')) {
            $product->prices()->create([
                'price'          => $request->price,
                'promo_price'    => $request->promo_price,
                'effective_from' => now(),
            ]);
        }

        $this->syncLowStockAlert($product, $validated['low_stock_alert'] ?? null);

        return back()->with('success', 'Product created successfully.');
    }

    public function update(StoreProductRequest $request, Product $product)
    {
        $this->ensureBackoffice();

        $validated = $request->validated();

        $product->update(collect($validated)->except('low_stock_alert')->all());

        // Update/create pricing
        if ($request->filled('price')) {
            $product->prices()->updateOrCreate(
                ['effective_to' => null],
                ['price' => $request->price, 'promo_price' => $request->promo_price]
            );
        }

        $this->syncLowStockAlert($product, $validated['low_stock_alert'] ?? null);

        return back()->with('success', 'Product updated successfully.');
    }

    public function destroy(Product $product)
    {
        $this->ensureBackoffice();

        $product->delete();
        return back()->with('success', 'Product deleted.');
    }

    public function toggleStatus(Product $product)
    {
        $this->ensureBackoffice();

        $product->update(['is_active' => !$product->is_active]);
        return back()->with('success', 'Product status updated.');
    }

    protected function syncLowStockAlert(Product $product, mixed $threshold): void
    {
        if ($threshold === null || $threshold === '') {
            return;
        }

        $threshold = (float) $threshold;

        if ($product->stocks()->exists()) {
            $product->stocks()->update([
                'reorder_level' => $threshold,
                'min_stock' => $threshold,
            ]);

            return;
        }

        $branchId = Branch::query()->where('is_active', true)->value('id')
            ?? Branch::query()->value('id');

        if (! $branchId) {
            return;
        }

        $product->stocks()->create([
            'branch_id' => $branchId,
            'quantity' => 0,
            'min_stock' => $threshold,
            'reorder_level' => $threshold,
        ]);
    }
}
