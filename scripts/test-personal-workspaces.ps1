$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$composePath = Join-Path $taskRoot 'apps/api/test/personal-workspaces.compose.yml'
$projectName = "staffhub-personal-tests-$PID"
$apiProcess = $null
$testExitCode = 1
$savedEnvironment = @{}
$testEnvironment = @{
  DB_HOST = '127.0.0.1'; DB_USERNAME = 'staffhub_test'; DB_PASSWORD = 'staffhub_test'; DB_NAME = 'staffhub_personal_test'
  REDIS_HOST = '127.0.0.1'; REDIS_PASSWORD = ''; S3_ACCESS_KEY = 'staffhub_test'; S3_SECRET_KEY = 'staffhub_test'; S3_BUCKET = 'personal-tests'
  JWT_ACCESS_SECRET = 'personal-tests-access-secret-0123456789'; JWT_REFRESH_SECRET = 'personal-tests-refresh-secret-0123456789'
  SMTP_HOST = ''; SMTP_USER = ''; SMTP_PASSWORD = ''; NODE_ENV = 'production'; TS_NODE_PROJECT = 'apps/api/tsconfig.json'
  STAFFHUB_TEST_MIGRATION = '1'
}

Push-Location $taskRoot
try {
  docker compose -p $projectName -f $composePath up -d --wait
  if ($LASTEXITCODE -ne 0) { throw 'Test infrastructure failed to start' }
  $testEnvironment.DB_PORT = ((docker compose -p $projectName -f $composePath port postgres 5432) -split ':')[-1]
  $testEnvironment.REDIS_PORT = ((docker compose -p $projectName -f $composePath port redis 6379) -split ':')[-1]
  $minioPort = ((docker compose -p $projectName -f $composePath port minio 9000) -split ':')[-1]
  $testEnvironment.S3_ENDPOINT = "http://127.0.0.1:$minioPort"
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
  $listener.Start()
  $apiPort = $listener.LocalEndpoint.Port
  $listener.Stop()
  $testEnvironment.APP_PORT = [string]$apiPort
  $testEnvironment.APP_PUBLIC_URL = "http://127.0.0.1:$apiPort/api"
  $testEnvironment.STAFFHUB_TEST_API = $testEnvironment.APP_PUBLIC_URL
  foreach ($key in $testEnvironment.Keys) {
    $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
    [Environment]::SetEnvironmentVariable($key, $testEnvironment[$key], 'Process')
  }
  node -r ts-node/register -r tsconfig-paths/register apps/api/node_modules/typeorm/cli.js migration:run -d apps/api/src/database/typeorm.datasource.ts
  if ($LASTEXITCODE -ne 0) { throw 'Test migrations failed' }
  $logDir = Join-Path $taskRoot ".codex-temp/workspace-tests-$PID"
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  $apiProcess = Start-Process -FilePath (Get-Command node).Source -ArgumentList @('-r', 'ts-node/register', '-r', 'tsconfig-paths/register', 'apps/api/src/main.ts') -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'api.log') -RedirectStandardError (Join-Path $logDir 'api-error.log')
  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if ($apiProcess.HasExited) { throw "Test API stopped; see $logDir" }
    try { Invoke-WebRequest -Uri "http://127.0.0.1:$apiPort/api/health" -UseBasicParsing -TimeoutSec 1 | Out-Null; $ready = $true; break } catch { Start-Sleep -Seconds 1 }
  }
  if (!$ready) { throw "Test API did not become ready; see $logDir" }
  node --test apps/api/test/personal-workspaces.e2e.cjs
  $testExitCode = $LASTEXITCODE
} finally {
  if ($apiProcess -and !$apiProcess.HasExited) { Stop-Process -Id $apiProcess.Id -Force }
  docker compose -p $projectName -f $composePath down -v
  foreach ($key in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($key, $savedEnvironment[$key], 'Process') }
  Pop-Location
}
exit $testExitCode
