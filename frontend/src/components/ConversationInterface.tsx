// src/components/ConversationInterface.tsx
// Main conversation interface with agents, messages, and controls

import React, { useState, useEffect, useRef } from 'react';
import { Send, RotateCcw, MessageCircle } from 'lucide-react';
import { AgentList, MessageAvatar } from './Avatar';
import { AudioRecorder } from './AudioRecorder';
import { BackgroundAudio, EnvironmentSelector } from './BackgroundAudio';
import { ClarityAPI } from '@/services/api';
import elevenLabsService from '@/services/elevenLabsService';
import audioQueue from '@/services/audioQueue';
import { ConversationSession, AgentMessage, WebSocketMessage, Agent } from '@/types';
import { clsx } from 'clsx';

interface ConversationInterfaceProps {
  session: ConversationSession;
  onSessionReset: () => void;
  className?: string;
}

export function ConversationInterface({
  session,
  onSessionReset,
  className
}: ConversationInterfaceProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [environmentType, setEnvironmentType] = useState(session.environment_type || 'school');

  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      audioQueue.stop();
    };
  }, [session.session_id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = () => {
    ws.current = ClarityAPI.createWebSocket(session.session_id);

    ws.current.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    ws.current.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);
      handleWebSocketMessage(message);
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  };

  const filterVoiceTags = (text: string): string => {
    // Remove comprehensive voice expression tags from display text
    return text.replace(/\[(?:happy|excited|sad|angry|nervous|curious|mischievously|whispers|shouts|speaking\s+softly|pause|long\s+pause|rushed|drawn\s+out|laughs|laughs\s+harder|starts\s+laughing|wheezing|sighs|exhales|crying|clears\s+throat|gulps|gasp|snorts|French\s+accent|British\s+accent|American\s+accent|pirate\s+voice|strong\s+Russian\s+accent|awe|dramatic\s+tone|interrupting|overlapping|sarcastic|thoughtful|confident)\]/gi, '');
  };

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'agent_message':
        if (message.agent_name && message.message) {
          const agentMessage: AgentMessage = {
            type: 'agent_message',
            agent_name: message.agent_name,
            message: filterVoiceTags(message.message), // Filter voice tags for display
            agent_gender: message.agent_gender || 'neutral',
            voice_id: message.voice_id,
            timestamp: message.timestamp || new Date().toISOString(),
            audio_url: message.audio_url
          };

          setMessages(prev => [...prev, agentMessage]);
          setCurrentSpeaker(message.agent_name);

          // Clear current speaker after a delay
          setTimeout(() => {
            setCurrentSpeaker(null);
          }, 2000);

          // Generate and play TTS audio using original message (with voice tags)
          generateAndPlayTTS(message.message, message.agent_name);
        }
        break;

      case 'message_received':
        console.log('Message acknowledged by server');
        break;

      case 'error':
        console.error('Server error:', message.content);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const generateAndPlayTTS = async (text: string, agentName: string) => {
    try {
      // Get appropriate voice for agent
      const voiceId = elevenLabsService.getVoiceForAgent(agentName);

      // Add audio to queue for sequential playback
      await audioQueue.enqueue(text, voiceId, agentName);

    } catch (error) {
      console.error('Failed to queue TTS audio:', error);
    }
  };

  const sendMessage = (content: string) => {
    if (!content.trim() || !ws.current || !isConnected) return;

    // Add user message to chat
    const userMessage: AgentMessage = {
      type: 'user_message',
      agent_name: 'User',
      message: content.trim(),
      agent_gender: 'neutral',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);

    // Send to WebSocket
    ws.current.send(JSON.stringify({
      type: 'user_message',
      content: content.trim(),
      user_name: 'User'
    }));

    setTextInput('');
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(textInput);
  };

  const handleTranscription = (text: string) => {
    sendMessage(text);
  };

  const handleReset = async () => {
    try {
      // Stop any queued audio
      audioQueue.stop();

      await ClarityAPI.resetConversation(session.session_id);
      setMessages([]);
      setCurrentSpeaker(null);
      onSessionReset();
    } catch (error) {
      console.error('Failed to reset conversation:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getAgentByName = (name: string): Agent | undefined => {
    return session.agents.find(agent => agent.name === name);
  };

  return (
    <div className={clsx('flex flex-col h-full max-h-screen', className)}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-heading font-semibold text-gray-800">
              {session.mode === 'presentation-jury-mode' ? 'Presentation Jury' : 'Casual Conversation'}
            </h2>
            <p className="text-sm text-gray-600">
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'} • {messages.length} messages
            </p>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>

        {/* Environment selector for environment mode */}
        {session.mode === 'environment' && (
          <div className="mt-3">
            <EnvironmentSelector
              availableEnvironments={['school', 'office', 'cafe', 'park']}
              selectedEnvironment={environmentType}
              onEnvironmentChange={setEnvironmentType}
            />
          </div>
        )}
      </div>

      {/* Agents Display */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <AgentList
          agents={session.agents}
          speakingAgent={currentSpeaker || undefined}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg mb-2">Start your conversation!</p>
            <p className="text-gray-500 text-sm">
              {session.mode === 'presentation-jury-mode'
                ? 'Present your idea and receive feedback from our jury panel.'
                : 'Have a casual conversation with our AI agents.'}
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={clsx(
              'flex items-start gap-3',
              message.type === 'user_message' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.type === 'agent_message' && (
              <MessageAvatar agent={getAgentByName(message.agent_name) || {
                name: message.agent_name,
                gender: message.agent_gender,
                persona: 'unknown',
                voice_id: ''
              }} />
            )}

            <div
              className={clsx(
                'max-w-[85%] p-4 rounded-2xl',
                message.type === 'user_message'
                  ? 'bg-primary-teal text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
              )}
            >
              {message.type === 'agent_message' && (
                <div className="text-xs font-medium mb-2 opacity-75">
                  {message.agent_name}
                </div>
              )}
              <div className="leading-relaxed whitespace-pre-wrap break-words text-sm">
                {message.message}
              </div>
              <div className={clsx(
                'text-xs mt-2 opacity-60',
                message.type === 'user_message' ? 'text-right' : 'text-left'
              )}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Controls */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            {/* Text Input */}
            <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your message..."
                disabled={!isConnected}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent disabled:opacity-50 text-sm"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || !isConnected}
                className="w-10 h-10 bg-primary-teal text-white rounded-full flex items-center justify-center hover:bg-primary-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </form>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-300"></div>

            {/* Audio Recorder - Compact */}
            <div className="flex-shrink-0">
              <AudioRecorder
                onTranscription={handleTranscription}
                isDisabled={!isConnected}
                className="!p-0 !shadow-none !bg-transparent"
                autoTranscribe={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Background Audio */}
      {session.background_audio_enabled && (
        <BackgroundAudio
          environmentType={environmentType}
          isEnabled={session.background_audio_enabled}
        />
      )}
    </div>
  );
}