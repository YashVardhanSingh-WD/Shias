// Global variables
let currentUser = null;
let subjects = [];
let attendanceHistory = [];
let attendanceStats = [];
let currentStudentId = null;

// Initialize student portal (public access)
document.addEventListener('DOMContentLoaded', function() {
    console.log('Student portal loaded - starting public access');
    initPublicStudentAccess();
});

// Public student access bootstrap
async function initPublicStudentAccess() {
    const params = new URLSearchParams(window.location.search);
    const providedId = params.get('student_id');

    if (!providedId) {
        const entered = prompt('Enter your Student ID');
        if (!entered) {
            window.location.href = '/';
            return;
        }
        currentStudentId = entered.trim();
        window.history.replaceState({}, '', `/student?student_id=${encodeURIComponent(currentStudentId)}`);
    } else {
        currentStudentId = providedId.trim();
    }

    try {
        const res = await fetch(`/api/public/student/${encodeURIComponent(currentStudentId)}`);
        if (!res.ok) {
            alert('Student not found. Please check your Student ID.');
            window.location.href = '/';
            return;
        }
        const student = await res.json();
        document.getElementById('student-name').textContent = student.name;
        document.getElementById('student-id').textContent = student.student_id || 'N/A';

        await loadSubjects();
        await loadOverview();
    } catch (error) {
        console.error('Error initializing student portal:', error);
        alert('Error loading student portal');
        window.location.href = '/';
    }
}

// Logout function
function logout() {
    window.location.href = '/';
}

// Navigation functions
function showSection(sectionName) {
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
    event.target.classList.add('active');
    
    // Load section-specific data
    switch(sectionName) {
        case 'overview':
            loadOverview();
            break;
        case 'history':
            loadHistory();
            break;
        case 'statistics':
            loadStatistics();
            break;
        case 'announcements':
            loadAnnouncements();
            break;
    }
}

// Overview functions
async function loadOverview() {
    try {
        const [statsRes, historyRes] = await Promise.all([
            fetch(`/api/public/attendance/stats?student_id=${encodeURIComponent(currentStudentId)}`),
            fetch(`/api/public/attendance/student/${encodeURIComponent(currentStudentId)}`)
        ]);
        
        attendanceStats = await statsRes.json();
        attendanceHistory = await historyRes.json();
        
        updateOverviewStats();
        loadSubjectStats();
        loadRecentAttendance();
        
    } catch (error) {
        console.error('Error loading overview:', error);
    }
}

function updateOverviewStats() {
    const totalSubjects = attendanceStats.length;
    const totalClasses = attendanceStats.reduce((sum, stat) => sum + stat.total_classes, 0);
    const presentCount = attendanceStats.reduce((sum, stat) => sum + stat.present_count, 0);
    const overallPercentage = totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(1) : 0;
    
    document.getElementById('total-subjects').textContent = totalSubjects;
    document.getElementById('total-classes').textContent = totalClasses;
    document.getElementById('present-count').textContent = presentCount;
    document.getElementById('overall-percentage').textContent = overallPercentage + '%';
}

function loadSubjectStats() {
    const container = document.getElementById('subject-stats');
    
    if (attendanceStats.length === 0) {
        container.innerHTML = '<p class="text-muted">No attendance data available</p>';
        return;
    }
    
    let html = '';
    attendanceStats.forEach(stat => {
        const percentageClass = stat.percentage >= 75 ? 'text-success' : stat.percentage >= 60 ? 'text-warning' : 'text-danger';
        
        html += `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <strong>${stat.subject_name}</strong>
                    <br><small class="text-muted">${stat.present_count}/${stat.total_classes} classes</small>
                </div>
                <div class="text-end">
                    <div class="${percentageClass} fw-bold">${stat.percentage}%</div>
                    <div class="progress mt-1" style="width: 60px;">
                        <div class="progress-bar ${stat.percentage >= 75 ? 'bg-success' : stat.percentage >= 60 ? 'bg-warning' : 'bg-danger'}" 
                             style="width: ${stat.percentage}%"></div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function loadRecentAttendance() {
    const container = document.getElementById('recent-attendance');
    
    if (attendanceHistory.length === 0) {
        container.innerHTML = '<p class="text-muted">No recent attendance records</p>';
        return;
    }
    
    const recentAttendance = attendanceHistory.slice(0, 5);
    let html = '<div class="list-group list-group-flush">';
    
    recentAttendance.forEach(record => {
        const statusClass = record.status === 'present' ? 'text-success' : 'text-danger';
        const statusIcon = record.status === 'present' ? 'fa-check' : 'fa-times';
        
        html += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${record.subject_name}</strong>
                    <br><small class="text-muted">${record.date}</small>
                </div>
                <span class="${statusClass}">
                    <i class="fas ${statusIcon}"></i> ${record.status}
                </span>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// History functions
async function loadHistory() {
    try {
        const response = await fetch(`/api/public/attendance/student/${encodeURIComponent(currentStudentId)}`);
        attendanceHistory = await response.json();
        
        updateHistoryTable();
        updateHistoryFilters();
        
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function updateHistoryTable() {
    const tbody = document.getElementById('attendance-history');
    tbody.innerHTML = '';
    
    if (attendanceHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No attendance records found</td></tr>';
        return;
    }
    
    attendanceHistory.forEach(record => {
        const row = document.createElement('tr');
        const statusClass = record.status === 'present' ? 'present' : 'absent';
        
        row.innerHTML = `
            <td>${record.date}</td>
            <td>${record.subject_name}</td>
            <td><span class="attendance-badge ${statusClass}">${record.status.toUpperCase()}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function updateHistoryFilters() {
    const filter = document.getElementById('history-subject-filter');
    filter.innerHTML = '<option value="">All Subjects</option>';
    
    const uniqueSubjects = [...new Set(attendanceHistory.map(record => record.subject_name))];
    uniqueSubjects.forEach(subject => {
        filter.innerHTML += `<option value="${subject}">${subject}</option>`;
    });
    
    // Add filter event listener
    filter.addEventListener('change', filterHistory);
}

function filterHistory() {
    const selectedSubject = document.getElementById('history-subject-filter').value;
    const tbody = document.getElementById('history-table');
    tbody.innerHTML = '';
    
    let filteredHistory = attendanceHistory;
    if (selectedSubject) {
        filteredHistory = attendanceHistory.filter(record => record.subject_name === selectedSubject);
    }
    
    if (filteredHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No records found</td></tr>';
        return;
    }
    
    filteredHistory.forEach(record => {
        const row = document.createElement('tr');
        const statusClass = record.status === 'present' ? 'present' : 'absent';
        
        row.innerHTML = `
            <td>${record.date}</td>
            <td>${record.subject_name}</td>
            <td><span class="attendance-badge ${statusClass}">${record.status.toUpperCase()}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Statistics functions
async function loadStatistics() {
    try {
        const response = await fetch(`/api/public/attendance/stats?student_id=${encodeURIComponent(currentStudentId)}`);
        attendanceStats = await response.json();
        
        updateStatisticsTable();
        updateStatisticsFilters();
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Statistics functions
async function loadStatistics() {
    try {
        // Load monthly stats
        loadMonthlyStats();
        
        // Load subject performance
        loadSubjectPerformance();
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

function loadMonthlyStats() {
    const container = document.getElementById('monthly-stats');
    
    if (attendanceStats.length === 0) {
        container.innerHTML = '<p class="text-muted">No attendance data available</p>';
        return;
    }
    
    // Group data by month
    const monthlyData = {};
    attendanceHistory.forEach(record => {
        const date = new Date(record.date);
        const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        if (!monthlyData[month]) {
            monthlyData[month] = { present: 0, total: 0 };
        }
        
        monthlyData[month].total++;
        if (record.status === 'present') {
            monthlyData[month].present++;
        }
    });
    
    // Convert to array and sort by date
    const months = Object.keys(monthlyData).sort((a, b) => {
        return new Date(a) - new Date(b);
    });
    
    // Take last 6 months
    const last6Months = months.slice(-6);
    
    let html = '<div class="list-group list-group-flush">';
    last6Months.forEach(month => {
        const data = monthlyData[month];
        const percentage = ((data.present / data.total) * 100).toFixed(1);
        const percentageClass = percentage >= 75 ? 'text-success' : percentage >= 60 ? 'text-warning' : 'text-danger';
        
        html += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${month}</strong>
                    <br><small class="text-muted">${data.present}/${data.total} classes</small>
                </div>
                <div class="text-end">
                    <div class="${percentageClass} fw-bold">${percentage}%</div>
                    <div class="progress mt-1" style="width: 80px;">
                        <div class="progress-bar ${percentageClass.includes('success') ? 'bg-success' : percentageClass.includes('warning') ? 'bg-warning' : 'bg-danger'}"
                             style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function loadSubjectPerformance() {
    const container = document.getElementById('subject-performance');
    
    if (attendanceStats.length === 0) {
        container.innerHTML = '<p class="text-muted">No attendance data available</p>';
        return;
    }
    
    let html = '<div class="list-group list-group-flush">';
    attendanceStats.forEach(stat => {
        const percentageClass = stat.percentage >= 75 ? 'text-success' : stat.percentage >= 60 ? 'text-warning' : 'text-danger';
        
        html += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <strong>${stat.subject_name}</strong>
                </div>
                <div class="text-end">
                    <div class="${percentageClass} fw-bold">${stat.percentage}%</div>
                    <div class="progress mt-1" style="width: 100px;">
                        <div class="progress-bar ${percentageClass.includes('success') ? 'bg-success' : percentageClass.includes('warning') ? 'bg-warning' : 'bg-danger'}"
                             style="width: ${stat.percentage}%"></div>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function updateStatisticsFilters() {
    const filter = document.getElementById('stats-subject-filter');
    filter.innerHTML = '<option value="">All Subjects</option>';
    
    attendanceStats.forEach(stat => {
        filter.innerHTML += `<option value="${stat.subject_name}">${stat.subject_name}</option>`;
    });
    
    // Add filter event listener
    filter.addEventListener('change', filterStatistics);
}

function filterStatistics() {
    const selectedSubject = document.getElementById('stats-subject-filter').value;
    const tbody = document.getElementById('statistics-table');
    tbody.innerHTML = '';
    
    let filteredStats = attendanceStats;
    if (selectedSubject) {
        filteredStats = attendanceStats.filter(stat => stat.subject_name === selectedSubject);
    }
    
    if (filteredStats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No statistics found</td></tr>';
        return;
    }
    
    filteredStats.forEach(stat => {
        const row = document.createElement('tr');
        const absent = stat.total_classes - stat.present_count;
        const percentageClass = stat.percentage >= 75 ? 'text-success' : stat.percentage >= 60 ? 'text-warning' : 'text-danger';
        const progressClass = stat.percentage >= 75 ? 'bg-success' : stat.percentage >= 60 ? 'bg-warning' : 'bg-danger';
        
        row.innerHTML = `
            <td><strong>${stat.subject_name}</strong></td>
            <td>${stat.total_classes}</td>
            <td class="text-success">${stat.present_count}</td>
            <td class="text-danger">${absent}</td>
            <td class="${percentageClass} fw-bold">${stat.percentage}%</td>
            <td>
                <div class="progress" style="width: 100px;">
                    <div class="progress-bar ${progressClass}" style="width: ${stat.percentage}%"></div>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load subjects for filters
async function loadSubjects() {
    try {
        const response = await fetch('/api/public/subjects');
        subjects = await response.json();
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

// Announcements functions
async function loadAnnouncements() {
    try {
        const response = await fetch('/api/public/announcements');
        if (response.ok) {
            const announcements = await response.json();
            displayAnnouncements(announcements);
        } else {
            console.error('Failed to load announcements');
            displayAnnouncements([]);
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
        displayAnnouncements([]);
    }
}

function displayAnnouncements(announcements) {
    const container = document.getElementById('announcements-container');
    
    if (announcements.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-bullhorn fa-3x mb-3 opacity-50"></i>
                <h5>No Announcements</h5>
                <p>There are no active announcements at the moment.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    announcements.forEach(announcement => {
        const priorityClass = getPriorityClass(announcement.priority);
        const typeClass = getTypeClass(announcement.type);
        const date = new Date(announcement.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        html += `
            <div class="card mb-3 border-0 shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="d-flex align-items-center">
                            <span class="badge ${typeClass} me-2">${announcement.type}</span>
                            <span class="badge ${priorityClass}">${announcement.priority}</span>
                        </div>
                        <small class="text-muted">${date}</small>
                    </div>
                    <h5 class="card-title mb-2">${announcement.title}</h5>
                    <p class="card-text text-muted">${announcement.content}</p>
                </div>
            </div>
        `;
    });
    
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
