const DatabaseManager = require('./db-manager');
const fs = require('fs');
const path = require('path');

/**
 * Render Database Worker
 * Handles automated database management on Render hosting
 */
class RenderDatabaseWorker {
    constructor() {
        this.dbManager = new DatabaseManager({
            dbPath: process.env.DATABASE_PATH || './data/attendance.db',
            backupDir: './data/backups',
            uploadsDir: './uploads'
        });
        this.interval = parseInt(process.env.WORKER_INTERVAL) || 120; // minutes
        this.isRunning = false;
        this.intervalId = null;
    }

    // Initialize the worker
    async initialize() {
        console.log('[RENDER-WORKER] Initializing database worker for Render...');
        
        try {
            // Ensure data directories exist
            this.ensureDirectories();
            
            // Initialize database management system
            await this.dbManager.initialize();
            
            console.log('[RENDER-WORKER] Database worker initialized successfully');
            return true;
            
        } catch (error) {
            console.error('[RENDER-WORKER] Failed to initialize:', error);
            throw error;
        }
    }

    // Ensure required directories exist
    ensureDirectories() {
        const dirs = [
            './data',
            './data/backups',
            './uploads',
            './logs'
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`[RENDER-WORKER] Created directory: ${dir}`);
            }
        });
    }

    // Start the worker
    async start() {
        if (this.isRunning) {
            console.log('[RENDER-WORKER] Worker is already running');
            return;
        }

        console.log(`[RENDER-WORKER] Starting database worker (interval: ${this.interval} minutes)`);
        
        try {
            // Initialize first
            await this.initialize();
            
            // Run initial tasks
            await this.runTasks();
            
            // Schedule periodic tasks
            this.intervalId = setInterval(async () => {
                try {
                    await this.runTasks();
                } catch (error) {
                    console.error('[RENDER-WORKER] Error in scheduled tasks:', error);
                }
            }, this.interval * 60 * 1000);
            
            this.isRunning = true;
            console.log('[RENDER-WORKER] Database worker started successfully');
            
            // Handle graceful shutdown
            process.on('SIGTERM', () => this.stop());
            process.on('SIGINT', () => this.stop());
            
        } catch (error) {
            console.error('[RENDER-WORKER] Failed to start worker:', error);
            throw error;
        }
    }

    // Stop the worker
    stop() {
        if (!this.isRunning) {
            return;
        }

        console.log('[RENDER-WORKER] Stopping database worker...');
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.isRunning = false;
        console.log('[RENDER-WORKER] Database worker stopped');
        process.exit(0);
    }

    // Run periodic tasks
    async runTasks() {
        console.log('[RENDER-WORKER] Running periodic database tasks...');
        
        try {
            const tasks = {
                timestamp: new Date().toISOString(),
                results: {}
            };

            // 1. Health check
            console.log('[RENDER-WORKER] Running health check...');
            const healthCheck = await this.dbManager.monitor.runHealthCheck();
            tasks.results.healthCheck = {
                status: healthCheck.overall,
                timestamp: healthCheck.timestamp
            };

            // 2. Create backup if needed (every 6 hours)
            const shouldBackup = this.shouldCreateBackup();
            if (shouldBackup) {
                console.log('[RENDER-WORKER] Creating scheduled backup...');
                const backup = await this.dbManager.backup.createCompleteBackup('scheduled');
                tasks.results.backup = {
                    status: backup.success ? 'completed' : 'failed',
                    database: backup.database,
                    uploads: backup.uploads
                };
            }

            // 3. Clean old backups
            console.log('[RENDER-WORKER] Cleaning old backups...');
            await this.dbManager.backup.cleanOldBackups();
            tasks.results.cleanup = { status: 'completed' };

            // 4. Database optimization (daily)
            const shouldOptimize = this.shouldOptimize();
            if (shouldOptimize) {
                console.log('[RENDER-WORKER] Running database optimization...');
                await this.dbManager.optimizeDatabase();
                tasks.results.optimization = { status: 'completed' };
            }

            // 5. Log results
            this.logTaskResults(tasks);
            
            console.log('[RENDER-WORKER] Periodic tasks completed successfully');
            
        } catch (error) {
            console.error('[RENDER-WORKER] Error in periodic tasks:', error);
            this.logError(error);
        }
    }

    // Check if backup should be created (every 6 hours)
    shouldCreateBackup() {
        const backupInterval = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
        const lastBackupFile = './data/backups/.last-backup';
        
        if (!fs.existsSync(lastBackupFile)) {
            return true;
        }
        
        try {
            const lastBackupTime = parseInt(fs.readFileSync(lastBackupFile, 'utf8'));
            const now = Date.now();
            
            if (now - lastBackupTime > backupInterval) {
                fs.writeFileSync(lastBackupFile, now.toString());
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('[RENDER-WORKER] Error checking backup time:', error);
            return true; // Create backup on error
        }
    }

    // Check if optimization should run (daily)
    shouldOptimize() {
        const optimizeInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const lastOptimizeFile = './data/.last-optimize';
        
        if (!fs.existsSync(lastOptimizeFile)) {
            return true;
        }
        
        try {
            const lastOptimizeTime = parseInt(fs.readFileSync(lastOptimizeFile, 'utf8'));
            const now = Date.now();
            
            if (now - lastOptimizeTime > optimizeInterval) {
                fs.writeFileSync(lastOptimizeFile, now.toString());
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('[RENDER-WORKER] Error checking optimize time:', error);
            return true; // Optimize on error
        }
    }

    // Log task results
    logTaskResults(tasks) {
        const logFile = './logs/worker.log';
        const logEntry = JSON.stringify(tasks) + '\n';
        
        try {
            fs.appendFileSync(logFile, logEntry);
        } catch (error) {
            console.error('[RENDER-WORKER] Failed to write log:', error);
        }
    }

    // Log errors
    logError(error) {
        const logFile = './logs/worker-errors.log';
        const logEntry = JSON.stringify({
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack
        }) + '\n';
        
        try {
            fs.appendFileSync(logFile, logEntry);
        } catch (logError) {
            console.error('[RENDER-WORKER] Failed to write error log:', logError);
        }
    }

    // Get worker status
    getStatus() {
        return {
            isRunning: this.isRunning,
            interval: this.interval,
            uptime: this.isRunning ? process.uptime() : 0,
            memoryUsage: process.memoryUsage(),
            environment: process.env.NODE_ENV
        };
    }
}

// Start the worker if this file is run directly
if (require.main === module) {
    const worker = new RenderDatabaseWorker();
    
    worker.start().catch(error => {
        console.error('[RENDER-WORKER] Failed to start:', error);
        process.exit(1);
    });
    
    // Keep the process alive
    process.on('uncaughtException', (error) => {
        console.error('[RENDER-WORKER] Uncaught exception:', error);
        worker.stop();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        console.error('[RENDER-WORKER] Unhandled rejection at:', promise, 'reason:', reason);
        worker.stop();
    });
}

module.exports = RenderDatabaseWorker;