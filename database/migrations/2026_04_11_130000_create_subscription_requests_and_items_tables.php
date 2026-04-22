<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('subscription_requests')) {
            Schema::create('subscription_requests', function (Blueprint $table) {
                $table->id();
                $table->string('request_number')->unique();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
                $table->string('frequency', 50);
                $table->json('delivery_days')->nullable();
                $table->date('start_date')->nullable();
                $table->text('delivery_address')->nullable();
                $table->text('notes')->nullable();
                $table->decimal('offered_price', 12, 2)->default(0);
                $table->decimal('quoted_price', 12, 2)->nullable();
                $table->text('quoted_message')->nullable();
                $table->date('quote_valid_until')->nullable();
                $table->timestamp('quoted_at')->nullable();
                $table->string('status', 40)->default('pending_review');
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamp('customer_responded_at')->nullable();
                $table->text('response_message')->nullable();
                $table->text('rejection_reason')->nullable();
                $table->unsignedBigInteger('subscription_id')->nullable();
                $table->timestamps();

                $table->index(['customer_id', 'status'], 'sub_requests_customer_status_idx');
                $table->index(['user_id', 'status'], 'sub_requests_user_status_idx');
            });
        }

        if (!Schema::hasTable('subscription_request_items')) {
            Schema::create('subscription_request_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('subscription_request_id')->constrained()->cascadeOnDelete();
                $table->string('item_type', 20);
                $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('pack_id')->nullable()->constrained()->nullOnDelete();
                $table->string('item_name');
                $table->decimal('quantity', 10, 2)->default(1);
                $table->string('unit', 40)->nullable();
                $table->decimal('unit_price', 12, 2)->default(0);
                $table->decimal('line_total', 12, 2)->default(0);
                $table->timestamps();

                $table->index(['subscription_request_id', 'item_type'], 'sub_req_items_req_type_idx');
            });
        }

        if (!Schema::hasTable('subscription_items')) {
            Schema::create('subscription_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('subscription_id')->constrained()->cascadeOnDelete();
                $table->string('item_type', 20);
                $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('pack_id')->nullable()->constrained()->nullOnDelete();
                $table->string('item_name');
                $table->decimal('quantity', 10, 2)->default(1);
                $table->string('unit', 40)->nullable();
                $table->decimal('unit_price', 12, 2)->default(0);
                $table->decimal('line_total', 12, 2)->default(0);
                $table->timestamps();

                $table->index(['subscription_id', 'item_type'], 'sub_items_sub_type_idx');
            });
        }

        if (Schema::hasTable('subscriptions')) {
            Schema::table('subscriptions', function (Blueprint $table) {
                if (!Schema::hasColumn('subscriptions', 'subscription_request_id')) {
                    $table->unsignedBigInteger('subscription_request_id')->nullable()->after('customer_id');
                    $table->index('subscription_request_id');
                }

                if (!Schema::hasColumn('subscriptions', 'start_date')) {
                    $table->date('start_date')->nullable()->after('products');
                }

                if (!Schema::hasColumn('subscriptions', 'delivery_address')) {
                    $table->text('delivery_address')->nullable()->after('start_date');
                }

                if (!Schema::hasColumn('subscriptions', 'notes')) {
                    $table->text('notes')->nullable()->after('delivery_address');
                }

                if (!Schema::hasColumn('subscriptions', 'agreed_price')) {
                    $table->decimal('agreed_price', 12, 2)->default(0)->after('value');
                }

                if (!Schema::hasColumn('subscriptions', 'paused_at')) {
                    $table->timestamp('paused_at')->nullable()->after('status');
                }

                if (!Schema::hasColumn('subscriptions', 'cancelled_at')) {
                    $table->timestamp('cancelled_at')->nullable()->after('paused_at');
                }
            });

            if (Schema::hasColumn('subscriptions', 'agreed_price') && Schema::hasColumn('subscriptions', 'value')) {
                DB::table('subscriptions')
                    ->where(function ($query) {
                        $query->whereNull('agreed_price')->orWhere('agreed_price', 0);
                    })
                    ->update(['agreed_price' => DB::raw('value')]);
            }

            $subscriptions = DB::table('subscriptions')->select('id', 'products', 'created_at', 'updated_at')->get();

            foreach ($subscriptions as $subscription) {
                $alreadyBackfilled = DB::table('subscription_items')
                    ->where('subscription_id', $subscription->id)
                    ->exists();

                if ($alreadyBackfilled) {
                    continue;
                }

                $products = json_decode($subscription->products ?? '[]', true);

                if (!is_array($products) || $products === []) {
                    continue;
                }

                $rows = collect($products)
                    ->map(function (array $item) use ($subscription) {
                        $quantity = (float) ($item['quantity'] ?? 1);
                        $unitPrice = (float) ($item['unit_price'] ?? 0);

                        return [
                            'subscription_id' => $subscription->id,
                            'item_type' => 'product',
                            'product_id' => $item['product_id'] ?? null,
                            'pack_id' => null,
                            'item_name' => $item['name'] ?? 'Product',
                            'quantity' => $quantity,
                            'unit' => $item['unit'] ?? 'pcs',
                            'unit_price' => $unitPrice,
                            'line_total' => $item['line_total'] ?? ($unitPrice * $quantity),
                            'created_at' => $subscription->created_at,
                            'updated_at' => $subscription->updated_at,
                        ];
                    })
                    ->filter(fn (array $row) => !empty($row['product_id']) || !empty($row['item_name']))
                    ->values()
                    ->all();

                if ($rows !== []) {
                    DB::table('subscription_items')->insert($rows);
                }
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('subscriptions')) {
            Schema::table('subscriptions', function (Blueprint $table) {
                if (Schema::hasColumn('subscriptions', 'subscription_request_id')) {
                    $table->dropIndex(['subscription_request_id']);
                    $table->dropColumn('subscription_request_id');
                }

                foreach (['start_date', 'delivery_address', 'notes', 'agreed_price', 'paused_at', 'cancelled_at'] as $column) {
                    if (Schema::hasColumn('subscriptions', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        Schema::dropIfExists('subscription_items');
        Schema::dropIfExists('subscription_request_items');
        Schema::dropIfExists('subscription_requests');
    }
};

