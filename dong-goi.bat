@echo off
chcp 65001 >nul
rem (comment khong dau: cmd doc sai chu co dau trong file .bat)
rem Dong goi du an thanh dist\TestGameAI.zip (kem node.exe, khong kem cai dat rieng) de gui nguoi khac.
rem Mac dinh khong kem nhac nen (cho nhe). Muon kem nhac: dong-goi.bat -WithMusic
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\dong-goi.ps1" %*
pause
