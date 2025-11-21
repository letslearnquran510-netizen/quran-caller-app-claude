// ========================================
// QURAN ACADEMY CALLING SERVER
// Save as: server.js
// ========================================

require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const cors = require('cors');
const path = require('path');
const db = require('./data/database');
const scheduler = require('./scheduler');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
db.initializeDatabase();

// 🔧 REPLACE WITH YOUR TWILIO CREDENTIALS:
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; // Your Twilio phone number


// Check if all required environment variables are set
if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.error(
    'ERROR: Missing Twilio credentials. Please check your .env file and ensure all variables are set.'
  );
  process.exit(1);
}

const client = twilio(accountSid, authToken);

// Initialize scheduler
scheduler.initializeScheduler(client, twilioPhoneNumber);

// ========================================
// HEALTH CHECK - Tests if server is running
// ========================================
app.get('/health', (req, res) => {
    console.log('✅ Health check received');
    res.json({ 
        status: 'Server is running!',
        twilioConfigured: true,
        timestamp: new Date().toISOString()
    });
});

// ========================================
// MAKE CALL - Makes real call via Twilio
// ========================================
app.post('/make-call', async (req, res) => {
    const { to, name } = req.body;

    console.log(`\n📞 Incoming call request for: ${name} (${to})`);

    if (!to) {
        return res.status(400).json({ 
            success: false,
            error: 'Phone number is required' 
        });
    }

    try {
        console.log(`🔄 Initiating call from ${twilioPhoneNumber} to ${to}...`);

        const call = await client.calls.create({
            url: 'http://demo.twilio.com/docs/voice.xml',
            to: to,
            from: twilioPhoneNumber,
            statusCallback: 'http://localhost:3000/call-status',
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
        });

        console.log(`✅ Call initiated successfully!`);
        console.log(`   Call SID: ${call.sid}`);
        console.log(`   Status: ${call.status}`);
        
        res.json({
            success: true,
            callSid: call.sid,
            message: `Calling ${name}...`,
            status: call.status
        });
    } catch (error) {
        console.error('❌ Call failed:', error.message);
        console.error('   Error code:', error.code);
        
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code
        });
    }
});

// ========================================
// CALL STATUS - Webhook for call updates
// ========================================
app.post('/call-status', (req, res) => {
    const { CallSid, CallStatus, CallDuration } = req.body;
    console.log(`📊 Call ${CallSid}: ${CallStatus}${CallDuration ? ` (${CallDuration}s)` : ''}`);
    res.sendStatus(200);
});

// ========================================
// STUDENT MANAGEMENT ENDPOINTS
// ========================================

// Get all students
app.get('/api/students', (req, res) => {
    try {
        const students = db.getAllStudents();
        res.json({ success: true, students });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get student by ID
app.get('/api/students/:id', (req, res) => {
    try {
        const student = db.getStudentById(req.params.id);
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        res.json({ success: true, student });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add new student
app.post('/api/students', (req, res) => {
    try {
        const { name, phone, class: classLevel, email, notes } = req.body;

        if (!name || !phone || !classLevel) {
            return res.status(400).json({
                success: false,
                error: 'Name, phone, and class are required'
            });
        }

        const student = db.addStudent({ name, phone, class: classLevel, email, notes });
        console.log(`✅ New student added: ${name}`);
        res.json({ success: true, student });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update student
app.put('/api/students/:id', (req, res) => {
    try {
        const student = db.updateStudent(req.params.id, req.body);
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        console.log(`✅ Student updated: ${student.name}`);
        res.json({ success: true, student });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete student
app.delete('/api/students/:id', (req, res) => {
    try {
        const deleted = db.deleteStudent(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        console.log(`✅ Student deleted`);
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========================================
// CALL HISTORY ENDPOINTS
// ========================================

// Get all call history
app.get('/api/history', (req, res) => {
    try {
        const history = db.getAllHistory();
        res.json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get history by date range
app.get('/api/history/range', (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                error: 'Start date and end date are required'
            });
        }
        const history = db.getHistoryByDateRange(startDate, endDate);
        res.json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get history by student
app.get('/api/history/student/:studentId', (req, res) => {
    try {
        const history = db.getHistoryByStudent(req.params.studentId);
        res.json({ success: true, history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========================================
// SCHEDULE MANAGEMENT ENDPOINTS
// ========================================

// Get all schedules
app.get('/api/schedules', (req, res) => {
    try {
        const schedules = db.getAllSchedules();
        res.json({ success: true, schedules });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get schedule by ID
app.get('/api/schedules/:id', (req, res) => {
    try {
        const schedule = db.getScheduleById(req.params.id);
        if (!schedule) {
            return res.status(404).json({ success: false, error: 'Schedule not found' });
        }
        res.json({ success: true, schedule });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add new schedule
app.post('/api/schedules', (req, res) => {
    try {
        const { studentIds, date, time, repeat } = req.body;

        if (!studentIds || !date || !time) {
            return res.status(400).json({
                success: false,
                error: 'Student IDs, date, and time are required'
            });
        }

        const schedule = db.addSchedule({ studentIds, date, time, repeat });
        console.log(`✅ New schedule created for ${date} at ${time}`);
        res.json({ success: true, schedule });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update schedule
app.put('/api/schedules/:id', (req, res) => {
    try {
        const schedule = db.updateSchedule(req.params.id, req.body);
        if (!schedule) {
            return res.status(404).json({ success: false, error: 'Schedule not found' });
        }
        console.log(`✅ Schedule updated`);
        res.json({ success: true, schedule });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete schedule
app.delete('/api/schedules/:id', (req, res) => {
    try {
        const deleted = db.deleteSchedule(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Schedule not found' });
        }
        console.log(`✅ Schedule deleted`);
        res.json({ success: true, message: 'Schedule deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Trigger schedule manually
app.post('/api/schedules/:id/trigger', async (req, res) => {
    try {
        const result = await scheduler.triggerScheduleNow(req.params.id, client, twilioPhoneNumber);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========================================
// START SERVER
// ========================================
const PORT = 3000;
app.listen(PORT, () => {
    console.clear();
    console.log(`
╔═══════════════════════════════════════════════╗
║   🕌 QURAN ACADEMY CALLING SERVER STARTED    ║
╚═══════════════════════════════════════════════╝

✅ Server Status: RUNNING
🌐 Server URL: http://localhost:${PORT}
📞 Ready to make calls!

⚙️  Configuration:
   • Account SID: ${accountSid.substring(0, 10)}...
   • Phone Number: ${twilioPhoneNumber}

📝 Next Steps:
   1. Keep this window open (don't close!)
   2. Open your web app
   3. Click "Test Connection"
   4. Should show: "✅ Connected!"

🔗 Test URL: http://localhost:${PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Server logs will appear below:
    `);
});

// Handle server errors
app.on('error', (error) => {
    console.error('❌ Server error:', error.message);
});

process.on('SIGINT', () => {
    console.log('\n\n👋 Server shutting down...');
    process.exit(0);
});