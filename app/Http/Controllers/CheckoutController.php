<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\User;
use App\Support\CartManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

        return Inertia::render('Checkout', [
            'cart'     => $cart,
            'customer' => $customer ? [
                'full_name' => $customer->full_name ?: $user->name,
                'phone'     => $customer->phone,
                'email'     => $customer->email ?: $user->email,
                'region_city' => $customer->defaultAddress?->city,
                'district_area' => null,
                'delivery_address' => $customer->defaultAddress?->address_line1 ?: $customer->address,
                'landmark' => $customer->defaultAddress?->address_line2,
            ] : null,
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
            'region_city'        => ['required', 'string', 'max:255'],
            'district_area'      => ['required', 'string', 'max:255'],
            'delivery_address'   => ['required', 'string', 'max:1000'],
            'landmark'           => ['nullable', 'string', 'max:255'],
            'fulfillment_method' => ['required', 'in:delivery,pickup'],
            'pickup_time'        => ['nullable', 'string', 'max:255', 'required_if:fulfillment_method,pickup'],
            'password'           => $user ? ['nullable'] : ['required', 'string', 'min:8', 'confirmed'],
        ];

        $validated = $request->validate($rules);

        $branch = Branch::query()->where('is_active', true)->orderBy('id')->firstOrFail();

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
                    'address'   => $validated['delivery_address'],
                    'status'    => 'Active',
                ]
            );

            CustomerAddress::updateOrCreate(
                ['customer_id' => $customer->id, 'is_default' => true],
                [
                    'address_line1' => $validated['delivery_address'],
                    'address_line2' => $validated['landmark'] ?? null,
                    'city' => $validated['region_city'],
                    'postal_code' => $validated['district_area'],
                    'phone' => $validated['phone'],
                ]
            );

            $order = Order::create([
                'order_number'   => 'ORD-' . now()->format('YmdHis') . random_int(100, 999),
                'customer_id'    => $customer->id,
                'branch_id'      => $branch->id,
                'status'         => 'pending',
                'subtotal'       => $cart['subtotal'],
                'tax'            => 0,
                'total'          => $cart['subtotal'],
                'payment_method' => 'Pending Payment',
                'delivery_region' => $validated['region_city'],
                'delivery_area' => $validated['district_area'],
                'delivery_address' => $validated['delivery_address'],
                'delivery_landmark' => $validated['landmark'] ?? null,
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

        CartManager::clear();

        return redirect()->route('home')->with('success', "Order {$createdOrder->order_number} placed successfully.");
    }

    protected function buildOrderNotes(array $validated): string
    {
        $notes = [
            'Fulfillment: ' . ucfirst($validated['fulfillment_method']),
            'Region/City: ' . $validated['region_city'],
            'District/Area: ' . $validated['district_area'],
            'Address: ' . $validated['delivery_address'],
        ];

        if (!empty($validated['landmark'])) {
            $notes[] = 'Landmark: ' . $validated['landmark'];
        }

        if (($validated['fulfillment_method'] ?? null) === 'pickup' && !empty($validated['pickup_time'])) {
            $notes[] = 'Pickup Time: ' . $validated['pickup_time'];
        }

        return implode(PHP_EOL, $notes);
    }
}
