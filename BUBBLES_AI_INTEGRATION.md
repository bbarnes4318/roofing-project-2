# Bubbles AI Voice Assistant Integration

## Overview

The Bubbles AI Voice Assistant has been successfully integrated into your Kenstruction application. This system provides real-time voice command processing with advanced AI capabilities.

## What's Been Integrated

### 1. Enhanced Frontend (`src/components/pages/BubblesVoiceAssistant.jsx`)
- **Real WebSocket Communication**: Connects to Python backend for live voice processing
- **Audio Recording & Streaming**: Captures and streams audio in real-time
- **Audio Visualization**: Shows audio levels during recording
- **Connection Status**: Displays backend connection status
- **Command History**: Tracks recent voice commands
- **Error Handling**: Comprehensive error handling and reconnection logic
- **Audio Playback**: Queues and plays audio responses

### 2. Python Backend (`server/bubbles-ai/`)
- **FastAPI WebSocket Server**: Handles real-time communication
- **Voice Command Processing**: Parses and understands voice commands
- **Integration Points**: Ready to connect with your existing Node.js backend
- **Redis Support**: For state management and caching
- **Docker Support**: Containerized deployment ready

### 3. Configuration Files
- **requirements.txt**: Python dependencies
- **.env.example**: Environment configuration template
- **start-bubbles-ai.ps1**: PowerShell startup script
- **Dockerfile**: Container configuration

## Voice Commands Supported

### Alerts
- "Complete this alert" - Mark alert as completed
- "Assign Alert to [Name]" - Assign alert to specific person
- "Reschedule Alert" - Change alert due date
- "Show all alerts" - Display all active alerts
- "Alert status" - Check current alert status

### Projects
- "Create new project" - Start a new project
- "Update project status" - Change project phase
- "Show project details" - Display project information
- "Add team member" - Assign person to project
- "Project timeline" - Show project schedule

### Tasks
- "Create task" - Add new task
- "Mark task complete" - Finish a task
- "Set task priority" - Change task importance
- "Assign task to [Name]" - Give task to someone
- "Task deadline" - Set or check due date

### General
- "Show dashboard" - Go to main dashboard
- "Open calendar" - View company calendar
- "Check messages" - Show recent messages
- "Help" - Get voice command help
- "Stop listening" - Turn off voice assistant

## Getting Started

### Prerequisites
1. Python 3.8+ installed
2. Node.js backend running (your existing server)
3. Redis (optional, for advanced features)

### Quick Start

1. **Start the Bubbles AI Backend**:
   ```powershell
   .\start-bubbles-ai.ps1
   ```
   This will:
   - Create a Python virtual environment
   - Install required dependencies
   - Start the FastAPI server on port 8000

2. **Start Your Existing Backend**:
   ```powershell
   cd server
   npm start
   ```

3. **Start Your Frontend**:
   ```powershell
   npm start
   ```

4. **Access Bubbles**:
   - Navigate to your application
   - Click on "Bubbles" in the sidebar
   - Click the microphone button to start voice commands

### Docker Deployment (Optional)

If you prefer Docker deployment:

```powershell
# Start with Docker Compose
docker-compose up -d
```

## Integration Points

### Current Integration
The Bubbles AI backend is designed to integrate with your existing Node.js API. In the `_execute_command` method in `bubbles_backend_simple.py`, you can add calls to your existing endpoints:

```python
# Example integration with your alerts API
if command.command_type == "complete_alert":
    response = requests.post("http://localhost:3001/api/alerts/complete", 
                            json={"alertId": command.parameters.get("id")})
    result = response.json()
```

### API Endpoints to Integrate
- `/api/alerts/complete` - Complete alerts
- `/api/alerts/assign` - Assign alerts
- `/api/projects/create` - Create projects
- `/api/tasks/create` - Create tasks
- `/api/tasks/complete` - Complete tasks

## Advanced Features (Future)

The original `bubbles_backend.py` includes advanced features that can be gradually integrated:

1. **Whisper Speech Recognition**: High-accuracy speech-to-text
2. **Ultra-Low Latency TTS**: <50ms response times
3. **Emotion Detection**: Context-aware responses
4. **Voice Cloning**: Personalized voice responses
5. **Semantic Search**: Advanced command understanding

## Troubleshooting

### Common Issues

1. **Connection Error**: Make sure the Python backend is running on port 8000
2. **Microphone Access**: Allow microphone permissions in your browser
3. **Python Dependencies**: Run `pip install -r requirements.txt` in the bubbles-ai directory
4. **Port Conflicts**: Ensure port 8000 is not used by another service

### Debug Mode

To run in debug mode, modify the startup command in `bubbles_backend_simple.py`:

```python
uvicorn.run(
    "bubbles_backend_simple:app",
    host="0.0.0.0",
    port=8000,
    reload=True,
    log_level="debug"
)
```

## File Structure

```
kenstruction/
├── src/
│   └── components/pages/
│       └── BubblesVoiceAssistant.jsx    # Enhanced frontend
├── server/
│   └── bubbles-ai/                      # Python backend
│       ├── bubbles_backend_simple.py    # Main backend
│       ├── requirements.txt             # Python dependencies
│       ├── .env.example                 # Environment config
│       └── Dockerfile                   # Container config
├── start-bubbles-ai.ps1                 # Startup script
├── docker-compose.yml                   # Docker orchestration
└── BUBBLES_AI_INTEGRATION.md           # This documentation
```

## Next Steps

1. **Test Basic Functionality**: Ensure WebSocket connection and audio recording work
2. **Integrate with Existing APIs**: Connect voice commands to your Node.js backend
3. **Add Advanced AI Features**: Gradually integrate Whisper and advanced TTS
4. **Customize Commands**: Add project-specific voice commands
5. **Performance Optimization**: Optimize for production deployment

## Support

For issues or questions about the Bubbles AI integration:
1. Check the browser console for frontend errors
2. Check the Python backend logs for backend errors
3. Verify all services are running on correct ports
4. Ensure microphone permissions are granted 