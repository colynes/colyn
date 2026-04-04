<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Pack;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\User;
use App\Notifications\SystemAlertNotification;
use App\Support\CartManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CommerceController extends Controller
{
    public function products(Request $request)
    {
        $activeCategory = null;

        if ($request->filled('category')) {
            $activeCategory = Category::query()
                ->active()
                ->where('slug', $request->string('category'))
                ->first(['id', 'name', 'slug']);
        }

        $categories = Category::query()
            ->active()
            ->withCount(['products' => fn ($query) => $query->active()])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);

        $products = Product::query()
            ->active()
            ->with(['category', 'currentPrice', 'stocks'])
            ->withSum('stocks as stock_quantity', 'quantity')
            ->when($activeCategory, fn ($query) => $query->where('category_id', $activeCategory->id))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search');
                $query->where(function ($builder) use ($search) {
                    $builder
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->paginate(12)
            ->withQueryString()
            ->through(function (Product $product) {
                $stockQuantity = (float) ($product->stock_quantity ?? 0);
                $lowStockAlert = (float) ($product->stocks()->max('reorder_level') ?? 0);
                $status = $stockQuantity <= 0
                    ? 'Out of Stock'
                    : ($lowStockAlert > 0 && $stockQuantity <= $lowStockAlert ? 'Low Stock' : 'In Stock');

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'description' => $product->description ?: 'Prepared fresh and ready for your next order.',
                    'category' => $product->category?->name,
                    'category_slug' => $product->category?->slug,
                    'unit' => $product->unit,
                    'sku' => $product->sku,
                    'price' => (float) ($product->currentPrice?->promo_price ?? $product->currentPrice?->price ?? 0),
                    'stock_quantity' => $stockQuantity,
                    'status' => $status,
                ];
            });

        $hasPackItemsTable = Schema::hasTable('pack_items');
        $hasComesWithColumn = Schema::hasColumn('packs', 'comes_with');

        $packsQuery = Pack::query()
            ->active();

        if ($hasPackItemsTable) {
            $packsQuery->with(['items.product:id,name,unit']);
        }

        return Inertia::render('Products', [
            'categories' => $categories,
            'products' => $products,
            'filters' => $request->only(['search', 'category', 'section']),
            'activeCategory' => $activeCategory,
            'cart' => CartManager::summary(),
            'featuredPromotions' => Promotion::query()
                ->active()
                ->latest('starts_at')
                ->take(3)
                ->get()
                ->map(fn (Promotion $promotion) => [
                    'id' => $promotion->id,
                    'title' => $promotion->title,
                    'description' => $promotion->description,
                    'discount_label' => $promotion->discount_label,
                    'cta_text' => $promotion->cta_text ?: 'Order now',
                    'expires_at' => optional($promotion->ends_at)->toDateString(),
                ]),
            'packs' => $packsQuery
                ->orderBy('name')
                ->take(6)
                ->get()
                ->map(function (Pack $pack) use ($hasPackItemsTable, $hasComesWithColumn) {
                    $comesWith = $hasComesWithColumn ? $pack->comes_with : null;

                    return [
                        'id' => $pack->id,
                        'name' => $pack->name,
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
                }),
        ]);
    }

    public function cart()
    {
        return Inertia::render('Cart', [
            'cart' => CartManager::summary(),
        ]);
    }

    public function promotions()
    {
        $promotions = Promotion::query()
            ->active()
            ->latest('starts_at')
            ->get()
            ->map(fn (Promotion $promotion) => [
                'id' => $promotion->id,
                'title' => $promotion->title,
                'description' => $promotion->description,
                'discount_label' => $promotion->discount_label,
                'cta_text' => $promotion->cta_text ?: 'Order now',
                'starts_at' => optional($promotion->starts_at)->toFormattedDateString(),
                'ends_at' => optional($promotion->ends_at)->toFormattedDateString(),
                'is_active' => $promotion->is_active,
            ]);

        return Inertia::render('Promotions', [
            'promotions' => $promotions,
            'cart' => CartManager::summary(),
        ]);
    }

    public function packs()
    {
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

        return Inertia::render('Packs', [
            'packs' => $packs,
            'cart' => CartManager::summary(),
        ]);
    }

    public function profile(Request $request)
    {
        $user = $request->user();
        $customer = $this->resolveCustomer($user);
        abort_unless($customer, 403);

        $customer->load(['defaultAddress', 'orders.items.product', 'orders.deliveries', 'orders.payments']);

        return Inertia::render('Profile', [
            'profileMeta' => [
                'status' => $customer->status,
                'loyalty_points' => $customer->loyalty_points ?? 0,
                'default_address' => $customer->defaultAddress ? [
                    'address_line1' => $customer->defaultAddress->address_line1,
                    'address_line2' => $customer->defaultAddress->address_line2,
                    'city' => $customer->defaultAddress->city,
                    'postal_code' => $customer->defaultAddress->postal_code,
                    'phone' => $customer->defaultAddress->phone,
                ] : null,
            ],
            'orders' => $customer->orders()
                ->with(['items.product', 'deliveries', 'payments'])
                ->latest()
                ->take(8)
                ->get()
                ->map(fn (Order $order) => $this->mapOrder($order)),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $customer = $this->resolveCustomer($user);
        abort_unless($customer, 403);

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['required', 'string', 'max:30'],
            'city' => ['required', 'string', 'max:255'],
            'country' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:1000'],
            'postal_code' => ['nullable', 'string', 'max:40'],
            'avatar' => ['nullable', 'image', 'max:4096'],
        ]);

        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }

            $validated['avatar'] = $request->file('avatar')->store('profile', 'public');
        }

        $user->update([
            'name' => $validated['full_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'],
            'city' => $validated['city'],
            'country' => $validated['country'],
            'avatar' => $validated['avatar'] ?? $user->avatar,
        ]);

        $customer->update([
            'full_name' => $validated['full_name'],
            'phone' => $validated['phone'],
            'email' => $validated['email'],
            'address' => $validated['address'],
        ]);

        CustomerAddress::updateOrCreate(
            ['customer_id' => $customer->id, 'is_default' => true],
            [
                'address_line1' => $validated['address'],
                'city' => $validated['city'] ?? null,
                'postal_code' => $validated['postal_code'] ?? null,
                'phone' => $validated['phone'],
            ]
        );

        return back()->with('success', 'Profile updated successfully.');
    }

    public function tracking(Request $request)
    {
        $customer = $this->resolveCustomer($request->user());

        if (!$customer && !$request->filled('order')) {
            return Inertia::render('OrderTracking', [
                'orders' => [],
                'filters' => $request->only('order'),
            ]);
        }

        $ordersQuery = Order::query()
            ->with(['customer', 'items.product', 'deliveries', 'payments'])
            ->latest();

        if ($customer) {
            $ordersQuery->where('customer_id', $customer->id);
        }

        if ($request->filled('order')) {
            $orderFilter = $request->string('order');
            $ordersQuery->where(function ($query) use ($orderFilter) {
                $query
                    ->where('order_number', 'like', "%{$orderFilter}%")
                    ->orWhereHas('deliveries', fn ($deliveryQuery) => $deliveryQuery->where('tracking_number', 'like', "%{$orderFilter}%"));
            });
        }

        $orders = $ordersQuery->take(10)->get()->map(fn (Order $order) => $this->mapOrder($order));

        return Inertia::render('OrderTracking', [
            'orders' => $orders,
            'filters' => $request->only('order'),
        ]);
    }

    public function cancelOrder(Request $request, Order $order)
    {
        $customer = $this->resolveCustomer($request->user());
        abort_unless($customer && $order->customer_id === $customer->id, 403);
        abort_unless($this->normalizeOrderStatus($order->status) === 'pending', 422, 'Only pending orders can be cancelled.');

        DB::transaction(function () use ($order) {
            $order->update(['status' => 'cancelled']);
            $order->deliveries()->update(['status' => 'cancelled']);
        });

        $order->refresh();
        $this->notifyBackofficeAboutCustomerOrderEvent($order, 'Order cancelled by customer', 'Order ' . $this->displayOrderNumber($order->order_number) . ' was cancelled by the customer.', 'order_cancelled');

        return back()->with('success', 'Order cancelled successfully.');
    }

    public function confirmDelivery(Request $request, Order $order)
    {
        $customer = $this->resolveCustomer($request->user());
        abort_unless($customer && $order->customer_id === $customer->id, 403);
        abort_unless($this->normalizeOrderStatus($order->status) === 'dispatched', 422, 'Only dispatched orders can be marked as delivered.');

        DB::transaction(function () use ($order) {
            $order->update(['status' => 'delivered']);
            $order->deliveries()->update(['status' => 'delivered']);
        });

        $order->refresh();
        $this->notifyBackofficeAboutCustomerOrderEvent($order, 'Order delivered', 'Order ' . $this->displayOrderNumber($order->order_number) . ' was marked as delivered.', 'order_delivered');

        return back()->with('success', 'Order marked as delivered.');
    }

    protected function mapOrder(Order $order): array
    {
        $delivery = $order->deliveries->sortByDesc('created_at')->first();
        $payment = $order->payments->sortByDesc('created_at')->first();
        $status = $this->normalizeOrderStatus($order->status);

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'display_order_number' => $this->displayOrderNumber($order->order_number),
            'customer' => $order->customer?->full_name,
            'status' => $status,
            'created_at' => optional($order->created_at)->toDayDateTimeString(),
            'total' => (float) $order->total,
            'payment_method' => $order->payment_method,
            'is_paid' => (bool) $order->is_paid,
            'notes' => $order->notes,
            'can_cancel' => $status === 'pending',
            'can_mark_delivered' => $status === 'dispatched',
            'location' => [
                'region_city' => $order->delivery_region,
                'district_area' => $order->delivery_area,
                'delivery_address' => $order->delivery_address,
                'landmark' => $order->delivery_landmark,
                'delivery_phone' => $order->delivery_phone,
                'fulfillment_method' => $order->fulfillment_method,
                'pickup_time' => $order->pickup_time,
            ],
            'items' => $order->items->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->displayName(),
                'quantity' => (float) $item->quantity,
                'subtotal' => (float) $item->subtotal,
            ])->values(),
            'delivery' => $delivery ? [
                'number' => $delivery->delivery_number,
                'status' => $this->normalizeDeliveryStatus($delivery->status),
                'tracking_number' => $delivery->tracking_number,
                'delivery_fee' => (float) $delivery->delivery_fee,
            ] : null,
            'payment' => $payment ? [
                'status' => $payment->status,
                'method' => $payment->method,
                'transaction_id' => $payment->transaction_id,
                'amount' => (float) $payment->amount,
            ] : null,
            'timeline' => $this->buildTimeline($order, $delivery, $payment),
        ];
    }


    protected function buildTimeline(Order $order, $delivery, $payment): array
    {
        $status = $this->normalizeOrderStatus($order->status);
        $deliveryStatus = $delivery ? $this->normalizeDeliveryStatus($delivery->status) : null;

        return [
            [
                'label' => 'Order pending',
                'description' => 'Your order has been placed and is waiting for dispatch.',
                'completed' => true,
            ],
            [
                'label' => 'Payment status',
                'description' => $payment ? ucfirst($payment->status) . ' via ' . str_replace('_', ' ', $payment->method) : 'Awaiting payment confirmation.',
                'completed' => (bool) $payment,
            ],
            [
                'label' => 'Order dispatched',
                'description' => in_array($status, ['dispatched', 'delivered'], true)
                    ? 'The order is on the way with the delivery person.'
                    : ($status === 'cancelled' ? 'The order was cancelled before dispatch.' : 'Waiting to be dispatched.'),
                'completed' => in_array($status, ['dispatched', 'delivered'], true),
            ],
            [
                'label' => 'Delivery progress',
                'description' => $delivery
                    ? 'Current delivery status: ' . ucfirst(str_replace('_', ' ', $deliveryStatus)) . '.'
                    : ($status === 'dispatched' ? 'Delivery has been dispatched.' : 'Delivery details will appear here once assigned.'),
                'completed' => in_array($status, ['dispatched', 'delivered'], true),
            ],
            [
                'label' => $status === 'cancelled' ? 'Order cancelled' : 'Order delivered',
                'description' => $status === 'delivered'
                    ? 'Order delivered successfully.'
                    : ($status === 'cancelled' ? 'This order was cancelled.' : 'Waiting for final delivery confirmation.'),
                'completed' => in_array($status, ['delivered', 'cancelled'], true),
            ],
        ];
    }

    protected function normalizeOrderStatus(?string $status): string
    {
        return match (strtolower((string) $status)) {
            'processing', 'preparing', 'confirmed' => 'pending',
            'delivered', 'completed' => 'delivered',
            'cancelled', 'canceled' => 'cancelled',
            'dispatched' => 'dispatched',
            default => 'pending',
        };
    }

    protected function normalizeDeliveryStatus(?string $status): string
    {
        return match (strtolower((string) $status)) {
            'in_transit', 'ready_for_pickup' => 'dispatched',
            'delivered' => 'delivered',
            'cancelled', 'canceled' => 'cancelled',
            default => 'pending',
        };
    }

    protected function resolveCustomer($user): ?Customer
    {
        if (!$user) {
            return null;
        }

        if ($user->customer) {
            return $user->customer;
        }

        $roles = $user->getRoleNames()->map(fn ($role) => strtolower($role));

        if (!$roles->contains('customer')) {
            return null;
        }

        return Customer::create([
            'user_id' => $user->id,
            'full_name' => $user->name,
            'phone' => '',
            'email' => $user->email,
            'address' => '',
            'status' => 'Active',
        ]);
    }

    protected function notifyBackofficeAboutCustomerOrderEvent(Order $order, string $title, string $message, string $kind): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        User::role(['administrator', 'admin', 'manager', 'staff', 'Administrator', 'Manager', 'Staff'])
            ->get()
            ->each(fn (User $user) => $user->notify(new SystemAlertNotification([
                'title' => $title,
                'message' => $message,
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'display_order_number' => $this->displayOrderNumber($order->order_number),
                'status' => (string) $order->status,
                'amount' => (float) $order->total,
                'action_url' => '/orders',
                'kind' => $kind,
            ])));
    }

    protected function displayOrderNumber(?string $orderNumber): string
    {
        $value = preg_replace('/^ORD-?/i', '', (string) $orderNumber);

        if (preg_match('/^(\d{8})\d{6}(\d{3})$/', $value, $matches)) {
            return $matches[1] . $matches[2];
        }

        return $value;
    }
}





