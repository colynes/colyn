<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Order;
use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        // Mocking some data for now but using real structures
        $data = [
            'totalSales'    => Order::whereDate('created_at', today())->sum('total'),
            'totalOrders'   => Order::whereDate('created_at', today())->count(),
            'totalProducts' => Product::active()->count(),
            'totalRevenue'  => Order::sum('total'),
            'lowStock'      => Product::with(['stocks'])
                ->whereHas('stocks', function($q) {
                    $q->whereColumn('quantity', '<=', 'reorder_level');
                })->take(5)->get(),
            'recentOrders'  => Order::latest()->take(5)->get(),
        ];

        return Inertia::render('Dashboard', $data);
    }
}
