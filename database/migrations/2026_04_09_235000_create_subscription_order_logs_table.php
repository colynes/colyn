<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('subscription_order_logs')) {
            return;
        }

        Schema::create('subscription_order_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->date('delivery_date');
            $table->timestamps();

            $table->unique(['subscription_id', 'delivery_date'], 'subscription_delivery_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_order_logs');
    }
};
