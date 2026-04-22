<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Delivery;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Product;
use App\Models\Subscription;
use App\Models\SubscriptionOrderLog;
use App\Models\SubscriptionRequest;
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

class FatClientDemoSeeder extends Seeder
{
    private const DEFAULT_PASSWORD = 'password';

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
            $customers = $this->seedCustomers();
            $admin = User::query()->where('email', 'admin@amanibrew.com')->first();
            $workflow = app(SubscriptionWorkflowService::class);

            $subscriptions = $this->seedSubscriptions($customers, $products, $workflow);
            $this->seedSubscriptionRequests($customers, $products, $admin);
            $orders = $this->seedOrders($customers, $products, $branch, $subscriptions);
            $this->seedInvoices($customers, $products, $orders);
        });
    }

    protected function seedCustomers(): Collection
    {
        return collect($this->customerBlueprints())->mapWithKeys(function (array $blueprint) {
            $userData = [
                'name' => $blueprint['name'],
                'password' => Hash::make(self::DEFAULT_PASSWORD),
            ];

            if (Schema::hasColumn('users', 'preferred_language')) {
                $userData['preferred_language'] = 'en';
            }

            $user = User::updateOrCreate(
                ['email' => $blueprint['email']],
                $userData
            );

            $user->syncRoles([RoleRegistry::CUSTOMER]);

            $customerData = [
                'full_name' => $blueprint['name'],
                'phone' => $blueprint['phone'],
                'email' => $blueprint['email'],
                'status' => 'Active',
            ];

            if (Schema::hasColumn('customers', 'address')) {
                $customerData['address'] = $blueprint['address'];
            }

            $customer = Customer::updateOrCreate(
                ['user_id' => $user->id],
                $customerData
            );

            if (Schema::hasTable('customer_addresses')) {
                CustomerAddress::query()
                    ->where('customer_id', $customer->id)
                    ->update(['is_default' => false]);

                CustomerAddress::updateOrCreate(
                    [
                        'customer_id' => $customer->id,
                        'address_line1' => $blueprint['address'],
                    ],
                    [
                        'address_line2' => $blueprint['address_note'],
                        'city' => 'Dar es Salaam',
                        'postal_code' => $blueprint['area'],
                        'phone' => $blueprint['phone'],
                        'is_default' => true,
                    ]
                );
            }

            return [$blueprint['key'] => $customer];
        });
    }

    protected function seedSubscriptions(Collection $customers, Collection $products, SubscriptionWorkflowService $workflow): Collection
    {
        if (!Schema::hasTable('subscriptions') || !Schema::hasTable('subscription_items')) {
            return collect();
        }

        return collect($this->subscriptionBlueprints())->mapWithKeys(function (array $blueprint) use ($customers, $products, $workflow) {
            $customer = $customers->get($blueprint['customer_key']);

            if (!$customer) {
                return [];
            }

            $items = $this->buildItemPayloads($products, $blueprint['items']);
            $value = round((float) $items->sum('line_total'), 2);
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
                    'start_date' => $blueprint['start_date'],
                    'delivery_address' => $blueprint['delivery_address'],
                    'notes' => $blueprint['notes'],
                    'value' => $value,
                    'agreed_price' => $value,
                    'next_delivery' => $nextDelivery->toDateString(),
                    'status' => $blueprint['status'],
                    'paused_at' => $blueprint['status'] === 'Paused' ? now()->subDays(5) : null,
                    'cancelled_at' => $blueprint['status'] === 'Inactive' ? now()->subDays(20) : null,
                ]
            );

            $workflow->syncSubscriptionItems($subscription, $items);
            $this->setModelTimestamps($subscription, Carbon::parse($blueprint['created_at']), Carbon::parse($blueprint['updated_at']));

            return [$blueprint['key'] => $subscription->fresh(['items.product'])];
        });
    }

    protected function seedSubscriptionRequests(Collection $customers, Collection $products, ?User $admin): void
    {
        if (!Schema::hasTable('subscription_requests') || !Schema::hasTable('subscription_request_items')) {
            return;
        }

        foreach ($this->subscriptionRequestBlueprints() as $blueprint) {
            $customer = $customers->get($blueprint['customer_key']);

            if (!$customer) {
                continue;
            }

            $request = SubscriptionRequest::updateOrCreate(
                ['request_number' => $blueprint['request_number']],
                [
                    'user_id' => $customer->user_id,
                    'customer_id' => $customer->id,
                    'frequency' => $blueprint['frequency'],
                    'delivery_days' => $blueprint['delivery_days'],
                    'start_date' => $blueprint['start_date'],
                    'delivery_address' => $blueprint['delivery_address'],
                    'notes' => $blueprint['notes'],
                    'offered_price' => $blueprint['offered_price'],
                    'quoted_price' => $blueprint['quoted_price'],
                    'quoted_message' => $blueprint['quoted_message'],
                    'quote_valid_until' => $blueprint['quote_valid_until'],
                    'quoted_at' => $blueprint['quoted_at'],
                    'status' => $blueprint['status'],
                    'reviewed_by' => $blueprint['reviewed_by'] ? $admin?->id : null,
                    'reviewed_at' => $blueprint['reviewed_at'],
                    'customer_responded_at' => $blueprint['customer_responded_at'],
                    'response_message' => $blueprint['response_message'],
                    'rejection_reason' => $blueprint['rejection_reason'],
                    'subscription_id' => null,
                    'archived_at' => null,
                ]
            );

            $request->items()->delete();
            foreach ($this->buildItemPayloads($products, $blueprint['items']) as $item) {
                $request->items()->create([
                    'item_type' => $item['item_type'],
                    'product_id' => $item['product_id'],
                    'pack_id' => $item['pack_id'],
                    'item_name' => $item['item_name'],
                    'quantity' => $item['quantity'],
                    'unit' => $item['unit'],
                    'unit_price' => $item['unit_price'],
                    'line_total' => $item['line_total'],
                ]);
            }

            $this->setModelTimestamps($request, Carbon::parse($blueprint['created_at']), Carbon::parse($blueprint['updated_at']));
        }
    }

    protected function seedOrders(Collection $customers, Collection $products, Branch $branch, Collection $subscriptions): Collection
    {
        if (!Schema::hasTable('orders') || !Schema::hasTable('order_items')) {
            return collect();
        }

        return collect($this->orderBlueprints())->mapWithKeys(function (array $blueprint) use ($customers, $products, $branch, $subscriptions) {
            $customer = $customers->get($blueprint['customer_key']);

            if (!$customer) {
                return [];
            }

            $subscription = filled($blueprint['subscription_key']) ? $subscriptions->get($blueprint['subscription_key']) : null;
            $lineItems = $this->buildOrderLineItems($products, $blueprint['items'], $subscription?->id);
            $subtotal = round((float) $lineItems->sum('subtotal'), 2);
            $placedAt = Carbon::parse($blueprint['created_at']);
            $updatedAt = Carbon::parse($blueprint['updated_at']);

            $order = Order::updateOrCreate(
                ['order_number' => $blueprint['order_number']],
                [
                    'customer_id' => $customer->id,
                    'branch_id' => $branch->id,
                    'status' => $blueprint['status'],
                    'subtotal' => $subtotal,
                    'tax' => 0,
                    'total' => $subtotal,
                    'payment_method' => $blueprint['payment_method'],
                    'delivery_region' => 'Dar es Salaam',
                    'delivery_area' => $blueprint['delivery_area'],
                    'delivery_address' => $blueprint['delivery_address'],
                    'delivery_notes' => $blueprint['delivery_notes'],
                    'delivery_landmark' => $blueprint['delivery_landmark'],
                    'delivery_phone' => $customer->phone,
                    'fulfillment_method' => 'delivery',
                    'scheduled_delivery_date' => $placedAt->toDateString(),
                    'scheduled_pickup_date' => null,
                    'is_paid' => $blueprint['is_paid'],
                    'notes' => $subscription
                        ? "Auto-generated from subscription #{$subscription->id}. {$blueprint['notes']}"
                        : $blueprint['notes'],
                ]
            );

            $order->items()->delete();
            $order->payments()->whereNull('invoice_id')->delete();
            $order->deliveries()->delete();

            foreach ($lineItems as $lineItem) {
                $order->items()->create([
                    'product_id' => $lineItem['product_id'],
                    'quantity' => $lineItem['quantity'],
                    'price' => $lineItem['unit_price'],
                    'unit_price' => $lineItem['unit_price'],
                    'subtotal' => $lineItem['subtotal'],
                    'notes' => json_encode([
                        'type' => $subscription ? 'subscription' : 'product',
                        'item_id' => $lineItem['product_id'],
                        'subscription_id' => $subscription?->id,
                        'name' => $lineItem['name'],
                        'description' => $blueprint['notes'],
                        'unit' => $lineItem['unit'],
                    ]),
                ]);
            }

            if ($blueprint['is_paid']) {
                $payment = $order->payments()->create([
                    'amount' => $subtotal,
                    'method' => $blueprint['payment_method_code'],
                    'transaction_id' => 'PAY-' . $blueprint['order_number'],
                    'status' => 'paid',
                ]);

                $this->setModelTimestamps($payment, $updatedAt->copy(), $updatedAt->copy());
            }

            $delivery = $order->deliveries()->create([
                'delivery_number' => 'DEL-' . $blueprint['order_number'],
                'branch_id' => $branch->id,
                'status' => $blueprint['delivery_status'],
                'delivery_fee' => 0,
                'tracking_number' => 'TRK-' . $blueprint['order_number'],
                'driver_id' => null,
            ]);

            $this->setModelTimestamps($delivery, $updatedAt->copy(), $updatedAt->copy());
            $this->setModelTimestamps($order, $placedAt, $updatedAt);

            if ($subscription && Schema::hasTable('subscription_order_logs')) {
                $log = SubscriptionOrderLog::updateOrCreate(
                    [
                        'subscription_id' => $subscription->id,
                        'delivery_date' => $placedAt->toDateString(),
                    ],
                    [
                        'order_id' => $order->id,
                    ]
                );

                $this->setModelTimestamps($log, $placedAt->copy(), $updatedAt->copy());
            }

            return [$blueprint['key'] => $order];
        });
    }

    protected function seedInvoices(Collection $customers, Collection $products, Collection $orders): void
    {
        if (!Schema::hasTable('invoices') || !Schema::hasTable('invoice_items')) {
            return;
        }

        foreach ($this->invoiceBlueprints() as $blueprint) {
            $customer = $customers->get($blueprint['customer_key']);

            if (!$customer) {
                continue;
            }

            $order = filled($blueprint['order_key']) ? $orders->get($blueprint['order_key']) : null;
            $items = $this->buildInvoiceItemPayloads($products, $blueprint['items']);
            $subtotal = round((float) $items->sum('subtotal'), 2);
            $invoiceDate = Carbon::parse($blueprint['invoice_date']);
            $dueDate = Carbon::parse($blueprint['due_date']);
            $updatedAt = Carbon::parse($blueprint['updated_at']);

            $invoice = Invoice::updateOrCreate(
                ['invoice_number' => $blueprint['invoice_number']],
                [
                    'order_id' => $order?->id,
                    'invoice_date' => $invoiceDate->toDateString(),
                    'due_date' => $dueDate->toDateString(),
                    'tin_number' => $blueprint['tin_number'],
                    'customer_name' => $customer->full_name,
                    'customer_contact' => $customer->phone,
                    'bill_to_address' => $blueprint['bill_to_address'],
                    'deliver_to_name' => $blueprint['deliver_to_name'],
                    'deliver_to_address' => $blueprint['deliver_to_address'],
                    'customer_city' => 'Dar es Salaam',
                    'subtotal' => $subtotal,
                    'tax' => $blueprint['tax'],
                    'discount' => $blueprint['discount'],
                    'total' => round($subtotal + $blueprint['tax'] - $blueprint['discount'], 2),
                    'currency' => 'Tanzanian Shillings',
                    'bank_name' => 'CRDB Bank Tanzania',
                    'account_name' => 'AMANI BREW - Premium Butchery',
                    'account_number' => '0651234567890',
                    'status' => $blueprint['status'],
                    'notes' => $blueprint['notes'],
                ]
            );

            $invoice->items()->delete();
            $invoice->payments()->delete();

            foreach ($items as $item) {
                $invoice->items()->create([
                    'product_id' => $item['product_id'],
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $item['subtotal'],
                ]);
            }

            if ($blueprint['status'] === 'paid') {
                $payment = $invoice->payments()->create([
                    'order_id' => $order?->id,
                    'amount' => (float) $invoice->total,
                    'method' => 'bank',
                    'transaction_id' => 'INV-' . $blueprint['invoice_number'],
                    'status' => 'paid',
                ]);

                $this->setModelTimestamps($payment, $updatedAt->copy(), $updatedAt->copy());
            }

            $this->setModelTimestamps($invoice, $invoiceDate->copy(), $updatedAt);
        }
    }

    protected function buildItemPayloads(Collection $products, array $lines): Collection
    {
        return collect($lines)->map(function (array $line) use ($products) {
            $product = $products->get($line['sku']);
            $quantity = (float) $line['quantity'];
            $unitPrice = (float) ($product->currentPrice?->promo_price ?? $product->currentPrice?->price ?? 0);

            return [
                'item_type' => 'product',
                'product_id' => $product->id,
                'pack_id' => null,
                'item_name' => $product->name,
                'quantity' => $quantity,
                'unit' => $product->unit,
                'unit_price' => round($unitPrice, 2),
                'line_total' => round($unitPrice * $quantity, 2),
            ];
        })->values();
    }

    protected function buildOrderLineItems(Collection $products, array $lines, ?int $subscriptionId): Collection
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

    protected function buildInvoiceItemPayloads(Collection $products, array $lines): Collection
    {
        return collect($lines)->map(function (array $line) use ($products) {
            $product = $products->get($line['sku']);
            $quantity = (float) $line['quantity'];
            $unitPrice = (float) ($product->currentPrice?->promo_price ?? $product->currentPrice?->price ?? 0);

            return [
                'product_id' => $product->id,
                'description' => $line['description'] ?? $product->name,
                'quantity' => $quantity,
                'unit_price' => round($unitPrice, 2),
                'subtotal' => round($unitPrice * $quantity, 2),
            ];
        })->values();
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
            'HS-BEEF-FILLET',
            'HS-SAU-CHICKEN',
            'HS-POULTRY-BROILER',
            'HS-PORK-CHOPS',
        ];

        $products = Product::query()
            ->with('currentPrice')
            ->whereIn('sku', $requiredSkus)
            ->get()
            ->keyBy('sku');

        foreach ($requiredSkus as $sku) {
            $product = $products->get($sku);

            if (!$product || !$product->currentPrice) {
                throw new \RuntimeException("Fat client demo seeding failed: product [{$sku}] is missing or has no active price.");
            }
        }

        return $products;
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

    protected function customerBlueprints(): array
    {
        return [
            [
                'key' => 'aisha',
                'name' => 'Aisha Msuya',
                'email' => 'aisha.msuya@amanibrew.com',
                'phone' => '0712001101',
                'address' => 'Plot 8, Oysterbay, Dar es Salaam',
                'area' => 'Oysterbay',
                'address_note' => 'Home kitchen access gate',
            ],
            [
                'key' => 'kelvin',
                'name' => 'Kelvin Mrema',
                'email' => 'kelvin.mrema@amanibrew.com',
                'phone' => '0712001102',
                'address' => 'Harbour View Cafe, Masaki, Dar es Salaam',
                'area' => 'Masaki',
                'address_note' => 'Cafe receiving entrance',
            ],
            [
                'key' => 'neema',
                'name' => 'Neema Joseph',
                'email' => 'neema.joseph@amanibrew.com',
                'phone' => '0712001103',
                'address' => 'Apartment 3B, Mbezi Beach, Dar es Salaam',
                'area' => 'Mbezi Beach',
                'address_note' => 'Call before arrival',
            ],
            [
                'key' => 'baraka',
                'name' => 'Baraka Kweka',
                'email' => 'baraka.kweka@amanibrew.com',
                'phone' => '0712001104',
                'address' => 'Palm Residency, Ada Estate, Dar es Salaam',
                'area' => 'Ada Estate',
                'address_note' => 'Security desk drop-off',
            ],
            [
                'key' => 'lydia',
                'name' => 'Lydia Massawe',
                'email' => 'lydia.massawe@amanibrew.com',
                'phone' => '0712001105',
                'address' => 'Seaside Suites, Msasani, Dar es Salaam',
                'area' => 'Msasani',
                'address_note' => 'Front office freezer room',
            ],
            [
                'key' => 'daniel',
                'name' => 'Daniel Lema',
                'email' => 'daniel.lema@amanibrew.com',
                'phone' => '0712001106',
                'address' => 'Karibu Bistro, Kinondoni, Dar es Salaam',
                'area' => 'Kinondoni',
                'address_note' => 'Delivery bay at the back',
            ],
            [
                'key' => 'joyce',
                'name' => 'Joyce Moshi',
                'email' => 'joyce.moshi@amanibrew.com',
                'phone' => '0712001107',
                'address' => 'Mlimani Heights, Sinza, Dar es Salaam',
                'area' => 'Sinza',
                'address_note' => 'Lobby handoff',
            ],
            [
                'key' => 'patrick',
                'name' => 'Patrick Mallya',
                'email' => 'patrick.mallya@amanibrew.com',
                'phone' => '0712001108',
                'address' => 'Coastal Offices, Upanga, Dar es Salaam',
                'area' => 'Upanga',
                'address_note' => 'Office pantry stock delivery',
            ],
            [
                'key' => 'rehema',
                'name' => 'Rehema Nnko',
                'email' => 'rehema.nnko@amanibrew.com',
                'phone' => '0712001109',
                'address' => 'Kigamboni Villas, Kigamboni, Dar es Salaam',
                'area' => 'Kigamboni',
                'address_note' => 'Villa service entrance',
            ],
            [
                'key' => 'zawadi',
                'name' => 'Zawadi Mbise',
                'email' => 'zawadi.mbise@amanibrew.com',
                'phone' => '0712001110',
                'address' => 'Mikocheni Gardens, Mikocheni, Dar es Salaam',
                'area' => 'Mikocheni',
                'address_note' => 'Reception cold-room handoff',
            ],
        ];
    }

    protected function subscriptionBlueprints(): array
    {
        return [
            [
                'key' => 'aisha_home',
                'customer_key' => 'aisha',
                'frequency' => 'Weekly',
                'delivery_days' => ['Tue', 'Fri'],
                'delivery_address' => 'Plot 8, Oysterbay, Dar es Salaam',
                'items' => [
                    ['sku' => 'HS-BEEF-MINCE', 'quantity' => 2],
                    ['sku' => 'HS-POULTRY-DRUMSTICKS', 'quantity' => 2],
                ],
                'status' => 'Active',
                'notes' => 'Home meal prep subscription.',
                'start_date' => now()->subWeeks(8)->toDateString(),
                'created_at' => now()->subWeeks(8)->toDateTimeString(),
                'updated_at' => now()->subDays(4)->toDateTimeString(),
            ],
            [
                'key' => 'kelvin_cafe',
                'customer_key' => 'kelvin',
                'frequency' => 'Weekdays only',
                'delivery_days' => ['Mon-Fri'],
                'delivery_address' => 'Harbour View Cafe, Masaki, Dar es Salaam',
                'items' => [
                    ['sku' => 'HS-SAU-VIENNA', 'quantity' => 3],
                    ['sku' => 'HS-PORK-BACON-BACK', 'quantity' => 2],
                    ['sku' => 'HS-PORK-HAM-COOKED', 'quantity' => 2],
                ],
                'status' => 'Active',
                'notes' => 'Breakfast service subscription for the cafe.',
                'start_date' => now()->subWeeks(10)->toDateString(),
                'created_at' => now()->subWeeks(10)->toDateTimeString(),
                'updated_at' => now()->subDays(3)->toDateTimeString(),
            ],
            [
                'key' => 'lydia_suite',
                'customer_key' => 'lydia',
                'frequency' => 'Weekly',
                'delivery_days' => ['Sat'],
                'delivery_address' => 'Seaside Suites, Msasani, Dar es Salaam',
                'items' => [
                    ['sku' => 'HS-BEEF-FILLET', 'quantity' => 1],
                    ['sku' => 'HS-SAU-CHICKEN', 'quantity' => 2],
                ],
                'status' => 'Paused',
                'notes' => 'Weekend suite kitchen supply.',
                'start_date' => now()->subWeeks(6)->toDateString(),
                'created_at' => now()->subWeeks(6)->toDateTimeString(),
                'updated_at' => now()->subDays(6)->toDateTimeString(),
            ],
            [
                'key' => 'daniel_bistro',
                'customer_key' => 'daniel',
                'frequency' => 'Custom',
                'delivery_days' => ['Wed', 'Sat'],
                'delivery_address' => 'Karibu Bistro, Kinondoni, Dar es Salaam',
                'items' => [
                    ['sku' => 'HS-BEEF-STEW', 'quantity' => 3],
                    ['sku' => 'HS-POULTRY-BROILER', 'quantity' => 2],
                ],
                'status' => 'Active',
                'notes' => 'Bistro bulk kitchen restock.',
                'start_date' => now()->subWeeks(5)->toDateString(),
                'created_at' => now()->subWeeks(5)->toDateTimeString(),
                'updated_at' => now()->subDays(2)->toDateTimeString(),
            ],
            [
                'key' => 'rehema_villa',
                'customer_key' => 'rehema',
                'frequency' => 'Weekly',
                'delivery_days' => ['Mon'],
                'delivery_address' => 'Kigamboni Villas, Kigamboni, Dar es Salaam',
                'items' => [
                    ['sku' => 'HS-PORK-CHOPS', 'quantity' => 2],
                    ['sku' => 'HS-BEEF-MINCE', 'quantity' => 1],
                ],
                'status' => 'Inactive',
                'notes' => 'Villa hospitality package no longer active.',
                'start_date' => now()->subWeeks(12)->toDateString(),
                'created_at' => now()->subWeeks(12)->toDateTimeString(),
                'updated_at' => now()->subWeeks(2)->toDateTimeString(),
            ],
            [
                'key' => 'zawadi_guesthouse',
                'customer_key' => 'zawadi',
                'frequency' => 'Weekly',
                'delivery_days' => ['Wed', 'Sat'],
                'delivery_address' => 'Mikocheni Gardens, Mikocheni, Dar es Salaam',
                'items' => [
                    ['sku' => 'HS-BEEF-FILLET', 'quantity' => 1],
                    ['sku' => 'HS-SAU-CHICKEN', 'quantity' => 2],
                    ['sku' => 'HS-PORK-HAM-COOKED', 'quantity' => 1],
                ],
                'status' => 'Active',
                'notes' => 'Guesthouse kitchen supply for hosted breakfast and dinner service.',
                'start_date' => now()->subWeeks(7)->toDateString(),
                'created_at' => now()->subWeeks(7)->toDateTimeString(),
                'updated_at' => now()->subDays(1)->toDateTimeString(),
            ],
        ];
    }

    protected function subscriptionRequestBlueprints(): array
    {
        return [
            [
                'request_number' => 'SR-DEMO-001',
                'customer_key' => 'neema',
                'frequency' => 'Weekly',
                'delivery_days' => ['Thu'],
                'start_date' => now()->addDays(4)->toDateString(),
                'delivery_address' => 'Apartment 3B, Mbezi Beach, Dar es Salaam',
                'notes' => 'Request for a weekly apartment supply bundle.',
                'offered_price' => 62000,
                'quoted_price' => null,
                'quoted_message' => null,
                'quote_valid_until' => null,
                'quoted_at' => null,
                'status' => SubscriptionRequest::STATUS_PENDING_REVIEW,
                'reviewed_by' => false,
                'reviewed_at' => null,
                'customer_responded_at' => null,
                'response_message' => null,
                'rejection_reason' => null,
                'items' => [
                    ['sku' => 'HS-BEEF-MINCE', 'quantity' => 2],
                    ['sku' => 'HS-POULTRY-DRUMSTICKS', 'quantity' => 1],
                ],
                'created_at' => now()->subDays(3)->toDateTimeString(),
                'updated_at' => now()->subDays(3)->toDateTimeString(),
            ],
            [
                'request_number' => 'SR-DEMO-002',
                'customer_key' => 'baraka',
                'frequency' => 'Weekdays only',
                'delivery_days' => ['Mon-Fri'],
                'start_date' => now()->addDays(2)->toDateString(),
                'delivery_address' => 'Palm Residency, Ada Estate, Dar es Salaam',
                'notes' => 'Requested breakfast stock for apartment tenants.',
                'offered_price' => 78000,
                'quoted_price' => 84500,
                'quoted_message' => 'Quoted with premium sausage and bacon mix included.',
                'quote_valid_until' => now()->addDays(5)->toDateString(),
                'quoted_at' => now()->subDay()->toDateTimeString(),
                'status' => SubscriptionRequest::STATUS_QUOTED,
                'reviewed_by' => true,
                'reviewed_at' => now()->subDay()->toDateTimeString(),
                'customer_responded_at' => null,
                'response_message' => null,
                'rejection_reason' => null,
                'items' => [
                    ['sku' => 'HS-SAU-VIENNA', 'quantity' => 2],
                    ['sku' => 'HS-PORK-BACON-BACK', 'quantity' => 1],
                ],
                'created_at' => now()->subDays(4)->toDateTimeString(),
                'updated_at' => now()->subDay()->toDateTimeString(),
            ],
            [
                'request_number' => 'SR-DEMO-003',
                'customer_key' => 'joyce',
                'frequency' => 'Custom',
                'delivery_days' => ['Wed', 'Sat'],
                'start_date' => now()->addDays(7)->toDateString(),
                'delivery_address' => 'Mlimani Heights, Sinza, Dar es Salaam',
                'notes' => 'Custom home entertaining request.',
                'offered_price' => 91000,
                'quoted_price' => 98000,
                'quoted_message' => 'Quote includes premium beef cuts and delivery.',
                'quote_valid_until' => now()->subDays(2)->toDateString(),
                'quoted_at' => now()->subDays(7)->toDateTimeString(),
                'status' => SubscriptionRequest::STATUS_REJECTED,
                'reviewed_by' => true,
                'reviewed_at' => now()->subDays(7)->toDateTimeString(),
                'customer_responded_at' => now()->subDays(5)->toDateTimeString(),
                'response_message' => 'Customer rejected the quoted amount.',
                'rejection_reason' => 'Budget revised after receiving the quote.',
                'items' => [
                    ['sku' => 'HS-BEEF-FILLET', 'quantity' => 1],
                    ['sku' => 'HS-SAU-CHICKEN', 'quantity' => 2],
                ],
                'created_at' => now()->subDays(8)->toDateTimeString(),
                'updated_at' => now()->subDays(5)->toDateTimeString(),
            ],
            [
                'request_number' => 'SR-DEMO-004',
                'customer_key' => 'patrick',
                'frequency' => 'Weekly',
                'delivery_days' => ['Mon', 'Thu'],
                'start_date' => now()->addDays(6)->toDateString(),
                'delivery_address' => 'Coastal Offices, Upanga, Dar es Salaam',
                'notes' => 'Office pantry and lunch prep request.',
                'offered_price' => 73500,
                'quoted_price' => null,
                'quoted_message' => null,
                'quote_valid_until' => null,
                'quoted_at' => null,
                'status' => SubscriptionRequest::STATUS_PENDING_REVIEW,
                'reviewed_by' => false,
                'reviewed_at' => null,
                'customer_responded_at' => null,
                'response_message' => null,
                'rejection_reason' => null,
                'items' => [
                    ['sku' => 'HS-BEEF-STEW', 'quantity' => 2],
                    ['sku' => 'HS-POULTRY-BROILER', 'quantity' => 1],
                ],
                'created_at' => now()->subDays(2)->toDateTimeString(),
                'updated_at' => now()->subDays(2)->toDateTimeString(),
            ],
        ];
    }

    protected function orderBlueprints(): array
    {
        return [
            [
                'key' => 'aisha_order',
                'order_number' => 'FC-DEMO-001',
                'customer_key' => 'aisha',
                'subscription_key' => 'aisha_home',
                'status' => 'completed',
                'payment_method' => 'M-Pesa',
                'payment_method_code' => 'bank',
                'is_paid' => true,
                'delivery_status' => 'delivered',
                'delivery_area' => 'Oysterbay',
                'delivery_address' => 'Plot 8, Oysterbay, Dar es Salaam',
                'delivery_notes' => 'Deliver before noon.',
                'delivery_landmark' => 'Near Coco Beach junction',
                'notes' => 'Weekly family stock order.',
                'items' => [
                    ['sku' => 'HS-BEEF-MINCE', 'quantity' => 2],
                    ['sku' => 'HS-POULTRY-DRUMSTICKS', 'quantity' => 2],
                ],
                'created_at' => now()->subDays(18)->setTime(9, 20)->toDateTimeString(),
                'updated_at' => now()->subDays(18)->setTime(13, 45)->toDateTimeString(),
            ],
            [
                'key' => 'kelvin_order',
                'order_number' => 'FC-DEMO-002',
                'customer_key' => 'kelvin',
                'subscription_key' => 'kelvin_cafe',
                'status' => 'completed',
                'payment_method' => 'Bank Transfer',
                'payment_method_code' => 'bank',
                'is_paid' => true,
                'delivery_status' => 'delivered',
                'delivery_area' => 'Masaki',
                'delivery_address' => 'Harbour View Cafe, Masaki, Dar es Salaam',
                'delivery_notes' => 'Kitchen delivery before breakfast service.',
                'delivery_landmark' => 'Masaki seafront lane',
                'notes' => 'Cafe breakfast stock order.',
                'items' => [
                    ['sku' => 'HS-SAU-VIENNA', 'quantity' => 3],
                    ['sku' => 'HS-PORK-BACON-BACK', 'quantity' => 2],
                ],
                'created_at' => now()->subDays(12)->setTime(7, 30)->toDateTimeString(),
                'updated_at' => now()->subDays(12)->setTime(11, 5)->toDateTimeString(),
            ],
            [
                'key' => 'neema_order',
                'order_number' => 'FC-DEMO-003',
                'customer_key' => 'neema',
                'subscription_key' => null,
                'status' => 'pending',
                'payment_method' => 'Pending Payment',
                'payment_method_code' => 'bank',
                'is_paid' => false,
                'delivery_status' => 'pending',
                'delivery_area' => 'Mbezi Beach',
                'delivery_address' => 'Apartment 3B, Mbezi Beach, Dar es Salaam',
                'delivery_notes' => 'Awaiting customer confirmation.',
                'delivery_landmark' => 'Near Africana junction',
                'notes' => 'Fresh order awaiting payment confirmation.',
                'items' => [
                    ['sku' => 'HS-BEEF-STEW', 'quantity' => 1],
                    ['sku' => 'HS-POULTRY-BROILER', 'quantity' => 1],
                ],
                'created_at' => now()->subDays(4)->setTime(15, 0)->toDateTimeString(),
                'updated_at' => now()->subDays(4)->setTime(15, 0)->toDateTimeString(),
            ],
            [
                'key' => 'daniel_order',
                'order_number' => 'FC-DEMO-004',
                'customer_key' => 'daniel',
                'subscription_key' => null,
                'status' => 'dispatched',
                'payment_method' => 'Invoice Billing',
                'payment_method_code' => 'bank',
                'is_paid' => false,
                'delivery_status' => 'in_transit',
                'delivery_area' => 'Kinondoni',
                'delivery_address' => 'Karibu Bistro, Kinondoni, Dar es Salaam',
                'delivery_notes' => 'Driver already dispatched to the bistro.',
                'delivery_landmark' => 'Near Kinondoni market',
                'notes' => 'Bulk kitchen stock currently on the road.',
                'items' => [
                    ['sku' => 'HS-POULTRY-BROILER', 'quantity' => 2],
                    ['sku' => 'HS-BEEF-STEW', 'quantity' => 2],
                ],
                'created_at' => now()->subDay()->setTime(8, 45)->toDateTimeString(),
                'updated_at' => now()->subDay()->setTime(12, 15)->toDateTimeString(),
            ],
            [
                'key' => 'zawadi_order',
                'order_number' => 'FC-DEMO-005',
                'customer_key' => 'zawadi',
                'subscription_key' => 'zawadi_guesthouse',
                'status' => 'confirmed',
                'payment_method' => 'Invoice Billing',
                'payment_method_code' => 'bank',
                'is_paid' => false,
                'delivery_status' => 'pending',
                'delivery_area' => 'Mikocheni',
                'delivery_address' => 'Mikocheni Gardens, Mikocheni, Dar es Salaam',
                'delivery_notes' => 'Confirm with reception before unloading chilled stock.',
                'delivery_landmark' => 'Next to Mikocheni B market lane',
                'notes' => 'Upcoming guesthouse restock already approved by reception.',
                'items' => [
                    ['sku' => 'HS-BEEF-FILLET', 'quantity' => 1],
                    ['sku' => 'HS-SAU-CHICKEN', 'quantity' => 2],
                    ['sku' => 'HS-PORK-HAM-COOKED', 'quantity' => 1],
                ],
                'created_at' => now()->subHours(18)->toDateTimeString(),
                'updated_at' => now()->subHours(16)->toDateTimeString(),
            ],
        ];
    }

    protected function invoiceBlueprints(): array
    {
        return [
            [
                'invoice_number' => 'FCINV-001',
                'customer_key' => 'aisha',
                'order_key' => 'aisha_order',
                'invoice_date' => now()->subDays(18)->toDateString(),
                'due_date' => now()->subDays(11)->toDateString(),
                'status' => 'paid',
                'tin_number' => 'TIN-100001',
                'bill_to_address' => 'Plot 8, Oysterbay, Dar es Salaam',
                'deliver_to_name' => 'Aisha Msuya',
                'deliver_to_address' => 'Plot 8, Oysterbay, Dar es Salaam',
                'tax' => 0,
                'discount' => 0,
                'notes' => 'Paid home subscription invoice.',
                'items' => [
                    ['sku' => 'HS-BEEF-MINCE', 'quantity' => 2],
                    ['sku' => 'HS-POULTRY-DRUMSTICKS', 'quantity' => 2],
                ],
                'updated_at' => now()->subDays(17)->toDateTimeString(),
            ],
            [
                'invoice_number' => 'FCINV-002',
                'customer_key' => 'kelvin',
                'order_key' => 'kelvin_order',
                'invoice_date' => now()->subDays(12)->toDateString(),
                'due_date' => now()->subDays(5)->toDateString(),
                'status' => 'paid',
                'tin_number' => 'TIN-100002',
                'bill_to_address' => 'Harbour View Cafe, Masaki, Dar es Salaam',
                'deliver_to_name' => 'Harbour View Cafe',
                'deliver_to_address' => 'Harbour View Cafe, Masaki, Dar es Salaam',
                'tax' => 0,
                'discount' => 0,
                'notes' => 'Breakfast stock invoice settled by bank transfer.',
                'items' => [
                    ['sku' => 'HS-SAU-VIENNA', 'quantity' => 3],
                    ['sku' => 'HS-PORK-BACON-BACK', 'quantity' => 2],
                ],
                'updated_at' => now()->subDays(11)->toDateTimeString(),
            ],
            [
                'invoice_number' => 'FCINV-003',
                'customer_key' => 'neema',
                'order_key' => 'neema_order',
                'invoice_date' => now()->subDays(4)->toDateString(),
                'due_date' => now()->addDays(3)->toDateString(),
                'status' => 'pending',
                'tin_number' => 'TIN-100003',
                'bill_to_address' => 'Apartment 3B, Mbezi Beach, Dar es Salaam',
                'deliver_to_name' => 'Neema Joseph',
                'deliver_to_address' => 'Apartment 3B, Mbezi Beach, Dar es Salaam',
                'tax' => 0,
                'discount' => 0,
                'notes' => 'Pending invoice waiting for customer payment.',
                'items' => [
                    ['sku' => 'HS-BEEF-STEW', 'quantity' => 1],
                    ['sku' => 'HS-POULTRY-BROILER', 'quantity' => 1],
                ],
                'updated_at' => now()->subDays(4)->toDateTimeString(),
            ],
            [
                'invoice_number' => 'FCINV-004',
                'customer_key' => 'daniel',
                'order_key' => 'daniel_order',
                'invoice_date' => now()->subDay()->toDateString(),
                'due_date' => now()->addDays(4)->toDateString(),
                'status' => 'sent',
                'tin_number' => 'TIN-100004',
                'bill_to_address' => 'Karibu Bistro, Kinondoni, Dar es Salaam',
                'deliver_to_name' => 'Karibu Bistro',
                'deliver_to_address' => 'Karibu Bistro, Kinondoni, Dar es Salaam',
                'tax' => 0,
                'discount' => 0,
                'notes' => 'Invoice sent while delivery is in transit.',
                'items' => [
                    ['sku' => 'HS-POULTRY-BROILER', 'quantity' => 2],
                    ['sku' => 'HS-BEEF-STEW', 'quantity' => 2],
                ],
                'updated_at' => now()->subDay()->toDateTimeString(),
            ],
            [
                'invoice_number' => 'FCINV-005',
                'customer_key' => 'rehema',
                'order_key' => null,
                'invoice_date' => now()->subDays(14)->toDateString(),
                'due_date' => now()->subDays(2)->toDateString(),
                'status' => 'pending',
                'tin_number' => 'TIN-100005',
                'bill_to_address' => 'Kigamboni Villas, Kigamboni, Dar es Salaam',
                'deliver_to_name' => 'Rehema Nnko',
                'deliver_to_address' => 'Kigamboni Villas, Kigamboni, Dar es Salaam',
                'tax' => 0,
                'discount' => 0,
                'notes' => 'Overdue villa hospitality invoice.',
                'items' => [
                    ['sku' => 'HS-PORK-CHOPS', 'quantity' => 2],
                    ['sku' => 'HS-BEEF-MINCE', 'quantity' => 1],
                ],
                'updated_at' => now()->subDays(2)->toDateTimeString(),
            ],
            [
                'invoice_number' => 'FCINV-006',
                'customer_key' => 'lydia',
                'order_key' => null,
                'invoice_date' => now()->toDateString(),
                'due_date' => now()->addDays(7)->toDateString(),
                'status' => 'draft',
                'tin_number' => 'TIN-100006',
                'bill_to_address' => 'Seaside Suites, Msasani, Dar es Salaam',
                'deliver_to_name' => 'Seaside Suites',
                'deliver_to_address' => 'Seaside Suites, Msasani, Dar es Salaam',
                'tax' => 0,
                'discount' => 0,
                'notes' => 'Draft invoice awaiting approval.',
                'items' => [
                    ['sku' => 'HS-BEEF-FILLET', 'quantity' => 1],
                    ['sku' => 'HS-SAU-CHICKEN', 'quantity' => 2],
                ],
                'updated_at' => now()->toDateTimeString(),
            ],
            [
                'invoice_number' => 'FCINV-007',
                'customer_key' => 'zawadi',
                'order_key' => 'zawadi_order',
                'invoice_date' => now()->subHours(18)->toDateString(),
                'due_date' => now()->addDays(5)->toDateString(),
                'status' => 'sent',
                'tin_number' => 'TIN-100007',
                'bill_to_address' => 'Mikocheni Gardens, Mikocheni, Dar es Salaam',
                'deliver_to_name' => 'Mikocheni Gardens Guesthouse',
                'deliver_to_address' => 'Mikocheni Gardens, Mikocheni, Dar es Salaam',
                'tax' => 0,
                'discount' => 0,
                'notes' => 'Invoice sent for the upcoming guesthouse kitchen restock.',
                'items' => [
                    ['sku' => 'HS-BEEF-FILLET', 'quantity' => 1],
                    ['sku' => 'HS-SAU-CHICKEN', 'quantity' => 2],
                    ['sku' => 'HS-PORK-HAM-COOKED', 'quantity' => 1],
                ],
                'updated_at' => now()->subHours(16)->toDateTimeString(),
            ],
        ];
    }
}
