const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

class MySQLDatabase {
    constructor() {
        this.connection = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            if (process.env.DATABASE_URL) {
                // PlanetScale connection
                this.connection = await mysql.createConnection(process.env.DATABASE_URL);
            } else {
                // Local MySQL connection
                this.connection = await mysql.createConnection({
                    host: process.env.DB_HOST || 'localhost',
                    user: process.env.DB_USER || 'root',
                    password: process.env.DB_PASSWORD || '',
                    database: process.env.DB_NAME || 'attendance_system',
                    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
                });
            }
            
            this.isConnected = true;
            console.log('[INFO] MySQL database connected successfully');
            await this.initializeTables();
        } catch (error) {
            console.error('[ERROR] MySQL connection failed:', error);
            throw error;
        }
    }

    async initializeTables() {
        try {
            // Users table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    student_id VARCHAR(255) UNIQUE,
                    role VARCHAR(50) DEFAULT 'student',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Subjects table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS subjects (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Students table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS students (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id VARCHAR(255) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255),
                    phone VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Attendance table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS attendance (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    student_id INT,
                    subject_id INT,
                    date DATE NOT NULL,
                    status VARCHAR(50) DEFAULT 'present',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE CASCADE,
                    FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
                )
            `);

            // Announcements table
            await this.connection.execute(`
                CREATE TABLE IF NOT EXISTS announcements (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    type VARCHAR(50) DEFAULT 'notice',
                    priority VARCHAR(50) DEFAULT 'normal',
                    is_active BOOLEAN DEFAULT 1,
                    file_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);

            // Create indexes
            await this.connection.execute(`CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id)`);
            await this.connection.execute(`CREATE INDEX IF NOT EXISTS idx_attendance_subject_id ON attendance(subject_id)`);
            await this.connection.execute(`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)`);
            await this.connection.execute(`CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id)`);
            await this.connection.execute(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
            await this.connection.execute(`CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id)`);

            // Insert default admin user
            const adminPassword = bcrypt.hashSync('admin123', 10);
            await this.connection.execute(`
                INSERT IGNORE INTO users (username, password, name, role) 
                VALUES (?, ?, ?, ?)
            `, ['admin', adminPassword, 'Administrator', 'admin']);

            console.log('[INFO] MySQL tables initialized successfully');
        } catch (error) {
            console.error('[ERROR] Failed to initialize MySQL tables:', error);
            throw error;
        }
    }

    async query(sql, params = []) {
        try {
            const [rows] = await this.connection.execute(sql, params);
            return rows;
        } catch (error) {
            console.error('[ERROR] MySQL query failed:', error);
            throw error;
        }
    }

    async get(sql, params = []) {
        try {
            const [rows] = await this.connection.execute(sql, params);
            return rows[0] || null;
        } catch (error) {
            console.error('[ERROR] MySQL get failed:', error);
            throw error;
        }
    }

    async run(sql, params = []) {
        try {
            const [result] = await this.connection.execute(sql, params);
            return {
                lastInsertId: result.insertId,
                changes: result.affectedRows
            };
        } catch (error) {
            console.error('[ERROR] MySQL run failed:', error);
            throw error;
        }
    }

    async close() {
        if (this.connection) {
            await this.connection.end();
            this.isConnected = false;
            console.log('[INFO] MySQL connection closed');
        }
    }
}

module.exports = MySQLDatabase;