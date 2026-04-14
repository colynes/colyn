<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;
use App\Notifications\Concerns\UsesOptionalBroadcastChannel;

class SystemAlertNotification extends Notification
{
    use Queueable;
    use UsesOptionalBroadcastChannel;

    public function __construct(
        protected array $payload,
    ) {
    }

    public function via(object $notifiable): array
    {
        return $this->notificationChannels();
    }

    public function toArray(object $notifiable): array
    {
        return array_merge([
            'title' => 'Notification',
            'message' => '',
            'kind' => 'general',
            'status' => null,
            'action_url' => null,
            'created_at' => now()->toIso8601String(),
        ], $this->payload);
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
