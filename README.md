# Emotion-Aware Virtual Classroom

> **NEW: Dual-Extension Architecture** - Students and teachers use separate extensions with real-time backend aggregation.

A revolutionary system for emotion detection in virtual classrooms using **two Chrome extensions** (student + teacher) connected via a **backend server** for real-time emotion aggregation and AI-powered teaching insights.

## 🎯 Why Dual Extensions?

**Problem Solved:** The original single-extension approach stopped working when teachers switched tabs to OneNote, PowerPoint, or other apps.

**Solution:** Separate extensions with backend aggregation:
- ✅ **Tab Independent**: Teacher can switch apps freely
- ✅ **Enhanced Privacy**: Students analyze their own video
- ✅ **Scalable**: Backend handles real-time aggregation
- ✅ **Professional**: Production-ready architecture

## ✨ Features

### Student Extension
- **😊 Self-Analysis**: Analyzes student's own video (self-view)
- **📡 Real-time Sync**: Sends emotion data every 3 seconds
- **🔒 Privacy-First**: Only emotion percentages sent, never video
- **🎛️ Simple UI**: Connection status and current emotion

### Teacher Extension
- **📊 Aggregated Dashboard**: View all students' emotions combined
- **🎨 Persistent Overlay**: Works even when switching tabs
- **🎙️ Live Transcription**: Captures speech in real-time
- **🤖 AI Insights**: Gemini-powered teaching suggestions
- **👥 Session Management**: Create/join classroom sessions

### Backend Server
- **⚡ Real-time**: WebSocket-based instant updates
- **🔗 Session Management**: Handle multiple classrooms
- **📈 Aggregation**: Smart emotion averaging
- **🧹 Auto-cleanup**: Removes inactive sessions

## 🏗️ Architecture

```
┌─────────────┐         ┌─────────────┐
│  Student 1  │         │   Teacher   │
│  Extension  │         │  Extension  │
└──────┬──────┘         └──────▲──────┘
       │                       │
┌──────┴──────┐         ┌──────┴──────┐
│  Student 2  │         │  Aggregated │
│  Extension  │  ─────▶ │    Data     │
└──────┬──────┘         └─────────────┘
       │                       ▲
       └───────────┬───────────┘
                   │
           ┌───────▼────────┐
           │ Backend Server │
           │  (Node.js+WS)  │
           └────────────────┘
```

## 🛠️ Tech Stack

- **Student Extension**: Vanilla JS, face-api.js, WebSocket
- **Teacher Extension**: Vanilla JS, Web Speech API, Gemini API
- **Backend**: Node.js, ws (WebSocket library)
- **Emotion Detection**: face-api.js (TinyFaceDetector)
- **AI**: Google Gemini 2.0 Flash
- **Protocol**: Chrome Manifest V3

## 📋 Prerequisites

1. **Google Chrome/Edge** (Chromium-based browser)
2. **Node.js** (v14+) - [Download here](https://nodejs.org/)
3. **Gemini API Key** - Get it from [Google AI Studio](https://makersuite.google.com/app/apikey)

## ⚡ Quick Start (5 Minutes)

### Option 1: Automated Setup (Windows)

```powershell
# 1. Download face-api.js
.\download-face-api.ps1

# 2. Start backend
.\START_BACKEND.bat

# 3. Load extensions in Chrome (see below)
```

### Option 2: Manual Setup

**See detailed guide:** [`SETUP_GUIDE.md`](SETUP_GUIDE.md)

## 🚀 Installation Steps

### 1. Setup Backend Server

```bash
cd backend-server
npm install
npm start
```

Server runs on `ws://localhost:3000` ✅

### 2. Setup Student Extension

**Download face-api.js:**
```bash
cd student-extension/libs
# Download from: https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js
```

**Create icons:** 16x16, 48x48, 128x128 PNG in `student-extension/icons/`

**Load in Chrome:**
- Go to `chrome://extensions/`
- Enable "Developer mode"
- "Load unpacked" → select `student-extension/`

### 3. Setup Teacher Extension

**Create icons:** Same sizes in `teacher-extension/icons/`

**Load in Chrome** (different profile or Edge):
- Go to `chrome://extensions/`
- Enable "Developer mode"  
- "Load unpacked" → select `teacher-extension/`

## 📖 Usage Guide

### For Teachers:

1. **Start Backend**: Run `npm start` in `backend-server/`
2. **Open Google Meet**: Start or join meeting
3. **Create Session**: 
   - Click teacher extension icon
   - Click "Create New Session"
   - Share Session ID with students (e.g., "ABC123")
4. **Configure Gemini** (first time): Enter API key
5. **Start Transcription**: Click "Start Transcription" button
6. **Monitor**: View overlay in Google Meet showing aggregated emotions
7. **Get Insights**: Click "Generate Insights from Gemini"

### For Students:

1. **Join Google Meet**: Enter meeting
2. **Turn On Camera**: Required for emotion detection
3. **Connect to Session**:
   - Click student extension icon
   - Server: `ws://localhost:3000`
   - Session ID: (from teacher)
   - Your Name: Enter your name
   - Click "Connect to Session"
4. **Done!**: Extension runs in background

### Understanding the Data

**Teacher Overlay Shows:**
- **Engaged %**: Average engagement across all students
- **Confused %**: Students showing confusion
- **Active Students**: Count of students with cameras on
- **Emotion Breakdown**: Distribution of emotions

**Student Popup Shows:**
- Connection status
- Your current dominant emotion
- Session info

## 🔧 Troubleshooting

### "Cannot connect to backend"
```bash
# Check if server is running (Windows)
netstat -an | findstr :3000

# Restart backend
cd backend-server
npm start
```
- Try `ws://127.0.0.1:3000` instead of `localhost`
- Check firewall settings

### "Face detection not working"
- Verify `student-extension/libs/face-api.min.js` exists (should be ~1-2MB)
- Check camera permissions in browser
- Ensure face is visible and well-lit in self-view

### "No emotion data in teacher view"
- Verify students are connected (check their extension popup)
- Confirm Session ID matches (case-sensitive!)
- Check browser console (F12) for WebSocket errors
- Ensure backend server is running

### Transcription not working
- Grant microphone permissions to Google Meet
- Chrome/Edge only (Web Speech API)
- Reload the Meet page

### Gemini API errors
- Verify API key is correct
- Check API quota at [Google Cloud Console](https://console.cloud.google.com/)
- Try using `gemini-2.0-flash-exp` or `gemini-1.5-flash`

**For detailed troubleshooting:** See [`SETUP_GUIDE.md`](SETUP_GUIDE.md)

## 🏗️ Project Structure

```
emotion-aware-classroom/
├── student-extension/              # Student browser extension
│   ├── manifest.json
│   ├── background.js              # WebSocket client
│   ├── content/
│   │   ├── content.js            # Main coordinator
│   │   └── emotionDetector.js    # Self-video analysis
│   ├── popup/
│   │   ├── popup.html            # Connection UI
│   │   ├── popup.css
│   │   └── popup.js
│   ├── libs/
│   │   └── face-api.min.js       # Face detection library
│   └── icons/
│
├── teacher-extension/              # Teacher browser extension
│   ├── manifest.json
│   ├── background.js              # WebSocket client + session mgmt
│   ├── content/
│   │   ├── content.js            # Main coordinator
│   │   ├── overlay.js            # Persistent overlay
│   │   ├── overlay.css
│   │   └── transcription.js      # Speech recognition
│   ├── popup/
│   │   ├── popup.html            # Dashboard UI
│   │   ├── popup.css
│   │   └── popup.js              # Gemini integration
│   └── icons/
│
├── backend-server/                 # Node.js WebSocket server
│   ├── package.json
│   ├── server.js                  # Main server logic
│   └── README.md
│
├── README.md                       # This file - main documentation
├── SETUP_GUIDE.md                  # Step-by-step setup guide
├── download-face-api.ps1           # Helper script for dependencies
├── START_BACKEND.bat               # Windows backend launcher
└── LICENSE                         # MIT License
```

## 🔐 Privacy & Security

### Student Privacy
- **Self-Analysis Only**: Students analyze their OWN video (self-view)
- **No Video Upload**: Videos never leave the student's browser
- **Emotion Percentages Only**: Only numerical percentages sent to backend
- **Explicit Consent**: Students must install extension and connect
- **Full Control**: Can disconnect anytime

### Teacher Privacy
- **Aggregated Data Only**: Teacher receives combined statistics
- **No Individual Tracking**: Cannot see individual student emotions
- **Local Transcription**: Speech stays local until Gemini API call
- **Secure Keys**: API keys encrypted in browser storage

### Backend Security
- **No Storage**: Backend doesn't store historical data
- **Session-Based**: Data cleared when session ends
- **Local Network**: Recommended to run on local machine/network
- **Upgradable**: Easy to add TLS (wss://) for production

## 🎯 Key Technical Decisions

1. **Dual Extensions**: Solves tab-switching problem
2. **WebSocket Backend**: Real-time aggregation at scale
3. **Student Self-Analysis**: Better privacy + accuracy
4. **face-api.js**: Privacy-first emotion detection
5. **Persistent Overlay**: Teacher can multitask
6. **Session Management**: Multiple classrooms supported

## 🚧 Limitations

### Current Limitations
- Backend server required (can't run extensions alone)
- Requires students to have cameras ON
- Works best with good lighting conditions
- Emotion detection accuracy ~70-80%
- Local network recommended (latency)
- Basic authentication (production needs more)

### Browser Support
- Chrome/Edge (Chromium) only
- Web Speech API for transcription
- WebSocket support required

## 🔮 Future Enhancements

### Planned Features
- [ ] Historical emotion analytics dashboard
- [ ] Session recording and export
- [ ] Multi-language transcription
- [ ] Mobile app support
- [ ] LMS integration (Canvas, Moodle, etc.)
- [ ] Advanced authentication (JWT, OAuth)
- [ ] Cloud deployment guides (AWS, Heroku)
- [ ] Emotion trend graphs
- [ ] Student self-reflection dashboard
- [ ] Breakout room support

## 📚 Documentation

This project includes two main documentation files:

| Document | Description |
|----------|-------------|
| [`README.md`](README.md) | Main overview, features, and quick start (this file) |
| [`SETUP_GUIDE.md`](SETUP_GUIDE.md) | Detailed step-by-step setup instructions |
| [`backend-server/README.md`](backend-server/README.md) | Backend server API documentation |

## 📄 License

MIT License - Feel free to use, modify, and distribute.

## 🤝 Credits & Acknowledgments

- **face-api.js** by Vladimir Mandic - Client-side emotion detection
- **Google Gemini API** - AI-powered teaching insights
- **Web Speech API** - Browser native transcription
- **ws (WebSocket library)** - Real-time communication
- **Node.js** - Backend server platform

## 📧 Support & Troubleshooting

**Quick Checks:**
1. Backend server running? (`npm start` in `backend-server/`)
2. Extensions loaded? (Check `chrome://extensions/`)
3. Session IDs match? (Case-sensitive)
4. Browser console errors? (F12 → Console)

**Documentation:**
- Setup issues → [`SETUP_GUIDE.md`](SETUP_GUIDE.md)
- Architecture & features → This README
- Backend API → [`backend-server/README.md`](backend-server/README.md)

**Logs to Check:**
- Backend: Terminal where server is running
- Extensions: Browser console (F12)
- Network: Chrome DevTools → Network tab → WS

---

## 🎉 You're Ready!

### System Overview:
1. **Backend Server** aggregates emotion data
2. **Student Extension** analyzes own video
3. **Teacher Extension** displays aggregated results
4. **Gemini AI** provides teaching insights

### Key Benefits:
✅ Tab-independent operation
✅ Enhanced student privacy
✅ Real-time emotion aggregation
✅ AI-powered insights
✅ Production-ready architecture

**Get started:** Follow the installation steps above or see [`SETUP_GUIDE.md`](SETUP_GUIDE.md) for detailed instructions.

---

**Built for VNR Hackathon 2025** 🚀

**Revolutionizing virtual classrooms with emotion awareness!** 📚🧠
