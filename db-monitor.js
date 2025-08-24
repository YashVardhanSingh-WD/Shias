const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

/**
 * Database Monitoring System
 * Monitors database health, performance, and integrity
 */
class DatabaseMonitor {
    constructor(options = {}) {
        this.dbPath = options.dbPath || path.join(__dirname, 'data', 'attendance.db');
        this.logPath = options.logPath || path.join(__dirname, 'logs', 'db-monitor.log');
        this.alertThresholds = {
            maxDbSize: options.maxDbSize || 100 * 1024 * 1024, // 100MB
            maxResponseTime: options.maxResponseTime || 1000, // 1 second
            minFreeSpace: options.minFreeSpace || 1024 * 1024 * 1024 // 1GB
        };
    }

    // Ensure log directory exists
    ensureLogDirectory() {
        const logDir = path.dirname(this.logPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    // Log message with timestamp
    log(level, message, data = null) {
        this.ensureLogDirectory();
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data
        };
        
        const logLine = JSON.stringify(logEntry) + '\n';
        fs.appendFileSync(this.logPath, logLine);
        
        // Also log to console
        console.log(`[${level}] ${timestamp} - ${message}`);
        if (data) {
            console.log('Data:', JSON.stringify(data, null, 2));
        }
    }

    // Check database connectivity
    async checkConnectivity() {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            if (!fs.existsSync(this.dbPath)) {
                const result = {
                    status: 'error',
                    message: 'Database file not found',
                    responseTime: Date.now() - startTime
                };
                this.log('ERROR', 'Database connectivity check failed', result);
                resolve(result);
                return;
            }

            const db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    const result = {
                        status: 'error',
                        message: err.message,
                        responseTime: Date.now() - startTime
                    };
                    this.log('ERROR', 'Database connection failed', result);
                    resolve(result);
                    return;
                }

                // Test with a simple query
                db.get('SELECT 1 as test', (queryErr) => {
                    const responseTime = Date.now() - startTime;
                    db.close();

                    if (queryErr) {
                        const result = {
                            status: 'error',
                            message: queryErr.message,
                            responseTime
                        };
                        this.log('ERROR', 'Database query test failed', result);
                        resolve(result);
                    } else {
                        const result = {
                            status: 'healthy',
                            message: 'Database connection successful',
                            responseTime
                        };
                        
                        if (responseTime > this.alertThresholds.maxResponseTime) {
                            this.log('WARN', 'Database response time exceeded threshold', result);
                        }
                        
                        resolve(result);
                    }
                });
            });
        });
    }

    // Check database size and disk space
    async checkDiskSpace() {
        try {
            const stats = fs.statSync(this.dbPath);
            const dbSize = stats.size;
            
            // Get disk space (simplified - works on most systems)
            const diskSpace = await this.getDiskSpace();
            
            const result = {
                status: 'healthy',
                dbSize,
                dbSizeMB: (dbSize / 1024 / 1024).toFixed(2),
                freeSpace: diskSpace.free,
                freeSpaceGB: (diskSpace.free / 1024 / 1024 / 1024).toFixed(2),
                totalSpace: diskSpace.total
            };

            // Check thresholds
            if (dbSize > this.alertThresholds.maxDbSize) {
                result.status = 'warning';
                result.message = 'Database size exceeded threshold';
                this.log('WARN', 'Database size threshold exceeded', result);
            }

            if (diskSpace.free < this.alertThresholds.minFreeSpace) {
                result.status = 'critical';
                result.message = 'Low disk space';
                this.log('ERROR', 'Low disk space detected', result);
            }

            return result;

        } catch (error) {
            const result = {
                status: 'error',
                message: error.message
            };
            this.log('ERROR', 'Disk space check failed', result);
            return result;
        }
    }

    // Get disk space information
    async getDiskSpace() {
        return new Promise((resolve) => {
            const { execSync } = require('child_process');
            
            try {
                let command;
                if (process.platform === 'win32') {
                    // Windows
                    const drive = path.parse(this.dbPath).root;
                    command = `wmic logicaldisk where caption="${drive}" get size,freespace /value`;
                } else {
                    // Unix-like systems
                    command = `df -B1 "${path.dirname(this.dbPath)}" | tail -1`;
                }

                const output = execSync(command, { encoding: 'utf8' });
                
                if (process.platform === 'win32') {
                    const lines = output.split('\n').filter(line => line.includes('='));
                    const freeSpace = lines.find(line => line.startsWith('FreeSpace='));
                    const totalSpace = lines.find(line => line.startsWith('Size='));
                    
                    resolve({
                        free: parseInt(freeSpace?.split('=')[1] || '0'),
                        total: parseInt(totalSpace?.split('=')[1] || '0')
                    });
                } else {
                    const parts = output.trim().split(/\s+/);
                    resolve({
                        free: parseInt(parts[3]) * 1024, // df returns in KB
                        total: parseInt(parts[1]) * 1024
                    });
                }
            } catch (error) {
                // Fallback values if command fails
                resolve({
                    free: 1024 * 1024 * 1024, // 1GB
                    total: 10 * 1024 * 1024 * 1024 // 10GB
                });
            }
        });
    }

    // Check database integrity
    async checkIntegrity() {
        return new Promise((resolve) => {
            const db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    const result = {
                        status: 'error',
                        message: err.message
                    };
                    this.log('ERROR', 'Database integrity check failed - connection error', result);
                    resolve(result);
                    return;
                }

                db.get('PRAGMA integrity_check', (integrityErr, row) => {
                    db.close();

                    if (integrityErr) {
                        const result = {
                            status: 'error',
                            message: integrityErr.message
                        };
                        this.log('ERROR', 'Database integrity check failed', result);
                        resolve(result);
                    } else {
                        const isHealthy = row && row.integrity_check === 'ok';
                        const result = {
                            status: isHealthy ? 'healthy' : 'error',
                            message: isHealthy ? 'Database integrity OK' : 'Database integrity issues detected',
                            integrityResult: row ? row.integrity_check : 'unknown'
                        };
                        
                        if (!isHealthy) {
                            this.log('ERROR', 'Database integrity issues detected', result);
                        }
                        
                        resolve(result);
                    }
                });
            });
        });
    }

    // Get database statistics
    async getDatabaseStats() {
        return new Promise((resolve) => {
            const db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    resolve({ status: 'error', message: err.message });
                    return;
                }

                const stats = {
                    tables: {},
                    totalRecords: 0,
                    lastUpdated: null
                };

                // Get table information
                db.all(`
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name NOT LIKE 'sqlite_%'
                    ORDER BY name
                `, (err, tables) => {
                    if (err) {
                        db.close();
                        resolve({ status: 'error', message: err.message });
                        return;
                    }

                    let completed = 0;
                    const totalTables = tables.length;

                    if (totalTables === 0) {
                        db.close();
                        resolve({ status: 'healthy', ...stats });
                        return;
                    }

                    tables.forEach(table => {
                        db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (countErr, countRow) => {
                            if (!countErr && countRow) {
                                stats.tables[table.name] = countRow.count;
                                stats.totalRecords += countRow.count;
                            }

                            completed++;
                            if (completed === totalTables) {
                                // Get last modification time
                                try {
                                    const fileStats = fs.statSync(this.dbPath);
                                    stats.lastUpdated = fileStats.mtime;
                                } catch (e) {
                                    // Ignore error
                                }

                                db.close();
                                resolve({ status: 'healthy', ...stats });
                            }
                        });
                    });
                });
            });
        });
    }

    // Run comprehensive health check
    async runHealthCheck() {
        console.log('[INFO] Running comprehensive database health check...');
        
        const healthCheck = {
            timestamp: new Date().toISOString(),
            overall: 'healthy',
            checks: {}
        };

        // Connectivity check
        healthCheck.checks.connectivity = await this.checkConnectivity();
        
        // Disk space check
        healthCheck.checks.diskSpace = await this.checkDiskSpace();
        
        // Integrity check
        healthCheck.checks.integrity = await this.checkIntegrity();
        
        // Database statistics
        healthCheck.checks.statistics = await this.getDatabaseStats();

        // Determine overall health
        const hasErrors = Object.values(healthCheck.checks).some(check => 
            check.status === 'error' || check.status === 'critical'
        );
        
        const hasWarnings = Object.values(healthCheck.checks).some(check => 
            check.status === 'warning'
        );

        if (hasErrors) {
            healthCheck.overall = 'unhealthy';
        } else if (hasWarnings) {
            healthCheck.overall = 'warning';
        }

        this.log('INFO', `Health check completed - Overall status: ${healthCheck.overall}`, healthCheck);
        
        return healthCheck;
    }

    // Start monitoring (run health checks periodically)
    startMonitoring(intervalMinutes = 60) {
        console.log(`[INFO] Starting database monitoring (every ${intervalMinutes} minutes)`);
        
        // Run initial health check
        this.runHealthCheck();
        
        // Schedule periodic checks
        const interval = setInterval(() => {
            this.runHealthCheck();
        }, intervalMinutes * 60 * 1000);

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('[INFO] Stopping database monitoring...');
            clearInterval(interval);
            process.exit(0);
        });

        return interval;
    }

    // Get monitoring logs
    getMonitoringLogs(lines = 100) {
        try {
            if (!fs.existsSync(this.logPath)) {
                return [];
            }

            const content = fs.readFileSync(this.logPath, 'utf8');
            const logLines = content.trim().split('\n').slice(-lines);
            
            return logLines.map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return { message: line, timestamp: null, level: 'UNKNOWN' };
                }
            });
        } catch (error) {
            console.error('[ERROR] Failed to read monitoring logs:', error);
            return [];
        }
    }
}

module.exports = DatabaseMonitor;

// CLI interface
if (require.main === module) {
    const command = process.argv[2];
    const monitor = new DatabaseMonitor();

    switch (command) {
        case 'check':
            monitor.runHealthCheck()
                .then(result => {
                    console.log('\nHealth Check Results:');
                    console.log('Overall Status:', result.overall);
                    Object.entries(result.checks).forEach(([name, check]) => {
                        console.log(`${name}: ${check.status} - ${check.message || 'OK'}`);
                    });
                    process.exit(result.overall === 'unhealthy' ? 1 : 0);
                })
                .catch(() => process.exit(1));
            break;

        case 'monitor':
            const interval = parseInt(process.argv[3]) || 60;
            monitor.startMonitoring(interval);
            break;

        case 'logs':
            const lines = parseInt(process.argv[3]) || 50;
            const logs = monitor.getMonitoringLogs(lines);
            logs.forEach(log => {
                console.log(`[${log.level}] ${log.timestamp} - ${log.message}`);
            });
            break;

        case 'stats':
            monitor.getDatabaseStats()
                .then(stats => {
                    console.log('Database Statistics:');
                    console.log(`Total Records: ${stats.totalRecords}`);
                    console.log('Records by Table:');
                    Object.entries(stats.tables || {}).forEach(([table, count]) => {
                        console.log(`  ${table}: ${count}`);
                    });
                    if (stats.lastUpdated) {
                        console.log(`Last Updated: ${stats.lastUpdated}`);
                    }
                })
                .catch(console.error);
            break;

        default:
            console.log(`
Database Monitoring System

Usage:
  node db-monitor.js check           - Run health check
  node db-monitor.js monitor [mins]  - Start monitoring (default: 60 min intervals)
  node db-monitor.js logs [lines]    - Show monitoring logs (default: 50 lines)
  node db-monitor.js stats           - Show database statistics

Examples:
  node db-monitor.js check
  node db-monitor.js monitor 30
  node db-monitor.js logs 100
            `);
    }
}