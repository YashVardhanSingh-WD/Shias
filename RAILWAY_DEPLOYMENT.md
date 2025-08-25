# Railway Deployment Guide

Railway is a superior alternative to Render with persistent database storage and no data loss issues.

## Why Railway is Better than Render:

✅ **Persistent Database**: Built-in PostgreSQL/MySQL with permanent storage
✅ **No Sleep Mode**: Your app stays active 24/7
✅ **Better Performance**: Faster response times and reliability
✅ **$5/month Credit**: Free tier with generous limits
✅ **Easy Migration**: Simple GitHub integration
✅ **Auto-scaling**: Handles traffic spikes automatically

## Deployment Steps:

### 1. Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub account
3. Connect your GitHub repository

### 2. Deploy Your App
1. Click "New Project" → "Deploy from GitHub repo"
2. Select your attendance-system repository
3. Railway will automatically detect Node.js and deploy

### 3. Add Database
1. In your Railway project dashboard
2. Click "New" → "Database" ��� "Add PostgreSQL"
3. Railway will create a persistent database instance

### 4. Environment Variables
Set these in Railway dashboard under "Variables":
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://... (auto-provided by Railway)
SESSION_SECRET=your-secret-key
```

### 5. Database Migration
Railway will automatically:
- Install dependencies
- Run your app with persistent storage
- Keep your data safe permanently

## Key Advantages:

- **No 15-minute data loss**: Your SQLite database persists forever
- **Better uptime**: 99.9% availability vs Render's sleep issues
- **Faster deployment**: Usually under 2 minutes
- **Built-in monitoring**: Real-time logs and metrics
- **Custom domains**: Free HTTPS certificates

## Migration from Render:

1. Export your current data (if any exists)
2. Push your code to GitHub
3. Deploy to Railway following steps above
4. Import your data to the new persistent database

Your attendance system will now have:
- Permanent data storage
- Better performance
- No more 15-minute resets
- Professional reliability

## Cost Comparison:

- **Render**: Free tier with major limitations + data loss
- **Railway**: $5/month credit (usually covers small apps) + persistent storage
- **Value**: Railway provides enterprise-grade reliability for the same cost

## Support:
- Railway has excellent documentation and community support
- Much more reliable than Render's free tier
- Professional-grade infrastructure