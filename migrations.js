const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

/**
 * Database Migration System
 * Handles database schema updates and data migrations
 */
class DatabaseMigrations {
    constructor(dbPath) {
        this.dbPath = dbPath || path.join(__dirname, 'data', 'attendance.db');
        this.migrationsDir = path.join(__dirname, 'migrations');
        this.db = null;
    }

    // Initialize database connection
    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('[ERROR] Database connection failed:', err);
                    reject(err);
                } else {
                    console.log('[INFO] Connected to database for migrations');
                    resolve();
                }
            });
        });
    }

    // Create migrations table to track applied migrations
    async createMigrationsTable() {
        return new Promise((resolve, reject) => {
            const sql = `
                CREATE TABLE IF NOT EXISTS migrations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT UNIQUE NOT NULL,
                    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;
            
            this.db.run(sql, (err) => {
                if (err) {
                    console.error('[ERROR] Failed to create migrations table:', err);
                    reject(err);
                } else {
                    console.log('[INFO] Migrations table ready');
                    resolve();
                }
            });
        });
    }

    // Get list of applied migrations
    async getAppliedMigrations() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT filename FROM migrations ORDER BY id', (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => row.filename));
                }
            });
        });
    }

    // Get list of pending migrations
    async getPendingMigrations() {
        try {
            // Ensure migrations directory exists
            if (!fs.existsSync(this.migrationsDir)) {
                fs.mkdirSync(this.migrationsDir, { recursive: true });
                console.log('[INFO] Created migrations directory');
            }

            const allMigrations = fs.readdirSync(this.migrationsDir)
                .filter(file => file.endsWith('.sql'))
                .sort();

            const appliedMigrations = await this.getAppliedMigrations();
            
            return allMigrations.filter(migration => !appliedMigrations.includes(migration));
        } catch (error) {
            console.error('[ERROR] Failed to get pending migrations:', error);
            return [];
        }
    }

    // Apply a single migration
    async applyMigration(filename) {
        return new Promise((resolve, reject) => {
            const migrationPath = path.join(this.migrationsDir, filename);
            
            if (!fs.existsSync(migrationPath)) {
                reject(new Error(`Migration file not found: ${filename}`));
                return;
            }

            const sql = fs.readFileSync(migrationPath, 'utf8');
            
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                // Execute migration SQL
                this.db.exec(sql, (err) => {
                    if (err) {
                        this.db.run('ROLLBACK');
                        console.error(`[ERROR] Migration ${filename} failed:`, err);
                        reject(err);
                        return;
                    }
                    
                    // Record migration as applied
                    this.db.run(
                        'INSERT INTO migrations (filename) VALUES (?)',
                        [filename],
                        (insertErr) => {
                            if (insertErr) {
                                this.db.run('ROLLBACK');
                                reject(insertErr);
                                return;
                            }
                            
                            this.db.run('COMMIT', (commitErr) => {
                                if (commitErr) {
                                    reject(commitErr);
                                } else {
                                    console.log(`[INFO] Applied migration: ${filename}`);
                                    resolve();
                                }
                            });
                        }
                    );
                });
            });
        });
    }

    // Run all pending migrations
    async runMigrations() {
        try {
            await this.connect();
            await this.createMigrationsTable();
            
            const pendingMigrations = await this.getPendingMigrations();
            
            if (pendingMigrations.length === 0) {
                console.log('[INFO] No pending migrations');
                return;
            }

            console.log(`[INFO] Found ${pendingMigrations.length} pending migrations`);
            
            for (const migration of pendingMigrations) {
                await this.applyMigration(migration);
            }
            
            console.log('[INFO] All migrations completed successfully');
        } catch (error) {
            console.error('[ERROR] Migration process failed:', error);
            throw error;
        } finally {
            if (this.db) {
                this.db.close();
            }
        }
    }

    // Create a new migration file
    createMigration(name, sql) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `${timestamp}_${name}.sql`;
        const filepath = path.join(this.migrationsDir, filename);
        
        // Ensure migrations directory exists
        if (!fs.existsSync(this.migrationsDir)) {
            fs.mkdirSync(this.migrationsDir, { recursive: true });
        }
        
        fs.writeFileSync(filepath, sql);
        console.log(`[INFO] Created migration: ${filename}`);
        return filename;
    }

    // Backup database before migrations
    async backupDatabase() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupPath = path.join(__dirname, 'backups', `attendance_${timestamp}.db`);
        
        // Ensure backups directory exists
        const backupsDir = path.dirname(backupPath);
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }
        
        return new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(this.dbPath);
            const writeStream = fs.createWriteStream(backupPath);
            
            readStream.pipe(writeStream);
            
            writeStream.on('finish', () => {
                console.log(`[INFO] Database backup created: ${backupPath}`);
                resolve(backupPath);
            });
            
            writeStream.on('error', (err) => {
                console.error('[ERROR] Database backup failed:', err);
                reject(err);
            });
        });
    }

    // Get database schema version
    async getSchemaVersion() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not connected'));
                return;
            }
            
            this.db.get(
                'SELECT COUNT(*) as count FROM migrations',
                (err, row) => {
                    if (err) {
                        resolve(0); // No migrations table means version 0
                    } else {
                        resolve(row.count);
                    }
                }
            );
        });
    }
}

// Export the class and create CLI interface
module.exports = DatabaseMigrations;

// CLI interface when run directly
if (require.main === module) {
    const command = process.argv[2];
    const migrations = new DatabaseMigrations();
    
    switch (command) {
        case 'run':
            migrations.runMigrations()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;
            
        case 'create':
            const name = process.argv[3];
            if (!name) {
                console.error('Usage: node migrations.js create <migration_name>');
                process.exit(1);
            }
            const sql = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Add your SQL commands here
-- Example:
-- ALTER TABLE students ADD COLUMN new_field TEXT;
-- CREATE INDEX IF NOT EXISTS idx_new_field ON students(new_field);
`;
            migrations.createMigration(name, sql);
            break;
            
        case 'status':
            migrations.connect()
                .then(() => migrations.createMigrationsTable())
                .then(() => migrations.getPendingMigrations())
                .then(pending => {
                    console.log(`Pending migrations: ${pending.length}`);
                    pending.forEach(m => console.log(`  - ${m}`));
                })
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;
            
        case 'backup':
            migrations.backupDatabase()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;
            
        default:
            console.log(`
Database Migration Tool

Usage:
  node migrations.js run     - Run all pending migrations
  node migrations.js create <name> - Create a new migration file
  node migrations.js status  - Show migration status
  node migrations.js backup  - Backup current database

Examples:
  node migrations.js create add_student_photo
  node migrations.js run
  node migrations.js status
            `);
    }
}