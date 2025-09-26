// src/services/audioQueue.ts
// Audio queue service to manage sequential TTS playback

interface AudioQueueItem {
  text: string;
  voiceId: string;
  agentName: string;
  id: string;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
}

class AudioQueueService {
  private queue: AudioQueueItem[] = [];
  private isPlaying: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;

  /**
   * Add audio to the queue for sequential playback
   */
  async enqueue(
    text: string,
    voiceId: string,
    agentName: string,
    callbacks?: { onAudioStart?: () => void; onAudioEnd?: () => void }
  ): Promise<void> {
    const id = Math.random().toString(36).substring(7);

    const item: AudioQueueItem = {
      text,
      voiceId,
      agentName,
      id,
      onAudioStart: callbacks?.onAudioStart,
      onAudioEnd: callbacks?.onAudioEnd
    };

    this.queue.push(item);
    console.log(`Added audio to queue for ${agentName}: ${text.substring(0, 50)}...`);

    // Start processing if not already playing
    if (!this.isPlaying) {
      this.processQueue();
    }
  }

  /**
   * Process the audio queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isPlaying || this.queue.length === 0) {
      return;
    }

    this.isPlaying = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        console.log(`Playing audio for ${item.agentName}: ${item.text.substring(0, 50)}...`);
        await this.playAudio(item);
        console.log(`Finished playing audio for ${item.agentName}`);

        // Short pause between audio clips
        await this.delay(500);
      } catch (error) {
        console.error(`Failed to play audio for ${item.agentName}:`, error);
        // Continue with next item even if current one fails
      }
    }

    this.isPlaying = false;
  }

  /**
   * Play a single audio item
   */
  private async playAudio(item: AudioQueueItem): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Import ElevenLabs service dynamically to avoid circular imports
        const elevenLabsService = (await import('./elevenLabsService')).default;

        // Get appropriate voice for agent
        const voiceId = item.voiceId ?? elevenLabsService.getVoiceForAgent(item.agentName);

        // Generate TTS audio
        const audioBuffer = await elevenLabsService.convertTextToSpeech(item.text, voiceId);

        // Create audio URL and play
        const audioUrl = elevenLabsService.createAudioUrl(audioBuffer);
        const audio = new Audio(audioUrl);

        this.currentAudio = audio;

        // Call onAudioStart callback when audio starts playing
        audio.addEventListener('play', () => {
          if (item.onAudioStart) {
            item.onAudioStart();
          }
        });

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;

          // Call onAudioEnd callback when audio ends
          if (item.onAudioEnd) {
            item.onAudioEnd();
          }

          resolve();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;

          // Call onAudioEnd callback even on error
          if (item.onAudioEnd) {
            item.onAudioEnd();
          }

          reject(new Error(`Failed to play audio for ${item.agentName}`));
        };

        await audio.play();
      } catch (error) {
        this.currentAudio = null;
        reject(error);
      }
    });
  }

  /**
   * Stop current audio and clear queue
   */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.queue = [];
    this.isPlaying = false;
    console.log('Audio queue stopped and cleared');
  }

  /**
   * Get queue status
   */
  getStatus(): { isPlaying: boolean; queueLength: number } {
    return {
      isPlaying: this.isPlaying,
      queueLength: this.queue.length
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const audioQueue = new AudioQueueService();
export default audioQueue;