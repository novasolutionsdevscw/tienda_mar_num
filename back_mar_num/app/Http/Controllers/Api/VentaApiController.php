<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PagarVentaRequest;
use App\Http\Requests\StoreDetalleVentaRequest;
use App\Http\Requests\StoreVentaRequest;
use App\Http\Requests\UpdateDetalleVentaRequest;
use App\Http\Resources\VentaResource;
use App\Models\Cliente;
use App\Models\DetalleVenta;
use App\Models\Deuda;
use App\Models\Mesa;
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
        $query = Venta::with([
            'cliente',
            'usuario',
            'mesa',
            'detalles.producto',
            'deuda',
        ]);

        if ($request->filled('fecha')) {
            $query->whereDate('fecha', $request->fecha);
        }

        if ($request->filled('tipo_pago')) {
            $query->where('tipo_pago', $request->tipo_pago);
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        $ventas = $query
            ->latest('fecha')
            ->paginate(15);

        return VentaResource::collection($ventas);
    }

    public function store(StoreVentaRequest $request): JsonResponse
    {
        $venta = DB::transaction(function () use ($request) {

            if ($request->filled('mesa_id')) {

                $mesa = Mesa::lockForUpdate()
                    ->findOrFail($request->mesa_id);

                $ventaAbierta = Venta::where(
                    'mesa_id',
                    $mesa->id
                )
                    ->where('estado', 'ABIERTA')
                    ->exists();

                if ($ventaAbierta) {
                    abort(
                        422,
                        'La mesa ya tiene una venta abierta.'
                    );
                }
            }

            return Venta::create([
                'usuario_id' => auth()->id(),
                'cliente_id' => null,
                'mesa_id' => $request->mesa_id,
                'estado' => 'ABIERTA',
                'tipo_pago' => null,
                'total' => 0,
            ]);
        });

        $venta->load([
            'cliente',
            'usuario',
            'mesa',
            'detalles.producto',
            'deuda',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Venta abierta correctamente.',
            'data' => new VentaResource($venta),
        ], 201);
    }

    public function show(Venta $venta): JsonResponse
    {
        $venta->load([
            'cliente',
            'usuario',
            'mesa',
            'detalles.producto',
            'deuda',
        ]);

        return response()->json([
            'success' => true,
            'data' => new VentaResource($venta),
        ]);
    }

    public function agregarDetalle(
        StoreDetalleVentaRequest $request,
        Venta $venta
    ): JsonResponse {
        if ($venta->estado !== 'ABIERTA') {
            return response()->json([
                'success' => false,
                'message' => 'La venta no está abierta.',
            ], 422);
        }

        $producto = Producto::where('activo', true)
            ->find($request->producto_id);

        if (!$producto) {
            return response()->json([
                'success' => false,
                'message' => 'El producto no está disponible.',
            ], 422);
        }

        DB::transaction(function () use (
            $request,
            $venta,
            $producto
        ) {
            $detalle = DetalleVenta::where(
                'venta_id',
                $venta->id
            )
                ->where(
                    'producto_id',
                    $producto->id
                )
                ->first();

            if ($detalle) {
                $detalle->cantidad += $request->cantidad;
                $detalle->subtotal =
                    $detalle->cantidad *
                    $detalle->precio_unitario;

                $detalle->save();
            } else {
                DetalleVenta::create([
                    'venta_id' => $venta->id,
                    'producto_id' => $producto->id,
                    'cantidad' => $request->cantidad,
                    'precio_unitario' => $producto->precio,
                    'subtotal' =>
                        $producto->precio *
                        $request->cantidad,
                ]);
            }

            $this->actualizarTotalVenta($venta);
        });

        return $this->respuestaVenta(
            $venta,
            'Producto agregado correctamente.'
        );
    }

    public function actualizarDetalle(
        UpdateDetalleVentaRequest $request,
        Venta $venta,
        DetalleVenta $detalle
    ): JsonResponse {
        if ($venta->estado !== 'ABIERTA') {
            return response()->json([
                'success' => false,
                'message' => 'La venta no está abierta.',
            ], 422);
        }

        if ($detalle->venta_id !== $venta->id) {
            return response()->json([
                'success' => false,
                'message' =>
                    'El detalle no pertenece a esta venta.',
            ], 422);
        }

        DB::transaction(function () use (
            $request,
            $venta,
            $detalle
        ) {
            $detalle->cantidad = $request->cantidad;

            $detalle->subtotal =
                $detalle->cantidad *
                $detalle->precio_unitario;

            $detalle->save();

            $this->actualizarTotalVenta($venta);
        });

        return $this->respuestaVenta(
            $venta,
            'Cantidad actualizada correctamente.'
        );
    }

    public function eliminarDetalle(
        Venta $venta,
        DetalleVenta $detalle
    ): JsonResponse {
        if ($venta->estado !== 'ABIERTA') {
            return response()->json([
                'success' => false,
                'message' => 'La venta no está abierta.',
            ], 422);
        }

        if ($detalle->venta_id !== $venta->id) {
            return response()->json([
                'success' => false,
                'message' =>
                    'El detalle no pertenece a esta venta.',
            ], 422);
        }

        DB::transaction(function () use (
            $venta,
            $detalle
        ) {
            $detalle->delete();

            $this->actualizarTotalVenta($venta);

            if (!$venta->detalles()->exists()) {
                $venta->update([
                    'estado' => 'ANULADA',
                    'total' => 0,
                ]);
            }
        });

        return $this->respuestaVenta(
            $venta,
            'Producto eliminado correctamente.'
        );
    }

    public function pagar(
        PagarVentaRequest $request,
        Venta $venta
    ): JsonResponse {
        if ($venta->estado !== 'ABIERTA') {
            return response()->json([
                'success' => false,
                'message' => 'La venta no está abierta.',
            ], 422);
        }

        if (!$venta->detalles()->exists()) {
            return response()->json([
                'success' => false,
                'message' =>
                    'No se puede cobrar una venta sin productos.',
            ], 422);
        }

        $venta = DB::transaction(function () use (
            $request,
            $venta
        ) {
            $venta->update([
                'cliente_id' => $request->cliente_id,
                'tipo_pago' => $request->tipo_pago,
                'estado' =>
                    $request->tipo_pago === 'FIADO'
                        ? 'FIADA'
                        : 'PAGADA',
            ]);

            if ($request->tipo_pago === 'FIADO') {
                Deuda::create([
                    'cliente_id' => $request->cliente_id,
                    'venta_id' => $venta->id,
                    'monto' => $venta->total,
                    'saldo_pendiente' => $venta->total,
                    'estado' => 'PENDIENTE',
                ]);

                Cliente::where(
                    'id_cliente',
                    $request->cliente_id
                )->increment(
                    'saldo_deuda',
                    $venta->total
                );
            }

            return $venta;
        });

        return $this->respuestaVenta(
            $venta,
            'Venta procesada correctamente.'
        );
    }

    public function anular(Venta $venta): JsonResponse
    {
        if ($venta->estado !== 'ABIERTA') {
            return response()->json([
                'success' => false,
                'message' => 'La venta no está abierta.',
            ], 422);
        }

        $venta->update([
            'estado' => 'ANULADA',
        ]);

        return $this->respuestaVenta(
            $venta,
            'Venta anulada correctamente.'
        );
    }

    private function actualizarTotalVenta(Venta $venta): void
    {
        $total = $venta->detalles()
            ->sum('subtotal');

        $venta->update([
            'total' => $total,
        ]);
    }

    private function respuestaVenta(
        Venta $venta,
        string $mensaje
    ): JsonResponse {
        $venta->refresh();

        $venta->load([
            'cliente',
            'usuario',
            'mesa',
            'detalles.producto',
            'deuda',
        ]);

        return response()->json([
            'success' => true,
            'message' => $mensaje,
            'data' => new VentaResource($venta),
        ]);
    }
}