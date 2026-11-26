# EduMeet demo launcher for Windows (same steps as demo.sh).
# Run in PowerShell:   .\demo.ps1        or double-click / run demo.cmd
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogDir = $env:TEMP
$script:PhpProc = $null
$script:SpringProc = $null

function Test-Port([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        if ($iar.AsyncWaitHandle.WaitOne(1000, $false) -and $client.Connected) { return $true }
        return $false
    } catch { return $false } finally { $client.Close() }
}

function Stop-Port([int]$Port) {
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop } catch {}
    }
}

function Get-HttpCode([string]$Url) {
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        return [int]$r.StatusCode
    } catch {
        if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
        return 0
    }
}

function Stop-All {
    Write-Host ''
    Write-Host 'Stopping servers...'
    foreach ($p in @($script:SpringProc, $script:PhpProc)) {
        if ($p -and -not $p.HasExited) { cmd /c "taskkill /PID $($p.Id) /T /F >nul 2>&1" }
    }
    foreach ($port in 8080, 3000) { Stop-Port $port }
}

try {
    Write-Host '1/5 Checking XAMPP MySQL (port 3306)...'
    if (-not (Test-Port 3306)) {
        throw 'MySQL is not running. Open XAMPP Control Panel, click Start on MySQL, and run demo.cmd again.'
    }

    Write-Host '2/5 Starting PHP API server on http://127.0.0.1:3000...'
    $phpCmd = Get-Command php -ErrorAction SilentlyContinue
    if ($phpCmd) { $php = $phpCmd.Source }
    elseif (Test-Path 'C:\xampp\php\php.exe') { $php = 'C:\xampp\php\php.exe' }
    else { throw 'php.exe not found. Install PHP (or XAMPP) and add it to PATH.' }
    Stop-Port 3000
    $script:PhpProc = Start-Process -FilePath $php `
        -ArgumentList @('-S', '127.0.0.1:3000', '-t', ('"{0}"' -f $Root)) `
        -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $LogDir 'edumeet-php.log') `
        -RedirectStandardError (Join-Path $LogDir 'edumeet-php-err.log')
    Start-Sleep -Seconds 2
    $phpCode = Get-HttpCode 'http://127.0.0.1:3000/backend/edu-meet/php/api/auth/school_login.php'
    if ($phpCode -in 0, 403, 404) {
        throw "PHP server returned HTTP $phpCode. Check $LogDir\edumeet-php-err.log"
    }
    Write-Host "    PHP API ready (HTTP $phpCode)"

    Write-Host '3/5 Checking Redis (port 6379)...'
    if (-not (Test-Port 6379)) {
        $memurai = Get-Service -Name 'Memurai' -ErrorAction SilentlyContinue
        $redisSrv = Get-Command redis-server -ErrorAction SilentlyContinue
        $docker = Get-Command docker -ErrorAction SilentlyContinue
        if ($memurai) { Start-Service -Name 'Memurai' }
        elseif ($redisSrv) { Start-Process -FilePath $redisSrv.Source -WindowStyle Hidden | Out-Null }
        elseif ($docker) {
            Push-Location $Root
            try { & docker compose up -d redis } finally { Pop-Location }
        }
        else { throw 'Redis not found. Install Memurai (memurai.com) or Docker Desktop, or run Redis in WSL, then run demo.cmd again.' }
        for ($i = 0; $i -lt 30 -and -not (Test-Port 6379); $i++) { Start-Sleep -Seconds 1 }
        if (-not (Test-Port 6379)) { throw 'Redis did not start on port 6379.' }
    }
    Write-Host '    Redis: reachable on port 6379'

    Write-Host '4/5 Starting Spring Boot backend on http://localhost:8080...'
    if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw 'java not found. Install JAVA 25 and reopen the terminal.' }
    Stop-Port 8080
    $phpApi = 'http://127.0.0.1:3000/backend/edu-meet/php/api'
    $springArgs = "--app.php.login-url=$phpApi/auth/login.php " +
        "--app.php.system-admin-login-url=$phpApi/auth/system_admin_login.php " +
        "--app.php.school-login-url=$phpApi/auth/school_login.php " +
        "--app.php.college-admin-login-url=$phpApi/auth/school_login.php " +
        "--app.php.signup-url=$phpApi/auth/signup.php " +
        "--app.php.base-url=$phpApi"
    $mvnArgs = 'spring-boot:run "-Dspring-boot.run.arguments=' + $springArgs + '"'
    $backendDir = Join-Path $Root 'backend\edu-meet'
    $script:SpringProc = Start-Process -FilePath (Join-Path $backendDir 'mvnw.cmd') `
        -ArgumentList $mvnArgs -WorkingDirectory $backendDir `
        -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $LogDir 'edumeet-spring.log') `
        -RedirectStandardError (Join-Path $LogDir 'edumeet-spring-err.log')

    $ready = $false
    for ($i = 0; $i -lt 180; $i++) {
        if ((Get-HttpCode 'http://localhost:8080/api/health') -eq 200) { $ready = $true; break }
        if ($script:SpringProc.HasExited) {
            Write-Host 'ERROR: Spring Boot failed to start. Last log lines:'
            Get-Content (Join-Path $LogDir 'edumeet-spring.log') -Tail 25 -ErrorAction SilentlyContinue
            Get-Content (Join-Path $LogDir 'edumeet-spring-err.log') -Tail 25 -ErrorAction SilentlyContinue
            exit 1
        }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw "Spring Boot did not answer in 180 s. See $LogDir\edumeet-spring.log" }
    Write-Host '    Spring Boot ready on http://localhost:8080'

    Write-Host '5/5 Starting React frontend and opening http://localhost:5173...'
    $front = Join-Path $Root 'frontend\edu-meet'
    Set-Location $front
    if (-not (Test-Path (Join-Path $front 'node_modules'))) { & npm install }
    Start-Job -ScriptBlock { Start-Sleep -Seconds 4; Start-Process 'http://localhost:5173' } | Out-Null
    & npm run dev
}
finally {
    Stop-All
}
