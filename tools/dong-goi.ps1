# Đóng gói TestGameAI thành file .zip để gửi người khác: kèm sẵn node.exe (runtime\) và thư viện (node_modules),
# người nhận giải nén rồi bấm đúp start-livebridge.bat là chạy, không cần cài Node.js.
# Không chép cài đặt riêng (LiveBridge\config\settings.json: tài khoản TikTok, danh sách chặn...).
#   Chạy: bấm đúp dong-goi.bat ở thư mục gốc, hoặc
#   powershell -ExecutionPolicy Bypass -File tools\dong-goi.ps1 [-Out <thư mục>] [-WithMusic]
#   Mặc định bỏ nhạc nền trong Games\*\audio cho nhẹ (giữ tiếng chuông, mõ, niệm); -WithMusic để kèm cả nhạc nền
param(
  [string]$Out = '',
  [switch]$WithMusic
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $Out) { $Out = Join-Path $root 'dist' }
$stage = Join-Path $Out 'TestGameAI'
$zip = Join-Path $Out 'TestGameAI.zip'

# node.exe: bản đi kèm sẵn, hoặc bản đang cài trên máy
$node = Join-Path $root 'runtime\node.exe'
if (-not (Test-Path $node)) {
  $cmd = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($cmd) { $node = $cmd.Source } else { $node = Join-Path $env:ProgramFiles 'nodejs\node.exe' }
}
if (-not (Test-Path $node)) { throw 'Không tìm thấy node.exe trên máy này để đóng gói kèm.' }
if (-not (Test-Path (Join-Path $root 'LiveBridge\node_modules'))) { throw 'Chưa có LiveBridge\node_modules: chạy start-livebridge.bat một lần trước.' }

Write-Host "Chép dự án vào $stage ..."
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force $stage | Out-Null
# /XD bỏ thư mục, /XF bỏ file; robocopy trả mã < 8 là thành công
robocopy $root $stage /E /NFL /NDL /NJH /NJS /NP `
  /XD (Join-Path $root 'dist') (Join-Path $root '.git') (Join-Path $root 'runtime') `
  /XF settings.json settings.json.tmp HANDOFF.md dong-goi.bat | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy lỗi ($LASTEXITCODE)" }

Write-Host "Chép node.exe ($node) ..."
New-Item -ItemType Directory -Force (Join-Path $stage 'runtime') | Out-Null
Copy-Item $node (Join-Path $stage 'runtime\node.exe')
Remove-Item -Force (Join-Path $stage 'tools\dong-goi.ps1')
Move-Item (Join-Path $stage 'tools\HUONG-DAN.txt') (Join-Path $stage 'HUONG-DAN.txt')

if (-not $WithMusic) {
  # giữ hiệu ứng (niem, chuong, chuong-lon, mo) và README.txt, bỏ các file nhạc nền
  $keep = 'niem', 'chuong', 'chuong-lon', 'mo', 'README'
  Get-ChildItem (Join-Path $stage 'Games') -Recurse -File |
    Where-Object { $_.Directory.Name -eq 'audio' -and ($keep -notcontains $_.BaseName) } |
    ForEach-Object { Write-Host "  bỏ nhạc: $($_.Name)"; Remove-Item -Force $_.FullName }
}

Write-Host "Nén thành $zip ..."
if (Test-Path $zip) { Remove-Item -Force $zip }
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
# tự ghi từng file với đường dẫn dùng "/" (CreateFromDirectory của PowerShell 5.1 ghi "\", một số trình giải nén hiểu sai)
$base = Split-Path -Parent $stage
$za = [System.IO.Compression.ZipFile]::Open($zip, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  Get-ChildItem $stage -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($base.Length + 1).Replace('\', '/')
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($za, $_.FullName, $rel, [System.IO.Compression.CompressionLevel]::Optimal)
  }
} finally { $za.Dispose() }
Remove-Item -Recurse -Force $stage
$mb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "Xong: $zip ($mb MB)"
