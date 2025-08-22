@echo off
echo ========================================
echo Attendance Management System Setup
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found: 
node --version

echo.
echo Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    echo Please reinstall Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo npm found:
npm --version

echo.
echo Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies
    echo Please check your internet connection and try again
    echo.
    echo Alternative solutions:
    echo 1. Run this script as Administrator
    echo 2. Check your firewall settings
    echo 3. Try using a different network
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installation completed successfully!
echo ========================================
echo.
echo To start the application:
echo 1. Run: npm start
echo 2. Open browser and go to: http://localhost:3000
echo 3. Login with: admin / admin123
echo.
pause
