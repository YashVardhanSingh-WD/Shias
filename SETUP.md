# Setup Instructions for Attendance Management System

## Quick Setup Guide

### Option 1: Using npm (Recommended)

1. **Open Command Prompt or PowerShell as Administrator**
2. **Navigate to the project directory:**
   ```bash
   cd C:\Users\sande\attendance-system
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start the application:**
   ```bash
   npm start
   ```

5. **Access the application:**
   - Open your browser
   - Go to: `http://localhost:3000`
   - Login with admin credentials: `admin` / `admin123`

### Option 2: Manual Installation (If npm doesn't work)

If you're having issues with npm, follow these steps:

1. **Download Node.js dependencies manually:**
   - Go to: https://www.npmjs.com/
   - Search for and download these packages:
     - express
     - sqlite3
     - bcryptjs
     - express-session
     - body-parser
     - moment

2. **Create node_modules directory:**
   ```bash
   mkdir node_modules
   ```

3. **Extract the downloaded packages into node_modules**

4. **Start the application:**
   ```bash
   node server.js
   ```

### Option 3: Using a Different Package Manager

If npm is not working, try using yarn:

1. **Install yarn:**
   ```bash
   npm install -g yarn
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Start the application:**
   ```bash
   yarn start
   ```

## Troubleshooting

### Common Issues and Solutions

#### 1. PowerShell Execution Policy Error
**Error:** "File cannot be loaded because running scripts is disabled"

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 2. npm not found
**Error:** "npm is not recognized as an internal or external command"

**Solutions:**
- Reinstall Node.js from https://nodejs.org/
- Add Node.js to your PATH environment variable
- Use the full path: `"C:\Program Files\nodejs\npm.cmd" install`

#### 3. Port already in use
**Error:** "EADDRINUSE: address already in use"

**Solution:**
- Change the port in `server.js` (line 10)
- Or kill the process using the port:
  ```bash
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  ```

#### 4. Database errors
**Error:** "Cannot find module 'sqlite3'"

**Solution:**
- Ensure all dependencies are installed
- Try reinstalling sqlite3:
  ```bash
  npm uninstall sqlite3
  npm install sqlite3
  ```

#### 5. Permission errors
**Error:** "EACCES: permission denied"

**Solution:**
- Run Command Prompt or PowerShell as Administrator
- Check file permissions in the project directory

## Alternative Setup Methods

### Using Docker (Advanced)

If you have Docker installed:

1. **Create a Dockerfile:**
   ```dockerfile
   FROM node:16
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **Build and run:**
   ```bash
   docker build -t attendance-system .
   docker run -p 3000:3000 attendance-system
   ```

### Using a Different Database

The system uses SQLite by default, but you can modify it to use other databases:

1. **For MySQL:**
   - Install mysql2: `npm install mysql2`
   - Update database connection in server.js

2. **For PostgreSQL:**
   - Install pg: `npm install pg`
   - Update database connection in server.js

## System Requirements

- **Node.js:** Version 14 or higher
- **npm:** Comes with Node.js
- **RAM:** Minimum 512MB
- **Storage:** 100MB free space
- **Browser:** Modern browser (Chrome, Firefox, Safari, Edge)

## Verification Steps

After successful installation:

1. **Check if the server is running:**
   - You should see: "Attendance Management System running on http://localhost:3000"
   - And: "Default admin credentials: username: admin, password: admin123"

2. **Test the application:**
   - Open browser and go to http://localhost:3000
   - You should see the landing page
   - Click "Login" and use admin/admin123

3. **Test admin features:**
   - Add a subject
   - Add a student
   - Take attendance
   - View reports

## Getting Help

If you're still having issues:

1. **Check Node.js installation:**
   ```bash
   node --version
   npm --version
   ```

2. **Check project structure:**
   - Ensure all files are present
   - Check file permissions

3. **Review error messages:**
   - Look for specific error codes
   - Check the console output

4. **Common solutions:**
   - Restart your computer
   - Reinstall Node.js
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and package-lock.json, then run `npm install` again

## Support

For additional help:
- Check the main README.md file
- Review the code comments
- Search for similar issues online
- Contact the development team
