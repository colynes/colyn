<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('invoices')) {
            Schema::table('invoices', function (Blueprint $table) {
                if (! Schema::hasColumn('invoices', 'due_date')) {
                    $table->date('due_date')->nullable()->after('invoice_date');
                }
                if (! Schema::hasColumn('invoices', 'tin_number')) {
                    $table->string('tin_number')->nullable()->after('due_date');
                }
                if (! Schema::hasColumn('invoices', 'customer_name')) {
                    $table->string('customer_name')->nullable()->after('tin_number');
                }
                if (! Schema::hasColumn('invoices', 'customer_contact')) {
                    $table->string('customer_contact')->nullable()->after('customer_name');
                }
                if (! Schema::hasColumn('invoices', 'bill_to_address')) {
                    $table->text('bill_to_address')->nullable()->after('customer_contact');
                }
                if (! Schema::hasColumn('invoices', 'deliver_to_name')) {
                    $table->string('deliver_to_name')->nullable()->after('bill_to_address');
                }
                if (! Schema::hasColumn('invoices', 'deliver_to_address')) {
                    $table->text('deliver_to_address')->nullable()->after('deliver_to_name');
                }
                if (! Schema::hasColumn('invoices', 'customer_city')) {
                    $table->string('customer_city')->nullable()->after('deliver_to_address');
                }
                if (! Schema::hasColumn('invoices', 'subtotal')) {
                    $table->decimal('subtotal', 12, 2)->default(0)->after('customer_city');
                }
                if (! Schema::hasColumn('invoices', 'tax')) {
                    $table->decimal('tax', 12, 2)->default(0)->after('subtotal');
                }
                if (! Schema::hasColumn('invoices', 'discount')) {
                    $table->decimal('discount', 12, 2)->default(0)->after('tax');
                }
                if (! Schema::hasColumn('invoices', 'currency')) {
                    $table->string('currency')->nullable()->after('total');
                }
                if (! Schema::hasColumn('invoices', 'bank_name')) {
                    $table->string('bank_name')->nullable()->after('currency');
                }
                if (! Schema::hasColumn('invoices', 'account_name')) {
                    $table->string('account_name')->nullable()->after('bank_name');
                }
                if (! Schema::hasColumn('invoices', 'account_number')) {
                    $table->string('account_number')->nullable()->after('account_name');
                }
                if (! Schema::hasColumn('invoices', 'notes')) {
                    $table->text('notes')->nullable()->after('account_number');
                }
            });
        }

        if (Schema::hasTable('invoice_items')) {
            Schema::table('invoice_items', function (Blueprint $table) {
                if (! Schema::hasColumn('invoice_items', 'description')) {
                    $table->text('description')->nullable()->after('product_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('invoice_items') && Schema::hasColumn('invoice_items', 'description')) {
            Schema::table('invoice_items', function (Blueprint $table) {
                $table->dropColumn('description');
            });
        }

        if (Schema::hasTable('invoices')) {
            $columns = [
                'due_date',
                'tin_number',
                'customer_name',
                'customer_contact',
                'bill_to_address',
                'deliver_to_name',
                'deliver_to_address',
                'customer_city',
                'subtotal',
                'tax',
                'discount',
                'currency',
                'bank_name',
                'account_name',
                'account_number',
                'notes',
            ];

            $droppable = array_values(array_filter($columns, fn ($column) => Schema::hasColumn('invoices', $column)));

            if ($droppable !== []) {
                Schema::table('invoices', function (Blueprint $table) use ($droppable) {
                    $table->dropColumn($droppable);
                });
            }
        }
    }
};
