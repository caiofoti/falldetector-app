@echo off
echo ============================================
echo  TESTE DE DETECCAO DE QUEDA
echo ============================================
echo.

set LARAVEL_URL=http://localhost:8000
set SESSION_ID=1
set CONFIDENCE=95.5

echo Parametros do teste:
echo   - Laravel URL: %LARAVEL_URL%
echo   - Session ID: %SESSION_ID%
echo   - Confidence: %CONFIDENCE%%%
echo.

echo 1. Verificando se Laravel esta online...
curl -s %LARAVEL_URL%/api/health > nul 2>&1
if %errorlevel% equ 0 (
    echo    OK Laravel esta respondendo
) else (
    echo    ERRO Laravel nao esta respondendo
    echo    Execute: php artisan serve
    pause
    exit /b 1
)
echo.

echo 2. Enviando webhook de queda detectada...
curl -X POST %LARAVEL_URL%/api/fall-detected ^
  -H "Content-Type: application/json" ^
  -d "{\"session_id\": %SESSION_ID%, \"confidence_score\": %CONFIDENCE%, \"snapshot_base64\": \"data:image/jpeg;base64,/9j/4AAQSkZJRg...\"}" ^
  -o response.json
echo.

echo    Resposta do servidor:
type response.json
echo.

findstr /C:"\"success\":true" response.json > nul
if %errorlevel% equ 0 (
    echo    OK Webhook processado com sucesso!
    echo.

    echo 3. Verificando banco de dados...
    php artisan tinker --execute="echo 'Ultimo FallAlert criado:' . PHP_EOL; \$alert = App\Models\FallAlert::latest()->first(); if(\$alert) { echo 'ID: ' . \$alert->id . PHP_EOL; echo 'Confidence: ' . \$alert->confidence_score . '%%' . PHP_EOL; echo 'Status: ' . \$alert->status . PHP_EOL; }"
    echo.

    echo ============================================
    echo  TESTE CONCLUIDO COM SUCESSO!
    echo ============================================
    echo.
    echo Abra a tela de monitoramento no browser
    echo para ver o alerta em tempo real!
) else (
    echo    ERRO Webhook falhou!
    echo    Verifique os logs
)
echo.

del response.json > nul 2>&1
pause
