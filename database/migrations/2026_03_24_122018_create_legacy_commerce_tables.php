<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('branches')) {
            Schema::create('branches', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('address')->nullable();
                $table->string('phone')->nullable();
                $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index('is_active');
            });
        }

        if (!Schema::hasTable('categories')) {
            Schema::create('categories', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('slug')->index();
                $table->text('description')->nullable();
                $table->string('image')->nullable();
                $table->boolean('is_active')->default(true);
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();
                $table->softDeletes();

                $table->index(['is_active', 'sort_order']);
            });
        }

        if (!Schema::hasTable('customers')) {
            Schema::create('customers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->unique()->constrained('users')->nullOnDelete();
                $table->string('full_name');
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->date('birth_date')->nullable();
                $table->integer('loyalty_points')->default(0);
                $table->string('status', 30)->default('Active');
                $table->timestamps();

                $table->index('loyalty_points');
                $table->index('status');
            });
        }

        if (!Schema::hasTable('customer_addresses')) {
            Schema::create('customer_addresses', function (Blueprint $table) {
                $table->id();
                $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
                $table->string('address_line1');
                $table->string('address_line2')->nullable();
                $table->string('city')->nullable();
                $table->string('postal_code')->nullable();
                $table->string('phone')->nullable();
                $table->boolean('is_default')->default(false);
                $table->timestamps();

                $table->index(['customer_id', 'is_default']);
            });
        }

        if (!Schema::hasTable('products')) {
            Schema::create('products', function (Blueprint $table) {
                $table->id();
                $table->foreignId('category_id')->constrained()->restrictOnDelete();
                $table->string('name');
                $table->string('slug')->index();
                $table->text('description')->nullable();
                $table->string('sku')->nullable()->index();
                $table->string('barcode')->nullable()->index();
                $table->string('unit');
                $table->decimal('weight', 10, 2)->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();

                $table->index('is_active');
            });
        }

        if (!Schema::hasTable('product_prices')) {
            Schema::create('product_prices', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->decimal('price', 12, 2);
                $table->decimal('promo_price', 12, 2)->nullable();
                $table->dateTime('effective_from');
                $table->dateTime('effective_to')->nullable();
                $table->timestamps();

                $table->unique(['product_id', 'effective_from']);
                $table->index(['product_id', 'effective_to']);
            });
        }

        if (!Schema::hasTable('stocks')) {
            Schema::create('stocks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
                $table->decimal('quantity', 12, 2)->default(0);
                $table->decimal('min_stock', 12, 2)->default(0);
                $table->decimal('reorder_level', 12, 2)->default(0);
                $table->timestamps();

                $table->unique(['product_id', 'branch_id']);
            });
        }

        if (!Schema::hasTable('orders')) {
            Schema::create('orders', function (Blueprint $table) {
                $table->id();
                $table->string('order_number')->unique();
                $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
                $table->enum('status', [
                    'pending',
                    'confirmed',
                    'preparing',
                    'ready',
                    'delivered',
                    'completed',
                    'cancelled',
                ])->default('pending');
                $table->decimal('subtotal', 12, 2)->default(0);
                $table->decimal('tax', 12, 2)->default(0);
                $table->decimal('total', 12, 2)->default(0);
                $table->string('payment_method')->nullable();
                $table->boolean('is_paid')->default(false);
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['status', 'created_at']);
                $table->index('is_paid');
            });
        }

        if (!Schema::hasTable('order_items')) {
            Schema::create('order_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_id')->constrained()->restrictOnDelete();
                $table->decimal('quantity', 12, 2)->default(1);
                $table->decimal('price', 12, 2);
                $table->decimal('unit_price', 12, 2);
                $table->decimal('subtotal', 12, 2);
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('deliveries')) {
            Schema::create('deliveries', function (Blueprint $table) {
                $table->id();
                $table->string('delivery_number')->unique();
                $table->foreignId('order_id')->constrained()->cascadeOnDelete();
                $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
                $table->enum('status', [
                    'pending',
                    'in_transit',
                    'delivered',
                    'failed',
                ])->default('pending');
                $table->decimal('delivery_fee', 12, 2)->default(0);
                $table->string('tracking_number')->nullable()->unique();
                $table->foreignId('driver_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('delivery_items')) {
            Schema::create('delivery_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('delivery_id')->constrained()->cascadeOnDelete();
                $table->foreignId('order_item_id')->nullable()->constrained()->nullOnDelete();
                $table->decimal('delivered_quantity', 12, 2)->default(0);
                $table->timestamps();

                $table->unique(['delivery_id', 'order_item_id']);
            });
        }

        if (!Schema::hasTable('invoices')) {
            Schema::create('invoices', function (Blueprint $table) {
                $table->id();
                $table->string('invoice_number')->unique();
                $table->foreignId('order_id')->constrained()->cascadeOnDelete();
                $table->date('invoice_date');
                $table->decimal('total', 12, 2)->default(0);
                $table->string('status', 30)->default('pending');
                $table->timestamps();

                $table->index(['status', 'invoice_date']);
            });
        }

        if (!Schema::hasTable('invoice_items')) {
            Schema::create('invoice_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_id')->constrained()->restrictOnDelete();
                $table->decimal('quantity', 12, 2)->default(1);
                $table->decimal('unit_price', 12, 2);
                $table->decimal('subtotal', 12, 2);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('payments')) {
            Schema::create('payments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('invoice_id')->nullable()->constrained()->nullOnDelete();
                $table->decimal('amount', 12, 2);
                $table->string('method')->nullable();
                $table->string('transaction_id')->nullable();
                $table->string('status', 30)->default('pending');
                $table->timestamps();

                $table->index(['status', 'created_at']);
            });
        }

        if (!Schema::hasTable('promotions')) {
            Schema::create('promotions', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->string('slug')->unique();
                $table->text('description')->nullable();
                $table->string('image')->nullable();
                $table->string('discount_label')->nullable();
                $table->string('cta_text')->nullable();
                $table->dateTime('starts_at')->nullable();
                $table->dateTime('ends_at')->nullable();
                $table->boolean('is_active')->default(true);
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['is_active', 'starts_at', 'ends_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('promotions');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('delivery_items');
        Schema::dropIfExists('deliveries');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('stocks');
        Schema::dropIfExists('product_prices');
        Schema::dropIfExists('products');
        Schema::dropIfExists('customer_addresses');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('branches');
    }
};
