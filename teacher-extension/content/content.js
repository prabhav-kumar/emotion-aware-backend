// Main content script for Teacher Extension

console.log('Teacher Extension: Initializing...');

// Global state
window.teacherClassroom = {
  isActive: false,
  transcriber: null,
  overlay: null,
  sessionId: null
};

// Extract Google Meet code from URL
function getMeetCode() {
  // URL format: https://meet.google.com/abc-defg-hij
  const url = window.location.href;
  const match = url.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/);
  return match ? match[1] : null;
}

// Wait for Google Meet to load
function waitForMeet() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      // Check if we're on a Google Meet call page
      const isMeetCall = window.location.pathname.includes('/') && 
                        document.querySelector('[data-meeting-title]');
      
      if (isMeetCall) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 1000);
  });
}

// Initialize the extension
async function initialize() {
  try {
    await waitForMeet();
    console.log('Google Meet detected (Teacher)');
    
    // Initialize transcription service
    if (window.TranscriptionService) {
      window.teacherClassroom.transcriber = new window.TranscriptionService();
      console.log('Transcription service initialized');
    }
    
    // Check if already connected to a session
    chrome.storage.local.get(['isConnected', 'sessionId'], (result) => {
      if (result.isConnected && result.sessionId) {
        console.log('Auto-starting with existing session');
        showOverlay(result.sessionId);
      }
    });
    
  } catch (error) {
    console.error('Initialization failed:', error);
  }
}

// Show overlay
function showOverlay(sessionId) {
  if (!window.TeacherOverlay) {
    console.error('TeacherOverlay not available');
    return;
  }
  
  window.teacherClassroom.sessionId = sessionId;
  
  if (!window.teacherClassroom.overlay) {
    window.teacherClassroom.overlay = new window.TeacherOverlay();
  }
  
  window.teacherClassroom.overlay.create(sessionId);
  window.teacherClassroom.isActive = true;
}

// Hide overlay
function hideOverlay() {
  if (window.teacherClassroom.overlay) {
    window.teacherClassroom.overlay.remove();
    window.teacherClassroom.overlay = null;
  }
  window.teacherClassroom.isActive = false;
}

// Listen for messages from background script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_MEET_CODE') {
    const meetCode = getMeetCode();
    sendResponse({ meetCode: meetCode });
  }
  
  if (message.type === 'SESSION_ACTIVE') {
    showOverlay(message.sessionId);
    sendResponse({ success: true });
  }
  
  if (message.type === 'SESSION_ENDED') {
    hideOverlay();
    sendResponse({ success: true });
  }
  
  if (message.type === 'UPDATE_OVERLAY') {
    if (window.teacherClassroom.overlay && window.teacherClassroom.isActive) {
      window.teacherClassroom.overlay.update(message.data);
    }
    sendResponse({ success: true });
  }
  
  if (message.type === 'START_TRANSCRIPTION') {
    if (window.teacherClassroom.transcriber) {
      window.teacherClassroom.transcriber.start();
    }
    sendResponse({ success: true });
  }
  
  if (message.type === 'STOP_TRANSCRIPTION') {
    if (window.teacherClassroom.transcriber) {
      window.teacherClassroom.transcriber.stop();
    }
    sendResponse({ success: true });
  }
  
  return true;
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
