<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClienteRequest;
use App\Http\Requests\UpdateClienteRequest;
use App\Http\Resources\ClienteResource;
use App\Models\Cliente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ClienteApiController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Cliente::query();

        if ($request->filled('buscar')) {
            $query->where(function ($q) use ($request) {
                $q->where('nombre_cliente', 'like', '%'.$request->buscar.'%')
                    ->orWhere('telefono_cliente', 'like', '%'.$request->buscar.'%');
            });
        }

        if ($request->filled('con_deuda')) {
            if ($request->con_deuda === '1') {
                $query->where('saldo_deuda', '>', 0);
            } else {
                $query->where('saldo_deuda', '<=', 0);
            }
        }

        $clientes = $query->orderBy('nombre_cliente')->paginate(15);

        return ClienteResource::collection($clientes);
    }

    public function store(StoreClienteRequest $request): JsonResponse
    {
        $cliente = Cliente::create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Cliente registrado correctamente.',
            'data' => new ClienteResource($cliente)
        ], 201);
    }

    public function show(Cliente $cliente): JsonResponse
    {
        $cliente->load([
            'deudas' => fn ($q) => $q->with('venta')->latest('fecha'), 
            'ventas' => fn ($q) => $q->latest('fecha')->limit(10)
        ]);

        return response()->json([
            'success' => true,
            'data' => new ClienteResource($cliente)
        ]);
    }

    public function update(UpdateClienteRequest $request, Cliente $cliente): JsonResponse
    {
        $cliente->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Cliente actualizado correctamente.',
            'data' => new ClienteResource($cliente)
        ]);
    }

    public function destroy(Cliente $cliente): JsonResponse
    {
        if ($cliente->saldo_deuda > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar un cliente con deuda pendiente.'
            ], 422);
        }

        if ($cliente->ventas()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar un cliente con ventas registradas.'
            ], 422);
        }

        $cliente->delete();

        return response()->json([
            'success' => true,
            'message' => 'Cliente eliminado correctamente.'
        ]);
    }
}
