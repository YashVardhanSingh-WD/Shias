const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

/**
 * Database Synchronization System
 * Keeps local and production databases in sync
 */
class DatabaseSync {
    constructor(options = {}) {
        this.localDbPath = options.localDbPath || path.join(__dirname, 'attendance.db');
        this.productionDbPath = options.productionDbPath || path.join(__dirname, 'data', 'attendance.db');
        this.backupDir = options.backupDir || path.join(__dirname, 'backups');
        this.syncDir = path.join(__dirname, 'sync');
    }

    // Ensure required directories exist
    ensureDirectories() {
        [this.backupDir, this.syncDir, path.dirname(this.productionDbPath)].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`[INFO] Created directory: ${dir}`);
            }
        });
    }

    // Get database schema
    async getSchema(dbPath) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
            });

            const schema = {
                tables: {},
                indexes: []
            };

            // Get table schemas
            db.all(`
                SELECT name, sql FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
            `, (err, tables) => {
                if (err) {
                    db.close();
                    reject(err);
                    return;
                }

                // Get indexes
                db.all(`
                    SELECT name, sql FROM sqlite_master 
                    WHERE type='index' AND name NOT LIKE 'sqlite_%'
                    ORDER BY name
                `, (err, indexes) => {
                    db.close();
                    
                    if (err) {
                        reject(err);
                        return;
                    }

                    schema.tables = tables.reduce((acc, table) => {
                        acc[table.name] = table.sql;
                        return acc;
                    }, {});

                    schema.indexes = indexes.map(idx => idx.sql).filter(Boolean);
                    resolve(schema);
                });
            });
        });
    }

    // Compare two database schemas
    compareSchemas(localSchema, productionSchema) {
        const differences = {
            missingTables: [],
            extraTables: [],
            missingIndexes: [],
            extraIndexes: [],
            tableDifferences: []
        };

        // Check for missing/extra tables
        const localTables = Object.keys(localSchema.tables);
        const productionTables = Object.keys(productionSchema.tables);

        differences.missingTables = productionTables.filter(t => !localTables.includes(t));
        differences.extraTables = localTables.filter(t => !productionTables.includes(t));

        // Check for table schema differences
        localTables.forEach(tableName => {
            if (productionSchema.tables[tableName] && 
                localSchema.tables[tableName] !== productionSchema.tables[tableName]) {
                differences.tableDifferences.push({
                    table: tableName,
                    local: localSchema.tables[tableName],
                    production: productionSchema.tables[tableName]
                });
            }
        });

        // Check for missing/extra indexes
        differences.missingIndexes = productionSchema.indexes.filter(idx => 
            !localSchema.indexes.includes(idx)
        );
        differences.extraIndexes = localSchema.indexes.filter(idx => 
            !productionSchema.indexes.includes(idx)
        );

        return differences;
    }

    // Export data from database
    async exportData(dbPath, outputPath) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
            const exportData = {
                timestamp: new Date().toISOString(),
                tables: {}
            };

            // Get all table names
            db.all(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name NOT LIKE 'sqlite_%'
                ORDER BY name
            `, (err, tables) => {
                if (err) {
                    db.close();
                    reject(err);
                    return;
                }

                let completed = 0;
                const totalTables = tables.length;

                if (totalTables === 0) {
                    db.close();
                    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
                    resolve(outputPath);
                    return;
                }

                tables.forEach(table => {
                    db.all(`SELECT * FROM ${table.name}`, (err, rows) => {
                        if (err) {
                            console.error(`[ERROR] Failed to export table ${table.name}:`, err);
                        } else {
                            exportData.tables[table.name] = rows;
                        }

                        completed++;
                        if (completed === totalTables) {
                            db.close();
                            fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
                            console.log(`[INFO] Data exported to: ${outputPath}`);
                            resolve(outputPath);
                        }
                    });
                });
            });
        });
    }

    // Import data to database
    async importData(dataPath, dbPath) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(dataPath)) {
                reject(new Error(`Data file not found: ${dataPath}`));
                return;
            }

            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            const db = new sqlite3.Database(dbPath);

            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                const tableNames = Object.keys(data.tables);
                let completed = 0;

                if (tableNames.length === 0) {
                    db.run('COMMIT');
                    db.close();
                    resolve();
                    return;
                }

                tableNames.forEach(tableName => {
                    const rows = data.tables[tableName];
                    
                    if (rows.length === 0) {
                        completed++;
                        if (completed === tableNames.length) {
                            db.run('COMMIT');
                            db.close();
                            resolve();
                        }
                        return;
                    }

                    // Clear existing data
                    db.run(`DELETE FROM ${tableName}`, (err) => {
                        if (err) {
                            console.error(`[ERROR] Failed to clear table ${tableName}:`, err);
                            completed++;
                            if (completed === tableNames.length) {
                                db.run('ROLLBACK');
                                db.close();
                                reject(err);
                            }
                            return;
                        }

                        // Insert new data
                        const columns = Object.keys(rows[0]);
                        const placeholders = columns.map(() => '?').join(',');
                        const stmt = db.prepare(`INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`);

                        rows.forEach(row => {
                            const values = columns.map(col => row[col]);
                            stmt.run(values);
                        });

                        stmt.finalize((err) => {
                            if (err) {
                                console.error(`[ERROR] Failed to import data to ${tableName}:`, err);
                            } else {
                                console.log(`[INFO] Imported ${rows.length} rows to ${tableName}`);
                            }

                            completed++;
                            if (completed === tableNames.length) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    db.close();
                                    reject(err);
                                } else {
                                    db.run('COMMIT');
                                    db.close();
                                    resolve();
                                }
                            }
                        });
                    });
                });
            });
        });
    }

    // Sync local database to production
    async syncToProduction() {
        try {
            console.log('[INFO] Starting sync to production...');
            this.ensureDirectories();

            // Backup production database
            const backupPath = await this.backupDatabase(this.productionDbPath);
            console.log(`[INFO] Production database backed up to: ${backupPath}`);

            // Export local data
            const exportPath = path.join(this.syncDir, `local_export_${Date.now()}.json`);
            await this.exportData(this.localDbPath, exportPath);

            // Import to production
            await this.importData(exportPath, this.productionDbPath);

            console.log('[INFO] Sync to production completed successfully');
            
            // Cleanup export file
            fs.unlinkSync(exportPath);
            
        } catch (error) {
            console.error('[ERROR] Sync to production failed:', error);
            throw error;
        }
    }

    // Sync production database to local
    async syncFromProduction() {
        try {
            console.log('[INFO] Starting sync from production...');
            this.ensureDirectories();

            // Backup local database
            const backupPath = await this.backupDatabase(this.localDbPath);
            console.log(`[INFO] Local database backed up to: ${backupPath}`);

            // Export production data
            const exportPath = path.join(this.syncDir, `production_export_${Date.now()}.json`);
            await this.exportData(this.productionDbPath, exportPath);

            // Import to local
            await this.importData(exportPath, this.localDbPath);

            console.log('[INFO] Sync from production completed successfully');
            
            // Cleanup export file
            fs.unlinkSync(exportPath);
            
        } catch (error) {
            console.error('[ERROR] Sync from production failed:', error);
            throw error;
        }
    }

    // Backup database
    async backupDatabase(dbPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `${path.basename(dbPath, '.db')}_backup_${timestamp}.db`;
        const backupPath = path.join(this.backupDir, filename);

        return new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(dbPath);
            const writeStream = fs.createWriteStream(backupPath);

            readStream.pipe(writeStream);

            writeStream.on('finish', () => {
                resolve(backupPath);
            });

            writeStream.on('error', (err) => {
                reject(err);
            });
        });
    }

    // Check sync status
    async checkSyncStatus() {
        try {
            console.log('[INFO] Checking sync status...');
            
            if (!fs.existsSync(this.localDbPath)) {
                console.log('[WARN] Local database not found');
                return { status: 'local_missing' };
            }

            if (!fs.existsSync(this.productionDbPath)) {
                console.log('[WARN] Production database not found');
                return { status: 'production_missing' };
            }

            const localSchema = await this.getSchema(this.localDbPath);
            const productionSchema = await this.getSchema(this.productionDbPath);
            
            const differences = this.compareSchemas(localSchema, productionSchema);
            
            const hasDifferences = 
                differences.missingTables.length > 0 ||
                differences.extraTables.length > 0 ||
                differences.missingIndexes.length > 0 ||
                differences.extraIndexes.length > 0 ||
                differences.tableDifferences.length > 0;

            return {
                status: hasDifferences ? 'out_of_sync' : 'in_sync',
                differences
            };

        } catch (error) {
            console.error('[ERROR] Failed to check sync status:', error);
            return { status: 'error', error: error.message };
        }
    }
}

module.exports = DatabaseSync;

// CLI interface
if (require.main === module) {
    const command = process.argv[2];
    const sync = new DatabaseSync();

    switch (command) {
        case 'to-production':
            sync.syncToProduction()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;

        case 'from-production':
            sync.syncFromProduction()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;

        case 'status':
            sync.checkSyncStatus()
                .then(result => {
                    console.log('Sync Status:', result.status);
                    if (result.differences) {
                        console.log('Differences:', JSON.stringify(result.differences, null, 2));
                    }
                    process.exit(0);
                })
                .catch(() => process.exit(1));
            break;

        case 'backup':
            const dbPath = process.argv[3] || sync.localDbPath;
            sync.backupDatabase(dbPath)
                .then(backupPath => {
                    console.log(`Backup created: ${backupPath}`);
                    process.exit(0);
                })
                .catch(() => process.exit(1));
            break;

        default:
            console.log(`
Database Synchronization Tool

Usage:
  node db-sync.js to-production   - Sync local database to production
  node db-sync.js from-production - Sync production database to local
  node db-sync.js status          - Check sync status
  node db-sync.js backup [path]   - Backup database

Examples:
  node db-sync.js status
  node db-sync.js to-production
  node db-sync.js backup ./attendance.db
            `);
    }
}