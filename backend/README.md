# Clarity Backend - FastAPI + Autogen

The backend service for Clarity, built with FastAPI and Autogen for multi-agent conversations.

## 🛠️ Setup

### Environment Setup
```bash
# Use existing autogen environment or create new one
# If using existing:
source ../autogen_env/bin/activate  # On Windows: ..\autogen_env\Scripts\activate

# Or create new:
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables
The `.env` file is already copied from the root directory and contains:
- `OPENAI_API_KEY` - For Autogen agents
- `ELEVENLABS_API_KEY` - For STT/TTS services

### Run Server
```bash
python app.py
```

Server runs on http://localhost:8000 with auto-reload enabled.

## 🏗️ Architecture

### Core Components
- **app.py** - Main FastAPI application with WebSocket support
- **services/autogen_service.py** - Multi-agent conversation orchestration
- **services/elevenlabs_service.py** - STT/TTS integration
- **agents/templates.py** - Agent configurations and personas
- **models/schema.py** - Pydantic data models

### Agent System
- **Presentation Jury Mode**: 3 specialized agents (Technical, UX, Business)
- **Environment Mode**: Casual conversation agents with environmental context
- **Persistent Memory**: Agents remember conversation history across turns
- **Natural Turn-Taking**: Round-robin with realistic delays

## 🔌 API Endpoints

### Session Management
- `POST /session` - Create conversation session
- `POST /reset` - Reset conversation state

### Audio Processing
- `POST /upload_audio` - Upload audio for STT
- `GET /transcript/{id}` - Get transcription result

### Messaging
- `POST /message` - Send text message
- `WS /ws/{session_id}` - WebSocket for real-time chat

### Background Audio
- `GET /environment_audio/{type}` - Generate environment audio

## 🤖 Agent Configuration

### Adding New Agents
1. Create agent template in `agents/templates.py`
2. Define system prompt and persona
3. Assign voice ID and gender
4. Add to appropriate conversation mode

### Voice Mapping
Edit `services/elevenlabs_service.py` to map agent names to ElevenLabs voices.

## 🔧 Development

### File Structure
```
backend/
├── app.py                    # Main FastAPI app
├── models/
│   └── schema.py            # Pydantic models
├── services/
│   ├── autogen_service.py   # Agent orchestration
│   └── elevenlabs_service.py # STT/TTS services
├── agents/
│   └── templates.py         # Agent configurations
├── requirements.txt         # Dependencies
├── model_config.yaml        # Autogen config
└── .env                     # Environment variables
```

### Adding Features
1. **New Conversation Mode**: Add to `ConversationTemplates`
2. **New Agent Service**: Create in `services/` directory
3. **API Endpoint**: Add to `app.py` with proper error handling

### Error Handling
- All endpoints have comprehensive error handling
- WebSocket connections handle disconnections gracefully
- Audio processing includes timeout and retry logic