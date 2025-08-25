# Vercel + PlanetScale Deployment Guide

This guide will help you deploy your attendance system to Vercel with PlanetScale MySQL database for **permanent data storage** (no more 15-minute data loss like Render).

## 🌟 Why Vercel + PlanetScale?

✅ **Permanent Database**: PlanetScale provides 10GB MySQL storage (free tier)
✅ **Serverless**: Vercel handles scaling automatically
✅ **Global CDN**: Fast worldwide access
✅ **Zero Downtime**: No sleep mode issues
✅ **Professional**: Enterprise-grade reliability
✅ **Free Tier**: Generous limits for small to medium apps

## 📋 Prerequisites

- GitHub account
- Vercel account (free)
- PlanetScale account (free)
- Your attendance system code pushed to GitHub

## 🚀 Step-by-Step Deployment

### Step 1: Set Up PlanetScale Database

1. **Create PlanetScale Account**
   - Go to [planetscale.com](https://planetscale.com)
   - Sign up with GitHub account
   - Verify your email

2. **Create Database**
   - Click "New Database"
   - Name: `attendance-system`
   - Region: Choose closest to your users
   - Click "Create database"

3. **Get Connection String**
   - Go to your database dashboard
   - Click "Connect"
   - Select "Connect with: Node.js"
   - Copy the connection string (looks like: `mysql://username:password@host/database?ssl={"rejectUnauthorized":true}`)

### Step 2: Deploy to Vercel

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub account

2. **Import Project**
   - Click "New Project"
   - Import your GitHub repository
   - Select your attendance-system repo

3. **Configure Environment Variables**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add these variables:

   ```
   NODE_ENV=production
   DATABASE_URL=mysql://your-planetscale-connection-string
   SESSION_SECRET=your-super-secure-random-string-here
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your app
   - You'll get a URL like: `https://your-app.vercel.app`

### Step 3: Database Setup

Your app will automatically:
- Connect to PlanetScale MySQL
- Create all necessary tables
- Set up the default admin user
- Initialize the database schema

### Step 4: Test Your Deployment

1. **Visit Your App**
   - Go to your Vercel URL
   - You should see the attendance system homepage

2. **Test Admin Login**
   - Go to `/login`
   - Username: `admin`
   - Password: `admin123`

3. **Test Database Persistence**
   - Add some students and subjects
   - Take attendance
   - Wait 30 minutes and check - data will still be there!

## 🔧 Configuration Files Included

Your project now includes:

- `vercel.json` - Vercel deployment configuration
- `database-mysql.js` - MySQL database adapter
- `package.json` - Updated with MySQL dependencies

## 🌍 Environment Variables Reference

### Required Variables:
```bash
NODE_ENV=production
DATABASE_URL=mysql://username:password@host/database?ssl={"rejectUnauthorized":true}
SESSION_SECRET=your-secure-session-secret
```

### Optional Variables:
```bash
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
```

## 📊 Database Migration

If you have existing SQLite data:

1. **Export SQLite Data**
   ```bash
   sqlite3 attendance.db .dump > backup.sql
   ```

2. **Convert to MySQL Format**
   - Remove SQLite-specific syntax
   - Adjust data types if needed

3. **Import to PlanetScale**
   - Use PlanetScale CLI or web interface
   - Import your converted data

## 🔒 Security Best Practices

1. **Change Default Credentials**
   - Login as admin
   - Change username and password immediately

2. **Secure Session Secret**
   - Use a long, random string for SESSION_SECRET
   - Never commit secrets to Git

3. **Database Security**
   - PlanetScale handles SSL/TLS automatically
   - Connection strings are encrypted

## 📈 Performance Benefits

Compared to Render, you'll get:
- **100% Data Persistence** (no 15-minute resets)
- **Faster Response Times** (global CDN)
- **Better Uptime** (99.9% availability)
- **Automatic Scaling** (handles traffic spikes)
- **Professional Reliability**

## 💰 Cost Breakdown

### Free Tier Limits:
- **Vercel**: 100GB bandwidth, 100 deployments/month
- **PlanetScale**: 10GB storage, 1 billion row reads/month
- **Total Cost**: $0/month for most small to medium apps

### Paid Tiers (if needed):
- **Vercel Pro**: $20/month (more bandwidth, team features)
- **PlanetScale Scaler**: $29/month (more storage, branches)

## 🛠️ Troubleshooting

### Common Issues:

1. **Database Connection Error**
   - Check DATABASE_URL format
   - Ensure PlanetScale database is active
   - Verify connection string is correct

2. **Build Failures**
   - Check Node.js version compatibility
   - Ensure all dependencies are in package.json

3. **Session Issues**
   - Set SESSION_SECRET environment variable
   - Check cookie settings for HTTPS

### Getting Help:
- Vercel Documentation: [vercel.com/docs](https://vercel.com/docs)
- PlanetScale Documentation: [planetscale.com/docs](https://planetscale.com/docs)
- GitHub Issues: Create an issue in your repository

## 🎉 Success!

Your attendance system is now deployed with:
- ✅ Permanent database storage
- ✅ Global CDN delivery
- ✅ Automatic scaling
- ✅ Professional reliability
- ✅ Zero maintenance required

No more data loss every 15 minutes! Your attendance records are now safely stored in PlanetScale's MySQL database with enterprise-grade reliability.

## 🔄 Continuous Deployment

Every time you push to GitHub:
1. Vercel automatically detects changes
2. Builds and deploys your app
3. Updates your live site
4. Database remains persistent throughout

Your attendance system is now production-ready!