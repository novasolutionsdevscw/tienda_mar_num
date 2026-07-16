<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mesa;

class MesaController extends Controller
{
    public function index()
    {
        $mesas = Mesa::with([
            'ventas' => function ($query) {

                $query
                    ->where('estado', 'ABIERTA')
                    ->with('detalles');

            }
        ])->get();

        $resultado = $mesas->map(function ($mesa){

            $venta = $mesa->ventas->first();

            if(!$venta){

                return [

                    'id'=>$mesa->id,

                    'numero'=>$mesa->numero,

                    'occupied'=>false,

                    'venta_id'=>null,

                    'items'=>[]

                ];

            }

            $items=[];

            foreach($venta->detalles as $detalle){

                $items[$detalle->producto_id]=$detalle->cantidad;

            }

            return [

                'id'=>$mesa->id,

                'numero'=>$mesa->numero,

                'occupied'=>true,

                'venta_id'=>$venta->id,

                'total'=>$venta->total,

                'items'=>$items

            ];
 
        });

        return response()->json($resultado);

    }
}