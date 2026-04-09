<?php

namespace App\Providers;

use App\Models\User;
use App\Services\FirebaseMessagingService;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(FirebaseMessagingService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Force HTTPS in production to fix Inertia "Blank Page" issues
        if (config('app.env') === 'production') {
            URL::forceScheme('https');
        }

        Event::listen(NotificationSent::class, function (NotificationSent $event): void {
            if ($event->channel !== 'database' || !$event->notifiable instanceof User) {
                return;
            }

            $payload = method_exists($event->notification, 'toArray')
                ? $event->notification->toArray($event->notifiable)
                : [];

            if (is_string($event->response)) {
                $payload['id'] = $event->response;
            } elseif (is_object($event->response) && property_exists($event->response, 'id')) {
                $payload['id'] = $event->response->id;
            }

            app(FirebaseMessagingService::class)->sendToUser($event->notifiable, $payload);
        });
    }
}
