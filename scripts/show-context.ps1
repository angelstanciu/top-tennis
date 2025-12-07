param(
  [int]$Lines = 80,
  [ValidateSet('common','backend','frontend','all')]
  [string]$Group = 'all',
  [switch]$ListOnly
)

Write-Host "Top Tennis — Show Context" -ForegroundColor Cyan

$root = Split-Path $PSScriptRoot -Parent
$manifestPath = Join-Path $root 'context-manifest.json'
if (!(Test-Path $manifestPath)) {
  Write-Error "Manifest not found at $manifestPath"
  exit 1
}

try {
  $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
} catch {
  Write-Error "Failed to parse manifest: $_"
  exit 1
}

$groups = @()
if ($Group -eq 'all') { $groups = @('common','backend','frontend') } else { $groups = @($Group) }

foreach ($g in $groups) {
  if (-not ($manifest.PSObject.Properties.Name -contains $g)) {
    Write-Warning "Group '$g' not found in manifest"
    continue
  }
  $paths = $manifest.$g
  Write-Host "`n== $g ==" -ForegroundColor Yellow
  foreach ($rel in $paths) {
    $full = Join-Path $root $rel
    if (!(Test-Path $full)) {
      Write-Host "[missing] $rel" -ForegroundColor Red
      continue
    }
    if ($ListOnly) {
      Write-Host "- $rel"
      continue
    }
    try {
      $fi = Get-Item $full
      Write-Host "`n---- $rel ($([Math]::Round($fi.Length/1KB,2)) KB) ----" -ForegroundColor Green
      Get-Content $full -TotalCount $Lines | ForEach-Object { $_ }
    } catch {
      Write-Warning "Failed to read $rel: $_"
    }
  }
}

Write-Host "`nTip: Use -Group backend|frontend|common and -Lines N to adjust output." -ForegroundColor DarkCyan

