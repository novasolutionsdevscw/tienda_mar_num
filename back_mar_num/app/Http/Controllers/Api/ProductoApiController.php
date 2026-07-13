<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductoRequest;
use App\Http\Requests\UpdateProductoRequest;
use App\Http\Resources\ProductoResource;
use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductoApiController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Producto::query();

        if ($request->filled('buscar')) {
            $query->where('nombre', 'like', '%' . $request->buscar . '%');
        }

        if ($request->filled('activo')) {
            $query->where('activo', $request->activo === '1');
        }

        $query->orderBy('nombre');

        if ($request->boolean('all')) {
            return ProductoResource::collection($query->get());
        }

        $productos = $query->paginate(15);

        return ProductoResource::collection($productos);
    }

    public function store(StoreProductoRequest $request): JsonResponse
    {
        $producto = Producto::create([
            'nombre' => $request->nombre,
            'precio' => $request->precio,
            'activo' => $request->boolean('activo', true),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Producto creado correctamente.',
            'data' => new ProductoResource($producto)
        ], 201);
    }

    public function show(Producto $producto): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => new ProductoResource($producto)
        ]);
    }

    public function update(UpdateProductoRequest $request, Producto $producto): JsonResponse
    {
        $producto->update([
            'nombre' => $request->nombre,
            'precio' => $request->precio,
            'activo' => $request->boolean('activo'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Producto actualizado correctamente.',
            'data' => new ProductoResource($producto)
        ]);
    }

    public function destroy(Producto $producto): JsonResponse
    {
        if ($producto->detalleVentas()->exists()) {
            $producto->update(['activo' => false]);

            return response()->json([
                'success' => true,
                'warning' => true,
                'message' => 'El producto tiene ventas asociadas y fue desactivado.',
                'data' => new ProductoResource($producto)
            ]);
        }

        $producto->delete();

        return response()->json([
            'success' => true,
            'message' => 'Producto eliminado correctamente.'
        ]);
    }
}
