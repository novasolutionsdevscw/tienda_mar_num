<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePagoRequest;
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
            'monto' => $request->monto,
        ]);

        $deuda->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Pago registrado correctamente.',
            'pago' => new PagoResource($pago),
            'deuda' => new DeudaResource($deuda)
        ], 201);
    }
}
