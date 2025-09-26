// src/types/index.ts
// TypeScript type definitions for Clarity app

export interface Agent {
  name: string;
  persona: string;
  gender: 'male' | 'female' | 'neutral';
  voice_id: string;
  avatar_url?: string;
}

export interface ConversationSession {
  session_id: string;
  mode: 'presentation-jury-mode' | 'environment';
  environment_type?: string;
  agents: Agent[];
  background_audio_enabled: boolean;
}

export interface AgentMessage {
  type: 'agent_message' | 'system_message' | 'user_message';
  agent_name: string;
  message: string;
  agent_gender: 'male' | 'female' | 'neutral';
  voice_id?: string;
  timestamp: string;
  audio_url?: string;
}

export interface AudioRecording {
  blob: Blob;
  duration: number;
  transcription_id?: string;
}

export interface TranscriptionResult {
  transcription_id: string;
  status: 'processing' | 'completed' | 'failed';
  text?: string;
  language_code?: string;
}

export interface WebSocketMessage {
  type: string;
  content?: string;
  agent_name?: string;
  message?: string;
  agent_gender?: string;
  voice_id?: string;
  timestamp?: string;
  audio_url?: string;
  user_name?: string;
}

export interface ConversationMode {
  id: 'presentation-jury-mode' | 'environment';
  name: string;
  description: string;
  background_audio: boolean;
  environments?: string[];
}