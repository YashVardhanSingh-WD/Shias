const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database configuration for different environments
class DatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    // Initialize database connection
    async initialize() {
        if (this.isInitialized) {
            return this.db;
        }

        try {
            // Ensure data directory exists for production
            const dataDir = path.join(__dirname, 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
                console.log('[INFO] Created data directory for database');
            }

            // Use environment-specific database path
            const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'attendance.db');
            
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('[ERROR] Failed to connect to database:', err);
                    throw err;
                } else {
                    console.log('[INFO] Connected to SQLite database at:', dbPath);
                }
            });

            // Enable foreign keys
            this.db.run('PRAGMA foreign_keys = ON');
            
            // Initialize database schema
            await this.initializeSchema();
            
            this.isInitialized = true;
            return this.db;
        } catch (error) {
            console.error('[ERROR] Database initialization failed:', error);
            throw error;
        }
    }

    // Initialize database schema and indexes
    async initializeSchema() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Users table (admin and students)
                this.db.run(`CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    name TEXT NOT NULL,
                    student_id TEXT UNIQUE,
                    role TEXT DEFAULT 'student',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                // Subjects table
                this.db.run(`CREATE TABLE IF NOT EXISTS subjects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                // Students table
                this.db.run(`CREATE TABLE IF NOT EXISTS students (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    email TEXT,
                    phone TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                // Attendance table
                this.db.run(`CREATE TABLE IF NOT EXISTS attendance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER,
                    subject_id INTEGER,
                    date DATE NOT NULL,
                    status TEXT DEFAULT 'present',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students (id),
                    FOREIGN KEY (subject_id) REFERENCES subjects (id)
                )`);

                // Announcements table
                this.db.run(`CREATE TABLE IF NOT EXISTS announcements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    type TEXT DEFAULT 'notice',
                    priority TEXT DEFAULT 'normal',
                    is_active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    file_url TEXT
                )`);

                // Create indexes for better performance
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id)`);
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_subject_id ON attendance(subject_id)`);
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)`);
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id)`);
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id)`);

                // Insert default admin user if not exists
                this.insertDefaultAdmin(() => {
                    console.log('[INFO] Database schema initialized successfully');
                    resolve();
                });
            });
        });
    }

    // Insert default admin user
    insertDefaultAdmin(callback) {
        const bcrypt = require('bcryptjs');
        const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
        const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
        
        // Check if admin already exists
        this.db.get('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin'], (err, row) => {
            if (err) {
                console.error('[ERROR] Failed to check for existing admin:', err);
                return callback(err);
            }

            if (!row) {
                // Create default admin
                const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
                this.db.run(
                    'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
                    [defaultUsername, hashedPassword, 'Administrator', 'admin'],
                    function(insertErr) {
                        if (insertErr) {
                            console.error('[ERROR] Failed to create default admin:', insertErr);
                            return callback(insertErr);
                        }
                        console.log('[INFO] Default admin user created');
                        console.log(`[INFO] Admin credentials: ${defaultUsername} / ${defaultPassword}`);
                        callback();
                    }
                );
            } else {
                console.log('[INFO] Admin user already exists');
                callback();
            }
        });
    }

    // Get database instance
    getDatabase() {
        if (!this.isInitialized) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('[ERROR] Error closing database:', err);
                } else {
                    console.log('[INFO] Database connection closed');
                }
            });
        }
    }

    // Backup database (useful for production)
    async backup(backupPath) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('Database not initialized'));
            }

            const fs = require('fs');
            const readStream = fs.createReadStream(this.db.filename);
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
}

// Export singleton instance
const dbManager = new DatabaseManager();
module.exports = dbManager;