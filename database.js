const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.type = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
                // Railway PostgreSQL connection
                await this.connectPostgreSQL();
            } else {
                // SQLite fallback for local development
                await this.connectSQLite();
            }
            
            await this.initializeTables();
            console.log(`[INFO] Database connected successfully (${this.type})`);
        } catch (error) {
            console.error('[ERROR] Database connection failed:', error);
            throw error;
        }
    }

    async connectPostgreSQL() {
        this.db = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        
        // Test connection
        const client = await this.db.connect();
        client.release();
        
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
        if (this.type === 'postgresql') {
            await this.initializePostgreSQLTables();
        } else {
            await this.initializeSQLiteTables();
        }
    }

    async initializePostgreSQLTables() {
        const client = await this.db.connect();
        
        try {
            // Users table
            await client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    student_id VARCHAR(255) UNIQUE,
                    role VARCHAR(50) DEFAULT 'student',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Subjects table
            await client.query(`
                CREATE TABLE IF NOT EXISTS subjects (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Students table
            await client.query(`
                CREATE TABLE IF NOT EXISTS students (
                    id SERIAL PRIMARY KEY,
                    student_id VARCHAR(255) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255),
                    phone VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Attendance table
            await client.query(`
                CREATE TABLE IF NOT EXISTS attendance (
                    id SERIAL PRIMARY KEY,
                    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
                    date DATE NOT NULL,
                    status VARCHAR(50) DEFAULT 'present',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Announcements table
            await client.query(`
                CREATE TABLE IF NOT EXISTS announcements (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    type VARCHAR(50) DEFAULT 'notice',
                    priority VARCHAR(50) DEFAULT 'normal',
                    is_active BOOLEAN DEFAULT true,
                    file_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create indexes
            await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id)`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_subject_id ON attendance(subject_id)`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id)`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id)`);

            // Insert default admin user
            const adminPassword = bcrypt.hashSync('admin123', 10);
            await client.query(`
                INSERT INTO users (username, password, name, role) 
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (username) DO NOTHING
            `, ['admin', adminPassword, 'Administrator', 'admin']);

        } finally {
            client.release();
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
            const result = await this.db.query(sql, params);
            return result.rows;
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
            const result = await this.db.query(sql, params);
            return result.rows[0] || null;
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
            const result = await this.db.query(sql, params);
            return {
                lastInsertId: result.rows[0]?.id || null,
                changes: result.rowCount
            };
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
                await this.db.end();
            } else {
                this.db.close();
            }
            this.isConnected = false;
        }
    }
}

module.exports = Database;