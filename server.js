const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const moment = require('moment');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('./database');

// Initialize database
const db = new Database();

// Input validation utilities
const validators = {
    isValidDate: (dateString) => {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    },
    isValidEmail: (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },
    sanitizeString: (str) => {
        if (typeof str !== 'string') return '';
        return str.trim().replace(/[<>]/g, '');
    },
    isValidStudentId: (id) => {
        return /^[a-zA-Z0-9]+$/.test(id);
    }
};

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for production
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
const generateSessionSecret = () => {
    return crypto.randomBytes(64).toString('hex');
};

const sessionSecret = process.env.SESSION_SECRET || generateSessionSecret();
if (!process.env.SESSION_SECRET) {
    console.warn('[WARN] SESSION_SECRET not set. Using generated secret (not suitable for production)');
}

// Create sessions directory
const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Configure session store
let sessionStore;
if (process.env.NODE_ENV === 'production') {
    // Use file store for production
    const FileStore = require('session-file-store')(session);
    sessionStore = new FileStore({
        path: SESSIONS_DIR,
        ttl: 86400, // 24 hours
        retries: 5,
        factor: 1,
        minTimeout: 50,
        maxTimeout: 86400000
    });
    console.log('[INFO] Using file-based session store for production');
} else {
    // Use memory store for development (with warning suppression)
    console.log('[INFO] Using memory session store for development');
}

app.use(session({
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    },
    name: 'attendance-session'
}));

// Delete a single attendance record by id
app.delete('/api/attendance/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.run('DELETE FROM attendance WHERE id = $1', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Attendance deletion error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
  // Delete an announcement
app.delete('/api/announcements/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // First, get the file url (if exists) to remove the uploaded file
    const announcement = await db.get('SELECT file_url FROM announcements WHERE id = $1', [id]);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    if (announcement.file_url) {
      // Remove the file from uploads
      const filePath = path.join(__dirname, announcement.file_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    const result = await db.run('DELETE FROM announcements WHERE id = $1', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Announcement deletion error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Set up uploads directory
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
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

// Initialize database connection
db.connect().catch(error => {
    console.error('[ERROR] Failed to connect to database:', error);
    process.exit(1);
});

// Authentication middleware
const requireAuth = (req, res, next) => {
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

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await db.get('SELECT * FROM users WHERE username = $1', [username]);
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Student login disabled. Use student portal directly.' });
        }
        
        req.session.user = {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            student_id: user.student_id
        };
        
        res.json({ 
            success: true, 
            user: req.session.user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Get current user
app.get('/api/user', (req, res) => {
    res.json(req.session.user || null);
});

// Subjects API
app.get('/api/subjects', requireAuth, async (req, res) => {
    try {
        const subjects = await db.query('SELECT * FROM subjects ORDER BY name');
        res.json(subjects);
    } catch (error) {
        console.error('Subjects fetch error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/subjects', requireAdmin, async (req, res) => {
    try {
        const { name, description } = req.body;
        const result = await db.run('INSERT INTO subjects (name, description) VALUES ($1, $2) RETURNING id', [name, description]);
        res.json({ id: result.lastInsertId, name, description });
    } catch (error) {
        console.error('Subject creation error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/subjects/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.run('DELETE FROM subjects WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Subject deletion error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Students API
app.get('/api/students', requireAuth, async (req, res) => {
    try {
        const students = await db.query('SELECT * FROM students ORDER BY id');
        res.json(students);
    } catch (error) {
        console.error('Students fetch error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/students', requireAdmin, async (req, res) => {
    try {
        const { student_id, name, email, phone } = req.body;

        if (student_id && student_id.trim() !== "") {
            // Check if student_id already exists
            const existing = await db.get('SELECT id FROM students WHERE student_id = $1', [student_id]);
            if (existing) {
                return res.status(400).json({ error: 'Student ID already exists' });
            }
            
            const result = await db.run('INSERT INTO students (student_id, name, email, phone) VALUES ($1, $2, $3, $4) RETURNING id', 
                [student_id, name, email, phone]);
            res.json({ id: result.lastInsertId, student_id, name, email, phone });
        } else {
            // Auto-generate student_id
            const maxResult = await db.get('SELECT MAX(CAST(student_id AS INTEGER)) as max_id FROM students');
            const nextId = (maxResult?.max_id || 0) + 1;
            const autoId = nextId.toString();
            
            const result = await db.run('INSERT INTO students (student_id, name, email, phone) VALUES ($1, $2, $3, $4) RETURNING id', 
                [autoId, name, email, phone]);
            res.json({ id: result.lastInsertId, student_id: autoId, name, email, phone });
        }
    } catch (error) {
        console.error('Student creation error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/students/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const result = await db.run('UPDATE students SET name = $1, email = $2, phone = $3 WHERE id = $4', 
            [name, email, phone, id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Student update error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/students/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.run('DELETE FROM students WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Student deletion error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

const PDFDocument = require('pdfkit');
const { Writable } = require('stream');

// Attendance API
app.get('/api/attendance', requireAuth, async (req, res) => {
    try {
        const { subject_id, date } = req.query;
        let query = `
            SELECT a.*, s.name as student_name, s.student_id as student_code, sub.name as subject_name
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN subjects sub ON a.subject_id = sub.id
        `;
        let params = [];
        
        if (subject_id && date) {
            query += ' WHERE a.subject_id = $1 AND a.date = $2';
            params = [subject_id, date];
        } else if (subject_id) {
            query += ' WHERE a.subject_id = $1';
            params = [subject_id];
        } else if (date) {
            query += ' WHERE a.date = $1';
            params = [date];
        }
        
        query += ' ORDER BY s.id';
        
        const attendance = await db.query(query, params);
        res.json(attendance);
    } catch (error) {
        console.error('Attendance fetch error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/attendance', requireAdmin, async (req, res) => {
    try {
        const { subject_id, date, attendance_data } = req.body;
        
        // Delete existing attendance for this subject and date
        await db.run('DELETE FROM attendance WHERE subject_id = $1 AND date = $2', [subject_id, date]);
        
        // Insert new attendance records
        for (const record of attendance_data) {
            await db.run('INSERT INTO attendance (student_id, subject_id, date, status) VALUES ($1, $2, $3, $4)', 
                [record.student_id, subject_id, date, record.status]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Attendance save error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Attendance records export endpoint
// PDF Export of attendance records
app.get('/api/attendance/records/export', requireAuth, async (req, res) => {
  try {
    const { subject_id, start_date, end_date } = req.query;
    let query = `
      SELECT a.date, s.student_id AS student_code, s.name AS student_name, sub.name AS subject_name, a.status
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN subjects sub ON a.subject_id = sub.id
    `;
    let params = [];
    let where = [];
    if (subject_id) { where.push('a.subject_id = $' + (params.length + 1)); params.push(subject_id); }
    if (start_date) { where.push('a.date >= $' + (params.length + 1)); params.push(start_date); }
    if (end_date) { where.push('a.date <= $' + (params.length + 1)); params.push(end_date); }
    if (where.length > 0) { query += " WHERE " + where.join(" AND "); }
    query += " ORDER BY a.date DESC, s.name";

    const attendance = await db.query(query, params);

    // Generate PDF
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance-report.pdf');
    doc.pipe(res);

    doc.fontSize(18).text('Attendance Report', { align: 'center' });
    doc.text(`Exported At: ${new Date().toLocaleString()}\n\n`, { align: 'center' });
    // Table headers
    doc.fontSize(12);
    doc.text('Date', 40, doc.y, { continued: true, width: 80 });
    doc.text('Student ID', 120, doc.y, { continued: true, width: 80 });
    doc.text('Name', 200, doc.y, { continued: true, width: 150 });
    doc.text('Subject', 350, doc.y, { continued: true, width: 100 });
    doc.text('Status', 450, doc.y);
    doc.moveDown(0.5).moveTo(40, doc.y).lineTo(550, doc.y).stroke();

    // Table rows
    attendance.forEach((rec) => {
      doc.text(rec.date, 40, doc.y, { continued: true, width: 80 });
      doc.text(rec.student_code, 120, doc.y, { continued: true, width: 80 });
      doc.text(rec.student_name, 200, doc.y, { continued: true, width: 150 });
      doc.text(rec.subject_name, 350, doc.y, { continued: true, width: 100 });
      doc.text(rec.status, 450, doc.y);
    });

    doc.end();
  } catch (error) {
    console.error('Attendance export error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});


// Public endpoints for student portal
app.get('/api/public/subjects', async (req, res) => {
    try {
        const subjects = await db.query('SELECT * FROM subjects ORDER BY name');
        res.json(subjects);
    } catch (error) {
        console.error('Public subjects fetch error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/public/student/:student_id', async (req, res) => {
    try {
        const { student_id } = req.params;
        const student = await db.get('SELECT * FROM students WHERE student_id = $1', [student_id]);
        
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        
        res.json(student);
    } catch (error) {
        console.error('Public student fetch error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/public/attendance/student/:student_id', async (req, res) => {
    try {
        const { student_id } = req.params;
        const { subject_id } = req.query;

        const student = await db.get('SELECT id FROM students WHERE student_id = $1', [student_id]);
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        let query = `
            SELECT a.*, s.name as subject_name, s.id as subject_id
            FROM attendance a
            JOIN subjects s ON a.subject_id = s.id
            WHERE a.student_id = $1
        `;
        let params = [student.id];

        if (subject_id) {
            query += ' AND a.subject_id = $2';
            params.push(subject_id);
        }

        query += ' ORDER BY a.date DESC, s.name';

        const attendance = await db.query(query, params);
        res.json(attendance);
    } catch (error) {
        console.error('Public attendance fetch error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/public/attendance/stats', async (req, res) => {
    try {
        const { student_id, subject_id, start_date, end_date } = req.query;

        if (!student_id) {
            return res.status(400).json({ error: 'Student ID is required' });
        }

        const student = await db.get('SELECT id FROM students WHERE student_id = $1', [student_id]);
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
            WHERE a.student_id = $1
        `;
        let params = [student.id];
        let paramCount = 1;

        if (subject_id) {
            query += ` AND a.subject_id = $${++paramCount}`;
            params.push(subject_id);
        }
        if (start_date) {
            query += ` AND a.date >= $${++paramCount}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND a.date <= $${++paramCount}`;
            params.push(end_date);
        }

        query += ' GROUP BY s.id, s.name ORDER BY s.id';

        const stats = await db.query(query, params);
        res.json(stats);
    } catch (error) {
        console.error('Public stats fetch error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Announcements API
app.get('/api/announcements', requireAuth, async (req, res) => {
    try {
        const announcements = await db.query('SELECT * FROM announcements WHERE is_active = true ORDER BY priority DESC, created_at DESC');
        res.json(announcements);
    } catch (error) {
        console.error('Announcements fetch error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/announcements', requireAdmin, upload.single('file'), async (req, res) => {
    try {
        const { title, content, type, priority, is_active } = req.body;
        let file_url = null;
        
        if (req.file) {
            file_url = '/uploads/' + req.file.filename;
        }
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        const result = await db.run(
            'INSERT INTO announcements (title, content, type, priority, is_active, file_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [title, content, type || 'notice', priority || 'normal', is_active || true, file_url]
        );
        
        res.json({ id: result.lastInsertId, title, content, type, priority, is_active, file_url });
    } catch (error) {
        console.error('Announcement creation error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/public/announcements', async (req, res) => {
    try {
        const announcements = await db.query('SELECT * FROM announcements WHERE is_active = true ORDER BY priority DESC, created_at DESC');
        res.json(announcements);
    } catch (error) {
        console.error('Public announcements fetch error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin credentials management
app.put('/api/admin/credentials', requireAdmin, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username && !password) {
            return res.status(400).json({ error: 'Either username or password must be provided' });
        }

        // Validate username if provided
        if (username) {
            if (username.length < 3) {
                return res.status(400).json({ error: 'Username must be at least 3 characters long' });
            }
            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
            }
            
            // Check if username already exists (excluding current user)
            const existingUser = await db.get('SELECT id FROM users WHERE username = $1 AND id != $2', 
                [username, req.session.user.id]);
            if (existingUser) {
                return res.status(400).json({ error: 'Username already exists' });
            }
        }

        // Validate password if provided
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters long' });
            }
        }

        let updateQuery = '';
        let updateParams = [];
        let paramCount = 0;

        if (username && password) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            updateQuery = 'UPDATE users SET username = $1, password = $2 WHERE id = $3';
            updateParams = [username, hashedPassword, req.session.user.id];
        } else if (username) {
            updateQuery = 'UPDATE users SET username = $1 WHERE id = $2';
            updateParams = [username, req.session.user.id];
        } else if (password) {
            const hashedPassword = bcrypt.hashSync(password, 10);
            updateQuery = 'UPDATE users SET password = $1 WHERE id = $2';
            updateParams = [hashedPassword, req.session.user.id];
        }

        const result = await db.run(updateQuery, updateParams);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update session if username changed
        if (username) {
            req.session.user.username = username;
        }

        res.json({ success: true, message: 'Credentials updated successfully' });
    } catch (error) {
        console.error('Error updating credentials:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Attendance Management System running on http://localhost:${PORT}`);
    console.log('📊 Database: Railway PostgreSQL (production) / SQLite (development)');
    console.log('💾 Sessions: File-based store (production) / Memory store (development)');
    console.log('🔑 Default admin credentials: username: admin, password: admin123');
    console.log('🌐 Ready for Railway deployment!');
});
