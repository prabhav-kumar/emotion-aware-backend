// Background service worker for Teacher Extension

// Connection state
let wsConnection = null;
let sessionId = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Store aggregated data from backend
let classroomData = {
  aggregatedEmotions: {},
  studentsList: [],
  transcript: '',
  transcriptChunks: [],
  geminiInsights: '',
  lastUpdate: Date.now(),
  lastTranscriptUpdate: Date.now(),
  isConnected: false,
  activeSession: null
};

// WebSocket connection to backend server
function connectToBackend(serverUrl, session) {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    console.log('Already connected to backend');
    return;
  }

  try {
    wsConnection = new WebSocket(serverUrl);
    
    wsConnection.onopen = () => {
      console.log('Teacher connected to backend server');
      classroomData.isConnected = true;
      reconnectAttempts = 0;
      
      // Register as teacher
      wsConnection.send(JSON.stringify({
        type: 'REGISTER_TEACHER',
        sessionId: session,
        timestamp: Date.now()
      }));
    };
    
    wsConnection.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'REGISTERED') {
          sessionId = message.sessionId;
          classroomData.activeSession = sessionId;
          console.log(`Teacher registered for session: ${sessionId}`);
          
          // Store connection info
          chrome.storage.local.set({
            sessionId: sessionId,
            isConnected: true
          });
          
          // Notify content script to show overlay
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'SESSION_ACTIVE',
                sessionId: sessionId
              });
            }
          });
        }
        
        if (message.type === 'AGGREGATED_EMOTIONS') {
          classroomData.aggregatedEmotions = message.data;
          classroomData.lastUpdate = Date.now();
          
          // Forward to content script for overlay update
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                type: 'UPDATE_OVERLAY',
                data: message.data
              });
            }
          });
        }
        
        if (message.type === 'STUDENTS_LIST') {
          classroomData.studentsList = message.students;
        }
        
        if (message.type === 'STUDENT_JOINED') {
          console.log(`Student joined: ${message.studentName} (${message.studentId})`);
          
          // Update students list
          if (!classroomData.studentsList.find(s => s.id === message.studentId)) {
            classroomData.studentsList.push({
              id: message.studentId,
              name: message.studentName,
              joinedAt: message.timestamp
            });
          }
        }
        
        if (message.type === 'STUDENT_LEFT') {
          console.log(`Student left: ${message.studentId}`);
          
          // Update students list
          classroomData.studentsList = classroomData.studentsList.filter(
            s => s.id !== message.studentId
          );
        }
        
        if (message.type === 'PING') {
          wsConnection.send(JSON.stringify({ type: 'PONG' }));
        }
        
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
    
    wsConnection.onerror = (error) => {
      console.error('WebSocket error:', error);
      classroomData.isConnected = false;
    };
    
    wsConnection.onclose = () => {
      console.log('Disconnected from backend server');
      classroomData.isConnected = false;
      wsConnection = null;
      
      // Attempt to reconnect
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(() => {
          console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
          connectToBackend(serverUrl, sessionId);
        }, 3000 * reconnectAttempts);
      }
    };
    
  } catch (error) {
    console.error('Failed to connect to backend:', error);
    classroomData.isConnected = false;
  }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CREATE_SESSION') {
    const { serverUrl, sessionId } = message;
    // Use provided session ID (Meet code) or generate one
    const newSessionId = sessionId || generateSessionId();
    connectToBackend(serverUrl, newSessionId);
    sendResponse({ success: true, sessionId: newSessionId });
  }
  
  if (message.type === 'CONNECT_TO_SESSION') {
    const { serverUrl, sessionId: session } = message;
    connectToBackend(serverUrl, session);
    sendResponse({ success: true });
  }
  
  if (message.type === 'DISCONNECT') {
    if (wsConnection) {
      wsConnection.close();
      wsConnection = null;
    }
    classroomData.isConnected = false;
    sessionId = null;
    classroomData.activeSession = null;
    
    chrome.storage.local.remove(['sessionId', 'isConnected']);
    sendResponse({ success: true });
  }
  
  if (message.type === 'GET_CLASSROOM_DATA') {
    sendResponse(classroomData);
  }
  
  if (message.type === 'REQUEST_AI_INSIGHTS') {
    // Forward AI insights request to backend
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      wsConnection.send(JSON.stringify({
        type: 'GET_AI_INSIGHTS',
        sessionId: sessionId,
        emotionData: message.emotionData,
        transcript: message.transcript,
        timestamp: Date.now()
      }));
      
      // Set up one-time listener for response
      const responseHandler = (event) => {
        try {
          const response = JSON.parse(event.data);
          if (response.type === 'AI_INSIGHTS_RESPONSE') {
            wsConnection.removeEventListener('message', responseHandler);
            if (response.error) {
              sendResponse({ success: false, error: response.error });
            } else {
              sendResponse({ success: true, insights: response.insights });
            }
          }
        } catch (error) {
          console.error('Error parsing AI insights response:', error);
        }
      };
      
      wsConnection.addEventListener('message', responseHandler);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        wsConnection.removeEventListener('message', responseHandler);
      }, 30000);
    } else {
      sendResponse({ success: false, error: 'Not connected to backend server' });
    }
    return true; // Keep sendResponse channel open
  }
  
  if (message.type === 'UPDATE_TRANSCRIPT') {
    const now = Date.now();
    const newText = message.transcript.slice(classroomData.transcript.length);
    
    classroomData.transcript = message.transcript;
    
    if (newText.trim().length > 0) {
      classroomData.transcriptChunks.push({
        timestamp: now,
        text: newText.trim()
      });
      
      if (classroomData.transcriptChunks.length > 100) {
        classroomData.transcriptChunks.shift();
      }
    }
    
    classroomData.lastTranscriptUpdate = now;
    sendResponse({ success: true });
  }
  
  if (message.type === 'UPDATE_GEMINI_INSIGHTS') {
    classroomData.geminiInsights = message.insights;
    sendResponse({ success: true });
  }
  
  if (message.type === 'CLEAR_TRANSCRIPT_DATA') {
    classroomData.transcript = '';
    classroomData.transcriptChunks = [];
    classroomData.geminiInsights = '';
    sendResponse({ success: true });
  }
  
  return true;
});

// Generate unique session ID
function generateSessionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Installation handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('Teacher Extension installed');
  
  // Load saved connection info
  chrome.storage.local.get(['serverUrl', 'sessionId'], (result) => {
    if (result.serverUrl && result.sessionId) {
      connectToBackend(result.serverUrl, result.sessionId);
    }
  });
});
