$ErrorActionPreference = "Stop"
$backend = Join-Path $PSScriptRoot "..\backend"
$configFile = Join-Path $backend ".env"
if (Test-Path $configFile) {
    Get-Content $configFile -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line -split "=", 2
            if ($parts.Count -ne 2 -or $parts[0].Trim() -notmatch "^[A-Z_][A-Z0-9_]*$") { throw "Dòng cấu hình .env không hợp lệ." }
            $key = $parts[0].Trim()
            $value = $parts[1].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}
if (-not $env:DB_PASSWORD -or $env:DB_PASSWORD -eq "CHANGE_ME") { throw "Điền DB_PASSWORD trong backend/.env hoặc đặt biến trong terminal này." }
Push-Location $backend
try {
    & .\mvnw.cmd spring-boot:run
    if ($LASTEXITCODE -ne 0) { throw "Backend chưa khởi động thành công. Xem lỗi phía trên." }
} finally { Pop-Location }
