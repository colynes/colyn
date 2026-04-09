<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\Pack;
use App\Models\Product;
use App\Models\User;
use App\Notifications\NewOrderPlacedNotification;
use App\Support\BackofficeAccess;
use App\Support\CartManager;
use App\Support\PackAvailability;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Session;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CheckoutController extends Controller
{
    public function create(Request $request)
    {
        $cart = CartManager::summary();

        if ($cart['line_count'] === 0) {
            return redirect()->route('home')->with('error', 'Add items to your cart before checkout.');
        }

        $user = $request->user();
        $customer = $user?->customer;
        $pickupConfig = $this->pickupConfig();
        $oldInput = $request->session()->getOldInput();

        $formData = [
            'full_name' => $customer->full_name ?? $user?->name ?? '',
            'phone' => $customer->phone ?? '',
            'email' => $customer->email ?? $user?->email ?? '',
            'region_city' => $customer->defaultAddress?->city ?? '',
            'district_area' => '',
            'delivery_address' => $customer->defaultAddress?->address_line1 ?? $customer?->address ?? '',
            'delivery_latitude' => '',
            'delivery_longitude' => '',
            'delivery_notes' => $customer->defaultAddress?->address_line2 ?? '',
            'fulfillment_method' => 'delivery',
            'pickup_time' => '',
        ];

        foreach (array_keys($formData) as $key) {
            if (array_key_exists($key, $oldInput)) {
                $formData[$key] = $oldInput[$key];
            }
        }

        return Inertia::render('Checkout', [
            'cart'     => $cart,
            'customer' => $customer ? [
                'full_name' => $customer->full_name ?: $user->name,
                'phone'     => $customer->phone,
                'email'     => $customer->email ?: $user->email,
                'region_city' => $customer->defaultAddress?->city,
                'district_area' => null,
                'delivery_address' => $customer->defaultAddress?->address_line1 ?: $customer->address,
                'delivery_notes' => $customer->defaultAddress?->address_line2,
                'delivery_latitude' => null,
                'delivery_longitude' => null,
            ] : null,
            'formData' => $formData,
            'pickupHours' => [
                'open_time' => $pickupConfig['open_time'],
                'close_time' => $pickupConfig['close_time'],
                'min_time' => $pickupConfig['min_time'],
                'available' => $pickupConfig['available'],
                'scheduled_date' => $pickupConfig['scheduled_date']?->toDateString(),
                'scheduled_date_label' => $pickupConfig['scheduled_date']?->toFormattedDateString(),
                'after_closing_hours' => $pickupConfig['after_closing_hours'],
            ],
            'deliverySchedule' => $this->deliveryScheduleSummary($pickupConfig['close_time']),
            'pickupSchedule' => $this->pickupScheduleSummary($pickupConfig),
        ]);
    }

    public function store(Request $request)
    {
        $cart = CartManager::summary();

        if ($cart['line_count'] === 0) {
            return redirect()->route('home')->with('error', 'Your cart is empty.');
        }

        $user = $request->user();

        if (!$user) {
            $existingUser = User::query()
                ->where('email', $request->input('email'))
                ->first();

            $existingCustomer = Customer::query()
                ->where('email', $request->input('email'))
                ->orWhere('phone', $request->input('phone'))
                ->first();

            if ($existingUser || $existingCustomer) {
                Session::put('url.intended', route('checkout'));

                return redirect()
                    ->route('login')
                    ->with('error', 'An account with these details already exists. Please log in first, then complete your order.');
            }
        }

        $rules = [
            'full_name'          => ['required', 'string', 'max:255'],
            'phone'              => [
                'required',
                'string',
                'max:30',
                Rule::unique('customers', 'phone')->ignore($user?->customer?->id),
            ],
            'email'              => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user?->id),
                Rule::unique('customers', 'email')->ignore($user?->customer?->id),
            ],
            'region_city'        => ['nullable', 'string', 'max:255'],
            'district_area'      => ['nullable', 'string', 'max:255'],
            'delivery_address'   => ['nullable', 'string', 'max:1000', 'required_if:fulfillment_method,delivery'],
            'delivery_latitude'  => ['nullable', 'numeric', 'between:-90,90'],
            'delivery_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'delivery_notes'     => ['nullable', 'string', 'max:1000'],
            'fulfillment_method' => ['required', 'in:delivery,pickup'],
            'pickup_time'        => ['nullable', 'string', 'max:255', 'required_if:fulfillment_method,pickup'],
            'password'           => $user ? ['nullable'] : ['required', 'string', 'min:8', 'confirmed'],
        ];

        $validated = $request->validate($rules);
        $pickupConfig = $this->pickupConfig();

        if (($validated['fulfillment_method'] ?? null) === 'delivery' && blank($validated['delivery_address'] ?? null)) {
            return back()->withErrors([
                'delivery_address' => 'Please enter your delivery address before confirming the order.',
            ])->withInput();
        }

        if (($validated['fulfillment_method'] ?? null) === 'pickup') {
            $request->validate([
                'pickup_time' => ['required', 'date_format:H:i'],
            ]);

            if (!$this->isPickupTimeWithinWindow($validated['pickup_time'], $pickupConfig['min_time'], $pickupConfig['close_time'])) {
                return back()->withErrors([
                    'pickup_time' => 'Pickup time must be between the current available time and closing hours.',
                ])->withInput();
            }
        }

        [$branch, $insufficientStockMessage] = $this->resolveFulfillmentBranch($cart['items']);

        if (!$branch || $insufficientStockMessage) {
            return back()->with('error', $insufficientStockMessage)->withInput();
        }

        $deliveryScheduleDate = $this->resolveScheduledDeliveryDate(
            $validated['fulfillment_method'] ?? null,
            $pickupConfig['close_time']
        );
        $pickupScheduleDate = $this->resolveScheduledPickupDate(
            $validated['fulfillment_method'] ?? null,
            $pickupConfig
        );

        $order = DB::transaction(function () use ($validated, $cart, $user, $branch, $deliveryScheduleDate, $pickupScheduleDate) {
            if (!$user) {
                $user = User::create([
                    'name'     => $validated['full_name'],
                    'email'    => $validated['email'],
                    'password' => $validated['password'],
                ]);

                $user->assignRole('Customer');
            } else {
                $user->update([
                    'name'  => $validated['full_name'],
                    'email' => $validated['email'],
                ]);
            }

            $customer = Customer::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'full_name' => $validated['full_name'],
                    'phone'     => $validated['phone'],
                    'email'     => $validated['email'],
                    'address'   => $validated['delivery_address'] ?? $user->customer?->address,
                    'status'    => 'Active',
                ]
            );

            if (!empty($validated['delivery_address'])) {
                CustomerAddress::updateOrCreate(
                    ['customer_id' => $customer->id, 'is_default' => true],
                    [
                        'address_line1' => $validated['delivery_address'],
                        'address_line2' => $validated['delivery_notes'] ?? null,
                        'city' => $validated['region_city'] ?? null,
                        'postal_code' => $validated['district_area'] ?? null,
                        'phone' => $validated['phone'],
                    ]
                );
            }

            $order = Order::create([
                'order_number'   => $this->generateDailyOrderNumber(),
                'customer_id'    => $customer->id,
                'branch_id'      => $branch->id,
                'status'         => 'pending',
                'subtotal'       => $cart['subtotal'],
                'tax'            => 0,
                'total'          => $cart['subtotal'],
                'payment_method' => 'Pending Payment',
                'delivery_region' => $validated['region_city'] ?? null,
                'delivery_area' => $validated['district_area'] ?? null,
                'delivery_address' => $validated['delivery_address'] ?? null,
                'delivery_landmark' => $validated['delivery_notes'] ?? null,
                'delivery_notes' => $validated['delivery_notes'] ?? null,
                'delivery_latitude' => $validated['delivery_latitude'] ?? null,
                'delivery_longitude' => $validated['delivery_longitude'] ?? null,
                'delivery_phone' => $validated['phone'],
                'fulfillment_method' => $validated['fulfillment_method'],
                'pickup_time' => $validated['pickup_time'] ?? null,
                'scheduled_delivery_date' => $deliveryScheduleDate,
                'scheduled_pickup_date' => $pickupScheduleDate,
                'is_paid'        => false,
                'notes'          => $this->buildOrderNotes($validated),
            ]);

            foreach ($cart['items'] as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'] ?? null,
                    'quantity'   => $item['quantity'],
                    'price'      => $item['price'],
                    'unit_price' => $item['price'],
                    'subtotal'   => $item['subtotal'],
                    'notes'      => $item['item_type'] === 'product' ? null : json_encode([
                        'type' => $item['item_type'],
                        'item_id' => $item['item_id'],
                        'name' => $item['name'],
                        'description' => $item['description'],
                        'category' => $item['category'],
                        'unit' => $item['unit'],
                    ]),
                ]);
            }

            return [$order, $user];
        });

        [$createdOrder, $customerUser] = $order;

        if (!$request->user()) {
            Auth::login($customerUser);
            $request->session()->regenerate();
        }

        $this->notifyBackofficeUsers($createdOrder);

        CartManager::clear();

        return redirect()
            ->route('my-orders')
            ->with('success', 'Order ' . $this->displayOrderNumber($createdOrder->order_number) . ' placed successfully and sent to staff.');
    }

    protected function buildOrderNotes(array $validated): string
    {
        $notes = ['Fulfillment: ' . ucfirst($validated['fulfillment_method'])];

        if (($validated['fulfillment_method'] ?? null) === 'delivery') {
            $scheduledDeliveryDate = $this->resolveScheduledDeliveryDate(
                $validated['fulfillment_method'] ?? null,
                $this->pickupConfig()['close_time']
            );

            $notes[] = 'Region/City: ' . ($validated['region_city'] ?? 'N/A');
            $notes[] = 'District/Area: ' . ($validated['district_area'] ?? 'N/A');
            $notes[] = 'Address: ' . ($validated['delivery_address'] ?? 'N/A');
            $notes[] = 'Scheduled Delivery Date: ' . optional($scheduledDeliveryDate)->toFormattedDateString();

            if (!empty($validated['delivery_notes'])) {
                $notes[] = 'Delivery Notes: ' . $validated['delivery_notes'];
            }

            if (!empty($validated['delivery_latitude']) && !empty($validated['delivery_longitude'])) {
                $notes[] = 'Coordinates: ' . $validated['delivery_latitude'] . ', ' . $validated['delivery_longitude'];
            }
        }

        if (($validated['fulfillment_method'] ?? null) === 'pickup' && !empty($validated['pickup_time'])) {
            $scheduledPickupDate = $this->resolveScheduledPickupDate(
                $validated['fulfillment_method'] ?? null,
                $this->pickupConfig()
            );

            $notes[] = 'Pickup Time: ' . $validated['pickup_time'];
            $notes[] = 'Scheduled Pickup Date: ' . optional($scheduledPickupDate)->toFormattedDateString();
        }

        return implode(PHP_EOL, $notes);
    }

    protected function generateDailyOrderNumber(): string
    {
        $prefix = now()->format('Ymd');
        $latestToday = Order::query()
            ->where('order_number', 'like', $prefix . '%')
            ->orderByDesc('order_number')
            ->value('order_number');

        $lastSequence = $latestToday ? (int) substr($latestToday, -3) : 0;

        return $prefix . str_pad((string) ($lastSequence + 1), 3, '0', STR_PAD_LEFT);
    }

    protected function displayOrderNumber(?string $orderNumber): string
    {
        $value = preg_replace('/^ORD-?/i', '', (string) $orderNumber);

        if (preg_match('/^(\d{8})\d{6}(\d{3})$/', $value, $matches)) {
            return $matches[1] . $matches[2];
        }

        return $value;
    }

    protected function pickupConfig(): array
    {
        $openTime = '08:00';
        $closeTime = '20:00';

        if (Schema::hasTable('app_settings')) {
            $openTime = AppSetting::getValue('pickup_open_time', $openTime);
            $closeTime = AppSetting::getValue('pickup_close_time', $closeTime);
        }

        $scheduledDate = $this->resolvePickupScheduleDate($openTime, $closeTime);
        $minimumTime = $this->pickupMinimumTime($openTime, $closeTime);

        return [
            'open_time' => $openTime,
            'close_time' => $closeTime,
            'min_time' => $minimumTime,
            'available' => $minimumTime !== null,
            'scheduled_date' => $scheduledDate,
            'after_closing_hours' => $scheduledDate?->isSameDay(today()->addDay()) ?? false,
        ];
    }

    protected function pickupMinimumTime(string $openTime, string $closeTime): ?string
    {
        $today = now();
        $opening = today()->setTimeFromTimeString($openTime);
        $closing = today()->setTimeFromTimeString($closeTime);

        if ($closing->lte($opening)) {
            return null;
        }

        if ($today->greaterThan($closing)) {
            return $openTime;
        }

        $start = $today->copy()->greaterThan($opening)
            ? $this->roundToNextMinute($today->copy())
            : $opening->copy();

        if ($start->gte($closing)) {
            return null;
        }

        return $start->format('H:i');
    }

    protected function roundToNextMinute($dateTime)
    {
        $seconds = (int) $dateTime->format('s');

        if ($seconds === 0) {
            return $dateTime->setSecond(0);
        }

        return $dateTime->addMinute()->setSecond(0);
    }

    protected function isPickupTimeWithinWindow(string $pickupTime, ?string $minimumTime, string $closeTime): bool
    {
        if (!$minimumTime) {
            return false;
        }

        $selected = today()->setTimeFromTimeString($pickupTime);
        $minimum = today()->setTimeFromTimeString($minimumTime);
        $closing = today()->setTimeFromTimeString($closeTime);

        return $selected->greaterThanOrEqualTo($minimum) && $selected->lessThanOrEqualTo($closing);
    }

    protected function resolveScheduledDeliveryDate(?string $fulfillmentMethod, string $closeTime)
    {
        if ($fulfillmentMethod !== 'delivery') {
            return null;
        }

        $now = now();
        $closing = today()->setTimeFromTimeString($closeTime);

        return $now->greaterThan($closing)
            ? today()->addDay()
            : today();
    }

    protected function resolveScheduledPickupDate(?string $fulfillmentMethod, array $pickupConfig)
    {
        if ($fulfillmentMethod !== 'pickup') {
            return null;
        }

        return $pickupConfig['scheduled_date'] ?? null;
    }

    protected function resolvePickupScheduleDate(string $openTime, string $closeTime)
    {
        $today = now();
        $opening = today()->setTimeFromTimeString($openTime);
        $closing = today()->setTimeFromTimeString($closeTime);

        if ($closing->lte($opening)) {
            return null;
        }

        return $today->greaterThan($closing)
            ? today()->addDay()
            : today();
    }

    protected function deliveryScheduleSummary(string $closeTime): array
    {
        $scheduledDate = $this->resolveScheduledDeliveryDate('delivery', $closeTime);
        $isNextDay = $scheduledDate?->isSameDay(today()->addDay()) ?? false;

        return [
            'scheduled_date' => optional($scheduledDate)->toDateString(),
            'scheduled_date_label' => optional($scheduledDate)->toFormattedDateString(),
            'after_closing_hours' => $isNextDay,
            'close_time' => $closeTime,
        ];
    }

    protected function pickupScheduleSummary(array $pickupConfig): array
    {
        $scheduledDate = $pickupConfig['scheduled_date'] ?? null;

        return [
            'scheduled_date' => $scheduledDate?->toDateString(),
            'scheduled_date_label' => $scheduledDate?->toFormattedDateString(),
            'after_closing_hours' => (bool) ($pickupConfig['after_closing_hours'] ?? false),
            'open_time' => $pickupConfig['open_time'] ?? null,
            'close_time' => $pickupConfig['close_time'] ?? null,
        ];
    }

    protected function validateAvailableStock(array $cartItems, int $branchId): ?string
    {
        $requestedProductNames = collect($cartItems)
            ->filter(fn (array $item) => ($item['item_type'] ?? null) === 'product' && !empty($item['product_id']))
            ->mapWithKeys(fn (array $item) => [
                (int) $item['product_id'] => $item['name'] ?? 'This product',
            ]);

        $packLines = collect($cartItems)
            ->filter(fn (array $item) => ($item['item_type'] ?? null) === 'pack' && !empty($item['item_id']));

        if ($packLines->isNotEmpty() && Schema::hasTable('pack_items')) {
            $packs = Pack::query()
                ->with('items.product')
                ->whereIn('id', $packLines->pluck('item_id')->all())
                ->get()
                ->keyBy('id');

            foreach ($packLines as $item) {
                $pack = $packs->get((int) $item['item_id']);

                if (!$pack) {
                    continue;
                }

                $stockMessage = PackAvailability::insufficientStockMessage($pack, $branchId, (float) ($item['quantity'] ?? 0));

                if ($stockMessage) {
                    return $stockMessage;
                }

                $pack->items
                    ->filter(fn ($packItem) => !empty($packItem->product_id))
                    ->each(function ($packItem) use (&$requestedProductNames) {
                        $requestedProductNames->put(
                            (int) $packItem->product_id,
                            $packItem->product?->name ?? 'This product'
                        );
                    });
            }
        }

        $requestedQuantities = $this->expandCartItemStockRequirements($cartItems);

        if ($requestedQuantities->isEmpty()) {
            return null;
        }

        $products = Product::query()
            ->withSum(['stocks as branch_stock_quantity' => fn ($query) => $query->where('branch_id', $branchId)], 'quantity')
            ->whereIn('id', $requestedQuantities->keys())
            ->get()
            ->keyBy('id');

        foreach ($requestedQuantities as $productId => $requestedQuantity) {
            $product = $products->get((int) $productId);
            $availableQuantity = (float) ($product?->branch_stock_quantity ?? 0);

            if (!$product) {
                $productName = $requestedProductNames->get((int) $productId, 'This product');

                return "{$productName} is no longer available for ordering right now.";
            }

            if ($requestedQuantity > $availableQuantity) {
                $productName = $product?->name ?? $requestedProductNames->get((int) $productId, 'This product');
                $formattedAvailable = rtrim(rtrim(number_format($availableQuantity, 2, '.', ''), '0'), '.');

                return "{$productName} only has {$formattedAvailable} item(s) available right now.";
            }
        }

        return null;
    }

    protected function expandCartItemStockRequirements(array $cartItems)
    {
        $requirements = collect($cartItems)
            ->filter(fn (array $item) => ($item['item_type'] ?? null) === 'product' && !empty($item['product_id']))
            ->map(fn (array $item) => [
                'product_id' => (int) $item['product_id'],
                'quantity' => (float) $item['quantity'],
            ]);

        $packLines = collect($cartItems)
            ->filter(fn (array $item) => ($item['item_type'] ?? null) === 'pack' && !empty($item['item_id']));

        if ($packLines->isNotEmpty() && Schema::hasTable('pack_items')) {
            $packs = Pack::query()
                ->with('items')
                ->whereIn('id', $packLines->pluck('item_id')->all())
                ->get()
                ->keyBy('id');

            $packRequirements = $packLines->flatMap(function (array $item) use ($packs) {
                $pack = $packs->get((int) $item['item_id']);
                $orderedPackQuantity = (float) ($item['quantity'] ?? 0);

                if (!$pack) {
                    return [];
                }

                return $pack->items
                    ->filter(fn ($packItem) => !empty($packItem->product_id))
                    ->map(fn ($packItem) => [
                        'product_id' => (int) $packItem->product_id,
                        'quantity' => (float) $packItem->quantity * $orderedPackQuantity,
                    ])
                    ->values()
                    ->all();
            });

            $requirements = $requirements->concat($packRequirements);
        }

        return $requirements
            ->groupBy('product_id')
            ->mapWithKeys(fn ($group, $productId) => [
                (int) $productId => (float) collect($group)->sum('quantity'),
            ]);
    }

    protected function resolveFulfillmentBranch(array $cartItems): array
    {
        $branches = Branch::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        if ($branches->isEmpty()) {
            return [null, 'No active branch is available to fulfill this order right now.'];
        }

        $lastError = null;

        foreach ($branches as $branch) {
            $stockMessage = $this->validateAvailableStock($cartItems, $branch->id);

            if (!$stockMessage) {
                return [$branch, null];
            }

            $lastError = $stockMessage;
        }

        return [$branches->first(), $lastError ?: 'The selected items are out of stock right now.'];
    }

    protected function notifyBackofficeUsers(Order $order): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        User::query()
            ->get()
            ->filter(fn (User $user) => BackofficeAccess::hasBackofficeAccess($user))
            ->each(fn (User $user) => $user->notify(new NewOrderPlacedNotification($order)));
    }
}
