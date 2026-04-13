<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Product;
use App\Models\Promotion;
use App\Services\SalesTargetService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $roleKeys = auth()->user()?->getRoleNames()->map(fn ($role) => strtolower($role)) ?? collect();
        $backofficeRoles = collect(['administrator', 'admin', 'manager', 'staff']);

        if ($roleKeys->isNotEmpty() && $roleKeys->intersect($backofficeRoles)->isEmpty()) {
            return redirect()
                ->route('customer.home')
                ->with('error', 'This account does not have dashboard access.');
        }

        $today = today();
        $yesterday = today()->copy()->subDay();
        $monthStart = now()->startOfMonth();
        $previousMonthStart = now()->copy()->subMonthNoOverflow()->startOfMonth();
        $previousMonthEnd = now()->copy()->subMonthNoOverflow()->endOfMonth();
        $todayLabel = $today->format('l, F j, Y');

        $salesStart = now()->startOfWeek()->startOfDay();
        $salesEnd = now()->endOfWeek()->endOfDay();
        $targetService = app(SalesTargetService::class);
        $salesAnalytics = $targetService->buildPerformance($salesStart, $salesEnd);
        $salesSummary = collect($salesAnalytics['daily_summary']);
        $statusPlaceholders = implode(',', array_fill(0, count(SalesTargetService::REPORTABLE_ORDER_STATUSES), '?'));

        $topProducts = collect(DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->whereBetween('orders.created_at', [$salesStart, $salesEnd])
            ->whereRaw("LOWER(COALESCE(orders.status, '')) IN ({$statusPlaceholders})", SalesTargetService::REPORTABLE_ORDER_STATUSES)
            ->groupBy('products.id', 'products.name')
            ->selectRaw('products.id as id, products.name as name, SUM(order_items.subtotal) as actual')
            ->orderByDesc('actual')
            ->limit(6)
            ->get())
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'name' => $row->name,
                'actual' => round((float) $row->actual, 2),
            ])
            ->values();

        $totalTopProductActual = max((float) $topProducts->sum('actual'), 0.0);
        $totalTargetForPeriod = (float) $salesSummary->get('total_target', 0);

        $topProducts = $topProducts
            ->map(function (array $product) use ($totalTopProductActual, $totalTargetForPeriod) {
                $target = $totalTopProductActual > 0
                    ? round(($product['actual'] / $totalTopProductActual) * $totalTargetForPeriod, 2)
                    : 0.0;

                return [
                    ...$product,
                    'target' => $target,
                ];
            })
            ->filter(fn (array $product) => $product['actual'] > 0 || $product['target'] > 0)
            ->take(4)
            ->values();

        $salesTrend = collect($salesAnalytics['daily_trend'])
            ->map(fn ($row) => [
                'day' => Carbon::parse($row['date'])->format('D'),
                'actual' => (float) $row['actual'],
                'target' => (float) $row['target'],
            ])
            ->values();

        $productTrend = $topProducts->map(fn (array $product) => [
            'name' => $product['name'],
            'actual' => (float) $product['actual'],
            'target' => (float) $product['target'],
        ])->values();

        $recentOrders = Order::query()
            ->with('customer')
            ->latest()
            ->take(6)
            ->get()
            ->map(fn (Order $order) => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'customer' => $order->customer?->full_name,
                'customer_id' => $order->customer_id,
                'status' => $this->normalizeOrderStatus($order->status),
                'total' => (float) $order->total,
            ]);

        $lowStock = Product::query()
            ->active()
            ->withSum('stocks as stock_quantity', 'quantity')
            ->withSum('stocks as reorder_level_total', 'reorder_level')
            ->havingRaw('COALESCE(stock_quantity, 0) <= COALESCE(reorder_level_total, 0)')
            ->orderBy('stock_quantity')
            ->take(5)
            ->get(['id', 'name', 'unit'])
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'unit' => $product->unit,
                'stock_quantity' => (float) ($product->stock_quantity ?? 0),
                'alert_level' => (float) ($product->reorder_level_total ?? 0),
            ]);

        $todaysSales = (float) Order::whereDate('created_at', $today)->sum('total');
        $yesterdaySales = (float) Order::whereDate('created_at', $yesterday)->sum('total');
        $todaysOrders = Order::whereDate('created_at', $today)->count();
        $yesterdayOrders = Order::whereDate('created_at', $yesterday)->count();
        $inventoryUnits = (float) DB::table('stocks')->sum('quantity');
        $previousInventoryUnits = (float) DB::table('stocks')->sum('reorder_level');
        $monthlyRevenue = (float) Order::whereBetween('created_at', [$monthStart, now()])->sum('total');
        $previousMonthlyRevenue = (float) Order::whereBetween('created_at', [$previousMonthStart, $previousMonthEnd])->sum('total');
        $pendingStatuses = ['pending', 'confirmed', 'processing', 'preparing', 'ready'];
        $todaysPendingOrders = Order::query()
            ->with(['customer', 'items.product'])
            ->whereIn('status', $pendingStatuses)
            ->where(function ($query) use ($today) {
                $query
                    ->whereDate('created_at', $today)
                    ->orWhereDate('scheduled_delivery_date', $today)
                    ->orWhereDate('scheduled_pickup_date', $today);
            })
            ->latest()
            ->get()
            ->map(function (Order $order) {
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
                    'customer' => $order->customer?->full_name ?: "Customer #{$order->customer_id}",
                    'status' => $this->normalizeOrderStatus($order->status),
                    'created_at' => optional($order->created_at)->format('h:i A'),
                    'fulfillment_method' => $order->fulfillment_method ?: 'delivery',
                    'is_subscriber_client' => $isSubscriptionOrder,
                    'customer_segment' => $isSubscriptionOrder ? 'Subscriber Client' : 'Regular Client',
                    'total' => (float) $order->total,
                    'location' => collect([$order->delivery_region, $order->delivery_area])->filter()->implode(', '),
                    'items' => $order->items->take(4)->map(function ($item) {
                        $name = $item->displayName();
                        $quantity = rtrim(rtrim(number_format((float) $item->quantity, 2, '.', ''), '0'), '.');

                        return trim("{$name} {$quantity}");
                    })->values(),
                    'line_items' => $order->items->map(function ($item) {
                        return [
                            'name' => $item->displayName(),
                            'quantity' => (float) $item->quantity,
                            'subtotal' => (float) $item->subtotal,
                            'unit' => $item->product?->unit,
                            'description' => $item->displayDescription(),
                        ];
                    })->values(),
                ];
            })
            ->sortByDesc(fn (array $order) => $order['is_subscriber_client'] && $order['fulfillment_method'] === 'delivery')
            ->values();

        return Inertia::render('Dashboard', [
            'stats' => [
                'todays_sales' => $todaysSales,
                'todays_orders' => $todaysOrders,
                'inventory_items' => $inventoryUnits,
                'monthly_revenue' => $monthlyRevenue,
                'active_promotions' => Promotion::active()->count(),
                'customers' => Customer::count(),
                'sales_change' => $this->percentageChange($todaysSales, $yesterdaySales),
                'orders_change' => $this->percentageChange($todaysOrders, $yesterdayOrders),
                'inventory_change' => $inventoryUnits - $previousInventoryUnits,
                'monthly_revenue_change' => $this->percentageChange($monthlyRevenue, $previousMonthlyRevenue),
            ],
            'deliverySummary' => [
                'title' => "Today's Pending Orders",
                'date' => $todayLabel,
                'count' => $todaysPendingOrders->count(),
            ],
            'salesTrend' => $salesTrend,
            'productTrend' => $productTrend,
            'lowStock' => $lowStock,
            'recentOrders' => $recentOrders,
            'todaysPendingOrders' => $todaysPendingOrders,
        ]);
    }

    private function percentageChange(float|int $current, float|int $previous): float
    {
        $current = (float) $current;
        $previous = (float) $previous;

        if ($previous === 0.0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    private function normalizeOrderStatus(?string $status): string
    {
        return match (strtolower((string) $status)) {
            'processing', 'preparing', 'confirmed' => 'pending',
            'delivered', 'completed' => 'delivered',
            'cancelled', 'canceled' => 'cancelled',
            'dispatched' => 'dispatched',
            default => 'pending',
        };
    }
}
