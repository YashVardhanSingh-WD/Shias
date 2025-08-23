# Deployment Configuration Guide

## Environment Variables for Production

When deploying your attendance system online, set these environment variables:

### Required Environment Variables:

```bash
# Session Configuration (IMPORTANT for fixing logout issues)
SESSION_SECRET=your-super-secure-session-secret-key-here
NODE_ENV=production

# Server Configuration
PORT=3000
```

### Platform-Specific Instructions:

#### Render.com
1. Go to your service dashboard
2. Navigate to "Environment" tab
3. Add these variables:
   - `SESSION_SECRET`: Generate a random string (32+ characters)
   - `NODE_ENV`: Set to `production`
   - `PORT`: Usually auto-set by Render

#### Railway.app
1. Go to your project dashboard
2. Navigate to "Variables" tab
3. Add the same variables as above

#### Heroku
1. Go to your app dashboard
2. Navigate to "Settings" > "Config Vars"
3. Add the same variables as above

#### Vercel
1. Go to your project dashboard
2. Navigate to "Settings" > "Environment Variables"
3. Add the same variables as above

### Session Secret Generation:
Generate a secure session secret using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Common Issues Fixed:
1. **Session persistence**: Proper session configuration
2. **Cookie security**: HTTPS-compatible cookies
3. **Proxy trust**: Handles load balancers correctly
4. **Session debugging**: Added `/api/session/check` endpoint

### Testing Session:
After deployment, test session persistence by:
1. Login as admin
2. Visit `/api/session/check` to verify session data
3. Navigate between pages to ensure session persists
