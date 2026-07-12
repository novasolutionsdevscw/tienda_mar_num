<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreControlDiarioRequest;
use App\Http\Requests\UpdateControlDiarioRequest;
use App\Models\ControlDiario;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ControlDiarioController extends Controller
{
    public function index(Request $request): View
    {
        $query = ControlDiario::query();

        if ($request->filled('desde')) {
            $query->whereDate('fecha', '>=', $request->desde);
        }

        if ($request->filled('hasta')) {
            $query->whereDate('fecha', '<=', $request->hasta);
        }

        $registros = $query->orderByDesc('fecha')->paginate(15)->withQueryString();
        $totalIngresos = (clone $query)->sum('ingresos');
        $totalGastos = (clone $query)->sum('gastos');

        return view('control-diario.index', compact('registros', 'totalIngresos', 'totalGastos'));
    }

    public function create(): View
    {
        return view('control-diario.create');
    }

    public function store(StoreControlDiarioRequest $request): RedirectResponse
    {
        ControlDiario::create($request->validated());

        return redirect()->route('control-diario.index')
            ->with('success', 'Registro de ingresos creado correctamente.');
    }

    public function edit(ControlDiario $controlDiario): View
    {
        return view('control-diario.edit', compact('controlDiario'));
    }

    public function update(UpdateControlDiarioRequest $request, ControlDiario $controlDiario): RedirectResponse
    {
        $controlDiario->update($request->validated());

        return redirect()->route('control-diario.index')
            ->with('success', 'Registro actualizado correctamente.');
    }

    public function destroy(ControlDiario $controlDiario): RedirectResponse
    {
        $controlDiario->delete();

        return redirect()->route('control-diario.index')
            ->with('success', 'Registro eliminado correctamente.');
    }
}
