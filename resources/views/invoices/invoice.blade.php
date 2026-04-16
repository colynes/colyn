<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $invoice['invoice_number'] }}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm 16mm;
        }

        body {
            font-family: DejaVu Sans, Arial, sans-serif;
            color: #2d2016;
            margin: 0;
            background: #f7f2ea;
        }

        .page {
            max-width: 210mm;
            margin: 0 auto;
            background: #fff;
            padding: 18px 22px 26px;
        }

        .header {
            display: table;
            width: 100%;
            border-bottom: 3px solid #4f3118;
            padding-bottom: 16px;
        }

        .header-left,
        .header-right {
            display: table-cell;
            vertical-align: top;
            width: 50%;
        }

        .brand-title {
            font-size: 26px;
            font-weight: 700;
            letter-spacing: 0.8px;
            color: #4f3118;
            margin: 0 0 4px;
        }

        .brand-subtitle {
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #8a6948;
            margin: 0 0 10px;
        }

        .contact-line,
        .meta-line {
            font-size: 12px;
            line-height: 1.6;
            color: #5d4631;
            margin: 0;
        }

        .invoice-title {
            font-size: 28px;
            font-weight: 700;
            color: #4f3118;
            text-align: right;
            margin: 0 0 10px;
        }

        .invoice-meta {
            text-align: right;
        }

        .section-row {
            display: table;
            width: 100%;
            margin-top: 22px;
        }

        .section {
            display: table-cell;
            vertical-align: top;
            width: 50%;
            padding-right: 18px;
        }

        .section:last-child {
            padding-right: 0;
        }

        .section-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #8a6948;
            margin-bottom: 8px;
        }

        .section-card {
            border: 1px solid #e4d6c4;
            border-radius: 10px;
            background: #fbf7f2;
            padding: 14px 16px;
            min-height: 108px;
        }

        .section-card p {
            margin: 0 0 5px;
            font-size: 12px;
            line-height: 1.6;
            color: #4e3724;
        }

        .section-card .name {
            font-size: 15px;
            font-weight: 700;
            color: #2f2115;
        }

        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-top: 24px;
        }

        table.items thead th {
            background: #4f3118;
            color: #fff;
            font-size: 12px;
            font-weight: 700;
            padding: 11px 12px;
            text-align: left;
        }

        table.items tbody td {
            border: 1px solid #eadcca;
            padding: 11px 12px;
            font-size: 12px;
            color: #3f2b1c;
        }

        table.items tbody tr:nth-child(even) td {
            background: #fbf7f2;
        }

        .summary-row {
            display: table;
            width: 100%;
            margin-top: 20px;
        }

        .notes-box,
        .summary-box {
            display: table-cell;
            vertical-align: top;
        }

        .notes-box {
            width: 58%;
            padding-right: 18px;
        }

        .summary-box {
            width: 42%;
        }

        .panel {
            border: 1px solid #e4d6c4;
            border-radius: 10px;
            background: #fbf7f2;
            padding: 14px 16px;
        }

        .panel-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #8a6948;
            margin-bottom: 10px;
        }

        .panel p {
            margin: 0 0 6px;
            font-size: 12px;
            color: #4e3724;
            line-height: 1.6;
        }

        .summary-table {
            width: 100%;
            border-collapse: collapse;
        }

        .summary-table td {
            padding: 7px 0;
            font-size: 12px;
            color: #4e3724;
        }

        .summary-table td:last-child {
            text-align: right;
            font-weight: 600;
            color: #2f2115;
        }

        .total-due {
            margin-top: 8px;
            border-top: 2px solid #d7c5ae;
            padding-top: 10px;
            display: table;
            width: 100%;
        }

        .total-due span {
            display: table-cell;
            font-size: 16px;
            font-weight: 700;
            color: #4f3118;
        }

        .total-due span:last-child {
            text-align: right;
        }

        .footer {
            margin-top: 22px;
            border-top: 2px solid #eadcca;
            padding-top: 14px;
            text-align: center;
        }

        .footer-note {
            font-size: 12px;
            color: #5d4631;
            line-height: 1.7;
            white-space: pre-line;
            margin: 0 0 10px;
        }

        .footer-contact {
            font-size: 11px;
            color: #8a6948;
            line-height: 1.7;
        }

        .status-badge {
            display: inline-block;
            margin-top: 6px;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            background: #d9f7e5;
            color: #17734f;
        }

        .status-pending { background: #fdeacc; color: #b66100; }
        .status-overdue { background: #ffe0df; color: #c53030; }
        .status-draft { background: #eceff3; color: #5f6b7a; }
        .status-sent { background: #dce9ff; color: #1d4ed8; }

        @media print {
            body {
                background: #fff;
            }
            .page {
                padding: 0;
                box-shadow: none;
            }
        }
    </style>
    @if(!empty($printMode))
        <script>
            window.onload = function () {
                window.print();
            };
        </script>
    @endif
</head>
<body>
    <div class="page">
        <div class="header">
            <div class="header-left">
                <p class="brand-title">{{ $invoice['company']['name'] }}</p>
                <p class="brand-subtitle">{{ $invoice['company']['tagline'] }}</p>
                <p class="contact-line">{{ $invoice['company']['location'] }}</p>
                <p class="contact-line">{{ $invoice['company']['contact_label'] }} {{ $invoice['company']['phone'] }}</p>
                <p class="contact-line">{{ $invoice['company']['email'] }}</p>
            </div>
            <div class="header-right invoice-meta">
                <p class="invoice-title">INVOICE</p>
                <p class="meta-line"><strong>Invoice #:</strong> {{ $invoice['invoice_number'] }}</p>
                <p class="meta-line"><strong>Date:</strong> {{ $invoice['invoice_date'] }}</p>
                @if(!empty($invoice['due_date']))
                    <p class="meta-line"><strong>Due Date:</strong> {{ $invoice['due_date'] }}</p>
                @endif
                <p class="meta-line"><strong>TIN No:</strong> {{ $invoice['tin_number'] ?: 'N/A' }}</p>
                <span class="status-badge status-{{ $invoice['status'] }}">{{ $invoice['status'] }}</span>
            </div>
        </div>

        <div class="section-row">
            <div class="section">
                <div class="section-title">Bill To</div>
                <div class="section-card">
                    <p class="name">{{ $invoice['bill_to']['name'] }}</p>
                    @if(!empty($invoice['bill_to']['contact']))
                        <p>{{ $invoice['bill_to']['contact'] }}</p>
                    @endif
                    <p>{{ $invoice['bill_to']['address'] ?: 'Address' }}</p>
                    <p>{{ $invoice['bill_to']['city'] ?: 'Dar es Salaam, TZ' }}</p>
                </div>
            </div>
            <div class="section">
                <div class="section-title">Deliver To</div>
                <div class="section-card">
                    <p class="name">{{ $invoice['deliver_to']['name'] }}</p>
                    <p>{{ $invoice['deliver_to']['address'] ?: 'Same Address' }}</p>
                </div>
            </div>
        </div>

        <table class="items">
            <thead>
                <tr>
                    <th style="width: 12%;">Item #</th>
                    <th style="width: 44%;">Description</th>
                    <th style="width: 14%;">Quantity</th>
                    <th style="width: 15%;">Unit Price</th>
                    <th style="width: 15%;">Total</th>
                </tr>
            </thead>
            <tbody>
                @foreach($invoice['items'] as $item)
                    <tr>
                        <td>{{ $item['number'] }}</td>
                        <td>{{ $item['description'] }}</td>
                        <td>{{ $item['quantity'] }}</td>
                        <td>Tzs {{ $item['unit_price'] }}</td>
                        <td>Tzs {{ $item['total_price'] }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <div class="summary-row">
            <div class="notes-box">
                <div class="panel">
                    <div class="panel-title">Payment Details</div>
                    <p><strong>Currency:</strong> {{ $invoice['company']['currency'] }}</p>
                    <p><strong>Bank Name:</strong> {{ $invoice['company']['bank_name'] }}</p>
                    <p><strong>Account Name:</strong> {{ $invoice['company']['account_name'] }}</p>
                    <p><strong>Account No:</strong> {{ $invoice['company']['account_number'] }}</p>
                </div>
            </div>
            <div class="summary-box">
                <div class="panel">
                    <table class="summary-table">
                        <tr>
                            <td>Subtotal:</td>
                            <td>Tzs {{ $invoice['subtotal'] }}</td>
                        </tr>
                        <tr>
                            <td>Tax:</td>
                            <td>Tzs {{ $invoice['tax'] }}</td>
                        </tr>
                        <tr>
                            <td>Discount:</td>
                            <td>Tzs {{ $invoice['discount'] }}</td>
                        </tr>
                    </table>
                    <div class="total-due">
                        <span>TOTAL DUE:</span>
                        <span>Tzs {{ $invoice['total'] }}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p class="footer-note">{{ $invoice['notes'] }}</p>
            <div class="footer-contact">
                {{ $invoice['company']['phone'] }} |
                {{ $invoice['company']['email'] }} |
                Instagram: {{ $invoice['company']['instagram'] }}
            </div>
        </div>
    </div>
</body>
</html>
