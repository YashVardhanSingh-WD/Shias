const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const moment = require('moment');
const multer = require('multer');
const fs = require('fs');

const FileStore = require('session-file-store')(session);
let sessionStore;

if (process.env.REDIS_URL && process.env.REDIS_URL.startsWith('redis://')) {
    // Use Redis if REDIS_URL is valid
    const { default: RedisStore } = require('connect-redis');
    const { createClient } = require('redis');
    const redisClient = createClient({
        url: process.env.REDIS_URL
    });
    redisClient.connect().catch(console.error);
    sessionStore = new RedisStore({ client: redisClient });
    console.log('Using Redis session store');
} else {
    // Fallback to memory store to avoid file system issues on Windows
    console.log('Using memory-based session store (not suitable for production)');
    // Don't set sessionStore, let express-session use its default memory store
}

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for production (important for session cookies)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    store: sessionStore, // Only used when sessionStore is defined (Redis), otherwise uses default memory store
    secret: process.env.SESSION_SECRET || 'attendance-system-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Always false for now to ensure cookies work in all environments
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    },
    name: 'attendance-session',
    // Add error handling for session operations
    proxy: true,
    unset: 'destroy',
    rolling: false
}));

// Debug: Log session creation and user info
app.use((req, res, next) => {
    if (req.session) {
        console.log('Session ID:', req.sessionID, 'User:', req.session.user);
    }
    next();
});

// Session error handling
app.use((err, req, res, next) => {
    if (err) {
        console.error('Session error:', err);
        // Don't break the request flow, just log the error
        next();
    } else {
        next();
    }
});

// Set up uploads directory
// Ensure sessions directory exists for session-file-store
const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
    console.log('Creating sessions directory at:', SESSIONS_DIR);
    try {
        fs.mkdirSync(SESSIONS_DIR, { recursive: true });
        console.log('Sessions directory created successfully');
    } catch (err) {
        console.error('Failed to create sessions directory:', err);
    }
} else {
    console.log('Sessions directory already exists at:', SESSIONS_DIR);
}
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
}
app.use('/uploads', express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Database setup
const db = new sqlite3.Database('attendance.db');

// Initialize database tables
db.serialize(() => {
    // Users table (admin and students)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        student_id TEXT UNIQUE,
        role TEXT DEFAULT 'student',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Subjects table
    db.run(`CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Students table
    db.run(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

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
    )`);

    // Announcements table
    db.run(`CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'notice',
        priority TEXT DEFAULT 'normal',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Add file_url column if not exists
    db.run(`ALTER TABLE announcements ADD COLUMN file_url TEXT`, err => {});

    // Insert default admin user
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`, 
        ['admin', adminPassword, 'Administrator', 'admin']);
});

// Authentication middleware
const requireAuth = (req, res, next) => {
    console.log('Session check:', req.sessionID, req.session.user);
    if (req.session && req.session.user) {
        next();
    } else {
        if (req.xhr || req.path.startsWith('/api/')) {
            res.status(401).json({ error: 'Authentication required' });
    } else {
        res.redirect('/login');
        }
    }
};

const requireAdmin = (req, res, next) => {
    console.log('Admin check:', req.sessionID, req.session.user);
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', requireAuth, requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/student', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'student.html'));
});

// API Routes

// Session check endpoint (for debugging)
app.get('/api/session/check', (req, res) => {
    res.json({
        sessionId: req.sessionID,
        isAuthenticated: req.session.user ? true : false,
        userId: req.session.user ? req.session.user.id : null,
        username: req.session.user ? req.session.user.username : null,
        role: req.session.user ? req.session.user.role : null,
        cookie: req.session.cookie
    });
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Only admin login is allowed; student login is disabled
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Student login disabled. Use student portal directly.' });
        }
        
        // Regenerate session ID for security, then set user data and save
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regeneration error:', err);
                return res.status(500).json({ error: 'Session error' });
            }
            req.session.user = {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                student_id: user.student_id
            };
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ error: 'Session error' });
                }
                console.log('Admin login successful:', user.username, 'Session ID:', req.sessionID);
                res.json({ 
                    success: true, 
                    user: req.session.user,
                    sessionId: req.sessionID
                });
            });
        });
    });
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Update admin credentials (username and/or password)
app.put('/api/admin/credentials', requireAdmin, (req, res) => {
    const { username: newUsername, password: newPassword } = req.body;

    if (!newUsername && !newPassword) {
        return res.status(400).json({ error: 'Provide username and/or password' });
    }

    db.get('SELECT * FROM users WHERE role = ? LIMIT 1', ['admin'], (err, adminUser) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!adminUser) return res.status(404).json({ error: 'Admin user not found' });

        const doUpdate = (finalUsername, finalPasswordHash) => {
            db.run(
                'UPDATE users SET username = COALESCE(?, username), password = COALESCE(?, password) WHERE id = ?',
                [finalUsername || null, finalPasswordHash || null, adminUser.id],
                function(updateErr) {
                    if (updateErr) return res.status(500).json({ error: 'Database error' });
                    res.json({ success: true });
                }
            );
        };

        const proceedWithUsername = () => {
            if (!newUsername || newUsername === adminUser.username) {
                return newPassword ? doUpdate(null, bcrypt.hashSync(newPassword, 10)) : doUpdate(null, null);
            }

            // Ensure new username is unique
            db.get('SELECT id FROM users WHERE username = ?', [newUsername], (uErr, existing) => {
                if (uErr) return res.status(500).json({ error: 'Database error' });
                if (existing) return res.status(409).json({ error: 'Username already taken' });

                const passwordHash = newPassword ? bcrypt.hashSync(newPassword, 10) : null;
                doUpdate(newUsername, passwordHash);
            });
        };

        proceedWithUsername();
    });
});

// Update a student's ID (student_id) and/or password for login
// Route expects :id to be the students table primary key
app.put('/api/students/:id/credentials', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { student_id: newStudentId, password: newPassword } = req.body;

    if (!newStudentId && !newPassword) {
        return res.status(400).json({ error: 'Provide student_id and/or password' });
    }

    // Fetch student to get current student_id
    db.get('SELECT * FROM students WHERE id = ?', [id], (err, student) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const currentStudentId = student.student_id;

        const updateStudentTable = (callback) => {
            if (!newStudentId || newStudentId === currentStudentId) return callback();

            // Ensure new student_id is unique in students table
            db.get('SELECT id FROM students WHERE student_id = ?', [newStudentId], (uErr, existing) => {
                if (uErr) return res.status(500).json({ error: 'Database error' });
                if (existing) return res.status(409).json({ error: 'student_id already exists' });

                db.run('UPDATE students SET student_id = ? WHERE id = ?', [newStudentId, id], function(updErr) {
                    if (updErr) return res.status(500).json({ error: 'Database error' });
                    callback();
                });
            });
        };

        const upsertUser = () => {
            // Try to find existing user linked by student_id in users table
            db.get('SELECT * FROM users WHERE student_id = ?', [currentStudentId], (uErr, user) => {
                if (uErr) return res.status(500).json({ error: 'Database error' });

                const finalStudentId = newStudentId || currentStudentId;
                const updateUsernameTo = finalStudentId; // use student_id as username
                const maybePasswordHash = newPassword ? bcrypt.hashSync(newPassword, 10) : null;

                const ensureUsernameUniqueThen = (next) => {
                    if (!newStudentId || (user && user.username === updateUsernameTo)) return next();
                    db.get('SELECT id FROM users WHERE username = ?', [updateUsernameTo], (chkErr, exists) => {
                        if (chkErr) return res.status(500).json({ error: 'Database error' });
                        if (exists) return res.status(409).json({ error: 'Username already taken' });
                        next();
                    });
                };

                ensureUsernameUniqueThen(() => {
                    if (user) {
                        // Update existing user record
                        db.run(
                            'UPDATE users SET username = ?, student_id = ?, password = COALESCE(?, password), role = ? WHERE id = ?',
                            [updateUsernameTo, finalStudentId, maybePasswordHash || null, 'student', user.id],
                            function(updUserErr) {
                                if (updUserErr) return res.status(500).json({ error: 'Database error' });
                                return res.json({ success: true });
                            }
                        );
                    } else {
                        // Create a new user record for this student (password required)
                        if (!newPassword) {
                            return res.status(400).json({ error: 'Password required to create student login' });
                        }
                        const passwordHash = bcrypt.hashSync(newPassword, 10);
                        db.run(
                            'INSERT INTO users (username, password, name, student_id, role) VALUES (?, ?, ?, ?, ?)',
                            [updateUsernameTo, passwordHash, student.name, finalStudentId, 'student'],
                            function(insErr) {
                                if (insErr) return res.status(500).json({ error: 'Database error' });
                                return res.json({ success: true });
                            }
                        );
                    }
                });
            });
        };

        updateStudentTable(upsertUser);
    });
});

// Get current user
app.get('/api/user', (req, res) => {
    res.json(req.session.user || null);
});

// Subjects API
app.get('/api/subjects', requireAuth, (req, res) => {
    db.all('SELECT * FROM subjects ORDER BY name', (err, subjects) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(subjects);
    });
});

app.post('/api/subjects', requireAdmin, (req, res) => {
    const { name, description } = req.body;
    db.run('INSERT INTO subjects (name, description) VALUES (?, ?)', [name, description], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ id: this.lastID, name, description });
    });
});

app.delete('/api/subjects/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM subjects WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
    });
});

// Students API
app.get('/api/students', requireAuth, (req, res) => {
    db.all('SELECT * FROM students ORDER BY id', (err, students) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(students);
    });
});

app.post('/api/students', requireAdmin, (req, res) => {
    const { student_id, name, email, phone } = req.body;
    if (student_id && student_id.trim() !== "") {
        // Use provided student_id
        db.run('INSERT INTO students (student_id, name, email, phone) VALUES (?, ?, ?, ?)', 
            [student_id, name, email, phone], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ id: this.lastID, student_id, name, email, phone });
        });
    } else {
        // Auto-generate student_id
        db.get('SELECT MAX(CAST(student_id AS INTEGER)) as max_id FROM students', (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            const nextId = (result.max_id || 0) + 1;
            const autoId = nextId.toString();
            db.run('INSERT INTO students (student_id, name, email, phone) VALUES (?, ?, ?, ?)', 
                [autoId, name, email, phone], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json({ id: this.lastID, student_id: autoId, name, email, phone });
            });
        });
    }
});

app.delete('/api/students/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    
    // First delete the student
    db.run('DELETE FROM students WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Then reorder the remaining student IDs to be sequential
        db.all('SELECT id FROM students ORDER BY id', (err, students) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            // Update each student with a sequential ID
            let updateCount = 0;
            students.forEach((student, index) => {
                const newStudentId = (index + 1).toString();
                db.run('UPDATE students SET student_id = ? WHERE id = ?', [newStudentId, student.id], (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating student ID:', updateErr);
                    }
                    updateCount++;
                    
                    // When all updates are done, send response
                    if (updateCount === students.length) {
                        res.json({ success: true });
                    }
                });
            });
            
            // If no students left, send response immediately
            if (students.length === 0) {
        res.json({ success: true });
            }
        });
    });
});

// Attendance API
app.get('/api/attendance', requireAuth, (req, res) => {
    const { subject_id, date } = req.query;
    let query = `
        SELECT a.*, s.name as student_name, s.student_id as student_code, sub.name as subject_name
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN subjects sub ON a.subject_id = sub.id
    `;
    let params = [];
    
    if (subject_id && date) {
        query += ' WHERE a.subject_id = ? AND a.date = ?';
        params = [subject_id, date];
    } else if (subject_id) {
        query += ' WHERE a.subject_id = ?';
        params = [subject_id];
    } else if (date) {
        query += ' WHERE a.date = ?';
        params = [date];
    }
    
    query += ' ORDER BY s.id';
    
    db.all(query, params, (err, attendance) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(attendance);
    });
});

// Delete attendance record by ID
app.delete('/api/attendance/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    
    // First check if the record exists
    db.get('SELECT * FROM attendance WHERE id = ?', [id], (err, record) => {
        if (err) {
            console.log('Database error when fetching attendance record:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!record) {
            return res.status(404).json({ error: 'Attendance record not found' });
        }
        
        // Delete the record
        db.run('DELETE FROM attendance WHERE id = ?', [id], function(err) {
            if (err) {
                console.log('Database error when deleting attendance record:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            console.log('Attendance record deleted successfully, ID:', id);
            res.json({ success: true, message: 'Attendance record deleted successfully' });
        });
    });
});

// Delete attendance records by date
app.delete('/api/attendance/date/:date', requireAdmin, (req, res) => {
    const { date } = req.params;
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    // First check if any records exist for this date
    db.all('SELECT * FROM attendance WHERE date = ?', [date], (err, records) => {
        if (err) {
            console.log('Database error when fetching attendance records:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (records.length === 0) {
            return res.status(404).json({ error: 'No attendance records found for this date' });
        }
        
        // Delete all records for this date
        db.run('DELETE FROM attendance WHERE date = ?', [date], function(err) {
            if (err) {
                console.log('Database error when deleting attendance records:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            console.log(`Deleted ${records.length} attendance records for date: ${date}`);
            res.json({ success: true, message: `Deleted ${records.length} attendance records for date ${date}` });
        });
    });
});

// Delete attendance records by date range
app.delete('/api/attendance/range', requireAdmin, (req, res) => {
    const { start_date, end_date } = req.body;
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    // Validate date range
    if (new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({ error: 'End date must be after start date' });
    }
    
    // First check if any records exist for this date range
    db.all('SELECT * FROM attendance WHERE date BETWEEN ? AND ?', [start_date, end_date], (err, records) => {
        if (err) {
            console.log('Database error when fetching attendance records:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (records.length === 0) {
            return res.status(404).json({ error: 'No attendance records found for this date range' });
        }
        
        // Delete all records for this date range
        db.run('DELETE FROM attendance WHERE date BETWEEN ? AND ?', [start_date, end_date], function(err) {
            if (err) {
                console.log('Database error when deleting attendance records:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            console.log(`Deleted ${records.length} attendance records for date range: ${start_date} to ${end_date}`);
            res.json({ success: true, message: `Deleted ${records.length} attendance records for date range ${start_date} to ${end_date}` });
        });
    });
});

app.post('/api/attendance', requireAdmin, (req, res) => {
    const { subject_id, date, attendance_data } = req.body;
    
    // Delete existing attendance for this subject and date
    db.run('DELETE FROM attendance WHERE subject_id = ? AND date = ?', [subject_id, date], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Insert new attendance records
        const stmt = db.prepare('INSERT INTO attendance (student_id, subject_id, date, status) VALUES (?, ?, ?, ?)');
        
        attendance_data.forEach(record => {
            stmt.run(record.student_id, subject_id, date, record.status);
        });
        
        stmt.finalize((err) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true });
        });
    });
});

// Get attendance history for a student
app.get('/api/attendance/student/:student_id', requireAuth, (req, res) => {
    const { student_id } = req.params;
    const { subject_id } = req.query;
    
    let query = `
        SELECT a.*, s.name as subject_name, s.id as subject_id
        FROM attendance a
        JOIN subjects s ON a.subject_id = s.id
        WHERE a.student_id = ?
    `;
    let params = [student_id];
    
    if (subject_id) {
        query += ' AND a.subject_id = ?';
        params.push(subject_id);
    }
    
    query += ' ORDER BY a.date DESC, s.name';
    
    db.all(query, params, (err, attendance) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(attendance);
    });
});



// Get attendance statistics
app.get('/api/attendance/stats', requireAuth, (req, res) => {
    const { student_id, subject_id, start_date, end_date } = req.query;
    
    let query = `
        SELECT
            s.name as subject_name,
            COUNT(*) as total_classes,
            SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
            ROUND(CAST(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 2) as percentage
        FROM attendance a
        JOIN subjects s ON a.subject_id = s.id
        WHERE 1=1
    `;
    let params = [];
    
    if (student_id) {
        query += ' AND a.student_id = ?';
        params.push(student_id);
    }
    
    if (subject_id) {
        query += ' AND a.subject_id = ?';
        params.push(subject_id);
    }
    
    if (start_date) {
        query += ' AND a.date >= ?';
        params.push(start_date);
    }
    
    if (end_date) {
        query += ' AND a.date <= ?';
        params.push(end_date);
    }
    
    query += ' GROUP BY s.id, s.name ORDER BY s.id';
    
    db.all(query, params, (err, stats) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(stats);
    });
});


// Detailed attendance records endpoint
app.get('/api/attendance/records', requireAuth, (req, res) => {
    const { subject_id, start_date, end_date } = req.query;
    
    let query = `
        SELECT a.id, a.date, s.student_id, s.name, sub.name as subject_name, a.status
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN subjects sub ON a.subject_id = sub.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (subject_id) {
        query += ' AND a.subject_id = ?';
        params.push(subject_id);
    }
    
    if (start_date) {
        query += ' AND a.date >= ?';
        params.push(start_date);
    }
    
    if (end_date) {
        query += ' AND a.date <= ?';
        params.push(end_date);
    }
    
    query += ' ORDER BY a.date DESC, s.id';
    
    db.all(query, params, (err, records) => {
        if (err) {
            console.error('Database error in /api/attendance/records:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }
        console.log(`Returning ${records.length} attendance records`);
        res.json(records);
    });
});

// Export detailed records as CSV
app.get('/api/attendance/records/export', requireAuth, (req, res) => {
    const { subject_id, start_date, end_date } = req.query;
    
    let query = `
        SELECT a.date, s.student_id, s.name, sub.name as subject_name, a.status
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        JOIN subjects sub ON a.subject_id = sub.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (subject_id) {
        query += ' AND a.subject_id = ?';
        params.push(subject_id);
    }
    
    if (start_date) {
        query += ' AND a.date >= ?';
        params.push(start_date);
    }
    
    if (end_date) {
        query += ' AND a.date <= ?';
        params.push(end_date);
    }
    
    query += ' ORDER BY a.date DESC, s.id';
    
    db.all(query, params, (err, records) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Generate CSV
        const csvHeader = 'Date,Student ID,Name,Subject,Status\n';
        const csvRows = records.map(row => {
            // Format date properly for CSV
            const date = new Date(row.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            return `${formattedDate},${row.student_id},${row.name},${row.subject_name},${row.status}`;
        }).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance_records.csv');
        res.send(csvHeader + csvRows);
    });
});

// Public endpoints for student portal (no login required)
app.get('/api/public/subjects', (req, res) => {
    db.all('SELECT * FROM subjects ORDER BY name', (err, subjects) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(subjects);
    });
});

// Get public student details by student_id
app.get('/api/public/student/:student_id', (req, res) => {
    const { student_id } = req.params;
    db.get('SELECT * FROM students WHERE student_id = ?', [student_id], (err, student) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json(student);
    });
});

// Public: Get attendance history for a student
app.get('/api/public/attendance/student/:student_id', (req, res) => {
    const { student_id } = req.params;
    const { subject_id } = req.query;

    // First get the student's ID from their student_id
    db.get('SELECT id FROM students WHERE student_id = ?', [student_id], (err, student) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

    let query = `
        SELECT a.*, s.name as subject_name, s.id as subject_id
        FROM attendance a
        JOIN subjects s ON a.subject_id = s.id
        WHERE a.student_id = ?
    `;
        let params = [student.id];

    if (subject_id) {
        query += ' AND a.subject_id = ?';
        params.push(subject_id);
    }

    query += ' ORDER BY a.date DESC, s.name';

    db.all(query, params, (err, attendance) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(attendance);
        });
    });
});

// Public: Get attendance statistics for a student
app.get('/api/public/attendance/stats', (req, res) => {
    const { student_id, subject_id, start_date, end_date } = req.query;

    if (!student_id) {
        return res.status(400).json({ error: 'Student ID is required' });
    }

    // First get the student's ID from their student_id
    db.get('SELECT id FROM students WHERE student_id = ?', [student_id], (err, student) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

    let query = `
        SELECT 
            s.name as subject_name,
            COUNT(*) as total_classes,
            SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
            ROUND(CAST(SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100, 2) as percentage
        FROM attendance a
        JOIN subjects s ON a.subject_id = s.id
            WHERE a.student_id = ?
        `;
        let params = [student.id];

    if (subject_id) {
        query += ' AND a.subject_id = ?';
        params.push(subject_id);
    }
        if (start_date) {
            query += ' AND a.date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND a.date <= ?';
            params.push(end_date);
        }

        query += ' GROUP BY s.id, s.name ORDER BY s.id';

    db.all(query, params, (err, stats) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(stats);
        });
    });
});

// Announcements API
app.get('/api/announcements', requireAuth, (req, res) => {
    console.log('GET /api/announcements called');
    db.all('SELECT * FROM announcements WHERE is_active = 1 ORDER BY priority DESC, created_at DESC', (err, announcements) => {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        console.log('Found', announcements.length, 'announcements');
        res.json(announcements);
    });
});

app.post('/api/announcements', requireAdmin, upload.single('file'), (req, res) => {
    console.log('POST /api/announcements called');
    // DEBUG: log req.body and req.file
    console.log('POST /api/announcements req.body:', req.body);
    console.log('POST /api/announcements req.file:', req.file);
    const title = req.body.title;
    const content = req.body.content;
    const type = req.body.type;
    const priority = req.body.priority;
    const is_active = req.body.is_active;
    let file_url = null;
    if (req.file) {
        file_url = '/uploads/' + req.file.filename;
    }
    console.log('Announcement data:', { title, content, type, priority, is_active, file_url });
    if (!title || !content) {
        console.log('Title or content missing');
        return res.status(400).json({ error: 'Title and content are required' });
    }
    db.run('INSERT INTO announcements (title, content, type, priority, is_active, file_url) VALUES (?, ?, ?, ?, ?, ?)',
        [title, content, type || 'notice', priority || 'normal', is_active || 1, file_url], function(err) {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        console.log('Announcement created with ID:', this.lastID);
        res.json({ id: this.lastID, title, content, type, priority, is_active, file_url });
    });
});

app.put('/api/announcements/:id', requireAdmin, upload.single('file'), (req, res) => {
    console.log('PUT /api/announcements/:id called with id:', req.params.id);
    // DEBUG: log req.body and req.file
    console.log('PUT /api/announcements req.body:', req.body);
    console.log('PUT /api/announcements req.file:', req.file);
    const { id } = req.params;
    const title = req.body.title;
    const content = req.body.content;
    const type = req.body.type;
    const priority = req.body.priority;
    const is_active = req.body.is_active;
    let file_url = null;
    if (req.file) {
        file_url = '/uploads/' + req.file.filename;
    }
    console.log('Announcement update data:', { id, title, content, type, priority, is_active, file_url });
    const updateQuery = file_url ?
        'UPDATE announcements SET title = ?, content = ?, type = ?, priority = ?, is_active = ?, file_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        :
        'UPDATE announcements SET title = ?, content = ?, type = ?, priority = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const params = file_url ?
        [title, content, type, priority, is_active, file_url, id]
        :
        [title, content, type, priority, is_active, id];
    if (!title || !content) {
        console.log('Title or content missing');
        return res.status(400).json({ error: 'Title and content are required' });
    }
    db.run(updateQuery, params, function(err) {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        console.log('Announcement updated successfully');
        res.json({ success: true });
    });
});

app.delete('/api/announcements/:id', requireAdmin, (req, res) => {
    console.log('DELETE /api/announcements/:id called with id:', req.params.id);
    const { id } = req.params;
    db.run('DELETE FROM announcements WHERE id = ?', [id], function(err) {
        if (err) {
            console.log('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        console.log('Announcement deleted successfully');
        res.json({ success: true });
    });
});

// Public announcements endpoint for student portal
app.get('/api/public/announcements', (req, res) => {
    db.all('SELECT * FROM announcements WHERE is_active = 1 ORDER BY priority DESC, created_at DESC', (err, announcements) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(announcements);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Attendance Management System running on http://localhost:${PORT}`);
    console.log('Default admin credentials: username: admin, password: admin123');
});
