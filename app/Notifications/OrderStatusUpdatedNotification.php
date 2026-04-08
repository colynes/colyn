<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class OrderStatusUpdatedNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected Order $order,
        protected string $statusLabel,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        [$title, $kind, $message] = $this->resolvePresentation();

        return [
            'title' => $title,
            'message' => $message,
            'order_id' => $this->order->id,
            'order_number' => $this->order->order_number,
            'display_order_number' => $this->displayOrderNumber($this->order->order_number),
            'status' => (string) $this->order->status,
            'amount' => (float) $this->order->total,
            'action_url' => '/my-orders',
            'kind' => $kind,
            'created_at' => now()->toIso8601String(),
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }

    protected function resolvePresentation(): array
    {
        $status = strtolower((string) $this->order->status);
        $displayNumber = $this->displayOrderNumber($this->order->order_number);

        return match ($status) {
            'cancelled' => [
                'Order cancelled',
                'order_cancelled',
                'Your order ' . $displayNumber . ' was cancelled.',
            ],
            'dispatched' => [
                'Order dispatched',
                'order_dispatched',
                'Your order ' . $displayNumber . ' has been dispatched.',
            ],
            'delivered' => [
                'Order delivered',
                'order_delivered',
                'Your order ' . $displayNumber . ' was delivered successfully.',
            ],
            'completed' => [
                'Order completed',
                'order_completed',
                'Your pickup order ' . $displayNumber . ' has been collected and completed.',
            ],
            default => [
                'Order update',
                'order_status',
                'Your order ' . $displayNumber . ' is now ' . $this->statusLabel . '.',
            ],
        };
    }

    protected function displayOrderNumber(?string $orderNumber): string
    {
        $value = preg_replace('/^ORD-?/i', '', (string) $orderNumber);

        if (preg_match('/^(\d{8})\d{6}(\d{3})$/', $value, $matches)) {
            return $matches[1] . $matches[2];
        }

        return $value;
    }
}
