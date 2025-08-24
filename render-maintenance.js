const DatabaseManager = require('./db-manager');
const fs = require('fs');
const path = require('path');

/**
 * Render Maintenance Script
 * Runs scheduled maintenance tasks via Render cron jobs
 */
class RenderMaintenance {
    constructor() {
        this.dbManager = new DatabaseManager({
            dbPath: process.env.DATABASE_PATH || './data/attendance.db',
            backupDir: './data/backups',
            uploadsDir: './uploads'
        });
    }

    // Run daily maintenance
    async runDailyMaintenance() {
        console.log('[RENDER-MAINTENANCE] Starting daily maintenance...');
        
        try {
            const maintenanceResults = {
                timestamp: new Date().toISOString(),
                type: 'daily',
                tasks: {}
            };

            // 1. Health check
            console.log('[RENDER-MAINTENANCE] Running health check...');
            const healthCheck = await this.dbManager.monitor.runHealthCheck();
            maintenanceResults.tasks.healthCheck = {
                status: healthCheck.overall,
                details: healthCheck.checks
            };

            // 2. Create daily backup
            console.log('[RENDER-MAINTENANCE] Creating daily backup...');
            const backup = await this.dbManager.backup.createCompleteBackup('daily');
            maintenanceResults.tasks.backup = {
                status: backup.success ? 'completed' : 'failed',
                database: backup.database,
                uploads: backup.uploads
            };

            // 3. Database optimization
            console.log('[RENDER-MAINTENANCE] Optimizing database...');
            await this.dbManager.optimizeDatabase();
            maintenanceResults.tasks.optimization = { status: 'completed' };

            // 4. Clean old backups
            console.log('[RENDER-MAINTENANCE] Cleaning old backups...');
            await this.dbManager.backup.cleanOldBackups();
            maintenanceResults.tasks.cleanup = { status: 'completed' };

            // 5. Update database schema if needed
            console.log('[RENDER-MAINTENANCE] Checking for database updates...');
            await this.dbManager.migrations.runMigrations();
            maintenanceResults.tasks.migrations = { status: 'completed' };

            // 6. Generate statistics
            console.log('[RENDER-MAINTENANCE] Gathering database statistics...');
            const stats = await this.dbManager.monitor.getDatabaseStats();
            maintenanceResults.tasks.statistics = {
                status: 'completed',
                totalRecords: stats.totalRecords,
                tables: stats.tables
            };

            // Log results
            this.logMaintenanceResults(maintenanceResults);
            
            console.log('[RENDER-MAINTENANCE] Daily maintenance completed successfully');
            
            // Send notification if there are issues
            if (healthCheck.overall !== 'healthy') {
                await this.sendAlert(healthCheck);
            }
            
            return maintenanceResults;
            
        } catch (error) {
            console.error('[RENDER-MAINTENANCE] Daily maintenance failed:', error);
            this.logError(error);
            throw error;
        }
    }

    // Run weekly maintenance
    async runWeeklyMaintenance() {
        console.log('[RENDER-MAINTENANCE] Starting weekly maintenance...');
        
        try {
            // Run daily maintenance first
            const dailyResults = await this.runDailyMaintenance();
            
            // Additional weekly tasks
            const weeklyResults = {
                timestamp: new Date().toISOString(),
                type: 'weekly',
                tasks: {
                    daily: dailyResults
                }
            };

            // 1. Create weekly backup
            console.log('[RENDER-MAINTENANCE] Creating weekly backup...');
            const weeklyBackup = await this.dbManager.backup.createCompleteBackup('weekly');
            weeklyResults.tasks.weeklyBackup = {
                status: weeklyBackup.success ? 'completed' : 'failed',
                database: weeklyBackup.database,
                uploads: weeklyBackup.uploads
            };

            // 2. Comprehensive health report
            console.log('[RENDER-MAINTENANCE] Generating comprehensive health report...');
            const statusReport = await this.dbManager.getStatusReport();
            weeklyResults.tasks.statusReport = {
                status: 'completed',
                overall: statusReport.health.overall,
                database: statusReport.database,
                backups: statusReport.backups
            };

            // 3. Log cleanup
            console.log('[RENDER-MAINTENANCE] Cleaning old logs...');
            this.cleanOldLogs();
            weeklyResults.tasks.logCleanup = { status: 'completed' };

            this.logMaintenanceResults(weeklyResults);
            
            console.log('[RENDER-MAINTENANCE] Weekly maintenance completed successfully');
            return weeklyResults;
            
        } catch (error) {
            console.error('[RENDER-MAINTENANCE] Weekly maintenance failed:', error);
            this.logError(error);
            throw error;
        }
    }

    // Clean old log files
    cleanOldLogs() {
        const logsDir = './logs';
        if (!fs.existsSync(logsDir)) {
            return;
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days

        try {
            const files = fs.readdirSync(logsDir);
            let deletedCount = 0;

            files.forEach(file => {
                const filePath = path.join(logsDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime < cutoffDate) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`[RENDER-MAINTENANCE] Deleted old log: ${file}`);
                }
            });

            if (deletedCount > 0) {
                console.log(`[RENDER-MAINTENANCE] Cleaned ${deletedCount} old log files`);
            }
        } catch (error) {
            console.error('[RENDER-MAINTENANCE] Error cleaning logs:', error);
        }
    }

    // Log maintenance results
    logMaintenanceResults(results) {
        const logFile = './logs/maintenance.log';
        const logEntry = JSON.stringify(results) + '\n';
        
        try {
            // Ensure logs directory exists
            const logsDir = path.dirname(logFile);
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            
            fs.appendFileSync(logFile, logEntry);
        } catch (error) {
            console.error('[RENDER-MAINTENANCE] Failed to write maintenance log:', error);
        }
    }

    // Log errors
    logError(error) {
        const logFile = './logs/maintenance-errors.log';
        const logEntry = JSON.stringify({
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack
        }) + '\n';
        
        try {
            // Ensure logs directory exists
            const logsDir = path.dirname(logFile);
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            
            fs.appendFileSync(logFile, logEntry);
        } catch (logError) {
            console.error('[RENDER-MAINTENANCE] Failed to write error log:', logError);
        }
    }

    // Send alert for critical issues
    async sendAlert(healthCheck) {
        console.log('[RENDER-MAINTENANCE] ALERT: Database health issues detected');
        console.log('Health Status:', healthCheck.overall);
        console.log('Issues:', JSON.stringify(healthCheck.checks, null, 2));
        
        // In a real implementation, you could send emails, Slack notifications, etc.
        // For now, we'll just log the alert
        
        const alertFile = './logs/alerts.log';
        const alertEntry = JSON.stringify({
            timestamp: new Date().toISOString(),
            type: 'health_alert',
            status: healthCheck.overall,
            checks: healthCheck.checks
        }) + '\n';
        
        try {
            fs.appendFileSync(alertFile, alertEntry);
        } catch (error) {
            console.error('[RENDER-MAINTENANCE] Failed to write alert log:', error);
        }
    }
}

// Run maintenance based on command line argument or environment
if (require.main === module) {
    const maintenance = new RenderMaintenance();
    const maintenanceType = process.argv[2] || process.env.MAINTENANCE_TYPE || 'daily';
    
    async function runMaintenance() {
        try {
            console.log(`[RENDER-MAINTENANCE] Starting ${maintenanceType} maintenance...`);
            
            let results;
            if (maintenanceType === 'weekly') {
                results = await maintenance.runWeeklyMaintenance();
            } else {
                results = await maintenance.runDailyMaintenance();
            }
            
            console.log(`[RENDER-MAINTENANCE] ${maintenanceType} maintenance completed successfully`);
            process.exit(0);
            
        } catch (error) {
            console.error(`[RENDER-MAINTENANCE] ${maintenanceType} maintenance failed:`, error);
            process.exit(1);
        }
    }
    
    runMaintenance();
}

module.exports = RenderMaintenance;