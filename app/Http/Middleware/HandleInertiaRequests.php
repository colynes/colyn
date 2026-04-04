<?php

namespace App\Http\Middleware;

use App\Support\CartManager;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Schema;
use Inertia\Middleware;
use Illuminate\Support\Facades\Storage;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user()?->loadMissing('customer.defaultAddress');
        $defaultAddress = $user?->customer?->defaultAddress;
        $hasNotificationsTable = Schema::hasTable('notifications');

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone ?: $user->customer?->phone,
                    'city' => $user->city ?: $defaultAddress?->city,
                    'country' => $user->country ?: 'Tanzania',
                    'address' => $user->customer?->address ?: $defaultAddress?->address_line1,
                    'avatar' => $user->avatar,
                    'avatar_url' => $user->avatar ? Storage::disk('public')->url($user->avatar) : null,
                    'role'  => $user->getRoleNames()->first(),
                    'role_key' => strtolower((string) $user->getRoleNames()->first()),
                ] : null,
            ],
            'notifications' => fn () => ($user && $hasNotificationsTable) ? [
                'unread_count' => $user->unreadNotifications()->count(),
                'items' => $user->unreadNotifications()
                    ->latest()
                    ->take(8)
                    ->get()
                    ->map(fn (DatabaseNotification $notification) => $this->mapNotification($notification))
                    ->values(),
            ] : [
                'unread_count' => 0,
                'items' => [],
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
            'cart' => fn () => CartManager::summary(),
        ];
    }

    protected function mapNotification(DatabaseNotification $notification): array
    {
        $data = $notification->data ?? [];

        return [
            'id' => $notification->id,
            'title' => $data['title'] ?? 'Notification',
            'message' => $data['message'] ?? '',
            'order_id' => $data['order_id'] ?? null,
            'order_number' => $data['order_number'] ?? null,
            'display_order_number' => $data['display_order_number'] ?? null,
            'status' => $data['status'] ?? null,
            'amount' => isset($data['amount']) ? (float) $data['amount'] : null,
            'action_url' => $data['action_url'] ?? null,
            'kind' => $data['kind'] ?? 'general',
            'read_at' => optional($notification->read_at)?->toIso8601String(),
            'created_at' => optional($notification->created_at)?->toIso8601String(),
            'created_at_human' => $notification->created_at?->diffForHumans(),
        ];
    }
}
