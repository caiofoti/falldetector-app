<?php

namespace App\Http\Controllers;

use App\Models\MonitoringSession;
use Illuminate\Http\Request;

class CameraStreamController extends Controller
{
    public function stream(MonitoringSession $session)
    {
        $this->authorize('view', $session);

        // Aqui você processaria o feed com Python/OpenCV e enviaria frames
        // Por enquanto, redirecione para o URL direto da câmera
        return response()->stream(function () use ($session) {
            // Implementar lógica de streaming real aqui
            // Ex: ler frames do Python e enviar
        }, 200, [
            'Content-Type' => 'multipart/x-mixed-replace; boundary=frame',
            'Cache-Control' => 'no-cache',
        ]);
    }
}
