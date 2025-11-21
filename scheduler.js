// ========================================
// CALL SCHEDULER MODULE
// ========================================

const cron = require('node-cron');
const db = require('./data/database');

let scheduledJobs = new Map();

// ========================================
// INITIALIZE SCHEDULER
// ========================================
function initializeScheduler(twilioClient, twilioPhoneNumber) {
    console.log('📅 Initializing call scheduler...');

    // Check every minute for scheduled calls
    cron.schedule('* * * * *', () => {
        checkScheduledCalls(twilioClient, twilioPhoneNumber);
    });

    console.log('✅ Scheduler initialized');
}

// ========================================
// CHECK FOR SCHEDULED CALLS
// ========================================
async function checkScheduledCalls(twilioClient, twilioPhoneNumber) {
    const now = new Date();
    const schedules = db.getActiveSchedules();

    for (const schedule of schedules) {
        const scheduleDateTime = new Date(`${schedule.date}T${schedule.time}`);

        // Check if it's time to make the call (within 1 minute window)
        const timeDiff = Math.abs(now - scheduleDateTime);
        if (timeDiff < 60000) { // Within 1 minute
            console.log(`📞 Executing scheduled call: ${schedule.id}`);
            await executeScheduledCall(schedule, twilioClient, twilioPhoneNumber);

            // Handle repeat schedules
            if (schedule.repeat !== 'once') {
                updateScheduleForRepeat(schedule);
            } else {
                // Deactivate one-time schedule
                db.updateSchedule(schedule.id, { active: false });
            }
        }
    }
}

// ========================================
// EXECUTE SCHEDULED CALL
// ========================================
async function executeScheduledCall(schedule, twilioClient, twilioPhoneNumber) {
    const { studentIds } = schedule;

    for (const studentId of studentIds) {
        const student = db.getStudentById(studentId);

        if (!student) {
            console.error(`❌ Student not found: ${studentId}`);
            continue;
        }

        try {
            console.log(`📞 Calling ${student.name} (${student.phone})...`);

            const call = await twilioClient.calls.create({
                url: 'http://demo.twilio.com/docs/voice.xml',
                to: student.phone,
                from: twilioPhoneNumber
            });

            console.log(`✅ Call initiated: ${call.sid}`);

            // Update student call info
            db.updateStudentCallInfo(studentId);

            // Add to call history
            db.addCallRecord({
                studentId: student.id,
                studentName: student.name,
                phone: student.phone,
                callSid: call.sid,
                status: 'completed',
                duration: 0,
                scheduleId: schedule.id
            });

        } catch (error) {
            console.error(`❌ Call failed for ${student.name}:`, error.message);

            // Add failed call to history
            db.addCallRecord({
                studentId: student.id,
                studentName: student.name,
                phone: student.phone,
                callSid: null,
                status: 'failed',
                duration: 0,
                scheduleId: schedule.id,
                error: error.message
            });
        }

        // Wait 5 seconds between calls to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// ========================================
// UPDATE SCHEDULE FOR REPEAT
// ========================================
function updateScheduleForRepeat(schedule) {
    const currentDate = new Date(`${schedule.date}T${schedule.time}`);
    let nextDate;

    switch (schedule.repeat) {
        case 'daily':
            nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
            break;
        case 'weekly':
            nextDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
        case 'monthly':
            nextDate = new Date(currentDate);
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        default:
            return;
    }

    const nextDateStr = nextDate.toISOString().split('T')[0];
    db.updateSchedule(schedule.id, { date: nextDateStr });

    console.log(`✅ Schedule ${schedule.id} updated for next occurrence: ${nextDateStr}`);
}

// ========================================
// MANUAL TRIGGER
// ========================================
async function triggerScheduleNow(scheduleId, twilioClient, twilioPhoneNumber) {
    const schedule = db.getScheduleById(scheduleId);

    if (!schedule) {
        throw new Error('Schedule not found');
    }

    console.log(`📞 Manually triggering schedule: ${scheduleId}`);
    await executeScheduledCall(schedule, twilioClient, twilioPhoneNumber);

    return { success: true, message: 'Schedule executed successfully' };
}

// ========================================
// EXPORTS
// ========================================
module.exports = {
    initializeScheduler,
    triggerScheduleNow
};
