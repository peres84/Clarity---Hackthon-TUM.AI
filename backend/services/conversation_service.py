# services/conversation_service.py
# Separate conversation mode service to handle multi-agent conversations without affecting jury mode

import asyncio
import json
import os
from typing import List, Dict, Any, Optional, AsyncGenerator, Set
from datetime import datetime
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.messages import TextMessage
from autogen_ext.models.openai import OpenAIChatCompletionClient
from agents.templates import ConversationTemplates, AgentTemplate
from dotenv import load_dotenv
from pathlib import Path
import openai

load_dotenv()

class ConversationSession:
    """Manages conversation mode sessions with proper group chat handling"""

    def __init__(self, session_id: str, environment_type: str = "school"):
        self.session_id = session_id
        self.environment_type = environment_type
        self.agents: List[AssistantAgent] = []
        self.agent_templates: List[AgentTemplate] = []
        self.agent_name_mapping: Dict[str, str] = {}
        self.conversation_history: List[Dict[str, Any]] = []
        self.conversation_turns = 0
        self.max_conversation_turns = 20

        self.setup_agents()

    def setup_agents(self):
        """Initialize agents for conversation mode"""
        # Get model client
        api_key = os.getenv("OPENAI_API_KEY")
        model_client = OpenAIChatCompletionClient(
            model="gpt-4o-mini",
            api_key=api_key,
            temperature=0.7,
            max_tokens=300
        )

        # Get agent templates for environment mode
        templates = ConversationTemplates.get_environment_mode(self.environment_type)

        # Create Autogen agents
        for template in templates:
            # Convert name to valid Python identifier
            valid_name = template.name.replace(" ", "_").replace("-", "_").lower()

            # Store template and name mapping
            self.agent_templates.append(template)
            self.agent_name_mapping[valid_name] = template.name

            agent = AssistantAgent(
                name=valid_name,
                model_client=model_client,
                system_message=template.system_prompt
            )
            self.agents.append(agent)

    def get_agent_template_by_name(self, name: str) -> Optional[AgentTemplate]:
        """Get agent template by internal agent name"""
        display_name = self.agent_name_mapping.get(name, name)
        for template in self.agent_templates:
            if template.name == display_name:
                return template
        return None

    def get_conversation_context(self) -> str:
        """Get recent conversation context for agents"""
        recent_messages = self.conversation_history[-10:]  # Last 10 messages
        context = []
        for msg in recent_messages:
            context.append(f"{msg['speaker']}: {msg['message']}")
        return "\n".join(context)

    async def get_agent_responses(self, user_message: str, user_name: str = "User") -> AsyncGenerator[Dict[str, Any], None]:
        """Get responses from agents for conversation mode"""
        print(f"Getting conversation response for: '{user_message}' from {user_name}")

        # Add user message to conversation history
        self.conversation_history.append({
            "speaker": user_name,
            "message": user_message,
            "timestamp": datetime.now().isoformat(),
            "type": "user"
        })

        # Check if conversation limit reached
        if self.conversation_turns >= self.max_conversation_turns:
            print("Conversation turns limit reached")
            return

        try:
            # Increment conversation turn
            self.conversation_turns += 1

            # Create a fresh group chat for each conversation turn
            # This prevents "team already running" errors
            group_chat = RoundRobinGroupChat(participants=self.agents)

            # Build conversation context
            conversation_context = self.get_conversation_context()

            # Create enriched prompt with conversation memory
            enriched_message = f"""
Previous conversation context:
{conversation_context}

User just said: "{user_message}"

As an agent in this conversation, respond naturally based on:
1. What the user just said
2. The conversation history above
3. Your personality and role
4. Build on what others have said
5. Ask follow-up questions to keep the conversation engaging

Respond naturally and conversationally. Reference previous topics when relevant.
"""

            # Create message for agents
            message = TextMessage(content=enriched_message, source=user_name)
            print(f"Created enriched message for conversation turn {self.conversation_turns}")

            # Get responses from agents
            response_count = 0
            max_responses = 3 if len(self.conversation_history) > 5 else 2
            responding_agents: Set[str] = set()
            user_input_lower = user_message.strip().lower()

            # Create task for group chat
            task = [message]

            print(f"Starting group chat with {len(self.agents)} agents (max responses: {max_responses})")
            async for response in group_chat.run_stream(task=task):
                print(f"Received response: {type(response)} from {getattr(response, 'source', 'unknown')}")

                if response_count >= max_responses:
                    print(f"Reached max responses limit ({max_responses})")
                    break

                if hasattr(response, 'content') and response.content.strip():
                    # Filter out echoes and invalid responses
                    if (response.content.strip().lower() == user_input_lower or
                        response.content.strip() == user_message.strip()):
                        print(f"Skipping echo: '{response.content}'")
                        continue

                    # Skip user responses
                    if response.source == user_name or response.source == "User":
                        print(f"Skipping user response: {response.source}")
                        continue

                    # Ensure response is from known agent
                    if response.source not in self.agent_name_mapping:
                        print(f"Skipping unknown agent: {response.source}")
                        continue

                    # Avoid duplicate responses from same agent
                    if response.source in responding_agents:
                        print(f"Agent {response.source} already responded, skipping")
                        continue

                    # Filter out system messages that leak through
                    if ("Previous conversation context:" in response.content or
                        "User just said:" in response.content):
                        print(f"Skipping system message from {response.source}")
                        continue

                    responding_agents.add(response.source)

                    # Add to conversation history
                    self.conversation_history.append({
                        "speaker": response.source,
                        "message": response.content,
                        "timestamp": datetime.now().isoformat(),
                        "type": "agent"
                    })

                    # Get agent details
                    agent_template = self.get_agent_template_by_name(response.source)
                    display_name = self.agent_name_mapping.get(response.source, response.source)

                    response_data = {
                        "type": "agent_message",
                        "agent_name": display_name,
                        "message": response.content,
                        "agent_gender": agent_template.gender if agent_template else "female",
                        "voice_id": agent_template.voice_id if agent_template else "EXAVITQu4vr4xnSDxMaL",
                        "timestamp": datetime.now().isoformat()
                    }

                    print(f"Yielding response from {display_name}: {response.content[:50]}...")
                    yield response_data

                    response_count += 1

                    # Natural delay between responses
                    await asyncio.sleep(2.5)

            print(f"Completed conversation turn {self.conversation_turns} with {response_count} responses")

        except openai.RateLimitError as e:
            print(f"OpenAI API quota exceeded in conversation mode: {e}")
            yield {
                "type": "error",
                "message": "Sorry, we've reached our daily AI conversation limit. Please try again later or contact support to increase the quota.",
                "timestamp": datetime.now().isoformat()
            }
        except openai.AuthenticationError as e:
            print(f"OpenAI API authentication error in conversation mode: {e}")
            yield {
                "type": "error",
                "message": "Authentication issue with AI service. Please contact support.",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error in conversation response: {e}")
            import traceback
            traceback.print_exc()
            yield {
                "type": "error",
                "message": f"Sorry, there was an error: {str(e)[:100]}...",
                "timestamp": datetime.now().isoformat()
            }

    def to_dict(self) -> Dict[str, Any]:
        """Convert session to dictionary for API responses"""
        agent_info = []
        templates = ConversationTemplates.get_environment_mode(self.environment_type)

        for template in templates:
            agent_info.append({
                "name": template.name,
                "persona": template.persona,
                "gender": template.gender,
                "voice_id": template.voice_id
            })

        return {
            "session_id": self.session_id,
            "mode": "environment",
            "environment_type": self.environment_type,
            "agents": agent_info,
            "background_audio_enabled": True,
            "conversation_history": len(self.conversation_history),
            "conversation_turns": self.conversation_turns
        }


class ConversationService:
    """Service for managing conversation mode sessions"""

    def __init__(self):
        self.sessions: Dict[str, ConversationSession] = {}

    def create_session(self, session_id: str, environment_type: str = "school") -> ConversationSession:
        """Create a new conversation session"""
        session = ConversationSession(session_id, environment_type)
        self.sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[ConversationSession]:
        """Get existing session by ID"""
        return self.sessions.get(session_id)

    def reset_session(self, session_id: str):
        """Reset or remove a session"""
        if session_id in self.sessions:
            del self.sessions[session_id]

    async def get_agent_responses(self, session_id: str, user_message: str, user_name: str = "User") -> AsyncGenerator[Dict[str, Any], None]:
        """Get agent responses for a conversation session"""
        session = self.get_session(session_id)
        if not session:
            yield {
                "type": "error",
                "message": "Session not found",
                "timestamp": datetime.now().isoformat()
            }
            return

        async for response in session.get_agent_responses(user_message, user_name):
            yield response