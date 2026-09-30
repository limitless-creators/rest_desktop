$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$nsisHome = if ($env:NSIS_HOME) { $env:NSIS_HOME } else { Join-Path $env:LOCALAPPDATA 'electron-builder\Cache\nsis-3.0.4.1\nsis-3.0.4.1-1mx3n' }
$compiler = Join-Path $nsisHome 'Bin\makensis.exe'
New-Item -ItemType Directory -Force test-results | Out-Null
& "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe" /nologo /target:winexe /out:test-results\REST-Launch-Probe.exe scripts\InstallerLaunchProbe.cs
if ($LASTEXITCODE) { throw 'Falha ao compilar a aplicação simulada.' }
$results = @()
foreach ($test in @(
  @{ Script='installer-check'; Exe='REST-Installer-Check'; Args='/S '; Result='result.txt' },
  @{ Script='installer-slideshow-check'; Exe='REST-Installer-Slideshow-Check'; Args=''; Result='slideshow-result.txt' }
)) {
  & $compiler /V2 ("scripts\" + $test.Script + '.nsi')
  if ($LASTEXITCODE) { throw "Falha ao compilar $($test.Script)" }
  $target = Join-Path (Get-Location) ('.smoke-data\'+$test.Script+'-'+[guid]::NewGuid().ToString('N'))
  $process = Start-Process -FilePath (Join-Path (Get-Location) ('test-results\'+$test.Exe+'.exe')) -ArgumentList ($test.Args+'/D='+$target) -WindowStyle Hidden -PassThru
  if (-not $process.WaitForExit(60000)) {
    $process.Kill()
    throw "O ensaio $($test.Script) excedeu 60 segundos."
  }
  $resultPath = Join-Path $target $test.Result
  if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $resultPath)) { throw "Falhou o ensaio $($test.Script), código $($process.ExitCode)" }
  $result = Get-Content -LiteralPath $resultPath -Raw
  if ($result -notmatch 'PASS:') { throw $result }
  Write-Output $result
  $results += @{test=$test.Script; result=$result; path=$target}
}
$results | ConvertTo-Json | Set-Content -Encoding UTF8 test-results\installer-native-checks-1.4.0.json
& $compiler /V2 scripts\installer-preview.nsi
if ($LASTEXITCODE) { throw 'Falha ao compilar a pré-visualização.' }
