<?php

namespace App\Notifications\Concerns;

trait UsesOptionalBroadcastChannel
{
    protected function notificationChannels(): array
    {
        $channels = ['database'];

        if ($this->shouldBroadcastNotifications()) {
            $channels[] = 'broadcast';
        }

        return $channels;
    }

    protected function shouldBroadcastNotifications(): bool
    {
        $defaultBroadcaster = config('broadcasting.default');

        return is_string($defaultBroadcaster)
            && !in_array($defaultBroadcaster, ['log', 'null'], true);
    }
}
