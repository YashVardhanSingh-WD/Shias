const sqlite3 = require('sqlite3').verbose();
const PostgreSQLDatabase = require('./database-postgres');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

class DatabaseAdapter {
    constructor() {
        this.db = null;
        this.type = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres://')) {
                // PostgreSQL/Heroku connection
                await this.connectPostgreSQL();
            } else {
                // SQLite connection (fallback)
                await this.connectSQLite();
            }
            
            if (this.type !== 'postgresql') {
                await this.initializeTables();
            }
            console.log(`[INFO] Database connected successfully (${this.type})`);
        } catch (error) {
            console.error('[ERROR] Database connection failed:', error);
            throw error;
        }
    }

    async connectPostgreSQL() {
        this.db = new PostgreSQLDatabase();
        await this.db.connect();
        this.type = 'postgresql';
        this.isConnected = true;
    }

    async connectSQLite() {
        const dbPath = process.env.DATABASE_PATH || './data/attendance.db';
        const dataDir = path.dirname(dbPath);
        
        if (dataDir !== '.' && !fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.type = 'sqlite';
                    this.isConnected = true;
                    resolve();
                }
            });
        });
    }

    async initializeTables() {
        if (this.type === 'sqlite') {
            await this.initializeSQLiteTables();
        }
    }

    async initializeSQLiteTables() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Users table
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
                    file_url TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                // Create indexes
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id)`);
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_subject_id ON attendance(subject_id)`);
                this.db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)`);

                // Insert default admin user
                const adminPassword = bcrypt.hashSync('admin123', 10);
                this.db.run(`INSERT OR IGNORE INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`, 
                    ['admin', adminPassword, 'Administrator', 'admin'], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    async query(sql, params = []) {
        if (this.type === 'postgresql') {
            return await this.db.query(sql, params);
        } else {
            return new Promise((resolve, reject) => {
                this.db.all(sql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        }
    }

    async get(sql, params = []) {
        if (this.type === 'postgresql') {
            return await this.db.get(sql, params);
        } else {
            return new Promise((resolve, reject) => {
                this.db.get(sql, params, (err, row) => {
                    if (err) reject(err);
                    else resolve(row || null);
                });
            });
        }
    }

    async run(sql, params = []) {
        if (this.type === 'postgresql') {
            return await this.db.run(sql, params);
        } else {
            return new Promise((resolve, reject) => {
                this.db.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve({
                        lastInsertId: this.lastID,
                        changes: this.changes
                    });
                });
            });
        }
    }

    async close() {
        if (this.db) {
            if (this.type === 'postgresql') {
                await this.db.close();
            } else {
                this.db.close();
            }
            this.isConnected = false;
        }
    }
}

module.exports = DatabaseAdapter;