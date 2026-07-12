<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductoRequest;
use App\Http\Requests\UpdateProductoRequest;
use App\Models\Producto;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ProductoController extends Controller
{
    public function index(Request $request): View
    {
        $query = Producto::query();

        if ($request->filled('buscar')) {
            $query->where('nombre', 'like', '%'.$request->buscar.'%');
        }

        if ($request->filled('activo')) {
            $query->where('activo', $request->activo === '1');
        }

        $productos = $query->orderBy('nombre')->paginate(15)->withQueryString();

        return view('productos.index', compact('productos'));
    }

    public function create(): View
    {
        return view('productos.create');
    }

    public function store(StoreProductoRequest $request): RedirectResponse
    {
        Producto::create([
            'nombre' => $request->nombre,
            'precio' => $request->precio,
            'activo' => $request->boolean('activo', true),
        ]);

        return redirect()->route('productos.index')
            ->with('success', 'Producto creado correctamente.');
    }

    public function edit(Producto $producto): View
    {
        return view('productos.edit', compact('producto'));
    }

    public function update(UpdateProductoRequest $request, Producto $producto): RedirectResponse
    {
        $producto->update([
            'nombre' => $request->nombre,
            'precio' => $request->precio,
            'activo' => $request->boolean('activo'),
        ]);

        return redirect()->route('productos.index')
            ->with('success', 'Producto actualizado correctamente.');
    }

    public function destroy(Producto $producto): RedirectResponse
    {
        if ($producto->detalleVentas()->exists()) {
            $producto->update(['activo' => false]);

            return redirect()->route('productos.index')
                ->with('warning', 'El producto tiene ventas asociadas y fue desactivado.');
        }

        $producto->delete();

        return redirect()->route('productos.index')
            ->with('success', 'Producto eliminado correctamente.');
    }
}
