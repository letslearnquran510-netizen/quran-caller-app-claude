// ========================================
// DATABASE MODULE - Simple JSON Storage
// ========================================

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname);
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const HISTORY_FILE = path.join(DATA_DIR, 'call-history.json');
const SCHEDULES_FILE = path.join(DATA_DIR, 'schedules.json');

// ========================================
// INITIALIZATION
// ========================================
function initializeDatabase() {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Initialize files if they don't exist
    if (!fs.existsSync(STUDENTS_FILE)) {
        fs.writeFileSync(STUDENTS_FILE, JSON.stringify([], null, 2));
    }

    if (!fs.existsSync(HISTORY_FILE)) {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2));
    }

    if (!fs.existsSync(SCHEDULES_FILE)) {
        fs.writeFileSync(SCHEDULES_FILE, JSON.stringify([], null, 2));
    }

    console.log('✅ Database initialized');
}

// ========================================
// GENERIC CRUD OPERATIONS
// ========================================
function readData(file) {
    try {
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${file}:`, error);
        return [];
    }
}

function writeData(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing to ${file}:`, error);
        return false;
    }
}

// ========================================
// STUDENTS OPERATIONS
// ========================================
function getAllStudents() {
    return readData(STUDENTS_FILE);
}

function getStudentById(id) {
    const students = readData(STUDENTS_FILE);
    return students.find(s => s.id === id);
}

function addStudent(student) {
    const students = readData(STUDENTS_FILE);
    const newStudent = {
        id: Date.now().toString(),
        ...student,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastCalled: null,
        callCount: 0
    };
    students.push(newStudent);
    writeData(STUDENTS_FILE, students);
    return newStudent;
}

function updateStudent(id, updates) {
    const students = readData(STUDENTS_FILE);
    const index = students.findIndex(s => s.id === id);

    if (index === -1) {
        return null;
    }

    students[index] = {
        ...students[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    writeData(STUDENTS_FILE, students);
    return students[index];
}

function deleteStudent(id) {
    const students = readData(STUDENTS_FILE);
    const filtered = students.filter(s => s.id !== id);

    if (filtered.length === students.length) {
        return false; // Student not found
    }

    writeData(STUDENTS_FILE, filtered);
    return true;
}

function updateStudentCallInfo(id) {
    const students = readData(STUDENTS_FILE);
    const index = students.findIndex(s => s.id === id);

    if (index !== -1) {
        students[index].lastCalled = new Date().toISOString();
        students[index].callCount = (students[index].callCount || 0) + 1;
        writeData(STUDENTS_FILE, students);
        return students[index];
    }

    return null;
}

// ========================================
// CALL HISTORY OPERATIONS
// ========================================
function getAllHistory() {
    return readData(HISTORY_FILE);
}

function addCallRecord(record) {
    const history = readData(HISTORY_FILE);
    const newRecord = {
        id: Date.now().toString(),
        ...record,
        timestamp: new Date().toISOString()
    };
    history.unshift(newRecord); // Add to beginning
    writeData(HISTORY_FILE, history);
    return newRecord;
}

function getHistoryByDateRange(startDate, endDate) {
    const history = readData(HISTORY_FILE);
    return history.filter(record => {
        const recordDate = new Date(record.timestamp);
        return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
    });
}

function getHistoryByStudent(studentId) {
    const history = readData(HISTORY_FILE);
    return history.filter(record => record.studentId === studentId);
}

// ========================================
// SCHEDULES OPERATIONS
// ========================================
function getAllSchedules() {
    return readData(SCHEDULES_FILE);
}

function getScheduleById(id) {
    const schedules = readData(SCHEDULES_FILE);
    return schedules.find(s => s.id === id);
}

function addSchedule(schedule) {
    const schedules = readData(SCHEDULES_FILE);
    const newSchedule = {
        id: Date.now().toString(),
        ...schedule,
        createdAt: new Date().toISOString(),
        active: true
    };
    schedules.push(newSchedule);
    writeData(SCHEDULES_FILE, schedules);
    return newSchedule;
}

function updateSchedule(id, updates) {
    const schedules = readData(SCHEDULES_FILE);
    const index = schedules.findIndex(s => s.id === id);

    if (index === -1) {
        return null;
    }

    schedules[index] = {
        ...schedules[index],
        ...updates
    };

    writeData(SCHEDULES_FILE, schedules);
    return schedules[index];
}

function deleteSchedule(id) {
    const schedules = readData(SCHEDULES_FILE);
    const filtered = schedules.filter(s => s.id !== id);

    if (filtered.length === schedules.length) {
        return false;
    }

    writeData(SCHEDULES_FILE, filtered);
    return true;
}

function getActiveSchedules() {
    const schedules = readData(SCHEDULES_FILE);
    return schedules.filter(s => s.active === true);
}

// ========================================
// EXPORTS
// ========================================
module.exports = {
    initializeDatabase,

    // Students
    getAllStudents,
    getStudentById,
    addStudent,
    updateStudent,
    deleteStudent,
    updateStudentCallInfo,

    // History
    getAllHistory,
    addCallRecord,
    getHistoryByDateRange,
    getHistoryByStudent,

    // Schedules
    getAllSchedules,
    getScheduleById,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    getActiveSchedules
};
