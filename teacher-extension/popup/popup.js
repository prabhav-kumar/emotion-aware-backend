// Teacher Extension Popup Script

let transcriptionActive = false;
let sessionActive = false;
let detectedMeetCode = null;

// Auto-detect Meet code
async function detectMeetCode() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url || !tab.url.includes('meet.google.com')) {
      document.getElementById('meetCode').textContent = 'Not on Google Meet';
      document.getElementById('meetCode').style.color = '#dc3545';
      document.getElementById('startSessionBtn').disabled = true;
      return;
    }
    
    chrome.tabs.sendMessage(tab.id, { type: 'GET_MEET_CODE' }, (response) => {
      if (chrome.runtime.lastError) {
        document.getElementById('meetCode').textContent = 'Reload Meet page';
        document.getElementById('meetCode').style.color = '#dc3545';
        document.getElementById('startSessionBtn').disabled = true;
        return;
      }
      
      if (response && response.meetCode) {
        detectedMeetCode = response.meetCode;
        document.getElementById('meetCode').textContent = response.meetCode;
        document.getElementById('meetCode').style.color = '#28a745';
        document.getElementById('meetCode').style.fontFamily = 'monospace';
        document.getElementById('meetCode').style.fontWeight = 'bold';
        document.getElementById('startSessionBtn').disabled = false;
      } else {
        document.getElementById('meetCode').textContent = 'No Meet code found';
        document.getElementById('meetCode').style.color = '#dc3545';
        document.getElementById('startSessionBtn').disabled = true;
      }
    });
  } catch (error) {
    console.error('Error detecting Meet code:', error);
    document.getElementById('meetCode').textContent = 'Detection failed';
    document.getElementById('meetCode').style.color = '#dc3545';
    document.getElementById('startSessionBtn').disabled = true;
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved data
  const { isConnected, sessionId } = await chrome.storage.local.get([
    'isConnected',
    'sessionId'
  ]);
  
  if (isConnected && sessionId) {
    showConnectedView();
  } else {
    // Auto-detect Meet code on load
    detectMeetCode();
  }
  
  // Set up event listeners
  setupEventListeners();
  
  // Start updating stats
  updateStatsLoop();
});

function setupEventListeners() {
  // Start session (using auto-detected Meet code)
  document.getElementById('startSessionBtn').addEventListener('click', async () => {
    const serverUrl = document.getElementById('serverUrl').value.trim();
    
    if (!serverUrl || !detectedMeetCode) {
      showStatus('Please enter server URL and join a Google Meet', true);
      return;
    }
    
    const sessionId = detectedMeetCode;
    const btn = document.getElementById('startSessionBtn');
    btn.disabled = true;
    btn.textContent = 'Starting...';
    
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'CREATE_SESSION',
          serverUrl: serverUrl,
          sessionId: sessionId  // Use Meet code as session ID
        }, resolve);
      });
      
      if (response && response.success) {
        await chrome.storage.local.set({ 
          serverUrl: serverUrl,
          sessionId: sessionId
        });
        showStatus(`Session started: ${sessionId}`, false);
        showConnectedView();
      } else {
        showStatus('Failed to start session', true);
      }
    } catch (error) {
      console.error('Error starting session:', error);
      showStatus('Failed to start session', true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Start Session';
    }
  });
  
  // End session
  document.getElementById('endSessionBtn').addEventListener('click', async () => {
    const confirmed = confirm('Are you sure you want to end this session?');
    
    if (!confirmed) return;
    
    const btn = document.getElementById('endSessionBtn');
    btn.disabled = true;
    btn.textContent = 'Ending...';
    
    try {
      // Stop transcription if active
      if (transcriptionActive) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, { type: 'STOP_TRANSCRIPTION' });
        transcriptionActive = false;
      }
      
      // Disconnect from backend
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'DISCONNECT' }, resolve);
      });
      
      // Notify content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { type: 'SESSION_ENDED' });
      
      showStatus('Session ended', false);
      showNotConnectedView();
    } catch (error) {
      console.error('Error ending session:', error);
      showStatus('Failed to end session', true);
    } finally {
      btn.disabled = false;
      btn.textContent = 'End Session';
    }
  });
  
  // Start transcription
  document.getElementById('startTranscriptionBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('meet.google.com')) {
      showStatus('Please open a Google Meet session first', true);
      return;
    }
    
    // Clear previous transcript data
    chrome.runtime.sendMessage({ type: 'CLEAR_TRANSCRIPT_DATA' }, () => {
      const transcriptEl = document.getElementById('transcriptContainer');
      transcriptEl.innerHTML = '<p class="placeholder">Start transcription to see your speech...</p>';
      
      const insightsEl = document.getElementById('insightsContainer');
      insightsEl.innerHTML = '<p class="placeholder">Click "Generate Insights" to get AI-powered feedback</p>';
      
      // Start transcription
      chrome.tabs.sendMessage(tab.id, { type: 'START_TRANSCRIPTION' }, (response) => {
        if (chrome.runtime.lastError) {
          showStatus('Failed to start transcription. Reload the Meet page.', true);
          return;
        }
        
        transcriptionActive = true;
        document.getElementById('startTranscriptionBtn').disabled = true;
        document.getElementById('stopTranscriptionBtn').disabled = false;
        showStatus('Transcription started', false);
      });
    });
  });
  
  // Stop transcription
  document.getElementById('stopTranscriptionBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { type: 'STOP_TRANSCRIPTION' }, (response) => {
      transcriptionActive = false;
      document.getElementById('startTranscriptionBtn').disabled = false;
      document.getElementById('stopTranscriptionBtn').disabled = true;
      showStatus('Transcription stopped', false);
    });
  });
  
  // Get Gemini insights
  document.getElementById('getInsightsBtn').addEventListener('click', getGeminiInsights);
}

// Show connected view
async function showConnectedView() {
  sessionActive = true;
  document.getElementById('notConnectedView').style.display = 'none';
  document.getElementById('connectedView').style.display = 'block';
  
  // Load session info
  const data = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_CLASSROOM_DATA' }, resolve);
  });
  
  if (data && data.activeSession) {
    document.getElementById('displaySessionId').textContent = data.activeSession;
  }
}

// Show not connected view
function showNotConnectedView() {
  sessionActive = false;
  document.getElementById('notConnectedView').style.display = 'block';
  document.getElementById('connectedView').style.display = 'none';
}

// Update stats continuously
async function updateStatsLoop() {
  while (true) {
    await updateStats();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Fetch and update stats
async function updateStats() {
  try {
    const data = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_CLASSROOM_DATA' }, resolve);
    });
    
    if (data && data.aggregatedEmotions) {
      const stats = data.aggregatedEmotions;
      
      // Update stat cards
      document.getElementById('statEngaged').textContent = 
        stats.engaged !== undefined ? `${stats.engaged}%` : '-';
      document.getElementById('statConfused').textContent = 
        stats.confused !== undefined ? `${stats.confused}%` : '-';
      document.getElementById('statStudents').textContent = 
        stats.activeStudents !== undefined ? stats.activeStudents : '-';
      
      // Update students count in session info
      if (sessionActive) {
        document.getElementById('studentsCount').textContent = 
          stats.totalStudents || 0;
      }
      
      // Update emotion bars
      if (stats.emotions) {
        updateEmotionBar('Happy', stats.emotions.happy || 0);
        updateEmotionBar('Neutral', stats.emotions.neutral || 0);
        updateEmotionBar('Sad', stats.emotions.sad || 0);
      }
    }
    
    // Update transcript
    if (data && data.transcript) {
      const transcriptEl = document.getElementById('transcriptContainer');
      transcriptEl.innerHTML = `<div class="transcript-text">${data.transcript}</div>`;
    }
    
    // Update insights if available
    if (data && data.geminiInsights) {
      const insightsEl = document.getElementById('insightsContainer');
      insightsEl.innerHTML = `<div class="insight-text">${data.geminiInsights}</div>`;
    }
    
  } catch (error) {
    console.error('Failed to update stats:', error);
  }
}

// Update emotion bar
function updateEmotionBar(emotion, value) {
  const fillElement = document.getElementById(`bar${emotion}`);
  const percentElement = document.getElementById(`percent${emotion}`);
  
  if (fillElement) {
    fillElement.style.width = `${value}%`;
  }
  
  if (percentElement) {
    percentElement.textContent = `${value}%`;
  }
}

// Get insights from Backend (which calls Gemini)
async function getGeminiInsights() {
  const insightsContainer = document.getElementById('insightsContainer');
  const btn = document.getElementById('getInsightsBtn');
  
  try {
    // Get classroom data
    const data = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_CLASSROOM_DATA' }, resolve);
    });
    
    if (!data || !data.aggregatedEmotions) {
      showStatus('No emotion data available yet', true);
      return;
    }
    
    // Show loading
    btn.disabled = true;
    insightsContainer.innerHTML = '<p class="placeholder">Generating insights...</p>';
    insightsContainer.classList.add('loading');
    
    // Request insights from backend
    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'REQUEST_AI_INSIGHTS',
        emotionData: data.aggregatedEmotions,
        transcript: data.transcript || ''
      }, resolve);
    });
    
    if (result && result.success) {
      // Display insights
      insightsContainer.classList.remove('loading');
      insightsContainer.innerHTML = `<div class="insight-text">${result.insights}</div>`;
      showStatus('Insights generated successfully', false);
    } else {
      throw new Error(result?.error || 'Failed to get insights from backend');
    }
    
  } catch (error) {
    console.error('Failed to get insights:', error);
    insightsContainer.classList.remove('loading');
    insightsContainer.innerHTML = `<p class="placeholder" style="color: #dc3545;">Error: ${error.message}</p>`;
    showStatus('Failed to generate insights', true);
  } finally {
    btn.disabled = false;
  }
}

// Note: Gemini API is now called by the backend server
// No direct API calls from the extension

// Show status message
function showStatus(message, isError = false) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = 'status show' + (isError ? ' error' : '');
  
  setTimeout(() => {
    statusEl.classList.remove('show');
  }, 3000);
}
