@echo off
chcp 65001 >nul
rem (comment khong dau: cmd doc sai chu co dau trong file .bat)
rem Cap nhat TestGameAI: chi chay khi LiveBridge dang TAT (da dong cua so den).
rem Mo giao dien nho de xem ban dang dung va ban moi nhat tren GitHub, co ban moi
rem thi bam nut Cap nhat — chi tai nhung file da doi, khong tai lai toan bo.
rem Giu nguyen cai dat rieng (settings.json), nhac/anh ban tu them, runtime, node_modules.
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
cd /d "%~dp0"
"%NODE%" tools\cap-nhat.js
echo.
echo Da dong tool cap nhat. Cap nhat xong thi bam dup start-livebridge.bat de chay ban moi.
pause
