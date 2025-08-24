# 🚀 Database Management - Quick Reference

## **Most Common Commands You'll Use:**

### **🎯 Daily Tasks:**
```bash
# Check what's happening
node db-manager.js status

# Update database
node db-manager.js update

# Create backup
node backup-system.js create daily
```

### **🌐 Sync with Online:**
```bash
# Upload your data to production
node db-manager.js sync to-production

# Download production data to local
node db-manager.js sync from-production
```

### **💾 Backup Management:**
```bash
# List all backups
node backup-system.js list

# Create manual backup
node backup-system.js create manual

# Restore from backup
node backup-system.js restore ./backups/your-file.db
```

### **🔍 Health & Monitoring:**
```bash
# Quick health check
node db-monitor.js check

# See database statistics
node db-monitor.js stats
```

## **⚡ Easy Mode - Use the Menu:**

### **Windows:**
```bash
# Run the interactive menu
daily-db-tasks.bat
```

### **Linux/Mac:**
```bash
# Make executable and run
chmod +x daily-db-tasks.sh
./daily-db-tasks.sh
```

## **🔄 Automated Management:**

Set it and forget it:
```bash
# Start automated monitoring and backups
node db-manager.js auto 60
```

This automatically:
- ✅ Monitors every hour
- ✅ Daily backups at 2 AM
- ✅ Weekly backups on Sunday
- ✅ Monthly backups on 1st
- ✅ Cleans old backups

## **🚨 Emergency Commands:**

### **Something's Wrong:**
```bash
# Check what's wrong
node db-monitor.js check

# Run maintenance
node db-manager.js maintenance
```

### **Need to Restore:**
```bash
# List backups
node backup-system.js list

# Restore from backup
node db-manager.js recover ./backups/backup-file.db
```

## **📱 For Online Hosting:**

### **First Time Setup:**
```bash
# Initialize on your hosting platform
node db-manager.js init

# Start automated management
node db-manager.js auto 120
```

### **Regular Updates:**
```bash
# Before deployment
node backup-system.js create pre-deployment

# After deployment
node db-manager.js update
node db-monitor.js check
```

## **🎯 Workflow Examples:**

### **Starting Your Day:**
1. `node db-manager.js status` - Check status
2. `node db-manager.js update` - Apply updates
3. `node backup-system.js create daily` - Create backup

### **Before Making Changes:**
1. `node backup-system.js create pre-work` - Backup first
2. Make your changes...
3. `node db-manager.js update` - Apply schema changes
4. `node db-monitor.js check` - Verify health

### **Deploying to Production:**
1. `node backup-system.js create pre-deployment`
2. `node db-manager.js sync to-production`
3. `node db-monitor.js check`
4. `node backup-system.js create post-deployment`

### **Weekly Maintenance:**
1. `node db-manager.js maintenance` - Full maintenance
2. `node backup-system.js stats` - Check backup health

## **📊 Understanding Results:**

### **Status Meanings:**
- ✅ **healthy** - All good!
- ⚠️ **warning** - Minor issues, still working
- ❌ **unhealthy** - Problems, needs attention

### **Sync Status:**
- ✅ **in_sync** - Local and production match
- ⚠️ **out_of_sync** - Differences detected
- ❌ **error** - Sync problems

## **🔧 Troubleshooting:**

### **Database Won't Start:**
```bash
node db-monitor.js check
node db-manager.js recover ./backups/latest-backup.db
```

### **Sync Problems:**
```bash
node db-sync.js status
node db-sync.js to-production  # Force sync
```

### **Performance Issues:**
```bash
node db-manager.js maintenance
```

## **📞 Need Help?**

1. **Check logs:** Look in `logs/` directory
2. **Run health check:** `node db-monitor.js check`
3. **Check backups:** `node backup-system.js list`
4. **Try maintenance:** `node db-manager.js maintenance`

---

**Remember:** Always backup before making major changes! 💾