@echo off
REM Export Onboarding Agents - Windows Batch Script
REM This script runs the Node.js export script to retrieve agent onboarding data

echo.
echo ========================================================================
echo    Exporting Agent Onboarding Data from Digital Ocean Database
echo ========================================================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo Error: package.json not found. Please run this script from the project root.
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo node_modules not found. Installing dependencies...
    call npm install
)

REM Navigate to server directory if it exists and has its own package.json
if exist "server\package.json" (
    echo Found server directory with package.json
    cd server
    
    REM Check if server node_modules exists
    if not exist "node_modules" (
        echo Server node_modules not found. Installing dependencies...
        call npm install
    )
    
    REM Run the export script
    echo Running export script...
    node scripts\export-onboarding-agents.js
    
) else (
    REM Run from root directory
    echo Running export script...
    node scripts\export-onboarding-agents.js
)

echo.
echo ========================================================================
echo Export process completed!
echo Check the 'exports' folder for your files
echo ========================================================================
echo.

pause





