# Remove backend/.venv when you only use Docker for the API.
# Windows may lock DLLs under .venv if Python/uvicorn/Cursor is using them.
# Close: terminals running from .venv, "Python" in Task Manager for this project, then re-run.

$venvPath = Join-Path $PSScriptRoot "..\backend\.venv"
if (-not (Test-Path -LiteralPath $venvPath)) {
    Write-Host "backend/.venv not found (already removed)."
    exit 0
}
$venv = (Resolve-Path -LiteralPath $venvPath).Path

Write-Host "Removing: $venv"
Write-Host "If this fails, close all terminals/IDE tasks using this venv and run again.`n"

# Drop read-only flags (helps some locks)
Get-ChildItem -LiteralPath $venv -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
    $_.Attributes = 'Normal'
}

# cmd rmdir often behaves better than Remove-Item for deep trees
$cmdPath = $venv
cmd /c "rmdir /s /q `"$cmdPath`""

if (Test-Path -LiteralPath $cmdPath) {
    Write-Host "`nFAILED: still locked. Steps:"
    Write-Host "  1) Stop any: uvicorn, python, jupyter using this repo"
    Write-Host "  2) Close Cursor terminals whose cwd is backend"
    Write-Host "  3) Run this script again, or delete the folder from Explorer after reboot"
    exit 1
}

Write-Host "`nRemoved backend/.venv OK."
exit 0
