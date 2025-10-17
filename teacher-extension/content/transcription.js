// Speech transcription using Web Speech API

class TranscriptionService {
  constructor() {
    this.recognition = null;
    this.isRunning = false;
    this.transcript = '';
    this.interimTranscript = '';
    this.maxTranscriptLength = 5000; // Keep last 5000 chars
  }

  // Initialize speech recognition
  initialize() {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    // Handle results
    this.recognition.onresult = (event) => {
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          this.transcript += transcript + ' ';
          
          // Trim if too long
          if (this.transcript.length > this.maxTranscriptLength) {
            this.transcript = this.transcript.slice(-this.maxTranscriptLength);
          }
          
          // Send to background
          this.sendTranscript();
        } else {
          interim += transcript;
        }
      }
      
      this.interimTranscript = interim;
    };

    // Handle errors
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        // Restart on recoverable errors
        if (this.isRunning) {
          setTimeout(() => this.start(), 1000);
        }
      }
    };

    // Handle end
    this.recognition.onend = () => {
      // Auto-restart if still running
      if (this.isRunning) {
        try {
          this.recognition.start();
        } catch (e) {
          console.log('Recognition restart failed:', e);
        }
      }
    };

    return true;
  }

  // Start transcription
  start() {
    if (!this.recognition) {
      if (!this.initialize()) {
        console.error('Cannot start transcription - not supported');
        return;
      }
    }

    if (this.isRunning) {
      console.log('Transcription already running');
      return;
    }

    // Clear previous transcript data when starting
    this.transcript = '';
    this.interimTranscript = '';

    try {
      this.recognition.start();
      this.isRunning = true;
      console.log('Transcription started');
    } catch (error) {
      console.error('Failed to start transcription:', error);
    }
  }

  // Stop transcription
  stop() {
    if (!this.recognition || !this.isRunning) {
      return;
    }

    try {
      this.recognition.stop();
      this.isRunning = false;
      console.log('Transcription stopped');
    } catch (error) {
      console.error('Failed to stop transcription:', error);
    }
  }

  // Send transcript to background
  sendTranscript() {
    chrome.runtime.sendMessage({
      type: 'UPDATE_TRANSCRIPT',
      transcript: this.transcript
    });
  }

  // Get current transcript
  getTranscript() {
    return this.transcript + this.interimTranscript;
  }

  // Clear transcript
  clear() {
    this.transcript = '';
    this.interimTranscript = '';
    this.sendTranscript();
  }
}

// Make available globally
window.TranscriptionService = TranscriptionService;
