<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('notification_tokens')) {
            DB::table('notification_tokens')
                ->select('token')
                ->groupBy('token')
                ->havingRaw('COUNT(*) > 1')
                ->pluck('token')
                ->each(function (string $token): void {
                    $idsToDelete = DB::table('notification_tokens')
                        ->where('token', $token)
                        ->orderByDesc('updated_at')
                        ->orderByDesc('id')
                        ->skip(1)
                        ->pluck('id');

                    if ($idsToDelete->isNotEmpty()) {
                        DB::table('notification_tokens')->whereIn('id', $idsToDelete)->delete();
                    }
                });

            Schema::table('notification_tokens', function (Blueprint $table) {
                if (!$this->hasIndex('notification_tokens', 'notification_tokens_token_unique')) {
                    $table->unique('token', 'notification_tokens_token_unique');
                }
            });
        }

        if (Schema::hasTable('subscriptions')) {
            Schema::table('subscriptions', function (Blueprint $table) {
                if (!$this->hasIndex('subscriptions', 'subscriptions_status_next_delivery_index')) {
                    $table->index(['status', 'next_delivery'], 'subscriptions_status_next_delivery_index');
                }

                if (!$this->hasIndex('subscriptions', 'subscriptions_customer_status_next_delivery_index')) {
                    $table->index(['customer_id', 'status', 'next_delivery'], 'subscriptions_customer_status_next_delivery_index');
                }
            });
        }

        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (Schema::hasColumn('orders', 'scheduled_delivery_date') && !$this->hasIndex('orders', 'orders_status_scheduled_delivery_date_index')) {
                    $table->index(['status', 'scheduled_delivery_date'], 'orders_status_scheduled_delivery_date_index');
                }

                if (Schema::hasColumn('orders', 'scheduled_pickup_date') && !$this->hasIndex('orders', 'orders_status_scheduled_pickup_date_index')) {
                    $table->index(['status', 'scheduled_pickup_date'], 'orders_status_scheduled_pickup_date_index');
                }
            });
        }

        if (Schema::hasTable('deliveries')) {
            Schema::table('deliveries', function (Blueprint $table) {
                if (!$this->hasIndex('deliveries', 'deliveries_status_created_at_index')) {
                    $table->index(['status', 'created_at'], 'deliveries_status_created_at_index');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('deliveries') && $this->hasIndex('deliveries', 'deliveries_status_created_at_index')) {
            Schema::table('deliveries', function (Blueprint $table) {
                $table->dropIndex('deliveries_status_created_at_index');
            });
        }

        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if ($this->hasIndex('orders', 'orders_status_scheduled_delivery_date_index')) {
                    $table->dropIndex('orders_status_scheduled_delivery_date_index');
                }

                if ($this->hasIndex('orders', 'orders_status_scheduled_pickup_date_index')) {
                    $table->dropIndex('orders_status_scheduled_pickup_date_index');
                }
            });
        }

        if (Schema::hasTable('subscriptions')) {
            Schema::table('subscriptions', function (Blueprint $table) {
                if ($this->hasIndex('subscriptions', 'subscriptions_status_next_delivery_index')) {
                    $table->dropIndex('subscriptions_status_next_delivery_index');
                }

                if ($this->hasIndex('subscriptions', 'subscriptions_customer_status_next_delivery_index')) {
                    $table->dropIndex('subscriptions_customer_status_next_delivery_index');
                }
            });
        }

        if (Schema::hasTable('notification_tokens') && $this->hasIndex('notification_tokens', 'notification_tokens_token_unique')) {
            Schema::table('notification_tokens', function (Blueprint $table) {
                $table->dropUnique('notification_tokens_token_unique');
            });
        }
    }

    protected function hasIndex(string $table, string $indexName): bool
    {
        return collect(DB::select('SHOW INDEX FROM ' . $table))
            ->contains(fn ($index) => $index->Key_name === $indexName);
    }
};
