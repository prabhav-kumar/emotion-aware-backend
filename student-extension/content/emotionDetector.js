// Emotion detection for student's own video

class StudentEmotionDetector {
  constructor() {
    this.isReady = false;
    this.modelsLoaded = false;
  }

  // Initialize face-api.js and load models
  async initialize() {
    try {
      console.log('Loading face-api.js models...');
      
      // Model URLs - use CDN for models
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
      
      // Load required models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ]);
      
      this.modelsLoaded = true;
      this.isReady = true;
      console.log('Face-api.js models loaded successfully');
      
    } catch (error) {
      console.error('Failed to load face-api.js models:', error);
      throw error;
    }
  }

  // Analyze student's own video (self-view)
  async analyzeOwnVideo() {
    if (!this.isReady) {
      return this.getEmptyStats();
    }

    // Find student's self-view video
    const selfVideo = this.findSelfVideo();
    
    if (!selfVideo) {
      console.log('Self-view video not found');
      return this.getEmptyStats();
    }

    try {
      // Check if video is playing
      if (selfVideo.paused || selfVideo.readyState < 2) {
        return this.getEmptyStats();
      }

      // Detect face and emotions
      const detection = await faceapi
        .detectSingleFace(selfVideo, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detection) {
        return this.formatEmotionData(detection.expressions);
      } else {
        return this.getEmptyStats();
      }
      
    } catch (error) {
      console.error('Error analyzing own video:', error);
      return this.getEmptyStats();
    }
  }

  // Find student's self-view video element
  findSelfVideo() {
    const allVideos = Array.from(document.querySelectorAll('video'));
    
    // Look for self-view video (Google Meet specific selectors)
    for (const video of allVideos) {
      const rect = video.getBoundingClientRect();
      
      // Check if video is loaded
      if (video.readyState < 2) continue;
      
      // Check size
      const actualWidth = video.videoWidth || rect.width;
      const actualHeight = video.videoHeight || rect.height;
      
      if (actualWidth <= 100 || actualHeight <= 100) continue;
      
      // Check if this is self-view
      const isSelfView = video.closest('[data-self-view]') || 
                         video.closest('[data-participant-id="self"]') ||
                         video.parentElement?.querySelector('[aria-label*="You"]') ||
                         video.parentElement?.querySelector('[aria-label*="yourself"]');
      
      if (isSelfView) {
        console.log('Found self-view video');
        return video;
      }
    }
    
    // Fallback: if only one video, assume it's self-view
    if (allVideos.length === 1 && allVideos[0].readyState >= 2) {
      console.log('Only one video found, assuming self-view');
      return allVideos[0];
    }
    
    return null;
  }

  // Format emotion data for sending to backend
  formatEmotionData(expressions) {
    const emotionPercentages = {
      happy: Math.round(expressions.happy * 100),
      sad: Math.round(expressions.sad * 100),
      angry: Math.round(expressions.angry * 100),
      fearful: Math.round(expressions.fearful * 100),
      surprised: Math.round(expressions.surprised * 100),
      disgusted: Math.round(expressions.disgusted * 100),
      neutral: Math.round(expressions.neutral * 100)
    };

    // Calculate derived metrics
    const confused = Math.round(((expressions.sad + expressions.fearful) / 2) * 100);
    const engaged = Math.round(((expressions.happy + expressions.surprised) / 2) * 100);

    return {
      emotions: emotionPercentages,
      confused: confused,
      engaged: engaged,
      cameraOn: true,
      faceDetected: true,
      timestamp: Date.now()
    };
  }

  getEmptyStats() {
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
      cameraOn: false,
      faceDetected: false,
      timestamp: Date.now()
    };
  }
}

// Make available globally
window.StudentEmotionDetector = StudentEmotionDetector;
