<?php

namespace App\Notifications;

use App\Models\Order;
use App\Notifications\Concerns\UsesOptionalBroadcastChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class NewOrderPlacedNotification extends Notification
{
    use Queueable;
    use UsesOptionalBroadcastChannel;

    public function __construct(
        protected Order $order,
    ) {
    }

    public function via(object $notifiable): array
    {
        return $this->notificationChannels();
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'New order placed',
            'message' => 'Order ' . $this->displayOrderNumber($this->order->order_number) . ' is ready for review.',
            'order_id' => $this->order->id,
            'order_number' => $this->order->order_number,
            'display_order_number' => $this->displayOrderNumber($this->order->order_number),
            'status' => (string) $this->order->status,
            'amount' => (float) $this->order->total,
            'action_url' => '/orders',
            'kind' => 'new_order',
            'created_at' => now()->toIso8601String(),
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
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
