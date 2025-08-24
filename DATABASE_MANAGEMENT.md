# 📊 Database Management Guide

This comprehensive guide covers how to keep your attendance system database up-to-date and properly managed across different environments.

## 🎯 Overview

Your attendance system now includes a complete database management suite that handles:
- **Migrations**: Schema updates and versioning
- **Synchronization**: Keep local and production databases in sync
- **Backups**: Automated and manual backup systems
- **Monitoring**: Health checks and performance monitoring
- **Maintenance**: Optimization and cleanup tasks

## 🚀 Quick Start

### Initialize Database Management
```bash
# Set up the complete database management system
node db-manager.js init
```

### Check Database Status
```bash
# Get comprehensive status report
node db-manager.js status
```

### Update Database
```bash
# Update to latest schema version
node db-manager.js update
```

## 📋 Database Management Tools

### 1. Database Manager (db-manager.js)
**Main interface for all database operations**

```bash
# Initialize system
node db-manager.js init

# Update database
node db-manager.js update

# Sync with production
node db-manager.js sync to-production
node db-manager.js sync from-production

# Perform maintenance
node db-manager.js maintenance

# Get status report
node db-manager.js status

# Emergency recovery
node db-manager.js recover ./backups/backup-file.db

# Start automated management
node db-manager.js auto 60  # Monitor every 60 minutes
```

### 2. Migrations System (migrations.js)
**Handle database schema changes**

```bash
# Run all pending migrations
node migrations.js run

# Create new migration
node migrations.js create add_new_feature

# Check migration status
node migrations.js status

# Backup before migrations
node migrations.js backup
```

### 3. Synchronization System (db-sync.js)
**Keep databases in sync across environments**

```bash
# Sync local to production
node db-sync.js to-production

# Sync production to local
node db-sync.js from-production

# Check sync status
node db-sync.js status

# Backup database
node db-sync.js backup
```

### 4. Backup System (backup-system.js)
**Automated and manual backups**

```bash
# Create manual backup
node backup-system.js create manual

# List all backups
node backup-system.js list

# Restore from backup
node backup-system.js restore ./backups/backup-file.db

# Clean old backups
node backup-system.js clean

# Show backup statistics
node backup-system.js stats

# Start scheduled backups
node backup-system.js schedule
```

### 5. Database Monitor (db-monitor.js)
**Health monitoring and performance tracking**

```bash
# Run health check
node db-monitor.js check

# Start continuous monitoring
node db-monitor.js monitor 30  # Check every 30 minutes

# View monitoring logs
node db-monitor.js logs 100

# Show database statistics
node db-monitor.js stats
```

## 🔄 Keeping Your Database Up-to-Date

### For Development Environment

1. **Daily Workflow**
   ```bash
   # Check status
   node db-manager.js status
   
   # Update if needed
   node db-manager.js update
   
   # Create backup
   node backup-system.js create daily
   ```

2. **Before Making Changes**
   ```bash
   # Create backup
   node backup-system.js create pre-changes
   
   # Make your changes...
   
   # Run migrations if schema changed
   node migrations.js run
   ```

### For Production Environment

1. **Deployment Process**
   ```bash
   # 1. Backup production database
   node backup-system.js create pre-deployment
   
   # 2. Run migrations
   node migrations.js run
   
   # 3. Verify health
   node db-monitor.js check
   
   # 4. Create post-deployment backup
   node backup-system.js create post-deployment
   ```

2. **Regular Maintenance**
   ```bash
   # Weekly maintenance
   node db-manager.js maintenance
   
   # Monthly health check
   node db-monitor.js check
   ```

## 🔧 Environment-Specific Configurations

### Local Development
```bash
# Set environment variables
export NODE_ENV=development
export DATABASE_PATH=./attendance.db

# Initialize
node db-manager.js init
```

### Production Hosting
```bash
# Set environment variables
export NODE_ENV=production
export DATABASE_PATH=./data/attendance.db
export SESSION_SECRET=your-secure-secret

# Initialize with automated management
node db-manager.js init
node db-manager.js auto 60
```

## 📊 Database Schema Migrations

### Creating Migrations

1. **Create Migration File**
   ```bash
   node migrations.js create add_student_photo
   ```

2. **Edit Migration File** (in `migrations/` directory)
   ```sql
   -- Migration: add_student_photo
   -- Created: 2024-01-01T10:00:00.000Z
   
   ALTER TABLE students ADD COLUMN photo_url TEXT;
   CREATE INDEX IF NOT EXISTS idx_students_photo ON students(photo_url);
   ```

3. **Apply Migration**
   ```bash
   node migrations.js run
   ```

### Migration Best Practices

- **Always backup** before running migrations
- **Test migrations** in development first
- **Use transactions** for complex migrations
- **Create indexes** for new searchable columns
- **Document changes** in migration comments

## 🔄 Database Synchronization

### Sync Strategies

1. **Development to Production**
   ```bash
   # Full sync (structure + data)
   node db-sync.js to-production
   ```

2. **Production to Development**
   ```bash
   # Get latest production data
   node db-sync.js from-production
   ```

3. **Check Sync Status**
   ```bash
   node db-sync.js status
   ```

### Sync Safety

- **Automatic backups** before sync operations
- **Schema comparison** to detect conflicts
- **Rollback capability** if sync fails
- **Verification checks** after sync

## 💾 Backup Strategies

### Automated Backups

The system automatically creates:
- **Daily backups** at 2:00 AM
- **Weekly backups** at 3:00 AM on Sundays
- **Monthly backups** at 4:00 AM on the 1st

### Manual Backups

```bash
# Before important operations
node backup-system.js create pre-operation

# After major changes
node backup-system.js create post-changes

# Emergency backup
node backup-system.js create emergency
```

### Backup Retention

- **Daily backups**: Kept for 30 days
- **Weekly backups**: Kept for 12 weeks
- **Monthly backups**: Kept for 12 months
- **Manual backups**: Kept indefinitely

## 🔍 Database Monitoring

### Health Checks

The monitoring system checks:
- **Database connectivity**
- **Response times**
- **Disk space usage**
- **Database integrity**
- **Table statistics**

### Alerts and Thresholds

- **Response time** > 1 second: Warning
- **Database size** > 100MB: Warning
- **Free disk space** < 1GB: Critical
- **Integrity check** fails: Critical

### Monitoring Logs

```bash
# View recent logs
node db-monitor.js logs 50

# Continuous monitoring
node db-monitor.js monitor 30
```

## 🚨 Emergency Procedures

### Database Corruption

1. **Stop the application**
2. **Run integrity check**
   ```bash
   node db-monitor.js check
   ```
3. **Restore from backup**
   ```bash
   node db-manager.js recover ./backups/latest-backup.db
   ```

### Data Loss

1. **Identify last good backup**
   ```bash
   node backup-system.js list
   ```
2. **Restore from backup**
   ```bash
   node backup-system.js restore ./backups/backup-file.db
   ```
3. **Verify restoration**
   ```bash
   node db-monitor.js check
   ```

### Performance Issues

1. **Check database statistics**
   ```bash
   node db-monitor.js stats
   ```
2. **Run maintenance**
   ```bash
   node db-manager.js maintenance
   ```
3. **Monitor performance**
   ```bash
   node db-monitor.js monitor 15
   ```

## 🔧 Hosting Platform Integration

### Heroku

Add to your `Procfile`:
```
web: node server.js
worker: node db-manager.js auto 60
```

Set environment variables:
```bash
heroku config:set DATABASE_PATH=/app/data/attendance.db
heroku config:set NODE_ENV=production
```

### Railway/Render

Add to your deployment script:
```bash
# After deployment
node db-manager.js init
node db-manager.js auto 120
```

### Docker

Add to your `Dockerfile`:
```dockerfile
# Add cron for scheduled tasks
RUN apt-get update && apt-get install -y cron

# Copy database management scripts
COPY db-*.js migrations.js backup-system.js ./

# Start with database management
CMD ["sh", "-c", "node db-manager.js init && node server.js"]
```

## 📈 Performance Optimization

### Database Optimization

```bash
# Run optimization
node db-manager.js maintenance
```

This performs:
- **ANALYZE**: Update query planner statistics
- **VACUUM**: Reclaim unused space
- **Index optimization**: Rebuild indexes
- **Cleanup**: Remove temporary files

### Query Performance

- **Use indexes** for frequently searched columns
- **Limit result sets** with pagination
- **Use prepared statements** for repeated queries
- **Monitor slow queries** with logging

## 🔐 Security Considerations

### Backup Security

- **Encrypt backups** for sensitive data
- **Secure backup storage** location
- **Access control** for backup files
- **Regular backup testing**

### Database Security

- **Strong passwords** for database access
- **Connection encryption** in production
- **Regular security updates**
- **Access logging** and monitoring

## 📚 Troubleshooting

### Common Issues

1. **Migration Fails**
   ```bash
   # Check migration status
   node migrations.js status
   
   # Restore from backup
   node backup-system.js restore ./backups/pre-migration.db
   ```

2. **Sync Issues**
   ```bash
   # Check sync status
   node db-sync.js status
   
   # Force sync
   node db-sync.js to-production
   ```

3. **Performance Problems**
   ```bash
   # Check health
   node db-monitor.js check
   
   # Run maintenance
   node db-manager.js maintenance
   ```

### Getting Help

- Check the **monitoring logs** for errors
- Run **health checks** to identify issues
- Use **backup and restore** for recovery
- Review **database statistics** for insights

## 🎯 Best Practices Summary

1. **Always backup** before major operations
2. **Test changes** in development first
3. **Monitor database health** regularly
4. **Keep backups** in multiple locations
5. **Document changes** in migrations
6. **Automate routine tasks** with scheduling
7. **Monitor performance** and optimize regularly
8. **Have emergency procedures** ready

Your database is now equipped with enterprise-level management capabilities! 🚀