// ========================================
// QURAN ACADEMY - CALLER APP CLIENT
// ========================================

const API_URL = 'http://localhost:3000';

// ========================================
// STATE MANAGEMENT
// ========================================
const state = {
    students: [],
    callHistory: [],
    scheduledCalls: [],
    settings: {
        autoRetry: false,
        retryAttempts: 3,
        callInterval: 30
    },
    currentSection: 'caller',
    isConnected: false
};

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadLocalData();
    setupEventListeners();
    renderStudents();
    testConnection();
});

function initializeApp() {
    console.log('🕌 Quran Academy Caller App initialized');

    // Load sample students if none exist
    if (state.students.length === 0) {
        state.students = getSampleStudents();
        saveLocalData();
    }
}

// ========================================
// DATA PERSISTENCE
// ========================================
function saveLocalData() {
    try {
        localStorage.setItem('quranAcademyData', JSON.stringify({
            students: state.students,
            callHistory: state.callHistory,
            scheduledCalls: state.scheduledCalls,
            settings: state.settings
        }));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

function loadLocalData() {
    try {
        const data = localStorage.getItem('quranAcademyData');
        if (data) {
            const parsed = JSON.parse(data);
            state.students = parsed.students || [];
            state.callHistory = parsed.callHistory || [];
            state.scheduledCalls = parsed.scheduledCalls || [];
            state.settings = parsed.settings || state.settings;
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// ========================================
// EVENT LISTENERS
// ========================================
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });

    // Test Connection
    document.getElementById('testConnectionBtn').addEventListener('click', testConnection);

    // Search
    document.getElementById('searchStudent').addEventListener('input', handleSearch);

    // Filters
    document.getElementById('classFilter').addEventListener('change', handleFilter);

    // Call All Button
    document.getElementById('callAllBtn').addEventListener('click', callAllStudents);

    // Add Student Modal
    document.getElementById('addStudentBtn').addEventListener('click', openAddStudentModal);
    document.getElementById('cancelAddStudentBtn').addEventListener('click', closeAddStudentModal);
    document.getElementById('saveStudentBtn').addEventListener('click', saveNewStudent);
    document.querySelector('.close').addEventListener('click', closeAddStudentModal);

    // Settings
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

    // Schedule
    document.getElementById('createScheduleBtn').addEventListener('click', createSchedule);

    // History
    document.getElementById('filterHistoryBtn').addEventListener('click', filterHistory);
    document.getElementById('exportHistoryBtn').addEventListener('click', exportHistory);

    // Modal backdrop click
    document.getElementById('addStudentModal').addEventListener('click', (e) => {
        if (e.target.id === 'addStudentModal') {
            closeAddStudentModal();
        }
    });
}

// ========================================
// NAVIGATION
// ========================================
function handleNavigation(e) {
    e.preventDefault();

    const navItem = e.currentTarget;
    const section = navItem.dataset.section;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    navItem.classList.add('active');

    // Show selected section
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');

    state.currentSection = section;

    // Render content based on section
    switch(section) {
        case 'caller':
            renderStudents();
            break;
        case 'students':
            renderStudentsTable();
            break;
        case 'schedule':
            renderSchedule();
            break;
        case 'history':
            renderHistory();
            break;
        case 'settings':
            renderSettings();
            break;
    }
}

// ========================================
// CONNECTION TESTING
// ========================================
async function testConnection() {
    const statusElement = document.getElementById('connectionStatus');
    const btn = document.getElementById('testConnectionBtn');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';

    try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();

        if (data.status === 'Server is running!') {
            state.isConnected = true;
            statusElement.className = 'status-indicator connected';
            statusElement.innerHTML = '<i class="fas fa-circle"></i> <span>Connected</span>';
            showToast('✅ Connected to server successfully!', 'success');
        }
    } catch (error) {
        state.isConnected = false;
        statusElement.className = 'status-indicator disconnected';
        statusElement.innerHTML = '<i class="fas fa-circle"></i> <span>Disconnected</span>';
        showToast('❌ Failed to connect to server', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-wifi"></i> Test Connection';
    }
}

// ========================================
// STUDENT RENDERING
// ========================================
function renderStudents(filter = {}) {
    const grid = document.getElementById('studentsGrid');
    let students = state.students;

    // Apply filters
    if (filter.search) {
        students = students.filter(s =>
            s.name.toLowerCase().includes(filter.search.toLowerCase())
        );
    }

    if (filter.class && filter.class !== 'all') {
        students = students.filter(s => s.class === filter.class);
    }

    if (students.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No students found</h3>
                <p>Add students to get started with calling</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = students.map(student => `
        <div class="student-card" data-id="${student.id}">
            <div class="student-header">
                <div class="student-avatar">
                    ${student.name.charAt(0).toUpperCase()}
                </div>
                <div class="student-info">
                    <h3>${student.name}</h3>
                    <span class="student-class">${capitalize(student.class)}</span>
                </div>
            </div>
            <div class="student-details">
                <div class="student-detail">
                    <i class="fas fa-phone"></i>
                    <span>${student.phone}</span>
                </div>
                <div class="student-detail">
                    <i class="fas fa-calendar"></i>
                    <span>Last called: ${student.lastCalled || 'Never'}</span>
                </div>
                <div class="student-detail">
                    <i class="fas fa-chart-line"></i>
                    <span>Calls: ${student.callCount || 0}</span>
                </div>
            </div>
            <div class="student-actions">
                <button class="btn btn-primary" onclick="callStudent('${student.id}')">
                    <i class="fas fa-phone"></i> Call
                </button>
                <button class="btn btn-secondary" onclick="viewStudent('${student.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

function renderStudentsTable() {
    const tbody = document.getElementById('studentsTableBody');

    if (state.students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No students found</h3>
                        <p>Click "Add New Student" to get started</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = state.students.map(student => `
        <tr>
            <td>${student.name}</td>
            <td>${student.phone}</td>
            <td>${capitalize(student.class)}</td>
            <td>${student.lastCalled || 'Never'}</td>
            <td><span class="status-badge active">Active</span></td>
            <td>
                <button class="btn btn-primary" onclick="callStudent('${student.id}')" style="padding: 0.4rem 0.8rem;">
                    <i class="fas fa-phone"></i>
                </button>
                <button class="btn btn-danger" onclick="deleteStudent('${student.id}')" style="padding: 0.4rem 0.8rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ========================================
// CALLING FUNCTIONALITY
// ========================================
async function callStudent(studentId) {
    const student = state.students.find(s => s.id === studentId);
    if (!student) {
        showToast('❌ Student not found', 'error');
        return;
    }

    if (!state.isConnected) {
        showToast('❌ Not connected to server. Please test connection first.', 'error');
        return;
    }

    const card = document.querySelector(`[data-id="${studentId}"]`);
    if (card) {
        card.classList.add('calling');
    }

    showToast(`📞 Calling ${student.name}...`, 'info');

    try {
        const response = await fetch(`${API_URL}/make-call`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: student.phone,
                name: student.name
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast(`✅ Call initiated to ${student.name}`, 'success');

            // Update student record
            student.lastCalled = new Date().toLocaleString();
            student.callCount = (student.callCount || 0) + 1;

            // Add to call history
            state.callHistory.unshift({
                id: Date.now().toString(),
                studentName: student.name,
                phone: student.phone,
                callSid: data.callSid,
                status: 'completed',
                timestamp: new Date().toISOString(),
                duration: 0
            });

            saveLocalData();

            if (state.currentSection === 'caller') {
                renderStudents();
            }
        } else {
            showToast(`❌ Call failed: ${data.error}`, 'error');
        }
    } catch (error) {
        showToast(`❌ Error making call: ${error.message}`, 'error');
    } finally {
        if (card) {
            setTimeout(() => {
                card.classList.remove('calling');
            }, 2000);
        }
    }
}

async function callAllStudents() {
    if (!state.isConnected) {
        showToast('❌ Not connected to server', 'error');
        return;
    }

    if (state.students.length === 0) {
        showToast('❌ No students to call', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to call all ${state.students.length} students?`)) {
        return;
    }

    showToast(`📞 Starting bulk calls to ${state.students.length} students...`, 'info');

    for (let i = 0; i < state.students.length; i++) {
        const student = state.students[i];
        await callStudent(student.id);

        // Wait for interval between calls
        if (i < state.students.length - 1) {
            await new Promise(resolve => setTimeout(resolve, state.settings.callInterval * 1000));
        }
    }

    showToast('✅ Bulk calling completed!', 'success');
}

// ========================================
// STUDENT MANAGEMENT
// ========================================
function openAddStudentModal() {
    document.getElementById('addStudentModal').classList.add('active');
    // Clear form
    document.getElementById('newStudentName').value = '';
    document.getElementById('newStudentPhone').value = '';
    document.getElementById('newStudentClass').value = '';
    document.getElementById('newStudentEmail').value = '';
    document.getElementById('newStudentNotes').value = '';
}

function closeAddStudentModal() {
    document.getElementById('addStudentModal').classList.remove('active');
}

function saveNewStudent() {
    const name = document.getElementById('newStudentName').value.trim();
    const phone = document.getElementById('newStudentPhone').value.trim();
    const classLevel = document.getElementById('newStudentClass').value;
    const email = document.getElementById('newStudentEmail').value.trim();
    const notes = document.getElementById('newStudentNotes').value.trim();

    if (!name || !phone || !classLevel) {
        showToast('❌ Please fill in all required fields', 'error');
        return;
    }

    const newStudent = {
        id: Date.now().toString(),
        name,
        phone,
        class: classLevel,
        email,
        notes,
        lastCalled: null,
        callCount: 0,
        createdAt: new Date().toISOString()
    };

    state.students.push(newStudent);
    saveLocalData();

    showToast(`✅ Student ${name} added successfully!`, 'success');
    closeAddStudentModal();

    if (state.currentSection === 'caller') {
        renderStudents();
    } else if (state.currentSection === 'students') {
        renderStudentsTable();
    }
}

function deleteStudent(studentId) {
    const student = state.students.find(s => s.id === studentId);

    if (!student) {
        showToast('❌ Student not found', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${student.name}?`)) {
        return;
    }

    state.students = state.students.filter(s => s.id !== studentId);
    saveLocalData();

    showToast(`✅ Student deleted successfully`, 'success');
    renderStudentsTable();
}

function viewStudent(studentId) {
    const student = state.students.find(s => s.id === studentId);
    if (student) {
        alert(`Student Details:\n\nName: ${student.name}\nPhone: ${student.phone}\nClass: ${student.class}\nEmail: ${student.email || 'N/A'}\nCalls: ${student.callCount || 0}\nLast Called: ${student.lastCalled || 'Never'}`);
    }
}

// ========================================
// SEARCH & FILTER
// ========================================
function handleSearch(e) {
    const search = e.target.value;
    renderStudents({ search, class: document.getElementById('classFilter').value });
}

function handleFilter(e) {
    const classLevel = e.target.value;
    const search = document.getElementById('searchStudent').value;
    renderStudents({ search, class: classLevel });
}

// ========================================
// SCHEDULE MANAGEMENT
// ========================================
function renderSchedule() {
    const select = document.getElementById('scheduleStudents');
    select.innerHTML = state.students.map(s =>
        `<option value="${s.id}">${s.name} - ${s.phone}</option>`
    ).join('');

    renderScheduledCalls();
}

function renderScheduledCalls() {
    const container = document.querySelector('.scheduled-items');

    if (state.scheduledCalls.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar"></i>
                <h3>No scheduled calls</h3>
                <p>Create a schedule to automate your calls</p>
            </div>
        `;
        return;
    }

    container.innerHTML = state.scheduledCalls.map(schedule => `
        <div class="scheduled-item">
            <div>
                <strong>${schedule.studentNames.join(', ')}</strong>
                <br>
                <small>${schedule.date} at ${schedule.time} (${schedule.repeat})</small>
            </div>
            <button class="btn btn-danger" onclick="deleteSchedule('${schedule.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function createSchedule() {
    const studentIds = Array.from(document.getElementById('scheduleStudents').selectedOptions).map(o => o.value);
    const date = document.getElementById('scheduleDate').value;
    const time = document.getElementById('scheduleTime').value;
    const repeat = document.getElementById('scheduleRepeat').value;

    if (studentIds.length === 0 || !date || !time) {
        showToast('❌ Please fill in all fields', 'error');
        return;
    }

    const studentNames = studentIds.map(id =>
        state.students.find(s => s.id === id)?.name
    ).filter(Boolean);

    const schedule = {
        id: Date.now().toString(),
        studentIds,
        studentNames,
        date,
        time,
        repeat,
        createdAt: new Date().toISOString()
    };

    state.scheduledCalls.push(schedule);
    saveLocalData();

    showToast('✅ Schedule created successfully!', 'success');
    renderScheduledCalls();
}

function deleteSchedule(scheduleId) {
    state.scheduledCalls = state.scheduledCalls.filter(s => s.id !== scheduleId);
    saveLocalData();
    showToast('✅ Schedule deleted', 'success');
    renderScheduledCalls();
}

// ========================================
// CALL HISTORY
// ========================================
function renderHistory() {
    const tbody = document.getElementById('historyTableBody');

    if (state.callHistory.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    <div class="empty-state">
                        <i class="fas fa-history"></i>
                        <h3>No call history</h3>
                        <p>Your call history will appear here</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = state.callHistory.map(call => `
        <tr>
            <td>${new Date(call.timestamp).toLocaleString()}</td>
            <td>${call.studentName}</td>
            <td>${call.phone}</td>
            <td><span class="status-badge ${call.status}">${capitalize(call.status)}</span></td>
            <td>${call.duration}s</td>
            <td><small>${call.callSid}</small></td>
        </tr>
    `).join('');
}

function filterHistory() {
    const startDate = document.getElementById('historyStartDate').value;
    const endDate = document.getElementById('historyEndDate').value;

    if (!startDate || !endDate) {
        showToast('❌ Please select date range', 'error');
        return;
    }

    showToast('📊 Filtering history...', 'info');
    renderHistory();
}

function exportHistory() {
    const csv = [
        ['Date & Time', 'Student Name', 'Phone', 'Status', 'Duration', 'Call ID'],
        ...state.callHistory.map(call => [
            new Date(call.timestamp).toLocaleString(),
            call.studentName,
            call.phone,
            call.status,
            call.duration + 's',
            call.callSid
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-history-${Date.now()}.csv`;
    a.click();

    showToast('✅ History exported successfully!', 'success');
}

// ========================================
// SETTINGS
// ========================================
function renderSettings() {
    document.getElementById('autoRetry').checked = state.settings.autoRetry;
    document.getElementById('retryAttempts').value = state.settings.retryAttempts;
    document.getElementById('callInterval').value = state.settings.callInterval;
}

function saveSettings() {
    state.settings.autoRetry = document.getElementById('autoRetry').checked;
    state.settings.retryAttempts = parseInt(document.getElementById('retryAttempts').value);
    state.settings.callInterval = parseInt(document.getElementById('callInterval').value);

    saveLocalData();
    showToast('✅ Settings saved successfully!', 'success');
}

// ========================================
// UTILITIES
// ========================================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getSampleStudents() {
    return [
        {
            id: '1',
            name: 'Ahmed Ali',
            phone: '+1234567890',
            class: 'beginner',
            email: 'ahmed@example.com',
            notes: 'Learning basic Quran recitation',
            lastCalled: null,
            callCount: 0
        },
        {
            id: '2',
            name: 'Fatima Hassan',
            phone: '+1234567891',
            class: 'intermediate',
            email: 'fatima@example.com',
            notes: 'Memorizing Surah Al-Baqarah',
            lastCalled: null,
            callCount: 0
        },
        {
            id: '3',
            name: 'Omar Khan',
            phone: '+1234567892',
            class: 'advanced',
            email: 'omar@example.com',
            notes: 'Advanced Tajweed studies',
            lastCalled: null,
            callCount: 0
        },
        {
            id: '4',
            name: 'Aisha Mohammed',
            phone: '+1234567893',
            class: 'beginner',
            email: 'aisha@example.com',
            notes: 'New student - just started',
            lastCalled: null,
            callCount: 0
        },
        {
            id: '5',
            name: 'Ibrahim Abdullah',
            phone: '+1234567894',
            class: 'intermediate',
            email: 'ibrahim@example.com',
            notes: 'Working on Tajweed rules',
            lastCalled: null,
            callCount: 0
        }
    ];
}

// ========================================
// GLOBAL FUNCTIONS (for inline handlers)
// ========================================
window.callStudent = callStudent;
window.viewStudent = viewStudent;
window.deleteStudent = deleteStudent;
window.deleteSchedule = deleteSchedule;
