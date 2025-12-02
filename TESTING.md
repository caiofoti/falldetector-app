# 🧪 Testando a Detecção de Quedas

Este documento mostra como testar o sistema de detecção de quedas **sem precisar se jogar no chão** 😄

## 3 Formas de Testar

### 1. 🖱️ Botão na Interface (Mais Fácil)

1. Acesse a página de monitoramento ao vivo: `http://localhost:8000/monitoring/{session_id}`
2. Clique no botão com ícone de **tubo de ensaio** (🧪) no canto superior direito
3. Um alerta será criado e aparecerá automaticamente na tela
4. O webhook será enviado para o n8n

**Vantagens:**
- ✅ Não precisa abrir o terminal
- ✅ Testa o fluxo completo incluindo WebSocket em tempo real
- ✅ Visual e intuitivo

---

### 2. 🔧 Comando Artisan (Terminal)

```bash
# Usando a sessão ID 1 (padrão)
php artisan test:fall-detection

# Especificando uma sessão diferente
php artisan test:fall-detection 5

# Especificando a confiança da detecção
php artisan test:fall-detection 5 --confidence=99.9
```

**O que o comando faz:**
1. ✅ Verifica se a sessão existe
2. ✅ Cria um snapshot fake
3. ✅ Cria um `FallAlert` no banco
4. ✅ Cria uma `Notification` para o usuário
5. ✅ Atualiza a `MonitoringSession`
6. ✅ Envia broadcast via WebSocket
7. ✅ **Envia webhook para o n8n**
8. ✅ Mostra um resumo detalhado

---

### 3. 🌐 API REST (cURL ou Postman)

```bash
# Via cURL
curl -X POST http://localhost:8000/api/test-fall \
  -H "Content-Type: application/json" \
  -d '{"session_id": 1}'
```

**Resposta:**
```json
{
  "success": true,
  "alert_id": 123,
  "message": "🧪 Queda de teste criada e webhook enviado com sucesso!",
  "webhook_url": "https://victor00014.app.n8n.cloud/webhook-test/queda"
}
```

---

## 📋 O que é testado?

Todas as 3 formas testam o **fluxo completo**:

1. **Banco de Dados**
   - ✅ Criação de `FallAlert`
   - ✅ Criação de `Notification`
   - ✅ Atualização de `MonitoringSession`

2. **WebSocket (Reverb)**
   - ✅ Broadcast do evento `FallDetected`
   - ✅ Recepção em tempo real no frontend

3. **Webhook n8n**
   - ✅ Envio do POST para `N8N_WEBHOOK_URL`
   - ✅ Payload com dados do usuário e da queda

4. **Frontend**
   - ✅ Alerta aparece automaticamente na tela
   - ✅ Notificação do navegador (se ativada)
   - ✅ Som de alerta (se ativado)

---

## ⚙️ Pré-requisitos

1. **Reverb deve estar rodando** (para WebSocket funcionar):
   ```bash
   php artisan reverb:start
   ```

2. **`.env` configurado**:
   ```env
   BROADCAST_CONNECTION=reverb
   N8N_WEBHOOK_URL=https://victor00014.app.n8n.cloud/webhook-test/queda
   ```

3. **Frontend compilado**:
   ```bash
   npm run dev
   ```

---

## 📝 Payload enviado para o n8n

```json
{
  "receiver": "victor.alves@ufcspa.edu.br",
  "usuario": {
    "nome": "Caio Silva",
    "email": "caio@example.com",
    "telefone": "+55 11 98765-4321"
  },
  "queda": {
    "data_hora": "01/12/2025 17:00:00",
    "confianca": "98.5%",
    "local": "Minha Webcam"
  },
  "teste": true
}
```

**Nota:** O campo `"teste": true` indica que é um alerta de teste.

---

## 🐛 Troubleshooting

### "Session not found"
- Crie uma sessão pela interface ou use outro `session_id`

### "N8N_WEBHOOK_URL não configurado"
- Adicione no `.env`: `N8N_WEBHOOK_URL=https://victor00014.app.n8n.cloud/webhook-test/queda`

### Webhook não chega no n8n
- Verifique os logs: `tail -f storage/logs/laravel.log`

### Alerta não aparece no frontend
- Verifique se o Reverb está rodando: `php artisan reverb:start`
- Abra o console do navegador (F12) para ver erros de WebSocket
