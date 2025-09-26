// src/services/audioService.ts
// Audio recording and playback service for Clarity app

import { AudioRecording } from '@/types';

export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];

  async startRecording(): Promise<void> {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Try different mime types for browser compatibility
      let mimeType = 'audio/webm;codecs=opus';

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        const supportedTypes = [
          'audio/webm',
          'audio/mp4',
          'audio/mp4;codecs=mp4a.40.2',
          'audio/mpeg',
          'audio/wav'
        ];

        mimeType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
        console.log('Using MIME type:', mimeType);
      }

      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType: mimeType
      });

      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      this.mediaRecorder.start(1000); // Collect data every second
      console.log('Recording started with MIME type:', mimeType);
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw new Error(`Failed to start recording: ${error}`);
    }
  }

  async stopRecording(): Promise<AudioRecording> {
    if (!this.mediaRecorder) {
      throw new Error('No recording in progress');
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder not initialized'));
        return;
      }

      const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
      console.log('Stopping recording with MIME type:', mimeType);

      this.mediaRecorder.onstop = () => {
        try {
          if (this.recordedChunks.length === 0) {
            reject(new Error('No audio data recorded'));
            return;
          }

          const audioBlob = new Blob(this.recordedChunks, { type: mimeType });
          const duration = this.calculateDuration(audioBlob);

          console.log('Recording completed:', {
            blobSize: audioBlob.size,
            duration: duration,
            mimeType: mimeType
          });

          // Clean up
          this.cleanup();

          resolve({
            blob: audioBlob,
            duration
          });
        } catch (error) {
          console.error('Error creating audio blob:', error);
          reject(error);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder stop error:', event);
        reject(new Error('Recording failed to stop properly'));
      };

      this.mediaRecorder.stop();
    });
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  private calculateDuration(blob: Blob): number {
    // This is an approximation - real duration would require decoding the audio
    const bytesPerSecond = 16000; // Approximate for compressed audio
    return Math.round((blob.size / bytesPerSecond) * 100) / 100;
  }

  private cleanup(): void {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }

  // Convert webm to wav for better compatibility
  async convertToWav(webmBlob: Blob): Promise<Blob> {
    // For now, return the original blob
    // In a production app, you might want to use a library like 'web-audio-api'
    // to convert to WAV format for better backend compatibility
    return webmBlob;
  }

  // Create audio file from blob for upload
  createAudioFile(audioBlob: Blob, filename?: string): File {
    // Determine file extension based on blob type
    const mimeType = audioBlob.type || 'audio/webm';
    let extension = '.webm';

    if (mimeType.includes('mp4')) {
      extension = '.mp4';
    } else if (mimeType.includes('mpeg')) {
      extension = '.mp3';
    } else if (mimeType.includes('wav')) {
      extension = '.wav';
    }

    const fileName = filename || `recording-${Date.now()}${extension}`;
    console.log('Creating audio file:', { fileName, mimeType, size: audioBlob.size });

    return new File([audioBlob], fileName, {
      type: mimeType
    });
  }

  // Play audio from URL or blob with comprehensive completion tracking
  async playAudio(source: string | Blob, onEnded?: () => void): Promise<HTMLAudioElement> {
    const audio = new Audio();

    if (typeof source === 'string') {
      audio.src = source;
    } else {
      audio.src = URL.createObjectURL(source);
    }

    // Track audio playback events
    const startTime = performance.now();
    console.log('🎵 Starting audio playback at:', new Date().toISOString());

    // Add comprehensive event listeners
    audio.addEventListener('loadstart', () => {
      console.log('📥 Audio loading started');
    });

    audio.addEventListener('loadedmetadata', () => {
      console.log('📊 Audio metadata loaded - Duration:', audio.duration, 'seconds');
    });

    audio.addEventListener('canplay', () => {
      console.log('✅ Audio can start playing');
    });

    audio.addEventListener('play', () => {
      const playTime = performance.now();
      console.log('▶️ Audio playback started - Setup time:', Math.round(playTime - startTime), 'ms');
    });

    audio.addEventListener('ended', () => {
      const endTime = performance.now();
      const actualDuration = (endTime - startTime) / 1000;
      console.log('🏁 Audio playback completed');
      console.log('⏱️ Actual playback duration:', Math.round(actualDuration * 100) / 100, 'seconds');
      console.log('📊 Expected duration:', audio.duration, 'seconds');

      if (onEnded) {
        onEnded();
      }
    });

    audio.addEventListener('pause', () => {
      console.log('⏸️ Audio paused at:', audio.currentTime, 'seconds');
    });

    audio.addEventListener('error', (e) => {
      console.error('❌ Audio playback error:', e);
    });

    // Clean up object URL when audio ends (if created from blob)
    if (typeof source !== 'string') {
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(audio.src);
        console.log('🧹 Cleaned up audio object URL');
      });
    }

    try {
      await audio.play();
      return audio;
    } catch (error) {
      console.error('❌ Failed to start audio playback:', error);
      throw error;
    }
  }

  // Check if browser supports audio recording
  static isRecordingSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && MediaRecorder);
  }

  // Get available audio input devices
  static async getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Error getting audio devices:', error);
      return [];
    }
  }
}

// Background audio player for environment sounds
export class BackgroundAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private isPlaying = false;

  async loadEnvironmentAudio(audioBlob: Blob): Promise<void> {
    if (this.audio) {
      this.stop();
    }

    try {
      // Validate that we have a valid audio blob
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Invalid audio blob: empty or null');
      }

      // Create object URL and audio element
      const audioUrl = URL.createObjectURL(audioBlob);
      this.audio = new Audio(audioUrl);
      this.audio.loop = true;
      this.audio.volume = 0.15; // Keep background audio quiet
      this.audio.preload = 'metadata';

      // Wait for metadata to load to validate the audio
      await new Promise((resolve, reject) => {
        if (!this.audio) return reject(new Error('Audio element not created'));

        this.audio.onloadedmetadata = resolve;
        this.audio.onerror = (e) => reject(new Error(`Audio load error: ${e}`));

        // Set a timeout for loading
        setTimeout(() => reject(new Error('Audio loading timeout')), 10000);
      });

      console.log('✅ Background audio loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load background audio:', error);
      throw error;
    }
  }

  async play(): Promise<void> {
    if (!this.audio) {
      throw new Error('No audio loaded');
    }

    if (this.isPlaying) {
      console.log('Audio is already playing');
      return;
    }

    try {
      await this.audio.play();
      this.isPlaying = true;
      console.log('✅ Background audio started playing');
    } catch (error) {
      console.error('❌ Failed to play background audio:', error);

      // Check if it's an autoplay policy error
      if (error instanceof Error && error.name === 'NotAllowedError') {
        throw new Error('Audio autoplay was blocked by browser. User interaction is required to start audio.');
      }

      throw error;
    }
  }

  pause(): void {
    if (this.audio && this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      URL.revokeObjectURL(this.audio.src);
      this.audio = null;
      this.isPlaying = false;
    }
  }

  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}