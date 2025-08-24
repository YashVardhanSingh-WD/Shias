const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

/**
 * Initialize basic database with essential tables
 */
function initializeBasicDatabase(dbPath) {
    return new Promise((resolve, reject) => {
        console.log(`[RENDER-START] Creating database at: ${dbPath}`);
        
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('[RENDER-START] Database connection failed:', err);
                reject(err);
                return;
            }
            
            console.log('[RENDER-START] Database connected successfully');
            
            // Create essential tables
            db.serialize(() => {
                // Students table
                db.run(`CREATE TABLE IF NOT EXISTS students (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    email TEXT,
                    phone TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`, (err) => {
                    if (err) console.error('[RENDER-START] Error creating students table:', err);
                    else console.log('[RENDER-START] Students table ready');
                });
                
                // Subjects table
                db.run(`CREATE TABLE IF NOT EXISTS subjects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`, (err) => {
                    if (err) console.error('[RENDER-START] Error creating subjects table:', err);
                    else console.log('[RENDER-START] Subjects table ready');
                });
                
                // Attendance table
                db.run(`CREATE TABLE IF NOT EXISTS attendance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER,
                    subject_id INTEGER,
                    date DATE NOT NULL,
                    status TEXT DEFAULT 'present',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students (id),
                    FOREIGN KEY (subject_id) REFERENCES subjects (id)
                )`, (err) => {
                    if (err) console.error('[RENDER-START] Error creating attendance table:', err);
                    else console.log('[RENDER-START] Attendance table ready');
                });
                
                // Users table (admin and students)
                db.run(`CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    name TEXT NOT NULL,
                    student_id TEXT UNIQUE,
                    role TEXT DEFAULT 'student',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`, (err) => {
                    if (err) console.error('[RENDER-START] Error creating users table:', err);
                    else console.log('[RENDER-START] Users table ready');
                });
                
                // Announcements table
                db.run(`CREATE TABLE IF NOT EXISTS announcements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    type TEXT DEFAULT 'notice',
                    priority TEXT DEFAULT 'normal',
                    is_active BOOLEAN DEFAULT 1,
                    file_url TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`, (err) => {
                    if (err) console.error('[RENDER-START] Error creating announcements table:', err);
                    else console.log('[RENDER-START] Announcements table ready');
                });
                
                // Admin users table
                db.run(`CREATE TABLE IF NOT EXISTS admin_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    role TEXT DEFAULT 'admin',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`, (err) => {
                    if (err) console.error('[RENDER-START] Error creating admin_users table:', err);
                    else console.log('[RENDER-START] Admin users table ready');
                });
                
                // Create indexes for better performance
                db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id)`, (err) => {
                    if (err) console.error('[RENDER-START] Error creating attendance student index:', err);
                    else console.log('[RENDER-START] Attendance student index created');
                });
                
                db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_subject_id ON attendance(subject_id)`, (err) => {
                    if (err) console.error('[RENDER-START] Error creating attendance subject index:', err);
                    else console.log('[RENDER-START] Attendance subject index created');
                });
                
                db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)`, (err) => {
                    if (err) console.error('[RENDER-START] Error creating attendance date index:', err);
                    else console.log('[RENDER-START] Attendance date index created');
                });
                
                db.run(`CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id)`, (err) => {
                    if (err) console.error('[RENDER-START] Error creating students index:', err);
                    else console.log('[RENDER-START] Students index created');
                });
                
                db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`, (err) => {
                    if (err) console.error('[RENDER-START] Error creating users username index:', err);
                    else console.log('[RENDER-START] Users username index created');
                });
                
                db.run(`CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id)`, (err) => {
                    if (err) console.error('[RENDER-START] Error creating users student_id index:', err);
                    else console.log('[RENDER-START] Users student_id index created');
                });
                
                // Insert default admin user
                const bcrypt = require('bcryptjs');
                const adminPassword = bcrypt.hashSync('admin123', 10);
                db.run(`INSERT OR IGNORE INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`, 
                    ['admin', adminPassword, 'Administrator', 'admin'], (err) => {
                    if (err) console.error('[RENDER-START] Error creating default admin:', err);
                    else console.log('[RENDER-START] Default admin user ready');
                    
                    // Close database and resolve
                    db.close((closeErr) => {
                        if (closeErr) {
                            console.error('[RENDER-START] Error closing database:', closeErr);
                            reject(closeErr);
                        } else {
                            console.log('[RENDER-START] Database initialization completed');
                            resolve();
                        }
                    });
                });
            });
        });
    });
}

/**
 * Render Startup Script
 * Initializes database and starts the main application
 */
async function startApplication() {
    console.log('[RENDER-START] Starting Attendance Management System on Render...');
    
    try {
        // Ensure directories exist
        console.log('[RENDER-START] Creating necessary directories...');
        const dataDir = './data';
        const backupDir = './data/backups';
        const uploadsDir = './uploads';
        
        [dataDir, backupDir, uploadsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`[RENDER-START] Created directory: ${dir}`);
            }
        });
        
        // Initialize database directly with basic setup
        console.log('[RENDER-START] Initializing database...');
        const dbPath = process.env.DATABASE_PATH || './data/attendance.db';
        
        // Create database connection and basic tables
        await initializeBasicDatabase(dbPath);
        console.log('[RENDER-START] Database initialized successfully');
        
        // Start the main server
        console.log('[RENDER-START] Starting main server...');
        const server = spawn('node', ['server.js'], {
            stdio: 'inherit',
            env: process.env
        });
        
        // Handle server process events
        server.on('error', (error) => {
            console.error('[RENDER-START] Server error:', error);
            process.exit(1);
        });
        
        server.on('exit', (code) => {
            console.log(`[RENDER-START] Server exited with code ${code}`);
            process.exit(code);
        });
        
        // Handle graceful shutdown
        process.on('SIGTERM', () => {
            console.log('[RENDER-START] Received SIGTERM, shutting down gracefully...');
            server.kill('SIGTERM');
        });
        
        process.on('SIGINT', () => {
            console.log('[RENDER-START] Received SIGINT, shutting down gracefully...');
            server.kill('SIGINT');
        });
        
    } catch (error) {
        console.error('[RENDER-START] Failed to start application:', error);
        process.exit(1);
    }
}

// Start the application
startApplication();