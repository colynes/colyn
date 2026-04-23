<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('invoices') && ! Schema::hasColumn('invoices', 'subscription_id')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->foreignId('subscription_id')
                    ->nullable()
                    ->after('order_id')
                    ->constrained('subscriptions')
                    ->nullOnDelete();
            });
        }

        if (Schema::hasTable('invoice_items') && Schema::hasColumn('invoice_items', 'product_id')) {
            try {
                Schema::table('invoice_items', function (Blueprint $table) {
                    $table->dropForeign(['product_id']);
                });
            } catch (\Throwable) {
                // The constraint may already be absent in older local databases.
            }

            try {
                DB::statement('ALTER TABLE `invoice_items` MODIFY `product_id` BIGINT UNSIGNED NULL');
            } catch (\Throwable) {
                Schema::table('invoice_items', function (Blueprint $table) {
                    $table->foreignId('product_id')->nullable()->change();
                });
            }

            try {
                Schema::table('invoice_items', function (Blueprint $table) {
                    $table->foreign('product_id')
                        ->references('id')
                        ->on('products')
                        ->nullOnDelete();
                });
            } catch (\Throwable) {
                // Some drivers cannot add the foreign key after changing nullability.
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('invoices') && Schema::hasColumn('invoices', 'subscription_id')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropConstrainedForeignId('subscription_id');
            });
        }

        if (! Schema::hasTable('invoice_items') || ! Schema::hasColumn('invoice_items', 'product_id')) {
            return;
        }

        DB::table('invoice_items')->whereNull('product_id')->delete();

        try {
            Schema::table('invoice_items', function (Blueprint $table) {
                $table->dropForeign(['product_id']);
            });
        } catch (\Throwable) {
            // The constraint may already be absent in older local databases.
        }

        try {
            DB::statement('ALTER TABLE `invoice_items` MODIFY `product_id` BIGINT UNSIGNED NOT NULL');
        } catch (\Throwable) {
            Schema::table('invoice_items', function (Blueprint $table) {
                $table->foreignId('product_id')->nullable(false)->change();
            });
        }

        try {
            Schema::table('invoice_items', function (Blueprint $table) {
                $table->foreign('product_id')
                    ->references('id')
                    ->on('products')
                    ->restrictOnDelete();
            });
        } catch (\Throwable) {
            // Some drivers cannot recreate the original foreign key during rollback.
        }
    }
};
