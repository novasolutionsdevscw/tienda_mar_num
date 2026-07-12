<?php

namespace App\Http\Controllers;

use App\Models\ControlDiario;
use App\Models\Deuda;
use App\Models\Pago;
use App\Models\Venta;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ReporteController extends Controller
{
    public function diario(Request $request): View
    {
        $fecha = $request->filled('fecha')
            ? Carbon::parse($request->fecha)
            : Carbon::today();

        $ventas = Venta::with(['cliente', 'usuario', 'detalles.producto'])
            ->whereDate('fecha', $fecha)
            ->orderByDesc('fecha')
            ->get();

        $totalVentas = $ventas->sum('total');
        $ventasContado = $ventas->where('tipo_pago', 'CONTADO')->sum('total');
        $ventasFiado = $ventas->where('tipo_pago', 'FIADO')->sum('total');

        $control = ControlDiario::whereDate('fecha', $fecha)->first();

        $pagosRecibidos = Pago::whereDate('fecha', $fecha)->sum('monto');

        $deudasGeneradas = Deuda::whereDate('fecha', $fecha)->sum('monto');

        return view('reportes.diario', compact(
            'fecha',
            'ventas',
            'totalVentas',
            'ventasContado',
            'ventasFiado',
            'control',
            'pagosRecibidos',
            'deudasGeneradas'
        ));
    }

    public function semanal(Request $request): View
    {
        $fechaReferencia = $request->filled('fecha')
            ? Carbon::parse($request->fecha)
            : Carbon::today();

        $inicio = $fechaReferencia->copy()->startOfWeek(Carbon::MONDAY);
        $fin = $fechaReferencia->copy()->endOfWeek(Carbon::SUNDAY);

        $ventas = Venta::whereBetween('fecha', [$inicio->startOfDay(), $fin->endOfDay()])->get();
        $totalVentas = $ventas->sum('total');
        $ventasContado = $ventas->where('tipo_pago', 'CONTADO')->sum('total');
        $ventasFiado = $ventas->where('tipo_pago', 'FIADO')->sum('total');

        $controlDiario = ControlDiario::whereBetween('fecha', [$inicio->toDateString(), $fin->toDateString()])
            ->orderBy('fecha')
            ->get();

        $totalIngresos = $controlDiario->sum('ingresos');
        $totalGastos = $controlDiario->sum('gastos');
        $totalGanancias = $controlDiario->sum('ganancias');

        $pagosRecibidos = Pago::whereBetween('fecha', [$inicio->startOfDay(), $fin->endOfDay()])->sum('monto');

        $ventasPorDia = Venta::selectRaw('DATE(fecha) as dia, SUM(total) as total, COUNT(*) as cantidad')
            ->whereBetween('fecha', [$inicio->startOfDay(), $fin->endOfDay()])
            ->groupBy('dia')
            ->orderBy('dia')
            ->get();

        return view('reportes.semanal', compact(
            'inicio',
            'fin',
            'fechaReferencia',
            'totalVentas',
            'ventasContado',
            'ventasFiado',
            'controlDiario',
            'totalIngresos',
            'totalGastos',
            'totalGanancias',
            'pagosRecibidos',
            'ventasPorDia'
        ));
    }
}
