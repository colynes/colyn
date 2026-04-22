<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Pack;
use App\Models\Product;
use App\Models\Subscription;
use App\Models\SubscriptionItem;
use App\Models\SubscriptionRequest;
use App\Models\SubscriptionRequestItem;
use App\Models\User;
use App\Services\SubscriptionWorkflowService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class CustomerSubscriptionController extends Controller
{
    public function __construct(protected SubscriptionWorkflowService $workflow)
    {
    }

    public function index(Request $request): Response
    {
        $customer = $this->resolveCustomer($request->user());
        abort_unless($customer, 403);

        $customer->loadMissing('defaultAddress');
        $this->workflow->expireStaleQuotes($customer);

        $requestsQuery = SubscriptionRequest::query()
            ->where('customer_id', $customer->id)
            ->where('status', '!=', SubscriptionRequest::STATUS_ACCEPTED)
            ->with(['items.product.currentPrice', 'items.pack', 'subscription.items'])
            ->latest();

        if (SubscriptionRequest::hasDatabaseColumn('archived_at')) {
            $requestsQuery->whereNull('archived_at');
        }

        $requests = $requestsQuery->get();

        $subscriptions = Subscription::query()
            ->where('customer_id', $customer->id)
            ->with(['items.product.currentPrice', 'items.pack', 'request'])
            ->latest()
            ->get();

        $requestPayload = $requests->map(fn (SubscriptionRequest $subscriptionRequest) => $this->mapRequest($subscriptionRequest))->values();
        $subscriptionPayload = $subscriptions->map(fn (Subscription $subscription) => $this->mapSubscription($subscription))->values();
        $upcomingDeliveries = $subscriptions
            ->filter(fn (Subscription $subscription) => strtolower((string) $subscription->status) === 'active')
            ->flatMap(fn (Subscription $subscription) => $this->mapUpcomingDeliveries($subscription, 4))
            ->sortBy('delivery_date')
            ->values()
            ->take(12)
            ->values();

        $products = Product::query()
            ->active()
            ->with('currentPrice')
            ->orderBy('name')
            ->get(['id', 'name', 'unit'])
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'unit' => $product->unit,
                'price' => (float) ($product->currentPrice?->promo_price ?? $product->currentPrice?->price ?? 0),
            ])
            ->values();

        $packs = Pack::query()
            ->active()
            ->with(['items.product:id,name,unit'])
            ->orderBy('name')
            ->get()
            ->map(fn (Pack $pack) => [
                'id' => $pack->id,
                'name' => $pack->name,
                'price' => (float) $pack->price,
                'description' => $pack->comes_with ?: $pack->description,
                'items' => $pack->items->map(fn ($item) => [
                    'product_name' => $item->product?->name,
                    'quantity' => (float) $item->quantity,
                    'unit' => $item->product?->unit,
                ])->values(),
            ])
            ->values();

        return Inertia::render('MySubscriptions', [
            'subscriptionRequests' => $requestPayload,
            'activeSubscriptions' => $subscriptionPayload,
            'upcomingDeliveries' => $upcomingDeliveries,
            'catalog' => [
                'products' => $products,
                'packs' => $packs,
            ],
            'customerMeta' => [
                'customer_id' => $customer->id,
                'full_name' => $customer->full_name,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'default_delivery_address' => $customer->defaultAddress?->address_line1 ?: $customer->address,
                'default_delivery_notes' => $customer->defaultAddress?->address_line2,
                'default_city' => $customer->defaultAddress?->city,
            ],
            'summary' => [
                'pending_requests' => $requestPayload->where('status', SubscriptionRequest::STATUS_PENDING_REVIEW)->count(),
                'quoted_requests' => $requestPayload->where('status', SubscriptionRequest::STATUS_QUOTED)->count(),
                'active_subscriptions' => $subscriptionPayload->where('status', 'active')->count(),
                'next_delivery' => $upcomingDeliveries->first(),
            ],
            'initialTab' => $request->string('tab')->toString() ?: 'requests',
        ]);
    }

    public function pause(Request $request, Subscription $subscription): RedirectResponse|JsonResponse
    {
        $customer = $this->resolveCustomer($request->user());
        abort_unless($customer && $subscription->customer_id === $customer->id, 403);

        $subscription = $this->workflow->pauseSubscription($subscription);

        return $this->actionResponse($request, 'Subscription paused successfully.', [
            'subscription' => $this->mapSubscription($subscription),
        ], 'active');
    }

    public function resume(Request $request, Subscription $subscription): RedirectResponse|JsonResponse
    {
        $customer = $this->resolveCustomer($request->user());
        abort_unless($customer && $subscription->customer_id === $customer->id, 403);

        $subscription = $this->workflow->resumeSubscription($subscription);

        return $this->actionResponse($request, 'Subscription resumed successfully.', [
            'subscription' => $this->mapSubscription($subscription),
        ], 'active');
    }

    public function cancel(Request $request, Subscription $subscription): RedirectResponse|JsonResponse
    {
        $customer = $this->resolveCustomer($request->user());
        abort_unless($customer && $subscription->customer_id === $customer->id, 403);

        $subscription = $this->workflow->cancelSubscription($subscription);

        return $this->actionResponse($request, 'Subscription cancelled successfully.', [
            'subscription' => $this->mapSubscription($subscription),
        ], 'active');
    }

    public function skipNextDelivery(Request $request, Subscription $subscription): RedirectResponse|JsonResponse
    {
        $customer = $this->resolveCustomer($request->user());
        abort_unless($customer && $subscription->customer_id === $customer->id, 403);

        $subscription = $this->workflow->skipNextDelivery($subscription);

        return $this->actionResponse($request, 'Next delivery skipped successfully.', [
            'subscription' => $this->mapSubscription($subscription),
        ], 'upcoming');
    }

    protected function actionResponse(Request $request, string $message, array $payload = [], string $tab = 'requests'): RedirectResponse|JsonResponse
    {
        if ($request->expectsJson()) {
            return response()->json(array_merge([
                'message' => $message,
            ], $payload));
        }

        return redirect()
            ->route('customer.subscriptions.index', ['tab' => $tab])
            ->with('success', $message);
    }

    protected function mapRequest(SubscriptionRequest $subscriptionRequest): array
    {
        $subscriptionRequest->loadMissing([
            'items.product.currentPrice',
            'items.pack',
            'subscription.items.product.currentPrice',
            'subscription.items.pack',
        ]);
        $status = (string) $subscriptionRequest->status;

        return [
            'id' => $subscriptionRequest->id,
            'request_number' => $subscriptionRequest->request_number,
            'submitted_date' => optional($subscriptionRequest->created_at)->toDateString(),
            'submitted_date_label' => optional($subscriptionRequest->created_at)->format('d M Y'),
            'resubmitted_from_request_id' => SubscriptionRequest::hasDatabaseColumn('resubmitted_from_request_id')
                ? $subscriptionRequest->resubmitted_from_request_id
                : null,
            'frequency' => $subscriptionRequest->frequency,
            'delivery_days' => $subscriptionRequest->delivery_days ?? [],
            'delivery_days_label' => $this->deliveryDaysLabel($subscriptionRequest->frequency, $subscriptionRequest->delivery_days ?? []),
            'start_date' => optional($subscriptionRequest->start_date)->toDateString(),
            'start_date_label' => optional($subscriptionRequest->start_date)->format('d M Y'),
            'delivery_address' => $subscriptionRequest->delivery_address,
            'notes' => $subscriptionRequest->notes,
            'offered_price' => (float) $subscriptionRequest->offered_price,
            'quoted_price' => $subscriptionRequest->quoted_price !== null ? (float) $subscriptionRequest->quoted_price : null,
            'quoted_message' => $subscriptionRequest->quoted_message,
            'quote_valid_until' => optional($subscriptionRequest->quote_valid_until)->toDateString(),
            'quote_valid_until_label' => optional($subscriptionRequest->quote_valid_until)->format('d M Y'),
            'status' => $status,
            'status_label' => $this->requestStatusLabel($status),
            'response_message' => $subscriptionRequest->response_message,
            'rejection_reason' => $subscriptionRequest->rejection_reason,
            'items' => $subscriptionRequest->items->map(fn (SubscriptionRequestItem $item) => $this->mapRequestItem($item))->values(),
            'can_accept_quote' => $status === SubscriptionRequest::STATUS_QUOTED,
            'can_reject_quote' => in_array($status, [SubscriptionRequest::STATUS_PENDING_REVIEW, SubscriptionRequest::STATUS_QUOTED], true),
            'subscription' => $subscriptionRequest->subscription
                ? $this->mapRequestSubscriptionSummary($subscriptionRequest->subscription)
                : null,
        ];
    }

    protected function mapRequestSubscriptionSummary(Subscription $subscription): array
    {
        $subscription->loadMissing(['items.product.currentPrice', 'items.pack']);
        $price = (float) ($subscription->agreed_price ?: $subscription->value ?: 0);

        return [
            'id' => $subscription->id,
            'name' => $this->subscriptionName($subscription),
            'agreed_price' => $price,
            'next_delivery_date' => optional($subscription->next_delivery)->toDateString(),
            'next_delivery_label' => optional($subscription->next_delivery)->format('D, d M Y'),
            'frequency' => $subscription->frequency,
            'delivery_days' => $subscription->delivery_days ?? [],
            'delivery_days_label' => $this->deliveryDaysLabel($subscription->frequency, $subscription->delivery_days ?? []),
            'start_date' => optional($subscription->start_date)->toDateString(),
            'start_date_label' => optional($subscription->start_date)->format('d M Y'),
            'delivery_address' => $subscription->delivery_address,
            'notes' => $subscription->notes,
        ];
    }

    protected function mapSubscription(Subscription $subscription): array
    {
        $subscription->loadMissing(['items.product.currentPrice', 'items.pack', 'request']);
        $status = strtolower((string) $subscription->status);
        $price = (float) ($subscription->agreed_price ?: $subscription->value ?: 0);
        $forecast = $this->workflow->forecastCostForSubscription($subscription);
        $upcomingDates = $this->workflow->previewSubscriptionDates($subscription, 3)
            ->map(fn (Carbon $date) => [
                'date' => $date->toDateString(),
                'label' => $date->format('D, d M Y'),
            ])
            ->values();

        return [
            'id' => $subscription->id,
            'name' => $this->subscriptionName($subscription),
            'status' => $status,
            'status_label' => (string) $subscription->status,
            'frequency' => $subscription->frequency,
            'delivery_days' => $subscription->delivery_days ?? [],
            'delivery_days_label' => $this->deliveryDaysLabel($subscription->frequency, $subscription->delivery_days ?? []),
            'next_delivery_date' => optional($subscription->next_delivery)->toDateString(),
            'next_delivery_label' => optional($subscription->next_delivery)->format('D, d M Y'),
            'agreed_price' => $price,
            'delivery_address' => $subscription->delivery_address,
            'notes' => $subscription->notes,
            'start_date' => optional($subscription->start_date)->toDateString(),
            'start_date_label' => optional($subscription->start_date)->format('d M Y'),
            'items' => $this->subscriptionItems($subscription)->map(fn (array $item) => $item)->values(),
            'item_count' => $this->subscriptionItems($subscription)->count(),
            'upcoming_dates' => $upcomingDates,
            'estimated_weekly_cost' => (float) $forecast['weekly_cost'],
            'estimated_monthly_cost' => (float) $forecast['monthly_cost'],
            'estimated_weekly_deliveries' => (int) $forecast['weekly_deliveries'],
            'estimated_monthly_deliveries' => (int) $forecast['monthly_deliveries'],
            'can_pause' => $status === 'active',
            'can_resume' => $status === 'paused',
            'can_cancel' => $status !== 'cancelled',
            'can_skip_next_delivery' => $status === 'active',
            'request' => $subscription->request ? [
                'id' => $subscription->request->id,
                'request_number' => $subscription->request->request_number,
            ] : null,
        ];
    }

    protected function mapUpcomingDeliveries(Subscription $subscription, int $count = 4)
    {
        $name = $this->subscriptionName($subscription);
        $price = (float) ($subscription->agreed_price ?: $subscription->value ?: 0);
        $items = $this->subscriptionItems($subscription);

        return $this->workflow->previewSubscriptionDates($subscription, $count)
            ->map(function (Carbon $date) use ($subscription, $name, $price, $items) {
                return [
                    'id' => $subscription->id . '-' . $date->format('Ymd'),
                    'subscription_id' => $subscription->id,
                    'subscription_name' => $name,
                    'delivery_date' => $date->toDateString(),
                    'delivery_date_label' => $date->format('D, d M Y'),
                    'total_value' => $price,
                    'items' => $items->map(fn (array $item) => [
                        'name' => $item['name'],
                        'quantity' => $item['quantity'],
                        'unit' => $item['unit'],
                    ])->values(),
                ];
            })
            ->values();
    }

    protected function mapRequestItem(SubscriptionRequestItem $item): array
    {
        return [
            'id' => $item->id,
            'item_type' => $item->item_type,
            'product_id' => $item->product_id,
            'pack_id' => $item->pack_id,
            'name' => $item->item_name ?: ($item->item_type === 'pack' ? $item->pack?->name : $item->product?->name),
            'quantity' => (float) $item->quantity,
            'unit' => $item->unit ?: ($item->item_type === 'pack' ? 'pack' : $item->product?->unit),
            'price' => (float) $item->unit_price,
            'unit_price' => (float) $item->unit_price,
            'line_total' => (float) $item->line_total,
        ];
    }

    protected function subscriptionItems(Subscription $subscription)
    {
        if ($subscription->relationLoaded('items') && $subscription->items->isNotEmpty()) {
            return $subscription->items->map(fn (SubscriptionItem $item) => [
                'id' => $item->id,
                'item_type' => $item->item_type,
                'name' => $item->item_name ?: ($item->item_type === 'pack' ? $item->pack?->name : $item->product?->name),
                'quantity' => (float) $item->quantity,
                'unit' => $item->unit ?: ($item->item_type === 'pack' ? 'pack' : $item->product?->unit),
                'unit_price' => (float) $item->unit_price,
                'line_total' => (float) $item->line_total,
            ])->values();
        }

        return collect($subscription->products ?? [])->map(function (array $item, int $index) {
            return [
                'id' => $item['id'] ?? ('legacy-' . $index),
                'item_type' => $item['item_type'] ?? 'product',
                'name' => $item['name'] ?? 'Subscription Item',
                'quantity' => (float) ($item['quantity'] ?? 1),
                'unit' => $item['unit'] ?? 'pcs',
                'unit_price' => (float) ($item['unit_price'] ?? 0),
                'line_total' => (float) ($item['line_total'] ?? 0),
            ];
        })->values();
    }

    protected function subscriptionName(Subscription $subscription): string
    {
        $items = $this->subscriptionItems($subscription);
        $names = $items->pluck('name')->filter()->values();

        if ($names->isEmpty()) {
            return 'Subscription #' . $subscription->id;
        }

        if ($names->count() === 1) {
            return $names->first();
        }

        return $names->take(2)->implode(' + ') . ($names->count() > 2 ? ' +' . ($names->count() - 2) . ' more' : '');
    }

    protected function deliveryDaysLabel(?string $frequency, array $days): string
    {
        $frequency = strtolower((string) $frequency);

        if ($frequency === 'daily') {
            return 'Every day';
        }

        if ($frequency === 'weekdays only') {
            return 'Mon-Fri';
        }

        if ($frequency === 'weekends only') {
            return 'Sat-Sun';
        }

        if ($days === []) {
            return 'Flexible schedule';
        }

        return implode(', ', $days);
    }

    protected function requestStatusLabel(string $status): string
    {
        return match ($status) {
            SubscriptionRequest::STATUS_PENDING_REVIEW => 'Pending Review',
            SubscriptionRequest::STATUS_QUOTED => 'Quoted',
            SubscriptionRequest::STATUS_ACCEPTED => 'Accepted',
            SubscriptionRequest::STATUS_REJECTED => 'Rejected',
            SubscriptionRequest::STATUS_EXPIRED => 'Expired',
            default => ucfirst(str_replace('_', ' ', $status)),
        };
    }

    protected function resolveCustomer(?User $user): ?Customer
    {
        if (!$user) {
            return null;
        }

        if ($user->customer) {
            return $user->customer;
        }

        $roles = $user->getRoleNames()->map(fn ($role) => strtolower((string) $role));

        if (!$roles->contains('customer')) {
            return null;
        }

        return Customer::create([
            'user_id' => $user->id,
            'full_name' => $user->name,
            'phone' => '',
            'email' => $user->email,
            'status' => 'Active',
        ] + (Schema::hasColumn('customers', 'address') ? [
            'address' => '',
        ] : []));
    }
}
