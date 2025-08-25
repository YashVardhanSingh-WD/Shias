#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Vercel + PlanetScale deployment...\n');

// Check if required files exist
const requiredFiles = [
    'vercel.json',
    'package.json',
    'server.js',
    'database-adapter.js',
    'VERCEL_PLANETSCALE_GUIDE.md'
];

console.log('✅ Checking required files...');
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`   ✓ ${file}`);
    } else {
        console.log(`   ✗ ${file} - MISSING!`);
    }
});

// Create .env.example for Vercel
const envExample = `# Vercel + PlanetScale Environment Variables

# Database Configuration
DATABASE_URL=mysql://username:password@host/database?ssl={"rejectUnauthorized":true}

# Security
NODE_ENV=production
SESSION_SECRET=your-super-secure-random-string-change-this-in-production

# File Upload Configuration
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx

# Admin Configuration
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123

# Application Settings
APP_NAME=Attendance Management System
APP_VERSION=1.0.0
`;

fs.writeFileSync('.env.vercel.example', envExample);
console.log('✅ Created .env.vercel.example');

// Create deployment checklist
const checklist = `# Vercel + PlanetScale Deployment Checklist

## Pre-deployment:
- [ ] Code pushed to GitHub
- [ ] PlanetScale account created
- [ ] PlanetScale database created
- [ ] Database connection string obtained
- [ ] Vercel account created

## Deployment:
- [ ] Import GitHub repo to Vercel
- [ ] Set environment variables in Vercel:
  - [ ] DATABASE_URL (from PlanetScale)
  - [ ] SESSION_SECRET (random secure string)
  - [ ] NODE_ENV=production
- [ ] Deploy project
- [ ] Test admin login (admin/admin123)
- [ ] Change default admin credentials
- [ ] Test database persistence

## Post-deployment:
- [ ] Custom domain configured (optional)
- [ ] SSL certificate verified
- [ ] Performance monitoring set up
- [ ] Backup strategy implemented

## Environment Variables for Vercel:
\`\`\`
DATABASE_URL=mysql://your-planetscale-connection-string
SESSION_SECRET=your-super-secure-random-string
NODE_ENV=production
\`\`\`

## Quick Links:
- Vercel Dashboard: https://vercel.com/dashboard
- PlanetScale Dashboard: https://app.planetscale.com
- Deployment Guide: ./VERCEL_PLANETSCALE_GUIDE.md
`;

fs.writeFileSync('DEPLOYMENT_CHECKLIST.md', checklist);
console.log('✅ Created DEPLOYMENT_CHECKLIST.md');

console.log('\n🎉 Setup complete!');
console.log('\nNext steps:');
console.log('1. Read VERCEL_PLANETSCALE_GUIDE.md for detailed instructions');
console.log('2. Follow DEPLOYMENT_CHECKLIST.md step by step');
console.log('3. Deploy to Vercel + PlanetScale');
console.log('\n💡 Your attendance system will have permanent database storage!');