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
    
    // Add event listeners for navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            showSection(section);
        });
    });
    
    // Set up auto-refresh for student data every 30 seconds
    setInterval(() => {
        if (currentStudentId) {
            console.log('Auto-refreshing student data...');
            loadStudentData(currentStudentId);
            
            // Also refresh the current active section
            const activeSection = document.querySelector('.nav-link.active')?.dataset.section;
            if (activeSection) {
                refreshActiveSection(activeSection);
            }
        }
    }, 30000); // 30 seconds
});

// Public student access bootstrap
async function initPublicStudentAccess() {
    const params = new URLSearchParams(window.location.search);
    const providedId = params.get('student_id');

    if (!providedId) {
        // Create a modal for student ID input instead of using prompt
        const modalHtml = `
            <div class="modal fade" id="studentIdModal" tabindex="-1" aria-labelledby="studentIdModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="studentIdModalLabel">Student Portal</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="studentIdInput" class="form-label">Enter your Student ID</label>
                                <input type="text" class="form-control" id="studentIdInput" placeholder="Student ID">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="submitStudentId">Submit</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to the document
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('studentIdModal'));
        modal.show();
        
        // Handle submit button click
        document.getElementById('submitStudentId').addEventListener('click', function() {
            const entered = document.getElementById('studentIdInput').value;
            if (!entered) {
                return;
            }
            currentStudentId = entered.trim();
            window.history.replaceState({}, '', `/student.html?student_id=${encodeURIComponent(currentStudentId)}`);
            modal.hide();
            loadStudentData(currentStudentId);
        });
        
        // Handle modal close/cancel
        document.getElementById('studentIdModal').addEventListener('hidden.bs.modal', function() {
            if (!currentStudentId) {
                window.location.href = '/';
            }
        });
        
        return; // Exit here and wait for modal interaction
    } else {
        currentStudentId = providedId.trim();
        loadStudentData(currentStudentId);
    }

    // The rest of the function is now handled by loadStudentData
};

// Load student data and initialize the portal
async function loadStudentData(studentId) {
    try {
        console.log('Loading student data for ID:', studentId);
        currentStudentId = studentId; // Ensure currentStudentId is set globally
        
        const res = await fetch(`/api/public/student/${encodeURIComponent(studentId)}`);
        if (!res.ok) {
            alert('Student not found. Please check your Student ID.');
            window.location.href = '/';
            return;
        }
        const student = await res.json();
        console.log('Student data loaded:', student);
        document.getElementById('student-name').textContent = student.name;
        document.getElementById('student-id').textContent = student.student_id || 'N/A';

        await loadSubjects();
        await loadOverview();
        await loadAnnouncements(); // Load announcements
        
        // Show the overview section by default
        showSection('overview');
        
        // Set up auto-refresh for data every 30 seconds
        setInterval(() => {
            console.log('Auto-refreshing student data');
            loadOverview();
            // Also refresh the current section data
            const activeSection = document.querySelector('.nav-link.active');
            if (activeSection && activeSection.dataset.section) {
                const sectionId = activeSection.dataset.section;
                if (sectionId === 'history') {
                    loadHistory();
                } else if (sectionId === 'statistics') {
                    loadStatistics();
                } else if (sectionId === 'announcements') {
                    loadAnnouncements();
                }
            }
        }, 30000); // 30 seconds
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
function showSection(sectionId) {
    console.log(`Showing section: ${sectionId}`);
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show the selected section
    const sectionElement = document.getElementById(sectionId + '-section');
    console.log(`Section element for ${sectionId}:`, sectionElement);
    if (sectionElement) {
        sectionElement.style.display = 'block';
    } else {
        console.error(`Section element not found for ID: ${sectionId}-section`);
    }
    
    // Update active state in sidebar
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const navLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
    console.log(`Nav link for ${sectionId}:`, navLink);
    if (navLink) {
        navLink.classList.add('active');
    } else {
        console.error(`Nav link not found for section: ${sectionId}`);
    }
    
    // Load data based on section
    console.log(`Loading data for section: ${sectionId}`);
    refreshActiveSection(sectionId);
}

/**
 * Refreshes the data for the currently active section without changing the UI
 * @param {string} sectionId - The section to refresh ('overview', 'history', 'statistics', 'announcements')
 */
function refreshActiveSection(sectionId) {
    console.log('Refreshing section:', sectionId);
    
    if (sectionId === 'overview') {
        loadOverview();
    } else if (sectionId === 'history') {
        loadHistory();
    } else if (sectionId === 'statistics') {
        console.log('About to call loadStatistics()');
        loadStatistics();
    } else if (sectionId === 'announcements') {
        loadAnnouncements();
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
        document.getElementById('attendance-history').innerHTML = '<tr><td colspan="3" class="text-center text-muted">Error loading attendance records</td></tr>';
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
    const tbody = document.getElementById('attendance-history');
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
        console.log('Starting loadStatistics function');
        
        if (!currentStudentId) {
            console.error('No student ID available for statistics');
            return;
        }
        
        // Fetch attendance stats
        console.log('Fetching attendance stats for student ID:', currentStudentId);
        const response = await fetch(`/api/public/attendance/stats?student_id=${encodeURIComponent(currentStudentId)}`);
        const statsData = await response.json();
        console.log('Received attendance stats:', statsData);
        attendanceStats = statsData;
        
        // Fetch attendance history if not already loaded
        if (!attendanceHistory || attendanceHistory.length === 0) {
            console.log('Fetching attendance history');
            const historyResponse = await fetch(`/api/public/attendance/student/${encodeURIComponent(currentStudentId)}`);
            const historyData = await historyResponse.json();
            console.log('Received attendance history:', historyData);
            attendanceHistory = historyData;
        } else {
            console.log('Using existing attendance history');
        }
        
        // Load monthly stats and subject performance
        console.log('Loading monthly stats');
        loadMonthlyStats();
        console.log('Loading subject performance');
        loadSubjectPerformance();
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Update statistics filters
function updateStatisticsFilters() {
    // Implementation for statistics filters if needed
    console.log('Statistics filters updated');
}

function loadMonthlyStats() {
    console.log('Inside loadMonthlyStats function');
    const container = document.getElementById('monthly-stats');
    console.log('Monthly stats container:', container);
    
    if (!attendanceHistory || attendanceHistory.length === 0) {
        console.log('No attendance history data available');
        container.innerHTML = '<p class="text-muted">No attendance data available</p>';
        return;
    }
    
    console.log('Processing attendance history for monthly stats, records:', attendanceHistory.length);
    
    // Group data by month
    const monthlyData = {};
    attendanceHistory.forEach(record => {
        console.log('Processing record:', record);
        const date = new Date(record.date);
        const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        console.log('Extracted month:', month);
        
        if (!monthlyData[month]) {
            monthlyData[month] = { present: 0, total: 0 };
        }
        
        monthlyData[month].total++;
        if (record.status === 'present') {
            monthlyData[month].present++;
        }
    });
    
    console.log('Monthly data processed:', monthlyData);
    
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
    console.log('Inside loadSubjectPerformance function');
    const container = document.getElementById('subject-performance');
    console.log('Subject performance container:', container);
    
    if (!attendanceStats || attendanceStats.length === 0) {
        console.log('No attendance stats data available');
        container.innerHTML = '<p class="text-muted">No attendance data available</p>';
        return;
    }
    
    console.log('Processing attendance stats for subject performance, stats:', attendanceStats);
    
    let html = '<div class="list-group list-group-flush">';
    attendanceStats.forEach(stat => {
        console.log('Processing stat:', stat);
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
    
    console.log('Generated HTML for subject performance:', html);
    container.innerHTML = html;
    console.log('HTML set for subject performance');
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
    const container = document.getElementById('announcements-list');
    
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
