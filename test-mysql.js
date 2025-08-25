#!/usr/bin/env node

// Test script to verify MySQL connection works locally
const DatabaseAdapter = require('./database-adapter');

async function testMySQLConnection() {
    console.log('🧪 Testing MySQL Database Connection...\n');
    
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
        console.log('❌ DATABASE_URL not set in environment variables');
        console.log('💡 Set DATABASE_URL to test MySQL connection:');
        console.log('   export DATABASE_URL="mysql://username:password@host/database"');
        console.log('   or create a .env file with DATABASE_URL');
        return;
    }

    const db = new DatabaseAdapter();
    
    try {
        console.log('🔌 Connecting to database...');
        await db.connect();
        
        console.log('✅ Database connected successfully!');
        console.log(`📊 Database type: ${db.type}`);
        
        // Test a simple query
        console.log('�� Testing query...');
        const users = await db.query('SELECT COUNT(*) as count FROM users');
        console.log(`👥 Users in database: ${users[0].count || users[0].COUNT || 0}`);
        
        console.log('✅ All tests passed!');
        console.log('🚀 Your app is ready for Vercel + PlanetScale deployment');
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check your DATABASE_URL format');
        console.log('2. Ensure PlanetScale database is active');
        console.log('3. Verify connection string is correct');
        console.log('4. Check network connectivity');
    } finally {
        await db.close();
    }
}

// Run the test
testMySQLConnection();