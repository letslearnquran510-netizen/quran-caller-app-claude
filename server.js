// ========================================
// QURAN ACADEMY CALLING SERVER
// With WebSocket Real-Time Updates
// ========================================

const express = require('express');
const twilio = require('twilio');
const cors = require('cors');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve index.html on root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ---------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------
const config = {
    twilio: {
        accountSid: (process.env.TWILIO_ACCOUNT_SID || '').trim(),
        authToken: (process.env.TWILIO_AUTH_TOKEN || '').trim(),
        phoneNumber: (process.env.TWILIO_PHONE_NUMBER || '').trim(),
    },
    publicUrl: (process.env.PUBLIC_URL || 'http://localhost:3000').trim(),
};

// Validate Twilio credentials
if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.phoneNumber) {
    console.error('❌ ERROR: Twilio credentials not configured!');
} else {
    console.log('✅ Twilio CONFIGURED ✓');
    console.log('   Phone:', config.twilio.phoneNumber);
}

// Initialize Twilio client
let twilioClient = null;
try {
    if (config.twilio.accountSid && config.twilio.authToken) {
        twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
        console.log('✅ Twilio client initialized');
    }
} catch (err) {
    console.error('❌ Twilio init error:', err.message);
}

// ---------------------------------------------------------
// IN-MEMORY CALL STORAGE
// ---------------------------------------------------------
const activeCalls = new Map();

// ---------------------------------------------------------
// WEBSOCKET MANAGEMENT
// ---------------------------------------------------------
const wsClients = new Set();

wss.on('connection', (ws) => {
    console.log('🔌 WebSocket client connected');
    wsClients.add(ws);
    
    // Send welcome message
    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Real-time updates enabled' }));
    
    // Handle ping/pong for keepalive
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'PING') {
                ws.send(JSON.stringify({ type: 'PONG' }));
            }
            // Subscribe to specific call updates
            if (data.type === 'SUBSCRIBE_CALL' && data.callSid) {
                ws.subscribedCallSid = data.callSid;
                console.log('📡 Client subscribed to call:', data.callSid);
            }
        } catch (e) {
            // Ignore invalid messages
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        wsClients.delete(ws);
    });
    
    ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
        wsClients.delete(ws);
    });
});

// Broadcast call status to all connected clients
function broadcastCallStatus(callSid, status, duration, recordingUrl) {
    const message = JSON.stringify({
        type: 'CALL_STATUS_UPDATE',
        callSid,
        status,
        duration,
        recordingUrl,
        timestamp: Date.now()
    });
    
    console.log(`📢 Broadcasting to ${wsClients.size} clients:`, status);
    
    wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            // Send to all clients or only subscribed ones
            if (!client.subscribedCallSid || client.subscribedCallSid === callSid) {
                client.send(message);
            }
        }
    });
}

// ---------------------------------------------------------
// API ENDPOINTS
// ---------------------------------------------------------

// POST /make-call - Initiate a call
app.post('/make-call', async (req, res) => {
    const { to, name, record } = req.body;
    
    console.log('\n' + '='.repeat(50));
    console.log('📞 INITIATING CALL');
    console.log('   To:', to);
    console.log('   Name:', name);
    console.log('='.repeat(50));
    
    if (!to) {
        return res.status(400).json({ success: false, error: 'Phone number required' });
    }
    
    if (!twilioClient) {
        return res.status(500).json({ success: false, error: 'Twilio not configured' });
    }
    
    try {
        const call = await twilioClient.calls.create({
            url: 'http://demo.twilio.com/docs/voice.xml',
            to: to,
            from: config.twilio.phoneNumber,
            record: record || false,
            statusCallback: `${config.publicUrl}/webhooks/call-status`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST'
        });
        
        // Store call info
        activeCalls.set(call.sid, {
            sid: call.sid,
            to: to,
            name: name,
            status: 'initiated',
            duration: 0,
            startTime: Date.now(),
            recordingUrl: null
        });
        
        console.log('✅ Call created - SID:', call.sid);
        
        // Broadcast call initiated
        broadcastCallStatus(call.sid, 'initiated', 0, null);
        
        res.json({
            success: true,
            callSid: call.sid,
            message: 'Call initiated successfully'
        });
        
    } catch (error) {
        console.error('❌ Twilio Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET /call-status/:sid - Get call status
app.get('/call-status/:sid', async (req, res) => {
    const { sid } = req.params;
    
    // First check our local cache
    const cachedCall = activeCalls.get(sid);
    
    if (cachedCall) {
        // Calculate duration if call is active
        if (cachedCall.status === 'in-progress' && cachedCall.answeredTime) {
            cachedCall.duration = Math.floor((Date.now() - cachedCall.answeredTime) / 1000);
        }
        
        console.log('📊 Status check:', sid.substring(0, 10) + '...', '→', cachedCall.status);
        
        return res.json({
            status: cachedCall.status,
            duration: cachedCall.duration,
            recordingUrl: cachedCall.recordingUrl
        });
    }
    
    // If not in cache, try to fetch from Twilio
    if (!twilioClient) {
        return res.status(404).json({ error: 'Call not found' });
    }
    
    try {
        const call = await twilioClient.calls(sid).fetch();
        const status = call.status;
        const duration = parseInt(call.duration) || 0;
        
        console.log('📊 Twilio status:', sid.substring(0, 10) + '...', '→', status);
        
        res.json({
            status: status,
            duration: duration,
            recordingUrl: null
        });
        
    } catch (error) {
        console.error('❌ Status fetch error:', error.message);
        res.status(404).json({ error: 'Call not found' });
    }
});

// POST /hangup-call - End a call
app.post('/hangup-call', async (req, res) => {
    const { sid } = req.body;
    
    console.log('✋ HANGUP requested for:', sid);
    
    if (!sid) {
        return res.status(400).json({ success: false, error: 'Call SID required' });
    }
    
    const cachedCall = activeCalls.get(sid);
    let duration = 0;
    
    if (cachedCall && cachedCall.answeredTime) {
        duration = Math.floor((Date.now() - cachedCall.answeredTime) / 1000);
    }
    
    if (!twilioClient) {
        if (cachedCall) {
            cachedCall.status = 'completed';
            cachedCall.duration = duration;
        }
        // Broadcast even without Twilio
        broadcastCallStatus(sid, 'completed', duration, null);
        return res.json({ success: true, status: 'completed', duration });
    }
    
    try {
        await twilioClient.calls(sid).update({ status: 'completed' });
        
        if (cachedCall) {
            cachedCall.status = 'completed';
            cachedCall.duration = duration;
        }
        
        console.log('✅ Call terminated, duration:', duration, 's');
        
        // Broadcast call ended
        broadcastCallStatus(sid, 'completed', duration, cachedCall?.recordingUrl || null);
        
        res.json({
            success: true,
            status: 'completed',
            duration: duration,
            recordingUrl: cachedCall?.recordingUrl || null
        });
        
    } catch (error) {
        console.error('❌ Hangup error:', error.message);
        if (error.code === 20404) {
            broadcastCallStatus(sid, 'completed', duration, null);
            return res.json({ success: true, status: 'completed', duration });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// ---------------------------------------------------------
// TWILIO WEBHOOKS - Real-time status updates
// ---------------------------------------------------------
app.post('/webhooks/call-status', (req, res) => {
    const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body;
    
    console.log('\n' + '='.repeat(50));
    console.log('📡 TWILIO WEBHOOK RECEIVED');
    console.log('   SID:', CallSid);
    console.log('   Status:', CallStatus);
    console.log('   Duration:', CallDuration || 0);
    console.log('='.repeat(50));
    
    // Update our local cache
    const cachedCall = activeCalls.get(CallSid);
    let duration = parseInt(CallDuration) || 0;
    
    if (cachedCall) {
        cachedCall.status = CallStatus;
        
        if (CallStatus === 'in-progress' && !cachedCall.answeredTime) {
            cachedCall.answeredTime = Date.now();
        }
        
        if (CallDuration) {
            cachedCall.duration = duration;
        } else if (cachedCall.answeredTime) {
            duration = Math.floor((Date.now() - cachedCall.answeredTime) / 1000);
            cachedCall.duration = duration;
        }
        
        if (RecordingUrl) {
            cachedCall.recordingUrl = RecordingUrl;
        }
        
        // Clean up completed calls after 5 minutes
        if (['completed', 'busy', 'no-answer', 'canceled', 'failed'].includes(CallStatus)) {
            setTimeout(() => activeCalls.delete(CallSid), 5 * 60 * 1000);
        }
    }
    
    // 🚀 BROADCAST IMMEDIATELY to all connected WebSocket clients
    broadcastCallStatus(CallSid, CallStatus, duration, RecordingUrl || cachedCall?.recordingUrl);
    
    res.status(200).send('OK');
});

// ---------------------------------------------------------
// HEALTH CHECK
// ---------------------------------------------------------
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        twilio: twilioClient ? 'configured' : 'not configured',
        activeCalls: activeCalls.size,
        wsClients: wsClients.size,
        timestamp: new Date().toISOString()
    });
});

// ---------------------------------------------------------
// START SERVER
// ---------------------------------------------------------
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 QURAN ACADEMY SERVER (WebSocket Enabled)');
    console.log('='.repeat(50));
    console.log(`📡 Server: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`🌐 Public URL: ${config.publicUrl}`);
    console.log('='.repeat(50) + '\n');
});
