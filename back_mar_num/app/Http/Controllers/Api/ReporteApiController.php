<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ControlDiarioResource;
use App\Http\Resources\VentaResource;
use App\Models\ControlDiario;
use App\Models\Deuda;
use App\Models\Pago;
use App\Models\Venta;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReporteApiController extends Controller
{
    public function diario(Request $request): JsonResponse
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

        return response()->json([
            'success' => true,
            'fecha' => $fecha->toDateString(),
            'total_ventas' => $totalVentas,
            'ventas_contado' => $ventasContado,
            'ventas_fiado' => $ventasFiado,
            'pagos_recibidos' => $pagosRecibidos,
            'deudas_generadas' => $deudasGeneradas,
            'control_diario' => $control ? new ControlDiarioResource($control) : null,
            'ventas' => VentaResource::collection($ventas)
        ]);
    }

    public function semanal(Request $request): JsonResponse
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

        return response()->json([
            'success' => true,
            'rango' => [
                'inicio' => $inicio->toDateString(),
                'fin' => $fin->toDateString(),
            ],
            'total_ventas' => $totalVentas,
            'ventas_contado' => $ventasContado,
            'ventas_fiado' => $ventasFiado,
            'total_ingresos' => $totalIngresos,
            'total_gastos' => $totalGastos,
            'total_ganancias' => $totalGanancias,
            'pagos_recibidos' => $pagosRecibidos,
            'control_diario' => ControlDiarioResource::collection($controlDiario),
            'ventas_por_dia' => $ventasPorDia
        ]);
    }
}
