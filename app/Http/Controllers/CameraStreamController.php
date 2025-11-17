<?php

namespace App\Http\Controllers;

use App\Models\MonitoringSession;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CameraStreamController extends Controller
{
    public function stream(MonitoringSession $session)
    {
        $this->authorize('view', $session);

        return new StreamedResponse(function () use ($session) {
            // Headers para streaming de vídeo
            header('Content-Type: multipart/x-mixed-replace; boundary=frame');

            // Simular stream (em produção, isso seria do Python/OpenCV)
            while (true) {
                // Aqui você integraria com o microserviço Python
                // Por enquanto, apenas mantém a conexão aberta
                echo "--frame\r\n";
                echo "Content-Type: image/jpeg\r\n\r\n";

                // Em produção, pegaria frame do Python aqui
                // echo $frameData;

                echo "\r\n";

                if (connection_aborted()) {
                    break;
                }

                usleep(33333); // ~30 FPS
            }
        }, 200, [
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }
}
