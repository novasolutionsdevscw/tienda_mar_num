<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreControlDiarioRequest;
use App\Http\Requests\UpdateControlDiarioRequest;
use App\Http\Resources\ControlDiarioResource;
use App\Models\ControlDiario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ControlDiarioApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ControlDiario::query();

        if ($request->filled('desde')) {
            $query->whereDate('fecha', '>=', $request->desde);
        }

        if ($request->filled('hasta')) {
            $query->whereDate('fecha', '<=', $request->hasta);
        }

        $registros = $query->orderByDesc('fecha')->paginate(15);
        $totalIngresos = (clone $query)->sum('ingresos');
        $totalGastos = (clone $query)->sum('gastos');

        return response()->json([
            'success' => true,
            'total_ingresos' => $totalIngresos,
            'total_gastos' => $totalGastos,
            'data' => ControlDiarioResource::collection($registros)->response()->getData(true)
        ]);
    }

    public function store(StoreControlDiarioRequest $request): JsonResponse
    {
        $registro = ControlDiario::create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Registro de ingresos y gastos creado correctamente.',
            'data' => new ControlDiarioResource($registro)
        ], 201);
    }

    public function show(ControlDiario $controlDiario): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => new ControlDiarioResource($controlDiario)
        ]);
    }

    public function update(UpdateControlDiarioRequest $request, ControlDiario $controlDiario): JsonResponse
    {
        $controlDiario->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Registro actualizado correctamente.',
            'data' => new ControlDiarioResource($controlDiario)
        ]);
    }

    public function destroy(ControlDiario $controlDiario): JsonResponse
    {
        $controlDiario->delete();

        return response()->json([
            'success' => true,
            'message' => 'Registro eliminado correctamente.'
        ]);
    }
}
