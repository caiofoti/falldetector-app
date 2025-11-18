@echo off
echo ========================================
echo FallDetector - Python Detection Service
echo ========================================
echo.

REM Verificar se ambiente virtual existe
if not exist "venv\Scripts\activate.bat" (
    echo ERRO: Ambiente virtual nao encontrado!
    echo Execute setup-python.bat primeiro
    pause
    exit /b 1
)

REM Verificar se arquivo existe
if not exist "python\fall_detection_service.py" (
    echo ERRO: fall_detection_service.py nao encontrado!
    echo Verifique se o arquivo esta em python\fall_detection_service.py
    pause
    exit /b 1
)

echo Ativando ambiente virtual...
call venv\Scripts\activate.bat

echo.
echo Iniciando servico de detecção de quedas...
echo Porta: 8080
echo Pressione Ctrl+C para parar
echo.

python python\fall_detection_service.py

pause
