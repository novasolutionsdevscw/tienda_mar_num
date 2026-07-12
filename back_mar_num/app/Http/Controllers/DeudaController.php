<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePagoRequest;
use App\Models\Cliente;
use App\Models\Deuda;
use App\Models\Pago;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class DeudaController extends Controller
{
    public function index(Request $request): View
    {
        $query = Deuda::with(['cliente', 'venta']);

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('cliente_id')) {
            $query->where('cliente_id', $request->cliente_id);
        }

        $deudas = $query->latest('fecha')->paginate(15)->withQueryString();
        $clientes = Cliente::where('saldo_deuda', '>', 0)->orderBy('nombre_cliente')->get();
        $totalPendiente = Deuda::where('estado', 'PENDIENTE')->sum('saldo_pendiente');

        return view('deudas.index', compact('deudas', 'clientes', 'totalPendiente'));
    }

    public function show(Deuda $deuda): View
    {
        $deuda->load(['cliente', 'venta.detalles.producto', 'pagos']);

        return view('deudas.show', compact('deuda'));
    }

    public function storePago(StorePagoRequest $request, Deuda $deuda): RedirectResponse
    {
        if ($deuda->estado === 'PAGADO') {
            return back()->with('error', 'Esta deuda ya está pagada.');
        }

        Pago::create([
            'deuda_id' => $deuda->id,
            'monto' => $request->monto,
        ]);

        return back()->with('success', 'Pago registrado correctamente.');
    }
}
