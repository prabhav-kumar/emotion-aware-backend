# 🚀 Complete Setup Guide - Emotion-Aware Classroom

Step-by-step instructions to get the dual-extension system running.

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] **Google Chrome** or **Microsoft Edge** (Chromium-based)
- [ ] **Node.js** (v14+) - [Download here](https://nodejs.org/)
- [ ] **Gemini API Key** - [Get free key](https://makersuite.google.com/app/apikey)
- [ ] **Internet connection** (for downloading dependencies)
- [ ] **Webcam** (for testing)

## ⚙️ Part 1: Backend Server Setup

### Step 1.1: Install Dependencies

```bash
# Navigate to backend folder
cd backend-server

# Install Node.js dependencies
npm install
```

**Expected output:**
```
added 2 packages, and audited 3 packages in 2s
```

### Step 1.2: Test the Server

```bash
# Start the server
npm start
```

**Expected output:**
```
╔════════════════════════════════════════════╗
║  Emotion-Aware Classroom Backend Server   ║
╚════════════════════════════════════════════╝

✓ WebSocket server running on port 3000
✓ Ready to accept connections

Use ws://localhost:3000 to connect
```

**✅ Success!** Keep this terminal window open. The server must run while you use the extensions.

### Step 1.3: (Optional) Change Port

If port 3000 is already in use:

```bash
# Windows
set PORT=4000 && npm start

# Mac/Linux
PORT=4000 npm start
```

Remember to use the new port in extension configurations!

---

## 📦 Part 2: Student Extension Setup

### Step 2.1: Download face-api.js

**Option A: Manual Download**

1. Open: https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js
2. Right-click → "Save As..."
3. Save to: `student-extension/libs/face-api.min.js`

**Option B: Using PowerShell (Windows)**

```powershell
cd student-extension/libs
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js" -OutFile "face-api.min.js"
```

**Option C: Using curl (Mac/Linux)**

```bash
cd student-extension/libs
curl -o face-api.min.js https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.min.js
```

### Step 2.2: Create Extension Icons

You need 3 icon sizes: 16x16, 48x48, 128x128 pixels.

**Option A: Use Online Tool**
1. Go to: https://favicon.io/favicon-generator/
2. Generate icons with classroom/education theme
3. Download and rename to: `icon16.png`, `icon48.png`, `icon128.png`
4. Place in: `student-extension/icons/`

**Option B: Use Provided Generator**
1. Open `icon-generator.html` in browser (from root folder)
2. Customize design
3. Download icons
4. Place in `student-extension/icons/`

**Option C: Simple Placeholder**
Create simple colored squares (for testing):
- Use any image editor (Paint, GIMP, etc.)
- Create 16x16, 48x48, 128x128 blue squares
- Save as PNGs in `student-extension/icons/`

### Step 2.3: Load Extension in Chrome

1. Open Chrome
2. Navigate to: `chrome://extensions/`
3. Toggle "Developer mode" (top-right)
4. Click "Load unpacked"
5. Select the `student-extension` folder
6. ✅ Extension loaded!

**Verify Installation:**
- Extension appears in toolbar
- Click extension icon → popup should open
- Should show "Not Connected" status

---

## 👨‍🏫 Part 3: Teacher Extension Setup

### Step 3.1: Create Extension Icons

Same as Step 2.2, but for the `teacher-extension/icons/` folder.

### Step 3.2: Load Extension in Chrome

**For Testing Alone:**
Use a separate Chrome profile or different browser (Edge).

**Option A: New Chrome Profile**
```bash
# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="C:\ChromeProfiles\Teacher"

# Mac
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --user-data-dir=~/ChromeProfiles/Teacher

# Linux
google-chrome --user-data-dir=~/ChromeProfiles/Teacher
```

**Option B: Use Microsoft Edge**
1. Open Edge
2. Go to: `edge://extensions/`
3. Toggle "Developer mode"
4. Click "Load unpacked"
5. Select `teacher-extension` folder

**Verify Installation:**
- Extension appears in toolbar
- Click icon → popup shows "Not Connected"
- Session management section visible

---

## 🧪 Part 4: Testing the System

### Test 1: Backend Connection

**Terminal (Backend):**
```bash
# Should show this
✓ WebSocket server running on port 3000
```

### Test 2: Create Session (Teacher)

1. Open **Teacher browser**
2. Go to: https://meet.google.com/ (create/join test meeting)
3. Click **Teacher Extension** icon
4. In popup:
   - Server URL: `ws://localhost:3000`
   - Click "Create New Session"
5. **Copy the Session ID** (e.g., "ABC123")

**Expected:**
- ✅ Status changes to "Connected"
- ✅ Session ID displayed
- ✅ Overlay appears in Google Meet

**Terminal (Backend):**
```
Created new session: ABC123
Teacher registered for session: ABC123
```

### Test 3: Student Joins (Student)

1. Open **Student browser**
2. Go to: https://meet.google.com/ (join same test meeting)
3. **Turn on camera**
4. Click **Student Extension** icon
5. In popup:
   - Server URL: `ws://localhost:3000`
   - Session ID: `ABC123` (from teacher)
   - Your Name: `Test Student`
   - Click "Connect to Session"

**Expected:**
- ✅ Status: "Connected"
- ✅ Student ID displayed
- ✅ Emotion icon updating

**Terminal (Backend):**
```
Student Test Student (student_xxx) joined session ABC123
```

**Teacher Browser:**
- ✅ Overlay shows: "Active Students: 1"
- ✅ Emotion percentages updating
- ✅ "Students Connected: 1" in popup

### Test 4: Emotion Detection

**Student Browser:**
1. Make different facial expressions
2. Watch popup show emotion changes
3. Try: 😊 happy, 😢 sad, 😮 surprised

**Teacher Browser:**
1. Watch overlay update in real-time
2. Check popup for detailed breakdown
3. Emotion bars should move

### Test 5: Live Transcription

**Teacher Browser:**
1. Click "Start Transcription"
2. Speak: "This is a test of live transcription"
3. Wait 2-3 seconds
4. Check popup → Transcript section
5. Text should appear

### Test 6: AI Insights

**Teacher Browser:**
1. Enter Gemini API key (first time)
2. Speak some test content
3. Wait for students to show emotions
4. Click "Generate Insights from Gemini"
5. Wait 3-5 seconds
6. AI feedback should appear

---

## 🎓 Part 5: Actual Classroom Usage

### For Teachers:

**Pre-Class (5 minutes before):**
1. ✅ Start backend server: `npm start`
2. ✅ Open Google Meet, create meeting
3. ✅ Load teacher extension
4. ✅ Create session, note Session ID
5. ✅ Share Session ID via chat/email
6. ✅ Test transcription

**During Class:**
1. ✅ Monitor overlay (top-right corner)
2. ✅ Watch engagement/confusion levels
3. ✅ Generate AI insights every 10-15 minutes
4. ✅ Use transcription for note-taking

**After Class:**
1. ✅ Stop transcription
2. ✅ End session
3. ✅ (Optional) Export transcript from popup

### For Students:

**Before Class:**
1. ✅ Load student extension
2. ✅ Get Session ID from teacher
3. ✅ Join Google Meet
4. ✅ Turn on camera
5. ✅ Connect to session via extension

**During Class:**
1. ✅ Keep camera on for best results
2. ✅ Extension runs in background
3. ✅ Monitor connection status (optional)

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to backend"

**Check 1:** Is server running?
```bash
# Windows
netstat -an | findstr :3000

# Mac/Linux
lsof -i :3000
```

**Check 2:** Correct URL?
- Try `ws://127.0.0.1:3000` instead of `ws://localhost:3000`
- Remove trailing slashes
- Check port number

**Check 3:** Firewall blocking?
- Temporarily disable firewall
- Add exception for Node.js

### Issue: "Face detection not working"

**Fix 1:** Check face-api.js
```bash
# Should exist
ls student-extension/libs/face-api.min.js

# Should be ~1-2MB
```

**Fix 2:** Lighting
- Ensure face is well-lit
- Avoid backlighting
- Face visible in self-view

**Fix 3:** Camera permissions
- Check browser camera permissions
- Reload Google Meet page

### Issue: "Transcription not starting"

**Fix 1:** Microphone permissions
- Grant browser microphone access
- Check system mic settings

**Fix 2:** Browser support
- Chrome/Edge only (no Firefox)
- Check browser version (90+)

**Fix 3:** Reload page
- Refresh Google Meet
- Reload extension

### Issue: "No emotion data in teacher view"

**Fix 1:** Check student connection
- Verify student is connected
- Check student popup status

**Fix 2:** Session ID match
- Confirm both use same session ID
- Case-sensitive!

**Fix 3:** Check console
- F12 → Console tab
- Look for errors in both extensions

---

## 📊 Performance Tips

### For Best Results:

**Students:**
- ✅ Good lighting on face
- ✅ Face visible in camera
- ✅ Stable internet connection
- ✅ Close unnecessary tabs

**Teachers:**
- ✅ Start transcription only when needed
- ✅ Generate AI insights periodically (not constantly)
- ✅ Keep extensions updated

**Backend:**
- ✅ Run on local machine for best performance
- ✅ Monitor memory usage
- ✅ Restart if sessions pile up

---

## 🎯 Quick Reference

### URLs to Bookmark:
- Teacher Extension: `chrome://extensions/` → Teacher Extension
- Student Extension: `chrome://extensions/` → Student Extension
- Backend: Terminal with `npm start`

### Default Settings:
- Backend Port: `3000`
- Backend URL: `ws://localhost:3000`
- Update Frequency: 3 seconds
- Gemini Model: `gemini-2.0-flash-exp`

### Keyboard Shortcuts:
- Open Extensions: `Ctrl+Shift+E` (Windows) / `Cmd+Shift+E` (Mac)
- Developer Console: `F12`
- Reload Extension: Click "Reload" on extension card

---

## 📞 Getting Help

**Check logs:**
1. Browser Console (F12)
2. Backend Terminal
3. Extension background page

**Common Log Messages:**
- `WebSocket connection established` ✅ Good
- `Failed to connect` ❌ Backend issue
- `Face detection initialized` ✅ Good
- `Models not loaded` ❌ face-api.js issue

**Need more help?**
- Check README_NEW_ARCHITECTURE.md
- Review backend-server/README.md
- Check GitHub issues

---

**You're all set! 🎉**

Start your virtual classroom with emotion awareness! 📚🧠
