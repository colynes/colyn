<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Subscription;
use App\Models\SubscriptionItem;
use App\Models\SubscriptionRequest;
use App\Models\User;
use App\Notifications\SystemAlertNotification;
use App\Services\SubscriptionWorkflowService;
use App\Support\BackofficeAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SubscriptionRequestController extends Controller
{
    public function __construct(protected SubscriptionWorkflowService $workflow)
    {
    }

    public function store(Request $request): RedirectResponse|JsonResponse
    {
        $customer = $this->resolveCustomer($request->user());
        abort_unless($customer, 403);

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_type' => ['required', Rule::in(['product', 'pack'])],
            'items.*.product_id' => ['nullable', 'integer', 'exists:products,id'],
            'items.*.pack_id' => ['nullable', 'integer', 'exists:packs,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'frequency' => ['required', Rule::in(['daily', 'weekly', 'weekdays', 'weekends', 'custom'])],
            'delivery_days' => ['nullable', 'array'],
            'delivery_days.*' => ['required', 'string', 'max:30'],
            'start_date' => ['required', 'date'],
            'delivery_address' => ['required', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'offered_price' => ['required', 'numeric', 'min:0'],
            'resubmitted_from_request_id' => ['nullable', 'integer', 'exists:subscription_requests,id'],
        ]);

        $this->validateItemScopes($validated['items']);
        $subscriptionRequest = $this->workflow->createRequest($customer, $request->user(), $validated);
        $this->notifyRequestCreated($subscriptionRequest);

        return $this->response($request, 'Subscription request submitted successfully. Our team will review it shortly.', [
            'request' => [
                'id' => $subscriptionRequest->id,
                'request_number' => $subscriptionRequest->request_number,
                'status' => $subscriptionRequest->status,
            ],
        ], 'requests');
    }

    public function acceptQuote(Request $request, SubscriptionRequest $subscriptionRequest): RedirectResponse|JsonResponse
    {
        $customer = $this->resolveCustomer($request->user());
        abort_unless($customer && $subscriptionRequest->customer_id === $customer->id, 403);

        $subscription = $this->workflow->acceptQuote($subscriptionRequest, $customer);
        $this->notifyQuoteAccepted($subscriptionRequest, $subscription);

        return $this->response($request, 'Quote accepted. Your subscription is now active.', [
            'subscription' => [
                'id' => $subscription->id,
                'status' => $subscription->status,
            ],
        ], 'active');
    }

    public function rejectQuote(Request $request, SubscriptionRequest $subscriptionRequest): RedirectResponse|JsonResponse
    {
        $customer = $this->resolveCustomer($request->user());
        abort_unless($customer && $subscriptionRequest->customer_id === $customer->id, 403);

        $validated = $request->validate([
            'response_message' => ['nullable', 'string', 'max:1000'],
        ]);

        $message = $validated['response_message'] ?? 'Quote rejected by customer.';
        $rejectedRequest = $this->workflow->rejectQuote($subscriptionRequest, $message);
        $this->notifyQuoteRejected($rejectedRequest);

        return $this->response($request, 'Quote rejected. You can submit a new subscription request any time.', [], 'requests');
    }

    public function quote(Request $request, SubscriptionRequest $subscriptionRequest): RedirectResponse|JsonResponse
    {
        abort_unless(BackofficeAccess::hasBackofficeAccess($request->user()), 403);

        $validated = $request->validate([
            'quoted_price' => ['required', 'numeric', 'min:0'],
            'quoted_message' => ['nullable', 'string', 'max:2000'],
            'quote_valid_until' => ['nullable', 'date', 'after_or_equal:today'],
        ]);

        $quotedRequest = $this->workflow->quoteRequest($subscriptionRequest, $validated, $request->user());
        $this->notifyQuoteSent($quotedRequest, $request->user());

        return $this->response($request, 'Quote sent to the customer successfully.', [
            'request' => [
                'id' => $quotedRequest->id,
                'status' => $quotedRequest->status,
            ],
        ], 'requests', 'fat-clients.subscriptions');
    }

    protected function response(
        Request $request,
        string $message,
        array $payload = [],
        string $tab = 'requests',
        string $redirectRoute = 'customer.subscriptions.index'
    ): RedirectResponse|JsonResponse {
        if ($request->expectsJson()) {
            return response()->json(array_merge([
                'message' => $message,
            ], $payload));
        }

        return redirect()
            ->route($redirectRoute, ['tab' => $tab])
            ->with('success', $message);
    }

    protected function validateItemScopes(array $items): void
    {
        foreach ($items as $index => $item) {
            $itemType = strtolower((string) ($item['item_type'] ?? 'product'));
            $fieldPath = 'items.' . $index;

            if ($itemType === 'product' && empty($item['product_id'])) {
                throw ValidationException::withMessages([
                    $fieldPath . '.product_id' => ['Select a product for this line item.'],
                ]);
            }

            if ($itemType === 'pack' && empty($item['pack_id'])) {
                throw ValidationException::withMessages([
                    $fieldPath . '.pack_id' => ['Select a pack for this line item.'],
                ]);
            }
        }
    }

    protected function notifyRequestCreated(SubscriptionRequest $subscriptionRequest): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        $subscriptionRequest->loadMissing('customer.user');

        $customer = $subscriptionRequest->customer;
        $customerName = $customer?->full_name ?: 'Customer';
        $requestNumber = $subscriptionRequest->request_number;
        $offeredPrice = (float) $subscriptionRequest->offered_price;

        $this->notifyUser($customer?->user, [
            'title' => 'Subscription request received',
            'message' => "We received {$requestNumber}. Our back office will review your request shortly.",
            'kind' => 'subscription_request_created',
            'status' => $subscriptionRequest->status,
            'action_url' => route('customer.subscriptions.index', ['tab' => 'requests']),
            'amount' => $offeredPrice,
        ]);

        $this->notifyBackofficeUsers([
            'title' => 'New subscription request',
            'message' => "{$customerName} submitted {$requestNumber}. Offered price: {$this->formatMoney($offeredPrice)}.",
            'kind' => 'subscription_request_created',
            'status' => $subscriptionRequest->status,
            'action_url' => route('fat-clients.subscriptions'),
            'amount' => $offeredPrice,
        ]);
    }

    protected function notifyQuoteSent(SubscriptionRequest $subscriptionRequest, ?User $reviewer = null): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        $subscriptionRequest->loadMissing('customer.user');

        $customer = $subscriptionRequest->customer;
        $customerName = $customer?->full_name ?: 'Customer';
        $requestNumber = $subscriptionRequest->request_number;
        $quotedPrice = (float) ($subscriptionRequest->quoted_price ?? 0);
        $reviewerName = $reviewer?->name ? "{$reviewer->name} " : '';

        $this->notifyUser($customer?->user, [
            'title' => 'Subscription quote ready',
            'message' => "A quote for {$requestNumber} is ready at {$this->formatMoney($quotedPrice)}. Review it from your requests tab.",
            'kind' => 'subscription_quote_sent',
            'status' => $subscriptionRequest->status,
            'action_url' => route('customer.subscriptions.index', ['tab' => 'requests']),
            'amount' => $quotedPrice,
        ]);

        $this->notifyBackofficeUsers([
            'title' => 'Quote sent to customer',
            'message' => "{$reviewerName}sent {$requestNumber} to {$customerName} at {$this->formatMoney($quotedPrice)}.",
            'kind' => 'subscription_quote_sent',
            'status' => $subscriptionRequest->status,
            'action_url' => route('fat-clients.subscriptions'),
            'amount' => $quotedPrice,
        ]);
    }

    protected function notifyQuoteAccepted(SubscriptionRequest $subscriptionRequest, Subscription $subscription): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        $subscriptionRequest->loadMissing('customer.user');
        $subscription->loadMissing('items.product', 'items.pack');

        $customer = $subscriptionRequest->customer;
        $customerName = $customer?->full_name ?: 'Customer';
        $requestNumber = $subscriptionRequest->request_number;
        $subscriptionName = $this->subscriptionName($subscription);
        $agreedPrice = (float) ($subscription->agreed_price ?: $subscription->value ?: $subscriptionRequest->quoted_price ?: 0);

        $this->notifyUser($customer?->user, [
            'title' => 'Subscription activated',
            'message' => "{$subscriptionName} is now active after accepting {$requestNumber}.",
            'kind' => 'subscription_quote_accepted',
            'status' => SubscriptionRequest::STATUS_ACCEPTED,
            'action_url' => route('customer.subscriptions.index', ['tab' => 'active']),
            'amount' => $agreedPrice,
        ]);

        $this->notifyBackofficeUsers([
            'title' => 'Quote accepted by customer',
            'message' => "{$customerName} accepted {$requestNumber}. {$subscriptionName} is now active.",
            'kind' => 'subscription_quote_accepted',
            'status' => SubscriptionRequest::STATUS_ACCEPTED,
            'action_url' => route('fat-clients.subscriptions'),
            'amount' => $agreedPrice,
        ]);
    }

    protected function notifyQuoteRejected(SubscriptionRequest $subscriptionRequest): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        $subscriptionRequest->loadMissing('customer.user');

        $customer = $subscriptionRequest->customer;
        $customerName = $customer?->full_name ?: 'Customer';
        $requestNumber = $subscriptionRequest->request_number;
        $quotedPrice = (float) ($subscriptionRequest->quoted_price ?? $subscriptionRequest->offered_price ?? 0);
        $reason = $subscriptionRequest->rejection_reason ?: $subscriptionRequest->response_message;

        $this->notifyUser($customer?->user, [
            'title' => 'Quote rejected',
            'message' => "You rejected {$requestNumber}. It will remain in your requests list as rejected.",
            'kind' => 'subscription_quote_rejected',
            'status' => SubscriptionRequest::STATUS_REJECTED,
            'action_url' => route('customer.subscriptions.index', ['tab' => 'requests']),
            'amount' => $quotedPrice,
        ]);

        $this->notifyBackofficeUsers([
            'title' => 'Quote rejected by customer',
            'message' => trim("{$customerName} rejected {$requestNumber}." . ($reason ? " {$reason}" : '')),
            'kind' => 'subscription_quote_rejected',
            'status' => SubscriptionRequest::STATUS_REJECTED,
            'action_url' => route('fat-clients.subscriptions'),
            'amount' => $quotedPrice,
        ]);
    }

    protected function notifyBackofficeUsers(array $payload): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        User::query()
            ->get()
            ->filter(fn (User $user) => BackofficeAccess::hasBackofficeAccess($user))
            ->each(fn (User $user) => $user->notify(new SystemAlertNotification($payload)));
    }

    protected function notifyUser(?User $user, array $payload): void
    {
        if (!$user || !Schema::hasTable('notifications')) {
            return;
        }

        $user->notify(new SystemAlertNotification($payload));
    }

    protected function subscriptionName(Subscription $subscription): string
    {
        $subscription->loadMissing('items');

        $names = $subscription->items
            ->map(fn (SubscriptionItem $item) => $item->item_name)
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

    protected function formatMoney(float $amount): string
    {
        return 'Tsh ' . number_format($amount, 0);
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
