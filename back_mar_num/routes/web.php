<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\ControlDiarioController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeudaController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\VentaController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route('login'));

Route::middleware('guest')->group(function () {
    Route::get('/login', [LoginController::class, 'showLoginForm'])->name('login');
    Route::post('/login', [LoginController::class, 'login']);
});

Route::middleware(['auth', 'active'])->group(function () {
    Route::post('/logout', [LoginController::class, 'logout'])->name('logout');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::resource('productos', ProductoController::class)->except(['show']);
    Route::resource('clientes', ClienteController::class);
    Route::resource('ventas', VentaController::class)->only(['index', 'create', 'store']);
    Route::resource('control-diario', ControlDiarioController::class)->except(['show']);

    Route::get('/deudas', [DeudaController::class, 'index'])->name('deudas.index');
    Route::get('/deudas/{deuda}', [DeudaController::class, 'show'])->name('deudas.show');
    Route::post('/deudas/{deuda}/pagos', [DeudaController::class, 'storePago'])->name('deudas.pagos.store');

    Route::get('/reportes/diario', [ReporteController::class, 'diario'])->name('reportes.diario');
    Route::get('/reportes/semanal', [ReporteController::class, 'semanal'])->name('reportes.semanal');

    Route::middleware('role:ADMIN')->group(function () {
        Route::resource('usuarios', UsuarioController::class)->except(['show']);
    });
});
