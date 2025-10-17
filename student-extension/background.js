// Background service worker for Student Extension

// Connection state
let wsConnection = null;
let sessionId = null;
let studentId = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Store emotion data
let emotionData = {
  currentEmotions: {},
  lastUpdate: Date.now(),
  isConnected: false
};

// WebSocket connection to backend server
function connectToBackend(serverUrl, session, name) {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    console.log('Already connected to backend');
    return;
  }

  try {
    wsConnection = new WebSocket(serverUrl);
    
    wsConnection.onopen = () => {
      console.log('Connected to backend server');
      emotionData.isConnected = true;
      reconnectAttempts = 0;
      
      // Register as student
      wsConnection.send(JSON.stringify({
        type: 'REGISTER_STUDENT',
        sessionId: session,
        studentName: name,
        timestamp: Date.now()
      }));
    };
    
    wsConnection.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'REGISTERED') {
          studentId = message.studentId;
          sessionId = message.sessionId;
          console.log(`Registered as student: ${studentId}`);
          
          // Store connection info
          chrome.storage.local.set({
            studentId: studentId,
            sessionId: sessionId,
            isConnected: true
          });
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
      emotionData.isConnected = false;
    };
    
    wsConnection.onclose = () => {
      console.log('Disconnected from backend server');
      emotionData.isConnected = false;
      wsConnection = null;
      
      // Attempt to reconnect
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(() => {
          console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
          connectToBackend(serverUrl, sessionId, name);
        }, 3000 * reconnectAttempts);
      }
    };
    
  } catch (error) {
    console.error('Failed to connect to backend:', error);
    emotionData.isConnected = false;
  }
}

// Send emotion data to backend
function sendEmotionData(emotions) {
  if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
    console.warn('Not connected to backend server');
    return;
  }
  
  if (!studentId || !sessionId) {
    console.warn('Not registered with backend server');
    return;
  }
  
  wsConnection.send(JSON.stringify({
    type: 'EMOTION_UPDATE',
    studentId: studentId,
    sessionId: sessionId,
    emotions: emotions,
    timestamp: Date.now()
  }));
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_EMOTIONS') {
    emotionData.currentEmotions = message.data;
    emotionData.lastUpdate = Date.now();
    
    // Send to backend
    sendEmotionData(message.data);
    
    sendResponse({ success: true });
  }
  
  if (message.type === 'CONNECT_TO_SESSION') {
    const { serverUrl, sessionId: session, studentName } = message;
    connectToBackend(serverUrl, session, studentName);
    sendResponse({ success: true });
  }
  
  if (message.type === 'DISCONNECT') {
    if (wsConnection) {
      wsConnection.close();
      wsConnection = null;
    }
    emotionData.isConnected = false;
    studentId = null;
    sessionId = null;
    
    chrome.storage.local.remove(['studentId', 'sessionId', 'isConnected']);
    sendResponse({ success: true });
  }
  
  if (message.type === 'GET_STATUS') {
    sendResponse({
      isConnected: emotionData.isConnected,
      studentId: studentId,
      sessionId: sessionId,
      currentEmotions: emotionData.currentEmotions,
      lastUpdate: emotionData.lastUpdate
    });
  }
  
  return true;
});

// Installation handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('Student Extension installed');
  
  // Load saved connection info
  chrome.storage.local.get(['serverUrl', 'sessionId', 'studentName'], (result) => {
    if (result.serverUrl && result.sessionId && result.studentName) {
      connectToBackend(result.serverUrl, result.sessionId, result.studentName);
    }
  });
});
