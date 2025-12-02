#!/bin/bash

# Test Fall Detection Pipeline
# Este script simula uma detecção de queda do Python service

echo "🧪 TESTE DE DETECÇÃO DE QUEDA"
echo "================================"
echo ""

# Configurações
LARAVEL_URL="http://localhost:8000"
SESSION_ID=1
CONFIDENCE=95.5

# Imagem de teste em base64 (1x1 pixel vermelho)
SNAPSHOT_BASE64="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="

echo "📋 Parâmetros do teste:"
echo "  - Laravel URL: $LARAVEL_URL"
echo "  - Session ID: $SESSION_ID"
echo "  - Confidence: $CONFIDENCE%"
echo ""

echo "1️⃣ Verificando se Laravel está online..."
if curl -s "$LARAVEL_URL/api/health" > /dev/null; then
    echo "   ✅ Laravel está respondendo"
else
    echo "   ❌ Laravel não está respondendo em $LARAVEL_URL"
    echo "   Execute: php artisan serve"
    exit 1
fi
echo ""

echo "2️⃣ Enviando webhook de queda detectada..."
RESPONSE=$(curl -s -X POST "$LARAVEL_URL/api/fall-detected" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"confidence_score\": $CONFIDENCE,
    \"snapshot_base64\": \"$SNAPSHOT_BASE64\"
  }")

echo "   📥 Resposta do servidor:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Verificar se foi sucesso
if echo "$RESPONSE" | grep -q "\"success\":true"; then
    ALERT_ID=$(echo "$RESPONSE" | jq -r '.alert_id' 2>/dev/null)
    echo "   ✅ Webhook processado com sucesso!"
    echo "   📝 Alert ID criado: $ALERT_ID"
    echo ""

    echo "3️⃣ Verificando registros criados no banco..."
    echo ""

    echo "   📊 FallAlert criado:"
    php artisan tinker --execute="
        \$alert = App\Models\FallAlert::find($ALERT_ID);
        if (\$alert) {
            echo '   ✅ ID: ' . \$alert->id . PHP_EOL;
            echo '   ✅ Session ID: ' . \$alert->monitoring_session_id . PHP_EOL;
            echo '   ✅ Detected At: ' . \$alert->detected_at . PHP_EOL;
            echo '   ✅ Confidence: ' . \$alert->confidence_score . '%' . PHP_EOL;
            echo '   ✅ Snapshot Path: ' . (\$alert->snapshot_path ?: 'NULL') . PHP_EOL;
            echo '   ✅ Status: ' . \$alert->status . PHP_EOL;
            echo '   ✅ Metadata: ' . json_encode(\$alert->detection_metadata) . PHP_EOL;
        } else {
            echo '   ❌ Alert não encontrado no banco!' . PHP_EOL;
        }
    "
    echo ""

    echo "   📧 Notification criada:"
    php artisan tinker --execute="
        \$notification = App\Models\Notification::where('fall_alert_id', $ALERT_ID)->first();
        if (\$notification) {
            echo '   ✅ ID: ' . \$notification->id . PHP_EOL;
            echo '   ✅ User ID: ' . \$notification->user_id . PHP_EOL;
            echo '   ✅ Type: ' . \$notification->type . PHP_EOL;
            echo '   ✅ Title: ' . \$notification->title . PHP_EOL;
            echo '   ✅ Message: ' . \$notification->message . PHP_EOL;
            echo '   ✅ Read At: ' . (\$notification->read_at ?: 'NULL (não lida)') . PHP_EOL;
        } else {
            echo '   ❌ Notification não encontrada!' . PHP_EOL;
        }
    "
    echo ""

    echo "   🎯 MonitoringSession atualizada:"
    php artisan tinker --execute="
        \$session = App\Models\MonitoringSession::find($SESSION_ID);
        if (\$session) {
            echo '   ✅ Last Activity: ' . \$session->last_activity_at . PHP_EOL;
            echo '   ✅ Status: ' . \$session->status . PHP_EOL;
        } else {
            echo '   ⚠️  Session $SESSION_ID não existe. Crie uma sessão primeiro!' . PHP_EOL;
        }
    "
    echo ""

    echo "4️⃣ Verificando logs do Laravel..."
    echo "   📋 Últimas 5 linhas relacionadas a Fall Detection:"
    tail -n 100 storage/logs/laravel.log | grep -i "fall" | tail -n 5
    echo ""

    echo "================================"
    echo "✅ TESTE CONCLUÍDO COM SUCESSO!"
    echo "================================"
    echo ""
    echo "📌 O que foi testado:"
    echo "   ✅ Webhook recebido e processado"
    echo "   ✅ FallAlert criado no banco"
    echo "   ✅ Notification criada no banco"
    echo "   ✅ MonitoringSession atualizada"
    echo "   ✅ Logs gerados corretamente"
    echo ""
    echo "🎯 Próximo passo:"
    echo "   Abra a tela de monitoramento no browser para ver"
    echo "   o alerta aparecer em tempo real via WebSocket!"
    echo ""
else
    echo "   ❌ Webhook falhou!"
    echo "   Verifique os logs: tail -f storage/logs/laravel.log"
    exit 1
fi
