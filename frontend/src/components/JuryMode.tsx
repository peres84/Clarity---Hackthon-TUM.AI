// JuryMode.tsx
// Jury Mode interface with expert panel and animated speaking indicators

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw, Mic, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ClarityAPI } from '../services/api';
import elevenLabsService from '../services/elevenLabsService';
import { AudioRecorder } from './AudioRecorder';
import audioQueue from '../services/audioQueue';
import { DebugConsole, DebugToggle } from './DebugConsole';
import { clsx } from 'clsx';

interface JuryMember {
  id: string;
  name: string;
  title: string;
  avatar: string;
  color: string;
  expertise: string;
}

interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  sender: string;
  timestamp: Date;
  agentId?: string;
}

const JURY_MEMBERS: JuryMember[] = [
  {
    id: 'sarah_chen',
    name: 'Sarah Chen',
    title: 'UX Specialist',
    avatar: '/avatars/susi-female.png',
    color: 'bg-blue-500',
    expertise: 'User Experience Design'
  },
  {
    id: 'alex_thompson',
    name: 'Alex Thompson',
    title: 'Technical Expert',
    avatar: '/avatars/roger-male.png',
    color: 'bg-indigo-500',
    expertise: 'Technical Architecture'
  },
  {
    id: 'marcus_rodriguez',
    name: 'Marcus Rodriguez',
    title: 'Business Analyst',
    avatar: '/avatars/fin-male.png',
    color: 'bg-teal-500',
    expertise: 'Business Strategy'
  }
];

export const JuryMode: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<Message | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [canSendResponse, setCanSendResponse] = useState(true);

  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    initializeSession();
    scrollToBottom();

    // Cleanup function
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      audioQueue.stop();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      const session = await ClarityAPI.createSession('presentation-jury-mode');
      setSessionId(session.session_id);
      connectWebSocket(session.session_id);

      // Add welcome message from Sarah Chen
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'agent',
        content: filterVoiceTags("Welcome to your presentation jury! We're here to help you practice and improve your presentation skills. Please introduce yourself and your topic."),
        sender: 'Sarah Chen',
        timestamp: new Date(),
        agentId: 'sarah_chen'
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Failed to initialize session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const connectWebSocket = (sessionId: string) => {
    ws.current = ClarityAPI.createWebSocket(sessionId);

    ws.current.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
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

  const handleWebSocketMessage = (message: any) => {
    // Add websocket message to debug console
    if ((window as any).debugConsole) {
      (window as any).debugConsole.addLog('websocket', 'WebSocket Message Received', message);
    }

    switch (message.type) {
      case 'agent_message':
        if (message.agent_name && message.message) {
          const newMessage: Message = {
            id: Date.now().toString(),
            type: 'agent',
            content: filterVoiceTags(message.message),
            sender: message.agent_name,
            timestamp: new Date(message.timestamp),
            agentId: getAgentIdByName(message.agent_name)
          };

          // Store the message but don't display it yet - wait for audio to start
          setPendingMessage(newMessage);

          // Add agent message to debug console
          if ((window as any).debugConsole) {
            const voiceTags = message.message.match(/\[(?:laughs|whispers|sighs|sarcastic|curious|excited|crying|starts laughing|wheezing|snorts|mischievously)\]/gi) || [];
            (window as any).debugConsole.addLog('agent', `Agent Message: ${message.agent_name}`, {
              originalMessage: message.message,
              filteredMessage: filterVoiceTags(message.message),
              agentName: message.agent_name,
              agentId: getAgentIdByName(message.agent_name),
              pendingDisplay: true
            }, voiceTags);
          }

          // Print the agent message response to the console
          console.log('Agent response:', message);

          // Add audio to queue for sequential playback
          enqueueAudio(message.message, message.voice_id, newMessage);
        }
        break;

      case 'message_received':
        console.log('Message acknowledged by server');
        break;

      case 'error':
        console.error('Server error:', message.content);
        break;
    }
  };

  const enqueueAudio = async (text: string, voiceID: string, messageToDisplay: Message) => {
    try {
      console.log('🎧 Adding audio to queue for:', messageToDisplay.sender);

      // Store message for display when audio starts
      setPendingMessage(messageToDisplay);

      // Add audio to queue with callbacks for UI state management
      await audioQueue.enqueue(
        text,
        voiceID,
        messageToDisplay.sender,
        {
          onAudioStart: () => {
            console.log('▶️ Audio playback started - NOW displaying message and starting speaker animation');

            // Display the message and start speaker animation when audio actually starts
            setMessages(prev => [...prev, messageToDisplay]);
            setCurrentSpeaker(messageToDisplay.sender);
            setPendingMessage(null);
            setIsAudioPlaying(true);
            setCanSendResponse(false);

            // Log synchronization event
            if ((window as any).debugConsole) {
              (window as any).debugConsole.addLog('sync', 'Text Display Synchronized with Audio Start', {
                message: messageToDisplay.content,
                speaker: messageToDisplay.sender,
                audioStarted: true
              });
            }
          },
          onAudioEnd: () => {
            console.log('🏁 Audio playback completed - clearing speaker animation and enabling responses');

            // Clear speaker animation and re-enable responses when audio ends
            setCurrentSpeaker(null);
            setIsAudioPlaying(false);
            setCanSendResponse(true);

            // Log audio completion
            if ((window as any).debugConsole) {
              (window as any).debugConsole.addLog('sync', 'Audio Playback Completed - Response Enabled', {
                speaker: messageToDisplay.sender,
                canSendResponse: true,
                audioEnded: true
              });
            }
          }
        }
      );

      console.log('Audio queued for', messageToDisplay.sender);

    } catch (error) {
      console.error('❌ Failed to queue TTS audio:', error);

      // Fallback: show message immediately if TTS fails
      setMessages(prev => [...prev, messageToDisplay]);
      setPendingMessage(null);
      setCurrentSpeaker(null);
      setIsAudioPlaying(false);
      setCanSendResponse(true);
    }
  };

  const getAgentIdByName = (name: string): string => {
    // Exact match first
    const exactMatch = JURY_MEMBERS.find(member =>
      member.name.toLowerCase() === name.toLowerCase()
    );
    if (exactMatch) return exactMatch.id;

    // Partial match fallback
    const partialMatch = JURY_MEMBERS.find(member =>
      member.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(member.name.toLowerCase())
    );
    return partialMatch?.id || 'sarah_chen';
  };

  const filterVoiceTags = (text: string): string => {
    // Remove comprehensive voice expression tags from display text
    return text.replace(/\[(?:happy|excited|sad|angry|nervous|curious|mischievously|whispers|shouts|speaking\s+softly|pause|long\s+pause|rushed|drawn\s+out|laughs|laughs\s+harder|starts\s+laughing|wheezing|sighs|exhales|crying|clears\s+throat|gulps|gasp|snorts|French\s+accent|British\s+accent|American\s+accent|pirate\s+voice|strong\s+Russian\s+accent|awe|dramatic\s+tone|interrupting|overlapping|sarcastic|thoughtful|confident)\]/gi, '');
  };

  const sendMessage = (content: string) => {
    if (!content.trim() || !ws.current || !isConnected || !canSendResponse) {
      if (!canSendResponse) {
        console.log('⏳ Cannot send message while audio is playing. Waiting for current response to finish...');
        if ((window as any).debugConsole) {
          (window as any).debugConsole.addLog('sync', 'Message Send Blocked - Audio Playing', {
            reason: 'Audio is currently playing',
            canSendResponse: false,
            isAudioPlaying: isAudioPlaying
          });
        }
      }
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      sender: 'You',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Log message sending
    if ((window as any).debugConsole) {
      (window as any).debugConsole.addLog('sync', 'User Message Sent', {
        content: content.trim(),
        canSendResponse: canSendResponse,
        isAudioPlaying: isAudioPlaying
      });
    }

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
    if (sessionId) {
      try {
        // Stop any current audio and clear audio queue
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        }
        audioQueue.stop();

        // Reset all states
        setCurrentSpeaker(null);
        setIsAudioPlaying(false);
        setCanSendResponse(true);
        setPendingMessage(null);

        await ClarityAPI.resetConversation(sessionId);
        setMessages([]);
        initializeSession();
      } catch (error) {
        console.error('Failed to reset conversation:', error);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getJuryMemberById = (id: string): JuryMember | undefined => {
    return JURY_MEMBERS.find(member => member.id === id);
  };

  const isCurrentlySpeaking = (memberId: string): boolean => {
    if (!currentSpeaker) return false;
    const member = getJuryMemberById(memberId);
    if (!member) return false;

    return currentSpeaker.toLowerCase().includes(member.name.toLowerCase()) ||
           member.name.toLowerCase().includes(currentSpeaker.toLowerCase());
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </Link>

              <div className="flex items-center gap-3">
                <img
                  src="/favicon.png"
                  alt="Clarity Logo"
                  className="w-10 h-10"
                  onError={(e) => {
                    // Fallback if favicon not found
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg items-center justify-center hidden">
                  <span className="text-white font-bold">C</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Jury Mode</h1>
                  <p className="text-sm text-gray-600">Practice with expert judges</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar - Conversation Log */}
        <div className="w-96 bg-white border-r flex flex-col h-full">
          <div className="p-4 border-b flex-shrink-0">
            <h3 className="font-semibold text-gray-900 mb-2">Conversation Log</h3>
            <div className="text-xs text-gray-500">
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-3 p-4 pb-6">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    {message.type === 'user' ? (
                      <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                        U
                      </div>
                    ) : (
                      <>
                        {message.agentId && getJuryMemberById(message.agentId) && (
                          <img
                            src={getJuryMemberById(message.agentId)!.avatar}
                            alt={message.sender}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to initial if image fails
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        )}
                        <div
                          className="hidden w-full h-full bg-gray-200 items-center justify-center text-gray-700 text-sm font-medium"
                          style={{ display: 'none' }}
                        >
                          {message.sender.charAt(0)}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-sm text-gray-900">{message.sender}</span>
                      <span className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Jury Panel */}
          <div className="bg-white p-8 flex-shrink-0">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Expert Jury Panel</h2>
              <p className="text-gray-600">Ready to provide feedback on your presentation</p>
            </div>

            <div className="flex justify-center items-start gap-12">
              {JURY_MEMBERS.map((member) => (
                <div key={member.id} className="flex flex-col items-center text-center max-w-[140px]">
                  <div className={clsx(
                    'relative w-20 h-20 rounded-full mb-4 mx-auto transition-all duration-500 overflow-hidden flex-shrink-0',
                    isCurrentlySpeaking(member.id) && [
                      'scale-110 shadow-lg ring-4 ring-blue-400 ring-opacity-60'
                    ]
                  )}>
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to colored div with initial if image fails to load
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div
                      className={clsx(
                        'hidden w-full h-full rounded-full items-center justify-center text-2xl text-white font-bold',
                        member.color
                      )}
                      style={{ display: 'none' }}
                    >
                      {member.name.charAt(0)}
                    </div>

                    {/* Speaking Animation */}
                    {isCurrentlySpeaking(member.id) && (
                      <>
                        <div className="absolute -inset-1 bg-blue-400 rounded-full opacity-30 animate-ping"></div>
                        <div className="absolute -inset-2 bg-blue-400 rounded-full opacity-20 animate-ping animation-delay-150"></div>
                        <div className="absolute -inset-3 bg-blue-400 rounded-full opacity-10 animate-ping animation-delay-300"></div>
                      </>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className={clsx(
                      'font-semibold text-base transition-all duration-300',
                      isCurrentlySpeaking(member.id) ? 'text-blue-600' : 'text-gray-900'
                    )}>
                      {member.name}
                    </div>
                    <div className="text-sm text-gray-600 leading-tight">{member.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Presentation Area */}
          <div className="flex-1 flex flex-col justify-center items-center p-8 bg-gray-50 min-h-0 overflow-y-auto">
            <div className="max-w-2xl w-full text-center">
              {currentSpeaker ? (
                <div className="mb-8">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🎤</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{currentSpeaker}</h3>
                  <p className="text-gray-600">Ready to provide feedback on your presentation</p>
                </div>
              ) : (
                <div className="mb-8">
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Present Your Ideas</h3>
                  <p className="text-lg text-gray-600 mb-8">
                    Share your presentation with our expert jury. They'll provide valuable feedback to
                    help you improve your delivery and content.
                  </p>
                </div>
              )}

              {/* Input Area */}
              <div className="space-y-4">
                {/* Audio Status Indicator */}
                {isAudioPlaying && (
                  <div className="flex items-center justify-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-blue-700 text-sm font-medium">
                      {currentSpeaker} is speaking... Please wait to respond.
                    </span>
                  </div>
                )}

                <form onSubmit={handleTextSubmit} className="flex gap-3">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder={
                      !canSendResponse
                        ? "Please wait for the current speaker to finish..."
                        : "Share your presentation topic or start speaking..."
                    }
                    disabled={!isConnected || !canSendResponse}
                    className="flex-1 px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={!textInput.trim() || !isConnected || !canSendResponse}
                    className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!canSendResponse ? "Please wait for current speaker to finish" : "Send message"}
                  >
                    <Send size={20} />
                  </button>
                </form>

                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-gray-500 text-sm">or</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                <AudioRecorder
                  onTranscription={handleTranscription}
                  isDisabled={!isConnected || !canSendResponse}
                  className="w-full"
                  autoTranscribe={true}
                />

                {!canSendResponse && (
                  <p className="text-xs text-gray-500 text-center">
                    Voice recording is disabled while an agent is speaking
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
              <span>Initializing jury session...</span>
            </div>
          </div>
        </div>
      )}

      {/* Debug Console */}
      <DebugConsole
        isVisible={showDebugConsole}
        onToggle={() => setShowDebugConsole(!showDebugConsole)}
      />
      <DebugToggle
        onToggle={() => setShowDebugConsole(!showDebugConsole)}
        isVisible={showDebugConsole}
      />
    </div>
  );
};