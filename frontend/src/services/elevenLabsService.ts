// src/services/elevenLabsService.ts
// ElevenLabs TypeScript SDK service for handling TTS, STT, and Sound Effects

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

class ElevenLabsService {
  private client: ElevenLabsClient;
  private apiKey: string;

  constructor() {
    // Get API key from environment variables
    this.apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

    if (!this.apiKey) {
      console.error('ELEVENLABS_API_KEY not found in environment variables');
      console.log('Available env vars:', Object.keys(import.meta.env));
      throw new Error('ElevenLabs API key is required');
    }

    console.log('🔑 ElevenLabs API key loaded:', this.apiKey.substring(0, 8) + '...');

    // Initialize ElevenLabs client
    this.client = new ElevenLabsClient({
      apiKey: this.apiKey,
      environment: "https://api.elevenlabs.io"
    });

    console.log('🚀 ElevenLabs client initialized');
  }

  // Speech-to-Text workflow: record → create transcript → get result
  async convertSpeechToText(audioFile: File): Promise<string> {
    try {
      console.log('🎤 Starting speech-to-text conversion...');

      const fileDetails = {
        name: audioFile.name,
        size: audioFile.size,
        type: audioFile.type
      };
      console.log('📁 Audio file details:', fileDetails);

      // Add to debug console
      if ((window as any).debugConsole) {
        (window as any).debugConsole.addLog('stt', 'STT Request Started', {
          audioFile: fileDetails,
          model: 'scribe_v1'
        });
      }

      // Step 1: Create transcript (using correct parameter names)
      const transcriptResult = await this.client.speechToText.convert({
        modelId: 'scribe_v1',  // Note: modelId not model_id
        file: audioFile,
        languageCode: 'en',    // Note: languageCode not language_code
        numSpeakers: 1,
        diarize: false,
        tagAudioEvents: true
      });

      console.log('✅ Speech-to-text conversion completed');
      console.log('🔍 Raw API Response:', JSON.stringify(transcriptResult, null, 2));

      // Add to debug console
      if ((window as any).debugConsole) {
        (window as any).debugConsole.addLog('stt', 'STT Response Received', transcriptResult);
      }

      // Handle response based on format
      if (typeof transcriptResult === 'object' && transcriptResult.text) {
        return transcriptResult.text;
      } else if (typeof transcriptResult === 'string') {
        return transcriptResult;
      } else {
        console.warn('Unexpected response format:', transcriptResult);
        return 'Speech conversion completed';
      }

    } catch (error) {
      console.error('❌ Speech-to-text conversion failed:', error);
      throw error;
    }
  }

  // Text-to-Speech conversion
  async convertTextToSpeech(text: string, voiceId?: string): Promise<ArrayBuffer> {
    try {
      console.log('🔊 Converting text to speech...');
      console.log('📝 Input text:', text);
      console.log('🎭 Voice ID:', voiceId);

      // Use default voice if none provided
      const defaultVoiceId = voiceId || '5Q0t7uMcjvnagumLfvZi'; // Bella

      // Extract voice expression tags from text
      const voiceTagMatches = text.match(/\[(?:laughs|whispers|sighs|sarcastic|curious|excited|crying|starts laughing|wheezing|snorts|mischievously)\]/gi) || [];
      const hasVoiceTags = voiceTagMatches.length > 0;
      console.log('🎬 Voice expression tags detected:', hasVoiceTags, voiceTagMatches);

      // Add to debug console
      if ((window as any).debugConsole) {
        (window as any).debugConsole.addLog('tts', 'TTS Request Started (Non-Streaming)', {
          inputText: text,
          voiceId: defaultVoiceId,
          model: 'eleven_v3',
          voiceTags: voiceTagMatches,
          endpoint: '/v1/text-to-speech/{voice_id}',
          method: 'non-streaming',
          voiceSettings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true
          }
        }, voiceTagMatches);
      }

      // Use direct fetch API instead of SDK streaming for better voice expression support
      console.log('🔧 Using non-streaming API for voice expressions...');

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${defaultVoiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_v3',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ TTS API Error:', response.status, errorText);
        throw new Error(`TTS API failed: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      const audioBuffer = await audioBlob.arrayBuffer();

      // Validate audio buffer
      if (audioBuffer.byteLength === 0) {
        throw new Error('Received empty audio buffer from ElevenLabs API');
      }

      // Calculate estimated audio duration
      const estimatedDuration = this.calculateAudioDuration(audioBuffer);

      console.log('✅ Audio generated successfully (non-streaming), size:', audioBuffer.byteLength, 'bytes');
      console.log('🕐 Estimated audio duration:', estimatedDuration, 'seconds');

      // Add to debug console
      if ((window as any).debugConsole) {
        (window as any).debugConsole.addLog('tts', 'TTS Response Completed (Non-Streaming)', {
          audioSize: audioBuffer.byteLength,
          estimatedDuration: estimatedDuration,
          success: true,
          hasVoiceTags: hasVoiceTags,
          endpoint: '/v1/text-to-speech/{voice_id}',
          method: 'non-streaming',
          voiceSettings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true
          }
        }, voiceTagMatches);
      }

      console.log('✅ Text-to-speech conversion completed (non-streaming)');
      return audioBuffer;

    } catch (error) {
      console.error('❌ Text-to-speech conversion failed:', error);

      // Add error to debug console
      if ((window as any).debugConsole) {
        (window as any).debugConsole.addLog('error', 'TTS Conversion Failed (Non-Streaming)', {
          error: error instanceof Error ? error.message : error,
          text: text,
          voiceId: voiceId,
          endpoint: '/v1/text-to-speech/{voice_id}',
          method: 'non-streaming'
        });
      }

      throw error;
    }
  }

  // Generate background environment audio using Sound Effects
  async generateEnvironmentAudio(environmentType: string): Promise<ArrayBuffer> {
    try {
      console.log(`🌍 Generating ${environmentType} environment audio...`);

      // Environment prompts
      const environmentPrompts = {
        school: 'Lively school hallway with students talking and laughing in background',
        office: 'Subtle office environment with air conditioning and distant conversations',
        cafe: 'Cozy cafe atmosphere with coffee machine sounds and gentle chatter',
        park: 'Peaceful outdoor park with gentle breeze and distant birds'
      };

      const prompt = environmentPrompts[environmentType as keyof typeof environmentPrompts]
        || environmentPrompts.school;

      console.log('🔧 Attempting sound effects generation...');

      // Try sound effects API first
      try {
        const soundEffectStream = await this.client.textToSoundEffects.convert({
          text: prompt,
          duration_seconds: 10,
          loop: true,
          model_id: 'eleven_text_to_sound_v2'
        });

        // Convert ReadableStream to ArrayBuffer
        const reader = soundEffectStream.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        // Combine all chunks into a single ArrayBuffer
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const soundEffectBuffer = new Uint8Array(totalLength);
        let offset = 0;

        for (const chunk of chunks) {
          soundEffectBuffer.set(chunk, offset);
          offset += chunk.length;
        }

        const soundEffect = soundEffectBuffer.buffer;

        console.log('✅ Sound effects generation completed');
        console.log('🔍 Response type:', typeof soundEffect);
        console.log('🔍 Audio buffer size:', soundEffect?.byteLength || 'unknown');

        // Validate sound effects response
        if (soundEffect && soundEffect instanceof ArrayBuffer && soundEffect.byteLength > 1000) {
          console.log('✅ Valid sound effects audio received');
          return soundEffect;
        }

        // If sound effects failed or returned small response, fall back
        console.log('⚠️ Sound effects API unavailable or returned error, using fallback...');
        throw new Error('Sound effects not available');

      } catch (soundEffectsError) {
        console.log('🔄 Sound effects API not available - this likely requires a paid subscription');
        throw new Error(`Sound effects generation failed: ${soundEffectsError}. This feature may require an ElevenLabs subscription with sound effects access.`);
      }

    } catch (error) {
      console.error('❌ Environment audio generation failed:', error);
      throw error;
    }
  }

  // Get available voices
  async getVoices() {
    try {
      console.log('🎭 Fetching available voices...');

      const voices = await this.client.voices.search({
        page_size: 50
      });

      console.log('✅ Voices fetched successfully');
      return voices;

    } catch (error) {
      console.error('❌ Failed to fetch voices:', error);
      throw error;
    }
  }

  // Voice mappings for different agent personas
  getVoiceForAgent(agentName: string): string {
    const voiceMappings = {
      'Sarah Chen': 'v3V1d2rk6528UrLKRuy8',    // Bella (female)
      'max': 'TxGEqnHWrfWFTfGW9XjX',    // Josh (male)
      'emma_friendly': 'MF3mGyEYCl7XYWbV9V6O', // Elli (female)
      'alex_professional': 'pNInz6obpgDQGcFmaJgB', // Adam (male)
      'sarah_chen': 'EXAVITQu4vr4xnSDxMaL',    // Bella (female)
      'alex_rodriguez': 'pNInz6obpgDQGcFmaJgB', // Adam (male)
      'emma_watson': 'MF3mGyEYCl7XYWbV9V6O',  // Elli (female)
      'Alex Thompson': '5Q0t7uMcjvnagumLfvZi',            // Josh (male)
      'luna': 'MF3mGyEYCl7XYWbV9V6O',          // Elli (female)
      'jordan': 'EXAVITQu4vr4xnSDxMaL',        // Bella (neutral)
      'Marcus Rodriguez': 'D38z5RcWu1voky8WS1ja',     // Adam (male)
      'maria_garcia': 'EXAVITQu4vr4xnSDxMaL'   // Bella (female)
    };

    const normalizedName = agentName.toLowerCase().replace(/\s+/g, '_');

    return voiceMappings[normalizedName as keyof typeof voiceMappings]
      || voiceMappings.sarah_chen; // Default fallback
  }

  // Audio playback utility with completion tracking
  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      const startTime = performance.now();
      console.log('🎵 Starting Web Audio API playback at:', new Date().toISOString());

      const audioContext = new AudioContext();
      const decodedBuffer = await audioContext.decodeAudioData(audioBuffer);
      const source = audioContext.createBufferSource();

      const duration = decodedBuffer.duration;
      console.log('📊 Decoded audio duration:', Math.round(duration * 100) / 100, 'seconds');

      source.buffer = decodedBuffer;
      source.connect(audioContext.destination);

      // Track when audio ends
      source.addEventListener('ended', () => {
        const endTime = performance.now();
        const actualDuration = (endTime - startTime) / 1000;
        console.log('🏁 Web Audio API playback completed');
        console.log('⏱️ Actual playback duration:', Math.round(actualDuration * 100) / 100, 'seconds');
        console.log('📊 Expected duration:', Math.round(duration * 100) / 100, 'seconds');

        // Close audio context to free resources
        audioContext.close();
        console.log('🧹 AudioContext closed');
      });

      source.start();
      const playStartTime = performance.now();
      console.log('▶️ Web Audio API playback started - Setup time:', Math.round(playStartTime - startTime), 'ms');

    } catch (error) {
      console.error('❌ Web Audio API playback failed:', error);
      throw error;
    }
  }

  // Create audio blob for download/playback
  createAudioBlob(audioBuffer: ArrayBuffer): Blob {
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      throw new Error('Cannot create blob from empty audio buffer');
    }

    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    console.log('🔍 Created audio blob, size:', blob.size, 'bytes');
    return blob;
  }

  // Create audio URL for HTML audio element
  createAudioUrl(audioBuffer: ArrayBuffer): string {
    const blob = this.createAudioBlob(audioBuffer);
    return URL.createObjectURL(blob);
  }

  // Calculate estimated audio duration for MP3 based on file size
  // Based on ElevenLabs output format: mp3_44100_128 (44.1kHz, 128kbps)
  calculateAudioDuration(audioBuffer: ArrayBuffer): number {
    // MP3 at 128 kbps (kilobits per second)
    // 128 kbps = 128,000 bits per second = 16,000 bytes per second
    const bitrate = 128000; // bits per second
    const bytesPerSecond = bitrate / 8; // convert to bytes per second

    const fileSizeBytes = audioBuffer.byteLength;
    const durationSeconds = fileSizeBytes / bytesPerSecond;

    // Round to 2 decimal places
    return Math.round(durationSeconds * 100) / 100;
  }

}

// Export singleton instance
export const elevenLabsService = new ElevenLabsService();
export default elevenLabsService;