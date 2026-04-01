<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Order;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    protected function ensureBackoffice(): void
    {
        $roleNames = collect(auth()->user()?->getRoleNames() ?? [])
            ->map(fn ($role) => strtolower((string) $role));

        abort_if($roleNames->contains('customer'), 403);
    }

    public function show(Invoice $invoice)
    {
        $this->ensureBackoffice();

        return Inertia::render('InvoiceShow', [
            'invoice' => $this->previewPayload($this->hydrateInvoice($invoice)),
        ]);
    }

    public function html(Invoice $invoice, Request $request)
    {
        $this->ensureBackoffice();

        return response()->view('invoices.invoice', [
            'invoice' => $this->templatePayload($this->hydrateInvoice($invoice)),
            'printMode' => $request->boolean('print'),
        ]);
    }

    public function print(Invoice $invoice)
    {
        $this->ensureBackoffice();

        return response()->view('invoices.invoice', [
            'invoice' => $this->templatePayload($this->hydrateInvoice($invoice)),
            'printMode' => true,
        ]);
    }

    public function download(Invoice $invoice)
    {
        $this->ensureBackoffice();

        $invoice = $this->hydrateInvoice($invoice);
        $payload = $this->templatePayload($invoice);
        $pdf = Pdf::loadView('invoices.invoice', [
            'invoice' => $payload,
            'printMode' => false,
        ])->setPaper('a4');

        Storage::disk('public')->put(
            'invoices/' . $invoice->invoice_number . '.pdf',
            $pdf->output()
        );

        return $pdf->download($invoice->invoice_number . '.pdf');
    }

    public function showForOrder(Order $order)
    {
        $this->ensureBackoffice();

        $invoice = $this->ensureInvoiceForOrder($order);

        return redirect()->route('invoices.show', $invoice);
    }

    public function downloadForOrder(Order $order)
    {
        $this->ensureBackoffice();

        $invoice = $this->ensureInvoiceForOrder($order);

        return $this->download($invoice);
    }

    public function printForOrder(Order $order)
    {
        $this->ensureBackoffice();

        $invoice = $this->ensureInvoiceForOrder($order);

        return $this->print($invoice);
    }

    protected function ensureInvoiceForOrder(Order $order): Invoice
    {
        $invoice = $order->invoices()->latest('id')->first();

        if ($invoice) {
            return $invoice;
        }

        $order->loadMissing(['customer', 'items.product']);

        $invoice = $order->invoices()->create([
            'invoice_number' => $this->generateInvoiceNumber(),
            'invoice_date' => optional($order->created_at)->toDateString() ?? now()->toDateString(),
            'due_date' => optional($order->created_at)?->copy()->addDays(7)->toDateString() ?? now()->addDays(7)->toDateString(),
            'customer_name' => $order->customer?->full_name ?? 'Customer Name',
            'customer_contact' => $order->delivery_phone ?: $order->customer?->phone,
            'bill_to_address' => $order->customer?->address ?: $order->delivery_address ?: 'Address',
            'deliver_to_name' => $order->customer?->full_name ?? 'Customer Name',
            'deliver_to_address' => $order->delivery_address ?: trim(collect([
                $order->delivery_area,
                $order->delivery_region,
                $order->delivery_landmark,
            ])->filter()->implode(', ')) ?: ($order->customer?->address ?: 'Same Address'),
            'customer_city' => $order->delivery_region ?: 'Dar es Salaam, Tanzania',
            'subtotal' => $order->subtotal ?? $order->total,
            'tax' => $order->tax ?? 0,
            'discount' => 0,
            'total' => $order->total,
            'currency' => 'Tanzanian Shillings',
            'bank_name' => 'CRDB Bank Tanzania',
            'account_name' => 'AMANI BREW - Premium Butchery',
            'account_number' => '0651234567890',
            'status' => $order->is_paid ? 'paid' : 'pending',
            'notes' => $order->notes ?: "Thank you for your business! All products are prepared fresh with the highest quality standards.\n- Asili na Urithi -",
        ]);

        foreach ($order->items as $index => $item) {
            $invoice->items()->create([
                'product_id' => $item->product_id,
                'description' => $item->displayName() ?: ('Item ' . ($index + 1)),
                'quantity' => $item->quantity,
                'unit_price' => $item->price,
                'subtotal' => $item->subtotal,
            ]);
        }

        return $invoice->fresh();
    }

    protected function hydrateInvoice(Invoice $invoice): Invoice
    {
        return $invoice->loadMissing(['items.product', 'payments', 'order.customer']);
    }

    protected function previewPayload(Invoice $invoice): array
    {
        return [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'status' => strtolower((string) $invoice->status),
            'customer_name' => $invoice->customer_name ?: $invoice->order?->customer?->full_name,
            'invoice_date' => optional($invoice->invoice_date)->format('d/m/Y'),
            'due_date' => optional($invoice->due_date)->format('Y-m-d'),
            'total' => (float) $invoice->total,
            'preview_url' => route('invoices.html', $invoice),
            'download_url' => route('invoices.download', $invoice),
            'print_url' => route('invoices.print', $invoice),
        ];
    }

    protected function templatePayload(Invoice $invoice): array
    {
        return [
            'company' => [
                'name' => 'AMANI BREW',
                'tagline' => 'Premium Butchery',
                'contact_label' => 'Contact:',
                'phone' => '+255 712 345 678',
                'email' => 'info@amanibrew.com',
                'instagram' => '@amanibrew',
                'location' => 'Dar es Salaam, Tanzania',
                'bank_name' => $invoice->bank_name ?: 'CRDB Bank Tanzania',
                'account_name' => $invoice->account_name ?: 'AMANI BREW - Premium Butchery',
                'account_number' => $invoice->account_number ?: '0651234567890',
                'currency' => $invoice->currency ?: 'Tanzanian Shillings',
            ],
            'invoice_number' => $invoice->invoice_number,
            'invoice_date' => optional($invoice->invoice_date)->format('d/m/Y'),
            'due_date' => optional($invoice->due_date)->format('d/m/Y'),
            'tin_number' => $invoice->tin_number,
            'bill_to' => [
                'name' => $invoice->customer_name ?: $invoice->order?->customer?->full_name ?: 'Customer Name',
                'contact' => $invoice->customer_contact,
                'address' => $invoice->bill_to_address,
                'city' => $invoice->customer_city ?: 'Dar es Salaam, TZ',
            ],
            'deliver_to' => [
                'name' => $invoice->deliver_to_name ?: $invoice->customer_name ?: 'Customer Name',
                'address' => $invoice->deliver_to_address ?: 'Same Address',
            ],
            'items' => $invoice->items->values()->map(fn ($item, $index) => [
                'number' => $index + 1,
                'description' => $item->description ?: $item->product?->name ?: 'Invoice Item',
                'quantity' => number_format((float) $item->quantity, 2),
                'unit_price' => number_format((float) $item->unit_price, 2),
                'total_price' => number_format((float) $item->subtotal, 2),
            ])->all(),
            'subtotal' => number_format((float) $invoice->subtotal, 2),
            'tax' => number_format((float) $invoice->tax, 2),
            'discount' => number_format((float) $invoice->discount, 2),
            'total' => number_format((float) $invoice->total, 2),
            'status' => strtolower((string) $invoice->status),
            'notes' => $invoice->notes ?: "Thank you for your business! All products are prepared fresh with the highest quality standards.\n- Asili na Urithi -",
        ];
    }

    protected function generateInvoiceNumber(): string
    {
        $prefix = 'INV-' . now()->format('Y') . '-';
        $latest = Invoice::query()
            ->where('invoice_number', 'like', $prefix . '%')
            ->orderByDesc('invoice_number')
            ->value('invoice_number');

        $lastSequence = $latest ? (int) substr((string) $latest, -3) : 0;

        return $prefix . str_pad((string) ($lastSequence + 1), 3, '0', STR_PAD_LEFT);
    }
}
