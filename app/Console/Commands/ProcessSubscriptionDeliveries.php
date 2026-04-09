<?php

namespace App\Console\Commands;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Subscription;
use App\Models\SubscriptionOrderLog;
use App\Models\User;
use App\Notifications\NewOrderPlacedNotification;
use App\Support\BackofficeAccess;
use App\Support\SubscriptionScheduler;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Throwable;

class ProcessSubscriptionDeliveries extends Command
{
    protected $signature = 'subscriptions:generate-orders';

    protected $description = 'Generate due subscription orders, recover missed dates safely, and advance next delivery.';

    public function handle(): int
    {
        $today = now()->startOfDay();
        $branchId = Branch::query()->where('is_active', true)->value('id');

        if (!$branchId) {
            $this->warn('No active branch found. Subscription deliveries were not processed.');

            return self::FAILURE;
        }

        $subscriptions = Subscription::query()
            ->whereRaw('LOWER(status) = ?', ['active'])
            ->whereNotNull('next_delivery')
            ->whereDate('next_delivery', '<=', $today->toDateString())
            ->orderBy('next_delivery')
            ->get();

        $createdCount = 0;

        foreach ($subscriptions as $subscription) {
            $dueDate = optional($subscription->next_delivery)?->copy()?->startOfDay();
            $customerId = $this->resolveCustomerId($subscription);

            if (!$dueDate || !$customerId) {
                continue;
            }

            $products = collect($subscription->products ?? [])
                ->filter(fn ($item) => !empty($item['product_id']) && (float) ($item['quantity'] ?? 0) > 0)
                ->values();

            if ($products->isEmpty()) {
                $subscription->update([
                    'next_delivery' => SubscriptionScheduler::nextDeliveryDate(
                        (string) $subscription->frequency,
                        (array) ($subscription->delivery_days ?? []),
                        $dueDate->copy()->addDay()
                    )->toDateString(),
                ]);

                $this->warn("Subscription {$subscription->id} skipped because it has no valid products.");
                continue;
            }

            $productIds = $products->pluck('product_id')->unique()->values()->all();
            $catalog = Product::query()
                ->with('currentPrice')
                ->whereIn('id', $productIds)
                ->get()
                ->keyBy('id');

            $lineItems = $products->map(function ($item) use ($catalog) {
                $product = $catalog->get((int) $item['product_id']);
                $quantity = max(1, (int) round((float) ($item['quantity'] ?? 1)));
                $unitPrice = (float) ($product?->currentPrice?->promo_price ?? $product?->currentPrice?->price ?? 0);

                return [
                    'product' => $product,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'subtotal' => $unitPrice * $quantity,
                ];
            })->filter(fn ($line) => $line['product'] !== null)->values();

            if ($lineItems->isEmpty()) {
                $this->warn("Subscription {$subscription->id} skipped because linked products are unavailable.");
                continue;
            }

            while ($dueDate->lte($today)) {
                $alreadyLogged = SubscriptionOrderLog::query()
                    ->where('subscription_id', $subscription->id)
                    ->whereDate('delivery_date', $dueDate->toDateString())
                    ->exists();

                if ($alreadyLogged) {
                    $dueDate = SubscriptionScheduler::nextDeliveryDate(
                        (string) $subscription->frequency,
                        (array) ($subscription->delivery_days ?? []),
                        $dueDate->copy()->addDay()
                    );

                    continue;
                }

                $subtotal = (float) $lineItems->sum('subtotal');

                [$order] = DB::transaction(function () use ($subscription, $customerId, $branchId, $dueDate, $lineItems, $subtotal) {
                    $order = $this->createOrderWithUniqueNumber(
                        $subscription,
                        $customerId,
                        $branchId,
                        $dueDate,
                        $lineItems,
                        $subtotal
                    );

                    SubscriptionOrderLog::create([
                        'subscription_id' => $subscription->id,
                        'order_id' => $order->id,
                        'delivery_date' => $dueDate->toDateString(),
                    ]);

                    return [$order];
                });

                $this->notifyBackofficeUsers($order);
                $createdCount++;

                $dueDate = SubscriptionScheduler::nextDeliveryDate(
                    (string) $subscription->frequency,
                    (array) ($subscription->delivery_days ?? []),
                    $dueDate->copy()->addDay()
                );
            }

            $subscription->update([
                'next_delivery' => $dueDate->toDateString(),
            ]);
        }

        $this->info("Created {$createdCount} subscription order(s).");

        return self::SUCCESS;
    }

    protected function createOrderWithUniqueNumber(
        Subscription $subscription,
        int $customerId,
        int $branchId,
        $dueDate,
        $lineItems,
        float $subtotal
    ): Order {
        $maxAttempts = 5;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            $orderNumber = $this->generateOrderNumberForDate($dueDate);

            try {
                $order = Order::create([
                    'order_number' => $orderNumber,
                    'customer_id' => $customerId,
                    'branch_id' => $branchId,
                    'status' => 'pending',
                    'subtotal' => $subtotal,
                    'tax' => 0,
                    'total' => $subtotal,
                    'payment_method' => 'bank',
                    'fulfillment_method' => 'delivery',
                    'scheduled_delivery_date' => $dueDate->toDateString(),
                    'is_paid' => false,
                    'notes' => "Auto-generated from subscription #{$subscription->id} for {$dueDate->toDateString()}",
                ]);

                foreach ($lineItems as $line) {
                    $order->items()->create([
                        'product_id' => $line['product']->id,
                        'quantity' => $line['quantity'],
                        'price' => $line['unit_price'],
                        'unit_price' => $line['unit_price'],
                        'subtotal' => $line['subtotal'],
                        'notes' => json_encode([
                            'type' => 'subscription',
                            'subscription_id' => $subscription->id,
                            'name' => $line['product']->name,
                        ]),
                    ]);
                }

                return $order;
            } catch (QueryException $exception) {
                $isDuplicateOrderNumber = (string) $exception->getCode() === '23000'
                    && str_contains(strtolower($exception->getMessage()), 'orders_order_number_unique');

                if (!$isDuplicateOrderNumber || $attempt === $maxAttempts) {
                    throw $exception;
                }
            }
        }

        throw new \RuntimeException('Failed to generate a unique order number for subscription order.');
    }

    protected function generateOrderNumberForDate($date): string
    {
        $prefix = $date->format('Ymd');
        $latest = Order::query()
            ->where('order_number', 'like', $prefix . '%')
            ->orderByDesc('order_number')
            ->value('order_number');

        $lastSequence = $latest ? (int) substr((string) $latest, -4) : 0;

        return $prefix . str_pad((string) ($lastSequence + 1), 4, '0', STR_PAD_LEFT);
    }

    protected function notifyBackofficeUsers(Order $order): void
    {
        User::query()
            ->get()
            ->filter(fn (User $user) => BackofficeAccess::hasBackofficeAccess($user))
            ->each(function (User $user) use ($order) {
                try {
                    $user->notify(new NewOrderPlacedNotification($order));
                } catch (Throwable $exception) {
                    report($exception);
                }
            });
    }

    protected function resolveCustomerId(Subscription $subscription): ?int
    {
        if ($subscription->customer_id) {
            return (int) $subscription->customer_id;
        }

        $phone = trim((string) ($subscription->phone ?? ''));
        $email = trim((string) ($subscription->email ?? ''));
        $name = trim((string) ($subscription->customer_name ?? ''));

        if ($phone === '' && $email === '' && $name === '') {
            $this->warn("Subscription {$subscription->id} skipped because it has no customer identity.");

            return null;
        }

        $customer = Customer::query()
            ->when($phone !== '', fn ($query) => $query->where('phone', $phone))
            ->when($phone === '' && $email !== '', fn ($query) => $query->where('email', $email))
            ->when($phone === '' && $email === '' && $name !== '', fn ($query) => $query->where('full_name', $name))
            ->first();

        if (!$customer) {
            $customer = Customer::create([
                'full_name' => $name !== '' ? $name : 'Subscription Customer',
                'phone' => $phone !== '' ? $phone : null,
                'email' => $email !== '' ? $email : null,
                'address' => null,
                'status' => 'Active',
            ]);
        }

        $subscription->update(['customer_id' => $customer->id]);

        return (int) $customer->id;
    }
}
