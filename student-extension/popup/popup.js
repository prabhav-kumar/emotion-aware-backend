// Student Extension Popup Script

// DOM Elements
const statusCard = document.getElementById('statusCard');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const connectionForm = document.getElementById('connectionForm');
const connectedView = document.getElementById('connectedView');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const messageDiv = document.getElementById('message');

const serverUrlInput = document.getElementById('serverUrl');
const meetCodeDisplay = document.getElementById('meetCode');
const studentNameInput = document.getElementById('studentName');

const displaySessionId = document.getElementById('displaySessionId');
const displayStudentId = document.getElementById('displayStudentId');
const displayStudentName = document.getElementById('displayStudentName');
const emotionIcon = document.getElementById('emotionIcon');
const emotionLabel = document.getElementById('emotionLabel');

let detectedMeetCode = null;

// Auto-detect Meet code
async function detectMeetCode() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url || !tab.url.includes('meet.google.com')) {
      meetCodeDisplay.textContent = 'Not on Google Meet';
      meetCodeDisplay.style.color = '#dc3545';
      connectBtn.disabled = true;
      return;
    }
    
    chrome.tabs.sendMessage(tab.id, { type: 'GET_MEET_CODE' }, (response) => {
      if (chrome.runtime.lastError) {
        meetCodeDisplay.textContent = 'Reload Meet page';
        meetCodeDisplay.style.color = '#dc3545';
        connectBtn.disabled = true;
        return;
      }
      
      if (response && response.meetCode) {
        detectedMeetCode = response.meetCode;
        meetCodeDisplay.textContent = response.meetCode;
        meetCodeDisplay.style.color = '#28a745';
        meetCodeDisplay.style.fontFamily = 'monospace';
        meetCodeDisplay.style.fontWeight = 'bold';
        connectBtn.disabled = false;
      } else {
        meetCodeDisplay.textContent = 'No Meet code found';
        meetCodeDisplay.style.color = '#dc3545';
        connectBtn.disabled = true;
      }
    });
  } catch (error) {
    console.error('Error detecting Meet code:', error);
    meetCodeDisplay.textContent = 'Detection failed';
    meetCodeDisplay.style.color = '#dc3545';
    connectBtn.disabled = true;
  }
}

// Load saved data
function loadSavedData() {
  chrome.storage.local.get([
    'serverUrl', 
    'sessionId', 
    'studentName',
    'studentId',
    'isConnected'
  ], (result) => {
    if (result.serverUrl) serverUrlInput.value = result.serverUrl;
    if (result.studentName) studentNameInput.value = result.studentName;
    
    if (result.isConnected) {
      showConnectedView(result.sessionId, result.studentId, result.studentName);
    } else {
      // Auto-detect Meet code on load
      detectMeetCode();
    }
  });
}

// Show message
function showMessage(text, type = 'info') {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
  
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}

// Connect to session
connectBtn.addEventListener('click', async () => {
  const serverUrl = serverUrlInput.value.trim();
  const studentName = studentNameInput.value.trim();
  
  if (!serverUrl || !detectedMeetCode || !studentName) {
    showMessage('Please enter your name and join a Google Meet', 'error');
    return;
  }
  
  const sessionId = detectedMeetCode;
  
  connectBtn.disabled = true;
  connectBtn.textContent = 'Connecting...';
  
  try {
    // Save connection details
    await chrome.storage.local.set({
      serverUrl: serverUrl,
      sessionId: sessionId,
      studentName: studentName
    });
    
    // Connect to backend
    chrome.runtime.sendMessage({
      type: 'CONNECT_TO_SESSION',
      serverUrl: serverUrl,
      sessionId: sessionId,
      studentName: studentName
    }, (response) => {
      if (response && response.success) {
        // Start monitoring
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'START_MONITORING'
            });
          }
        });
        
        showMessage('Connected successfully!', 'success');
        
        // Wait a bit for registration, then show connected view
        setTimeout(() => {
          checkConnectionStatus();
        }, 1000);
      }
    });
    
  } catch (error) {
    console.error('Connection error:', error);
    showMessage('Failed to connect', 'error');
  } finally {
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect to Session';
  }
});

// Disconnect from session
disconnectBtn.addEventListener('click', async () => {
  disconnectBtn.disabled = true;
  disconnectBtn.textContent = 'Disconnecting...';
  
  try {
    // Stop monitoring
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'STOP_MONITORING'
        });
      }
    });
    
    // Disconnect from backend
    chrome.runtime.sendMessage({
      type: 'DISCONNECT'
    }, (response) => {
      if (response && response.success) {
        showMessage('Disconnected', 'info');
        showConnectionForm();
      }
    });
    
  } catch (error) {
    console.error('Disconnection error:', error);
    showMessage('Failed to disconnect', 'error');
  } finally {
    disconnectBtn.disabled = false;
    disconnectBtn.textContent = 'Disconnect';
  }
});

// Show connected view
function showConnectedView(sessionId, studentId, studentName) {
  connectionForm.style.display = 'none';
  connectedView.style.display = 'block';
  
  displaySessionId.textContent = sessionId || '-';
  displayStudentId.textContent = studentId || '-';
  displayStudentName.textContent = studentName || '-';
  
  statusIndicator.classList.add('connected');
  statusText.textContent = 'Connected';
  
  // Start emotion display updates
  startEmotionUpdates();
}

// Show connection form
function showConnectionForm() {
  connectionForm.style.display = 'block';
  connectedView.style.display = 'none';
  
  statusIndicator.classList.remove('connected');
  statusText.textContent = 'Not Connected';
  
  // Stop emotion updates
  if (window.emotionUpdateInterval) {
    clearInterval(window.emotionUpdateInterval);
  }
}

// Check connection status
function checkConnectionStatus() {
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (response && response.isConnected) {
      chrome.storage.local.get(['studentName'], (result) => {
        showConnectedView(
          response.sessionId,
          response.studentId,
          result.studentName
        );
      });
    }
  });
}

// Start emotion display updates
function startEmotionUpdates() {
  if (window.emotionUpdateInterval) {
    clearInterval(window.emotionUpdateInterval);
  }
  
  window.emotionUpdateInterval = setInterval(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (response && response.currentEmotions) {
        updateEmotionDisplay(response.currentEmotions);
      }
    });
  }, 1000);
}

// Update emotion display
function updateEmotionDisplay(emotionData) {
  if (!emotionData.emotions) return;
  
  // Find dominant emotion
  const emotions = emotionData.emotions;
  let maxEmotion = 'neutral';
  let maxValue = emotions.neutral || 0;
  
  for (const [emotion, value] of Object.entries(emotions)) {
    if (value > maxValue) {
      maxValue = value;
      maxEmotion = emotion;
    }
  }
  
  // Update icon and label
  const emotionIcons = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    fearful: '😨',
    surprised: '😮',
    disgusted: '🤢',
    neutral: '😐'
  };
  
  const emotionLabels = {
    happy: 'Happy',
    sad: 'Sad',
    angry: 'Angry',
    fearful: 'Fearful',
    surprised: 'Surprised',
    disgusted: 'Disgusted',
    neutral: 'Neutral'
  };
  
  emotionIcon.textContent = emotionIcons[maxEmotion] || '😊';
  emotionLabel.textContent = `${emotionLabels[maxEmotion]} (${maxValue}%)`;
}

// Initialize
loadSavedData();
checkConnectionStatus();

// Update status periodically
setInterval(() => {
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (response) {
      if (response.isConnected) {
        statusIndicator.classList.add('connected');
        statusText.textContent = 'Connected';
      } else {
        statusIndicator.classList.remove('connected');
        statusText.textContent = 'Not Connected';
        
        // If we were showing connected view but lost connection, switch back
        if (connectedView.style.display !== 'none') {
          showConnectionForm();
        }
      }
    }
  });
}, 2000);
