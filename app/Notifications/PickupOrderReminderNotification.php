<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class PickupOrderReminderNotification extends Notification
{
    use Queueable;

    public function __construct(protected Order $order)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        $displayNumber = $this->displayOrderNumber($this->order->order_number);

        return [
            'title' => 'Pickup ready soon',
            'message' => 'Your order ' . $displayNumber . ' is ready. Only 10 minutes remain before your scheduled pickup time.',
            'order_id' => $this->order->id,
            'order_number' => $this->order->order_number,
            'display_order_number' => $displayNumber,
            'status' => (string) $this->order->status,
            'amount' => (float) $this->order->total,
            'action_url' => '/my-orders',
            'kind' => 'pickup_reminder',
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
