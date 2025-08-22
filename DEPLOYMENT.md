# Deployment Guide - Attendance Management System

## 🚀 Deploy to Render (Recommended - Free)

### Step 1: Prepare Your Repository
Your repository is already ready for deployment! The following files are properly configured:
- ✅ `package.json` with correct start script
- ✅ `server.js` using `process.env.PORT`
- ✅ All dependencies listed

### Step 2: Deploy to Render

1. **Go to Render.com**
   - Visit: https://render.com
   - Sign up/Login with your GitHub account

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `YashVardhanSingh-WD/Shias`

3. **Configure the Service**
   - **Name**: `attendance-system` (or any name you prefer)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Environment Variables** (Optional)
   - Add if needed: `NODE_ENV=production`

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy your app

### Step 3: Access Your App
- Your app will be available at: `https://your-app-name.onrender.com`
- The URL will be shown in your Render dashboard

---

## 🌐 Alternative Hosting Options

### Railway
1. Visit: https://railway.app
2. Connect GitHub repository
3. Deploy automatically

### Heroku
1. Visit: https://heroku.com
2. Create new app
3. Connect GitHub repository
4. Deploy

### Vercel
1. Visit: https://vercel.com
2. Import GitHub repository
3. Deploy

---

## 📝 Important Notes

### Database
- SQLite database will be created automatically
- Data will persist between deployments
- For production, consider using PostgreSQL

### File Uploads
- Uploaded files are stored locally
- For production, consider using cloud storage (AWS S3, etc.)

### Security
- Change default admin password after deployment
- Consider using environment variables for secrets

---

## 🔧 Troubleshooting

### Common Issues:
1. **Port Issues**: Your app uses `process.env.PORT` - this is correct
2. **Database**: SQLite will work on most platforms
3. **Dependencies**: All required packages are in `package.json`

### If Deployment Fails:
1. Check the build logs in your hosting platform
2. Ensure all dependencies are in `package.json`
3. Verify the start script is correct: `"start": "node server.js"`

---

## 🎉 Success!
Once deployed, your attendance system will be accessible online and can be used by students and administrators from anywhere!
