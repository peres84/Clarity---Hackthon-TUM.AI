# app.py
# Main FastAPI application for Clarity - AI conversational learning app

import os
import uuid
from datetime import datetime
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv

from models.schema import (
    SessionRequest, MessageRequest,
    SessionResponse, ConversationMode
)
from services.autogen_service import AutogenService
from services.conversation_service import ConversationService

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Clarity API",
    description="AI conversational learning app with multi-agent interactions",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
autogen_service = AutogenService()  # For jury mode
conversation_service = ConversationService()  # For environment/conversation mode

# Store active WebSocket connections
active_connections: Dict[str, WebSocket] = {}

# Audio processing is now handled by frontend using ElevenLabs TypeScript SDK

@app.post("/session", response_model=SessionResponse)
async def create_session(request: SessionRequest):
    """Initialize a new conversation session with specified mode"""
    try:
        print(f"Received session request: {request}")
        print(f"Mode: {request.mode}, type: {type(request.mode)}")

        # Generate unique session ID
        session_id = str(uuid.uuid4())

        # Create conversation session using appropriate service
        mode_value = request.mode if isinstance(request.mode, str) else request.mode.value
        print(f"Using mode value: {mode_value}")

        if mode_value == "presentation-jury-mode":
            # Use original autogen service for jury mode
            session = autogen_service.create_session(
                session_id=session_id,
                mode=mode_value,
                environment_type=request.environment_type or "school"
            )
        else:
            # Use new conversation service for environment mode
            session = conversation_service.create_session(
                session_id=session_id,
                environment_type=request.environment_type or "school"
            )

        session_dict = session.to_dict()
        print(f"Session created: {session_dict}")

        return SessionResponse(
            session_id=session_id,
            mode=request.mode,
            agents=session_dict["agents"],
            background_audio_enabled=session_dict["background_audio_enabled"]
        )

    except Exception as e:
        print(f"Error creating session: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")


# Audio upload and STT processing is now handled by frontend using ElevenLabs TypeScript SDK


# Audio processing moved to frontend - backend only handles text-based agent interactions


# Transcription endpoints removed - handled by frontend using ElevenLabs TypeScript SDK


@app.post("/message")
async def send_message(request: MessageRequest):
    """Send text message to conversation agents"""
    try:
        # For now, return simple response - WebSocket streaming will handle real conversation
        return {
            "status": "received",
            "message": "Message sent to agents",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process message: {str(e)}")


@app.post("/reset")
async def reset_conversation(session_id: str = None):
    """Reset conversation state"""
    try:
        if session_id:
            # Try to reset in both services
            autogen_service.reset_session(session_id)
            conversation_service.reset_session(session_id)
            return {"status": "reset", "session_id": session_id}
        else:
            # Reset all sessions in both services
            autogen_service.sessions.clear()
            conversation_service.sessions.clear()
            return {"status": "all_sessions_reset"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset: {str(e)}")


@app.get("/stream")
async def stream_placeholder():
    """Placeholder for streaming endpoint - use WebSocket instead"""
    return {
        "message": "Use WebSocket connection at /ws/{session_id} for real-time streaming",
        "websocket_url": "/ws/{session_id}"
    }


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time conversation streaming"""
    print(f"WebSocket connection attempt for session: {session_id}")

    try:
        await websocket.accept()
        active_connections[session_id] = websocket
        print(f"WebSocket connected for session: {session_id}")

        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message_type = data.get("type")
            print(f"Received WebSocket message: {message_type}")

            if message_type == "user_message":
                user_message = data.get("content", "")
                user_name = data.get("user_name", "User")
                print(f"Processing user message: '{user_message}' from {user_name}")

                # Send acknowledgment
                await websocket.send_json({
                    "type": "message_received",
                    "content": "Processing your message...",
                    "timestamp": datetime.now().isoformat()
                })
                print("Sent acknowledgment")

                try:
                    # Get agent responses using appropriate service
                    print("Getting agent responses...")
                    response_count = 0

                    # Check if session exists in jury mode service first
                    jury_session = autogen_service.get_session(session_id)
                    if jury_session:
                        print("Using jury mode service")
                        async for response in autogen_service.get_agent_responses(session_id, user_message, user_name):
                            response_count += 1
                            print(f"Sending jury response #{response_count}: {response}")
                            await websocket.send_json(response)
                    else:
                        # Try conversation service
                        conv_session = conversation_service.get_session(session_id)
                        if conv_session:
                            print("Using conversation mode service")
                            async for response in conversation_service.get_agent_responses(session_id, user_message, user_name):
                                response_count += 1
                                print(f"Sending conversation response #{response_count}: {response}")
                                await websocket.send_json(response)
                        else:
                            print(f"Session {session_id} not found in either service")

                    print(f"Completed sending {response_count} agent responses")

                except Exception as agent_error:
                    print(f"Error getting agent responses: {agent_error}")
                    import traceback
                    traceback.print_exc()

                    # Send error to client
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Agent processing error: {str(agent_error)}",
                        "timestamp": datetime.now().isoformat()
                    })

            elif message_type == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })
                print("Responded to ping")

    except WebSocketDisconnect:
        if session_id in active_connections:
            del active_connections[session_id]
        print(f"WebSocket disconnected for session: {session_id}")
    except Exception as e:
        print(f"WebSocket error for session {session_id}: {e}")
        import traceback
        traceback.print_exc()
        if session_id in active_connections:
            del active_connections[session_id]


# Environment audio generation moved to frontend using ElevenLabs TypeScript SDK Sound Effects


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Clarity API",
        "version": "1.0.0"
    }


# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {"error": "Endpoint not found", "status_code": 404}

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return {"error": "Internal server error", "status_code": 500}


if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )