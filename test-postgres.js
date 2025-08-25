#!/usr/bin/env node

// Test script to verify PostgreSQL connection works locally
const PostgreSQLDatabase = require('./database-postgres');

async function testPostgreSQLConnection() {
    console.log('🧪 Testing PostgreSQL Database Connection...\n');
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
        console.log('❌ DATABASE_URL not set in environment variables');
        console.log('💡 Set DATABASE_URL to test PostgreSQL connection:');
        console.log('   export DATABASE_URL="postgres://username:password@host:port/database"');
        console.log('   or create a .env file with DATABASE_URL');
        console.log('\n🔧 For local testing, install PostgreSQL and create a database:');
        console.log('   createdb attendance_system');
        console.log('   export DATABASE_URL="postgres://localhost/attendance_system"');
        return;
    }

    const db = new PostgreSQLDatabase();
    
    try {
        console.log('🔌 Connecting to PostgreSQL database...');
        await db.connect();
        
        console.log('✅ Database connected successfully!');
        console.log('📊 Database type: PostgreSQL');
        
        // Test a simple query
        console.log('🔍 Testing query...');
        const users = await db.query('SELECT COUNT(*) as count FROM users');
        console.log(`👥 Users in database: ${users[0].count}`);
        
        // Test table creation
        console.log('🏗️  Database tables initialized successfully');
        
        console.log('✅ All tests passed!');
        console.log('🚀 Your app is ready for Heroku deployment');
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check your DATABASE_URL format');
        console.log('2. Ensure PostgreSQL server is running');
        console.log('3. Verify database exists and credentials are correct');
        console.log('4. Check network connectivity');
        console.log('\n💡 For Heroku deployment:');
        console.log('- Heroku will automatically provide DATABASE_URL');
        console.log('- No local PostgreSQL setup required for deployment');
    } finally {
        await db.close();
    }
}

// Run the test
testPostgreSQLConnection();