@echo off
echo 🚀 Attendance Management System Deployment

echo.
echo Choose deployment option:
echo 1) Start local server
echo 2) Deploy to Heroku
echo 3) Build Docker image
echo 4) Show deployment guide
echo 5) Exit

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto local
if "%choice%"=="2" goto heroku
if "%choice%"=="3" goto docker
if "%choice%"=="4" goto guide
if "%choice%"=="5" goto exit
goto invalid

:local
echo 🔧 Starting local server...
npm install
npm start
goto end

:heroku
echo 🔧 Deploying to Heroku...
echo Please make sure Heroku CLI is installed
echo Download from: https://devcenter.heroku.com/articles/heroku-cli
echo.
pause
heroku login
set /p appname="Enter your Heroku app name: "
heroku create %appname%
heroku addons:create heroku-redis:mini -a %appname%
heroku config:set NODE_ENV=production -a %appname%
heroku config:set HTTPS=true -a %appname%
git add .
git commit -m "Deploy to Heroku"
heroku git:remote -a %appname%
git push heroku main
heroku open -a %appname%
goto end

:docker
echo 🐳 Building Docker image...
docker build -t attendance-system .
echo 🚀 Starting with Docker Compose...
docker-compose up -d
echo ✅ Application is running at http://localhost:3000
goto end

:guide
echo 📖 Opening deployment guide...
start DEPLOYMENT_GUIDE.md
goto end

:invalid
echo ❌ Invalid option. Please run the script again.
goto end

:exit
echo 👋 Goodbye!

:end
pause