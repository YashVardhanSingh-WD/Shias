// Simple session test script
const express = require('express');
const session = require('express-session');
const app = express();

// Basic session configuration
app.use(session({
    secret: 'test-secret-key',
    resave: true,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(express.json());

// Test routes
app.get('/test', (req, res) => {
    res.json({
        sessionId: req.sessionID,
        sessionData: req.session,
        message: 'Session test endpoint'
    });
});

app.post('/test-login', (req, res) => {
    req.session.user = {
        id: 1,
        username: 'testuser',
        role: 'admin'
    };
    
    req.session.save((err) => {
        if (err) {
            return res.status(500).json({ error: 'Session save failed' });
        }
        res.json({
            success: true,
            sessionId: req.sessionID,
            user: req.session.user
        });
    });
});

app.get('/test-check', (req, res) => {
    res.json({
        sessionId: req.sessionID,
        isAuthenticated: !!req.session.user,
        user: req.session.user || null
    });
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Session test server running on http://localhost:${PORT}`);
    console.log('Test endpoints:');
    console.log('- GET /test - Check session info');
    console.log('- POST /test-login - Simulate login');
    console.log('- GET /test-check - Check authentication');
});
