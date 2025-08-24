@echo off
echo 🎓 Attendance System - Daily Database Tasks
echo.

:menu
echo Choose what you want to do:
echo.
echo 1) Check database status
echo 2) Update database
echo 3) Create backup
echo 4) Sync to production (online)
echo 5) Sync from production (get latest data)
echo 6) View backups
echo 7) Health check
echo 8) Start automated management
echo 9) Maintenance (weekly/monthly)
echo 0) Exit
echo.

set /p choice="Enter your choice (0-9): "

if "%choice%"=="1" goto status
if "%choice%"=="2" goto update
if "%choice%"=="3" goto backup
if "%choice%"=="4" goto sync_to
if "%choice%"=="5" goto sync_from
if "%choice%"=="6" goto list_backups
if "%choice%"=="7" goto health
if "%choice%"=="8" goto auto
if "%choice%"=="9" goto maintenance
if "%choice%"=="0" goto exit
goto invalid

:status
echo 📊 Checking database status...
node db-manager.js status
echo.
pause
goto menu

:update
echo 🔄 Updating database...
node db-manager.js update
echo.
pause
goto menu

:backup
echo 💾 Creating backup...
node backup-system.js create manual
echo.
pause
goto menu

:sync_to
echo 🌐 Syncing to production...
echo ⚠️  This will upload your local data to production
set /p confirm="Are you sure? (y/n): "
if /i "%confirm%"=="y" (
    node db-manager.js sync to-production
) else (
    echo Cancelled.
)
echo.
pause
goto menu

:sync_from
echo 🌐 Syncing from production...
echo ⚠️  This will download production data to local
set /p confirm="Are you sure? (y/n): "
if /i "%confirm%"=="y" (
    node db-manager.js sync from-production
) else (
    echo Cancelled.
)
echo.
pause
goto menu

:list_backups
echo 💾 Your backups:
node backup-system.js list
echo.
node backup-system.js stats
echo.
pause
goto menu

:health
echo 🔍 Running health check...
node db-monitor.js check
echo.
pause
goto menu

:auto
echo ⚡ Starting automated management...
echo This will run in the background and monitor your database.
echo Press Ctrl+C to stop when needed.
echo.
node db-manager.js auto 60
pause
goto menu

:maintenance
echo 🛠️ Running maintenance...
echo This includes optimization, cleanup, and health checks.
node db-manager.js maintenance
echo.
pause
goto menu

:invalid
echo ❌ Invalid choice. Please try again.
echo.
pause
goto menu

:exit
echo 👋 Goodbye!
pause