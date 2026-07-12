<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVentaRequest;
use App\Http\Resources\VentaResource;
use App\Models\DetalleVenta;
use App\Models\Producto;
use App\Models\Venta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class VentaApiController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Venta::with(['cliente', 'usuario', 'detalles.producto']);

        if ($request->filled('fecha')) {
            $query->whereDate('fecha', $request->fecha);
        }

        if ($request->filled('tipo_pago')) {
            $query->where('tipo_pago', $request->tipo_pago);
        }

        $ventas = $query->latest('fecha')->paginate(15);

        return VentaResource::collection($ventas);
    }

    public function store(StoreVentaRequest $request): JsonResponse
    {
        $productosIds = collect($request->productos)->pluck('producto_id')->unique();
        $productos = Producto::whereIn('id', $productosIds)->where('activo', true)->get()->keyBy('id');

        if ($productos->count() !== $productosIds->count()) {
            return response()->json([
                'success' => false,
                'message' => 'Uno o más productos no están disponibles.'
            ], 422);
        }

        $venta = DB::transaction(function () use ($request, $productos) {
            $total = 0;
            $detalles = [];

            foreach ($request->productos as $item) {
                $producto = $productos[$item['producto_id']];
                $subtotal = $producto->precio * $item['cantidad'];
                $total += $subtotal;

                $detalles[] = [
                    'producto_id' => $producto->id,
                    'cantidad' => $item['cantidad'],
                    'precio_unitario' => $producto->precio,
                    'subtotal' => $subtotal,
                ];
            }

            $venta = Venta::create([
                'usuario_id' => auth()->id(),
                'cliente_id' => $request->cliente_id,
                'tipo_pago' => $request->tipo_pago,
                'total' => $total,
            ]);

            foreach ($detalles as $detalle) {
                $detalle['venta_id'] = $venta->id;
                DetalleVenta::create($detalle);
            }

            return $venta;
        });

        $venta->load(['cliente', 'usuario', 'detalles.producto', 'deuda']);

        return response()->json([
            'success' => true,
            'message' => 'Venta registrada correctamente.',
            'data' => new VentaResource($venta)
        ], 201);
    }

    public function show(Venta $venta): JsonResponse
    {
        $venta->load(['cliente', 'usuario', 'detalles.producto', 'deuda']);

        return response()->json([
            'success' => true,
            'data' => new VentaResource($venta)
        ]);
    }
}
