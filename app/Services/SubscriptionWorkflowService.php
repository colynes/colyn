<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Pack;
use App\Models\Product;
use App\Models\Subscription;
use App\Models\SubscriptionRequest;
use App\Models\SubscriptionRequestItem;
use App\Models\User;
use App\Support\SubscriptionScheduler;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubscriptionWorkflowService
{
    public function __construct(protected SubscriptionPeriodService $periods)
    {
    }

    public function createRequest(Customer $customer, User $user, array $validated): SubscriptionRequest
    {
        return DB::transaction(function () use ($customer, $user, $validated) {
            $schedule = $this->normalizeSchedule(
                (string) $validated['frequency'],
                $validated['delivery_days'] ?? [],
                $validated['start_date'] ?? null,
            );
            $period = $this->periods->normalizePeriod(
                $validated['start_date'] ?? null,
                $validated['end_date'] ?? null,
            );

            $items = $this->buildItemSnapshots($validated['items'] ?? []);

            if ($items->isEmpty()) {
                throw ValidationException::withMessages([
                    'items' => ['Add at least one product or pack to the subscription request.'],
                ]);
            }

            $sourceRequest = null;
            $supportsResubmissionTracking = SubscriptionRequest::hasDatabaseColumn('resubmitted_from_request_id');

            if ($supportsResubmissionTracking && !empty($validated['resubmitted_from_request_id'])) {
                $sourceRequest = SubscriptionRequest::query()
                    ->whereKey($validated['resubmitted_from_request_id'])
                    ->where('customer_id', $customer->id)
                    ->first();

                if (!$sourceRequest) {
                    throw ValidationException::withMessages([
                        'resubmitted_from_request_id' => ['You can only resend one of your own subscription requests.'],
                    ]);
                }

                if ($sourceRequest->status !== SubscriptionRequest::STATUS_REJECTED) {
                    throw ValidationException::withMessages([
                        'resubmitted_from_request_id' => ['Only rejected requests can be resent as a new offer.'],
                    ]);
                }
            }

            $requestData = [
                'request_number' => $this->temporaryRequestNumber(),
                'user_id' => $user->id,
                'customer_id' => $customer->id,
                'frequency' => $schedule['frequency'],
                'delivery_days' => $schedule['delivery_days'],
                'start_date' => $period['start_date'],
                'end_date' => $period['end_date'],
                'delivery_address' => $validated['delivery_address'],
                'notes' => $validated['notes'] ?? null,
                'offered_price' => round((float) $validated['offered_price'], 2),
                'status' => SubscriptionRequest::STATUS_PENDING_REVIEW,
            ];

            if ($supportsResubmissionTracking) {
                $requestData['resubmitted_from_request_id'] = $sourceRequest?->id;
            }

            $request = SubscriptionRequest::create($requestData);

            $request->update([
                'request_number' => $this->formatRequestNumber($request->id),
            ]);

            $request->items()->createMany($items->all());

            return $request->load(['items.product', 'items.pack']);
        });
    }

    public function quoteRequest(SubscriptionRequest $request, array $validated, ?User $reviewer = null): SubscriptionRequest
    {
        return DB::transaction(function () use ($request, $validated, $reviewer) {
            $this->ensureRequestCanBeQuoted($request);

            $request->update([
                'quoted_price' => round((float) $validated['quoted_price'], 2),
                'quoted_message' => $validated['quoted_message'] ?? null,
                'quote_valid_until' => $validated['quote_valid_until'] ?? null,
                'quoted_at' => now(),
                'status' => SubscriptionRequest::STATUS_QUOTED,
                'reviewed_by' => $reviewer?->id,
                'reviewed_at' => now(),
                'rejection_reason' => null,
                'response_message' => null,
            ]);

            return $request->fresh(['items.product', 'items.pack']);
        });
    }

    public function rejectQuote(SubscriptionRequest $request, ?string $message = null): SubscriptionRequest
    {
        return DB::transaction(function () use ($request, $message) {
            $request = $this->expireRequestIfNeeded($request);

            if (!in_array($request->status, [SubscriptionRequest::STATUS_QUOTED, SubscriptionRequest::STATUS_PENDING_REVIEW], true)) {
                throw ValidationException::withMessages([
                    'request' => ['Only pending or quoted requests can be rejected.'],
                ]);
            }

            $request->update([
                'status' => SubscriptionRequest::STATUS_REJECTED,
                'customer_responded_at' => now(),
                'response_message' => $message,
                'rejection_reason' => $request->rejection_reason ?: $message,
            ]);

            return $request->fresh(['items.product', 'items.pack', 'subscription']);
        });
    }

    public function acceptQuote(SubscriptionRequest $request, Customer $customer): Subscription
    {
        return DB::transaction(function () use ($request, $customer) {
            $request = $this->expireRequestIfNeeded($request);

            if ($request->subscription_id) {
                $existing = Subscription::query()->find($request->subscription_id);

                if ($existing) {
                    $this->ensureInvoiceForSubscription($existing, $request, $customer);

                    return $existing->fresh(['items.product', 'items.pack']);
                }
            }

            if ($request->status !== SubscriptionRequest::STATUS_QUOTED || !$request->quoted_price) {
                throw ValidationException::withMessages([
                    'request' => ['Only quoted requests can be accepted.'],
                ]);
            }

            $startDate = $request->start_date?->copy()->startOfDay() ?? now()->startOfDay();
            $period = $this->periods->normalizePeriod(
                $startDate->toDateString(),
                ($request->end_date?->copy()?->startOfDay() ?? $startDate->copy()->addMonthNoOverflow())->toDateString(),
            );
            $nextDelivery = SubscriptionScheduler::nextDeliveryDate(
                (string) $request->frequency,
                (array) ($request->delivery_days ?? []),
                $startDate->copy(),
            );

            $subscription = Subscription::create([
                'customer_id' => $customer->id,
                'subscription_request_id' => $request->id,
                'customer_name' => $customer->full_name,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'frequency' => $request->frequency,
                'delivery_days' => $request->delivery_days ?? [],
                'products' => [],
                'start_date' => $startDate->toDateString(),
                'end_date' => $period['end_date'],
                'duration_type' => $period['duration_type'],
                'duration_days' => $period['duration_days'],
                'delivery_address' => $request->delivery_address,
                'notes' => $request->notes,
                'value' => (float) $request->quoted_price,
                'agreed_price' => (float) $request->quoted_price,
                'next_delivery' => $nextDelivery->toDateString(),
                'status' => Subscription::STATUS_PENDING,
            ]);

            $items = $request->items()
                ->get()
                ->map(fn (SubscriptionRequestItem $item) => [
                    'item_type' => $item->item_type,
                    'product_id' => $item->product_id,
                    'pack_id' => $item->pack_id,
                    'item_name' => $item->item_name,
                    'quantity' => (float) $item->quantity,
                    'unit' => $item->unit,
                    'unit_price' => (float) $item->unit_price,
                    'line_total' => (float) $item->line_total,
                ]);

            $this->syncSubscriptionItems($subscription, $items);

            $request->update([
                'status' => SubscriptionRequest::STATUS_ACCEPTED,
                'customer_responded_at' => now(),
                'subscription_id' => $subscription->id,
            ]);

            if (SubscriptionRequest::hasDatabaseColumn('resubmitted_from_request_id')
                && SubscriptionRequest::hasDatabaseColumn('archived_at')) {
                $this->archiveAncestorRequests($request);
            }

            $this->ensureInvoiceForSubscription($subscription, $request, $customer);

            return $subscription->fresh(['items.product', 'items.pack', 'request']);
        });
    }

    public function ensureInvoiceForSubscription(Subscription $subscription, ?SubscriptionRequest $request = null, ?Customer $customer = null): Invoice
    {
        return DB::transaction(function () use ($subscription, $request, $customer) {
            $existing = $subscription->invoices()->latest('id')->first();

            if ($existing) {
                if (strtolower((string) $existing->status) === 'paid'
                    && $subscription->status !== Subscription::STATUS_CANCELLED) {
                    $subscription->update(['status' => Subscription::STATUS_ACTIVE]);
                } elseif (strtolower((string) $existing->status) !== 'paid'
                    && ! in_array($subscription->status, [Subscription::STATUS_PENDING, Subscription::STATUS_PAUSED, Subscription::STATUS_CANCELLED], true)) {
                    $subscription->update(['status' => Subscription::STATUS_PENDING]);
                }

                return $existing->loadMissing(['items.product', 'subscription']);
            }

            $subscription->loadMissing([
                'customer.defaultAddress',
                'items.product',
                'items.pack',
                'request.items.product',
                'request.items.pack',
            ]);

            $request = $request ?: $subscription->request;
            $request?->loadMissing(['items.product', 'items.pack']);
            $customer = $customer ?: $subscription->customer;
            $customer?->loadMissing('defaultAddress');

            $total = round((float) ($request?->quoted_price ?: $subscription->agreed_price ?: $subscription->value ?: 0), 2);
            $invoiceItems = $request
                ? $this->invoiceItemsFromRequest($request, $total)
                : $this->invoiceItemsFromSubscription($subscription, $total);

            if ($invoiceItems->isEmpty()) {
                $invoiceItems = collect([$this->summaryInvoiceItem($subscription, $request, $total)]);
            }

            $subtotal = round((float) $invoiceItems->sum('subtotal'), 2);
            $total = $total > 0 ? $total : $subtotal;
            $quoteValidUntil = $request?->quote_valid_until;
            $dueDate = $quoteValidUntil && $quoteValidUntil->gte(now()->startOfDay())
                ? $quoteValidUntil->toDateString()
                : now()->addDays(7)->toDateString();
            $customerName = $customer?->full_name ?: $subscription->customer_name ?: 'Customer Name';
            $customerContact = $customer?->phone ?: $subscription->phone ?: $customer?->email ?: $subscription->email ?: 'N/A';
            $billingAddress = $customer?->address ?: $customer?->defaultAddress?->address_line1 ?: $subscription->delivery_address ?: 'Address';
            $deliveryAddress = $subscription->delivery_address ?: $billingAddress;
            $requestLabel = $request?->request_number ? " from {$request->request_number}" : '';

            $invoice = $subscription->invoices()->create([
                'invoice_number' => $this->generateInvoiceNumber(),
                'order_id' => null,
                'invoice_date' => now()->toDateString(),
                'due_date' => $dueDate,
                'tin_number' => null,
                'customer_name' => $customerName,
                'customer_contact' => $customerContact,
                'bill_to_address' => $billingAddress,
                'deliver_to_name' => $customerName,
                'deliver_to_address' => $deliveryAddress,
                'customer_city' => $customer?->defaultAddress?->city ?: 'Dar es Salaam, Tanzania',
                'subtotal' => $subtotal,
                'tax' => 0,
                'discount' => 0,
                'total' => $total,
                'currency' => 'Tanzanian Shillings',
                'bank_name' => 'CRDB Bank Tanzania',
                'account_name' => 'AMANI BREW - Premium Butchery',
                'account_number' => '0651234567890',
                'status' => 'pending',
                'notes' => "Subscription invoice{$requestLabel}. Payment is required before the subscription becomes active.",
            ]);

            $invoice->items()->createMany($invoiceItems->all());

            if (! in_array($subscription->status, [Subscription::STATUS_PENDING, Subscription::STATUS_PAUSED, Subscription::STATUS_CANCELLED], true)) {
                $subscription->update(['status' => Subscription::STATUS_PENDING]);
            }

            return $invoice->fresh(['items.product', 'subscription']);
        });
    }

    public function pauseSubscription(Subscription $subscription): Subscription
    {
        if ($subscription->status !== Subscription::STATUS_ACTIVE || ! $this->subscriptionHasActivePeriod($subscription)) {
            throw ValidationException::withMessages([
                'subscription' => ['Only active subscriptions can be paused.'],
            ]);
        }

        $subscription->update([
            'status' => Subscription::STATUS_PAUSED,
            'paused_at' => now(),
        ]);

        return $subscription->fresh(['items.product', 'items.pack']);
    }

    public function resumeSubscription(Subscription $subscription): Subscription
    {
        if ($subscription->status !== Subscription::STATUS_PAUSED) {
            throw ValidationException::withMessages([
                'subscription' => ['Only paused subscriptions can be resumed.'],
            ]);
        }

        if (! $this->subscriptionHasActivePeriod($subscription)) {
            throw ValidationException::withMessages([
                'subscription' => ['This subscription has expired and must be renewed before it can resume.'],
            ]);
        }

        $anchor = optional($subscription->next_delivery)?->copy()?->startOfDay() ?? now()->startOfDay();
        if ($anchor->lt(now()->startOfDay())) {
            $anchor = now()->startOfDay();
        }

        $subscription->update([
            'status' => Subscription::STATUS_ACTIVE,
            'paused_at' => null,
            'next_delivery' => SubscriptionScheduler::nextDeliveryDate(
                (string) $subscription->frequency,
                (array) ($subscription->delivery_days ?? []),
                $anchor
            )->toDateString(),
        ]);

        return $subscription->fresh(['items.product', 'items.pack']);
    }

    public function cancelSubscription(Subscription $subscription): Subscription
    {
        if ($subscription->status === Subscription::STATUS_CANCELLED) {
            throw ValidationException::withMessages([
                'subscription' => ['This subscription is already cancelled.'],
            ]);
        }

        $subscription->update([
            'status' => Subscription::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ]);

        return $subscription->fresh(['items.product', 'items.pack']);
    }

    public function skipNextDelivery(Subscription $subscription): Subscription
    {
        if ($subscription->status !== Subscription::STATUS_ACTIVE || ! $this->subscriptionHasActivePeriod($subscription)) {
            throw ValidationException::withMessages([
                'subscription' => ['Only active subscriptions can skip the next delivery.'],
            ]);
        }

        $anchor = optional($subscription->next_delivery)?->copy()?->startOfDay() ?? now()->startOfDay();
        $next = SubscriptionScheduler::nextDeliveryDate(
            (string) $subscription->frequency,
            (array) ($subscription->delivery_days ?? []),
            $anchor->copy()->addDay(),
        );

        if ($subscription->end_date && $next->gt($subscription->end_date->copy()->startOfDay())) {
            throw ValidationException::withMessages([
                'subscription' => ['There is no later delivery date within the current subscription period.'],
            ]);
        }

        $subscription->update([
            'next_delivery' => $next->toDateString(),
        ]);

        return $subscription->fresh(['items.product', 'items.pack']);
    }

    public function expireStaleQuotes(?Customer $customer = null): void
    {
        SubscriptionRequest::query()
            ->when($customer, fn ($query) => $query->where('customer_id', $customer->id))
            ->where('status', SubscriptionRequest::STATUS_QUOTED)
            ->whereDate('quote_valid_until', '<', now()->toDateString())
            ->update(['status' => SubscriptionRequest::STATUS_EXPIRED]);
    }

    protected function subscriptionHasActivePeriod(Subscription $subscription): bool
    {
        $endDate = $subscription->end_date?->copy()?->startOfDay();

        return ! $endDate || $endDate->gte(now()->startOfDay());
    }

    public function previewSubscriptionDates(Subscription $subscription, int $count = 3): Collection
    {
        $status = strtolower((string) $subscription->status);
        $today = now()->startOfDay();
        $endDate = $subscription->end_date?->copy()?->startOfDay();

        if ($status !== 'active' || ($endDate && $endDate->lt($today))) {
            return collect();
        }

        $anchor = $subscription->next_delivery?->copy()->startOfDay()
            ?? $subscription->start_date?->copy()->startOfDay()
            ?? now()->startOfDay();

        if ($anchor->lt($today)) {
            $anchor = $today->copy();
        }

        $dates = $this->previewSchedule(
            (string) $subscription->frequency,
            (array) ($subscription->delivery_days ?? []),
            $anchor,
            $count,
        );

        return $endDate
            ? $dates->filter(fn (Carbon $date) => $date->lte($endDate))->values()
            : $dates;
    }

    public function previewSchedule(string $frequency, array $deliveryDays, mixed $anchor = null, int $count = 3): Collection
    {
        if ($count <= 0) {
            return collect();
        }

        $cursor = $anchor instanceof Carbon
            ? $anchor->copy()->startOfDay()
            : ($anchor ? Carbon::parse((string) $anchor)->startOfDay() : now()->startOfDay());

        $dates = collect();

        for ($index = 0; $index < $count; $index++) {
            $next = SubscriptionScheduler::nextDeliveryDate($frequency, $deliveryDays, $cursor->copy());
            $dates->push($next->copy());
            $cursor = $next->copy()->addDay();
        }

        return $dates;
    }

    public function forecastCostForSubscription(Subscription $subscription): array
    {
        $status = strtolower((string) $subscription->status);
        $price = (float) ($subscription->agreed_price ?: $subscription->value ?: 0);
        $endDate = $subscription->end_date?->copy()?->startOfDay();
        $today = now()->startOfDay();

        if ($price <= 0 || $status !== 'active' || ($endDate && $endDate->lt($today))) {
            return [
                'weekly_deliveries' => 0,
                'monthly_deliveries' => 0,
                'weekly_cost' => 0.0,
                'monthly_cost' => 0.0,
            ];
        }

        $anchor = $subscription->next_delivery?->copy()->startOfDay()
            ?? $subscription->start_date?->copy()->startOfDay()
            ?? $today->copy();

        if ($anchor->lt($today)) {
            $anchor = $today->copy();
        }

        $weeklyEnd = $today->copy()->addDays(6);
        $monthlyEnd = $today->copy()->addDays(29);

        if ($endDate) {
            $weeklyEnd = $endDate->lt($weeklyEnd) ? $endDate->copy() : $weeklyEnd;
            $monthlyEnd = $endDate->lt($monthlyEnd) ? $endDate->copy() : $monthlyEnd;
        }

        $weeklyDeliveries = $this->countOccurrencesWithinWindow(
            (string) $subscription->frequency,
            (array) ($subscription->delivery_days ?? []),
            $anchor->copy(),
            $today->copy(),
            $weeklyEnd,
        );

        $monthlyDeliveries = $this->countOccurrencesWithinWindow(
            (string) $subscription->frequency,
            (array) ($subscription->delivery_days ?? []),
            $anchor->copy(),
            $today->copy(),
            $monthlyEnd,
        );

        return [
            'weekly_deliveries' => $weeklyDeliveries,
            'monthly_deliveries' => $monthlyDeliveries,
            'weekly_cost' => round($weeklyDeliveries * $price, 2),
            'monthly_cost' => round($monthlyDeliveries * $price, 2),
        ];
    }

    public function syncSubscriptionItems(Subscription $subscription, Collection $items): void
    {
        $subscription->items()->delete();
        $subscription->items()->createMany($items->all());
        $subscription->update([
            'products' => $this->buildLegacyProductsPayload($items),
        ]);
    }

    protected function invoiceItemsFromRequest(SubscriptionRequest $request, float $targetTotal): Collection
    {
        $items = $request->items
            ->map(fn (SubscriptionRequestItem $item) => [
                'product_id' => $item->product_id,
                'description' => $item->item_name ?: ($item->item_type === 'pack' ? $item->pack?->name : $item->product?->name) ?: 'Subscription item',
                'quantity' => max(round((float) $item->quantity, 2), 0.01),
                'unit_price' => round((float) $item->unit_price, 2),
                'subtotal' => round((float) $item->line_total, 2),
            ])
            ->filter(fn (array $item) => filled($item['description']) && $item['quantity'] > 0)
            ->values();

        return $this->scaleInvoiceItemsToTotal($items, $targetTotal);
    }

    protected function invoiceItemsFromSubscription(Subscription $subscription, float $targetTotal): Collection
    {
        if ($subscription->items->isNotEmpty()) {
            $items = $subscription->items
                ->map(fn ($item) => [
                    'product_id' => $item->product_id,
                    'description' => $item->item_name ?: ($item->item_type === 'pack' ? $item->pack?->name : $item->product?->name) ?: 'Subscription item',
                    'quantity' => max(round((float) $item->quantity, 2), 0.01),
                    'unit_price' => round((float) $item->unit_price, 2),
                    'subtotal' => round((float) $item->line_total, 2),
                ])
                ->filter(fn (array $item) => filled($item['description']) && $item['quantity'] > 0)
                ->values();

            return $this->scaleInvoiceItemsToTotal($items, $targetTotal);
        }

        $items = collect($subscription->products ?? [])
            ->map(function (array $item) {
                $quantity = max(round((float) ($item['quantity'] ?? 1), 2), 0.01);
                $unitPrice = round((float) ($item['unit_price'] ?? $item['price'] ?? 0), 2);

                return [
                    'product_id' => $item['product_id'] ?? null,
                    'description' => $item['name'] ?? $item['label'] ?? 'Subscription item',
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'subtotal' => round((float) ($item['line_total'] ?? $item['subtotal'] ?? ($quantity * $unitPrice)), 2),
                ];
            })
            ->filter(fn (array $item) => filled($item['description']) && $item['quantity'] > 0)
            ->values();

        return $this->scaleInvoiceItemsToTotal($items, $targetTotal);
    }

    protected function scaleInvoiceItemsToTotal(Collection $items, float $targetTotal): Collection
    {
        $items = $items->values();
        $targetTotal = round($targetTotal, 2);
        $currentTotal = round((float) $items->sum('subtotal'), 2);

        if ($items->isEmpty() || $targetTotal <= 0 || $currentTotal <= 0) {
            return $currentTotal > 0 ? $items : collect();
        }

        if (abs($currentTotal - $targetTotal) <= 0.01) {
            return $items;
        }

        $remaining = $targetTotal;
        $lastIndex = $items->count() - 1;

        return $items->map(function (array $item, int $index) use ($currentTotal, $targetTotal, &$remaining, $lastIndex) {
            $subtotal = $index === $lastIndex
                ? max(round($remaining, 2), 0)
                : round($targetTotal * ((float) $item['subtotal'] / $currentTotal), 2);
            $remaining = round($remaining - $subtotal, 2);
            $quantity = max(round((float) $item['quantity'], 2), 0.01);

            return [
                'product_id' => $item['product_id'] ?? null,
                'description' => $item['description'],
                'quantity' => $quantity,
                'unit_price' => round($subtotal / $quantity, 2),
                'subtotal' => $subtotal,
            ];
        })->values();
    }

    protected function summaryInvoiceItem(Subscription $subscription, ?SubscriptionRequest $request, float $total): array
    {
        $description = $request?->request_number
            ? 'Subscription quote ' . $request->request_number
            : $this->subscriptionDisplayName($subscription);

        return [
            'product_id' => null,
            'description' => $description,
            'quantity' => 1,
            'unit_price' => round(max($total, 0), 2),
            'subtotal' => round(max($total, 0), 2),
        ];
    }

    protected function subscriptionDisplayName(Subscription $subscription): string
    {
        $subscription->loadMissing('items');

        $names = $subscription->items
            ->map(fn ($item) => $item->item_name)
            ->filter()
            ->values();

        if ($names->isEmpty()) {
            return 'Subscription #' . $subscription->id;
        }

        if ($names->count() === 1) {
            return $names->first();
        }

        return $names->take(2)->implode(' + ') . ($names->count() > 2 ? ' +' . ($names->count() - 2) . ' more' : '');
    }

    protected function countOccurrencesWithinWindow(
        string $frequency,
        array $deliveryDays,
        Carbon $anchor,
        Carbon $windowStart,
        Carbon $windowEnd
    ): int {
        $count = 0;
        $cursor = $anchor->greaterThan($windowStart) ? $anchor->copy() : $windowStart->copy();

        while ($cursor->lte($windowEnd)) {
            $next = SubscriptionScheduler::nextDeliveryDate($frequency, $deliveryDays, $cursor->copy());

            if ($next->gt($windowEnd)) {
                break;
            }

            $count++;
            $cursor = $next->copy()->addDay();
        }

        return $count;
    }

    protected function buildItemSnapshots(array $items): Collection
    {
        $normalizedItems = collect($items)->map(function (array $item) {
            $itemType = strtolower((string) ($item['item_type'] ?? 'product'));
            $quantity = (float) ($item['quantity'] ?? 0);

            if (!in_array($itemType, ['product', 'pack'], true) || $quantity <= 0) {
                return null;
            }

            return [
                'item_type' => $itemType,
                'product_id' => $itemType === 'product' ? ($item['product_id'] ?? null) : null,
                'pack_id' => $itemType === 'pack' ? ($item['pack_id'] ?? null) : null,
                'quantity' => $quantity,
            ];
        })->filter()->values();

        $products = Product::query()
            ->with('currentPrice')
            ->whereIn('id', $normalizedItems->pluck('product_id')->filter()->all())
            ->get()
            ->keyBy('id');

        $packs = Pack::query()
            ->whereIn('id', $normalizedItems->pluck('pack_id')->filter()->all())
            ->get()
            ->keyBy('id');

        return $normalizedItems->map(function (array $item) use ($products, $packs) {
            if ($item['item_type'] === 'product') {
                $product = $products->get((int) $item['product_id']);

                if (!$product) {
                    throw ValidationException::withMessages([
                        'items' => ['One of the selected products could not be found.'],
                    ]);
                }

                $unitPrice = (float) ($product->currentPrice?->promo_price ?? $product->currentPrice?->price ?? 0);

                return [
                    'item_type' => 'product',
                    'product_id' => $product->id,
                    'pack_id' => null,
                    'item_name' => $product->name,
                    'quantity' => $item['quantity'],
                    'unit' => $product->unit,
                    'unit_price' => round($unitPrice, 2),
                    'line_total' => round($unitPrice * $item['quantity'], 2),
                ];
            }

            $pack = $packs->get((int) $item['pack_id']);

            if (!$pack) {
                throw ValidationException::withMessages([
                    'items' => ['One of the selected packs could not be found.'],
                ]);
            }

            $unitPrice = (float) $pack->price;

            return [
                'item_type' => 'pack',
                'product_id' => null,
                'pack_id' => $pack->id,
                'item_name' => $pack->name,
                'quantity' => $item['quantity'],
                'unit' => 'pack',
                'unit_price' => round($unitPrice, 2),
                'line_total' => round($unitPrice * $item['quantity'], 2),
            ];
        })->values();
    }

    protected function normalizeSchedule(string $frequency, array $deliveryDays, mixed $startDate = null): array
    {
        $normalizedFrequency = $this->normalizeFrequency($frequency);
        $start = $startDate ? Carbon::parse((string) $startDate)->startOfDay() : now()->startOfDay();
        $days = SubscriptionScheduler::normalizeDeliveryDays($deliveryDays);

        if ($normalizedFrequency === 'Daily') {
            $days = [];
        }

        if ($normalizedFrequency === 'Weekdays only') {
            $days = ['Mon-Fri'];
        }

        if ($normalizedFrequency === 'Weekends only') {
            $days = ['Sat-Sun'];
        }

        if (in_array($normalizedFrequency, ['Weekly', 'Custom'], true) && $days === []) {
            throw ValidationException::withMessages([
                'delivery_days' => ['Choose at least one delivery day for weekly or custom subscriptions.'],
            ]);
        }

        return [
            'frequency' => $normalizedFrequency,
            'delivery_days' => $days,
            'start_date' => $start,
        ];
    }

    protected function normalizeFrequency(string $frequency): string
    {
        $normalized = strtolower(trim($frequency));

        return match ($normalized) {
            'daily' => 'Daily',
            'weekly' => 'Weekly',
            'weekdays', 'weekdays only' => 'Weekdays only',
            'weekends', 'weekends only' => 'Weekends only',
            default => 'Custom',
        };
    }

    protected function buildLegacyProductsPayload(Collection $items): array
    {
        return $items->values()->map(function (array $item, int $index) {
            $quantity = (float) ($item['quantity'] ?? 1);
            $unit = (string) ($item['unit'] ?? ($item['item_type'] === 'pack' ? 'pack' : 'pcs'));
            $name = (string) ($item['item_name'] ?? 'Subscription Item');

            return [
                'id' => $item['id'] ?? ('line-' . $index),
                'item_type' => $item['item_type'],
                'item_id' => $item['item_type'] === 'pack' ? ($item['pack_id'] ?? null) : ($item['product_id'] ?? null),
                'product_id' => $item['product_id'] ?? null,
                'pack_id' => $item['pack_id'] ?? null,
                'name' => $name,
                'quantity' => $quantity,
                'unit' => $unit,
                'unit_price' => round((float) ($item['unit_price'] ?? 0), 2),
                'line_total' => round((float) ($item['line_total'] ?? 0), 2),
                'label' => $name . ' - ' . rtrim(rtrim(number_format($quantity, 2, '.', ''), '0'), '.') . ' ' . $unit,
            ];
        })->all();
    }

    protected function ensureRequestCanBeQuoted(SubscriptionRequest $request): void
    {
        $request = $this->expireRequestIfNeeded($request);

        if (in_array($request->status, [SubscriptionRequest::STATUS_ACCEPTED, SubscriptionRequest::STATUS_REJECTED, SubscriptionRequest::STATUS_EXPIRED], true)) {
            throw ValidationException::withMessages([
                'request' => ['This subscription request can no longer be quoted.'],
            ]);
        }
    }

    protected function archiveAncestorRequests(SubscriptionRequest $request): void
    {
        if (!SubscriptionRequest::hasDatabaseColumn('resubmitted_from_request_id')
            || !SubscriptionRequest::hasDatabaseColumn('archived_at')) {
            return;
        }

        $ancestorId = $request->resubmitted_from_request_id;
        $visited = [];

        while ($ancestorId && !in_array($ancestorId, $visited, true)) {
            $visited[] = $ancestorId;

            $ancestor = SubscriptionRequest::query()->find($ancestorId);

            if (!$ancestor) {
                break;
            }

            if ($ancestor->archived_at === null) {
                $ancestor->update([
                    'archived_at' => now(),
                ]);
            }

            $ancestorId = $ancestor->resubmitted_from_request_id;
        }
    }

    protected function expireRequestIfNeeded(SubscriptionRequest $request): SubscriptionRequest
    {
        if ($request->isQuoteExpired()) {
            $request->update([
                'status' => SubscriptionRequest::STATUS_EXPIRED,
            ]);

            return $request->fresh();
        }

        return $request;
    }

    protected function formatRequestNumber(int $requestId): string
    {
        return 'SR-' . now()->format('Ymd') . '-' . str_pad((string) $requestId, 4, '0', STR_PAD_LEFT);
    }

    protected function temporaryRequestNumber(): string
    {
        return 'TMP-' . now()->format('YmdHis') . '-' . random_int(1000, 9999);
    }
}
