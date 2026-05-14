# Remove local Chroma folders for a clean re-ingest (PowerShell)
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $here "..")
$paths = @(
    (Join-Path $root "backend\chroma_db"),
    (Join-Path $root "backend\vector_store")
)
foreach ($p in $paths) {
    if (Test-Path $p) {
        Write-Host "Removing $p"
        Remove-Item -Recurse -Force $p
    } else {
        Write-Host "Skip (not found): $p"
    }
}
Write-Host "Done. If you use Docker, also remove the volume, e.g.: docker volume ls | findstr vector_store"
