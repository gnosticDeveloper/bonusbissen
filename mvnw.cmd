@REM Minimal Maven Wrapper (only-script type) for Windows: downloads and caches
@REM the pinned Maven distribution from .mvn\wrapper\maven-wrapper.properties.
@echo off
setlocal enabledelayedexpansion

set BASE_DIR=%~dp0
set WRAPPER_PROPERTIES=%BASE_DIR%.mvn\wrapper\maven-wrapper.properties

for /f "usebackq tokens=1,* delims==" %%A in ("%WRAPPER_PROPERTIES%") do (
  if "%%A"=="distributionUrl" set DISTRIBUTION_URL=%%B
)

for %%F in ("%DISTRIBUTION_URL%") do set ARCHIVE_NAME=%%~nxF
set DIST_DIR_NAME=%ARCHIVE_NAME:-bin.zip=%

set CACHE_DIR=%USERPROFILE%\.m2\wrapper\dists\%DIST_DIR_NAME%
set MAVEN_HOME=%CACHE_DIR%\%DIST_DIR_NAME%

if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
  if not exist "%CACHE_DIR%" mkdir "%CACHE_DIR%"
  set ARCHIVE_PATH=%CACHE_DIR%\%ARCHIVE_NAME%
  echo Downloading Maven distribution from %DISTRIBUTION_URL%
  powershell -Command "Invoke-WebRequest -Uri '%DISTRIBUTION_URL%' -OutFile '!ARCHIVE_PATH!'"
  powershell -Command "Expand-Archive -Path '!ARCHIVE_PATH!' -DestinationPath '%CACHE_DIR%' -Force"
  del "!ARCHIVE_PATH!"
)

"%MAVEN_HOME%\bin\mvn.cmd" %*
