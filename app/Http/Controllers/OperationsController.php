<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Order;
use App\Models\Pack;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\SalesTarget;
use App\Models\Stock;
use App\Models\Subscription;
use App\Models\SubscriptionRequest;
use App\Models\SubscriptionRequestItem;
use App\Models\User;
use App\Notifications\NewOrderPlacedNotification;
use App\Notifications\OrderStatusUpdatedNotification;
use App\Notifications\SystemAlertNotification;
use App\Services\SalesTargetService;
use App\Services\SubscriptionWorkflowService;
use App\Support\BackofficeAccess;
use App\Support\SubscriptionScheduler;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class OperationsController extends Controller
{
    protected array $allowedPerPageOptions = [50, 100, 250, 500];

    protected function ensureBackoffice(): void
    {
        abort_if(auth()->user()?->hasRole('Customer'), 403);
    }

    protected function resolvePerPage(Request $request, int $default = 50): int
    {
        $perPage = (int) $request->integer('per_page', $default);

        return in_array($perPage, $this->allowedPerPageOptions, true) ? $perPage : $default;
    }

    protected function paginateCollection($items, int $perPage, Request $request): LengthAwarePaginator
    {
        $page = max(1, (int) $request->integer('page', 1));
        $collection = collect($items)->values();

        return new LengthAwarePaginator(
            $collection->forPage($page, $perPage)->values(),
            $collection->count(),
            $perPage,
            $page,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ],
        );
    }

    protected function ensurePackManagers(): void
    {
        $this->ensureBackoffice();
    }

    public function orders(Request $request)
    {
        $this->ensureBackoffice();
        $perPage = $this->resolvePerPage($request);

        $orders = Order::query()
            ->with(['customer', 'items.product', 'payments', 'deliveries'])
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search');
                $query->where(function ($builder) use ($search) {
                    $builder
                        ->where('order_number', 'like', "%{$search}%")
                        ->orWhereHas('customer', fn ($customerQuery) => $customerQuery->where('full_name', 'like', "%{$search}%"));
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (Order $order) {
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'customer' => $order->customer?->full_name ?? 'Walk-in customer',
                    'date' => optional($order->created_at)->toDateString(),
                    'items' => $order->items->count(),
                    'total' => (float) $order->total,
                    'payment' => $order->payments->sortByDesc('created_at')->first()?->method ?? $order->payment_method,
                    'status' => $this->normalizeOrderStatus($order->status),
                    'fulfillment_method' => $order->fulfillment_method,
                    'tracking_number' => $order->deliveries->sortByDesc('created_at')->first()?->tracking_number,
                    'location' => collect([$order->delivery_region, $order->delivery_area])->filter()->implode(', '),
                    'delivery_region' => $order->delivery_region,
                    'delivery_area' => $order->delivery_area,
                    'scheduled_delivery_date' => optional($order->scheduled_delivery_date)->toDateString(),
                    'scheduled_pickup_date' => optional($order->scheduled_pickup_date)->toDateString(),
                    'notes' => $order->notes,
                    'line_items' => $order->items->map(fn ($item) => [
                        'id' => $item->id,
                        'name' => $item->displayName(),
                        'quantity' => (float) $item->quantity,
                        'subtotal' => (float) $item->subtotal,
                        'unit' => $item->product?->unit,
                        'description' => $item->displayDescription(),
                        'type' => $item->displayType(),
                    ])->values(),
                ];
            });

        return Inertia::render('Orders', [
            'orders' => $orders,
            'filters' => $request->only(['search', 'status', 'per_page']),
            'summary' => [
                'total_orders' => Order::count(),
                'pending_orders' => Order::whereIn('status', ['pending', 'confirmed', 'processing', 'preparing'])->count(),
                'completed_orders' => Order::where('status', 'delivered')->count(),
                'todays_revenue' => (float) Order::whereDate('created_at', today())->sum('total'),
            ],
            'perPageOptions' => $this->allowedPerPageOptions,
        ]);
    }

    public function sales(Request $request)
    {
        $this->ensureBackoffice();

        ['period' => $period, 'start' => $startDate, 'end' => $endDate, 'filters' => $periodFilters] = $this->resolveAnalyticsRange($request, 'weekly');
        $targetService = app(SalesTargetService::class);

        $analytics = $targetService->buildPerformance($startDate, $endDate);
        $summary = collect($analytics['daily_summary']);

        $comparisonDays = max($startDate->copy()->startOfDay()->diffInDays($endDate->copy()->startOfDay()) + 1, 1);
        $comparisonEnd = $startDate->copy()->subDay()->endOfDay();
        $comparisonStart = $comparisonEnd->copy()->subDays($comparisonDays - 1)->startOfDay();
        $comparisonSummary = collect($targetService->buildPerformance($comparisonStart, $comparisonEnd)['daily_summary']);

        $periodRevenue = (float) $summary->get('total_actual', 0);
        $comparisonRevenue = (float) $comparisonSummary->get('total_actual', 0);
        $periodOrders = (int) $summary->get('total_orders', 0);
        $comparisonOrders = (int) $comparisonSummary->get('total_orders', 0);
        $averageOrder = $periodOrders > 0 ? round($periodRevenue / $periodOrders, 2) : 0.0;
        $comparisonAverageOrder = $comparisonOrders > 0 ? round($comparisonRevenue / $comparisonOrders, 2) : 0.0;

        $statusPlaceholders = implode(',', array_fill(0, count(SalesTargetService::REPORTABLE_ORDER_STATUSES), '?'));

        $categorySales = collect(DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->whereBetween('orders.created_at', [$startDate, $endDate])
            ->whereRaw("LOWER(COALESCE(orders.status, '')) IN ({$statusPlaceholders})", SalesTargetService::REPORTABLE_ORDER_STATUSES)
            ->groupBy('categories.id', 'categories.name')
            ->selectRaw('categories.name as name, COUNT(DISTINCT products.id) as products_count, SUM(order_items.subtotal) as revenue')
            ->orderByDesc('revenue')
            ->get())
            ->map(fn ($row) => [
                'name' => $row->name,
                'products_count' => (int) $row->products_count,
                'revenue' => round((float) $row->revenue, 2),
            ])
            ->values();

        $topProducts = collect(DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->whereBetween('orders.created_at', [$startDate, $endDate])
            ->whereRaw("LOWER(COALESCE(orders.status, '')) IN ({$statusPlaceholders})", SalesTargetService::REPORTABLE_ORDER_STATUSES)
            ->groupBy('products.id', 'products.name')
            ->selectRaw('products.id as id, products.name as name, SUM(order_items.quantity) as units_sold, SUM(order_items.subtotal) as revenue')
            ->orderByDesc('revenue')
            ->limit(8)
            ->get())
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'name' => $row->name,
                'units_sold' => (float) $row->units_sold,
                'revenue' => round((float) $row->revenue, 2),
            ])
            ->values();

        $totalTopProductRevenue = max((float) $topProducts->sum('revenue'), 0.0);
        $totalTargetForPeriod = (float) $summary->get('total_target', 0);

        $topProducts = $topProducts->map(function (array $product) use ($totalTargetForPeriod, $totalTopProductRevenue) {
            $targetShare = $totalTopProductRevenue > 0
                ? round(($product['revenue'] / $totalTopProductRevenue) * $totalTargetForPeriod, 2)
                : 0.0;

            $performance = $targetShare > 0 ? round(($product['revenue'] / $targetShare) * 100, 1) : 0.0;

            return [
                ...$product,
                'target' => $targetShare,
                'performance' => $performance,
            ];
        })->values();

        $productPerformance = $topProducts
            ->take(5)
            ->map(fn ($product) => [
                'name' => $product['name'],
                'target' => $product['target'],
                'actual' => $product['revenue'],
            ])
            ->values();

        $targetActualTrend = collect($analytics['daily_trend'])
            ->map(fn ($row) => [
                'date' => $row['date'],
                'day' => $row['label'],
                'target' => (float) $row['target'],
                'actual' => (float) $row['actual'],
                'variance' => (float) $row['variance'],
                'achievement_percentage' => (float) $row['achievement_percentage'],
                'source_type' => $row['source_type'],
                'orders_count' => (int) $row['orders_count'],
            ])
            ->values();

        return Inertia::render('Sales', [
            'targetActualTrend' => $targetActualTrend,
            'categorySales' => $categorySales,
            'metrics' => [
                'gross_revenue' => $periodRevenue,
                'total_orders' => $periodOrders,
                'average_order' => $averageOrder,
                'period_revenue' => $periodRevenue,
                'sales_growth' => $comparisonRevenue > 0 ? round((($periodRevenue - $comparisonRevenue) / $comparisonRevenue) * 100, 1) : 0,
                'gross_revenue_change' => $comparisonRevenue > 0 ? round((($periodRevenue - $comparisonRevenue) / $comparisonRevenue) * 100, 1) : 0,
                'orders_change' => $comparisonOrders > 0 ? round((($periodOrders - $comparisonOrders) / $comparisonOrders) * 100, 1) : 0,
                'average_order_change' => $comparisonAverageOrder > 0 ? round((($averageOrder - $comparisonAverageOrder) / $comparisonAverageOrder) * 100, 1) : 0,
                'sales_growth_change' => $comparisonRevenue > 0 ? round((($periodRevenue - $comparisonRevenue) / $comparisonRevenue) * 100, 1) : 0,
                'total_target' => (float) $summary->get('total_target', 0),
                'variance' => (float) $summary->get('variance', 0),
                'achievement_percentage' => (float) $summary->get('achievement_percentage', 0),
            ],
            'filters' => $periodFilters + [
                'period' => $period,
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
            ],
            'productPerformance' => $productPerformance,
            'topProducts' => $topProducts,
            'targets' => collect($analytics['targets_in_range'])->map(fn (SalesTarget $target) => $this->formatSalesTargetForResponse($target))->values(),
            'weeklySummary' => collect($analytics['weekly_summary'])->values(),
            'monthlySummary' => collect($analytics['monthly_summary'])->values(),
            'performanceSummary' => $summary->all(),
        ]);
    }

    public function storeSalesTargets(Request $request)
    {
        $this->ensureBackoffice();

        $targetPayload = $request->input('target');

        if (!$targetPayload && is_array($request->input('targets'))) {
            $targetPayload = collect($request->input('targets'))->first();
        }

        $request->merge(['target' => $targetPayload]);

        $validated = $request->validate([
            'target' => ['required', 'array'],
            'target.id' => ['nullable', 'integer', 'exists:sales_targets,id'],
            'target.target_type' => ['required', 'in:daily,weekly,monthly'],
            'target.target_amount' => ['required', 'numeric', 'min:0.01'],
            'target.target_date' => ['nullable', 'date'],
            'target.week_start' => ['nullable', 'date'],
            'target.week_end' => ['nullable', 'date'],
            'target.month_key' => ['nullable', 'regex:/^\d{4}-\d{2}$/'],
            'target.notes' => ['nullable', 'string', 'max:500'],
            'overwrite' => ['nullable', 'boolean'],
        ]);

        $result = app(SalesTargetService::class)->saveTarget(
            $validated['target'],
            $request->user()?->id,
            (bool) ($validated['overwrite'] ?? false)
        );

        if (($result['status'] ?? null) === 'conflict') {
            $message = 'A target already exists for this date or period. Creating this target will overwrite the existing one.';

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => $message,
                    'conflict' => $this->formatSalesTargetForResponse($result['target']),
                ], 409);
            }

            return back()->with('error', $message);
        }

        $savedTarget = $result['target'];
        $isEditing = !empty($validated['target']['id']);
        $wasOverwritten = (bool) ($result['overwritten'] ?? false);

        $message = $wasOverwritten
            ? 'Sales target overwritten successfully.'
            : ($isEditing ? 'Sales target updated successfully.' : 'Sales target saved successfully.');

        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message,
                'target' => $this->formatSalesTargetForResponse($savedTarget),
                'overwritten' => $wasOverwritten,
            ]);
        }

        return back()->with('success', $message);
    }

    public function reports(Request $request)
    {
        $this->ensureBackoffice();

        $report = $this->buildReportPayload($request);

        return Inertia::render('Reports', $report);
    }

    public function exportReportsCsv(Request $request)
    {
        $this->ensureBackoffice();

        $report = $this->buildReportPayload($request);
        $results = collect($report['results'] ?? []);

        $filename = 'report-' . now()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () use ($results) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['Order ID', 'Date', 'Customer', 'Type', 'Order Type', 'Items', 'Amount', 'Status', 'Payment']);

            foreach ($results as $row) {
                fputcsv($handle, [
                    $row['order_number'],
                    $row['date'],
                    $row['customer'],
                    $row['type'],
                    $row['order_type'],
                    $row['items'],
                    $row['amount'],
                    $row['status'],
                    str_replace('_', ' ', (string) $row['payment']),
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function exportReportsPdf(Request $request)
    {
        $this->ensureBackoffice();

        $report = $this->buildReportPayload($request);
        $filters = $report['filters'];
        $results = collect($report['results'] ?? []);

        $lines = [
            'Amani Brew Reports & Analytics',
            'Date From: ' . ($filters['date_from'] ?? 'N/A'),
            'Date To: ' . ($filters['date_to'] ?? 'N/A'),
            'Customer Type: ' . ($filters['customer_type'] ?: 'All Types'),
            'Payment Status: ' . ($filters['payment_status'] ?: 'All Status'),
            'Report Type: ' . ($filters['report_type'] ?: 'All Transactions'),
            'Total Revenue: Tzs ' . number_format((float) ($report['overview']['total_revenue'] ?? 0), 2),
            'Total Orders: ' . number_format((int) ($report['overview']['total_orders'] ?? 0)),
            'Unique Customers: ' . number_format((int) ($report['overview']['unique_customers'] ?? 0)),
            'Average Order Value: Tzs ' . number_format((float) ($report['overview']['average_order_value'] ?? 0), 2),
            '',
            'Report Results',
        ];

        foreach ($results as $row) {
            $lines[] = sprintf(
                '%s | %s | %s | %s | %s | %s items | Tzs %s | %s | %s',
                $row['order_number'],
                $row['date'],
                $row['customer'],
                $row['type'],
                $row['order_type'],
                $row['items'],
                number_format((float) $row['amount'], 2),
                $row['status'],
                str_replace('_', ' ', (string) $row['payment']),
            );
        }

        if ($results->isEmpty()) {
            $lines[] = 'No report results found for the selected filters.';
        }

        $pdf = $this->buildSimplePdf($lines);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="report-' . now()->format('Ymd-His') . '.pdf"',
        ]);
    }

    protected function buildReportPayload(Request $request): array
    {
        ['period' => $period, 'start' => $startDate, 'end' => $endDate, 'filters' => $periodFilters] = $this->resolveAnalyticsRange($request, 'monthly');
        $targetService = app(SalesTargetService::class);
        $analytics = $targetService->buildPerformance($startDate, $endDate);
        $analyticsSummary = collect($analytics['daily_summary']);

        $customerType = $request->string('customer_type')->toString();
        $paymentStatus = $request->string('payment_status')->toString();
        $reportType = $request->string('report_type')->toString();

        $statusPlaceholders = implode(',', array_fill(0, count(SalesTargetService::REPORTABLE_ORDER_STATUSES), '?'));

        $ordersQuery = Order::query()
            ->with(['customer', 'items', 'payments'])
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereRaw("LOWER(COALESCE(status, '')) IN ({$statusPlaceholders})", SalesTargetService::REPORTABLE_ORDER_STATUSES)
            ->when($paymentStatus === 'paid', fn ($query) => $query->where('is_paid', true))
            ->when($paymentStatus === 'pending', fn ($query) => $query->where('is_paid', false))
            ->when($reportType === 'deliveries', fn ($query) => $query->where('fulfillment_method', 'delivery'))
            ->when($reportType === 'pickups', fn ($query) => $query->where('fulfillment_method', 'pickup'));

        $orders = $ordersQuery->get();

        $paidOrders = $orders->filter(fn (Order $order) => (bool) $order->is_paid);
        $pendingOrders = $orders->reject(fn (Order $order) => (bool) $order->is_paid);
        $totalRevenue = (float) $analyticsSummary->get('total_actual', 0);
        $averageOrderValue = (float) ($analyticsSummary->get('total_orders', 0) > 0
            ? round($totalRevenue / $analyticsSummary->get('total_orders', 0), 2)
            : 0.0);
        $uniqueCustomers = $orders->pluck('customer_id')->filter()->unique()->count();

        $topProducts = collect(DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->whereBetween('orders.created_at', [$startDate, $endDate])
            ->whereRaw("LOWER(COALESCE(orders.status, '')) IN ({$statusPlaceholders})", SalesTargetService::REPORTABLE_ORDER_STATUSES)
            ->groupBy('products.id', 'products.name', 'products.sku')
            ->selectRaw('products.name as name, products.sku as sku, SUM(order_items.quantity) as units, SUM(order_items.subtotal) as revenue')
            ->orderByDesc('revenue')
            ->limit(8)
            ->get())
            ->map(fn ($row) => [
                'name' => $row->name,
                'sku' => $row->sku,
                'units' => (float) $row->units,
                'revenue' => round((float) $row->revenue, 2),
            ])
            ->values();

        $targetActualTrend = collect($analytics['daily_trend'])
            ->map(fn ($row) => [
                'date' => $row['date'],
                'label' => $row['label'],
                'target' => (float) $row['target'],
                'actual' => (float) $row['actual'],
                'variance' => (float) $row['variance'],
                'achievement_percentage' => (float) $row['achievement_percentage'],
                'orders_count' => (int) $row['orders_count'],
                'source_type' => $row['source_type'],
            ])
            ->values();

        return [
            'overview' => [
                'total_revenue' => $totalRevenue,
                'paid_revenue' => (float) $paidOrders->sum('total'),
                'pending_revenue' => (float) $pendingOrders->sum('total'),
                'total_orders' => (int) $analyticsSummary->get('total_orders', 0),
                'paid_orders' => $paidOrders->count(),
                'pending_orders' => $pendingOrders->count(),
                'unique_customers' => $uniqueCustomers,
                'average_order_value' => $averageOrderValue,
                'total_target' => (float) $analyticsSummary->get('total_target', 0),
                'variance' => (float) $analyticsSummary->get('variance', 0),
                'achievement_percentage' => (float) $analyticsSummary->get('achievement_percentage', 0),
            ],
            'topProducts' => $topProducts,
            'filters' => [
                'date_from' => $startDate->toDateString(),
                'date_to' => $endDate->toDateString(),
                'period' => $period,
                ...$periodFilters,
                'customer_type' => $customerType,
                'payment_status' => $paymentStatus,
                'report_type' => $reportType,
            ],
            'targetActualTrend' => $targetActualTrend,
            'weeklyPerformance' => collect($analytics['weekly_summary'])->values(),
            'monthlyPerformance' => collect($analytics['monthly_summary'])->values(),
            'performanceSummary' => $analyticsSummary->all(),
            'targets' => collect($analytics['targets_in_range'])->map(fn (SalesTarget $target) => $this->formatSalesTargetForResponse($target))->values(),
            'results' => $orders->sortByDesc('created_at')->values()->map(function (Order $order) {
                $isSubscriptionOrder = str_contains(
                    strtolower((string) $order->notes),
                    'auto-generated from subscription'
                ) || $order->items->contains(function ($item) {
                    $metadata = method_exists($item, 'metadata') ? $item->metadata() : [];

                    return ($metadata['type'] ?? null) === 'subscription'
                        || !empty($metadata['subscription_id']);
                });

                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'date' => optional($order->created_at)->toDateString(),
                    'customer' => $order->customer?->full_name ?? 'Walk-in customer',
                    'type' => $isSubscriptionOrder ? 'Subscription' : 'Walk-in',
                    'order_type' => $order->fulfillment_method ? ucfirst((string) $order->fulfillment_method) : 'Standard Order',
                    'items' => $order->items->count(),
                    'amount' => (float) $order->total,
                    'status' => $order->is_paid ? 'Paid' : 'Pending',
                    'payment' => $order->payments->sortByDesc('created_at')->first()?->method ?? $order->payment_method ?? 'N/A',
                ];
            }),
        ];
    }

    protected function resolveAnalyticsRange(Request $request, string $defaultPeriod = 'weekly'): array
    {
        $allowedPeriods = ['daily', 'weekly', 'monthly', 'custom'];
        $period = strtolower($request->string('period')->toString() ?: $defaultPeriod);

        if (!in_array($period, $allowedPeriods, true)) {
            $period = $defaultPeriod;
        }

        $focusDate = $request->date('focus_date')?->startOfDay() ?? now()->startOfDay();
        $monthInput = trim($request->string('month')->toString());
        $monthAnchor = preg_match('/^\d{4}-\d{2}$/', $monthInput) === 1
            ? Carbon::createFromFormat('Y-m', $monthInput)->startOfMonth()
            : $focusDate->copy()->startOfMonth();

        if ($period === 'daily') {
            $start = $focusDate->copy()->startOfDay();
            $end = $focusDate->copy()->endOfDay();
        } elseif ($period === 'weekly') {
            $start = $focusDate->copy()->startOfWeek()->startOfDay();
            $end = $focusDate->copy()->endOfWeek()->endOfDay();
        } elseif ($period === 'monthly') {
            $start = $monthAnchor->copy()->startOfMonth()->startOfDay();
            $end = $monthAnchor->copy()->endOfMonth()->endOfDay();
        } else {
            $customStart = $request->date('start_date')?->startOfDay()
                ?? $request->date('date_from')?->startOfDay()
                ?? now()->startOfMonth()->startOfDay();
            $customEnd = $request->date('end_date')?->endOfDay()
                ?? $request->date('date_to')?->endOfDay()
                ?? now()->endOfDay();

            $start = $customStart;
            $end = $customEnd;
        }

        if ($start->gt($end)) {
            [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
        }

        return [
            'period' => $period,
            'start' => $start,
            'end' => $end,
            'filters' => [
                'focus_date' => $focusDate->toDateString(),
                'month' => $monthAnchor->format('Y-m'),
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
                'date_from' => $start->toDateString(),
                'date_to' => $end->toDateString(),
            ],
        ];
    }

    protected function formatSalesTargetForResponse(SalesTarget $target): array
    {
        return app(SalesTargetService::class)->describeTarget($target);
    }

    protected function buildSimplePdf(array $lines): string
    {
        $linesPerPage = 38;
        $pages = array_chunk($lines, $linesPerPage);
        $objects = [];

        $objects[] = '<< /Type /Catalog /Pages 2 0 R >>';
        $objects[] = null;
        $objects[] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

        $pageObjectNumbers = [];
        $nextObjectNumber = 4;

        foreach ($pages as $pageLines) {
            $content = "BT\n/F1 11 Tf\n50 790 Td\n14 TL\n";

            foreach ($pageLines as $lineIndex => $line) {
                $safeLine = str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line);
                $content .= sprintf("(%s) Tj\n", $safeLine);

                if ($lineIndex !== count($pageLines) - 1) {
                    $content .= "T*\n";
                }
            }

            $content .= "\nET";

            $contentObjectNumber = $nextObjectNumber++;
            $pageObjectNumber = $nextObjectNumber++;

            $pageObjectNumbers[] = $pageObjectNumber;

            $objects[] = null;
            $objects[] = null;

            $objects[$contentObjectNumber - 1] = sprintf("<< /Length %d >>\nstream\n%s\nendstream", strlen($content), $content);
            $objects[$pageObjectNumber - 1] = sprintf(
                '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents %d 0 R >>',
                $contentObjectNumber
            );
        }

        $kids = implode(' ', array_map(fn ($number) => $number . ' 0 R', $pageObjectNumbers));
        $objects[1] = sprintf('<< /Type /Pages /Kids [ %s ] /Count %d >>', $kids, count($pageObjectNumbers));

        $pdf = "%PDF-1.4\n";
        $offsets = [0];

        foreach ($objects as $index => $object) {
            $offsets[$index + 1] = strlen($pdf);
            $pdf .= ($index + 1) . " 0 obj\n" . $object . "\nendobj\n";
        }

        $xrefPosition = strlen($pdf);
        $pdf .= "xref\n0 " . (count($objects) + 1) . "\n";
        $pdf .= "0000000000 65535 f \n";

        for ($i = 1; $i <= count($objects); $i++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
        }

        $pdf .= "trailer\n<< /Size " . (count($objects) + 1) . " /Root 1 0 R >>\n";
        $pdf .= "startxref\n{$xrefPosition}\n%%EOF";

        return $pdf;
    }

    public function subscriptions()
    {
        $this->ensureBackoffice();

        app(SubscriptionWorkflowService::class)->expireStaleQuotes();

        $customers = Customer::query()
            ->withCount('orders')
            ->orderByDesc('orders_count')
            ->take(20)
            ->get()
            ->map(fn (Customer $customer) => [
                'id' => $customer->id,
                'full_name' => $customer->full_name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'status' => $customer->status,
                'orders_count' => $customer->orders_count,
            ]);

        $products = Product::query()
            ->active()
            ->with('currentPrice')
            ->orderBy('name')
            ->get(['id', 'name', 'unit'])
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'unit' => $product->unit,
                'price' => (float) ($product->currentPrice?->promo_price ?? $product->currentPrice?->price ?? 0),
            ]);

        $subscriptions = Subscription::query()
            ->latest()
            ->get()
            ->map(function (Subscription $subscription) {
                $storedProducts = collect($subscription->products ?? [])
                    ->map(function ($item, int $index) {
                        $quantity = (float) ($item['quantity'] ?? 1);
                        $unit = (string) ($item['unit'] ?? 'pcs');
                        $name = (string) ($item['name'] ?? 'Product');

                        return [
                            'id' => $item['id'] ?? ('line-' . $index),
                            'product_id' => $item['product_id'] ?? null,
                            'name' => $name,
                            'quantity' => $quantity,
                            'unit' => $unit,
                            'label' => $item['label'] ?? ($name . ' - ' . rtrim(rtrim(number_format($quantity, 2, '.', ''), '0'), '.') . ' ' . $unit),
                        ];
                    })
                    ->values()
                    ->all();

                $normalizedDeliveryDays = $this->abbreviateDeliveryDays($subscription->delivery_days ?? []);
                $nextBaseDate = optional($subscription->next_delivery)?->copy()?->startOfDay() ?? now()->startOfDay();

                if ($nextBaseDate->lt(now()->startOfDay())) {
                    $nextBaseDate = now()->startOfDay();
                }

                $nextDeliveryDate = SubscriptionScheduler::nextDeliveryDate(
                    (string) $subscription->frequency,
                    $normalizedDeliveryDays,
                    $nextBaseDate
                );

                return [
                    'id' => $subscription->id,
                    'customer_id' => $subscription->customer_id,
                    'customer_name' => $subscription->customer_name,
                    'phone' => $subscription->phone,
                    'email' => $subscription->email,
                    'frequency' => $subscription->frequency,
                    'delivery_days' => $normalizedDeliveryDays,
                    'products' => $storedProducts,
                    'value' => (float) $subscription->value,
                    'next_delivery' => $nextDeliveryDate->toDateString(),
                    'status' => $subscription->status,
                ];
            });

        $subscriptionRequests = SubscriptionRequest::query()
            ->with(['customer', 'user', 'items.product', 'items.pack'])
            ->whereIn('status', [
                SubscriptionRequest::STATUS_PENDING_REVIEW,
                SubscriptionRequest::STATUS_QUOTED,
                SubscriptionRequest::STATUS_REJECTED,
            ])
            ->latest()
            ->get()
            ->map(fn (SubscriptionRequest $subscriptionRequest) => $this->mapSubscriptionRequestForBackoffice($subscriptionRequest))
            ->values();

        return Inertia::render('Subscriptions', [
            'customers' => $customers,
            'products' => $products,
            'subscriptions' => $subscriptions,
            'subscriptionRequests' => $subscriptionRequests,
            'perPageOptions' => $this->allowedPerPageOptions,
        ]);
    }

    public function storeSubscription(Request $request)
    {
        $this->ensureBackoffice();

        $validated = $this->validateSubscriptionPayload($request);

        $subscription = Subscription::create($validated);
        $subscription->loadMissing('customer.user');

        $this->notifyBackofficeAudience([
            'title' => 'New subscription created',
            'message' => "{$subscription->customer_name} now has a new active subscription.",
            'kind' => 'subscription_created',
            'status' => strtolower((string) $subscription->status),
            'action_url' => route('fat-clients.subscriptions'),
            'amount' => (float) ($subscription->agreed_price ?: $subscription->value ?: 0),
        ]);

        $customerUser = $subscription->customer?->user;

        if ($customerUser) {
            $customerUser->notify(new SystemAlertNotification([
                'title' => 'Subscription created',
                'message' => 'A new subscription has been created for your account.',
                'kind' => 'subscription_created',
                'status' => strtolower((string) $subscription->status),
                'action_url' => route('customer.subscriptions.index', ['tab' => 'active']),
                'amount' => (float) ($subscription->agreed_price ?: $subscription->value ?: 0),
            ]));
        }

        return redirect()->route('fat-clients.subscriptions')->with('success', 'Subscription created successfully.');
    }

    public function updateSubscription(Request $request, Subscription $subscription)
    {
        $this->ensureBackoffice();

        $validated = $this->validateSubscriptionPayload($request);

        $subscription->update($validated);

        return redirect()->route('fat-clients.subscriptions')->with('success', 'Subscription updated successfully.');
    }

    public function destroySubscription(Subscription $subscription)
    {
        $this->ensureBackoffice();

        $subscription->delete();

        return redirect()->route('fat-clients.subscriptions')->with('success', 'Subscription deleted successfully.');
    }

    protected function validateSubscriptionPayload(Request $request): array
    {
        $validated = $request->validate([
            'customer_id' => ['nullable', 'exists:customers,id'],
            'customer_name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'frequency' => ['required', 'in:Daily,Weekly,Twice Weekly,Custom,Weekdays only,Weekends only'],
            'delivery_days' => ['required', 'array', 'min:1'],
            'delivery_days.*' => ['required', 'string', 'max:30'],
            'products' => ['nullable', 'array'],
            'products.*.product_id' => ['nullable', 'exists:products,id'],
            'products.*.name' => ['nullable', 'string', 'max:255'],
            'products.*.quantity' => ['nullable', 'numeric', 'min:0.01'],
            'products.*.unit' => ['nullable', 'string', 'max:30'],
            'products.*.label' => ['nullable', 'string', 'max:255'],
            'value' => ['required', 'numeric', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'next_delivery' => ['nullable', 'date'],
            'status' => ['required', 'in:Active,Paused,Inactive'],
        ]);

        $validated['delivery_days'] = SubscriptionScheduler::normalizeDeliveryDays($validated['delivery_days'] ?? []);
        $validated['products'] = collect($validated['products'] ?? [])->map(function (array $item, int $index) {
            $quantity = (float) ($item['quantity'] ?? 1);
            $unit = (string) ($item['unit'] ?? 'pcs');
            $name = (string) ($item['name'] ?? 'Product');

            return [
                'id' => $item['id'] ?? ('line-' . $index),
                'product_id' => $item['product_id'] ?? null,
                'name' => $name,
                'quantity' => $quantity,
                'unit' => $unit,
                'label' => $item['label'] ?? ($name . ' - ' . rtrim(rtrim(number_format($quantity, 2, '.', ''), '0'), '.') . ' ' . $unit),
            ];
        })->values()->all();

        $anchorDate = $validated['start_date'] ?? $validated['next_delivery'] ?? null;
        $anchor = $anchorDate ? Carbon::parse((string) $anchorDate)->startOfDay() : now()->startOfDay();

        $validated['next_delivery'] = SubscriptionScheduler::nextDeliveryDate(
            (string) $validated['frequency'],
            $validated['delivery_days'],
            $anchor
        )->toDateString();

        unset($validated['start_date']);

        return $validated;
    }

    protected function abbreviateDeliveryDays(array $days): array
    {
        return SubscriptionScheduler::normalizeDeliveryDays($days);
    }

    protected function mapSubscriptionRequestForBackoffice(SubscriptionRequest $subscriptionRequest): array
    {
        $subscriptionRequest->loadMissing(['customer', 'user', 'items.product', 'items.pack']);
        $customer = $subscriptionRequest->customer;
        $user = $subscriptionRequest->user;
        $status = (string) $subscriptionRequest->status;

        return [
            'id' => $subscriptionRequest->id,
            'request_number' => $subscriptionRequest->request_number,
            'customer_id' => $subscriptionRequest->customer_id,
            'customer_name' => $customer?->full_name ?: ($user?->name ?: 'Customer'),
            'phone' => $customer?->phone ?: '',
            'email' => $customer?->email ?: ($user?->email ?: ''),
            'submitted_date' => optional($subscriptionRequest->created_at)->toDateString(),
            'submitted_date_label' => optional($subscriptionRequest->created_at)->format('d M Y'),
            'frequency' => $subscriptionRequest->frequency,
            'delivery_days' => $subscriptionRequest->delivery_days ?? [],
            'delivery_days_label' => $this->deliveryDaysLabelForBackoffice($subscriptionRequest->frequency, $subscriptionRequest->delivery_days ?? []),
            'start_date' => optional($subscriptionRequest->start_date)->toDateString(),
            'start_date_label' => optional($subscriptionRequest->start_date)->format('d M Y'),
            'delivery_address' => $subscriptionRequest->delivery_address,
            'notes' => $subscriptionRequest->notes,
            'offered_price' => (float) $subscriptionRequest->offered_price,
            'quoted_price' => $subscriptionRequest->quoted_price !== null ? (float) $subscriptionRequest->quoted_price : null,
            'quoted_message' => $subscriptionRequest->quoted_message,
            'quote_valid_until' => optional($subscriptionRequest->quote_valid_until)->toDateString(),
            'quote_valid_until_label' => optional($subscriptionRequest->quote_valid_until)->format('d M Y'),
            'status' => $status,
            'status_label' => $this->requestStatusLabelForBackoffice($status),
            'response_message' => $subscriptionRequest->response_message,
            'rejection_reason' => $subscriptionRequest->rejection_reason,
            'items' => $subscriptionRequest->items->map(fn (SubscriptionRequestItem $item) => $this->mapSubscriptionRequestItemForBackoffice($item))->values(),
            'can_quote' => in_array($status, [SubscriptionRequest::STATUS_PENDING_REVIEW, SubscriptionRequest::STATUS_QUOTED], true),
            'subscription_id' => $subscriptionRequest->subscription_id,
        ];
    }

    protected function mapSubscriptionRequestItemForBackoffice(SubscriptionRequestItem $item): array
    {
        return [
            'id' => $item->id,
            'item_type' => $item->item_type,
            'name' => $item->item_name ?: ($item->item_type === 'pack' ? $item->pack?->name : $item->product?->name),
            'quantity' => (float) $item->quantity,
            'unit' => $item->unit ?: ($item->item_type === 'pack' ? 'pack' : $item->product?->unit),
            'unit_price' => (float) $item->unit_price,
            'line_total' => (float) $item->line_total,
        ];
    }

    protected function deliveryDaysLabelForBackoffice(?string $frequency, array $days): string
    {
        $frequency = strtolower((string) $frequency);

        if ($frequency === 'daily') {
            return 'Every day';
        }

        if ($frequency === 'weekdays only') {
            return 'Mon-Fri';
        }

        if ($frequency === 'weekends only') {
            return 'Sat-Sun';
        }

        if ($days === []) {
            return 'Flexible schedule';
        }

        return implode(', ', $days);
    }

    protected function requestStatusLabelForBackoffice(string $status): string
    {
        return match ($status) {
            SubscriptionRequest::STATUS_PENDING_REVIEW => 'Pending Review',
            SubscriptionRequest::STATUS_QUOTED => 'Quoted',
            SubscriptionRequest::STATUS_ACCEPTED => 'Accepted',
            SubscriptionRequest::STATUS_REJECTED => 'Rejected',
            SubscriptionRequest::STATUS_EXPIRED => 'Expired',
            default => ucfirst(str_replace('_', ' ', $status)),
        };
    }

    protected function paymentMethodEnumValues(): array
    {
        static $cached = null;

        if (is_array($cached)) {
            return $cached;
        }

        try {
            $column = DB::selectOne("SHOW COLUMNS FROM `payments` LIKE 'method'");
        } catch (\Throwable) {
            return $cached = [];
        }

        if (!$column || !isset($column->Type)) {
            return $cached = [];
        }

        $type = (string) $column->Type;
        if (!preg_match("/^enum\\((.*)\\)$/i", $type, $matches)) {
            return $cached = [];
        }

        $values = str_getcsv($matches[1], ',', "'", "\\");

        return $cached = collect($values)
            ->map(fn ($value) => strtolower(trim((string) $value)))
            ->filter()
            ->values()
            ->all();
    }

    protected function resolvePaymentMethod(?string $requested): string
    {
        $requested = strtolower(trim((string) $requested));
        $requested = $requested !== '' ? $requested : 'bank';

        $allowed = $this->paymentMethodEnumValues();
        if ($allowed === []) {
            return $requested;
        }

        if (in_array($requested, $allowed, true)) {
            return $requested;
        }

        $aliases = match ($requested) {
            'bank' => ['bank', 'bank_transfer', 'transfer', 'wire'],
            'lipa_no' => ['lipa_no', 'mobile_money', 'momo', 'mpesa'],
            'cash' => ['cash'],
            default => [$requested],
        };

        foreach ($aliases as $candidate) {
            if (in_array($candidate, $allowed, true)) {
                return $candidate;
            }
        }

        foreach (['cash', 'lipa_no', 'mobile_money', 'bank', 'bank_transfer'] as $fallback) {
            if (in_array($fallback, $allowed, true)) {
                return $fallback;
            }
        }

        return $allowed[0];
    }

    protected function normalizePaymentMethodForUi(?string $stored): string
    {
        $stored = strtolower(trim((string) $stored));

        if (in_array($stored, ['bank', 'bank_transfer', 'transfer', 'wire'], true)) {
            return 'bank';
        }

        if (in_array($stored, ['lipa_no', 'mobile_money', 'momo', 'mpesa'], true)) {
            return 'lipa_no';
        }

        return $stored === 'cash' ? 'cash' : 'bank';
    }

    public function billing(Request $request)
    {
        $this->ensureBackoffice();
        $perPage = $this->resolvePerPage($request);
        $statusFilter = strtolower((string) $request->string('status'));
        $search = trim((string) $request->string('search'));

        $invoiceRows = Invoice::query()
            ->with(['order.customer', 'items.product', 'payments'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($builder) use ($search) {
                    $builder
                        ->where('invoice_number', 'like', "%{$search}%")
                        ->orWhere('customer_name', 'like', "%{$search}%")
                        ->orWhereHas('order.customer', fn ($customerQuery) => $customerQuery->where('full_name', 'like', "%{$search}%"));
                });
            })
            ->orderByDesc('invoices.created_at')
            ->get()
            ->map(function (Invoice $invoice) {
                $status = $this->resolveInvoiceStatus($invoice);
                $notification = $this->resolveInvoiceNotification($invoice, $status);

                return [
                    'id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                    'sub_reference' => $invoice->order?->order_number
                        ? preg_replace('/^ORD-?/i', 'SUB-', $invoice->order->order_number)
                        : 'SUB-' . str_pad((string) $invoice->id, 3, '0', STR_PAD_LEFT),
                    'customer_name' => $invoice->customer_name ?: $invoice->order?->customer?->full_name ?: 'Walk-in customer',
                    'amount' => (float) $invoice->total,
                    'invoice_date' => optional($invoice->invoice_date)->toDateString(),
                    'due_date' => optional($invoice->due_date)->toDateString(),
                    'status' => $status,
                    'notification' => $notification,
                ];
            })
            ->when($statusFilter !== '' && $statusFilter !== 'all', fn ($collection) => $collection->where('status', strtolower($statusFilter))->values())
            ->values();

        $invoices = $this->paginateCollection($invoiceRows, $perPage, $request)
            ->through(fn (array $invoice) => $invoice);

        $summary = [
            'total_received' => (float) $invoiceRows->where('status', 'paid')->sum('amount'),
            'pending_payments' => (float) $invoiceRows->where('status', 'pending')->sum('amount'),
            'overdue_payments' => (float) $invoiceRows->where('status', 'overdue')->sum('amount'),
        ];

        return Inertia::render('Billing', [
            'invoices' => $invoices,
            'summary' => $summary,
            'filters' => [
                'search' => $search,
                'status' => $statusFilter,
                'per_page' => $perPage,
            ],
            'perPageOptions' => $this->allowedPerPageOptions,
        ]);
    }

    public function createInvoice()
    {
        $this->ensureBackoffice();

        $customers = $this->invoiceCustomerOptions();

        $products = Product::query()
            ->active()
            ->with('currentPrice')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'price' => (float) ($product->currentPrice?->promo_price ?? $product->currentPrice?->price ?? 0),
            ]);

        return Inertia::render('CreateInvoice', [
            'customers' => $customers,
            'products' => $products,
            'mode' => 'create',
            'invoice' => null,
            'defaults' => [
                'invoice_number' => $this->generateInvoiceNumber(),
                'invoice_date' => now()->toDateString(),
                'due_date' => now()->addDays(7)->toDateString(),
                'currency' => 'Tanzanian Shillings',
                'bank_name' => 'CRDB Bank Tanzania',
                'account_name' => 'AMANI BREW - Premium Butchery',
                'account_number' => '0651234567890',
            ],
        ]);
    }

    public function editInvoice(Invoice $invoice)
    {
        $this->ensureBackoffice();

        $customers = $this->invoiceCustomerOptions();

        $products = Product::query()
            ->active()
            ->with('currentPrice')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'price' => (float) ($product->currentPrice?->promo_price ?? $product->currentPrice?->price ?? 0),
            ]);

        $invoice->loadMissing(['items.product']);

        return Inertia::render('CreateInvoice', [
            'customers' => $customers,
            'products' => $products,
            'mode' => 'edit',
            'invoice' => [
                'id' => $invoice->id,
                'order_id' => $invoice->order_id,
                'customer_id' => null,
                'invoice_number' => $invoice->invoice_number,
                'invoice_date' => optional($invoice->invoice_date)->toDateString(),
                'due_date' => optional($invoice->due_date)->toDateString(),
                'tin_number' => $invoice->tin_number,
                'customer_name' => $invoice->customer_name,
                'customer_contact' => $invoice->customer_contact,
                'bill_to_address' => $invoice->bill_to_address,
                'deliver_to_name' => $invoice->deliver_to_name,
                'deliver_to_address' => $invoice->deliver_to_address,
                'customer_city' => $invoice->customer_city,
                'subtotal' => (float) $invoice->subtotal,
                'tax' => (float) $invoice->tax,
                'discount' => (float) $invoice->discount,
                'total' => (float) $invoice->total,
                'currency' => $invoice->currency,
                'bank_name' => $invoice->bank_name,
                'account_name' => $invoice->account_name,
                'account_number' => $invoice->account_number,
                'status' => $invoice->status,
                'payment_method' => $this->normalizePaymentMethodForUi(optional($invoice->payments()->latest('id')->first())->method ?: 'bank'),
                'transaction_id' => optional($invoice->payments()->latest('id')->first())->transaction_id,
                'notes' => $invoice->notes,
                'items' => $invoice->items->map(fn (InvoiceItem $item) => [
                    'product_id' => $item->product_id,
                    'description' => $item->description ?: $item->product?->name ?: '',
                    'quantity' => (float) $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'subtotal' => (float) $item->subtotal,
                ])->values()->all(),
            ],
            'defaults' => [
                'invoice_number' => $invoice->invoice_number,
                'invoice_date' => optional($invoice->invoice_date)->toDateString(),
                'due_date' => optional($invoice->due_date)->toDateString(),
                'currency' => $invoice->currency ?: 'Tanzanian Shillings',
                'bank_name' => $invoice->bank_name ?: 'CRDB Bank Tanzania',
                'account_name' => $invoice->account_name ?: 'AMANI BREW - Premium Butchery',
                'account_number' => $invoice->account_number ?: '0651234567890',
            ],
        ]);
    }

    public function storeInvoice(Request $request)
    {
        $this->ensureBackoffice();

        $validated = $request->validate([
            'order_id' => ['nullable', 'exists:orders,id'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'invoice_number' => ['required', 'string', 'max:255', 'unique:invoices,invoice_number'],
            'invoice_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:invoice_date'],
            'tin_number' => ['nullable', 'string', 'max:255'],
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_contact' => ['required', 'string', 'max:255'],
            'bill_to_address' => ['required', 'string'],
            'deliver_to_name' => ['nullable', 'string', 'max:255'],
            'deliver_to_address' => ['required', 'string'],
            'customer_city' => ['nullable', 'string', 'max:255'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'total' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'max:255'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'account_name' => ['nullable', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'in:draft,pending,paid,overdue,sent'],
            'payment_method' => ['nullable', 'string', 'max:255'],
            'transaction_id' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable', 'exists:products,id'],
            'items.*.description' => ['required', 'string'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.subtotal' => ['required', 'numeric', 'min:0'],
        ]);

        $invoice = DB::transaction(function () use ($validated) {
            $normalizedItems = collect($validated['items'])->map(function (array $item) {
                $quantity = round((float) $item['quantity'], 2);
                $unitPrice = round((float) $item['unit_price'], 2);
                $subtotal = round($quantity * $unitPrice, 2);

                return [
                    'product_id' => $item['product_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'subtotal' => $subtotal,
                ];
            });

            $lineSubtotal = round((float) $normalizedItems->sum('subtotal'), 2);
            $subtotal = round((float) ($validated['subtotal'] ?? $lineSubtotal), 2);
            $tax = round((float) ($validated['tax'] ?? 0), 2);
            $discount = round((float) ($validated['discount'] ?? 0), 2);
            $calculatedTotal = round(max($subtotal + $tax - $discount, 0), 2);
            $total = round((float) ($validated['total'] ?? $calculatedTotal), 2);
            $total = max($total, 0);

            $invoice = Invoice::create([
                'invoice_number' => $validated['invoice_number'],
                'order_id' => $validated['order_id'] ?? null,
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'],
                'tin_number' => $validated['tin_number'] ?? null,
                'customer_name' => $validated['customer_name'],
                'customer_contact' => $validated['customer_contact'],
                'bill_to_address' => $validated['bill_to_address'],
                'deliver_to_name' => $validated['deliver_to_name'] ?: $validated['customer_name'],
                'deliver_to_address' => $validated['deliver_to_address'],
                'customer_city' => $validated['customer_city'] ?? null,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'discount' => $discount,
                'total' => $total,
                'currency' => $validated['currency'],
                'bank_name' => $validated['bank_name'] ?? null,
                'account_name' => $validated['account_name'] ?? null,
                'account_number' => $validated['account_number'] ?? null,
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($normalizedItems as $item) {
                $invoice->items()->create([
                    'product_id' => $item['product_id'],
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $item['subtotal'],
                ]);
            }

            if ($validated['status'] === 'paid') {
                $paymentMethod = $this->resolvePaymentMethod($validated['payment_method'] ?? null);
                Payment::create([
                    'invoice_id' => $invoice->id,
                    'order_id' => $invoice->order_id,
                    'amount' => $total,
                    'method' => $paymentMethod,
                    'transaction_id' => $validated['transaction_id'] ?? null,
                    'status' => 'paid',
                ]);
            }

            return $invoice;
        });

        return redirect()->route('fat-clients.billing')->with('success', "Invoice {$invoice->invoice_number} created successfully.");
    }

    public function updateInvoice(Request $request, Invoice $invoice)
    {
        $this->ensureBackoffice();

        $validated = $request->validate([
            'order_id' => ['nullable', 'exists:orders,id'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'invoice_number' => ['required', 'string', 'max:255', 'unique:invoices,invoice_number,' . $invoice->id],
            'invoice_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:invoice_date'],
            'tin_number' => ['nullable', 'string', 'max:255'],
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_contact' => ['required', 'string', 'max:255'],
            'bill_to_address' => ['required', 'string'],
            'deliver_to_name' => ['nullable', 'string', 'max:255'],
            'deliver_to_address' => ['required', 'string'],
            'customer_city' => ['nullable', 'string', 'max:255'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'total' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'max:255'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'account_name' => ['nullable', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:255'],
            'status' => ['required', 'in:draft,pending,paid,overdue,sent'],
            'payment_method' => ['nullable', 'string', 'max:255'],
            'transaction_id' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['nullable', 'exists:products,id'],
            'items.*.description' => ['required', 'string'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.subtotal' => ['required', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($validated, $invoice) {
            $normalizedItems = collect($validated['items'])->map(function (array $item) {
                $quantity = round((float) $item['quantity'], 2);
                $unitPrice = round((float) $item['unit_price'], 2);
                $subtotal = round($quantity * $unitPrice, 2);

                return [
                    'product_id' => $item['product_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'subtotal' => $subtotal,
                ];
            });

            $lineSubtotal = round((float) $normalizedItems->sum('subtotal'), 2);
            $subtotal = round((float) ($validated['subtotal'] ?? $lineSubtotal), 2);
            $tax = round((float) ($validated['tax'] ?? 0), 2);
            $discount = round((float) ($validated['discount'] ?? 0), 2);
            $calculatedTotal = round(max($subtotal + $tax - $discount, 0), 2);
            $total = round((float) ($validated['total'] ?? $calculatedTotal), 2);
            $total = max($total, 0);

            $invoice->update([
                'invoice_number' => $validated['invoice_number'],
                'order_id' => $validated['order_id'] ?? null,
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'],
                'tin_number' => $validated['tin_number'] ?? null,
                'customer_name' => $validated['customer_name'],
                'customer_contact' => $validated['customer_contact'],
                'bill_to_address' => $validated['bill_to_address'],
                'deliver_to_name' => $validated['deliver_to_name'] ?: $validated['customer_name'],
                'deliver_to_address' => $validated['deliver_to_address'],
                'customer_city' => $validated['customer_city'] ?? null,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'discount' => $discount,
                'total' => $total,
                'currency' => $validated['currency'],
                'bank_name' => $validated['bank_name'] ?? null,
                'account_name' => $validated['account_name'] ?? null,
                'account_number' => $validated['account_number'] ?? null,
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
            ]);

            $invoice->items()->delete();
            foreach ($normalizedItems as $item) {
                $invoice->items()->create([
                    'product_id' => $item['product_id'],
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $item['subtotal'],
                ]);
            }

            if ($validated['status'] === 'paid') {
                $paymentMethod = $this->resolvePaymentMethod($validated['payment_method'] ?? null);
                Payment::updateOrCreate(
                    ['invoice_id' => $invoice->id],
                    [
                        'order_id' => $invoice->order_id,
                        'amount' => $total,
                        'method' => $paymentMethod,
                        'transaction_id' => $validated['transaction_id'] ?? null,
                        'status' => 'paid',
                    ]
                );
            } else {
                Payment::query()->where('invoice_id', $invoice->id)->delete();
            }
        });

        return redirect()->route('fat-clients.billing')->with('success', "Invoice {$invoice->invoice_number} updated successfully.");
    }

    public function destroyInvoice(Invoice $invoice)
    {
        $this->ensureBackoffice();

        DB::transaction(function () use ($invoice) {
            $invoice->payments()->delete();
            $invoice->items()->delete();
            $invoice->delete();
        });

        return redirect()->route('fat-clients.billing')->with('success', 'Invoice deleted successfully.');
    }

    public function showInvoice(Invoice $invoice)
    {
        $this->ensureBackoffice();

        $invoice->load(['items.product', 'payments', 'order.customer']);

        return Inertia::render('InvoiceShow', [
            'invoice' => $this->mapInvoiceDetail($invoice),
        ]);
    }

    public function downloadInvoice(Invoice $invoice)
    {
        $this->ensureBackoffice();

        $invoice->load(['items.product', 'order.customer']);
        $details = $this->mapInvoiceDetail($invoice);

        $lines = [
            'AMANI BREW - INVOICE',
            'Invoice #: ' . $details['invoice_number'],
            'Date: ' . $details['invoice_date'],
            'TIN No: ' . ($details['tin_number'] ?: 'N/A'),
            'Bill To: ' . $details['customer_name'],
            'Contact: ' . ($details['customer_contact'] ?: 'N/A'),
            'Address: ' . $details['bill_to_address'],
            'Deliver To: ' . $details['deliver_to_name'],
            'Delivery Address: ' . $details['deliver_to_address'],
            'City: ' . ($details['customer_city'] ?: 'N/A'),
            '',
            'Invoice Items',
        ];

        foreach ($details['items'] as $index => $item) {
            $lines[] = sprintf(
                '%d. %s | Qty %s | Unit Tzs %s | Total Tzs %s',
                $index + 1,
                $item['description'],
                $item['quantity'],
                number_format((float) $item['unit_price'], 2),
                number_format((float) $item['subtotal'], 2),
            );
        }

        $lines = array_merge($lines, [
            '',
            'Subtotal: Tzs ' . number_format((float) $details['subtotal'], 2),
            'Tax: Tzs ' . number_format((float) $details['tax'], 2),
            'Discount: Tzs ' . number_format((float) $details['discount'], 2),
            'Total Due: Tzs ' . number_format((float) $details['total'], 2),
            '',
            'Payment Details',
            'Currency: ' . ($details['currency'] ?: 'Tanzanian Shillings'),
            'Bank Name: ' . ($details['bank_name'] ?: 'CRDB Bank Tanzania'),
            'Account Name: ' . ($details['account_name'] ?: 'AMANI BREW - Premium Butchery'),
            'Account No: ' . ($details['account_number'] ?: '0651234567890'),
        ]);

        $pdf = $this->buildSimplePdf($lines);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $invoice->invoice_number . '.pdf"',
        ]);
    }

    protected function mapInvoiceDetail(Invoice $invoice): array
    {
        $status = $this->resolveInvoiceStatus($invoice);

        return [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'invoice_date' => optional($invoice->invoice_date)->format('d/m/Y'),
            'due_date' => optional($invoice->due_date)->toDateString(),
            'tin_number' => $invoice->tin_number,
            'customer_name' => $invoice->customer_name ?: $invoice->order?->customer?->full_name ?: 'Customer Name',
            'customer_contact' => $invoice->customer_contact,
            'bill_to_address' => $invoice->bill_to_address,
            'deliver_to_name' => $invoice->deliver_to_name ?: $invoice->customer_name,
            'deliver_to_address' => $invoice->deliver_to_address,
            'customer_city' => $invoice->customer_city,
            'subtotal' => (float) $invoice->subtotal,
            'tax' => (float) $invoice->tax,
            'discount' => (float) $invoice->discount,
            'total' => (float) $invoice->total,
            'currency' => $invoice->currency,
            'bank_name' => $invoice->bank_name,
            'account_name' => $invoice->account_name,
            'account_number' => $invoice->account_number,
            'status' => $status,
            'notes' => $invoice->notes,
            'items' => $invoice->items->values()->map(fn (InvoiceItem $item) => [
                'id' => $item->id,
                'description' => $item->description ?: $item->product?->name ?: 'Invoice item',
                'quantity' => (float) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'subtotal' => (float) $item->subtotal,
            ]),
        ];
    }

    protected function resolveInvoiceStatus(Invoice $invoice): string
    {
        $status = strtolower((string) $invoice->status);

        if ($status === 'paid') {
            return 'paid';
        }

        if ($invoice->due_date && $invoice->due_date->isPast()) {
            return 'overdue';
        }

        return in_array($status, ['draft', 'sent', 'pending'], true) ? $status : 'pending';
    }

    protected function resolveInvoiceNotification(Invoice $invoice, string $status): array
    {
        if ($status === 'paid') {
            return [
                'text' => 'Payment received',
                'tone' => 'success',
            ];
        }

        if ($status === 'overdue') {
            return [
                'text' => 'Payment overdue - Notify customer',
                'tone' => 'danger',
            ];
        }

        if ($invoice->due_date && $invoice->due_date->isTomorrow()) {
            return [
                'text' => 'Due tomorrow - Notify customer',
                'tone' => 'danger',
            ];
        }

        return [
            'text' => 'Awaiting payment',
            'tone' => 'warning',
        ];
    }

    protected function invoiceCustomerOptions()
    {
        return Customer::query()
            ->withCount('orders')
            ->where(function ($query) {
                $query
                    ->whereNull('email')
                    ->orWhere('email', 'not like', '%@example.%');
            })
            ->where(function ($query) {
                $query
                    ->whereNull('phone')
                    ->orWhere('phone', 'not like', '+123456789%');
            })
            ->orderByDesc('orders_count')
            ->orderByDesc('id')
            ->get(['id', 'full_name', 'phone', 'email', 'address'])
            ->reject(function (Customer $customer) {
                $name = strtolower(trim((string) $customer->full_name));

                return in_array($name, ['john doe', 'jane doe', 'test user'], true);
            })
            ->filter(fn (Customer $customer) => filled($customer->full_name))
            ->unique(fn (Customer $customer) => strtolower(trim((string) $customer->full_name)))
            ->sortBy('full_name')
            ->values()
            ->map(fn (Customer $customer) => [
                'id' => $customer->id,
                'full_name' => $customer->full_name,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'address' => $customer->address,
            ])
            ->values();
    }

    protected function generateInvoiceNumber(): string
    {
        $prefix = now()->format('Y');
        $latest = Invoice::query()
            ->where('invoice_number', 'like', $prefix . '%')
            ->orderByDesc('invoice_number')
            ->value('invoice_number');

        $lastSequence = 0;
        if ($latest && preg_match('/^' . preg_quote($prefix, '/') . '(\d{3})$/', (string) $latest, $matches)) {
            $lastSequence = (int) $matches[1];
        }

        return $prefix . str_pad((string) ($lastSequence + 1), 3, '0', STR_PAD_LEFT);
    }

    public function customers(Request $request)
    {
        $this->ensureBackoffice();
        $perPage = $this->resolvePerPage($request);

        $this->syncCustomerProfilesFromUsers();

        $customers = Customer::query()
            ->withCount('orders')
            ->with('defaultAddress')
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search');
                $query->where(function ($builder) use ($search) {
                    $builder
                        ->where('full_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->latest()
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Customer $customer) => [
                'id' => $customer->id,
                'full_name' => $customer->full_name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'status' => $customer->status,
                'orders_count' => $customer->orders_count,
                'address' => $customer->defaultAddress?->address_line1 ?: $customer->address,
                'city' => $customer->defaultAddress?->city,
            ]);

        return Inertia::render('Customers', [
            'customers' => $customers,
            'filters' => $request->only(['search', 'status', 'per_page']),
            'summary' => [
                'total_customers' => Customer::count(),
                'total_orders' => Order::count(),
            ],
            'perPageOptions' => $this->allowedPerPageOptions,
        ]);
    }

    protected function syncCustomerProfilesFromUsers(): void
    {
        User::query()
            ->with('roles')
            ->whereHas('roles', fn ($query) => $query->whereIn('name', ['Customer', 'customer']))
            ->whereDoesntHave('customer')
            ->get()
            ->each(function (User $user) {
                Customer::create([
                    'user_id' => $user->id,
                    'full_name' => $user->name,
                    'phone' => '',
                    'email' => $user->email,
                    'address' => '',
                    'status' => 'Active',
                ]);
            });
    }

    public function expenses(Request $request)
    {
        $this->ensureBackoffice();
        $perPage = $this->resolvePerPage($request);

        if (! Schema::hasTable('expenses')) {
            return Inertia::render('Expenses', [
                'summary' => [
                    'total' => 0,
                    'count' => 0,
                ],
                'expenses' => [],
                'tableReady' => false,
                'filters' => ['per_page' => $perPage],
                'perPageOptions' => $this->allowedPerPageOptions,
            ]);
        }

        if (! Expense::query()->exists()) {
            Expense::query()->create([
                'expense_date' => now()->subDays(1)->toDateString(),
                'description' => 'Luku',
                'amount' => 20000,
                'created_by' => auth()->id(),
            ]);

            Expense::query()->create([
                'expense_date' => now()->subDays(7)->toDateString(),
                'description' => 'Luku',
                'amount' => 20000,
                'created_by' => auth()->id(),
            ]);
        }

        $expenseRows = Expense::query()
            ->with(['creator:id,name', 'editor:id,name'])
            ->latest('expense_date')
            ->latest('id')
            ->get()
            ->map(fn (Expense $expense) => [
                'id' => $expense->id,
                'date' => optional($expense->expense_date)->toDateString(),
                'description' => $expense->description,
                'amount' => (float) $expense->amount,
                'created_by' => $expense->creator?->name ?? 'System',
                'last_edited_by' => $expense->editor?->name,
            ]);

        $expenses = $this->paginateCollection($expenseRows, $perPage, $request)
            ->through(fn (array $expense) => $expense);

        return Inertia::render('Expenses', [
            'summary' => [
                'total' => (float) $expenseRows->sum('amount'),
                'count' => $expenseRows->count(),
            ],
            'expenses' => $expenses,
            'tableReady' => true,
            'filters' => ['per_page' => $perPage],
            'perPageOptions' => $this->allowedPerPageOptions,
        ]);
    }

    public function storeExpense(Request $request)
    {
        $this->ensureBackoffice();

        abort_unless(Schema::hasTable('expenses'), 422, 'Expenses table is not ready yet. Please run migrations first.');

        $validated = $request->validate([
            'expense_date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        Expense::query()->create([
            ...$validated,
            'created_by' => $request->user()?->id,
        ]);

        return back()->with('success', 'Expense created successfully.');
    }

    public function updateExpense(Request $request, Expense $expense)
    {
        $this->ensureBackoffice();

        abort_unless(Schema::hasTable('expenses'), 422, 'Expenses table is not ready yet. Please run migrations first.');

        $validated = $request->validate([
            'expense_date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $expense->update([
            ...$validated,
            'updated_by' => $request->user()?->id,
        ]);

        return back()->with('success', 'Expense updated successfully.');
    }

    public function destroyExpense(Expense $expense)
    {
        $this->ensureBackoffice();

        abort_unless(Schema::hasTable('expenses'), 422, 'Expenses table is not ready yet. Please run migrations first.');

        $expense->delete();

        return back()->with('success', 'Expense deleted successfully.');
    }

    public function packs(Request $request)
    {
        $this->ensurePackManagers();

        $hasPackItemsTable = Schema::hasTable('pack_items');
        $hasComesWithColumn = Schema::hasColumn('packs', 'comes_with');

        $packsQuery = Pack::query();

        if ($hasPackItemsTable) {
            $packsQuery->with(['items.product:id,name']);
        }

        $packs = $packsQuery
            ->when($request->filled('search'), function ($query) use ($request, $hasComesWithColumn) {
                $search = '%' . $request->string('search') . '%';

                $query->where(function ($builder) use ($search, $hasComesWithColumn) {
                    $builder
                        ->where('name', 'like', $search)
                        ->orWhere('description', 'like', $search);

                    if ($hasComesWithColumn) {
                        $builder->orWhere('comes_with', 'like', $search);
                    }
                });
            })
            ->latest()
            ->paginate(12)
            ->withQueryString()
            ->through(function (Pack $pack) use ($hasPackItemsTable, $hasComesWithColumn) {
                return [
                    'id' => $pack->id,
                    'name' => $pack->name,
                    'slug' => $pack->slug,
                    'description' => $pack->description,
                    'comes_with' => $hasComesWithColumn ? $pack->comes_with : null,
                    'price' => (float) $pack->price,
                    'is_active' => (bool) $pack->is_active,
                    'created_at' => optional($pack->created_at)->toDateString(),
                    'items' => $hasPackItemsTable
                        ? $pack->items->map(fn ($item) => [
                            'id' => $item->id,
                            'product_id' => $item->product_id,
                            'product_name' => $item->product?->name,
                            'quantity' => (float) $item->quantity,
                        ])->values()
                        : collect(),
                ];
            });

        return Inertia::render('PacksAdmin', [
            'packs' => $packs,
            'filters' => $request->only('search'),
            'packFeatureReady' => $hasPackItemsTable && $hasComesWithColumn,
            'products' => Product::query()
                ->active()
                ->orderBy('name')
                ->get(['id', 'name', 'unit'])
                ->map(fn (Product $product) => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'unit' => $product->unit,
                ]),
        ]);
    }

    public function storePack(Request $request)
    {
        $this->ensurePackManagers();

        if (!Schema::hasTable('pack_items') || !Schema::hasColumn('packs', 'comes_with')) {
            return back()->with('error', 'Run the latest migrations before creating packs with products.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:packs,name'],
            'comes_with' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0.01'],
            'is_active' => ['boolean'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
        ]);

        $pack = Pack::create([
            'name' => $validated['name'],
            'description' => $this->buildPackDescription($validated['items']),
            'comes_with' => $validated['comes_with'] ?? null,
            'price' => $validated['price'],
            'is_active' => (bool) ($validated['is_active'] ?? true),
        ]);

        $this->syncPackItems($pack, $validated['items']);
        $this->notifyCustomerAudience([
            'title' => 'New pack available',
            'message' => $pack->name . ' is now available to order.',
            'kind' => 'new_pack',
            'action_url' => '/packs',
        ]);

        return back()->with('success', 'Pack created successfully.');
    }

    public function updatePack(Request $request, Pack $pack)
    {
        $this->ensurePackManagers();

        if (!Schema::hasTable('pack_items') || !Schema::hasColumn('packs', 'comes_with')) {
            return back()->with('error', 'Run the latest migrations before editing packs with products.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:packs,name,' . $pack->id],
            'comes_with' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0.01'],
            'is_active' => ['boolean'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
        ]);

        $pack->update([
            'name' => $validated['name'],
            'description' => $this->buildPackDescription($validated['items']),
            'comes_with' => $validated['comes_with'] ?? null,
            'price' => $validated['price'],
            'is_active' => (bool) ($validated['is_active'] ?? false),
        ]);

        $this->syncPackItems($pack, $validated['items']);

        return back()->with('success', 'Pack updated successfully.');
    }

    public function destroyPack(Pack $pack)
    {
        $this->ensurePackManagers();

        $pack->delete();

        return back()->with('success', 'Pack deleted successfully.');
    }

    protected function syncPackItems(Pack $pack, array $items): void
    {
        $pack->items()->delete();

        $pack->items()->createMany(
            collect($items)
                ->map(fn ($item) => [
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                ])
                ->values()
                ->all()
        );
    }

    protected function buildPackDescription(array $items): string
    {
        $productNames = Product::query()
            ->whereIn('id', collect($items)->pluck('product_id')->all())
            ->pluck('name', 'id');

        return collect($items)
            ->map(function ($item) use ($productNames) {
                $name = $productNames->get($item['product_id'], 'Product');
                $quantity = rtrim(rtrim(number_format((float) $item['quantity'], 2, '.', ''), '0'), '.');

                return "{$quantity} x {$name}";
            })
            ->implode(', ');
    }

    public function createOrder()
    {
        $this->ensureBackoffice();

        $defaultBranch = Branch::where('is_active', true)->orderBy('name')->first(['id', 'name']);

        return Inertia::render('CreateOrder', [
            'products' => Product::query()
                ->active()
                ->with(['category', 'currentPrice'])
                ->withSum('stocks as stock_quantity', 'quantity')
                ->orderBy('name')
                ->get()
                ->map(fn (Product $product) => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'category' => $product->category?->name,
                    'price' => (float) ($product->currentPrice?->promo_price ?? $product->currentPrice?->price ?? 0),
                    'stock_quantity' => (float) ($product->stock_quantity ?? 0),
                ]),
            'branch' => $defaultBranch,
            'nextOrderNumber' => $this->generateDailyOrderNumber(),
        ]);
    }

    public function storeOrder(Request $request)
    {
        $this->ensureBackoffice();

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:255'],
            'branch_id' => ['nullable', 'exists:branches,id'],
            'payment_method' => ['required', 'in:lipa_no,cash,bank'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:1'],
        ]);

        $branchId = $validated['branch_id']
            ?? Branch::where('is_active', true)->value('id');

        abort_unless($branchId, 422, 'No active branch found for order creation.');
        $stockError = $this->validateRequestedStock($validated['items'], $branchId);

        if ($stockError) {
            return back()->with('error', $stockError);
        }

        $productIds = collect($validated['items'])->pluck('product_id')->all();
        $products = Product::query()->with('currentPrice')->whereIn('id', $productIds)->get()->keyBy('id');

        $subtotal = collect($validated['items'])->sum(function ($item) use ($products) {
            $product = $products->get($item['product_id']);
            $price = (float) ($product?->currentPrice?->promo_price ?? $product?->currentPrice?->price ?? 0);
            return $price * (float) $item['quantity'];
        });

        $order = DB::transaction(function () use ($validated, $products, $subtotal, $branchId) {
            $customer = Customer::firstOrCreate(
                ['phone' => $validated['phone']],
                [
                    'full_name' => $validated['full_name'],
                    'email' => null,
                    'address' => null,
                    'status' => 'Active',
                ]
            );

            if ($customer->full_name !== $validated['full_name']) {
                $customer->update(['full_name' => $validated['full_name']]);
            }

            $order = Order::create([
                'order_number' => $this->generateDailyOrderNumber(),
                'customer_id' => $customer->id,
                'branch_id' => $branchId,
                'status' => 'pending',
                'subtotal' => $subtotal,
                'tax' => 0,
                'total' => $subtotal,
                'payment_method' => $validated['payment_method'],
                'is_paid' => false,
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                $product = $products->get($item['product_id']);
                $price = (float) ($product?->currentPrice?->promo_price ?? $product?->currentPrice?->price ?? 0);

                $order->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'price' => $price,
                    'subtotal' => $price * (float) $item['quantity'],
                ]);
            }

            return $order;
        });

        $this->notifyBackofficeUsers($order, $request->user()?->id);

        return redirect()->route('orders')->with('success', "Order {$order->order_number} created successfully.");
    }

    private function generateDailyOrderNumber(): string
    {
        $prefix = now()->format('Ymd');
        $latestToday = Order::query()
            ->where('order_number', 'like', $prefix . '%')
            ->orderByDesc('order_number')
            ->value('order_number');

        $lastSequence = $latestToday ? (int) substr($latestToday, -3) : 0;

        return $prefix . str_pad((string) ($lastSequence + 1), 3, '0', STR_PAD_LEFT);
    }

    public function updateOrder(Request $request, Order $order)
    {
        $this->ensureBackoffice();

        $validated = $request->validate([
            'status' => ['required', 'in:pending,dispatched'],
            'payment_method' => ['required', 'string', 'max:255'],
            'delivery_region' => ['nullable', 'string', 'max:255'],
            'delivery_area' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $originalStatus = $this->normalizeOrderStatus($order->status);
        $dispatchingNow = $validated['status'] === 'dispatched' && $originalStatus !== 'dispatched';

        if ($originalStatus === 'dispatched' && $validated['status'] !== 'dispatched') {
            return back()->with('error', 'Dispatched orders cannot be changed back to a cancellable status.');
        }

        if (in_array($originalStatus, ['delivered', 'cancelled'], true) && $validated['status'] !== $originalStatus) {
            return back()->with('error', 'Completed or cancelled orders cannot be changed.');
        }

        if ($dispatchingNow) {
            $stockError = $this->validateRequestedStock(
                $this->mapOrderItemsForStockValidation($order),
                $order->branch_id,
            );

            if ($stockError) {
                return back()->with('error', $stockError);
            }
        }

        DB::transaction(function () use ($order, $validated) {
            $order->update($validated);

            if ($validated['status'] === 'dispatched') {
                $this->deductOrderStock($order);
            }

            if ($order->fulfillment_method === 'delivery') {
                $existingDelivery = $order->deliveries()->latest('id')->first();

                $order->deliveries()->updateOrCreate(
                    ['order_id' => $order->id, 'id' => $existingDelivery?->id],
                    [
                        'delivery_number' => $existingDelivery?->delivery_number ?: ('DEL-' . now()->format('YmdHis') . '-' . $order->id),
                        'branch_id' => $order->branch_id,
                        'status' => $validated['status'] === 'dispatched' ? 'in_transit' : 'pending',
                        'delivery_fee' => $existingDelivery?->delivery_fee ?? 0,
                        'tracking_number' => $existingDelivery?->tracking_number ?: ('TRK-' . $order->id . '-' . now()->format('His')),
                        'driver_id' => $existingDelivery?->driver_id,
                    ]
                );
            }
        });

        $order->refresh();
        $updatedStatus = $this->normalizeOrderStatus($order->status);

        if ($updatedStatus !== $originalStatus) {
            $this->notifyCustomerAboutOrderStatus($order, $updatedStatus);
        }

        Log::info('Order updated from back office.', [
            'actor_user_id' => auth()->id(),
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'original_status' => $originalStatus,
            'updated_status' => $updatedStatus,
        ]);

        return back()->with('success', "Order {$order->order_number} updated successfully.");
    }

    public function dispatchOrder(Order $order)
    {
        $this->ensureBackoffice();

        abort_unless($this->normalizeOrderStatus($order->status) === 'pending', 422, 'Only pending orders can be dispatched.');
        $stockError = $this->validateRequestedStock(
            $this->mapOrderItemsForStockValidation($order),
            $order->branch_id,
        );

        if ($stockError) {
            return back()->with('error', $stockError);
        }

        DB::transaction(function () use ($order) {
            $order->update(['status' => 'dispatched']);
            $this->deductOrderStock($order);

            $existingDelivery = $order->deliveries()->latest('id')->first();

            $order->deliveries()->updateOrCreate(
                ['order_id' => $order->id, 'id' => $existingDelivery?->id],
                [
                    'delivery_number' => $existingDelivery?->delivery_number ?: ('DEL-' . now()->format('YmdHis') . '-' . $order->id),
                    'branch_id' => $order->branch_id,
                    'status' => 'in_transit',
                    'delivery_fee' => $existingDelivery?->delivery_fee ?? 0,
                    'tracking_number' => $existingDelivery?->tracking_number ?: ('TRK-' . $order->id . '-' . now()->format('His')),
                    'driver_id' => $existingDelivery?->driver_id,
                ]
            );
        });

        $order->refresh();
        $this->notifyCustomerAboutOrderStatus($order, 'dispatched');

        Log::info('Order dispatched from back office.', [
            'actor_user_id' => auth()->id(),
            'order_id' => $order->id,
            'order_number' => $order->order_number,
        ]);

        return back()->with('success', "Order {$order->order_number} dispatched successfully.");
    }

    public function completePickup(Order $order)
    {
        $this->ensureBackoffice();

        abort_unless($order->fulfillment_method === 'pickup', 422, 'Only pickup orders can be marked as collected.');

        $currentStatus = $this->normalizeOrderStatus($order->status);

        abort_if($currentStatus === 'cancelled', 422, 'Cancelled pickup orders cannot be completed.');
        abort_if($currentStatus === 'delivered', 422, 'This pickup order has already been completed.');

        DB::transaction(function () use ($order, $currentStatus) {
            if ($currentStatus === 'pending') {
                $stockError = $this->validateRequestedStock(
                    $this->mapOrderItemsForStockValidation($order),
                    $order->branch_id,
                );

                if ($stockError) {
                    abort(422, $stockError);
                }

                $this->deductOrderStock($order);
            }

            $order->update(['status' => 'completed']);
        });

        $order->refresh();
        $this->notifyCustomerAboutOrderStatus($order, 'completed');

        Log::info('Pickup order completed from back office.', [
            'actor_user_id' => auth()->id(),
            'order_id' => $order->id,
            'order_number' => $order->order_number,
        ]);

        return back()->with('success', "Pickup order {$order->order_number} marked as completed.");
    }

    public function destroyOrder(Order $order)
    {
        $this->ensureBackoffice();

        $orderNumber = $order->order_number;

        DB::transaction(function () use ($order) {
            $order->payments()->delete();
            $order->deliveries()->each(function ($delivery) {
                $delivery->items()->delete();
                $delivery->delete();
            });
            $order->items()->delete();
            $order->delete();
        });

        Log::info('Order deleted from back office.', [
            'actor_user_id' => auth()->id(),
            'order_number' => $orderNumber,
            'order_id' => $order->id,
        ]);

        return back()->with('success', "Order {$orderNumber} deleted successfully.");
    }

    protected function validateRequestedStock(array $items, int $branchId): ?string
    {
        $requestedQuantities = $this->expandRequestedStockRequirements($items);
        $requestedProductNames = collect($items)
            ->filter(fn ($item) => !empty($item['product_id']) || (($item['item_type'] ?? null) === 'product' && !empty($item['name'])))
            ->mapWithKeys(fn ($item) => [
                (int) ($item['product_id'] ?? 0) => $item['name'] ?? 'This product',
            ])
            ->filter(fn ($name, $productId) => $productId > 0);

        if ($requestedQuantities->isEmpty()) {
            return null;
        }

        $stocks = Stock::query()
            ->where('branch_id', $branchId)
            ->whereIn('product_id', $requestedQuantities->keys())
            ->get(['product_id', 'quantity'])
            ->keyBy('product_id');

        $products = Product::query()
            ->whereIn('id', $requestedQuantities->keys())
            ->get(['id', 'name'])
            ->keyBy('id');

        foreach ($requestedQuantities as $productId => $requestedQuantity) {
            $product = $products->get((int) $productId);
            $stock = $stocks->get((int) $productId);
            $availableQuantity = (float) ($stock?->quantity ?? 0);
            $productName = $product?->name ?? $requestedProductNames->get((int) $productId, 'This product');

            if (!$stock) {
                return "{$productName} has no stock record for this branch.";
            }

            if ($requestedQuantity > $availableQuantity) {
                $formattedAvailable = rtrim(rtrim(number_format($availableQuantity, 2, '.', ''), '0'), '.');

                return "{$productName} only has {$formattedAvailable} item(s) available right now.";
            }
        }

        return null;
    }

    protected function deductOrderStock(Order $order): void
    {
        $requestedQuantities = $this->expandRequestedStockRequirements(
            $order->items()
                ->get(['product_id', 'quantity', 'notes'])
                ->map(function ($item) {
                    $metadata = method_exists($item, 'metadata') ? $item->metadata() : [];

                    return [
                        'product_id' => $item->product_id,
                        'quantity' => (float) $item->quantity,
                        'item_type' => $metadata['type'] ?? null,
                        'item_id' => $metadata['item_id'] ?? null,
                    ];
                })
                ->all()
        );

        $products = Product::query()
            ->whereIn('id', $requestedQuantities->keys())
            ->get()
            ->keyBy('id');

        foreach ($requestedQuantities as $productId => $quantity) {
            $product = $products->get((int) $productId);

            $stock = Stock::query()
                ->where('product_id', $productId)
                ->where('branch_id', $order->branch_id)
                ->lockForUpdate()
                ->first();

            if (!$stock) {
                abort(422, ($product?->name ?? 'This product') . ' has no stock record for this branch.');
            }

            if ((float) $stock->quantity < (float) $quantity) {
                abort(422, ($product?->name ?? 'This product') . ' does not have enough stock to dispatch this order.');
            }

            $stock->decrement('quantity', (float) $quantity);
        }
    }

    protected function expandRequestedStockRequirements(array $items)
    {
        $requirements = collect($items)
            ->filter(fn ($item) => !empty($item['product_id']))
            ->map(fn ($item) => [
                'product_id' => (int) $item['product_id'],
                'quantity' => (float) $item['quantity'],
            ]);

        $packLines = collect($items)
            ->filter(fn ($item) => ($item['item_type'] ?? null) === 'pack' && !empty($item['item_id']));

        if ($packLines->isNotEmpty() && Schema::hasTable('pack_items')) {
            $packs = Pack::query()
                ->with('items')
                ->whereIn('id', $packLines->pluck('item_id')->all())
                ->get()
                ->keyBy('id');

            $packRequirements = $packLines->flatMap(function ($item) use ($packs) {
                $pack = $packs->get((int) $item['item_id']);
                $orderedPackQuantity = (float) ($item['quantity'] ?? 0);

                if (!$pack) {
                    return [];
                }

                return $pack->items
                    ->filter(fn ($packItem) => !empty($packItem->product_id))
                    ->map(fn ($packItem) => [
                        'product_id' => (int) $packItem->product_id,
                        'quantity' => (float) $packItem->quantity * $orderedPackQuantity,
                    ])
                    ->values()
                    ->all();
            });

            $requirements = $requirements->concat($packRequirements);
        }

        return $requirements
            ->groupBy('product_id')
            ->mapWithKeys(fn ($group, $productId) => [
                (int) $productId => (float) collect($group)->sum('quantity'),
            ]);
    }

    protected function mapOrderItemsForStockValidation(Order $order): array
    {
        return $order->items()
            ->get(['product_id', 'quantity', 'notes'])
            ->map(function ($item) {
                $metadata = method_exists($item, 'metadata') ? $item->metadata() : [];

                return [
                    'product_id' => $item->product_id,
                    'quantity' => (float) $item->quantity,
                    'item_type' => $metadata['type'] ?? null,
                    'item_id' => $metadata['item_id'] ?? null,
                    'name' => $item->displayName(),
                ];
            })
            ->all();
    }

    protected function normalizeOrderStatus(?string $status): string
    {
        return match (strtolower((string) $status)) {
            'processing', 'preparing', 'confirmed' => 'pending',
            'delivered', 'completed' => 'delivered',
            'cancelled', 'canceled' => 'cancelled',
            'dispatched' => 'dispatched',
            default => 'pending',
        };
    }

    protected function notifyBackofficeUsers(Order $order, ?int $excludeUserId = null): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        User::query()
            ->when($excludeUserId, fn ($query) => $query->where('id', '!=', $excludeUserId))
            ->get()
            ->filter(fn (User $user) => BackofficeAccess::hasBackofficeAccess($user))
            ->each(fn (User $user) => $user->notify(new NewOrderPlacedNotification($order)));
    }

    protected function notifyCustomerAboutOrderStatus(Order $order, string $status): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        $order->loadMissing('customer.user');

        $customerUser = $order->customer?->user;

        if (!$customerUser) {
            return;
        }

        $label = match ($status) {
            'delivered' => 'delivered',
            'completed' => 'completed',
            'cancelled' => 'cancelled',
            'dispatched' => 'dispatched',
            default => 'updated',
        };

        $customerUser->notify(new OrderStatusUpdatedNotification($order, $label));
    }

    public function promotions(Request $request)
    {
        $this->ensureBackoffice();

        $promotions = Promotion::query()
            ->with('creator')
            ->when($request->filled('search'), fn ($query) => $query->where('title', 'like', '%' . $request->string('search') . '%'))
            ->latest()
            ->paginate(12)
            ->withQueryString()
            ->through(function (Promotion $promotion) {
                $hasStarted = blank($promotion->starts_at) || $promotion->starts_at->lte(now());
                $isClosed = $promotion->isClosedForStoreHours();
                $status = ! $promotion->is_active
                    ? 'Inactive'
                    : ($isClosed
                        ? 'Promotion Closed'
                        : ($hasStarted ? 'Active' : 'Scheduled'));

                return [
                    'id' => $promotion->id,
                    'title' => $promotion->title,
                    'slug' => $promotion->slug,
                    'description' => $promotion->description,
                    'discount_label' => $promotion->discount_label,
                    'cta_text' => $promotion->cta_text,
                    'starts_at' => optional($promotion->starts_at)->toDateString(),
                    'ends_at' => optional($promotion->ends_at)->toDateString(),
                    'is_active' => $promotion->is_active,
                    'creator' => $promotion->creator?->name,
                    'status' => $status,
                ];
            });

        return Inertia::render('PromotionsAdmin', [
            'promotions' => $promotions,
            'filters' => $request->only('search'),
        ]);
    }

    public function storePromotion(Request $request)
    {
        $this->ensureBackoffice();

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'discount_label' => ['nullable', 'string', 'max:255'],
            'cta_text' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $promotion = Promotion::create($validated + [
            'created_by' => $request->user()?->id,
            'is_active' => (bool) ($validated['is_active'] ?? true),
        ]);

        $this->notifyCustomerAudience([
            'title' => 'New promotion live',
            'message' => $promotion->title . ' is now live for customers.',
            'kind' => 'new_promotion',
            'action_url' => '/promotions',
        ]);

        return back()->with('success', 'Promotion created successfully.');
    }

    public function updatePromotion(Request $request, Promotion $promotion)
    {
        $this->ensureBackoffice();

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'discount_label' => ['nullable', 'string', 'max:255'],
            'cta_text' => ['nullable', 'string', 'max:255'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $promotion->update($validated + [
            'is_active' => (bool) ($validated['is_active'] ?? false),
        ]);

        return back()->with('success', 'Promotion updated successfully.');
    }

    public function destroyPromotion(Promotion $promotion)
    {
        $this->ensureBackoffice();

        $promotion->delete();

        return back()->with('success', 'Promotion removed.');
    }

    protected function notifyCustomerAudience(array $payload): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        User::query()
            ->where(function ($query) {
                $query->whereHas('customer')
                    ->orWhereHas('roles', fn ($roleQuery) => $roleQuery->whereRaw('LOWER(name) = ?', ['customer']));
            })
            ->get()
            ->each(fn (User $user) => $user->notify(new SystemAlertNotification($payload)));
    }

    protected function notifyBackofficeAudience(array $payload): void
    {
        if (!Schema::hasTable('notifications')) {
            return;
        }

        User::query()
            ->get()
            ->filter(fn (User $user) => BackofficeAccess::hasBackofficeAccess($user))
            ->each(fn (User $user) => $user->notify(new SystemAlertNotification($payload)));
    }
}

