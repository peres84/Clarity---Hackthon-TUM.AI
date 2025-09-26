# models/schema.py
# Pydantic data models and schemas for Clarity API

from pydantic import BaseModel
from typing import Optional, List, Any
from enum import Enum

class ConversationMode(str, Enum):
    """Available conversation modes/templates"""
    PRESENTATION_JURY = "presentation-jury-mode"
    ENVIRONMENT = "environment"

class AgentGender(str, Enum):
    """Agent gender for avatar assignment"""
    MALE = "male"
    FEMALE = "female"
    NEUTRAL = "neutral"

class SessionRequest(BaseModel):
    """Request model for starting a new session"""
    mode: ConversationMode
    user_name: Optional[str] = "User"
    environment_type: Optional[str] = "school"  # For environment mode

class MessageRequest(BaseModel):
    """Request model for sending messages to agents"""
    message: str
    session_id: Optional[str] = None

class AgentResponse(BaseModel):
    """Response model for agent messages"""
    agent_name: str
    message: str
    agent_gender: AgentGender
    avatar_url: Optional[str] = None
    timestamp: str


class SessionResponse(BaseModel):
    """Response model for session creation"""
    session_id: str
    mode: ConversationMode
    agents: List[dict]
    background_audio_enabled: bool

class StreamMessage(BaseModel):
    """Streaming message format"""
    type: str  # "agent_message", "system_message"
    content: str
    source: str
    metadata: Optional[dict] = None