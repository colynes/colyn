<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Subscription;
use App\Models\SubscriptionOrderLog;
use App\Models\User;
use App\Services\SubscriptionWorkflowService;
use App\Support\RoleRegistry;
use App\Support\SubscriptionScheduler;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class CustomerDemoSeeder extends Seeder
{
    private const CUSTOMER_NAME = 'Colline Antelimy';
    private const CUSTOMER_EMAIL = 'collinsantelim@gmail.com';
    private const CUSTOMER_PHONE = '0712345678';
    private const CUSTOMER_PASSWORD = 'password';
    private const HOME_ADDRESS = 'House 14, Mikocheni, Dar es Salaam';
    private const BUSINESS_ADDRESS = 'Antelimy Grill House, Mbezi Beach, Dar es Salaam';

    public function run(): void
    {
        if (!Schema::hasTable('users') || !Schema::hasTable('customers')) {
            return;
        }

        DB::transaction(function (): void {
            RoleRegistry::ensureCustomerRole();

            $branch = Branch::query()
                ->where('is_active', true)
                ->orderBy('id')
                ->first();

            if (!$branch) {
                return;
            }

            $products = $this->requiredProducts();
            $customerUser = $this->seedCustomerUser();
            $customer = $this->seedCustomerProfile($customerUser);

            $this->seedCustomerAddresses($customer);

            $subscriptions = $this->seedSubscriptions($customer, $products);

            if (Schema::hasTable('orders') && Schema::hasTable('order_items')) {
                $this->seedCompletedOrders($customer, $branch, $products, $subscriptions);
            }
        });
    }

    protected function seedCustomerUser(): User
    {
        $userData = [
            'name' => self::CUSTOMER_NAME,
            'password' => Hash::make(self::CUSTOMER_PASSWORD),
        ];

        if (Schema::hasColumn('users', 'preferred_language')) {
            $userData['preferred_language'] = 'en';
        }

        $user = User::updateOrCreate(
            ['email' => self::CUSTOMER_EMAIL],
            $userData
        );

        $user->syncRoles([RoleRegistry::CUSTOMER]);

        return $user;
    }

    protected function seedCustomerProfile(User $user): Customer
    {
        $customerData = [
            'full_name' => self::CUSTOMER_NAME,
            'phone' => self::CUSTOMER_PHONE,
            'email' => self::CUSTOMER_EMAIL,
            'status' => 'Active',
        ];

        if (Schema::hasColumn('customers', 'address')) {
            $customerData['address'] = self::HOME_ADDRESS;
        }

        return Customer::updateOrCreate(
            ['user_id' => $user->id],
            $customerData
        );
    }

    protected function seedCustomerAddresses(Customer $customer): void
    {
        if (!Schema::hasTable('customer_addresses')) {
            return;
        }

        CustomerAddress::query()
            ->where('customer_id', $customer->id)
            ->update(['is_default' => false]);

        CustomerAddress::updateOrCreate(
            [
                'customer_id' => $customer->id,
                'address_line1' => self::HOME_ADDRESS,
            ],
            [
                'address_line2' => 'Home delivery address',
                'city' => 'Dar es Salaam',
                'postal_code' => 'Mikocheni',
                'phone' => self::CUSTOMER_PHONE,
                'is_default' => true,
            ]
        );

        CustomerAddress::updateOrCreate(
            [
                'customer_id' => $customer->id,
                'address_line1' => self::BUSINESS_ADDRESS,
            ],
            [
                'address_line2' => 'Business delivery address',
                'city' => 'Dar es Salaam',
                'postal_code' => 'Mbezi Beach',
                'phone' => self::CUSTOMER_PHONE,
                'is_default' => false,
            ]
        );
    }

    protected function seedSubscriptions(Customer $customer, Collection $products): Collection
    {
        if (!Schema::hasTable('subscriptions') || !Schema::hasTable('subscription_items')) {
            return collect();
        }

        $workflow = app(SubscriptionWorkflowService::class);

        $blueprints = collect([
            [
                'key' => 'home',
                'delivery_address' => self::HOME_ADDRESS,
                'frequency' => 'Weekly',
                'delivery_days' => ['Tue', 'Fri'],
                'start_date' => now()->subWeeks(10)->startOfDay(),
                'notes' => 'Home subscription for family meal planning.',
                'items' => [
                    ['sku' => 'HS-BEEF-MINCE', 'quantity' => 2],
                    ['sku' => 'HS-POULTRY-DRUMSTICKS', 'quantity' => 2],
                    ['sku' => 'HS-BEEF-STEW', 'quantity' => 1],
                ],
            ],
            [
                'key' => 'business',
                'delivery_address' => self::BUSINESS_ADDRESS,
                'frequency' => 'Weekdays only',
                'delivery_days' => ['Mon-Fri'],
                'start_date' => now()->subWeeks(12)->startOfDay(),
                'notes' => 'Business subscription for regular cafe and grill supply.',
                'items' => [
                    ['sku' => 'HS-SAU-VIENNA', 'quantity' => 4],
                    ['sku' => 'HS-PORK-BACON-BACK', 'quantity' => 2],
                    ['sku' => 'HS-PORK-HAM-COOKED', 'quantity' => 2],
                ],
            ],
        ]);

        return $blueprints->mapWithKeys(function (array $blueprint) use ($customer, $products, $workflow) {
            $subscriptionItems = $this->buildSubscriptionItems($products, $blueprint['items']);
            $totalValue = round((float) $subscriptionItems->sum('line_total'), 2);
            $nextDelivery = SubscriptionScheduler::nextDeliveryDate(
                $blueprint['frequency'],
                $blueprint['delivery_days'],
                now()->startOfDay()
            );

            $subscription = Subscription::updateOrCreate(
                [
                    'customer_id' => $customer->id,
                    'delivery_address' => $blueprint['delivery_address'],
                ],
                [
                    'subscription_request_id' => null,
                    'customer_name' => $customer->full_name,
                    'phone' => $customer->phone,
                    'email' => $customer->email,
                    'frequency' => $blueprint['frequency'],
                    'delivery_days' => $blueprint['delivery_days'],
                    'products' => [],
                    'start_date' => $blueprint['start_date']->toDateString(),
                    'notes' => $blueprint['notes'],
                    'value' => $totalValue,
                    'agreed_price' => $totalValue,
                    'next_delivery' => $nextDelivery->toDateString(),
                    'status' => Subscription::STATUS_ACTIVE,
                    'paused_at' => null,
                    'cancelled_at' => null,
                ]
            );

            $workflow->syncSubscriptionItems($subscription, $subscriptionItems);

            $this->setModelTimestamps(
                $subscription,
                $blueprint['start_date']->copy(),
                now()->subDays(2)->startOfDay()
            );

            return [$blueprint['key'] => $subscription->fresh(['items.product'])];
        });
    }

    protected function seedCompletedOrders(
        Customer $customer,
        Branch $branch,
        Collection $products,
        Collection $subscriptions
    ): void {
        $orderBlueprints = collect([
            [
                'order_number' => 'COLL-DEMO-001',
                'subscription_key' => 'home',
                'placed_at' => now()->subDays(56)->setTime(9, 15),
                'delivery_area' => 'Mikocheni',
                'delivery_address' => self::HOME_ADDRESS,
                'notes' => 'Completed seeded order for the home subscription.',
                'items' => [
                    ['sku' => 'HS-BEEF-MINCE', 'quantity' => 2],
                    ['sku' => 'HS-POULTRY-DRUMSTICKS', 'quantity' => 2],
                ],
            ],
            [
                'order_number' => 'COLL-DEMO-002',
                'subscription_key' => 'business',
                'placed_at' => now()->subDays(49)->setTime(7, 45),
                'delivery_area' => 'Mbezi Beach',
                'delivery_address' => self::BUSINESS_ADDRESS,
                'notes' => 'Completed seeded order for the business subscription.',
                'items' => [
                    ['sku' => 'HS-SAU-VIENNA', 'quantity' => 4],
                    ['sku' => 'HS-PORK-BACON-BACK', 'quantity' => 2],
                ],
            ],
            [
                'order_number' => 'COLL-DEMO-003',
                'subscription_key' => 'home',
                'placed_at' => now()->subDays(35)->setTime(10, 5),
                'delivery_area' => 'Mikocheni',
                'delivery_address' => self::HOME_ADDRESS,
                'notes' => 'Completed seeded order for the home subscription.',
                'items' => [
                    ['sku' => 'HS-BEEF-STEW', 'quantity' => 2],
                    ['sku' => 'HS-POULTRY-DRUMSTICKS', 'quantity' => 1],
                ],
            ],
            [
                'order_number' => 'COLL-DEMO-004',
                'subscription_key' => 'business',
                'placed_at' => now()->subDays(28)->setTime(8, 10),
                'delivery_area' => 'Mbezi Beach',
                'delivery_address' => self::BUSINESS_ADDRESS,
                'notes' => 'Completed seeded order for the business subscription.',
                'items' => [
                    ['sku' => 'HS-PORK-HAM-COOKED', 'quantity' => 2],
                    ['sku' => 'HS-SAU-VIENNA', 'quantity' => 3],
                ],
            ],
            [
                'order_number' => 'COLL-DEMO-005',
                'subscription_key' => 'home',
                'placed_at' => now()->subDays(14)->setTime(9, 40),
                'delivery_area' => 'Mikocheni',
                'delivery_address' => self::HOME_ADDRESS,
                'notes' => 'Completed seeded order for the home subscription.',
                'items' => [
                    ['sku' => 'HS-BEEF-MINCE', 'quantity' => 1],
                    ['sku' => 'HS-BEEF-STEW', 'quantity' => 1],
                    ['sku' => 'HS-POULTRY-DRUMSTICKS', 'quantity' => 2],
                ],
            ],
            [
                'order_number' => 'COLL-DEMO-006',
                'subscription_key' => 'business',
                'placed_at' => now()->subDays(7)->setTime(8, 25),
                'delivery_area' => 'Mbezi Beach',
                'delivery_address' => self::BUSINESS_ADDRESS,
                'notes' => 'Completed seeded order for the business subscription.',
                'items' => [
                    ['sku' => 'HS-SAU-VIENNA', 'quantity' => 4],
                    ['sku' => 'HS-PORK-BACON-BACK', 'quantity' => 1],
                    ['sku' => 'HS-PORK-HAM-COOKED', 'quantity' => 1],
                ],
            ],
        ]);

        foreach ($orderBlueprints as $blueprint) {
            $subscription = $subscriptions->get($blueprint['subscription_key']);

            if (!$subscription) {
                continue;
            }

            $lineItems = $this->buildOrderLineItems($products, $blueprint['items'], $subscription->id);
            $subtotal = round((float) $lineItems->sum('subtotal'), 2);
            $placedAt = Carbon::parse($blueprint['placed_at']);
            $completedAt = $placedAt->copy()->addHours(4);

            $order = Order::updateOrCreate(
                ['order_number' => $blueprint['order_number']],
                [
                    'customer_id' => $customer->id,
                    'branch_id' => $branch->id,
                    'status' => 'completed',
                    'subtotal' => $subtotal,
                    'tax' => 0,
                    'total' => $subtotal,
                    'payment_method' => 'M-Pesa',
                    'delivery_region' => 'Dar es Salaam',
                    'delivery_area' => $blueprint['delivery_area'],
                    'delivery_address' => $blueprint['delivery_address'],
                    'delivery_notes' => $blueprint['subscription_key'] === 'home'
                        ? 'Deliver to the home gate and call on arrival.'
                        : 'Deliver to the business receiving desk before lunch service.',
                    'delivery_landmark' => $blueprint['subscription_key'] === 'home'
                        ? 'Near Mikocheni B'
                        : 'Near Mbezi Beach main road',
                    'delivery_phone' => self::CUSTOMER_PHONE,
                    'fulfillment_method' => 'delivery',
                    'scheduled_delivery_date' => $placedAt->toDateString(),
                    'scheduled_pickup_date' => null,
                    'is_paid' => true,
                    'notes' => "Auto-generated from subscription #{$subscription->id}. {$blueprint['notes']}",
                ]
            );

            $order->items()->delete();
            $order->payments()->delete();
            $order->deliveries()->delete();

            foreach ($lineItems as $lineItem) {
                $order->items()->create([
                    'product_id' => $lineItem['product_id'],
                    'quantity' => $lineItem['quantity'],
                    'price' => $lineItem['unit_price'],
                    'unit_price' => $lineItem['unit_price'],
                    'subtotal' => $lineItem['subtotal'],
                    'notes' => json_encode([
                        'type' => 'subscription',
                        'item_id' => $lineItem['product_id'],
                        'subscription_id' => $subscription->id,
                        'name' => $lineItem['name'],
                        'description' => $blueprint['notes'],
                        'unit' => $lineItem['unit'],
                    ]),
                ]);
            }

            $payment = $order->payments()->create([
                'amount' => $subtotal,
                'method' => 'mpesa',
                'transaction_id' => 'TXN-' . $blueprint['order_number'],
                'status' => 'paid',
            ]);

            $delivery = $order->deliveries()->create([
                'delivery_number' => 'DEL-' . $blueprint['order_number'],
                'branch_id' => $branch->id,
                'status' => 'delivered',
                'delivery_fee' => 0,
                'tracking_number' => 'TRK-' . $blueprint['order_number'],
                'driver_id' => null,
            ]);

            if (Schema::hasTable('subscription_order_logs')) {
                $log = SubscriptionOrderLog::updateOrCreate(
                    [
                        'subscription_id' => $subscription->id,
                        'delivery_date' => $placedAt->toDateString(),
                    ],
                    [
                        'order_id' => $order->id,
                    ]
                );

                $this->setModelTimestamps($log, $placedAt->copy(), $completedAt->copy());
            }

            $this->setModelTimestamps($order, $placedAt->copy(), $completedAt->copy());
            $this->setModelTimestamps($payment, $completedAt->copy(), $completedAt->copy());
            $this->setModelTimestamps($delivery, $completedAt->copy(), $completedAt->copy());
        }
    }

    protected function requiredProducts(): Collection
    {
        $requiredSkus = [
            'HS-BEEF-MINCE',
            'HS-BEEF-STEW',
            'HS-POULTRY-DRUMSTICKS',
            'HS-SAU-VIENNA',
            'HS-PORK-BACON-BACK',
            'HS-PORK-HAM-COOKED',
        ];

        $products = Product::query()
            ->with('currentPrice')
            ->whereIn('sku', $requiredSkus)
            ->get()
            ->keyBy('sku');

        foreach ($requiredSkus as $sku) {
            $product = $products->get($sku);

            if (!$product || !$product->currentPrice) {
                throw new \RuntimeException("Customer demo seeding failed: product [{$sku}] is missing or has no active price.");
            }
        }

        return $products;
    }

    protected function buildSubscriptionItems(Collection $products, array $lines): Collection
    {
        return collect($lines)->map(function (array $line) use ($products) {
            $product = $products->get($line['sku']);
            $quantity = (float) $line['quantity'];
            $unitPrice = (float) ($product->currentPrice?->promo_price ?? $product->currentPrice?->price ?? 0);
            $lineTotal = round($unitPrice * $quantity, 2);

            return [
                'item_type' => 'product',
                'product_id' => $product->id,
                'pack_id' => null,
                'item_name' => $product->name,
                'quantity' => $quantity,
                'unit' => $product->unit,
                'unit_price' => round($unitPrice, 2),
                'line_total' => $lineTotal,
            ];
        })->values();
    }

    protected function buildOrderLineItems(Collection $products, array $lines, int $subscriptionId): Collection
    {
        return collect($lines)->map(function (array $line) use ($products, $subscriptionId) {
            $product = $products->get($line['sku']);
            $quantity = (float) $line['quantity'];
            $unitPrice = (float) ($product->currentPrice?->promo_price ?? $product->currentPrice?->price ?? 0);

            return [
                'subscription_id' => $subscriptionId,
                'product_id' => $product->id,
                'name' => $product->name,
                'quantity' => $quantity,
                'unit' => $product->unit,
                'unit_price' => round($unitPrice, 2),
                'subtotal' => round($unitPrice * $quantity, 2),
            ];
        })->values();
    }

    protected function setModelTimestamps($model, Carbon $createdAt, Carbon $updatedAt): void
    {
        $model->timestamps = false;
        $model->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $updatedAt,
        ])->save();
        $model->timestamps = true;
    }
}
