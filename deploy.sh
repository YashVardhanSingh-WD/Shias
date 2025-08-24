#!/bin/bash

# Attendance Management System Deployment Script

echo "🚀 Starting deployment process..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit - Attendance Management System"
fi

# Function to deploy to Heroku
deploy_heroku() {
    echo "🔧 Deploying to Heroku..."
    
    # Check if Heroku CLI is installed
    if ! command -v heroku &> /dev/null; then
        echo "❌ Heroku CLI not found. Please install it first."
        echo "   Download from: https://devcenter.heroku.com/articles/heroku-cli"
        exit 1
    fi
    
    # Login to Heroku
    echo "🔐 Please login to Heroku..."
    heroku login
    
    # Create app if it doesn't exist
    read -p "Enter your Heroku app name: " app_name
    heroku create $app_name 2>/dev/null || echo "App might already exist, continuing..."
    
    # Add Redis addon
    echo "📦 Adding Redis addon..."
    heroku addons:create heroku-redis:mini -a $app_name 2>/dev/null || echo "Redis addon might already exist"
    
    # Set environment variables
    echo "⚙️ Setting environment variables..."
    heroku config:set NODE_ENV=production -a $app_name
    heroku config:set SESSION_SECRET=$(openssl rand -base64 32) -a $app_name
    heroku config:set HTTPS=true -a $app_name
    
    read -p "Enter admin password (or press Enter for default): " admin_pass
    if [ ! -z "$admin_pass" ]; then
        heroku config:set DEFAULT_ADMIN_PASSWORD=$admin_pass -a $app_name
    fi
    
    # Deploy
    echo "🚀 Deploying to Heroku..."
    git add .
    git commit -m "Deploy to Heroku" 2>/dev/null || echo "No changes to commit"
    heroku git:remote -a $app_name
    git push heroku main
    
    # Open app
    echo "✅ Deployment completed!"
    echo "🌐 Opening your app..."
    heroku open -a $app_name
}

# Function to deploy with Docker
deploy_docker() {
    echo "🐳 Deploying with Docker..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker not found. Please install Docker first."
        exit 1
    fi
    
    # Build and run
    echo "🔨 Building Docker image..."
    docker build -t attendance-system .
    
    echo "🚀 Starting application with Docker Compose..."
    docker-compose up -d
    
    echo "✅ Application is running!"
    echo "🌐 Access your app at: http://localhost:3000"
}

# Main menu
echo "Choose deployment option:"
echo "1) Heroku (Recommended for beginners)"
echo "2) Docker (Local deployment)"
echo "3) Show deployment guide"
echo "4) Exit"

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        deploy_heroku
        ;;
    2)
        deploy_docker
        ;;
    3)
        echo "📖 Opening deployment guide..."
        if command -v code &> /dev/null; then
            code DEPLOYMENT_GUIDE.md
        else
            cat DEPLOYMENT_GUIDE.md
        fi
        ;;
    4)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid option. Please run the script again."
        exit 1
        ;;
esac