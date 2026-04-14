<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('subscription_requests')) {
            return;
        }

        Schema::table('subscription_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('subscription_requests', 'resubmitted_from_request_id')) {
                $table->foreignId('resubmitted_from_request_id')
                    ->nullable()
                    ->after('customer_id')
                    ->constrained('subscription_requests')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('subscription_requests', 'archived_at')) {
                $table->timestamp('archived_at')->nullable()->after('subscription_id');
                $table->index(['customer_id', 'archived_at']);
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('subscription_requests')) {
            return;
        }

        Schema::table('subscription_requests', function (Blueprint $table) {
            if (Schema::hasColumn('subscription_requests', 'resubmitted_from_request_id')) {
                $table->dropConstrainedForeignId('resubmitted_from_request_id');
            }

            if (Schema::hasColumn('subscription_requests', 'archived_at')) {
                $table->dropIndex(['customer_id', 'archived_at']);
                $table->dropColumn('archived_at');
            }
        });
    }
};
