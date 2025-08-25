const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

class PostgreSQLDatabase {
    constructor() {
        this.pool = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            // Heroku provides DATABASE_URL automatically
            const connectionString = process.env.DATABASE_URL;
            
            if (connectionString) {
                this.pool = new Pool({
                    connectionString: connectionString,
                    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
                });
            } else {
                // Local PostgreSQL connection
                this.pool = new Pool({
                    host: process.env.DB_HOST || 'localhost',
                    port: process.env.DB_PORT || 5432,
                    user: process.env.DB_USER || 'postgres',
                    password: process.env.DB_PASSWORD || '',
                    database: process.env.DB_NAME || 'attendance_system',
                    ssl: false
                });
            }
            
            // Test connection
            const client = await this.pool.connect();
            client.release();
            
            this.isConnected = true;
            console.log('[INFO] PostgreSQL database connected successfully');
            await this.initializeTables();
        } catch (error) {
            console.error('[ERROR] PostgreSQL connection failed:', error);
            throw error;
        }
    }

    async initializeTables() {
        try {
            const client = await this.pool.connect();
            
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

                console.log('[INFO] PostgreSQL tables initialized successfully');
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('[ERROR] Failed to initialize PostgreSQL tables:', error);
            throw error;
        }
    }

    async query(sql, params = []) {
        try {
            const result = await this.pool.query(sql, params);
            return result.rows;
        } catch (error) {
            console.error('[ERROR] PostgreSQL query failed:', error);
            throw error;
        }
    }

    async get(sql, params = []) {
        try {
            const result = await this.pool.query(sql, params);
            return result.rows[0] || null;
        } catch (error) {
            console.error('[ERROR] PostgreSQL get failed:', error);
            throw error;
        }
    }

    async run(sql, params = []) {
        try {
            const result = await this.pool.query(sql, params);
            return {
                lastInsertId: result.rows[0]?.id || null,
                changes: result.rowCount
            };
        } catch (error) {
            console.error('[ERROR] PostgreSQL run failed:', error);
            throw error;
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            console.log('[INFO] PostgreSQL connection closed');
        }
    }
}

module.exports = PostgreSQLDatabase;