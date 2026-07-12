<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreClienteRequest;
use App\Http\Requests\UpdateClienteRequest;
use App\Models\Cliente;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ClienteController extends Controller
{
    public function index(Request $request): View
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

        $clientes = $query->orderBy('nombre_cliente')->paginate(15)->withQueryString();

        return view('clientes.index', compact('clientes'));
    }

    public function create(): View
    {
        return view('clientes.create');
    }

    public function store(StoreClienteRequest $request): RedirectResponse
    {
        Cliente::create($request->validated());

        return redirect()->route('clientes.index')
            ->with('success', 'Cliente registrado correctamente.');
    }

    public function show(Cliente $cliente): View
    {
        $cliente->load(['deudas' => fn ($q) => $q->with('venta')->latest('fecha'), 'ventas' => fn ($q) => $q->latest('fecha')->limit(10)]);

        return view('clientes.show', compact('cliente'));
    }

    public function edit(Cliente $cliente): View
    {
        return view('clientes.edit', compact('cliente'));
    }

    public function update(UpdateClienteRequest $request, Cliente $cliente): RedirectResponse
    {
        $cliente->update($request->validated());

        return redirect()->route('clientes.index')
            ->with('success', 'Cliente actualizado correctamente.');
    }

    public function destroy(Cliente $cliente): RedirectResponse
    {
        if ($cliente->saldo_deuda > 0) {
            return back()->with('error', 'No se puede eliminar un cliente con deuda pendiente.');
        }

        if ($cliente->ventas()->exists()) {
            return back()->with('error', 'No se puede eliminar un cliente con ventas registradas.');
        }

        $cliente->delete();

        return redirect()->route('clientes.index')
            ->with('success', 'Cliente eliminado correctamente.');
    }
}
