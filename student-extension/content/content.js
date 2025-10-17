// Main content script for Student Extension

console.log('Student Extension: Initializing...');

// Global state
window.studentClassroom = {
  isActive: false,
  detector: null,
  updateInterval: null
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
      const videoElements = document.querySelectorAll('video');
      if (videoElements.length > 0) {
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
    console.log('Google Meet detected');
    
    // Initialize emotion detector
    if (window.StudentEmotionDetector) {
      window.studentClassroom.detector = new window.StudentEmotionDetector();
      await window.studentClassroom.detector.initialize();
      console.log('Student emotion detector initialized');
    }
    
    // Check if already connected to a session
    chrome.storage.local.get(['isConnected', 'sessionId'], (result) => {
      if (result.isConnected && result.sessionId) {
        console.log('Auto-starting monitoring (already connected to session)');
        startMonitoring();
      }
    });
    
  } catch (error) {
    console.error('Initialization failed:', error);
  }
}

// Start continuous monitoring
function startMonitoring() {
  window.studentClassroom.isActive = true;
  
  // Update emotions every 3 seconds
  window.studentClassroom.updateInterval = setInterval(async () => {
    if (!window.studentClassroom.isActive) return;
    
    try {
      if (window.studentClassroom.detector) {
        const emotionData = await window.studentClassroom.detector.analyzeOwnVideo();
        
        // Send to background script (which forwards to backend)
        chrome.runtime.sendMessage({
          type: 'UPDATE_EMOTIONS',
          data: emotionData
        });
      }
      
    } catch (error) {
      console.error('Monitoring error:', error);
    }
  }, 3000);
  
  console.log('Student monitoring started');
}

// Stop monitoring
function stopMonitoring() {
  window.studentClassroom.isActive = false;
  if (window.studentClassroom.updateInterval) {
    clearInterval(window.studentClassroom.updateInterval);
    window.studentClassroom.updateInterval = null;
  }
  console.log('Student monitoring stopped');
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_MEET_CODE') {
    const meetCode = getMeetCode();
    sendResponse({ meetCode: meetCode });
  }
  
  if (message.type === 'START_MONITORING') {
    if (!window.studentClassroom.isActive) {
      startMonitoring();
    }
    sendResponse({ success: true });
  }
  
  if (message.type === 'STOP_MONITORING') {
    stopMonitoring();
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
