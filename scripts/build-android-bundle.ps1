$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$androidDir = Join-Path $repoRoot "android"

function Get-JavaMajorVersion {
  param([string]$JavaExe)

  if (-not (Test-Path $JavaExe)) {
    return $null
  }

  $versionOutput = & cmd.exe /d /c "`"$JavaExe`" -version 2>&1"
  $firstLine = [string]$versionOutput[0]
  if ($firstLine -match '"(?<major>\d+)') {
    return [int]$Matches.major
  }

  return $null
}

function Add-JavaCandidate {
  param(
    [System.Collections.Generic.List[string]]$Candidates,
    [string]$JavaHome
  )

  if (-not $JavaHome) {
    return
  }

  $javaExe = Join-Path $JavaHome "bin\java.exe"
  if ((Test-Path $javaExe) -and -not $Candidates.Contains($JavaHome)) {
    $Candidates.Add($JavaHome)
  }
}

$javaCandidates = [System.Collections.Generic.List[string]]::new()
Add-JavaCandidate $javaCandidates $env:JAVA_HOME

$portableJdkRoot = Join-Path $env:TEMP "ngoma-jdk21"
if (Test-Path $portableJdkRoot) {
  Get-ChildItem $portableJdkRoot -Directory | ForEach-Object {
    Add-JavaCandidate $javaCandidates $_.FullName
  }
}

Add-JavaCandidate $javaCandidates "C:\Program Files\Eclipse Adoptium\jdk-21"
Add-JavaCandidate $javaCandidates "C:\Program Files\Microsoft\jdk-21"
Add-JavaCandidate $javaCandidates "C:\Program Files\Java\jdk-21"
Add-JavaCandidate $javaCandidates "C:\Program Files\Android\Android Studio\jbr"

$selectedJavaHome = $null
foreach ($candidate in $javaCandidates) {
  $major = Get-JavaMajorVersion (Join-Path $candidate "bin\java.exe")
  if ($major -ge 21 -and $major -le 24) {
    $selectedJavaHome = $candidate
    break
  }
}

if (-not $selectedJavaHome) {
  throw "JDK 21-24 is required for the Android bundle build. Install JDK 21 or restore the portable JDK 21 used for the previous build."
}

$sdkRoot = $env:ANDROID_HOME
if (-not $sdkRoot) {
  $sdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk"
}
if (-not (Test-Path $sdkRoot)) {
  throw "Android SDK was not found. Open Android Studio once and install the Android SDK."
}

$env:JAVA_HOME = $selectedJavaHome
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot

Write-Host "Using JAVA_HOME=$env:JAVA_HOME"
Write-Host "Using ANDROID_HOME=$env:ANDROID_HOME"

Push-Location $repoRoot
try {
  npm run build:android
  npx cap sync android

  Push-Location $androidDir
  try {
    .\gradlew.bat bundleRelease
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
}
