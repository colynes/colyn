<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1')
    ->name('api.login');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/products', [ProductController::class, 'index'])
        ->middleware(['abilities:products:read', 'throttle:120,1'])
        ->name('api.products.index');
});
