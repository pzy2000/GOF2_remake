@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

set "NODE_EXE="

where node >nul 2>&1 && for /f "delims=" %%i in ('where node') do (
  set "NODE_EXE=%%i"
  goto :run
)

for /f "delims=" %%I in ('dir /b /ad "%LOCALAPPDATA%\Programs\nodejs-portable\node-v*-win-x64" 2^>nul') do (
  if exist "%LOCALAPPDATA%\Programs\nodejs-portable\%%I\node.exe" (
    set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs-portable\%%I\node.exe"
    goto :run
  )
)

if exist "C:\Program Files\nodejs\node.exe" set "NODE_EXE=C:\Program Files\nodejs\node.exe"

:run
if not defined NODE_EXE (
  echo node.exe not found. Install Node.js from https://nodejs.org or add it to PATH.
  echo Portable hint: place Node under %%LOCALAPPDATA%%\Programs\nodejs-portable\node-v*-win-x64
  exit /b 1
)

for %%F in ("!NODE_EXE!") do set "NPM_CMD=%%~dpFnpm.cmd"
if not exist "!NPM_CMD!" (
  echo npm.cmd not found next to node.exe: !NPM_CMD!
  exit /b 1
)

echo Using npm: !NPM_CMD!
call "!NPM_CMD!" install
exit /b %ERRORLEVEL%
