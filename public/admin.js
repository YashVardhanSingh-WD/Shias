// Global variables
let currentUser = null;
let subjects = [];
let students = [];
let attendanceData = {};

// Logout function
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadDashboard();
    loadSubjects();
    loadStudents();
    setCurrentDate();
    
    // Add session debugging (remove in production)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        checkSessionDebug();
    }
});

// Session debugging function (for development)
async function checkSessionDebug() {
    try {
        console.log('[DEBUG] Running checkSessionDebug...');
        const response = await fetch('/api/session/check', { credentials: 'include' });
        console.log('[DEBUG] /api/session/check response status:', response.status);
        const sessionData = await response.json();
        console.log('[DEBUG] Session Debug Info:', sessionData);
    } catch (error) {
        console.error('[DEBUG] Session check error:', error);
    }
}

// Authentication check
async function checkAuth() {
    try {
        console.log('[DEBUG] Running checkAuth...');
        const response = await fetch('/api/user', {
            credentials: 'include' // Important for session cookies
        });
        console.log('[DEBUG] /api/user response status:', response.status);
        const user = await response.json();
        console.log('[DEBUG] /api/user response data:', user);
        if (!user || user.role !== 'admin') {
            console.log('[DEBUG] Auth failed - redirecting to login');
            window.location.href = '/login';
            return;
        }
        currentUser = user;
    // If you want to show admin name, add an element with id 'admin-name' in your HTML, or skip this line if not needed
    // document.getElementById('admin-name').textContent = user.name;
    console.log('[DEBUG] Auth successful for user:', user.username);
    } catch (error) {
        console.error('[DEBUG] Auth check error:', error);
        window.location.href = '/login';
    }
}

// Navigation functions
function showSection(sectionName, event) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(sectionName + '-section').style.display = 'block';
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Load section-specific data
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'subjects':
            loadSubjects();
            break;
        case 'students':
            loadStudents();
            break;
        case 'attendance':
            loadAttendanceSubjects();
            break;
        case 'announcements':
            console.log('Loading announcements section');
            loadAnnouncements();
            break;
    }
}

// Dashboard functions
async function loadDashboard() {
    try {
        console.log('[DEBUG] Loading dashboard...');
        const [subjectsRes, studentsRes, statsRes, attendanceRes] = await Promise.all([
            fetch('/api/subjects'),
            fetch('/api/students'),
            fetch('/api/attendance/stats').catch(() => null),
            fetch('/api/attendance').catch(() => null)
        ]);
        console.log('[DEBUG] /api/subjects status:', subjectsRes.status);
        console.log('[DEBUG] /api/students status:', studentsRes.status);
        console.log('[DEBUG] /api/attendance/stats status:', statsRes ? statsRes.status : 'N/A');
        console.log('[DEBUG] /api/attendance status:', attendanceRes ? attendanceRes.status : 'N/A');
        
        const subjectsData = await subjectsRes.json();
        const studentsData = await studentsRes.json();
        const statsData = statsRes && statsRes.ok ? await statsRes.json() : [];
        const attendanceData = attendanceRes && attendanceRes.ok ? await attendanceRes.json() : [];
        
        console.log('[DEBUG] /api/subjects data:', subjectsData);
        console.log('[DEBUG] /api/students data:', studentsData);
        console.log('[DEBUG] /api/attendance/stats data:', statsData);
        console.log('[DEBUG] /api/attendance data:', attendanceData);
        
        // Update dashboard stats
        document.getElementById('total-subjects-dash').textContent = subjectsData.length;
        document.getElementById('total-students-dash').textContent = studentsData.length;
        
        // Calculate today's attendance
        const todayAttendance = statsData.reduce((total, stat) => total + stat.total_classes, 0);
        document.getElementById('total-attendance-dash').textContent = todayAttendance;
        
        // Calculate average attendance percentage
        if (statsData.length > 0) {
            const avgPercentage = statsData.reduce((sum, stat) => sum + stat.percentage, 0) / statsData.length;
            document.getElementById('avg-attendance').textContent = avgPercentage.toFixed(1) + '%';
        }
        
        // Load recent attendance
        loadRecentAttendance();
    } catch (error) {
        console.error('[DEBUG] Error loading dashboard:', error);
    }
}

async function loadRecentAttendance() {
    try {
        console.log('[DEBUG] Loading recent attendance...');
        const response = await fetch('/api/attendance').catch(() => null);
        if (!response || !response.ok) {
            console.log('[DEBUG] /api/attendance not available or error');
            const container = document.getElementById('recent-attendance');
            container.innerHTML = '<p class="text-muted">No recent attendance records</p>';
            return;
        }
        console.log('[DEBUG] /api/attendance status:', response.status);
        const attendance = await response.json();
        console.log('[DEBUG] /api/attendance data:', attendance);
        const recentAttendance = attendance.slice(0, 5);
        const container = document.getElementById('recent-attendance');
        if (recentAttendance.length === 0) {
            container.innerHTML = '<p class="text-muted">No recent attendance records</p>';
            return;
        }
        let html = '<div class="list-group list-group-flush">';
        recentAttendance.forEach(record => {
            const statusClass = record.status === 'present' ? 'text-success' : 'text-danger';
            const statusIcon = record.status === 'present' ? 'fa-check' : 'fa-times';
            html += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${record.student_name}</strong>
                        <br><small class="text-muted">${record.subject_name} - ${record.date}</small>
                    </div>
                    <span class="${statusClass}">
                        <i class="fas ${statusIcon}"></i> ${record.status}
                    </span>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('[DEBUG] Error loading recent attendance:', error);
        const container = document.getElementById('recent-attendance');
        container.innerHTML = '<p class="text-muted">Error loading attendance records</p>';
    }
}

// Subject management functions
async function loadSubjects() {
    try {
        const response = await fetch('/api/subjects');
        subjects = await response.json();
        
        const tbody = document.getElementById('subjects-table');
        tbody.innerHTML = '';
        
        subjects.forEach(subject => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${subject.id}</td>
                <td>${subject.name}</td>
                <td>${subject.description || '-'}</td>
                <td>${new Date(subject.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteSubject(${subject.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Update subject dropdowns
        updateSubjectDropdowns();
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

function updateSubjectDropdowns() {
    const attendanceSelect = document.getElementById('attendance-subject');
    const recordsSelect = document.getElementById('records-subject');
    
    // Clear existing options
    attendanceSelect.innerHTML = '<option value="">Choose subject...</option>';
    recordsSelect.innerHTML = '<option value="">All Subjects</option>';
    
    // Add subject options
    subjects.forEach(subject => {
        attendanceSelect.innerHTML += `<option value="${subject.id}">${subject.name}</option>`;
        recordsSelect.innerHTML += `<option value="${subject.id}">${subject.name}</option>`;
    });
}

function showAddSubjectModal() {
    document.getElementById('subject-name').value = '';
    document.getElementById('subject-description').value = '';
    new bootstrap.Modal(document.getElementById('addSubjectModal')).show();
}

async function addSubject() {
    const name = document.getElementById('subject-name').value.trim();
    const description = document.getElementById('subject-description').value.trim();
    
    if (!name) {
        alert('Please enter a subject name');
        return;
    }
    
    try {
        const response = await fetch('/api/subjects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('addSubjectModal')).hide();
            loadSubjects();
            loadDashboard();
        } else {
            alert('Error adding subject');
        }
    } catch (error) {
        console.error('Error adding subject:', error);
        alert('Error adding subject');
    }
}

async function deleteSubject(id) {
    if (!confirm('Are you sure you want to delete this subject?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            loadSubjects();
            loadDashboard();
        } else {
            alert('Error deleting subject');
        }
    } catch (error) {
        console.error('Error deleting subject:', error);
        alert('Error deleting subject');
    }
}

// Student management functions
async function loadStudents() {
    try {
        const response = await fetch('/api/students');
        students = await response.json();
        
        const tbody = document.getElementById('students-table');
        tbody.innerHTML = '';
        
        students.forEach(student => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.id}</td>
                <td>${student.student_id}</td>
                <td>${student.name}</td>
                <td>${student.email || '-'}</td>
                <td>${student.phone || '-'}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteStudent(${student.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function showAddStudentModal() {
    document.getElementById('student-name').value = '';
    document.getElementById('student-email').value = '';
    document.getElementById('student-phone').value = '';
    new bootstrap.Modal(document.getElementById('addStudentModal')).show();
}

async function addStudent() {
    const student_id = document.getElementById('student-id').value.trim();
    const name = document.getElementById('student-name').value.trim();
    const email = document.getElementById('student-email').value.trim();
    const phone = document.getElementById('student-phone').value.trim();
    
    if (!name) {
        alert('Please enter student name');
        return;
    }
    
    try {
        const payload = student_id ? { student_id, name, email, phone } : { name, email, phone };
        const response = await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            bootstrap.Modal.getInstance(document.getElementById('addStudentModal')).hide();
            loadStudents();
            loadDashboard();
        } else {
            alert('Error adding student');
        }
    } catch (error) {
        console.error('Error adding student:', error);
        alert('Error adding student');
    }
}

async function deleteStudent(id) {
    if (!confirm('Are you sure you want to delete this student?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/students/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            loadStudents();
            loadDashboard();
        } else {
            alert('Error deleting student');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        alert('Error deleting student');
    }
}

// Attendance functions
function loadAttendanceSubjects() {
    // Subjects are already loaded in loadSubjects()
    setCurrentDate();
}

function setCurrentDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendance-date').value = today;
}

async function loadAttendanceForm() {
    const subjectId = document.getElementById('attendance-subject').value;
    const date = document.getElementById('attendance-date').value;
    
    if (!subjectId || !date) {
        alert('Please select both subject and date');
        return;
    }
    
    try {
        // Load existing attendance for this subject and date
        const response = await fetch(`/api/attendance?subject_id=${subjectId}&date=${date}`);
        const existingAttendance = await response.json();
        
        // Create attendance form
    const container = document.getElementById('attendance-form');
        let html = '<div class="table-responsive"><table class="table table-hover">';
        html += '<thead><tr><th>Student ID</th><th>Name</th><th>Status</th></tr></thead><tbody>';
        
        students.forEach(student => {
            const existingRecord = existingAttendance.find(record => record.student_id === student.id);
            const status = existingRecord ? existingRecord.status : 'present';
            
            html += `
                <tr>
                    <td>${student.student_id}</td>
                    <td>${student.name}</td>
                    <td>
                        <button class="attendance-toggle ${status}" 
                                onclick="toggleAttendance(${student.id})" 
                                data-student-id="${student.id}">
                            ${status.toUpperCase()}
                        </button>
                    </td>
                </tr>
            `;
            
            // Store attendance data
            attendanceData[student.id] = status;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading attendance form:', error);
        alert('Error loading attendance form');
    }
}

function toggleAttendance(studentId) {
    const button = document.querySelector(`[data-student-id="${studentId}"]`);
    const currentStatus = attendanceData[studentId];
    const newStatus = currentStatus === 'present' ? 'absent' : 'present';
    
    attendanceData[studentId] = newStatus;
    button.textContent = newStatus.toUpperCase();
    button.className = `attendance-toggle ${newStatus}`;
}

async function saveAttendance() {
    const subjectId = document.getElementById('attendance-subject').value;
    const date = document.getElementById('attendance-date').value;
    
    if (!subjectId || !date) {
        alert('Please select both subject and date');
        return;
    }
    
    if (Object.keys(attendanceData).length === 0) {
        alert('Please load the attendance form first');
        return;
    }
    
    try {
        const attendance_data = Object.entries(attendanceData).map(([student_id, status]) => ({
            student_id: parseInt(student_id),
            status
        }));
        
        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject_id: parseInt(subjectId), date, attendance_data })
        });
        
        if (response.ok) {
            alert('Attendance saved successfully!');
            loadDashboard();
        } else {
            alert('Error saving attendance');
        }
    } catch (error) {
        console.error('Error saving attendance:', error);
        alert('Error saving attendance');
    }
}


// Attendance Records functions
async function loadAttendanceRecords() {
    const subjectId = document.getElementById('records-subject').value;
    const startDate = document.getElementById('records-start-date').value;
    const endDate = document.getElementById('records-end-date').value;
    
    try {
        let url = '/api/attendance/records';
        const params = new URLSearchParams();
        
        if (subjectId) params.append('subject_id', subjectId);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url);
        const records = await response.json();
        
        displayAttendanceRecords(records);
    } catch (error) {
        alert('Error loading attendance records: ' + error.message);
    }
}

function displayAttendanceRecords(records) {
    const container = document.getElementById('records-results');
    
    if (records.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No attendance records found for the selected criteria</p>';
        return;
    }
    
    // Group records by date
    const groupedRecords = {};
    records.forEach(record => {
        if (!groupedRecords[record.date]) {
            groupedRecords[record.date] = [];
        }
        groupedRecords[record.date].push(record);
    });
    
    let html = '<div class="accordion" id="recordsAccordion">';
    
    Object.keys(groupedRecords).sort().reverse().forEach((date, index) => {
        const dayRecords = groupedRecords[date];
        const presentCount = dayRecords.filter(r => r.status === 'present').length;
        const absentCount = dayRecords.filter(r => r.status === 'absent').length;
        const totalCount = dayRecords.length;
        
        html += `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading${index}">
                    <button class="accordion-button ${index === 0 ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                        <div class="d-flex justify-content-between align-items-center w-100 me-3">
                            <span><strong>${formatDate(date)}</strong></span>
                            <span class="badge bg-success me-2">Present: ${presentCount}</span>
                            <span class="badge bg-danger me-2">Absent: ${absentCount}</span>
                            <span class="badge bg-info">Total: ${totalCount}</span>
                        </div>
                    </button>
                </h2>
                <div id="collapse${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#recordsAccordion">
                    <div class="accordion-body">
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Student ID</th>
                                        <th>Name</th>
                                        <th>Subject</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
        `;
        
        dayRecords.forEach(record => {
            const statusClass = record.status === 'present' ? 'text-success' : 'text-danger';
            const statusIcon = record.status === 'present' ? '✓' : '✗';
            
            html += `
                <tr>
                    <td>${record.student_id}</td>
                    <td>${record.name}</td>
                    <td>${record.subject_name}</td>
                    <td><span class="${statusClass} fw-bold">${statusIcon} ${record.status.toUpperCase()}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAttendanceRecord(${record.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

async function exportRecordsCSV() {
    const subjectId = document.getElementById('records-subject').value;
    const startDate = document.getElementById('records-start-date').value;
    const endDate = document.getElementById('records-end-date').value;
    
    try {
        let url = '/api/attendance/records/export';
        const params = new URLSearchParams();
        
        if (subjectId) params.append('subject_id', subjectId);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        window.open(url, '_blank');
    } catch (error) {
        alert('Error exporting records: ' + error.message);
    }
}

// Delete attendance record by ID
async function deleteAttendanceRecord(id) {
    console.log('deleteAttendanceRecord called with id:', id);
    
    if (!confirm('Are you sure you want to delete this attendance record? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/attendance/${id}`, {
            method: 'DELETE'
        });
        
        console.log('deleteAttendanceRecord response status:', response.status);
        
        if (response.ok) {
            console.log('Attendance record deleted successfully');
            // Reload the attendance records display
            loadAttendanceRecords();
            alert('Attendance record deleted successfully!');
        } else {
            const data = await response.json();
            console.log('Error response from server:', data);
            alert(data.error || 'Error deleting attendance record');
        }
    } catch (error) {
        console.error('Error deleting attendance record:', error);
        alert('Error deleting attendance record: ' + error.message);
    }
}

// Delete attendance records by date
async function deleteAttendanceByDate(date) {
    console.log('deleteAttendanceByDate called with date:', date);
    
    if (!confirm(`Are you sure you want to delete ALL attendance records for ${date}? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/attendance/date/${date}`, {
            method: 'DELETE'
        });
        
        console.log('deleteAttendanceByDate response status:', response.status);
        
        if (response.ok) {
            console.log('Attendance records deleted successfully');
            // Reload the attendance records display
            loadAttendanceRecords();
            alert('Attendance records deleted successfully!');
        } else {
            const data = await response.json();
            console.log('Error response from server:', data);
            alert(data.error || 'Error deleting attendance records');
        }
    } catch (error) {
        console.error('Error deleting attendance records:', error);
        alert('Error deleting attendance records: ' + error.message);
    }
}


function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Delete attendance records by date
async function deleteRecordsByDate() {
    const date = document.getElementById('records-start-date').value;
    
    if (!date) {
        alert('Please select a date first');
        return;
    }
    
    // Check if end date is also selected, if so, we'll delete records for all dates in the range
    const endDate = document.getElementById('records-end-date').value;
    
    if (endDate && endDate < date) {
        alert('End date must be after start date');
        return;
    }
    
    try {
        if (endDate && endDate !== date) {
            // Delete records for a date range
            if (!confirm(`Are you sure you want to delete ALL attendance records between ${date} and ${endDate}? This action cannot be undone.`)) {
                return;
            }
            
            // Delete all records for this date range using the proper DELETE endpoint
            const deleteResponse = await fetch('/api/attendance/range', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start_date: date, end_date: endDate })
            });
            
            if (deleteResponse.ok) {
                const data = await deleteResponse.json();
                loadAttendanceRecords();
                alert(data.message || `Deleted attendance records for date range ${date} to ${endDate}`);
            } else {
                const data = await deleteResponse.json();
                alert(data.error || 'Error deleting attendance records');
            }
        } else {
            // Delete records for a single date
            await deleteAttendanceByDate(date);
        }
    } catch (error) {
        console.error('Error deleting attendance records:', error);
        alert('Error deleting attendance records: ' + error.message);
    }
}

// Password change functions
function showChangePasswordModal() {
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    new bootstrap.Modal(document.getElementById('changePasswordModal')).show();
}

async function changePassword() {
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!newPassword) {
        alert('Please enter a new password');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }
    
    try {
        const response = await fetch('/api/admin/credentials', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPassword })
        });
        
        if (response.ok) {
            alert('Password changed successfully! You will be logged out.');
            bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
            logout();
        } else {
            const data = await response.json();
            alert(data.error || 'Error changing password');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        alert('Error changing password');
    }
}

// Announcement functions
async function loadAnnouncements() {
    console.log('loadAnnouncements called');
    try {
        const response = await fetch('/api/announcements');
        console.log('loadAnnouncements response status:', response.status);
        if (response.ok) {
            const announcements = await response.json();
            console.log('Loaded', announcements.length, 'announcements');
            displayAnnouncements(announcements);
        } else {
            console.error('Failed to load announcements with status:', response.status);
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

function displayAnnouncements(announcements) {
    console.log('displayAnnouncements called with', announcements.length, 'announcements');
    const container = document.getElementById('announcements-table');
    
    if (announcements.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No announcements found</td></tr>';
        return;
    }
    
    const html = announcements.map(announcement => {
        const priorityClass = getPriorityClass(announcement.priority);
        const typeClass = getTypeClass(announcement.type);
        const statusClass = announcement.is_active ? 'text-success' : 'text-muted';
        const statusText = announcement.is_active ? 'Active' : 'Inactive';
        let fileLink = '';
        if (announcement.file_url) {
            fileLink = `<a href="${announcement.file_url}" target="_blank" class="btn btn-sm btn-outline-secondary ms-2">Download</a>`;
        }
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <span class="badge ${typeClass} me-2">${announcement.type}</span>
                        <span class="badge ${priorityClass}">${announcement.priority}</span>
                    </div>
                </td>
                <td><strong>${announcement.title}</strong></td>
                <td>${announcement.content.substring(0, 100)}${announcement.content.length > 100 ? '...' : ''} ${fileLink}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>${formatDate(announcement.created_at)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editAnnouncement(${announcement.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAnnouncement(${announcement.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    container.innerHTML = html;
}

function getPriorityClass(priority) {
    switch (priority) {
        case 'high': return 'bg-danger';
        case 'medium': return 'bg-warning';
        case 'low': return 'bg-info';
        default: return 'bg-secondary';
    }
}

function getTypeClass(type) {
    switch (type) {
        case 'notice': return 'bg-primary';
        case 'event': return 'bg-success';
        case 'recognition': return 'bg-warning';
        case 'important': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

function showAddAnnouncementModal() {
    console.log('showAddAnnouncementModal called');
    document.getElementById('announcement-title').value = '';
    document.getElementById('announcement-content').value = '';
    document.getElementById('announcement-type').value = 'notice';
    document.getElementById('announcement-priority').value = 'normal';
    document.getElementById('announcement-id').value = '';
    if (document.getElementById('announcement-file')) {
        document.getElementById('announcement-file').value = '';
    }
    document.getElementById('announcementModalLabel').textContent = 'Add New Announcement';
    new bootstrap.Modal(document.getElementById('announcementModal')).show();
}

function editAnnouncement(id) {
    console.log('editAnnouncement called with id:', id);
    fetch('/api/announcements')
        .then(response => {
            console.log('editAnnouncement fetch response status:', response.status);
            return response.json();
        })
        .then(announcements => {
            console.log('editAnnouncement fetched', announcements.length, 'announcements');
            const announcement = announcements.find(a => a.id === id);
            if (announcement) {
                console.log('Found announcement to edit:', announcement);
                document.getElementById('announcement-id').value = announcement.id;
                document.getElementById('announcement-title').value = announcement.title;
                document.getElementById('announcement-content').value = announcement.content;
                document.getElementById('announcement-type').value = announcement.type;
                document.getElementById('announcement-priority').value = announcement.priority;
                if (document.getElementById('announcement-file')) {
                    document.getElementById('announcement-file').value = '';
                }
                document.getElementById('announcementModalLabel').textContent = 'Edit Announcement';
                new bootstrap.Modal(document.getElementById('announcementModal')).show();
            } else {
                console.log('Announcement not found with id:', id);
            }
        })
        .catch(error => {
            console.error('Error loading announcement:', error);
            alert('Error loading announcement details');
        });
}

async function saveAnnouncement() {
    console.log('saveAnnouncement called');
    const id = document.getElementById('announcement-id').value;
    console.log('Announcement ID:', id);
    const title = document.getElementById('announcement-title').value.trim();
    const content = document.getElementById('announcement-content').value.trim();
    const type = document.getElementById('announcement-type').value;
    const priority = document.getElementById('announcement-priority').value;
    const fileInput = document.getElementById('announcement-file');
    let is_active = 1;
    if (document.getElementById('announcement-status')) {
        is_active = document.getElementById('announcement-status').value;
    }
    console.log('Announcement data:', { id, title, content, type, priority, is_active });
    if (!title || !content) {
        alert('Please fill in all required fields');
        return;
    }
    try {
        const url = id ? `/api/announcements/${id}` : '/api/announcements';
        const method = id ? 'PUT' : 'POST';
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('type', type);
        formData.append('priority', priority);
        formData.append('is_active', is_active);
        if (fileInput && fileInput.files.length > 0) {
            formData.append('file', fileInput.files[0]);
        }
        console.log('Sending request to:', url, 'method:', method);
        const response = await fetch(url, {
            method: method,
            body: formData
        });
        console.log('Response status:', response.status);
        if (response.ok) {
            console.log('Announcement saved successfully');
            bootstrap.Modal.getInstance(document.getElementById('announcementModal')).hide();
            loadAnnouncements();
            alert(id ? 'Announcement updated successfully!' : 'Announcement created successfully!');
        } else {
            console.log('Error response from server');
            const data = await response.json();
            console.log('Error data:', data);
            alert(data.error || 'Error saving announcement');
        }
    } catch (error) {
        console.error('Error saving announcement:', error);
        alert('Error saving announcement');
    }
}

async function deleteAnnouncement(id) {
    console.log('deleteAnnouncement called with id:', id);
    if (!confirm('Are you sure you want to delete this announcement?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/announcements/${id}`, {
            method: 'DELETE'
        });
        console.log('deleteAnnouncement response status:', response.status);
        
        if (response.ok) {
            console.log('Announcement deleted successfully');
            loadAnnouncements();
            alert('Announcement deleted successfully!');
        } else {
            console.log('Error response from server');
            const data = await response.json();
            console.log('Error data:', data);
            alert(data.error || 'Error deleting announcement');
        }
    } catch (error) {
        console.error('Error deleting announcement:', error);
        alert('Error deleting announcement');
    }
}
