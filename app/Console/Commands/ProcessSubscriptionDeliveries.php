<?php

namespace App\Console\Commands;

use App\Models\Branch;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Subscription;
use App\Models\SubscriptionOrderLog;
use App\Models\User;
use App\Notifications\NewOrderPlacedNotification;
use App\Support\BackofficeAccess;
use App\Support\SubscriptionScheduler;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Throwable;

class ProcessSubscriptionDeliveries extends Command
{
    protected $signature = 'subscriptions:generate-orders';

    protected $description = 'Generate due subscription orders safely and advance next delivery.';

    public function handle(): int
    {
        $today = now()->startOfDay();
        $branchId = Branch::query()->where('is_active', true)->value('id');

        if (!$branchId) {
            $this->warn('No active branch found. Subscription deliveries were not processed.');

            return self::FAILURE;
        }

        $subscriptions = Subscription::query()
            ->with(['items.product', 'items.pack'])
            ->whereRaw('LOWER(status) = ?', ['active'])
            ->whereNotNull('next_delivery')
            ->where(function ($query) use ($today) {
                $query
                    ->whereNull('end_date')
                    ->orWhereDate('end_date', '>=', $today->toDateString());
            })
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

            $lineItems = $this->buildLineItems($subscription);

            if ($lineItems->isEmpty()) {
                $subscription->update([
                    'next_delivery' => SubscriptionScheduler::nextDeliveryDate(
                        (string) $subscription->frequency,
                        (array) ($subscription->delivery_days ?? []),
                        $dueDate->copy()->addDay()
                    )->toDateString(),
                ]);

                $this->warn("Subscription {$subscription->id} skipped because it has no valid items.");
                continue;
            }

            if ($dueDate->lt($today)) {
                $dueDate = SubscriptionScheduler::nextDeliveryDate(
                    (string) $subscription->frequency,
                    (array) ($subscription->delivery_days ?? []),
                    $today->copy()
                );
            }

            if ($this->isBeyondSubscriptionPeriod($subscription, $dueDate)) {
                $subscription->update(['next_delivery' => null]);
                continue;
            }

            if ($dueDate->gt($today)) {
                $subscription->update(['next_delivery' => $dueDate->toDateString()]);
                continue;
            }

            $alreadyLogged = SubscriptionOrderLog::query()
                ->where('subscription_id', $subscription->id)
                ->whereDate('delivery_date', $dueDate->toDateString())
                ->exists();

            if ($alreadyLogged) {
                $subscription->update([
                    'next_delivery' => $this->nextDeliveryAfter($subscription, $dueDate),
                ]);
                continue;
            }

            $subtotal = round((float) $lineItems->sum('subtotal'), 2);

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

            $subscription->update([
                'next_delivery' => $this->nextDeliveryAfter($subscription, $dueDate),
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
        Collection $lineItems,
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
                        'product_id' => $line['product_id'],
                        'quantity' => $line['quantity'],
                        'price' => $line['unit_price'],
                        'unit_price' => $line['unit_price'],
                        'subtotal' => $line['subtotal'],
                        'notes' => json_encode([
                            'type' => $line['item_type'],
                            'item_id' => $line['item_id'],
                            'subscription_id' => $subscription->id,
                            'name' => $line['name'],
                            'description' => $line['description'] ?? null,
                            'unit' => $line['unit'] ?? null,
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

    protected function buildLineItems(Subscription $subscription): Collection
    {
        $items = $subscription->items->isNotEmpty()
            ? $subscription->items->map(fn ($item) => [
                'item_type' => $item->item_type,
                'item_id' => $item->item_type === 'pack' ? $item->pack_id : $item->product_id,
                'product_id' => $item->product_id,
                'name' => $item->item_name ?: ($item->item_type === 'pack' ? $item->pack?->name : $item->product?->name),
                'description' => null,
                'quantity' => max(0.01, (float) $item->quantity),
                'unit' => $item->unit,
                'unit_price' => (float) $item->unit_price,
                'subtotal' => (float) ($item->line_total ?: ((float) $item->unit_price * (float) $item->quantity)),
            ])
            : collect($subscription->products ?? [])->map(fn (array $item) => [
                'item_type' => $item['item_type'] ?? 'product',
                'item_id' => $item['item_id'] ?? ($item['product_id'] ?? null),
                'product_id' => $item['product_id'] ?? null,
                'name' => $item['name'] ?? 'Subscription Item',
                'description' => $item['description'] ?? null,
                'quantity' => max(0.01, (float) ($item['quantity'] ?? 1)),
                'unit' => $item['unit'] ?? 'pcs',
                'unit_price' => (float) ($item['unit_price'] ?? 0),
                'subtotal' => (float) ($item['line_total'] ?? ((float) ($item['unit_price'] ?? 0) * (float) ($item['quantity'] ?? 1))),
            ]);

        $normalized = $items
            ->filter(fn (array $item) => !empty($item['name']) && (float) $item['quantity'] > 0)
            ->values();

        if ($normalized->isEmpty()) {
            return collect();
        }

        $targetTotal = round((float) ($subscription->agreed_price ?: $subscription->value ?: 0), 2);
        $baseTotal = round((float) $normalized->sum('subtotal'), 2);

        if ($targetTotal <= 0 || $baseTotal <= 0 || abs($targetTotal - $baseTotal) < 0.01) {
            return $normalized->map(fn (array $item) => [
                ...$item,
                'unit_price' => round((float) $item['unit_price'], 2),
                'subtotal' => round((float) $item['subtotal'], 2),
            ])->values();
        }

        $allocated = collect();
        $allocatedSubtotal = 0.0;
        $lastIndex = $normalized->count() - 1;

        foreach ($normalized->values() as $index => $item) {
            $quantity = max(0.01, (float) $item['quantity']);
            $lineSubtotal = $index === $lastIndex
                ? round($targetTotal - $allocatedSubtotal, 2)
                : round(((float) $item['subtotal'] / $baseTotal) * $targetTotal, 2);

            $allocatedSubtotal = round($allocatedSubtotal + $lineSubtotal, 2);
            $allocated->push([
                ...$item,
                'unit_price' => round($lineSubtotal / $quantity, 2),
                'subtotal' => round($lineSubtotal, 2),
            ]);
        }

        return $allocated->values();
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

    protected function nextDeliveryAfter(Subscription $subscription, $dueDate): ?string
    {
        $next = SubscriptionScheduler::nextDeliveryDate(
            (string) $subscription->frequency,
            (array) ($subscription->delivery_days ?? []),
            $dueDate->copy()->addDay()
        );

        return $this->isBeyondSubscriptionPeriod($subscription, $next)
            ? null
            : $next->toDateString();
    }

    protected function isBeyondSubscriptionPeriod(Subscription $subscription, $date): bool
    {
        return $subscription->end_date
            && $date->copy()->startOfDay()->gt($subscription->end_date->copy()->startOfDay());
    }

    protected function notifyBackofficeUsers(Order $order): void
    {
        BackofficeAccess::usersQuery()
            ->get()
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


