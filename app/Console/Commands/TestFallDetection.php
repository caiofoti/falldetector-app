<?php

namespace App\Console\Commands;

use App\Events\FallDetected;
use App\Models\FallAlert;
use App\Models\MonitoringSession;
use App\Models\Notification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TestFallDetection extends Command
{
    protected $signature = 'test:fall-detection {session_id=1} {--confidence=95.5}';
    protected $description = 'Simula detecção de queda para testar a pipeline completa';

    public function handle()
    {
        $this->info('🧪 INICIANDO TESTE DE DETECÇÃO DE QUEDA');
        $this->newLine();

        $sessionId = $this->argument('session_id');
        $confidence = floatval($this->option('confidence'));

        $this->line("📋 Parâmetros:");
        $this->line("   Session ID: {$sessionId}");
        $this->line("   Confidence: {$confidence}%");
        $this->newLine();

        // 1. Verificar se a sessão existe
        $this->info('1️⃣ Verificando MonitoringSession...');
        $session = MonitoringSession::find($sessionId);

        if (!$session) {
            $this->error("   ❌ Session {$sessionId} não encontrada!");
            $this->warn("   💡 Crie uma sessão primeiro ou use outro session_id");
            return 1;
        }

        $this->line("   ✅ Session encontrada: {$session->name}");
        $this->line("   👤 Usuário: {$session->user->name}");
        $this->newLine();

        // 2. Criar snapshot fake (base64 1x1 pixel)
        $this->info('2️⃣ Salvando snapshot...');
        $snapshotPath = $this->createFakeSnapshot($sessionId);
        $this->line("   ✅ Snapshot: {$snapshotPath}");
        $this->newLine();

        // 3. Criar FallAlert
        $this->info('3️⃣ Criando FallAlert...');
        $alert = FallAlert::create([
            'monitoring_session_id' => $session->id,
            'detected_at' => now(),
            'confidence_score' => $confidence,
            'snapshot_path' => $snapshotPath,
            'status' => 'pending',
            'detection_metadata' => [
                'source' => 'test_command',
                'algorithm' => 'manual_test',
                'timestamp' => now()->toIso8601String(),
                'test' => true
            ]
        ]);

        $this->line("   ✅ FallAlert ID: {$alert->id}");
        $this->line("   📊 Colunas preenchidas:");
        $this->line("      - monitoring_session_id: {$alert->monitoring_session_id}");
        $this->line("      - detected_at: {$alert->detected_at}");
        $this->line("      - confidence_score: {$alert->confidence_score}%");
        $this->line("      - snapshot_path: {$alert->snapshot_path}");
        $this->line("      - status: {$alert->status}");
        $this->line("      - detection_metadata: " . json_encode($alert->detection_metadata));
        $this->newLine();

        // 4. Atualizar session
        $this->info('4️⃣ Atualizando MonitoringSession...');
        $session->update(['last_activity_at' => now()]);
        $this->line("   ✅ last_activity_at: {$session->last_activity_at}");
        $this->newLine();

        // 5. Criar Notification
        $this->info('5️⃣ Criando Notification...');
        $notification = Notification::create([
            'user_id' => $session->user_id,
            'fall_alert_id' => $alert->id,
            'type' => 'fall_detected',
            'title' => 'Queda Detectada! (TESTE)',
            'message' => "Queda detectada na sessão '{$session->name}' com {$confidence}% de confiança",
            'data' => [
                'session_id' => $session->id,
                'session_name' => $session->name,
                'confidence_score' => $confidence,
                'snapshot_path' => $snapshotPath,
                'test' => true
            ],
        ]);

        $this->line("   ✅ Notification ID: {$notification->id}");
        $this->line("   📧 Para usuário: {$session->user->name} ({$session->user->email})");
        $this->line("   📱 Telefone: {$session->user->phone}");
        $this->newLine();

        // 6. Broadcast event
        $this->info('6️⃣ Broadcasting evento via WebSocket...');
        broadcast(new FallDetected($alert));
        $this->line("   ✅ Evento FallDetected enviado");
        $this->line("   📡 Canal: private-monitoring-session.{$session->id}");
        $this->line("   🎯 Event: .fall.detected");
        $this->newLine();

        // 7. Enviar webhook para n8n
        $this->info('7️⃣ Enviando webhook para n8n...');
        $webhookResult = $this->sendN8nWebhook($alert, $session);
        if ($webhookResult['success']) {
            $this->line("   ✅ Webhook enviado com sucesso!");
            $this->line("   🔗 URL: {$webhookResult['url']}");
            $this->line("   📊 Status HTTP: {$webhookResult['status']}");
        } else {
            $this->warn("   ⚠️ Falha ao enviar webhook");
            $this->line("   🔗 URL: {$webhookResult['url']}");
            $this->line("   ❌ Erro: {$webhookResult['error']}");
        }
        $this->newLine();

        // 8. Log
        Log::info('Test fall detection completed', [
            'alert_id' => $alert->id,
            'session_id' => $session->id,
            'test' => true,
            'webhook_sent' => $webhookResult['success']
        ]);

        // Resumo
        $this->info('✅ TESTE CONCLUÍDO COM SUCESSO!');
        $this->newLine();

        $this->table(
            ['Registro', 'ID', 'Status'],
            [
                ['FallAlert', $alert->id, '✅ Criado'],
                ['Notification', $notification->id, '✅ Criada'],
                ['MonitoringSession', $session->id, '✅ Atualizada'],
                ['Broadcast', 'N/A', '✅ Enviado'],
                ['Webhook n8n', 'N/A', $webhookResult['success'] ? '✅ Enviado' : '⚠️ Falhou'],
            ]
        );

        $this->newLine();
        $this->warn('🎯 Próximo passo:');
        $this->line('   Abra http://localhost:8000/monitoring/' . $session->id);
        $this->line('   O alerta deve aparecer AUTOMATICAMENTE na tela!');
        $this->newLine();

        return 0;
    }

    private function createFakeSnapshot(int $sessionId): string
    {
        // Base64 de 1x1 pixel vermelho JPEG
        $base64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';
        $imageData = base64_decode($base64);

        $filename = 'fall_test_' . $sessionId . '_' . time() . '.jpg';
        $path = 'snapshots/test/' . date('Y/m');
        $fullPath = storage_path('app/public/' . $path);

        if (!file_exists($fullPath)) {
            mkdir($fullPath, 0755, true);
        }

        $filePath = $fullPath . '/' . $filename;
        file_put_contents($filePath, $imageData);

        return '/storage/' . $path . '/' . $filename;
    }

    private function sendN8nWebhook(FallAlert $alert, MonitoringSession $session): array
    {
        try {
            $user = $session->user;
            $n8nWebhookUrl = env('N8N_WEBHOOK_URL');
            $receiver = env('N8N_RECEIVER_EMAIL', 'victor.alves@ufcspa.edu.br');

            if (!$n8nWebhookUrl) {
                return [
                    'success' => false,
                    'url' => 'N/A',
                    'error' => 'N8N_WEBHOOK_URL não configurado no .env'
                ];
            }

            $payload = [
                'receiver' => $receiver,
                'usuario' => [
                    'nome' => $user->name,
                    'email' => $user->email,
                    'telefone' => $user->phone ?? 'N/A',
                ],
                'queda' => [
                    'data_hora' => $alert->detected_at->format('d/m/Y H:i:s'),
                    'confianca' => number_format($alert->confidence_score, 1) . '%',
                    'local' => $session->name,
                ],
                'teste' => true, // Indica que é um teste
            ];

            $response = Http::timeout(5)->post($n8nWebhookUrl, $payload);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'url' => $n8nWebhookUrl,
                    'status' => $response->status()
                ];
            } else {
                return [
                    'success' => false,
                    'url' => $n8nWebhookUrl,
                    'error' => "HTTP {$response->status()}"
                ];
            }
        } catch (\Exception $e) {
            return [
                'success' => false,
                'url' => $n8nWebhookUrl ?? 'N/A',
                'error' => $e->getMessage()
            ];
        }
    }
}
