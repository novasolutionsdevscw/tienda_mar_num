<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePagoRequest;
use App\Http\Requests\UpdateDeudaRequest;
use App\Http\Resources\DeudaResource;
use App\Http\Resources\PagoResource;
use App\Models\Deuda;
use App\Models\Pago;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DeudaApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Deuda::with(['cliente', 'venta']);

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('cliente_id')) {
            $query->where('cliente_id', $request->cliente_id);
        }

        $deudas = $query->latest('fecha')->paginate(15);
        $totalPendiente = Deuda::where('estado', 'PENDIENTE')->sum('saldo_pendiente');

        return response()->json([
            'success' => true,
            'total_pendiente' => $totalPendiente,
            'data' => DeudaResource::collection($deudas)->response()->getData(true)
        ]);
    }

    public function show(Deuda $deuda): JsonResponse
    {
        $deuda->load(['cliente', 'venta.detalles.producto', 'pagos']);

        return response()->json([
            'success' => true,
            'data' => new DeudaResource($deuda)
        ]);
    }

    public function update(UpdateDeudaRequest $request, Deuda $deuda): JsonResponse
    {
        $deuda->update($request->validated());
        $deuda->refresh()->load(['cliente', 'venta']);

        return response()->json([
            'success' => true,
            'message' => 'Deuda actualizada correctamente.',
            'data' => new DeudaResource($deuda)
        ]);
    }

    public function destroy(Deuda $deuda): JsonResponse
    {
        if ($deuda->pagos()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar una deuda que ya tiene pagos registrados.'
            ], 422);
        }

        $cliente = $deuda->cliente;

        $deuda->delete();

        // Recalcular saldo del cliente
        if ($cliente) {
            $nuevoSaldo = Deuda::where('cliente_id', $cliente->id_cliente)
                ->where('estado', 'PENDIENTE')
                ->sum('saldo_pendiente');
            $cliente->update(['saldo_deuda' => $nuevoSaldo]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Deuda eliminada correctamente.'
        ]);
    }

    public function storePago(StorePagoRequest $request, Deuda $deuda): JsonResponse
    {
        if ($deuda->estado === 'PAGADO') {
            return response()->json([
                'success' => false,
                'message' => 'Esta deuda ya está pagada.'
            ], 422);
        }

        $pago = Pago::create([
            'deuda_id' => $deuda->id,
            'monto'    => $request->monto,
        ]);

        $deuda->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Pago registrado correctamente.',
            'pago'    => new PagoResource($pago),
            'deuda'   => new DeudaResource($deuda)
        ], 201);
    }

    public function destroyPago(Pago $pago): JsonResponse
    {
        $deuda = $pago->deuda;

        if ($deuda && $deuda->estado === 'PAGADO') {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar un pago de una deuda ya marcada como pagada.'
            ], 422);
        }

        $pago->delete();

        // Recargar estado de la deuda
        if ($deuda) {
            $deuda->refresh()->load(['cliente']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Pago eliminado correctamente.',
            'deuda'   => $deuda ? new DeudaResource($deuda) : null
        ]);
    }
}
