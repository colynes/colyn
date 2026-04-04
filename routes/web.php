<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\CommerceController;
use App\Http\Controllers\CustomerHomeController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OperationsController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\StorefrontController;
use App\Http\Controllers\UserController;

// ── Public Routes ──────────────────────────────────────
Route::get('/', [StorefrontController::class, 'index'])->name('home');
Route::post('/cart/items', [CartController::class, 'store'])->name('cart.store');
Route::patch('/cart/items/{productId}', [CartController::class, 'update'])->name('cart.update');
Route::delete('/cart/items/{productId}', [CartController::class, 'destroy'])->name('cart.destroy');
Route::get('/products', [CommerceController::class, 'products'])->name('products.browse');
Route::get('/packs', [CommerceController::class, 'packs'])->name('packs.browse');
Route::get('/cart', [CommerceController::class, 'cart'])->name('cart');
Route::get('/promotions', [CommerceController::class, 'promotions'])->name('promotions');
Route::get('/track-orders', [CommerceController::class, 'tracking'])->name('tracking');
Route::get('/checkout', [CheckoutController::class, 'create'])->name('checkout');
Route::post('/checkout', [CheckoutController::class, 'store'])->name('checkout.store');

Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login']);
Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
Route::post('/register', [AuthController::class, 'register']);
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

// ── Admin/Dashboard Routes ─────────────────────────────
Route::middleware(['auth'])->group(function () {
    Route::get('/customer/home', [CustomerHomeController::class, 'index'])->name('customer.home');
    Route::get('/my-orders', [CommerceController::class, 'tracking'])->name('my-orders');
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'read'])->name('notifications.read');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::patch('/dashboard/orders/{order}/dispatch', [OperationsController::class, 'dispatchOrder'])->name('dashboard.orders.dispatch');
    Route::get('/orders', [OperationsController::class, 'orders'])->name('orders');
    Route::put('/orders/{order}', [OperationsController::class, 'updateOrder'])->name('orders.update');
    Route::delete('/orders/{order}', [OperationsController::class, 'destroyOrder'])->name('orders.destroy');
    Route::get('/invoices/orders/{order}', [InvoiceController::class, 'showForOrder'])->name('invoices.orders.show');
    Route::get('/invoices/orders/{order}/download', [InvoiceController::class, 'downloadForOrder'])->name('invoices.orders.download');
    Route::get('/invoices/orders/{order}/print', [InvoiceController::class, 'printForOrder'])->name('invoices.orders.print');
    Route::get('/invoices/{invoice}', [InvoiceController::class, 'show'])->name('invoices.show');
    Route::get('/invoices/{invoice}/html', [InvoiceController::class, 'html'])->name('invoices.html');
    Route::get('/invoices/{invoice}/download', [InvoiceController::class, 'download'])->name('invoices.download');
    Route::get('/invoices/{invoice}/print', [InvoiceController::class, 'print'])->name('invoices.print');
    Route::get('/dashboard/packs', [OperationsController::class, 'packs'])->name('dashboard.packs');
    Route::post('/dashboard/packs', [OperationsController::class, 'storePack'])->name('dashboard.packs.store');
    Route::put('/dashboard/packs/{pack}', [OperationsController::class, 'updatePack'])->name('dashboard.packs.update');
    Route::delete('/dashboard/packs/{pack}', [OperationsController::class, 'destroyPack'])->name('dashboard.packs.destroy');
    Route::get('/sales', [OperationsController::class, 'sales'])->name('sales');
    Route::post('/sales/targets', [OperationsController::class, 'storeSalesTargets'])->name('sales.targets.store');
    Route::get('/reports', [OperationsController::class, 'reports'])->name('reports');
    Route::get('/reports/export/csv', [OperationsController::class, 'exportReportsCsv'])->name('reports.export.csv');
    Route::get('/reports/export/pdf', [OperationsController::class, 'exportReportsPdf'])->name('reports.export.pdf');
    Route::get('/customers', [OperationsController::class, 'customers'])->name('customers');
    Route::get('/expenses', [OperationsController::class, 'expenses'])->name('expenses');
    Route::post('/expenses', [OperationsController::class, 'storeExpense'])->name('expenses.store');
    Route::put('/expenses/{expense}', [OperationsController::class, 'updateExpense'])->name('expenses.update');
    Route::delete('/expenses/{expense}', [OperationsController::class, 'destroyExpense'])->name('expenses.destroy');
    Route::get('/create-order', [OperationsController::class, 'createOrder'])->name('orders.create');
    Route::post('/create-order', [OperationsController::class, 'storeOrder'])->name('orders.store');
    Route::get('/profile', [CommerceController::class, 'profile'])->name('profile');
    Route::put('/profile', [CommerceController::class, 'updateProfile'])->name('profile.update');
    Route::put('/profile/update', [CommerceController::class, 'updateProfile']);
    Route::patch('/my-orders/{order}/cancel', [CommerceController::class, 'cancelOrder'])->name('my-orders.cancel');
    Route::patch('/my-orders/{order}/deliver', [CommerceController::class, 'confirmDelivery'])->name('my-orders.deliver');

    // Fat Clients
    Route::get('/fat-clients/subscriptions', [OperationsController::class, 'subscriptions'])->name('fat-clients.subscriptions');
    Route::get('/fat-clients/billing', [OperationsController::class, 'billing'])->name('fat-clients.billing');
    Route::get('/fat-clients/billing/create', [OperationsController::class, 'createInvoice'])->name('fat-clients.billing.create');
    Route::post('/fat-clients/billing', [OperationsController::class, 'storeInvoice'])->name('fat-clients.billing.store');

    // Inventory
    Route::group(['prefix' => 'inventory', 'as' => 'inventory.'], function () {
        Route::get('/categories', [CategoryController::class, 'index'])->name('categories');
        Route::post('/categories', [CategoryController::class, 'store'])->name('categories.store');
        Route::put('/categories/{category}', [CategoryController::class, 'update'])->name('categories.update');
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');
        Route::patch('/categories/{category}/toggle', [CategoryController::class, 'toggleStatus'])->name('categories.toggle');

        Route::get('/products', [ProductController::class, 'index'])->name('products');
        Route::post('/products', [ProductController::class, 'store'])->name('products.store');
        Route::put('/products/{product}', [ProductController::class, 'update'])->name('products.update');
        Route::delete('/products/{product}', [ProductController::class, 'destroy'])->name('products.destroy');
    });

    // Users
    Route::get('/users', [UserController::class, 'index'])->name('users');
    Route::post('/users', [UserController::class, 'store'])->name('users.store');
    Route::put('/users/pickup-hours', [UserController::class, 'updatePickupHours'])->name('users.pickup-hours.update');
    Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
    Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword'])->name('users.reset-password');

    Route::get('/dashboard/promotions', [OperationsController::class, 'promotions'])->name('dashboard.promotions');
    Route::post('/dashboard/promotions', [OperationsController::class, 'storePromotion'])->name('dashboard.promotions.store');
    Route::put('/dashboard/promotions/{promotion}', [OperationsController::class, 'updatePromotion'])->name('dashboard.promotions.update');
    Route::delete('/dashboard/promotions/{promotion}', [OperationsController::class, 'destroyPromotion'])->name('dashboard.promotions.destroy');
});
