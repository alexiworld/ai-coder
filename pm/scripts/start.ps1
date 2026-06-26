# Start the Kanban Studio container
Set-Location (Split-Path $PSScriptRoot)

function Find-DockerDesktop {
    $candidates = @(
        "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
        "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
        "$env:LOCALAPPDATA\Docker\Docker Desktop.exe"
    )
    foreach ($path in $candidates) {
        if (Test-Path $path) { return $path }
    }
    foreach ($regPath in @(
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop"
    )) {
        $loc = (Get-ItemProperty $regPath -ErrorAction SilentlyContinue).InstallLocation
        if ($loc) {
            $exe = Join-Path $loc "Docker Desktop.exe"
            if (Test-Path $exe) { return $exe }
        }
    }
    return $null
}

docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    $dockerDesktop = Find-DockerDesktop
    if (-not $dockerDesktop) {
        Write-Host "ERROR: Docker Desktop not found. Please install Docker Desktop."
        exit 1
    }
    Write-Host "Docker not running - starting $dockerDesktop..."
    Start-Process $dockerDesktop

    $timeout = 120
    $elapsed = 0
    $ready = $false
    do {
        Start-Sleep 5
        $elapsed += 5
        docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Docker ready after ${elapsed}s"
            $ready = $true
            break
        }
        Write-Host "Waiting for Docker... ${elapsed}s"
    } while ($elapsed -lt $timeout)

    if (-not $ready) {
        Write-Host "ERROR: Docker did not start within 120 seconds."
        exit 1
    }
}

docker compose up --build
