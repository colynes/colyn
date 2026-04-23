<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Models\Branch;
use App\Models\Category;
use App\Models\PackItem;
use App\Models\Product;
use App\Models\Subscription;
use App\Models\SubscriptionItem;
use App\Models\SubscriptionRequest;
use App\Models\SubscriptionRequestItem;
use App\Models\User;
use App\Notifications\SystemAlertNotification;
use App\Support\BackofficeAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
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

        $perPage = max(1, min((int) $request->integer('per_page', 15), 100));

        $products = Product::query()
            ->with(['category', 'currentPrice'])
            ->withSum('stocks as stock_quantity', 'quantity')
            ->withMax('stocks as low_stock_alert', 'reorder_level')
            ->when($request->search, fn($q) =>
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('sku', 'like', "%{$request->search}%"))
            ->when($request->category_id, fn($q) => $q->where('category_id', $request->category_id))
            ->when($request->status !== null && $request->status !== '', fn($q) =>
                $q->where('is_active', $request->status === 'active'))
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (Product $product) {
                $stockQuantity = (float) ($product->stock_quantity ?? 0);
                $lowStockAlert = (float) ($product->low_stock_alert ?? 0);
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
            'filters'    => $request->only(['search', 'category_id', 'status', 'per_page']),
        ]);
    }

    public function store(StoreProductRequest $request)
    {
        $this->ensureBackoffice();

        $validated = $request->validated();
        $product = Product::create(collect($validated)->except(['low_stock_alert', 'stock_quantity'])->all());

        if ($request->filled('price')) {
            $product->prices()->create([
                'price'          => $request->price,
                'promo_price'    => $request->promo_price,
                'effective_from' => now(),
            ]);
        }

        $this->syncLowStockAlert($product, $validated['low_stock_alert'] ?? null);
        $this->syncStockQuantity($product, $validated['stock_quantity'] ?? null);
        $product->refresh()->load('stocks');
        $this->notifyInventoryStatusIfNeeded($product, null);

        return back()->with('success', 'Product created successfully.');
    }

    public function update(StoreProductRequest $request, Product $product)
    {
        $this->ensureBackoffice();

        $validated = $request->validated();
        $previousStatus = $this->inventoryStatus($product->load('stocks'));

        $product->update(collect($validated)->except(['low_stock_alert', 'stock_quantity'])->all());

        if ($request->filled('price')) {
            $currentPrice = $product->prices()->firstOrNew(['effective_to' => null]);

            if (! $currentPrice->exists) {
                $currentPrice->effective_from = now();
            }

            $currentPrice->price = $request->price;
            $currentPrice->promo_price = $request->promo_price;
            $currentPrice->save();
        }

        $this->syncLowStockAlert($product, $validated['low_stock_alert'] ?? null);
        $this->syncStockQuantity($product, $validated['stock_quantity'] ?? null);
        $product->refresh()->load('stocks');
        $this->notifyInventoryStatusIfNeeded($product, $previousStatus);

        return back()->with('success', 'Product updated successfully.');
    }

    public function destroy(Product $product)
    {
        $this->ensureBackoffice();

        if ($message = $this->blockingDeletionMessage($product)) {
            return back()->with('error', $message);
        }

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

    protected function syncStockQuantity(Product $product, mixed $quantity): void
    {
        if ($quantity === null || $quantity === '') {
            return;
        }

        $targetQuantity = max(0, (float) $quantity);
        $branchId = Branch::query()->where('is_active', true)->value('id')
            ?? Branch::query()->value('id');

        if (! $branchId) {
            return;
        }

        $targetStock = $product->stocks()->firstOrCreate(
            ['branch_id' => $branchId],
            [
                'quantity' => 0,
                'min_stock' => 0,
                'reorder_level' => 0,
            ],
        );

        $targetStock->update(['quantity' => $targetQuantity]);

        $product->stocks()
            ->where('id', '!=', $targetStock->id)
            ->update(['quantity' => 0]);
    }

    protected function inventoryStatus(Product $product): string
    {
        $quantity = (float) ($product->stocks->sum('quantity') ?? 0);
        $threshold = (float) ($product->stocks->max('reorder_level') ?? 0);

        if ($quantity <= 0) {
            return 'out_of_stock';
        }

        if ($threshold > 0 && $quantity <= $threshold) {
            return 'low_stock';
        }

        return 'in_stock';
    }

    protected function notifyInventoryStatusIfNeeded(Product $product, ?string $previousStatus): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        $status = $this->inventoryStatus($product);

        if (!in_array($status, ['low_stock', 'out_of_stock'], true)) {
            return;
        }

        if ($previousStatus === $status) {
            return;
        }

        $title = $status === 'out_of_stock' ? 'Out of stock' : 'Low stock';
        $message = $status === 'out_of_stock'
            ? $product->name . ' is now out of stock.'
            : $product->name . ' stock is running low.';

        BackofficeAccess::usersQuery()
            ->get()
            ->each(fn (User $user) => $user->notify(new SystemAlertNotification([
                'title' => $title,
                'message' => $message,
                'kind' => $status,
                'status' => $status,
                'action_url' => '/inventory/products',
            ])));
    }

    protected function blockingDeletionMessage(Product $product): ?string
    {
        $dependencies = [];

        if (Schema::hasTable('pack_items')) {
            $packNames = PackItem::query()
                ->with('pack:id,name')
                ->where('product_id', $product->id)
                ->get()
                ->pluck('pack.name')
                ->filter()
                ->unique()
                ->values();

            if ($packNames->isNotEmpty()) {
                $preview = $packNames->take(2)->implode(', ');
                $extra = $packNames->count() > 2 ? ', +' . ($packNames->count() - 2) . ' more' : '';
                $dependencies[] = $packNames->count() === 1
                    ? 'pack ' . $preview
                    : $packNames->count() . ' packs (' . $preview . $extra . ')';
            }
        }

        if (Schema::hasTable('subscription_items') && Schema::hasTable('subscriptions')) {
            $subscriptionCount = SubscriptionItem::query()
                ->join('subscriptions', 'subscriptions.id', '=', 'subscription_items.subscription_id')
                ->where('subscription_items.product_id', $product->id)
                ->whereIn('subscriptions.status', [
                    Subscription::STATUS_ACTIVE,
                    Subscription::STATUS_PAUSED,
                ])
                ->distinct()
                ->count('subscriptions.id');

            if ($subscriptionCount > 0) {
                $dependencies[] = $subscriptionCount . ' live ' . $this->pluralize($subscriptionCount, 'subscription');
            }
        }

        if (Schema::hasTable('subscription_request_items') && Schema::hasTable('subscription_requests')) {
            $requestCount = SubscriptionRequestItem::query()
                ->join('subscription_requests', 'subscription_requests.id', '=', 'subscription_request_items.subscription_request_id')
                ->where('subscription_request_items.product_id', $product->id)
                ->whereIn('subscription_requests.status', [
                    SubscriptionRequest::STATUS_PENDING_REVIEW,
                    SubscriptionRequest::STATUS_QUOTED,
                ])
                ->distinct()
                ->count('subscription_requests.id');

            if ($requestCount > 0) {
                $dependencies[] = $requestCount . ' open ' . $this->pluralize($requestCount, 'subscription request');
            }
        }

        if ($dependencies === []) {
            return null;
        }

        return 'Cannot delete ' . $product->name . ' because it is still used in '
            . $this->naturalLanguageList($dependencies)
            . '. Remove it from those live records first.';
    }

    protected function pluralize(int $count, string $singular, ?string $plural = null): string
    {
        return $count === 1 ? $singular : ($plural ?? $singular . 's');
    }

    protected function naturalLanguageList(array $items): string
    {
        $items = array_values(array_filter($items));

        if ($items === []) {
            return '';
        }

        if (count($items) === 1) {
            return $items[0];
        }

        $lastItem = array_pop($items);

        return implode(', ', $items) . ' and ' . $lastItem;
    }
}
