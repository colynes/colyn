<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Notifications\PickupOrderReminderNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SendPickupReminderNotifications extends Command
{
    protected $signature = 'orders:send-pickup-reminders';

    protected $description = 'Notify customers when 10 minutes remain before their scheduled pickup time.';

    public function handle(): int
    {
        if (!Schema::hasColumn('orders', 'pickup_reminder_sent_at')) {
            $this->warn('The pickup reminder column is missing.');

            return self::FAILURE;
        }

        if (!Schema::hasColumn('orders', 'scheduled_pickup_date')) {
            $this->warn('The scheduled pickup date column is missing.');

            return self::FAILURE;
        }

        $start = now()->addMinutes(9)->startOfMinute();
        $end = now()->addMinutes(10)->endOfMinute();

        $orders = Order::query()
            ->with('customer.user')
            ->where('fulfillment_method', 'pickup')
            ->whereNull('pickup_reminder_sent_at')
            ->whereIn('status', ['pending', 'confirmed', 'processing', 'preparing', 'dispatched'])
            ->whereNotNull('pickup_time')
            ->whereNotNull('scheduled_pickup_date')
            ->get()
            ->filter(function (Order $order) use ($start, $end) {
                $pickupMoment = $order->scheduled_pickup_date
                    ? $order->scheduled_pickup_date->copy()->setTimeFromTimeString((string) $order->pickup_time)
                    : null;

                return $pickupMoment?->betweenIncluded($start, $end) ?? false;
            });

        $sentCount = 0;

        foreach ($orders as $order) {
            $customerUser = $order->customer?->user;

            if (!$customerUser) {
                continue;
            }

            DB::transaction(function () use ($order, $customerUser) {
                $customerUser->notify(new PickupOrderReminderNotification($order));
                $order->forceFill(['pickup_reminder_sent_at' => now()])->save();
            });

            $sentCount++;
        }

        $this->info("Sent {$sentCount} pickup reminder notification(s).");

        return self::SUCCESS;
    }
}
