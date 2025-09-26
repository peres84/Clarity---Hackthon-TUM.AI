# services/autogen_service.py
# Autogen multi-agent conversation orchestration service

import asyncio
import json
import os
from typing import List, Dict, Any, Optional, AsyncGenerator
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

# Clear any existing OPENAI_API_KEY environment variable
if 'OPENAI_API_KEY' in os.environ:
    del os.environ['OPENAI_API_KEY']
    print("Cleared existing OPENAI_API_KEY from environment")

# Load .env from the same directory as this file with override=True
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# Debug: Print the API key (first 20 chars only for security)
api_key = os.getenv("OPENAI_API_KEY")
if api_key:
    print(f"API key loaded: {api_key[:20]}...")
    print(f"API key ends with: ...{api_key[-4:]}")
else:
    print("WARNING: No API key found!")

class ConversationSession:
    """Manages a single conversation session with persistent memory"""

    def __init__(self, session_id: str, mode: str, environment_type: str = "school"):
        self.session_id = session_id
        self.mode = mode
        self.environment_type = environment_type
        self.agents: List[AssistantAgent] = []
        self.agent_templates: List[AgentTemplate] = []  # Store original templates
        self.agent_name_mapping: Dict[str, str] = {}  # Map internal name to display name
        self.group_chat: Optional[RoundRobinGroupChat] = None
        self.conversation_history: List[Dict[str, Any]] = []
        self.current_speaker_index = 0

        # Jury mode specific
        self.current_jury_index = 0
        self.jury_has_spoken = {}  # Track which jury members have spoken
        self.questions_asked = 0
        self.max_questions = 4
        self.last_agent_who_asked = None  # Track who asked the last question for thank you

        # Environment mode specific
        self.conversation_turns = 0
        self.max_conversation_turns = 20  # Allow longer conversations with memory

        self.setup_agents()

    def setup_agents(self):
        """Initialize agents based on the conversation mode"""
        # Get model client
        model_client = OpenAIChatCompletionClient(
            model="gpt-4o-mini",
            #api_key=os.getenv("OPENAI_API_KEY"),
            api_key=api_key,
            temperature=0.7,
            max_tokens=300  # Slightly longer for detailed jury responses
        )

        # Get agent templates based on mode
        if self.mode == "presentation-jury-mode":
            templates = ConversationTemplates.get_presentation_jury_mode()
        else:  # environment mode
            templates = ConversationTemplates.get_environment_mode(self.environment_type)

        # Create Autogen agents
        for template in templates:
            # Convert name to valid Python identifier (remove spaces, hyphens, etc.)
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

            # Initialize jury tracking
            if self.mode == "presentation-jury-mode":
                self.jury_has_spoken[template.name] = False

        # Create group chat ONLY for environment mode (not jury mode)
        if self.mode != "presentation-jury-mode":
            self.group_chat = RoundRobinGroupChat(participants=self.agents)

    async def get_agent_response(self, user_message: str, user_name: str = "User") -> AsyncGenerator[Dict[str, Any], None]:
        """Get responses from agents - individual agents for jury mode, group chat for environment mode"""
        print(f"Getting agent response for: '{user_message}' from {user_name} in {self.mode}")

        # Add user message to conversation history
        self.conversation_history.append({
            "speaker": user_name,
            "message": user_message,
            "timestamp": datetime.now().isoformat(),
            "type": "user"
        })
        print(f"Added user message to history. Total messages: {len(self.conversation_history)}")

        try:
            if self.mode == "presentation-jury-mode":
                # Individual jury member responses
                async for response in self._get_jury_response(user_message, user_name):
                    yield response
            else:
                # Group chat for environment mode
                async for response in self._get_environment_response(user_message, user_name):
                    yield response

        except Exception as e:
            print(f"Error getting agent response: {e}")
            import traceback
            traceback.print_exc()
            yield {
                "type": "error",
                "message": f"Sorry, there was an error processing your message: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }

    def get_agent_template_by_name(self, name: str) -> Optional[AgentTemplate]:
        """Get agent template by internal agent name"""
        # First try to get display name from mapping
        display_name = self.agent_name_mapping.get(name, name)

        # Search templates by display name
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

    async def _get_jury_response(self, user_message: str, user_name: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Get individual jury member response with correct thank you workflow"""
        print(f"Getting jury response. Questions asked: {self.questions_asked}, Max: {self.max_questions}")

        # Check if evaluation is complete
        if self.questions_asked >= self.max_questions:
            # First, if someone asked the last question, they should thank the user
            if self.last_agent_who_asked is not None:
                last_agent = None
                last_agent_template = None
                for i, template in enumerate(self.agent_templates):
                    if template.name == self.last_agent_who_asked:
                        last_agent = self.agents[i]
                        last_agent_template = template
                        break

                if last_agent_template:
                    # Get thank you and conclusion from the agent who asked the last question
                    final_task = f"""The user just responded to your question: "{user_message}"

Thank them for their response and conclude that the evaluation is complete. Example:
"[thoughtful] Thank you {user_name}! [pause] I think we are done with the questions. [confident] You've shared some really valuable insights about your presentation. [happy] We appreciate you taking the time to practice with us!"

Be natural and appreciative."""

                    print(f"Getting final thank you and conclusion from {last_agent_template.name}")
                    final_result = await last_agent.run(task=final_task)

                    if final_result and final_result.messages:
                        final_response = final_result.messages[-1].content

                        final_response_data = {
                            "type": "agent_message",
                            "agent_name": last_agent_template.name,
                            "message": final_response,
                            "agent_gender": last_agent_template.gender,
                            "voice_id": last_agent_template.voice_id,
                            "timestamp": datetime.now().isoformat()
                        }
                        print(f"Sending final conclusion from {last_agent_template.name}: {final_response}")
                        yield final_response_data
                        return

            # Fallback final message if no last agent found
            final_agent_template = self.agent_templates[0]
            final_response_data = {
                "type": "agent_message",
                "agent_name": final_agent_template.name,
                "message": f"[thoughtful] Thank you {user_name}! [pause] I think we are done with the questions. [confident] You've shared some really valuable insights. [happy] We appreciate your time!",
                "agent_gender": final_agent_template.gender,
                "voice_id": final_agent_template.voice_id,
                "timestamp": datetime.now().isoformat()
            }
            print(f"Sending fallback final conclusion: {final_response_data}")
            yield final_response_data
            return

        try:
            # Step 1: If someone asked the last question, they should thank the user first
            if self.last_agent_who_asked is not None and user_message.strip():
                # Find the agent who asked the last question
                thank_you_agent = None
                thank_you_template = None
                for i, template in enumerate(self.agent_templates):
                    if template.name == self.last_agent_who_asked:
                        thank_you_agent = self.agents[i]
                        thank_you_template = template
                        break

                if thank_you_agent and thank_you_template:
                    thank_you_task = f"""The user just responded to your question: "{user_message}"

Acknowledge their response with a brief, natural thank you. Examples:
- "[happy] Thank you for sharing that, {user_name}!"
- "[thoughtful] Thanks, that's really helpful to know."
- "[curious] Great, thank you for explaining that!"

Be brief and natural - just 1-2 sentences maximum."""

                    print(f"Getting thank you from {thank_you_template.name} (who asked last question)")
                    thank_you_result = await thank_you_agent.run(task=thank_you_task)

                    if thank_you_result and thank_you_result.messages:
                        thank_you_response = thank_you_result.messages[-1].content
                        print(f"Agent {thank_you_template.name} says thank you: {thank_you_response}")

                        # Send thank you response
                        thank_you_data = {
                            "type": "agent_message",
                            "agent_name": thank_you_template.name,
                            "message": thank_you_response,
                            "agent_gender": thank_you_template.gender,
                            "voice_id": thank_you_template.voice_id,
                            "timestamp": datetime.now().isoformat()
                        }
                        print(f"Yielding thank you response: {thank_you_data}")
                        yield thank_you_data

                        # Wait 1 second before next question
                        print("Waiting 2 second before next agent...")
                        await asyncio.sleep(2.0)

            # Step 2: Move to next jury member for the question
            self.current_jury_index = (self.current_jury_index + 1) % len(self.agents)
            next_agent = self.agents[self.current_jury_index]
            next_agent_template = self.agent_templates[self.current_jury_index]

            print(f"Next jury member asking question: {next_agent_template.name} (index {self.current_jury_index})")

            # Build conversation context
            conversation_context = self.get_conversation_context()

            # Create question task for the next agent
            if self.questions_asked == 0:
                # First question
                question_task = f"""This is the start of a presentation evaluation.

The user said: "{user_message}"

Ask your first question as {next_agent_template.persona} focused on your expertise. Ask one clear, engaging question."""
            else:
                # Follow-up question
                question_task = f"""Previous conversation:
{conversation_context}

The user just responded: "{user_message}"

Now ask your question as {next_agent_template.persona} focused on your area of expertise. Ask one clear, engaging question that builds on the conversation."""

            # Get question from next jury agent
            print(f"Getting question from {next_agent_template.name}")
            question_result = await next_agent.run(task=question_task)

            if question_result and question_result.messages:
                agent_response = question_result.messages[-1].content
                print(f"Agent {next_agent_template.name} asked: {agent_response}")

                # Add to conversation history
                self.conversation_history.append({
                    "speaker": next_agent_template.name,
                    "message": agent_response,
                    "timestamp": datetime.now().isoformat(),
                    "type": "agent"
                })

                # Mark this jury member as having spoken and track as last asker
                self.jury_has_spoken[next_agent_template.name] = True
                self.questions_asked += 1
                self.last_agent_who_asked = next_agent_template.name  # Track who asked this question

                # Prepare response data
                question_data = {
                    "type": "agent_message",
                    "agent_name": next_agent_template.name,
                    "message": agent_response,
                    "agent_gender": next_agent_template.gender,
                    "voice_id": next_agent_template.voice_id,
                    "timestamp": datetime.now().isoformat()
                }
                print(f"Yielding question from {next_agent_template.name}")

                yield question_data

            else:
                print(f"No valid question from {next_agent_template.name}")

        except openai.RateLimitError as e:
            print(f"OpenAI API quota exceeded in jury mode: {e}")
            yield {
                "type": "error",
                "message": "Sorry, we've reached our daily AI conversation limit. Please try again later or contact support to increase the quota.",
                "timestamp": datetime.now().isoformat()
            }
        except openai.AuthenticationError as e:
            print(f"OpenAI API authentication error in jury mode: {e}")
            yield {
                "type": "error",
                "message": "Authentication issue with AI service. Please contact support.",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error getting jury response: {e}")
            import traceback
            traceback.print_exc()
            yield {
                "type": "error",
                "message": f"Sorry, there was an unexpected error: {str(e)[:100]}...",
                "timestamp": datetime.now().isoformat()
            }

    async def _get_environment_response(self, user_message: str, user_name: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Get group chat response for environment mode with enhanced memory and interaction"""
        print(f"Getting environment group chat response. Turn {self.conversation_turns}/{self.max_conversation_turns}")

        # Check if conversation limit reached
        if self.conversation_turns >= self.max_conversation_turns:
            print("Conversation turns limit reached")
            return

        if not self.group_chat:
            print("Error: No group chat initialized for environment mode")
            return

        try:
            # Increment conversation turn
            self.conversation_turns += 1

            # Build rich conversation context with memory
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
            print(f"Created enriched TextMessage with conversation context")

            # Store user message for filtering purposes
            user_input_for_filtering = user_message.strip().lower()

            # Get responses from 2-3 agents for more dynamic interaction
            response_count = 0
            max_responses = 3 if len(self.conversation_history) > 5 else 2  # More responses as conversation develops
            responding_agents = set()  # Track which agents have responded to avoid duplicates

            # Create task list with enriched message for Autogen
            task = [message]

            print(f"Starting enhanced group chat stream with {len(self.agents)} agents (max responses: {max_responses})")
            async for response in self.group_chat.run_stream(task=task):
                print(f"Received response from group chat: {type(response)} - {response}")

                if response_count >= max_responses:
                    print(f"Reached max responses limit ({max_responses})")
                    break

                if hasattr(response, 'content') and response.content.strip():
                    print(f"Processing valid response from {response.source}: '{response.content[:100]}...'")

                    # Skip if this is echoing the user's input (common with Autogen)
                    if (response.content.strip().lower() == user_input_for_filtering or
                        response.content.strip() == user_message.strip()):
                        print(f"Skipping echo of user message: '{response.content}'")
                        continue

                    # Skip if the response is from the user (not an agent)
                    if response.source == user_name or response.source == "User":
                        print(f"Skipping user-generated response: {response.source}")
                        continue

                    # Ensure the response is from one of our known agents
                    if response.source not in self.agent_name_mapping:
                        print(f"Skipping response from unknown source: {response.source}")
                        continue

                    # Skip if this agent already responded in this turn (avoid duplicates)
                    if response.source in responding_agents:
                        print(f"Agent {response.source} already responded this turn, skipping duplicate")
                        continue

                    # Filter out system/context messages that might leak through
                    if "Previous conversation context:" in response.content or "User just said:" in response.content:
                        print(f"Skipping system/context message from {response.source}")
                        continue

                    responding_agents.add(response.source)

                    # Add response to conversation history
                    self.conversation_history.append({
                        "speaker": response.source,
                        "message": response.content,
                        "timestamp": datetime.now().isoformat(),
                        "type": "agent"
                    })

                    # Get agent details and display name
                    agent_template = self.get_agent_template_by_name(response.source)
                    display_name = self.agent_name_mapping.get(response.source, response.source)
                    print(f"Mapped {response.source} to display name: {display_name}")

                    response_data = {
                        "type": "agent_message",
                        "agent_name": display_name,  # Use display name for frontend
                        "message": response.content,
                        "agent_gender": agent_template.gender if agent_template else "female",
                        "voice_id": agent_template.voice_id if agent_template else "EXAVITQu4vr4xnSDxMaL",
                        "timestamp": datetime.now().isoformat()
                    }
                    print(f"Yielding environment response from {display_name}: {response.content[:50]}...")

                    yield response_data

                    response_count += 1

                    # Add natural delay between responses for better conversation flow
                    await asyncio.sleep(3.0)
                else:
                    print(f"Skipping invalid/empty response: {response}")

            print(f"Completed environment turn {self.conversation_turns} with {response_count} agent responses")

        except openai.RateLimitError as e:
            print(f"OpenAI API quota exceeded: {e}")
            yield {
                "type": "error",
                "message": "Sorry, we've reached our daily AI conversation limit. Please try again later or contact support to increase the quota.",
                "timestamp": datetime.now().isoformat()
            }
        except openai.AuthenticationError as e:
            print(f"OpenAI API authentication error: {e}")
            yield {
                "type": "error",
                "message": "Authentication issue with AI service. Please contact support.",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error getting environment response: {e}")
            import traceback
            traceback.print_exc()
            yield {
                "type": "error",
                "message": f"Sorry, there was an unexpected error: {str(e)[:100]}...",
                "timestamp": datetime.now().isoformat()
            }

    def to_dict(self) -> Dict[str, Any]:
        """Convert session to dictionary for API responses"""
        agent_info = []
        if self.mode == "presentation-jury-mode":
            templates = ConversationTemplates.get_presentation_jury_mode()
        else:
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
            "mode": self.mode,
            "environment_type": self.environment_type,
            "agents": agent_info,
            "background_audio_enabled": ConversationTemplates.get_background_audio_enabled(self.mode),
            "conversation_history": len(self.conversation_history)
        }


class AutogenService:
    """Service for managing multiple conversation sessions"""

    def __init__(self):
        self.sessions: Dict[str, ConversationSession] = {}

    def create_session(self, session_id: str, mode: str, environment_type: str = "school") -> ConversationSession:
        """Create a new conversation session"""
        session = ConversationSession(session_id, mode, environment_type)
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
        """Get agent responses for a session"""
        session = self.get_session(session_id)
        if not session:
            yield {
                "type": "error",
                "message": "Session not found",
                "timestamp": datetime.now().isoformat()
            }
            return

        async for response in session.get_agent_response(user_message, user_name):
            yield response