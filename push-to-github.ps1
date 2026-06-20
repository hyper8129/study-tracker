# push-to-github.ps1
# Script to automate Git initialization, local commit, and pushing to GitHub using MinGit.

$repoUrl = "https://github.com/hyper8129/study-tracker.git"
$gitFolder = Join-Path (Get-Location) ".git-portable"
$zipPath = Join-Path (Get-Location) "mingit.zip"
$gitExe = Join-Path $gitFolder "cmd\git.exe"

# 1. Download and Setup MinGit if not present
if (-not (Test-Path $gitExe)) {
    Write-Host "MinGit not found. Downloading portable Git (MinGit)..."
    $url = "https://github.com/git-for-windows/git/releases/download/v2.45.2.windows.1/MinGit-2.45.2-64-bit.zip"
    
    try {
        # Using .NET client which is generally faster and handles TLS 1.2+ automatically
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($url, $zipPath)
        
        Write-Host "Extracting MinGit..."
        if (-not (Test-Path $gitFolder)) {
            New-Item -ItemType Directory -Path $gitFolder | Out-Null
        }
        Expand-Archive -Path $zipPath -DestinationPath $gitFolder -Force
        Remove-Item $zipPath -Force
        Write-Host "Portable Git setup completed."
    } catch {
        Write-Error "Failed to download/extract MinGit: $_"
        exit
    }
}

# 2. Git Initialization and Local Commit
Write-Host "Initializing Git repository..."
if (-not (Test-Path ".git")) {
    & $gitExe init | Out-Host
}

Write-Host "Configuring Git user details..."
& $gitExe config user.name "StudyTrack User"
& $gitExe config user.email "user@studytrack.com"

Write-Host "Adding files to staging..."
& $gitExe add . | Out-Host

Write-Host "Creating initial commit..."
& $gitExe commit -m "Initial commit of StudyTrack" | Out-Host

Write-Host "Setting main branch..."
& $gitExe branch -M main | Out-Host

# Setup Remote Origin
Write-Host "Setting up remote origin..."
$existingRemote = & $gitExe remote
if ($existingRemote -contains "origin") {
    & $gitExe remote set-url origin $repoUrl
} else {
    & $gitExe remote add origin $repoUrl
}

# 3. Prompt for GitHub Personal Access Token (PAT)
Write-Host ""
Write-Host "---------------------------------------------------------"
Write-Host "Git repository has been initialized and committed locally!"
Write-Host "To push to your GitHub repository, we need authorization."
Write-Host "---------------------------------------------------------"
Write-Host "Please enter your GitHub Personal Access Token (PAT):"
Write-Host "(Your token will not be stored or displayed)"

# Read token from input
$token = Read-Host

if (-not $token) {
    Write-Host "No token provided. You can push manually using:"
    Write-Host "git push -u origin main"
    exit
}

# 4. Push to remote repository
Write-Host "Pushing to GitHub..."
# Construct push URL with token auth
$authUrl = $repoUrl.Replace("https://", "https://$token@")

try {
    & $gitExe push $authUrl main -f | Out-Host
    Write-Host ""
    Write-Host "============================================="
    Write-Host " StudyTrack successfully pushed to GitHub!   "
    Write-Host " Check your repository: $repoUrl             "
    Write-Host "============================================="
} catch {
    Write-Error "Failed to push to GitHub: $_"
}
