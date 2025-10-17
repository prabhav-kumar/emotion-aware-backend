// Overlay manager for teacher's Google Meet view

class TeacherOverlay {
  constructor() {
    this.overlay = null;
    this.isVisible = true;
    this.sessionId = null;
  }

  // Create overlay UI
  create(sessionId) {
    this.sessionId = sessionId;
    
    // Remove existing overlay if any
    if (this.overlay) {
      this.overlay.remove();
    }

    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'emotion-teacher-overlay';
    this.overlay.className = 'emotion-overlay';
    
    this.overlay.innerHTML = `
      <div class="overlay-header">
        <div class="header-left">
          <span class="overlay-title">📊 Teacher Dashboard</span>
          <span class="session-badge">Session: ${sessionId}</span>
        </div>
        <div class="header-actions">
          <button class="btn-icon" id="overlay-toggle" title="Minimize">−</button>
        </div>
      </div>
      
      <div class="overlay-content" id="overlay-content">
        <div class="stats-row">
          <div class="stat-card engaged">
            <div class="stat-label">Engaged</div>
            <div class="stat-value" id="stat-engaged">0%</div>
          </div>
          
          <div class="stat-card confused">
            <div class="stat-label">Confused</div>
            <div class="stat-value" id="stat-confused">0%</div>
          </div>
        </div>
        
        <div class="stats-row">
          <div class="stat-card students">
            <div class="stat-label">Active Students</div>
            <div class="stat-value" id="stat-students">0</div>
          </div>
          
          <div class="stat-card cameras">
            <div class="stat-label">Cameras On</div>
            <div class="stat-value" id="stat-cameras">0</div>
          </div>
        </div>
        
        <div class="emotion-breakdown">
          <div class="emotion-bar">
            <span class="emotion-label">😊 Happy</span>
            <div class="progress-bar">
              <div class="progress-fill happy" id="emotion-happy" style="width: 0%"></div>
            </div>
            <span class="emotion-percent" id="percent-happy">0%</span>
          </div>
          
          <div class="emotion-bar">
            <span class="emotion-label">😐 Neutral</span>
            <div class="progress-bar">
              <div class="progress-fill neutral" id="emotion-neutral" style="width: 0%"></div>
            </div>
            <span class="emotion-percent" id="percent-neutral">0%</span>
          </div>
          
          <div class="emotion-bar">
            <span class="emotion-label">😢 Sad</span>
            <div class="progress-bar">
              <div class="progress-fill sad" id="emotion-sad" style="width: 0%"></div>
            </div>
            <span class="emotion-percent" id="percent-sad">0%</span>
          </div>
        </div>
        
        <div class="status-text" id="status-text">
          Waiting for students to connect...
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this.attachEventListeners();
    
    console.log('Teacher overlay created');
  }

  // Attach event listeners
  attachEventListeners() {
    const toggleBtn = document.getElementById('overlay-toggle');
    const content = document.getElementById('overlay-content');
    
    if (toggleBtn && content) {
      toggleBtn.addEventListener('click', () => {
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
          content.style.display = 'block';
          toggleBtn.textContent = '−';
          toggleBtn.title = 'Minimize';
        } else {
          content.style.display = 'none';
          toggleBtn.textContent = '+';
          toggleBtn.title = 'Expand';
        }
      });
    }
  }

  // Update overlay with aggregated emotion data
  update(data) {
    if (!this.overlay || !data) return;

    // Update main stats
    const statEngaged = document.getElementById('stat-engaged');
    const statConfused = document.getElementById('stat-confused');
    const statStudents = document.getElementById('stat-students');
    const statCameras = document.getElementById('stat-cameras');
    const statusText = document.getElementById('status-text');

    if (statEngaged) statEngaged.textContent = `${data.engaged || 0}%`;
    if (statConfused) statConfused.textContent = `${data.confused || 0}%`;
    if (statStudents) statStudents.textContent = data.totalStudents || 0;
    if (statCameras) statCameras.textContent = data.activeStudents || 0;

    // Update emotion bars
    if (data.emotions) {
      this.updateEmotionBar('happy', data.emotions.happy || 0);
      this.updateEmotionBar('neutral', data.emotions.neutral || 0);
      this.updateEmotionBar('sad', data.emotions.sad || 0);
    }

    // Update status text
    if (statusText) {
      if (data.totalStudents === 0) {
        statusText.textContent = 'Waiting for students to connect...';
        statusText.style.color = '#95a5a6';
      } else if (data.activeStudents === 0) {
        statusText.textContent = 'All cameras are off';
        statusText.style.color = '#e74c3c';
      } else {
        statusText.textContent = `Monitoring ${data.activeStudents} student(s)`;
        statusText.style.color = '#27ae60';
      }
    }
  }

  // Update individual emotion bar
  updateEmotionBar(emotion, value) {
    const fillElement = document.getElementById(`emotion-${emotion}`);
    const percentElement = document.getElementById(`percent-${emotion}`);
    
    if (fillElement) {
      fillElement.style.width = `${value}%`;
    }
    
    if (percentElement) {
      percentElement.textContent = `${value}%`;
    }
  }

  // Remove overlay
  remove() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  // Show/hide overlay
  setVisible(visible) {
    if (this.overlay) {
      this.overlay.style.display = visible ? 'block' : 'none';
    }
  }
}

// Make available globally
window.TeacherOverlay = TeacherOverlay;
