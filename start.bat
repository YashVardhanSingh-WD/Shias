@echo off
echo ========================================
echo Starting Attendance Management System
echo ========================================
echo.

echo Checking if dependencies are installed...
if not exist "node_modules" (
    echo ERROR: Dependencies not installed
    echo Please run install.bat first
    pause
    exit /b 1
)

echo Starting the server...
echo.
echo The application will be available at: http://localhost:3000
echo Default admin credentials: admin / admin123
echo.
echo Press Ctrl+C to stop the server
echo.

npm start

pause
