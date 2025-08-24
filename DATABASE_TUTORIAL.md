# 🎓 Database Management Tutorial - Step by Step

This is your **practical guide** to keeping your attendance system database up-to-date and properly managed.

## 🚀 **STEP 1: Initialize Your Database System**

First, let's set up everything:

```bash
# Initialize the complete database management system
node db-manager.js init
```

**What this does:**
- ✅ Creates all database tables
- ✅ Sets up indexes for fast queries
- ✅ Creates the default admin user
- ✅ Creates initial backup
- ✅ Runs health check

## 📊 **STEP 2: Check Your Database Status**

Always start by checking what's happening:

```bash
# Get a complete status report
node db-manager.js status
```

**This shows you:**
- Database size and record counts
- Backup information
- Health status
- Last update time

## 🔄 **STEP 3: Daily Database Updates**

### **For Local Development:**

```bash
# Check if updates are needed
node db-manager.js status

# Apply any updates
node db-manager.js update

# Create a backup after changes
node backup-system.js create daily
```

### **For Production/Online Hosting:**

```bash
# 1. Create backup before changes
node backup-system.js create pre-update

# 2. Apply updates
node db-manager.js update

# 3. Verify everything is working
node db-monitor.js check

# 4. Create backup after updates
node backup-system.js create post-update
```

## 🌐 **STEP 4: Sync Between Local and Online**

### **Push Your Local Data to Production:**

```bash
# Sync your local database to production
node db-manager.js sync to-production
```

### **Get Latest Data from Production:**

```bash
# Sync production database to your local
node db-manager.js sync from-production
```

### **Check Sync Status:**

```bash
# See if databases are in sync
node db-sync.js status
```

## 💾 **STEP 5: Backup Management**

### **Create Manual Backups:**

```bash
# Before making important changes
node backup-system.js create pre-changes

# After completing work
node backup-system.js create completed

# Emergency backup
node backup-system.js create emergency
```

### **View Your Backups:**

```bash
# List all backup files
node backup-system.js list

# Show backup statistics
node backup-system.js stats
```

### **Restore from Backup:**

```bash
# Restore database from a backup file
node backup-system.js restore ./backups/your-backup-file.db
```

## 🔍 **STEP 6: Monitor Database Health**

### **Quick Health Check:**

```bash
# Check if database is healthy
node db-monitor.js check
```

### **View Database Statistics:**

```bash
# See how many records you have
node db-monitor.js stats
```

### **Continuous Monitoring:**

```bash
# Monitor every 30 minutes
node db-monitor.js monitor 30
```

## ⚡ **STEP 7: Automated Management (Recommended)**

Set up automated management so you don't have to do everything manually:

```bash
# Start automated system (monitors every 60 minutes)
node db-manager.js auto 60
```

**This automatically:**
- ✅ Monitors database health every hour
- ✅ Creates daily backups at 2 AM
- ✅ Creates weekly backups on Sundays
- ✅ Cleans old backups (keeps 30 days)
- ✅ Logs all activities

## 🛠️ **STEP 8: Database Maintenance**

Run this weekly or monthly:

```bash
# Perform complete maintenance
node db-manager.js maintenance
```

**This does:**
- ✅ Health check
- ✅ Database optimization
- ✅ Cleanup old files
- ✅ Create maintenance backup
- ✅ Update statistics

## 🚨 **STEP 9: Emergency Recovery**

If something goes wrong:

```bash
# 1. List available backups
node backup-system.js list

# 2. Restore from the latest good backup
node db-manager.js recover ./backups/your-backup-file.db

# 3. Verify recovery worked
node db-monitor.js check
```

## 📱 **STEP 10: For Online Hosting**

### **Heroku Setup:**

1. **Add to your Procfile:**
   ```
   web: node server.js
   worker: node db-manager.js auto 120
   ```

2. **Set environment variables:**
   ```bash
   heroku config:set DATABASE_PATH=/app/data/attendance.db
   heroku config:set NODE_ENV=production
   ```

3. **Deploy and initialize:**
   ```bash
   git push heroku main
   heroku run node db-manager.js init
   ```

### **Railway/Render Setup:**

1. **Add to your start script in package.json:**
   ```json
   {
     "scripts": {
       "start": "node db-manager.js init && node db-manager.js auto 120 & node server.js"
     }
   }
   ```

2. **Set environment variables in your hosting dashboard:**
   ```
   NODE_ENV=production
   DATABASE_PATH=./data/attendance.db
   ```

## 📋 **Daily Workflow Examples**

### **For Developers:**

```bash
# Morning routine
node db-manager.js status          # Check status
node db-manager.js update          # Apply updates
node backup-system.js create daily # Create backup

# Before making changes
node backup-system.js create pre-work

# After making changes
node db-manager.js update          # Apply any schema changes
node db-monitor.js check           # Verify health

# End of day
node backup-system.js create end-of-day
```

### **For Production:**

```bash
# Weekly maintenance
node db-manager.js maintenance

# Before deployment
node backup-system.js create pre-deployment
node db-manager.js update
node db-monitor.js check

# After deployment
node backup-system.js create post-deployment
```

## 🔧 **Troubleshooting Common Issues**

### **Database Won't Start:**

```bash
# Check what's wrong
node db-monitor.js check

# Try recovery
node db-manager.js recover ./backups/latest-backup.db
```

### **Sync Problems:**

```bash
# Check sync status
node db-sync.js status

# Force sync
node db-sync.js to-production
```

### **Performance Issues:**

```bash
# Run maintenance
node db-manager.js maintenance

# Check statistics
node db-monitor.js stats
```

## 📊 **Understanding the Output**

### **Status Report Example:**
```json
{
  "database": {
    "totalRecords": 150,
    "tables": {
      "students": 25,
      "subjects": 5,
      "attendance": 120
    }
  },
  "health": {
    "overall": "healthy",
    "connectivity": "healthy",
    "integrity": "healthy"
  },
  "backups": {
    "total": 10,
    "totalSize": "2.5 MB"
  }
}
```

### **Health Check Results:**
- ✅ **healthy** - Everything is working fine
- ⚠️ **warning** - Minor issues, but functional
- ❌ **unhealthy** - Serious problems, needs attention

## 🎯 **Quick Reference Commands**

| Task | Command |
|------|---------|
| Initialize | `node db-manager.js init` |
| Check Status | `node db-manager.js status` |
| Update Database | `node db-manager.js update` |
| Sync to Production | `node db-manager.js sync to-production` |
| Sync from Production | `node db-manager.js sync from-production` |
| Create Backup | `node backup-system.js create manual` |
| List Backups | `node backup-system.js list` |
| Health Check | `node db-monitor.js check` |
| Start Auto Management | `node db-manager.js auto 60` |
| Maintenance | `node db-manager.js maintenance` |
| Emergency Recovery | `node db-manager.js recover backup-file.db` |

## 🎉 **You're All Set!**

Your database management system is now ready to keep your attendance system data:
- ✅ **Always up-to-date**
- ✅ **Always backed up**
- ✅ **Always monitored**
- ✅ **Always optimized**

Start with: `node db-manager.js init` and you're good to go! 🚀