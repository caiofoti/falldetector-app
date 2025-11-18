@echo off
echo ========================================
echo FallDetector - Setup Python Service
echo ========================================
echo.

REM Verificar se está no diretório correto
if not exist "python" (
    echo Criando diretorio python...
    mkdir python
)

REM Copiar arquivos se necessário
if not exist "python\fall_detection_service.py" (
    echo ERRO: fall_detection_service.py nao encontrado!
    echo Por favor, copie o arquivo para a pasta python\
    pause
    exit /b 1
)

if not exist "python\requirements.txt" (
    echo ERRO: requirements.txt nao encontrado!
    echo Por favor, copie o arquivo para a pasta python\
    pause
    exit /b 1
)

echo Verificando ambiente virtual...
if not exist "venv\Scripts\activate.bat" (
    echo Criando ambiente virtual...
    python -m venv venv
    if errorlevel 1 (
        echo ERRO: Nao foi possivel criar ambiente virtual
        pause
        exit /b 1
    )
)

echo.
echo Ativando ambiente virtual...
call venv\Scripts\activate.bat

echo.
echo Atualizando pip...
python -m pip install --upgrade pip

echo.
echo Instalando dependencias...
cd python
pip install -r requirements.txt
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo Instalacao concluida com sucesso!
echo ========================================
echo.
echo Para iniciar o servico, execute:
echo   python python\fall_detection_service.py
echo.
pause
