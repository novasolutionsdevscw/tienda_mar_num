<?php

use App\Http\Controllers\Api\AuthApiController;
use App\Http\Controllers\Api\ClienteApiController;
use App\Http\Controllers\Api\ControlDiarioApiController;
use App\Http\Controllers\Api\DeudaApiController;
use App\Http\Controllers\Api\ProductoApiController;
use App\Http\Controllers\Api\ReporteApiController;
use App\Http\Controllers\Api\UsuarioApiController;
use App\Http\Controllers\Api\VentaApiController;
use App\Http\Controllers\Api\MesaController;
use Illuminate\Support\Facades\Route;

// Rutas Públicas
Route::post('/login', [AuthApiController::class, 'login']);

// Rutas Protegidas (requiere autenticación y cuenta activa)
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::post('/logout', [AuthApiController::class, 'logout']);
    Route::get('/me', [AuthApiController::class, 'me']);

    // Clientes
    Route::apiResource('clientes', ClienteApiController::class);

    // Productos
    Route::apiResource('productos', ProductoApiController::class);

    // Ventas
    Route::get('/ventas/{venta}', [VentaApiController::class, 'show']);
    Route::get('/ventas', [VentaApiController::class, 'index']);
    Route::post('/ventas',[VentaApiController::class, 'store']);

    Route::get(
        '/ventas/{venta}',
        [VentaApiController::class, 'show']
    );

    Route::post(
        '/ventas/{venta}/detalle',
        [VentaApiController::class, 'agregarDetalle']
    );

    Route::put(
        '/ventas/{venta}/detalle/{detalle}',
        [VentaApiController::class, 'actualizarDetalle']
    );

    Route::delete(
        '/ventas/{venta}/detalle/{detalle}',
        [VentaApiController::class, 'eliminarDetalle']
    );

    Route::post(
        '/ventas/{venta}/pagar',
        [VentaApiController::class, 'pagar']
    );

    Route::post(
        '/ventas/{venta}/anular',
        [VentaApiController::class, 'anular']
    );

    // Deudas y Pagos
    Route::get('/deudas', [DeudaApiController::class, 'index']);
    Route::get('/deudas/{deuda}', [DeudaApiController::class, 'show']);
    Route::post('/deudas/{deuda}/pagos', [DeudaApiController::class, 'storePago']);

    // Control Diario
    Route::apiResource('control-diario', ControlDiarioApiController::class);

    // Reportes
    Route::get('/reportes/diario', [ReporteApiController::class, 'diario']);
    Route::get('/reportes/semanal', [ReporteApiController::class, 'semanal']);

    // Rutas exclusivas para Administradores
    Route::middleware('role:ADMIN')->group(function () {
        Route::apiResource('usuarios', UsuarioApiController::class);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/mesas', [MesaController::class, 'index']);
    });
});
