param(
  [switch]$Run
)

Write-Host "Resetting local H2 dev database (./.localdb)" -ForegroundColor Yellow

$dbPath = Join-Path (Get-Location) ".localdb"
if (Test-Path $dbPath) {
  try {
    Remove-Item -Recurse -Force $dbPath
    Write-Host "Removed $dbPath" -ForegroundColor Green
  } catch {
    Write-Error "Failed to remove $dbPath. Make sure the Spring Boot app is stopped, then try again."
    exit 1
  }
} else {
  Write-Host "Nothing to remove. $dbPath does not exist." -ForegroundColor DarkYellow
}

if ($Run) {
  Write-Host "Starting backend with Maven Wrapper..." -ForegroundColor Cyan
  if ($env:JAVA_HOME -eq $null -and $env:JAVA_21_HOME) {
    Write-Host "Using JAVA_21_HOME for JAVA_HOME in this session" -ForegroundColor DarkCyan
    $env:JAVA_HOME = $env:JAVA_21_HOME
  }
  & .\mvnw.cmd spring-boot:run
}

