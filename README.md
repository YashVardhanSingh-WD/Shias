# Attendance Management System

A comprehensive web-based attendance management system for educational institutions with separate admin and student portals.

## Features

### Admin Panel
- **Dashboard**: Overview with statistics and quick actions
- **Subject Management**: Add, view, and delete subjects
- **Student Management**: Add, view, and delete students
- **Attendance Tracking**: Mark attendance for students by subject and date
- **Reports**: Generate attendance statistics and reports
- **Real-time Updates**: Live dashboard with recent attendance data

### Student Portal
- **Overview**: Personal attendance statistics and summary
- **Attendance History**: View all attendance records with filtering
- **Statistics**: Detailed subject-wise attendance analysis
- **Progress Tracking**: Visual progress bars and percentage calculations

### System Features
- **Authentication**: Secure login system with role-based access
- **Database**: SQLite database for data persistence
- **Responsive Design**: Modern UI that works on all devices
- **Real-time Data**: Live updates and statistics
- **Export Capabilities**: Report generation functionality

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite3
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **UI Framework**: Bootstrap 5
- **Icons**: Font Awesome
- **Authentication**: Session-based with bcrypt password hashing

## Installation

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Setup Instructions

1. **Clone or download the project**
   ```bash
   cd attendance-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

4. **Access the application**
   - Open your browser and go to `http://localhost:3000`
   - The system will automatically create the database and default admin user

## Default Credentials

### Admin Access
- **Username**: `admin`
- **Password**: `admin123`

### Student Access
- You can create student accounts through the admin panel
- Students can view their attendance history and statistics

## Usage Guide

### For Administrators

1. **Login as Admin**
   - Use the default admin credentials
   - Access the admin panel with full privileges

2. **Add Subjects**
   - Go to "Subjects" section
   - Click "Add Subject"
   - Enter subject name and description
   - Save the subject

3. **Add Students**
   - Go to "Students" section
   - Click "Add Student"
   - Enter student ID, name, email, and phone
   - Save the student

4. **Take Attendance**
   - Go to "Attendance" section
   - Select subject and date
   - Click "Load Students"
   - Mark students as present/absent using toggle buttons
   - Click "Save Attendance"

5. **View Reports**
   - Go to "Reports" section
   - Select subject and date range
   - Click "Generate Report"
   - View attendance statistics

### For Students

1. **Login as Student**
   - Use student credentials provided by admin
   - Access the student portal

2. **View Overview**
   - See overall attendance statistics
   - View subject-wise progress
   - Check recent attendance records

3. **Check History**
   - Go to "Attendance History" section
   - View all attendance records
   - Filter by subject if needed

4. **Analyze Statistics**
   - Go to "Statistics" section
   - View detailed subject-wise analysis
   - See attendance percentages and progress bars

## Database Schema

### Tables

1. **users**
   - id (Primary Key)
   - username (Unique)
   - password (Hashed)
   - name
   - student_id
   - role (admin/student)
   - created_at

2. **subjects**
   - id (Primary Key)
   - name
   - description
   - created_at

3. **students**
   - id (Primary Key)
   - student_id (Unique)
   - name
   - email
   - phone
   - created_at

4. **attendance**
   - id (Primary Key)
   - student_id (Foreign Key)
   - subject_id (Foreign Key)
   - date
   - status (present/absent)
   - created_at

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user

### Subjects
- `GET /api/subjects` - Get all subjects
- `POST /api/subjects` - Add new subject
- `DELETE /api/subjects/:id` - Delete subject

### Students
- `GET /api/students` - Get all students
- `POST /api/students` - Add new student
- `DELETE /api/students/:id` - Delete student

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Save attendance
- `GET /api/attendance/student/:id` - Get student attendance
- `GET /api/attendance/stats` - Get attendance statistics

## Security Features

- **Password Hashing**: All passwords are hashed using bcrypt
- **Session Management**: Secure session handling
- **Role-based Access**: Different permissions for admin and students
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries

## Customization

### Adding New Features
1. **Backend**: Add new routes in `server.js`
2. **Frontend**: Create new HTML pages and JavaScript files
3. **Database**: Add new tables or modify existing schema

### Styling
- Modify CSS in the HTML files
- Update Bootstrap classes for different themes
- Customize color schemes and layouts

### Database
- The system uses SQLite for simplicity
- Can be easily migrated to MySQL, PostgreSQL, or other databases
- Modify database queries in `server.js`

## Troubleshooting

### Common Issues

1. **Port already in use**
   - Change the port in `server.js` (line 10)
   - Or kill the process using the port

2. **Database errors**
   - Delete `attendance.db` file and restart
   - Check file permissions

3. **Login issues**
   - Verify credentials
   - Check browser console for errors
   - Ensure all dependencies are installed

### Development Mode
```bash
npm run dev
```
This will start the server with nodemon for automatic restarts during development.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For support or questions:
- Check the troubleshooting section
- Review the code comments
- Create an issue in the repository

## Future Enhancements

- Email notifications for attendance
- Mobile app version
- Advanced reporting with charts
- Bulk student import
- Attendance reminders
- Integration with other school management systems
