# Renders codex.html in headless Edge via CDP and writes section screenshots.
# PowerShell is used because the workspace sandbox does not allow Node's
# loopback networking; PowerShell's Invoke-RestMethod/ClientWebSocket do work.
$ErrorActionPreference = 'Stop'
$root = 'D:\vs_workspace\Heaven''s Dice'
$out = Join-Path $root 'docs\screenshots\codex'
$port = 9362
$profile = Join-Path $env:TEMP 'dsh-edge-codex-ps'
Remove-Item $out -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $profile -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $out -Force | Out-Null
$pageUrl = ([Uri](Join-Path $root 'docs\codex.html')).AbsoluteUri

$edge = Start-Process 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ArgumentList @(
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions', '--mute-audio',
  "--remote-debugging-port=$port", "--user-data-dir=$profile", '--window-size=1520,1200', 'about:blank'
) -PassThru

try {
  $targets = $null
  for ($i = 0; $i -lt 60; $i++) {
    try { $targets = Invoke-RestMethod "http://127.0.0.1:$port/json/list" -TimeoutSec 2; break } catch { Start-Sleep -Milliseconds 300 }
  }
  if (-not $targets) { throw 'CDP endpoint did not start' }
  $page = $targets | Where-Object { $_.type -eq 'page' } | Select-Object -First 1
  if (-not $page) { throw 'No page target' }

  $ws = [System.Net.WebSockets.ClientWebSocket]::new()
  $ws.ConnectAsync([Uri]$page.webSocketDebuggerUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult()

  $script:cdpId = 0
  function Send-Cdp([int]$Id, [string]$Method, [hashtable]$Params) {
    $payload = @{ id = $Id; method = $Method; params = $Params } | ConvertTo-Json -Depth 24 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($payload)
    $seg = [ArraySegment[byte]]::new($bytes)
    $null = $ws.SendAsync($seg, [Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
  }
  function Receive-Cdp {
    $buffer = New-Object byte[] 65536
    $ms = [IO.MemoryStream]::new()
    do {
      $seg = [ArraySegment[byte]]::new($buffer)
      $res = $ws.ReceiveAsync($seg, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
      $ms.Write($buffer, 0, $res.Count)
    } while (-not $res.EndOfMessage)
    [Text.Encoding]::UTF8.GetString($ms.ToArray())
  }
  function Invoke-Cdp([string]$Method, [hashtable]$Params = @{}) {
    $script:cdpId++
    $id = $script:cdpId
    Send-Cdp -Id $id -Method $Method -Params $Params
    while ($true) {
      $msg = (Receive-Cdp) | ConvertFrom-Json
      if ($msg.id -eq $id) {
        if ($msg.error) { throw "CDP $Method failed: $($msg.error.message)" }
        return $msg.result
      }
    }
  }
  function Shot-Clip([string]$Name, [string]$Selector, [double]$Scale = 1.4, [int]$Pad = 0) {
    $expr = "(() => { const e = document.querySelector('$Selector'); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x + window.scrollX, y: b.y + window.scrollY, w: b.width, h: b.height }; })()"
    $rect = (Invoke-Cdp 'Runtime.evaluate' @{ expression = $expr; returnByValue = $true }).result.value
    if (-not $rect) { throw "missing $Selector" }
    $clip = @{
      x = 0; y = [Math]::Max(0, $rect.y - $Pad)
      width = 1500; height = $rect.h + $Pad * 2 + 22; scale = $Scale
    }
    $shot = Invoke-Cdp 'Page.captureScreenshot' @{ format = 'png'; captureBeyondViewport = $true; clip = $clip }
    [IO.File]::WriteAllBytes((Join-Path $out "$Name.png"), [Convert]::FromBase64String($shot.data))
    Write-Host ("{0}: {1} x {2}" -f $Name, [Math]::Round($rect.w), [Math]::Round($rect.h))
  }

  $null = Invoke-Cdp 'Runtime.enable'
  $null = Invoke-Cdp 'Page.enable'
  $null = Invoke-Cdp 'Emulation.setDeviceMetricsOverride' @{ width = 1500; height = 1200; deviceScaleFactor = 1; mobile = $false }
  $null = Invoke-Cdp 'Page.navigate' @{ url = $pageUrl }
  Start-Sleep -Milliseconds 1500
  $ready = Invoke-Cdp 'Runtime.evaluate' @{
    expression = "document.fonts.ready.then(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = r; i.onerror = r; })))).then(() => ({ images: document.images.length, broken: [...document.images].filter(i => !i.naturalWidth).length }))"
    awaitPromise = $true; returnByValue = $true
  }
  Write-Host ("images: {0}, broken: {1}" -f $ready.result.value.images, $ready.result.value.broken)

  Shot-Clip '01-sets' '#sets' 1.5
  Shot-Clip '02-dice' '#dice' 1.12
  Shot-Clip '02a-dice-group' '#dice .set-group' 1.45
  Shot-Clip '02b-die-card' '#dice .die-card' 2.0
  Shot-Clip '02c-die-card-demon' '#dice .die-card[data-set="demon"]' 2.0
  Shot-Clip '03-barrels' '#barrels' 1.5
  Shot-Clip '04-items' '#items' 1.35
  Shot-Clip '05-market' '#market' 1.5

  $null = Invoke-Cdp 'Browser.close' @{}
  Write-Host "captures written to $out"
}
finally {
  if (-not $edge.HasExited) { Stop-Process -Id $edge.Id -Force -ErrorAction SilentlyContinue }
}
