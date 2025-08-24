const DatabaseMigrations = require('./migrations');
const DatabaseSync = require('./db-sync');
const BackupSystem = require('./backup-system');
const DatabaseMonitor = require('./db-monitor');

/**
 * Comprehensive Database Management System
 * Combines all database management tools into one interface
 */
class DatabaseManager {
    constructor(options = {}) {
        this.dbPath = options.dbPath || './data/attendance.db';
        this.migrations = new DatabaseMigrations(this.dbPath);
        this.sync = new DatabaseSync(options);
        this.backup = new BackupSystem(options);
        this.monitor = new DatabaseMonitor(options);
    }

    // Initialize database with all necessary setup
    async initialize() {
        console.log('[INFO] Initializing database management system...');
        
        try {
            // Run migrations
            console.log('[INFO] Running database migrations...');
            await this.migrations.runMigrations();
            
            // Create initial backup
            console.log('[INFO] Creating initial backup...');
            await this.backup.createCompleteBackup('initialization');
            
            // Run health check
            console.log('[INFO] Running initial health check...');
            const healthCheck = await this.monitor.runHealthCheck();
            
            if (healthCheck.overall === 'unhealthy') {
                throw new Error('Database health check failed');
            }
            
            console.log('[INFO] Database management system initialized successfully');
            return true;
            
        } catch (error) {
            console.error('[ERROR] Database initialization failed:', error);
            throw error;
        }
    }

    // Update database to latest version
    async updateDatabase() {
        console.log('[INFO] Updating database to latest version...');
        
        try {
            // Create backup before update
            console.log('[INFO] Creating pre-update backup...');
            await this.backup.createCompleteBackup('pre-update');
            
            // Run migrations
            console.log('[INFO] Applying database migrations...');
            await this.migrations.runMigrations();
            
            // Verify integrity after update
            console.log('[INFO] Verifying database integrity...');
            const integrityCheck = await this.monitor.checkIntegrity();
            
            if (integrityCheck.status !== 'healthy') {
                throw new Error('Database integrity check failed after update');
            }
            
            // Create post-update backup
            console.log('[INFO] Creating post-update backup...');
            await this.backup.createCompleteBackup('post-update');
            
            console.log('[INFO] Database update completed successfully');
            return true;
            
        } catch (error) {
            console.error('[ERROR] Database update failed:', error);
            throw error;
        }
    }

    // Sync database with production
    async syncWithProduction(direction = 'to-production') {
        console.log(`[INFO] Syncing database ${direction}...`);
        
        try {
            // Create backup before sync
            console.log('[INFO] Creating pre-sync backup...');
            await this.backup.createCompleteBackup('pre-sync');
            
            // Perform sync
            if (direction === 'to-production') {
                await this.sync.syncToProduction();
            } else {
                await this.sync.syncFromProduction();
            }
            
            // Verify after sync
            console.log('[INFO] Verifying sync results...');
            const syncStatus = await this.sync.checkSyncStatus();
            
            if (syncStatus.status === 'error') {
                throw new Error('Sync verification failed');
            }
            
            // Create post-sync backup
            console.log('[INFO] Creating post-sync backup...');
            await this.backup.createCompleteBackup('post-sync');
            
            console.log('[INFO] Database sync completed successfully');
            return syncStatus;
            
        } catch (error) {
            console.error('[ERROR] Database sync failed:', error);
            throw error;
        }
    }

    // Perform maintenance tasks
    async performMaintenance() {
        console.log('[INFO] Performing database maintenance...');
        
        try {
            const maintenanceResults = {
                timestamp: new Date().toISOString(),
                tasks: {}
            };
            
            // Health check
            console.log('[INFO] Running health check...');
            maintenanceResults.tasks.healthCheck = await this.monitor.runHealthCheck();
            
            // Clean old backups
            console.log('[INFO] Cleaning old backups...');
            await this.backup.cleanOldBackups();
            maintenanceResults.tasks.backupCleanup = { status: 'completed' };
            
            // Create maintenance backup
            console.log('[INFO] Creating maintenance backup...');
            maintenanceResults.tasks.backup = await this.backup.createCompleteBackup('maintenance');
            
            // Database statistics
            console.log('[INFO] Gathering database statistics...');
            maintenanceResults.tasks.statistics = await this.monitor.getDatabaseStats();
            
            // Optimize database (SQLite specific)
            console.log('[INFO] Optimizing database...');
            await this.optimizeDatabase();
            maintenanceResults.tasks.optimization = { status: 'completed' };
            
            console.log('[INFO] Database maintenance completed successfully');
            return maintenanceResults;
            
        } catch (error) {
            console.error('[ERROR] Database maintenance failed:', error);
            throw error;
        }
    }

    // Optimize database performance
    async optimizeDatabase() {
        return new Promise((resolve, reject) => {
            const sqlite3 = require('sqlite3').verbose();
            const db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                db.serialize(() => {
                    // Analyze tables for query optimization
                    db.run('ANALYZE', (analyzeErr) => {
                        if (analyzeErr) {
                            console.warn('[WARN] Database ANALYZE failed:', analyzeErr);
                        } else {
                            console.log('[INFO] Database analysis completed');
                        }
                    });

                    // Vacuum database to reclaim space
                    db.run('VACUUM', (vacuumErr) => {
                        db.close();
                        
                        if (vacuumErr) {
                            console.warn('[WARN] Database VACUUM failed:', vacuumErr);
                            reject(vacuumErr);
                        } else {
                            console.log('[INFO] Database vacuum completed');
                            resolve();
                        }
                    });
                });
            });
        });
    }

    // Get comprehensive status report
    async getStatusReport() {
        console.log('[INFO] Generating database status report...');
        
        try {
            const report = {
                timestamp: new Date().toISOString(),
                database: {},
                sync: {},
                backups: {},
                health: {}
            };

            // Database statistics
            report.database = await this.monitor.getDatabaseStats();
            
            // Sync status
            report.sync = await this.sync.checkSyncStatus();
            
            // Backup statistics
            report.backups = this.backup.getBackupStats();
            
            // Health check
            report.health = await this.monitor.runHealthCheck();
            
            return report;
            
        } catch (error) {
            console.error('[ERROR] Failed to generate status report:', error);
            throw error;
        }
    }

    // Emergency recovery procedures
    async emergencyRecovery(backupPath) {
        console.log('[INFO] Starting emergency database recovery...');
        
        try {
            // Create backup of current state (if possible)
            try {
                await this.backup.createCompleteBackup('emergency-current');
                console.log('[INFO] Current state backed up');
            } catch (e) {
                console.warn('[WARN] Could not backup current state:', e.message);
            }
            
            // Restore from backup
            console.log('[INFO] Restoring from backup...');
            await this.backup.restoreDatabase(backupPath);
            
            // Verify restored database
            console.log('[INFO] Verifying restored database...');
            const healthCheck = await this.monitor.runHealthCheck();
            
            if (healthCheck.overall === 'unhealthy') {
                throw new Error('Restored database failed health check');
            }
            
            // Run migrations on restored database
            console.log('[INFO] Applying migrations to restored database...');
            await this.migrations.runMigrations();
            
            // Final verification
            console.log('[INFO] Final verification...');
            const finalCheck = await this.monitor.runHealthCheck();
            
            if (finalCheck.overall === 'unhealthy') {
                throw new Error('Database still unhealthy after recovery');
            }
            
            console.log('[INFO] Emergency recovery completed successfully');
            return true;
            
        } catch (error) {
            console.error('[ERROR] Emergency recovery failed:', error);
            throw error;
        }
    }

    // Start automated management (monitoring + scheduled backups)
    startAutomatedManagement(options = {}) {
        console.log('[INFO] Starting automated database management...');
        
        const monitorInterval = options.monitorInterval || 60; // minutes
        const enableScheduledBackups = options.enableScheduledBackups !== false;
        
        // Start monitoring
        this.monitor.startMonitoring(monitorInterval);
        
        // Start scheduled backups
        if (enableScheduledBackups) {
            this.backup.startScheduledBackups();
        }
        
        console.log('[INFO] Automated database management started');
        console.log(`[INFO] Monitoring interval: ${monitorInterval} minutes`);
        console.log(`[INFO] Scheduled backups: ${enableScheduledBackups ? 'enabled' : 'disabled'}`);
    }
}

module.exports = DatabaseManager;

// CLI interface
if (require.main === module) {
    const command = process.argv[2];
    const manager = new DatabaseManager();

    switch (command) {
        case 'init':
            manager.initialize()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;

        case 'update':
            manager.updateDatabase()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;

        case 'sync':
            const direction = process.argv[3] || 'to-production';
            manager.syncWithProduction(direction)
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;

        case 'maintenance':
            manager.performMaintenance()
                .then(results => {
                    console.log('\nMaintenance Results:');
                    console.log(JSON.stringify(results, null, 2));
                    process.exit(0);
                })
                .catch(() => process.exit(1));
            break;

        case 'status':
            manager.getStatusReport()
                .then(report => {
                    console.log('\nDatabase Status Report:');
                    console.log(JSON.stringify(report, null, 2));
                    process.exit(0);
                })
                .catch(() => process.exit(1));
            break;

        case 'recover':
            const backupPath = process.argv[3];
            if (!backupPath) {
                console.error('Usage: node db-manager.js recover <backup-file-path>');
                process.exit(1);
            }
            manager.emergencyRecovery(backupPath)
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;

        case 'auto':
            const monitorInterval = parseInt(process.argv[3]) || 60;
            manager.startAutomatedManagement({ monitorInterval });
            break;

        default:
            console.log(`
Comprehensive Database Management System

Usage:
  node db-manager.js init                    - Initialize database system
  node db-manager.js update                  - Update database to latest version
  node db-manager.js sync [direction]        - Sync with production (to-production/from-production)
  node db-manager.js maintenance             - Perform maintenance tasks
  node db-manager.js status                  - Get comprehensive status report
  node db-manager.js recover <backup-path>   - Emergency recovery from backup
  node db-manager.js auto [interval]         - Start automated management

Examples:
  node db-manager.js init
  node db-manager.js update
  node db-manager.js sync to-production
  node db-manager.js maintenance
  node db-manager.js status
  node db-manager.js recover ./backups/attendance_db_2024-01-01T10-00-00_daily.db
  node db-manager.js auto 30
            `);
    }
}