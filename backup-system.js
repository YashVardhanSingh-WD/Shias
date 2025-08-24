const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

/**
 * Automated Backup System
 * Handles scheduled backups and retention policies
 */
class BackupSystem {
    constructor(options = {}) {
        this.dbPath = options.dbPath || path.join(__dirname, 'data', 'attendance.db');
        this.backupDir = options.backupDir || path.join(__dirname, 'backups');
        this.uploadsDir = options.uploadsDir || path.join(__dirname, 'uploads');
        this.retentionDays = options.retentionDays || 30;
        this.schedules = {
            daily: '0 2 * * *',     // 2 AM daily
            weekly: '0 3 * * 0',    // 3 AM every Sunday
            monthly: '0 4 1 * *'    // 4 AM first day of month
        };
        this.tasks = [];
    }

    // Ensure backup directory exists
    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
            console.log(`[INFO] Created backup directory: ${this.backupDir}`);
        }
    }

    // Create database backup
    async createDatabaseBackup(suffix = '') {
        return new Promise((resolve, reject) => {
            this.ensureBackupDirectory();
            
            if (!fs.existsSync(this.dbPath)) {
                reject(new Error(`Database file not found: ${this.dbPath}`));
                return;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `attendance_db_${timestamp}${suffix}.db`;
            const backupPath = path.join(this.backupDir, filename);

            const readStream = fs.createReadStream(this.dbPath);
            const writeStream = fs.createWriteStream(backupPath);

            readStream.pipe(writeStream);

            writeStream.on('finish', () => {
                console.log(`[INFO] Database backup created: ${filename}`);
                resolve(backupPath);
            });

            writeStream.on('error', (err) => {
                console.error('[ERROR] Database backup failed:', err);
                reject(err);
            });
        });
    }

    // Create uploads backup (zip all uploaded files)
    async createUploadsBackup(suffix = '') {
        return new Promise((resolve, reject) => {
            this.ensureBackupDirectory();
            
            if (!fs.existsSync(this.uploadsDir)) {
                console.log('[WARN] Uploads directory not found, skipping uploads backup');
                resolve(null);
                return;
            }

            const archiver = require('archiver');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `attendance_uploads_${timestamp}${suffix}.zip`;
            const backupPath = path.join(this.backupDir, filename);

            const output = fs.createWriteStream(backupPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                console.log(`[INFO] Uploads backup created: ${filename} (${archive.pointer()} bytes)`);
                resolve(backupPath);
            });

            archive.on('error', (err) => {
                console.error('[ERROR] Uploads backup failed:', err);
                reject(err);
            });

            archive.pipe(output);
            archive.directory(this.uploadsDir, false);
            archive.finalize();
        });
    }

    // Create complete system backup
    async createCompleteBackup(type = 'manual') {
        try {
            console.log(`[INFO] Starting ${type} backup...`);
            
            const suffix = `_${type}`;
            const results = {
                timestamp: new Date().toISOString(),
                type: type,
                database: null,
                uploads: null,
                success: false
            };

            // Backup database
            try {
                results.database = await this.createDatabaseBackup(suffix);
            } catch (error) {
                console.error('[ERROR] Database backup failed:', error);
                throw error;
            }

            // Backup uploads (optional, don't fail if archiver not available)
            try {
                results.uploads = await this.createUploadsBackup(suffix);
            } catch (error) {
                console.warn('[WARN] Uploads backup failed (archiver may not be installed):', error.message);
                results.uploads = null;
            }

            results.success = true;
            console.log(`[INFO] ${type} backup completed successfully`);
            
            // Clean old backups
            await this.cleanOldBackups();
            
            return results;

        } catch (error) {
            console.error(`[ERROR] ${type} backup failed:`, error);
            throw error;
        }
    }

    // Clean old backup files based on retention policy
    async cleanOldBackups() {
        try {
            if (!fs.existsSync(this.backupDir)) {
                return;
            }

            const files = fs.readdirSync(this.backupDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

            let deletedCount = 0;

            files.forEach(file => {
                const filePath = path.join(this.backupDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`[INFO] Deleted old backup: ${file}`);
                }
            });

            if (deletedCount > 0) {
                console.log(`[INFO] Cleaned ${deletedCount} old backup files`);
            }

        } catch (error) {
            console.error('[ERROR] Failed to clean old backups:', error);
        }
    }

    // List all backup files
    listBackups() {
        if (!fs.existsSync(this.backupDir)) {
            console.log('[INFO] No backups directory found');
            return [];
        }

        const files = fs.readdirSync(this.backupDir)
            .map(file => {
                const filePath = path.join(this.backupDir, file);
                const stats = fs.statSync(filePath);
                return {
                    filename: file,
                    path: filePath,
                    size: stats.size,
                    created: stats.mtime,
                    type: file.includes('_db_') ? 'database' : 
                          file.includes('_uploads_') ? 'uploads' : 'unknown'
                };
            })
            .sort((a, b) => b.created - a.created);

        return files;
    }

    // Restore database from backup
    async restoreDatabase(backupPath) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(backupPath)) {
                reject(new Error(`Backup file not found: ${backupPath}`));
                return;
            }

            // Create backup of current database before restore
            const currentBackupPath = this.dbPath + '.before_restore';
            if (fs.existsSync(this.dbPath)) {
                fs.copyFileSync(this.dbPath, currentBackupPath);
                console.log(`[INFO] Current database backed up to: ${currentBackupPath}`);
            }

            // Restore from backup
            const readStream = fs.createReadStream(backupPath);
            const writeStream = fs.createWriteStream(this.dbPath);

            readStream.pipe(writeStream);

            writeStream.on('finish', () => {
                console.log(`[INFO] Database restored from: ${backupPath}`);
                resolve();
            });

            writeStream.on('error', (err) => {
                console.error('[ERROR] Database restore failed:', err);
                
                // Try to restore original if it exists
                if (fs.existsSync(currentBackupPath)) {
                    fs.copyFileSync(currentBackupPath, this.dbPath);
                    console.log('[INFO] Original database restored after failed restore');
                }
                
                reject(err);
            });
        });
    }

    // Start automated backup schedules
    startScheduledBackups() {
        console.log('[INFO] Starting automated backup schedules...');

        // Daily backup
        const dailyTask = cron.schedule(this.schedules.daily, () => {
            this.createCompleteBackup('daily').catch(console.error);
        }, { scheduled: false });

        // Weekly backup
        const weeklyTask = cron.schedule(this.schedules.weekly, () => {
            this.createCompleteBackup('weekly').catch(console.error);
        }, { scheduled: false });

        // Monthly backup
        const monthlyTask = cron.schedule(this.schedules.monthly, () => {
            this.createCompleteBackup('monthly').catch(console.error);
        }, { scheduled: false });

        this.tasks = [dailyTask, weeklyTask, monthlyTask];
        this.tasks.forEach(task => task.start());

        console.log('[INFO] Automated backup schedules started');
        console.log(`[INFO] Daily backups: ${this.schedules.daily}`);
        console.log(`[INFO] Weekly backups: ${this.schedules.weekly}`);
        console.log(`[INFO] Monthly backups: ${this.schedules.monthly}`);
    }

    // Stop automated backup schedules
    stopScheduledBackups() {
        this.tasks.forEach(task => task.stop());
        this.tasks = [];
        console.log('[INFO] Automated backup schedules stopped');
    }

    // Get backup statistics
    getBackupStats() {
        const backups = this.listBackups();
        const stats = {
            total: backups.length,
            totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
            byType: {},
            oldest: null,
            newest: null
        };

        if (backups.length > 0) {
            stats.oldest = backups[backups.length - 1].created;
            stats.newest = backups[0].created;
            
            stats.byType = backups.reduce((acc, backup) => {
                acc[backup.type] = (acc[backup.type] || 0) + 1;
                return acc;
            }, {});
        }

        return stats;
    }
}

module.exports = BackupSystem;

// CLI interface
if (require.main === module) {
    const command = process.argv[2];
    const backup = new BackupSystem();

    switch (command) {
        case 'create':
            const type = process.argv[3] || 'manual';
            backup.createCompleteBackup(type)
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;

        case 'list':
            const backups = backup.listBackups();
            console.log(`Found ${backups.length} backup files:`);
            backups.forEach(b => {
                const size = (b.size / 1024 / 1024).toFixed(2);
                console.log(`  ${b.filename} (${size} MB, ${b.created.toISOString()})`);
            });
            break;

        case 'restore':
            const backupPath = process.argv[3];
            if (!backupPath) {
                console.error('Usage: node backup-system.js restore <backup-file-path>');
                process.exit(1);
            }
            backup.restoreDatabase(backupPath)
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;

        case 'clean':
            backup.cleanOldBackups()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;

        case 'stats':
            const stats = backup.getBackupStats();
            console.log('Backup Statistics:');
            console.log(`  Total backups: ${stats.total}`);
            console.log(`  Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
            console.log(`  By type:`, stats.byType);
            if (stats.newest) {
                console.log(`  Newest: ${stats.newest.toISOString()}`);
                console.log(`  Oldest: ${stats.oldest.toISOString()}`);
            }
            break;

        case 'schedule':
            backup.startScheduledBackups();
            console.log('Scheduled backups started. Press Ctrl+C to stop.');
            process.on('SIGINT', () => {
                backup.stopScheduledBackups();
                process.exit(0);
            });
            break;

        default:
            console.log(`
Automated Backup System

Usage:
  node backup-system.js create [type]    - Create backup (manual/daily/weekly/monthly)
  node backup-system.js list             - List all backups
  node backup-system.js restore <path>   - Restore database from backup
  node backup-system.js clean            - Clean old backups
  node backup-system.js stats            - Show backup statistics
  node backup-system.js schedule         - Start scheduled backups

Examples:
  node backup-system.js create daily
  node backup-system.js list
  node backup-system.js restore ./backups/attendance_db_2024-01-01T10-00-00_daily.db
            `);
    }
}