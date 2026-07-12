<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVentaRequest;
use App\Models\DetalleVenta;
use App\Models\Producto;
use App\Models\Venta;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class VentaController extends Controller
{
    public function index(Request $request): View
    {
        $query = Venta::with(['cliente', 'usuario', 'detalles.producto']);

        if ($request->filled('fecha')) {
            $query->whereDate('fecha', $request->fecha);
        }

        if ($request->filled('tipo_pago')) {
            $query->where('tipo_pago', $request->tipo_pago);
        }

        $ventas = $query->latest('fecha')->paginate(15)->withQueryString();

        return view('ventas.index', compact('ventas'));
    }

    public function create(): View
    {
        $productos = Producto::where('activo', true)->orderBy('nombre')->get();

        return view('ventas.create', compact('productos'));
    }

    public function store(StoreVentaRequest $request): RedirectResponse
    {
        $productosIds = collect($request->productos)->pluck('producto_id')->unique();
        $productos = Producto::whereIn('id', $productosIds)->where('activo', true)->get()->keyBy('id');

        if ($productos->count() !== $productosIds->count()) {
            return back()->withInput()->with('error', 'Uno o más productos no están disponibles.');
        }

        DB::transaction(function () use ($request, $productos) {
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
        });

        return redirect()->route('ventas.index')
            ->with('success', 'Venta registrada correctamente.');
    }
}
