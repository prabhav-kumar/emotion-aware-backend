// Backend server for Emotion-Aware Classroom
// Aggregates emotion data from students and sends to teachers

const WebSocket = require('ws');
const http = require('http');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini AI (if API key provided)
let genAI = null;
let geminiModel = null;

if (GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    console.log('✅ Gemini AI initialized');
  } catch (error) {
    console.warn('⚠️ Gemini AI not available:', error.message);
  }
} else {
  console.warn('⚠️ GEMINI_API_KEY not set - AI insights disabled');
}

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Emotion-Aware Classroom Backend Server\n');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Data structures
const sessions = new Map(); // sessionId -> { teacher, students: Map, emotionData: [] }
const clients = new Map();  // ws -> { type: 'teacher'|'student', id, sessionId }

// Utility: Generate unique student ID
function generateStudentId() {
  return `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Utility: Calculate aggregated emotions for a session
function aggregateEmotions(session) {
  if (!session || !session.students || session.students.size === 0) {
    return {
      emotions: {
        happy: 0,
        sad: 0,
        angry: 0,
        fearful: 0,
        surprised: 0,
        disgusted: 0,
        neutral: 0
      },
      confused: 0,
      engaged: 0,
      totalStudents: 0,
      activeStudents: 0
    };
  }
  
  const emotionSums = {
    happy: 0,
    sad: 0,
    angry: 0,
    fearful: 0,
    surprised: 0,
    disgusted: 0,
    neutral: 0
  };
  
  let confusedSum = 0;
  let engagedSum = 0;
  let activeCount = 0;
  const totalStudents = session.students.size;
  
  // Sum up emotions from all students
  for (const [studentId, studentData] of session.students.entries()) {
    const { emotions } = studentData;
    
    // Only aggregate if student has camera on and face detected
    if (emotions && emotions.cameraOn && emotions.faceDetected) {
      activeCount++;
      
      Object.keys(emotionSums).forEach(key => {
        emotionSums[key] += emotions.emotions[key] || 0;
      });
      
      confusedSum += emotions.confused || 0;
      engagedSum += emotions.engaged || 0;
    }
  }
  
  // Calculate averages
  const count = activeCount > 0 ? activeCount : 1; // Avoid division by zero
  
  const aggregated = {
    emotions: {},
    confused: Math.round(confusedSum / count),
    engaged: Math.round(engagedSum / count),
    totalStudents: totalStudents,
    activeStudents: activeCount
  };
  
  Object.keys(emotionSums).forEach(key => {
    aggregated.emotions[key] = Math.round(emotionSums[key] / count);
  });
  
  return aggregated;
}

// Utility: Broadcast to teacher in a session
function broadcastToTeacher(sessionId, message) {
  const session = sessions.get(sessionId);
  if (session && session.teacher) {
    if (session.teacher.readyState === WebSocket.OPEN) {
      session.teacher.send(JSON.stringify(message));
    }
  }
}

// Utility: Send aggregated emotions to teacher
function sendAggregatedEmotions(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  const aggregated = aggregateEmotions(session);
  
  broadcastToTeacher(sessionId, {
    type: 'AGGREGATED_EMOTIONS',
    data: aggregated,
    timestamp: Date.now()
  });
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New client connected');
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(ws, message);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  ws.on('close', () => {
    handleDisconnect(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle incoming messages
function handleMessage(ws, message) {
  const { type } = message;
  
  switch (type) {
    case 'REGISTER_TEACHER':
      handleRegisterTeacher(ws, message);
      break;
      
    case 'REGISTER_STUDENT':
      handleRegisterStudent(ws, message);
      break;
      
    case 'EMOTION_UPDATE':
      handleEmotionUpdate(ws, message);
      break;
      
    case 'PONG':
      // Heartbeat response
      break;
      
    case 'GET_AI_INSIGHTS':
      handleGetAIInsights(ws, message);
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
}

// Handle teacher registration
function handleRegisterTeacher(ws, message) {
  const { sessionId } = message;
  
  if (!sessionId) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Session ID required' }));
    return;
  }
  
  // Create or get session
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      teacher: ws,
      students: new Map(),
      createdAt: Date.now()
    });
    console.log(`Created new session: ${sessionId}`);
  } else {
    const session = sessions.get(sessionId);
    session.teacher = ws;
    console.log(`Teacher joined existing session: ${sessionId}`);
  }
  
  // Store client info
  clients.set(ws, {
    type: 'teacher',
    sessionId: sessionId
  });
  
  // Send registration confirmation
  ws.send(JSON.stringify({
    type: 'REGISTERED',
    sessionId: sessionId,
    timestamp: Date.now()
  }));
  
  // Send current students list
  const session = sessions.get(sessionId);
  const studentsList = Array.from(session.students.entries()).map(([id, data]) => ({
    id: id,
    name: data.name,
    joinedAt: data.joinedAt
  }));
  
  ws.send(JSON.stringify({
    type: 'STUDENTS_LIST',
    students: studentsList,
    timestamp: Date.now()
  }));
  
  // Send initial aggregated emotions
  sendAggregatedEmotions(sessionId);
}

// Handle student registration
function handleRegisterStudent(ws, message) {
  const { sessionId, studentName } = message;
  
  if (!sessionId || !studentName) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Session ID and name required' }));
    return;
  }
  
  // Create or get session
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      teacher: null,
      students: new Map(),
      createdAt: Date.now()
    });
    console.log(`Created new session (via student): ${sessionId}`);
  }
  
  const session = sessions.get(sessionId);
  const studentId = generateStudentId();
  
  // Add student to session
  session.students.set(studentId, {
    ws: ws,
    name: studentName,
    joinedAt: Date.now(),
    emotions: null
  });
  
  // Store client info
  clients.set(ws, {
    type: 'student',
    id: studentId,
    sessionId: sessionId
  });
  
  console.log(`Student ${studentName} (${studentId}) joined session ${sessionId}`);
  
  // Send registration confirmation
  ws.send(JSON.stringify({
    type: 'REGISTERED',
    studentId: studentId,
    sessionId: sessionId,
    timestamp: Date.now()
  }));
  
  // Notify teacher
  broadcastToTeacher(sessionId, {
    type: 'STUDENT_JOINED',
    studentId: studentId,
    studentName: studentName,
    timestamp: Date.now()
  });
  
  // Update aggregated emotions
  sendAggregatedEmotions(sessionId);
}

// Handle emotion update from student
function handleEmotionUpdate(ws, message) {
  const { studentId, sessionId, emotions } = message;
  
  if (!studentId || !sessionId || !emotions) {
    console.error('Invalid emotion update:', message);
    return;
  }
  
  const session = sessions.get(sessionId);
  if (!session) {
    console.error(`Session not found: ${sessionId}`);
    return;
  }
  
  const studentData = session.students.get(studentId);
  if (!studentData) {
    console.error(`Student not found: ${studentId}`);
    return;
  }
  
  // Update student's emotion data
  studentData.emotions = emotions;
  studentData.lastUpdate = Date.now();
  
  // Calculate and send aggregated emotions to teacher
  sendAggregatedEmotions(sessionId);
}

// Handle AI insights request
async function handleGetAIInsights(ws, message) {
  const { sessionId, emotionData, transcript } = message;
  
  // Check if Gemini is available
  if (!geminiModel) {
    ws.send(JSON.stringify({
      type: 'AI_INSIGHTS_RESPONSE',
      error: 'AI service not configured. Please set GEMINI_API_KEY environment variable.',
      timestamp: Date.now()
    }));
    return;
  }
  
  // Verify client is a teacher
  const clientInfo = clients.get(ws);
  if (!clientInfo || clientInfo.type !== 'teacher') {
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Only teachers can request AI insights'
    }));
    return;
  }
  
  try {
    console.log(`Generating AI insights for session: ${sessionId}`);
    
    // Build prompt with emotion data and transcript
    const prompt = buildGeminiPrompt(emotionData, transcript);
    
    // Call Gemini API
    const result = await geminiModel.generateContent(prompt);
    const insights = result.response.text();
    
    // Send insights back to teacher
    ws.send(JSON.stringify({
      type: 'AI_INSIGHTS_RESPONSE',
      insights: insights,
      timestamp: Date.now()
    }));
    
    console.log(`✅ AI insights generated for session: ${sessionId}`);
    
  } catch (error) {
    console.error('Error generating AI insights:', error);
    ws.send(JSON.stringify({
      type: 'AI_INSIGHTS_RESPONSE',
      error: 'Failed to generate insights: ' + error.message,
      timestamp: Date.now()
    }));
  }
}

// Build prompt for Gemini
function buildGeminiPrompt(emotionData, transcript) {
  const { emotions, confused, engaged, totalStudents, activeStudents } = emotionData;
  
  let prompt = `You are an AI teaching assistant analyzing classroom engagement data in real-time.

**Current Classroom Metrics:**
- Total Students: ${totalStudents}
- Active (cameras on): ${activeStudents}
- Engaged: ${engaged}%
- Confused: ${confused}%

**Emotion Distribution:**`;

  for (const [emotion, percentage] of Object.entries(emotions)) {
    if (percentage > 0) {
      prompt += `\n- ${emotion.charAt(0).toUpperCase() + emotion.slice(1)}: ${percentage}%`;
    }
  }
  
  if (transcript && transcript.trim().length > 0) {
    prompt += `\n\n**Recent Teacher Speech:**\n"${transcript}"`;
  }
  
  prompt += `\n\n**Task:**
Provide brief, actionable teaching insights (2-3 sentences max):
1. Interpret the emotional state of the class
2. Suggest one specific teaching adjustment if needed
3. Keep it concise and practical

Format your response as clear, direct advice for the teacher.`;

  return prompt;
}

// Handle client disconnect
function handleDisconnect(ws) {
  const clientInfo = clients.get(ws);
  
  if (!clientInfo) {
    console.log('Unknown client disconnected');
    return;
  }
  
  const { type, sessionId, id } = clientInfo;
  
  if (type === 'teacher') {
    console.log(`Teacher disconnected from session: ${sessionId}`);
    const session = sessions.get(sessionId);
    if (session) {
      session.teacher = null;
    }
  } else if (type === 'student') {
    console.log(`Student ${id} disconnected from session: ${sessionId}`);
    const session = sessions.get(sessionId);
    if (session) {
      session.students.delete(id);
      
      // Notify teacher
      broadcastToTeacher(sessionId, {
        type: 'STUDENT_LEFT',
        studentId: id,
        timestamp: Date.now()
      });
      
      // Update aggregated emotions
      sendAggregatedEmotions(sessionId);
      
      // Clean up empty sessions
      if (session.students.size === 0 && !session.teacher) {
        sessions.delete(sessionId);
        console.log(`Deleted empty session: ${sessionId}`);
      }
    }
  }
  
  clients.delete(ws);
}

// Heartbeat to keep connections alive
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'PING' }));
    }
  });
}, 30000); // Every 30 seconds

// Start server
server.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════╗`);
  console.log(`║  Emotion-Aware Classroom Backend Server   ║`);
  console.log(`╚════════════════════════════════════════════╝`);
  console.log(`\n✓ WebSocket server running on port ${PORT}`);
  console.log(`✓ Ready to accept connections\n`);
  console.log(`Use ws://localhost:${PORT} to connect\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
