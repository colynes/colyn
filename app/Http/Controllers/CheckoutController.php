<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Notifications\NewOrderPlacedNotification;
use App\Support\CartManager;
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
            'pickupHours' => [
                'open_time' => $pickupConfig['open_time'],
                'close_time' => $pickupConfig['close_time'],
                'min_time' => $pickupConfig['min_time'],
                'available' => $pickupConfig['available'],
            ],
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
            'delivery_latitude'  => ['nullable', 'numeric', 'between:-90,90', 'required_if:fulfillment_method,delivery'],
            'delivery_longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_if:fulfillment_method,delivery'],
            'delivery_notes'     => ['nullable', 'string', 'max:1000'],
            'delivery_location_confirmed' => ['nullable', 'accepted', 'required_if:fulfillment_method,delivery'],
            'fulfillment_method' => ['required', 'in:delivery,pickup'],
            'pickup_time'        => ['nullable', 'string', 'max:255', 'required_if:fulfillment_method,pickup'],
            'password'           => $user ? ['nullable'] : ['required', 'string', 'min:8', 'confirmed'],
        ];

        $validated = $request->validate($rules);
        $pickupConfig = $this->pickupConfig();

        if (($validated['fulfillment_method'] ?? null) === 'delivery' && empty($validated['delivery_location_confirmed'])) {
            return back()->withErrors([
                'delivery_location_confirmed' => 'Please confirm a delivery location before placing the order.',
            ])->withInput();
        }

        if (($validated['fulfillment_method'] ?? null) === 'pickup') {
            $request->validate([
                'pickup_time' => ['required', 'date_format:H:i'],
            ]);

            abort_if(
                !$this->isPickupTimeWithinWindow($validated['pickup_time'], $pickupConfig['min_time'], $pickupConfig['close_time']),
                422,
                'Pickup time must be between the current available time and closing hours.'
            );
        }

        $branch = Branch::query()->where('is_active', true)->orderBy('id')->firstOrFail();
        $insufficientStockMessage = $this->validateAvailableStock($cart['items'], $branch->id);

        if ($insufficientStockMessage) {
            return back()->with('error', $insufficientStockMessage);
        }

        $order = DB::transaction(function () use ($validated, $cart, $user, $branch) {
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

        return redirect()->route('home')->with('success', 'Order ' . $this->displayOrderNumber($createdOrder->order_number) . ' placed successfully.');
    }

    protected function buildOrderNotes(array $validated): string
    {
        $notes = ['Fulfillment: ' . ucfirst($validated['fulfillment_method'])];

        if (($validated['fulfillment_method'] ?? null) === 'delivery') {
            $notes[] = 'Region/City: ' . ($validated['region_city'] ?? 'N/A');
            $notes[] = 'District/Area: ' . ($validated['district_area'] ?? 'N/A');
            $notes[] = 'Address: ' . ($validated['delivery_address'] ?? 'N/A');

            if (!empty($validated['delivery_notes'])) {
                $notes[] = 'Delivery Notes: ' . $validated['delivery_notes'];
            }

            if (!empty($validated['delivery_latitude']) && !empty($validated['delivery_longitude'])) {
                $notes[] = 'Coordinates: ' . $validated['delivery_latitude'] . ', ' . $validated['delivery_longitude'];
            }
        }

        if (($validated['fulfillment_method'] ?? null) === 'pickup' && !empty($validated['pickup_time'])) {
            $notes[] = 'Pickup Time: ' . $validated['pickup_time'];
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

        return [
            'open_time' => $openTime,
            'close_time' => $closeTime,
            'min_time' => $this->pickupMinimumTime($openTime, $closeTime),
            'available' => $this->pickupMinimumTime($openTime, $closeTime) !== null,
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

    protected function validateAvailableStock(array $cartItems, int $branchId): ?string
    {
        $requestedQuantities = collect($cartItems)
            ->filter(fn (array $item) => ($item['item_type'] ?? null) === 'product' && !empty($item['product_id']))
            ->groupBy('product_id')
            ->map(fn ($items) => (float) $items->sum('quantity'));

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

            if (!$product || $requestedQuantity > $availableQuantity) {
                $productName = $product?->name ?? 'This product';
                $formattedAvailable = rtrim(rtrim(number_format($availableQuantity, 2, '.', ''), '0'), '.');

                return "{$productName} only has {$formattedAvailable} item(s) available right now.";
            }
        }

        return null;
    }

    protected function notifyBackofficeUsers(Order $order): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        User::role(['administrator', 'admin', 'manager', 'staff', 'Administrator', 'Manager', 'Staff'])
            ->get()
            ->each(fn (User $user) => $user->notify(new NewOrderPlacedNotification($order)));
    }
}
