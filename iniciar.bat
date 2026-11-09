@echo off
cd /d "%~dp0"
python -c "import PIL, numpy, certifi" 2>nul || (echo Instalando dependencias... & python -m pip install -r requirements.txt)
python server.py --open
pause
