// Global variables
let currentUser = null;
let students = [];
let subjects = [];
let attendanceRecords = [];
let announcements = [];

// Initialize admin portal
document.addEventListener('DOMContentLoaded', function() {
    try {
        checkAuth();
        loadDashboard();
        loadSubjects();
        loadStudents();
        setCurrentDate();

        // Add session debugging (remove in production)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            checkSessionDebug();
        }
    } catch (error) {
        console.error('Error during initial page load:', error);
        alert('An error occurred during page load. Please check the console for details.');
    }
});

// ... other admin functions would be here

async function exportRecordsPDF() {
    exportRecords('pdf');
}

async function exportRecordsCSV() {
    exportRecords('csv');
}

async function exportRecords(format) {
    const subjectId = document.getElementById('records-subject').value;
    const startDate = document.getElementById('records-start-date').value;
    const endDate = document.getElementById('records-end-date').value;

    try {
        let url = '/api/attendance/records/export';
        const params = new URLSearchParams();

        params.append('format', format);
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
