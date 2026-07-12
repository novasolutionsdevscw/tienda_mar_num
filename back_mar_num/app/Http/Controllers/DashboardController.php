<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\ControlDiario;
use App\Models\Deuda;
use App\Models\Producto;
use App\Models\Venta;
use Carbon\Carbon;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function index(): View
    {
        $hoy = Carbon::today();

        $ventasHoy = Venta::whereDate('fecha', $hoy)->sum('total');
        $cantidadVentasHoy = Venta::whereDate('fecha', $hoy)->count();
        $deudasPendientes = Deuda::where('estado', 'PENDIENTE')->sum('saldo_pendiente');
        $clientesConDeuda = Cliente::where('saldo_deuda', '>', 0)->count();
        $productosActivos = Producto::where('activo', true)->count();
        $controlHoy = ControlDiario::whereDate('fecha', $hoy)->first();

        $ultimasVentas = Venta::with(['cliente', 'usuario'])
            ->latest('fecha')
            ->limit(5)
            ->get();

        return view('dashboard.index', compact(
            'ventasHoy',
            'cantidadVentasHoy',
            'deudasPendientes',
            'clientesConDeuda',
            'productosActivos',
            'controlHoy',
            'ultimasVentas'
        ));
    }
}
