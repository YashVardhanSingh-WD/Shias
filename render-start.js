const { spawn } = require('child_process');
const DatabaseManager = require('./db-manager');

/**
 * Render Startup Script
 * Initializes database and starts the main application
 */
async function startApplication() {
    console.log('[RENDER-START] Starting Attendance Management System on Render...');
    
    try {
        // Initialize database management system
        console.log('[RENDER-START] Initializing database...');
        const dbManager = new DatabaseManager({
            dbPath: process.env.DATABASE_PATH || './data/attendance.db',
            backupDir: './data/backups',
            uploadsDir: './uploads'
        });
        
        await dbManager.initialize();
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