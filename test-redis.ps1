# Windows version of test-redis.sh. Start the app first with demo.cmd, then in another window:
#   PowerShell:  $env:EMAIL='you@mail.com'; $env:PASSWORD='secret'; .\test-redis.ps1
#   cmd.exe:     set EMAIL=you@mail.com
#                set PASSWORD=secret
#                test-redis.cmd
# Optional: $env:LOGIN_PATH='php-system-admin-login' for an admin account.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$API = if ($env:API) { $env:API } else { 'http://localhost:8080' }
$PHP_API = if ($env:PHP_API) { $env:PHP_API } else { 'http://127.0.0.1:3000/backend/edu-meet/php/api' }
$LoginPath = if ($env:LOGIN_PATH) { $env:LOGIN_PATH } else { 'php-school-login' }
$Email = $env:EMAIL
$Password = $env:PASSWORD
$script:Failed = $false

if (-not $Email -or -not $Password) {
    Write-Host 'Set EMAIL and PASSWORD first, e.g.  $env:EMAIL=''you@mail.com''; $env:PASSWORD=''secret''; .\test-redis.ps1'
    exit 1
}

function Pass([string]$m) { Write-Host "  PASS  $m" -ForegroundColor Green }
function Fail([string]$m) { Write-Host "  FAIL  $m" -ForegroundColor Red; $script:Failed = $true }
function Grab([string]$s, [string]$pattern) {
    $m = [regex]::Match($s, $pattern)
    if ($m.Success) { return $m.Groups[1].Value } else { return '' }
}

# redis-cli (or memurai-cli); if neither is installed, use the Redis container from docker-compose
$cli = Get-Command redis-cli, memurai-cli -ErrorAction SilentlyContinue | Select-Object -First 1
function Redis {
    if ($cli) { $out = & $cli.Source @args }
    else { $out = & docker compose -f (Join-Path $Root 'docker-compose.yaml') exec -T redis redis-cli @args }
    return ($out | Out-String).Trim()
}

Add-Type -AssemblyName System.Net.Http
$script:Client = New-Object System.Net.Http.HttpClient
$script:Client.Timeout = [TimeSpan]::FromSeconds(60)

# Returns Code, Body and the Authorization response header. Never throws on 4xx/5xx.
function Invoke-Api([string]$Method, [string]$Url, [string]$Auth = '', $Body = $null) {
    $verb = New-Object System.Net.Http.HttpMethod -ArgumentList $Method
    $req = New-Object System.Net.Http.HttpRequestMessage -ArgumentList $verb, $Url
    if ($Auth) { [void]$req.Headers.TryAddWithoutValidation('Authorization', $Auth) }
    if ($null -ne $Body) {
        if ($Body -is [string]) { $json = $Body } else { $json = $Body | ConvertTo-Json -Compress }
        $req.Content = New-Object System.Net.Http.StringContent -ArgumentList $json, ([System.Text.Encoding]::UTF8), 'application/json'
    }
    $resp = $script:Client.SendAsync($req).GetAwaiter().GetResult()
    $text = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    $authOut = ''
    foreach ($h in $resp.Headers) {
        if ($h.Key -ieq 'Authorization') { $authOut = [string]($h.Value | Select-Object -First 1) }
    }
    return [pscustomobject]@{ Code = [int]$resp.StatusCode; Body = $text; Auth = $authOut }
}

function Get-Login([string]$Path, [string]$E, [string]$P) {
    return Invoke-Api 'POST' "$API/api/auth/$Path" '' @{ email = $E; password = $P }
}

Write-Host '1) Redis up?'
$ping = ''
try { $ping = Redis ping } catch {}
if ($ping -eq 'PONG') { Pass 'redis ping' } else { Fail 'Redis not running, or no redis-cli / docker found'; exit 1 }

Write-Host "2) Login through Spring ($LoginPath)"
$r = Get-Login $LoginPath $Email $Password
$AUTH = $r.Auth
$TOKEN = $AUTH -replace '^Bearer ', ''
if ($r.Code -eq 200) { Pass 'HTTP 200' } else { Fail "login HTTP $($r.Code) (check email/password, PHP + MySQL running)" }
if ($TOKEN) { Pass "got Redis token ($TOKEN)" } else { Fail 'no Authorization header'; exit 1 }

Write-Host '3) TTL in Redis (expect about 86400)'
$ttl = [int](Redis ttl "auth:token:$TOKEN")
Write-Host "  TTL = $ttl"
if ($ttl -gt 86300 -and $ttl -le 86400) { Pass '24h expiry' } else { Fail "TTL is $ttl, not ~86400" }

Write-Host '4) Still logged in after 35 seconds? (the old ~30s bug)'
Start-Sleep -Seconds 35
$code = (Invoke-Api 'GET' "$API/api/auth/logIn/cached" $AUTH).Code
if ($code -eq 200) { Pass 'logIn/cached = 200 after 35s' } else { Fail "logIn/cached = $code after 35s" }
Write-Host "  TTL after refresh = $(Redis ttl "auth:token:$TOKEN")"

Write-Host '5) PHP middleware accepts the Redis token (anything except 401 is good)'
$code = (Invoke-Api 'POST' "$PHP_API/auth/request_password_otp.php" $AUTH @{ email = $Email }).Code
if ($code -ne 401) { Pass "PHP returned $code (not 401)" } else { Fail 'PHP returned 401' }

Write-Host '6) Logout deletes the key'
$code = (Invoke-Api 'POST' "$API/api/auth/logOut" $AUTH).Code
if ($code -eq 200) { Pass 'logOut = 200' } else { Fail "logOut = $code" }
$code = (Invoke-Api 'GET' "$API/api/auth/logIn/cached" $AUTH).Code
if ($code -eq 401) { Pass 'token rejected after logout' } else { Fail "expected 401, got $code" }
if ((Redis exists "auth:token:$TOKEN") -eq '0') { Pass 'key gone from Redis' } else { Fail 'key still in Redis' }

Write-Host '7) Redis value holds id + role + user info'
$r2 = Get-Login $LoginPath $Email $Password
$AUTH2 = $r2.Auth
$TOKEN2 = $AUTH2 -replace '^Bearer ', ''
$val = Redis get "auth:token:$TOKEN2"
Write-Host "  value = $val"
$UserId = Grab $val '"id":(\d+)'
if ($val -match '"role":"') { Pass 'role is in the value' } else { Fail 'no role in value' }
if ($val -match '"user":\{') { Pass 'user info is in the value' } else { Fail 'no user info in value' }
if ((Redis sismember "auth:user:$UserId" $TOKEN2) -eq '1') { Pass "token indexed in auth:user:$UserId" } else { Fail "token not in auth:user:$UserId" }

Write-Host '8) Updating the users info updates Redis'
$cur = (Invoke-Api 'GET' "$API/api/php/users?id=$UserId" $AUTH2).Body
$First = Grab $cur '"first_name":"([^"]*)"'
$Last = Grab $cur '"last_name":"([^"]*)"'
$Mail = Grab $cur '"email":"([^"]*)"'
function Put-Name([string]$n) {
    return (Invoke-Api 'PUT' "$API/api/php/users?id=$UserId" $AUTH2 @{ email = $Mail; first_name = $n; last_name = $Last }).Code
}
if (-not $First -or -not $Last -or -not $Mail) {
    Fail "could not read the user from /api/php/users?id=$UserId"
} else {
    $code = Put-Name 'Synctest'
    if ($code -eq 200) { Pass 'PUT user = 200' } else { Fail "PUT user = $code" }
    $val = Redis get "auth:token:$TOKEN2"
    if ($val -match '"first_name":"Synctest"') { Pass 'Redis now has first_name Synctest' } else { Fail 'Redis value not updated' }
    if ($val -match '"role":"') { Pass 'role kept after update' } else { Fail 'role lost after update' }
    $code = Put-Name $First
    if ($code -eq 200) { Pass 'restored original name' } else { Fail "restore name = $code" }
    $val = Redis get "auth:token:$TOKEN2"
    if ($val.Contains("`"first_name`":`"$First`"")) { Pass 'Redis has original name again' } else { Fail 'Redis not restored' }
}

Write-Host '9) Changing the users role/membership clears their Redis session'
$MID = Grab (Invoke-Api 'GET' "$API/api/php/school-memberships?user_id=$UserId" $AUTH2).Body '"membership_id":(\d+)'
$URID = Grab (Invoke-Api 'GET' "$API/api/php/user-roles?user_id=$UserId" $AUTH2).Body '"user_role_id":(\d+)'
$skip = $false
if ($MID) {
    $code = (Invoke-Api 'PATCH' "$API/api/php/school-memberships?id=$MID" $AUTH2 '{}').Code
    if ($code -eq 200) { Pass 'PATCH school-membership = 200 (no data changed)' } else { Fail "PATCH school-membership = $code" }
} elseif ($URID) {
    $RID = Grab (Invoke-Api 'GET' "$API/api/php/user-roles?id=$URID" $AUTH2).Body '"role_id":(\d+)'
    $code = (Invoke-Api 'PUT' "$API/api/php/user-roles?id=$URID" $AUTH2 @{ role_id = [int]$RID }).Code
    if ($code -eq 200) { Pass 'PUT user-role = 200 (same role)' } else { Fail "PUT user-role = $code" }
} else {
    Write-Host '  SKIP  this account has no membership or user-role row'
    $skip = $true
}
if (-not $skip) {
    if ((Redis exists "auth:token:$TOKEN2") -eq '0') { Pass 'session cleared, user must log in again for the new role' } else { Fail 'session still in Redis' }
    if ((Redis exists "auth:user:$UserId") -eq '0') { Pass 'user index cleared' } else { Fail "auth:user:$UserId still in Redis" }
    if ((Invoke-Api 'GET' "$API/api/auth/logIn/cached" $AUTH2).Code -eq 401) { Pass 'old token rejected' } else { Fail 'old token still accepted' }
}

Write-Host '10) Deleting a user removes their Redis session (uses a throwaway user)'
$AUTH3 = (Get-Login $LoginPath $Email $Password).Auth
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$TMail = "synctest.$stamp@example.com"
$cr = Invoke-Api 'POST' "$API/api/php/users" $AUTH3 @{ email = $TMail; first_name = 'Synctest'; last_name = 'Temp'; password = 'Temp12345' }
$TID = Grab $cr.Body '"user_id":(\d+)'
if (-not $TID) {
    Fail "could not create throwaway user: $($cr.Body)"
} else {
    $AUTHT = (Get-Login 'php-login' $TMail 'Temp12345').Auth
    $TOKT = $AUTHT -replace '^Bearer ', ''
    if ((Redis exists "auth:token:$TOKT") -eq '1') { Pass 'throwaway user is logged in (key in Redis)' } else { Fail 'throwaway login failed (check LOGIN path php-login)' }
    $code = (Invoke-Api 'DELETE' "$API/api/php/users?id=$TID" $AUTH3).Code
    if ($code -ge 200 -and $code -lt 300) { Pass "DELETE user = $code" } else { Fail "DELETE user = $code" }
    if ((Redis exists "auth:token:$TOKT") -eq '0') { Pass 'deleted users key gone from Redis' } else { Fail 'deleted users key still in Redis' }
    if ((Invoke-Api 'GET' "$API/api/auth/logIn/cached" $AUTHT).Code -eq 401) { Pass 'deleted users token rejected' } else { Fail 'deleted users token still accepted' }
}
[void](Invoke-Api 'POST' "$API/api/auth/logOut" $AUTH3)

if ($script:Failed) { Write-Host 'SOME TESTS FAILED' -ForegroundColor Red; exit 1 } else { Write-Host 'ALL GOOD' -ForegroundColor Green }
