# 🎓 Attendance Management System

A comprehensive, production-ready attendance management system with separate admin and student portals. Built with Node.js, Express, and SQLite with support for multiple deployment platforms.

![Attendance System](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

## ✨ Features

### 👨‍💼 Admin Portal
- **Student Management**: Add, edit, and remove students
- **Subject Management**: Create and manage subjects/courses
- **Attendance Tracking**: Mark attendance for multiple students
- **Analytics & Reports**: View attendance statistics and export data
- **Announcements**: Create announcements with file attachments
- **User Management**: Manage admin credentials

### ��‍🎓 Student Portal
- **Self-Service**: Check attendance without login required
- **Attendance History**: View detailed attendance records
- **Statistics**: Personal attendance percentage by subject
- **Announcements**: View important notices and updates
- **Mobile Responsive**: Works perfectly on all devices

### 🔧 Technical Features
- **Secure Authentication**: Bcrypt password hashing
- **Session Management**: Redis support for production
- **File Uploads**: Multer integration for announcements
- **Database Optimization**: Indexed queries for performance
- **Input Validation**: Comprehensive data sanitization
- **Error Handling**: Robust error management
- **Logging System**: Structured logging for debugging

## 🚀 Quick Start

### Local Development
```bash
# Clone the repository
git clone https://github.com/YashVardhanSingh-WD/Shias.git
cd Shias

# Install dependencies
npm install

# Start the server
npm start
```

Visit `http://localhost:3000` to access the application.

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

## 🌐 Deployment Options

### One-Click Deployment

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/YashVardhanSingh-WD/Shias)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/YashVardhanSingh-WD/Shias)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YashVardhanSingh-WD/Shias)

### Manual Deployment

#### Heroku
```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create your-app-name

# Add Redis addon
heroku addons:create heroku-redis:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=$(openssl rand -base64 32)

# Deploy
git push heroku main
```

#### Docker
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t attendance-system .
docker run -p 3000:3000 attendance-system
```

## 📁 Project Structure

```
attendance-system/
├── public/                 # Frontend files
│   ├── index.html         # Homepage
│   ├── admin.html         # Admin dashboard
│   ├── student.html       # Student portal
│   └── login.html         # Admin login
├── data/                  # Database storage
├── uploads/               # File uploads
├── server.js              # Main application
├── database.js            # Database configuration
├── package.json           # Dependencies
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose setup
├── Procfile              # Heroku configuration
├── app.json              # Heroku app configuration
└── DEPLOYMENT_GUIDE.md   # Detailed deployment guide
```

## 🔒 Security Features

- **Password Hashing**: Bcrypt with salt rounds
- **Session Security**: Secure session configuration
- **Input Validation**: XSS and injection prevention
- **HTTPS Support**: Production HTTPS enforcement
- **Environment Variables**: Sensitive data protection

## 📊 Database Schema

### Tables
- **users**: Admin and student authentication
- **students**: Student information and IDs
- **subjects**: Course/subject management
- **attendance**: Attendance records with timestamps
- **announcements**: System announcements with files

### Indexes
- Optimized queries for attendance lookups
- Fast student ID searches
- Efficient date-based filtering

## 🛠️ API Endpoints

### Admin APIs
- `POST /api/login` - Admin authentication
- `GET /api/students` - List all students
- `POST /api/students` - Add new student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Remove student
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance

### Public APIs (Student Portal)
- `GET /api/public/student/:id` - Get student info
- `GET /api/public/attendance/student/:id` - Student attendance
- `GET /api/public/attendance/stats` - Attendance statistics
- `GET /api/public/announcements` - View announcements

## 🔧 Configuration

### Environment Variables
```bash
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-secure-secret-key
DATABASE_PATH=./data/attendance.db
REDIS_URL=redis://localhost:6379
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=secure-password
```

## 📈 Monitoring & Backup

### Health Checks
- Application health endpoint: `/api/session/check`
- Database connectivity monitoring
- Automatic error logging

### Backup Strategy
- Automated database backups
- File upload backup support
- Environment-specific backup paths

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues
- **Database not found**: Ensure `data/` directory exists
- **Session issues**: Check `SESSION_SECRET` environment variable
- **File upload fails**: Verify `uploads/` directory permissions
- **Port binding**: Ensure `PORT` environment variable is set

### Getting Help
- Check the [Deployment Guide](DEPLOYMENT_GUIDE.md) for detailed instructions
- Review the [Issues](https://github.com/YashVardhanSingh-WD/Shias/issues) page
- Create a new issue for bugs or feature requests

## 🎯 Roadmap

- [ ] PostgreSQL support for large deployments
- [ ] Email notifications for attendance alerts
- [ ] Mobile app development
- [ ] Advanced reporting and analytics
- [ ] Multi-language support
- [ ] API rate limiting
- [ ] Automated testing suite

## 👨‍💻 Author

**Yash Vardhan Singh**
- GitHub: [@YashVardhanSingh-WD](https://github.com/YashVardhanSingh-WD)

---

⭐ **Star this repository if you find it helpful!**

Made with ❤️ for educational institutions worldwide.