@echo off
REM ============================================================
REM  EXCALcore.exe Windows build script
REM  Run this ON a Windows machine (Windows 10/11, 64-bit).
REM  Produces: dist\EXCALcore.exe  (single-file, no installer needed)
REM ============================================================
setlocal

where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python 3 not found. Install Python 3.10+ from
    echo         https://www.python.org/downloads/  (check "Add python to PATH")
    exit /b 1
)

echo [*] Installing PyInstaller...
python -m pip install --upgrade pyinstaller
if errorlevel 1 (
    echo [ERROR] pip install failed.
    exit /b 1
)

echo [*] Building EXCALcore.exe (one-file)...
python -m PyInstaller --onefile --console --name EXCALcore excalcore.py
if errorlevel 1 (
    echo [ERROR] PyInstaller build failed.
    exit /b 1
)

echo.
echo [OK] Built: dist\EXCALcore.exe
dir dist\EXCALcore.exe
echo.
echo Run it:  dist\EXCALcore.exe --network testnet
echo Console commands inside: help, status, start, stop, peers, quit
endlocal
