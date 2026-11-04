@echo off
chcp 65001 >nul
rem (comment khong dau: cmd doc sai chu co dau trong file .bat)
rem Bat LiveBridge roi mo trang quan tri. Dong cua so nay la tat LiveBridge.
rem Tim Node.js: uu tien runtime\node.exe di kem (ban dong goi gui nguoi khac, khong can cai),
rem khong co thi dung Node.js da cai tren may; khong co ca hai thi thu tu cai bang winget.
setlocal
set "NODE=%~dp0runtime\node.exe"
if exist "%NODE%" goto found
set "NODE="
for %%N in (node.exe) do set "NODE=%%~$PATH:N"
if defined NODE goto found
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if defined NODE goto found

echo.
echo Chua co Node.js tren may nay.
where winget >nul 2>nul
if errorlevel 1 goto manual
echo Dang tu cai Node.js bang winget (co the hien hop thoai xin quyen, bam Yes)...
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
if exist "%ProgramFiles%\nodejs\node.exe" (
  set "NODE=%ProgramFiles%\nodejs\node.exe"
  set "PATH=%ProgramFiles%\nodejs;%PATH%"
  goto found
)
:manual
echo.
echo Hay tai va cai Node.js (ban LTS, bam Next lien tuc) tai trang vua mo, roi bam dup lai file nay.
start "" https://nodejs.org/
pause
exit /b 1

:found
cd /d "%~dp0LiveBridge"
if not exist node_modules (
  echo Dang cai thu vien lan dau...
  call npm install
)
if not exist node_modules\node-edge-tts (
  echo Dang cai them thu vien giong noi NPC ^(node-edge-tts^)...
  call npm install
)
start "" http://localhost:8787/
"%NODE%" server.js
pause
