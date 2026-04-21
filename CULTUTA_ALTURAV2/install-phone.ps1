Param(
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

function Write-Step([string]$msg) {
  Write-Host "`n==> $msg" -ForegroundColor Cyan
}

function Fail([string]$msg) {
  Write-Host "`nERROR: $msg" -ForegroundColor Red
  exit 1
}

Write-Step "Detectando Android SDK y ADB"
$sdk = if ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { "$env:LOCALAPPDATA\Android\Sdk" }
$adb = Join-Path $sdk 'platform-tools\adb.exe'

if (-not (Test-Path $adb)) {
  Fail "No se encontro adb.exe en: $adb"
}

Write-Host "SDK: $sdk"
Write-Host "ADB: $adb"

Write-Step "Verificando dispositivos conectados"
$adbOutput = & $adb devices
$adbOutput | ForEach-Object { Write-Host $_ }

$devices = @()
foreach ($line in $adbOutput) {
  if ($line -match "^([\w\-\.]+)\s+device$") {
    $devices += $Matches[1]
  }
}

if ($devices.Count -eq 0) {
  Fail "No hay telefono conectado. Conecta por USB, activa Depuracion USB y acepta la huella RSA."
}

Write-Host "Dispositivo(s): $($devices -join ', ')" -ForegroundColor Green

if (-not $SkipBuild) {
  Write-Step "Compilando web (npm run build)"
  npm run build
}

Write-Step "Copiando assets a Android (npx cap copy android)"
npx cap copy android

Write-Step "Instalando app debug en el telefono"
Push-Location android
try {
  .\gradlew.bat installDebug
}
finally {
  Pop-Location
}

Write-Host "`nInstalacion completada. Busca la app en tu telefono." -ForegroundColor Green
