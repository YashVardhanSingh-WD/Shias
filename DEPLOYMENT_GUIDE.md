# Attendance Management System - Deployment Guide

This guide covers multiple deployment options for your Attendance Management System with persistent database storage.

## 🚀 Deployment Options

### Option 1: Heroku (Recommended for beginners)

1. **Install Heroku CLI**
   ```bash
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   heroku create your-attendance-system
   ```

4. **Add Redis Add-on (for sessions)**
   ```bash
   heroku addons:create heroku-redis:mini
   ```

5. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
   heroku config:set DEFAULT_ADMIN_PASSWORD=your-secure-password
   ```

6. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy attendance system"
   git push heroku main
   ```

7. **Open your app**
   ```bash
   heroku open
   ```

### Option 2: Railway

1. **Connect GitHub Repository**
   - Go to [Railway.app](https://railway.app)
   - Connect your GitHub account
   - Import this repository

2. **Set Environment Variables**
   ```
   NODE_ENV=production
   SESSION_SECRET=your-super-secure-session-secret
   DEFAULT_ADMIN_PASSWORD=your-secure-password
   ```

3. **Deploy automatically** - Railway will deploy on every push to main branch

### Option 3: Render

1. **Create Web Service**
   - Go to [Render.com](https://render.com)
   - Connect your GitHub repository
   - Choose "Web Service"

2. **Configuration**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: Node

3. **Environment Variables**
   ```
   NODE_ENV=production
   SESSION_SECRET=your-super-secure-session-secret
   DEFAULT_ADMIN_PASSWORD=your-secure-password
   ```

### Option 4: DigitalOcean App Platform

1. **Create App**
   - Go to DigitalOcean App Platform
   - Connect your GitHub repository

2. **App Configuration**
   ```yaml
   name: attendance-system
   services:
   - name: web
     source_dir: /
     github:
       repo: your-username/attendance-system
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: NODE_ENV
       value: production
     - key: SESSION_SECRET
       value: your-super-secure-session-secret
   ```

### Option 5: Docker Deployment

1. **Build and Run with Docker**
   ```bash
   # Build the image
   docker build -t attendance-system .
   
   # Run with docker-compose (includes Redis)
   docker-compose up -d
   ```

2. **Or run standalone**
   ```bash
   docker run -d \
     -p 3000:3000 \
     -v $(pwd)/data:/app/data \
     -v $(pwd)/uploads:/app/uploads \
     -e NODE_ENV=production \
     -e SESSION_SECRET=your-secret \
     attendance-system
   ```

### Option 6: VPS/Cloud Server

1. **Server Setup** (Ubuntu/Debian)
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Deploy Application**
   ```bash
   # Clone repository
   git clone https://github.com/your-username/attendance-system.git
   cd attendance-system
   
   # Install dependencies
   npm install --production
   
   # Create environment file
   cp .env.example .env
   # Edit .env with your settings
   
   # Start with PM2
   pm2 start server.js --name "attendance-system"
   pm2 startup
   pm2 save
   ```

3. **Setup Nginx (optional)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 📊 Database Persistence

### SQLite (Current Setup)
- **Pros**: Simple, no external dependencies, good for small-medium deployments
- **Cons**: Single file, not suitable for high-traffic applications
- **Storage**: File-based (`data/attendance.db`)

### Upgrading to PostgreSQL (Recommended for production)

1. **Add PostgreSQL dependency**
   ```bash
   npm install pg
   ```

2. **Update database configuration** (create `database-postgres.js`)
   ```javascript
   const { Pool } = require('pg');
   
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
   });
   ```

3. **Add PostgreSQL to your hosting platform**
   - **Heroku**: `heroku addons:create heroku-postgresql:mini`
   - **Railway**: Add PostgreSQL service
   - **Render**: Add PostgreSQL database

## 🔒 Security Considerations

1. **Change Default Credentials**
   ```bash
   # Set secure admin password
   heroku config:set DEFAULT_ADMIN_PASSWORD=your-very-secure-password
   ```

2. **Use Strong Session Secret**
   ```bash
   # Generate secure session secret
   heroku config:set SESSION_SECRET=$(openssl rand -base64 64)
   ```

3. **Enable HTTPS**
   ```bash
   heroku config:set HTTPS=true
   ```

## 📁 File Storage

### Local Storage (Current)
- Files stored in `uploads/` directory
- Works for single-server deployments

### Cloud Storage (Recommended for production)
- **AWS S3**: Add `aws-sdk` and configure S3 bucket
- **Cloudinary**: Add `cloudinary` for image management
- **Google Cloud Storage**: Add `@google-cloud/storage`

## 🔄 Backup Strategy

### Automated Backups
```bash
# Add to crontab for daily backups
0 2 * * * /path/to/backup-script.sh
```

### Backup Script Example
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /app/data/attendance.db /backups/attendance_$DATE.db
# Upload to cloud storage
```

## 📈 Monitoring

### Health Checks
- All deployment options include health check endpoints
- Monitor `/api/session/check` for application status

### Logging
- Application logs available through platform dashboards
- Use structured logging for production

## 🚀 Quick Start Commands

### Heroku One-Click Deploy
```bash
# Clone and deploy in one command
git clone https://github.com/your-username/attendance-system.git
cd attendance-system
heroku create your-app-name
git push heroku main
```

### Railway One-Click Deploy
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/your-username/attendance-system)

### Render One-Click Deploy
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/your-username/attendance-system)

## 📞 Support

After deployment, your application will be available with:
- **Admin Panel**: `https://your-app.com/admin`
- **Student Portal**: `https://your-app.com/student`
- **Default Admin**: username: `admin`, password: `admin123` (change immediately!)

## 🔧 Troubleshooting

### Common Issues
1. **Database not found**: Ensure `data/` directory exists and is writable
2. **Session issues**: Verify `SESSION_SECRET` is set
3. **File upload fails**: Check `uploads/` directory permissions
4. **Port binding**: Ensure `PORT` environment variable is set correctly

### Debug Mode
```bash
# Enable debug logging
heroku config:set NODE_ENV=development
```

Choose the deployment option that best fits your needs and technical expertise!