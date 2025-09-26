// src/components/AudioRecorder.tsx
// Audio recording component with visual feedback and transcription

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Square, Play, Pause, Upload } from 'lucide-react';
import { AudioService } from '@/services/audioService';
import elevenLabsService from '@/services/elevenLabsService';
import { AudioRecording } from '@/types';
import { clsx } from 'clsx';

interface AudioRecorderProps {
  onTranscription?: (text: string) => void;
  onRecordingComplete?: (recording: AudioRecording) => void;
  isDisabled?: boolean;
  className?: string;
  autoTranscribe?: boolean; // New prop to enable auto transcription and send
}

export function AudioRecorder({
  onTranscription,
  onRecordingComplete,
  isDisabled = false,
  className,
  autoTranscribe = false
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<AudioRecording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcriptionStatus, setTranscriptionStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');

  const audioService = useRef(new AudioService());
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const startTime = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  const startRecording = async () => {
    if (!AudioService.isRecordingSupported()) {
      alert('Audio recording is not supported in your browser. Please use Chrome, Firefox, or Safari.');
      return;
    }

    try {
      console.log('Attempting to start audio recording...');
      await audioService.current.startRecording();
      setIsRecording(true);
      setRecordingDuration(0);
      startTime.current = Date.now();

      // Update duration every 100ms
      durationInterval.current = setInterval(() => {
        setRecordingDuration((Date.now() - startTime.current) / 1000);
      }, 100);

      console.log('✅ Recording started successfully');

    } catch (error) {
      console.error('Failed to start recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        alert('Microphone access denied. Please allow microphone permissions and try again.');
      } else if (errorMessage.includes('NotFoundError')) {
        alert('No microphone found. Please connect a microphone and try again.');
      } else if (errorMessage.includes('NotReadableError')) {
        alert('Microphone is already in use by another application. Please close other applications and try again.');
      } else {
        alert(`Failed to start recording: ${errorMessage}`);
      }
    }
  };

  const stopRecording = async () => {
    try {
      const recording = await audioService.current.stopRecording();
      setIsRecording(false);
      setCurrentRecording(recording);
      setRecordingDuration(recording.duration);

      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      onRecordingComplete?.(recording);

      // Auto-transcribe if enabled
      if (autoTranscribe) {
        console.log('🎤 Auto-transcribing recording...');
        await autoTranscribeAndSend(recording);
      }

    } catch (error) {
      console.error('Failed to stop recording:', error);
      alert('Failed to stop recording');
    }
  };

  const playRecording = async () => {
    if (!currentRecording) return;

    try {
      setIsPlaying(true);
      await audioService.current.playAudio(currentRecording.blob, () => {
        setIsPlaying(false);
      });
    } catch (error) {
      console.error('Failed to play recording:', error);
      setIsPlaying(false);
    }
  };

  const uploadAndTranscribe = async () => {
    if (!currentRecording) return;

    setIsProcessing(true);
    setTranscriptionStatus('processing');

    try {
      // Create audio file from blob
      const audioFile = audioService.current.createAudioFile(currentRecording.blob);

      // Use ElevenLabs SDK directly for speech-to-text
      const transcriptText = await elevenLabsService.convertSpeechToText(audioFile);

      if (transcriptText) {
        setTranscriptionStatus('completed');
        onTranscription?.(transcriptText);
      } else {
        setTranscriptionStatus('error');
        console.error('No transcription text received');
      }

    } catch (error) {
      console.error('Transcription error:', error);
      setTranscriptionStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const autoTranscribeAndSend = async (recording: AudioRecording) => {
    setIsProcessing(true);
    setTranscriptionStatus('processing');

    try {
      console.log('🔄 Auto-transcribing audio...');

      // Create audio file from blob
      const audioFile = audioService.current.createAudioFile(recording.blob);

      // Use ElevenLabs SDK directly for speech-to-text
      const transcriptText = await elevenLabsService.convertSpeechToText(audioFile);

      if (transcriptText && transcriptText.trim()) {
        console.log('✅ Auto-transcription completed:', transcriptText);
        setTranscriptionStatus('completed');

        // Automatically send the transcribed text
        onTranscription?.(transcriptText);

        // Clear the recording after successful transcription and send
        setTimeout(() => {
          clearRecording();
        }, 1500); // Give user time to see the success message

      } else {
        setTranscriptionStatus('error');
        console.error('No transcription text received or empty transcript');
      }

    } catch (error) {
      console.error('Auto-transcription error:', error);
      setTranscriptionStatus('error');
      // Keep the recording so user can try manual transcription
    } finally {
      setIsProcessing(false);
    }
  };

  const clearRecording = () => {
    setCurrentRecording(null);
    setRecordingDuration(0);
    setTranscriptionStatus('idle');
    setIsPlaying(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={clsx('flex flex-col items-center gap-4 p-4 bg-white rounded-xl shadow-lg', className)}>
      {/* Recording Status */}
      <div className="text-center">
        {isRecording && (
          <div className="flex items-center gap-2 text-red-600 font-medium">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            Recording... {formatDuration(recordingDuration)}
          </div>
        )}

        {currentRecording && !isRecording && (
          <div className="text-gray-600">
            Recorded {formatDuration(recordingDuration)}
          </div>
        )}

        {transcriptionStatus !== 'idle' && (
          <div className="text-sm mt-2">
            {transcriptionStatus === 'processing' && (
              <span className="text-yellow-600">Converting speech to text...</span>
            )}
            {transcriptionStatus === 'completed' && (
              <span className="text-green-600">✅ Transcription completed!</span>
            )}
            {transcriptionStatus === 'error' && (
              <span className="text-red-600">❌ Transcription failed</span>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!isRecording && !currentRecording && (
          <button
            onClick={startRecording}
            disabled={isDisabled || isProcessing}
            className={clsx(
              'flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all',
              'bg-teal-500 text-white hover:bg-blue-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'shadow-lg hover:shadow-xl transform hover:scale-105'
            )}
          >
            <Mic size={20} />
            {autoTranscribe ? 'Hold to Speak' : 'Start Recording'}
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-medium bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg"
          >
            <Square size={20} />
            {autoTranscribe ? 'Send Message' : 'Stop Recording'}
          </button>
        )}

        {/* Manual controls only shown when autoTranscribe is false */}
        {currentRecording && !isRecording && !autoTranscribe && (
          <>
            <button
              onClick={playRecording}
              disabled={isPlaying || isProcessing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              {isPlaying ? 'Playing...' : 'Play'}
            </button>

            <button
              onClick={uploadAndTranscribe}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              <Upload size={18} />
              {isProcessing ? 'Processing...' : 'Transcribe'}
            </button>

            <button
              onClick={clearRecording}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg bg-gray-400 text-white hover:bg-gray-500 transition-colors disabled:opacity-50"
            >
              Clear
            </button>
          </>
        )}

        {/* Auto-transcribe mode: show processing status */}
        {currentRecording && !isRecording && autoTranscribe && (
          <div className="flex items-center gap-2 text-sm">
            {isProcessing && (
              <span className="text-blue-600">
                🔄 Sending message...
              </span>
            )}
            {transcriptionStatus === 'completed' && (
              <span className="text-green-600">
                ✅ Message sent!
              </span>
            )}
            {transcriptionStatus === 'error' && (
              <span className="text-red-600">
                ❌ Failed to send
              </span>
            )}
          </div>
        )}
      </div>

      {/* Recording Visualization */}
      {isRecording && (
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-teal-500 rounded-full animate-pulse"
              style={{
                height: `${20 + Math.random() * 20}px`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Permission Check */}
      {!AudioService.isRecordingSupported() && (
        <div className="text-center text-sm text-gray-500 bg-gray-100 p-3 rounded-lg">
          <MicOff size={16} className="inline mr-2" />
          Audio recording not supported in this browser
        </div>
      )}
    </div>
  );
}