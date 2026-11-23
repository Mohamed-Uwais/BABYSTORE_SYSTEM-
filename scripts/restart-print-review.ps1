$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$runtime = Join-Path $root '.print-test'
$data = (Resolve-Path (Join-Path $runtime 'api-data')).Path
if (!(Get-NetTCPConnection -State Listen -LocalPort 13323 -ErrorAction SilentlyContinue)) {
  Start-Process 'C:/Program Files/MySQL/MySQL Server 8.0/bin/mysqld.exe' -WindowStyle Hidden -ArgumentList @('--no-defaults', "--datadir=`"$data`"", '--bind-address=127.0.0.1', '--port=13323', '--mysqlx=OFF')
  for ($i=0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    if (Get-NetTCPConnection -State Listen -LocalPort 13323 -ErrorAction SilentlyContinue) { break }
  }
}
$listener = Get-NetTCPConnection -State Listen -LocalPort 15222 -ErrorAction SilentlyContinue
if ($listener) {
  $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
  if ($proc.Name -ne 'node.exe' -or $proc.CommandLine -notmatch 'scripts[/\\]start-print-review\.cjs') { throw 'Port 15222 belongs to another application' }
  Stop-Process -Id $proc.ProcessId
}
Start-Process node -WorkingDirectory $root -WindowStyle Hidden -ArgumentList 'scripts/start-print-review.cjs' -RedirectStandardOutput "$runtime/server.log" -RedirectStandardError "$runtime/server.err"
for ($i=0; $i -lt 20; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    if ((Invoke-RestMethod http://127.0.0.1:15222/api/health -TimeoutSec 2).status -eq 'ok') {
      Write-Output 'Local POS ready at http://127.0.0.1:15222/settings'
      return
    }
  } catch {}
}
throw 'Local POS did not start. Check .print-test/server.err.'
