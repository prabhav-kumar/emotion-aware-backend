# Emotion-Aware Classroom - Backend Server

Real-time WebSocket server for aggregating student emotion data and broadcasting to teachers.

## Features

- **Session Management**: Create and manage classroom sessions
- **Real-time Communication**: WebSocket-based for low latency
- **Emotion Aggregation**: Automatically aggregates emotion data from all students
- **AI Insights**: Gemini API integration for teaching recommendations
- **Automatic Cleanup**: Removes empty sessions
- **Heartbeat Monitoring**: Keeps connections alive

## Installation

```bash
cd backend-server
npm install
```

## Configuration

### Environment Variables

Create a `.env` file in the `backend-server` directory:

```bash
# Required for AI insights
GEMINI_API_KEY=your_gemini_api_key_here

# Optional - server port
PORT=3000
```

**Get Gemini API Key:**
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key and add to `.env`

## Running the Server

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

**Expected output:**
```
✅ Gemini AI initialized
╔════════════════════════════════════════════╗
║  Emotion-Aware Classroom Backend Server   ║
╚════════════════════════════════════════════╝
🚀 Server listening on port 3000
```

⚠️ **Note:** If `GEMINI_API_KEY` is not set, AI insights will be disabled (emotion tracking still works).

## API / Message Protocol

### Teacher Messages

#### Register as Teacher
```json
{
  "type": "REGISTER_TEACHER",
  "sessionId": "ABC123",
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "type": "REGISTERED",
  "sessionId": "ABC123",
  "timestamp": 1234567890
}
```

#### Receive Aggregated Emotions
```json
{
  "type": "AGGREGATED_EMOTIONS",
  "data": {
    "emotions": {
      "happy": 45,
      "sad": 10,
      "neutral": 30,
      ...
    },
    "confused": 15,
    "engaged": 75,
    "totalStudents": 25,
    "activeStudents": 20
  },
  "timestamp": 1234567890
}
```

#### Request AI Insights
```json
{
  "type": "GET_AI_INSIGHTS",
  "sessionId": "ABC123",
  "emotionData": {
    "emotions": { "happy": 45, "sad": 10, ... },
    "confused": 15,
    "engaged": 75,
    "totalStudents": 25,
    "activeStudents": 20
  },
  "transcript": "Recent teacher speech...",
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "type": "AI_INSIGHTS_RESPONSE",
  "insights": "The class shows high engagement...",
  "timestamp": 1234567890
}
```

**Error Response:**
```json
{
  "type": "AI_INSIGHTS_RESPONSE",
  "error": "AI service not configured. Please set GEMINI_API_KEY...",
  "timestamp": 1234567890
}
```

### Student Messages

#### Register as Student
```json
{
  "type": "REGISTER_STUDENT",
  "sessionId": "ABC123",
  "studentName": "John Doe",
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "type": "REGISTERED",
  "studentId": "student_1234567890_abc123",
  "sessionId": "ABC123",
  "timestamp": 1234567890
}
```

#### Send Emotion Update
```json
{
  "type": "EMOTION_UPDATE",
  "studentId": "student_1234567890_abc123",
  "sessionId": "ABC123",
  "emotions": {
    "emotions": {
      "happy": 75,
      "sad": 5,
      ...
    },
    "confused": 10,
    "engaged": 80,
    "cameraOn": true,
    "faceDetected": true
  },
  "timestamp": 1234567890
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `GEMINI_API_KEY` | Yes (for AI) | - | Google Gemini API key for AI insights |

## Deployment

### Render.com (Recommended)

See [`RENDER_DEPLOYMENT_GUIDE.md`](../RENDER_DEPLOYMENT_GUIDE.md) for complete instructions.

**Quick Steps:**
1. Push to GitHub
2. Create Web Service on Render
3. Set root directory: `backend-server`
4. Add environment variable: `GEMINI_API_KEY`
5. Deploy!

**Free Tier:** Handles 20-50 concurrent students easily.

## Architecture

```
┌─────────────┐         WebSocket         ┌─────────────┐
│   Student   │ ───────────────────────▶ │             │
│ Extension 1 │                           │             │
└─────────────┘                           │   Backend   │
                                          │   Server    │
┌─────────────┐         WebSocket         │             │
│   Student   │ ───────────────────────▶ │   (Node.js  │
│ Extension 2 │                           │   +  WS)    │
└─────────────┘                           │             │
                                          │             │
┌─────────────┐         WebSocket         │             │
│   Teacher   │ ◀───────────────────────▶ │             │
│  Extension  │    (Aggregated Data)      │             │
└─────────────┘                           └─────────────┘
```

## Session Management

- **Creation**: Sessions are created when a teacher or first student connects
- **Auto-cleanup**: Empty sessions (no teacher, no students) are automatically deleted
- **ID Format**: 6-character alphanumeric (e.g., "ABC123")

## Emotion Aggregation Logic

1. Collect emotion data from all connected students
2. Filter for students with cameras on and faces detected
3. Calculate average percentages for each emotion
4. Compute derived metrics (engaged, confused)
5. Broadcast to teacher in real-time

## Monitoring

The server logs all important events:
- Session creation/deletion
- Student joins/leaves
- Connection errors
- Message processing

## Security Considerations

⚠️ **Important**: This is a basic implementation for educational purposes.

For production use, consider adding:
- Authentication/Authorization
- TLS/SSL encryption (wss://)
- Rate limiting
- Input validation
- Session expiry
- Admin dashboard

## Troubleshooting

### Connection Issues
- Ensure firewall allows port 3000
- Check if server is running: `netstat -an | findstr 3000` (Windows) or `lsof -i :3000` (Mac/Linux)

### No Data Updates
- Verify student extensions are connected
- Check browser console for WebSocket errors
- Ensure session IDs match between extensions and server

## License

MIT
