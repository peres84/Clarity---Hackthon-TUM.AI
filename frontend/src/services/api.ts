// src/services/api.ts
// API service for communicating with Clarity backend

import { ConversationSession, TranscriptionResult, WebSocketMessage } from '@/types';

const API_BASE_URL = 'http://localhost:8000';
const WS_BASE_URL = 'ws://localhost:8000';

export class ClarityAPI {

  static async createSession(mode: string, environment_type?: string, user_name?: string): Promise<ConversationSession> {
    const response = await fetch(`${API_BASE_URL}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode,
        user_name,
        environment_type
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return await response.json();
  }

  static async uploadAudio(audioFile: File): Promise<{ transcription_id: string; status: string }> {
    const formData = new FormData();
    formData.append('file', audioFile);

    const response = await fetch(`${API_BASE_URL}/upload_audio`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload audio: ${response.statusText}`);
    }

    return await response.json();
  }

  static async getTranscription(transcriptionId: string): Promise<TranscriptionResult> {
    const response = await fetch(`${API_BASE_URL}/transcript/${transcriptionId}`);

    if (!response.ok) {
      throw new Error(`Failed to get transcription: ${response.statusText}`);
    }

    return await response.json();
  }

  static async sendMessage(message: string, sessionId?: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        session_id: sessionId
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    return await response.json();
  }

  static async resetConversation(sessionId?: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to reset conversation: ${response.statusText}`);
    }

    return await response.json();
  }

  static createWebSocket(sessionId: string): WebSocket {
    return new WebSocket(`${WS_BASE_URL}/ws/${sessionId}`);
  }

  static async getEnvironmentAudio(environmentType: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/environment_audio/${environmentType}`);

    if (!response.ok) {
      throw new Error(`Failed to get environment audio: ${response.statusText}`);
    }

    return await response.blob();
  }

  // Poll for transcription completion
  static async pollTranscription(transcriptionId: string, maxAttempts = 30): Promise<TranscriptionResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.getTranscription(transcriptionId);

      if (result.status === 'completed' || result.status === 'failed') {
        return result;
      }

      // Wait 2 seconds before next attempt
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Transcription polling timeout');
  }
}