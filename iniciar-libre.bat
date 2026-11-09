@echo off
cd /d "%~dp0"
echo AVISO: el navegador de NEXUS podra abrir tu red local (router, servidores de desarrollo).
python -c "import PIL, numpy, certifi" 2>nul || (echo Instalando dependencias... & python -m pip install -r requirements.txt)
python server.py --open --allow-local
pause
