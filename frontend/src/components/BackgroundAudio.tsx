// src/components/BackgroundAudio.tsx
// Background audio player for environment mode

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Settings } from 'lucide-react';
import { BackgroundAudioPlayer } from '@/services/audioService';
import elevenLabsService from '@/services/elevenLabsService';
import { clsx } from 'clsx';

interface BackgroundAudioProps {
  environmentType: string;
  isEnabled: boolean;
  onError?: (error: string) => void;
  className?: string;
}

export function BackgroundAudio({
  environmentType,
  isEnabled,
  onError,
  className
}: BackgroundAudioProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(0.15);
  const [showControls, setShowControls] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioPlayer = useRef(new BackgroundAudioPlayer());

  useEffect(() => {
    if (isEnabled && environmentType) {
      loadEnvironmentAudio();
    } else {
      stopAudio();
    }

    return () => {
      audioPlayer.current.stop();
    };
  }, [environmentType, isEnabled]);

  const loadEnvironmentAudio = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate environment audio using ElevenLabs Sound Effects
      const audioBuffer = await elevenLabsService.generateEnvironmentAudio(environmentType);
      const audioBlob = elevenLabsService.createAudioBlob(audioBuffer);

      // Validate blob
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Generated audio is empty or invalid');
      }

      await audioPlayer.current.loadEnvironmentAudio(audioBlob);
      setIsLoading(false);

      // Don't auto-start - user needs to manually start background audio
      console.log('🎵 Environment audio ready. Click play to start.');
    } catch (err) {
      let errorMessage = `Failed to load ${environmentType} environment audio`;

      // Check if it's a sound effects subscription issue
      if (err instanceof Error && err.message.includes('subscription')) {
        errorMessage = 'Background audio requires ElevenLabs subscription with sound effects access';
      }

      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
      console.error('Background audio error:', err);
    }
  };

  const playAudio = async () => {
    try {
      await audioPlayer.current.play();
      setIsPlaying(true);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Failed to play background audio:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to play background audio';
      setError(errorMessage);

      // If it's an autoplay issue, provide user feedback
      if (errorMessage.includes('User interaction is required')) {
        setError('Click the play button to start background audio');
      }
    }
  };

  const pauseAudio = () => {
    audioPlayer.current.pause();
    setIsPlaying(false);
  };

  const stopAudio = () => {
    audioPlayer.current.stop();
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    audioPlayer.current.setVolume(newVolume);
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <div className={clsx(
      'fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3',
      'transition-all duration-300 hover:bg-white/95',
      className
    )}>
      <div className="flex items-center gap-3">
        {/* Environment Info */}
        <div className="text-sm">
          <div className="font-medium text-gray-700 capitalize">
            {environmentType.replace('_', ' ')} Ambience
          </div>
          {isLoading && <div className="text-gray-500">Loading...</div>}
          {error && <div className="text-red-500 text-xs">{error}</div>}
        </div>

        {/* Play/Pause Control */}
        <button
          onClick={togglePlayPause}
          disabled={isLoading || !!error}
          className={clsx(
            'p-2 rounded-full transition-colors',
            'hover:bg-primary-teal/10',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            isPlaying ? 'text-primary-teal' : 'text-gray-600'
          )}
          title={isPlaying ? 'Pause background audio' : 'Play background audio'}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-primary-teal rounded-full animate-spin" />
          ) : isPlaying ? (
            <Volume2 size={20} />
          ) : (
            <VolumeX size={20} />
          )}
        </button>

        {/* Settings Toggle */}
        <button
          onClick={() => setShowControls(!showControls)}
          className={clsx(
            'p-2 rounded-full transition-colors',
            'hover:bg-gray-100',
            showControls ? 'text-primary-teal' : 'text-gray-400'
          )}
          title="Audio settings"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Volume Control (expandable) */}
      {showControls && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 min-w-[50px]">Volume:</span>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer volume-slider"
            />
            <span className="text-xs text-gray-600 min-w-[30px]">
              {Math.round(volume * 200)}%
            </span>
          </div>

          <div className="mt-2 text-xs text-gray-500 text-center">
            Background audio helps create immersive conversations
          </div>
        </div>
      )}

    </div>
  );
}

// Environment selector component
interface EnvironmentSelectorProps {
  availableEnvironments: string[];
  selectedEnvironment: string;
  onEnvironmentChange: (environment: string) => void;
  className?: string;
}

export function EnvironmentSelector({
  availableEnvironments,
  selectedEnvironment,
  onEnvironmentChange,
  className
}: EnvironmentSelectorProps) {
  const environmentLabels: { [key: string]: string } = {
    'school': '🏫 School Hallway',
    'office': '🏢 Professional Office',
    'cafe': '☕ Cozy Cafe',
    'park': '🌳 Nature Park',
    'library': '📚 Library',
    'tech_office': '💻 Tech Office'
  };

  return (
    <div className={clsx('flex flex-wrap gap-2', className)}>
      <span className="text-sm text-gray-600 font-medium">Environment:</span>
      {availableEnvironments.map(env => (
        <button
          key={env}
          onClick={() => onEnvironmentChange(env)}
          className={clsx(
            'px-3 py-1 rounded-full text-sm transition-colors',
            selectedEnvironment === env
              ? 'bg-primary-teal text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          )}
        >
          {environmentLabels[env] || env.replace('_', ' ')}
        </button>
      ))}
    </div>
  );
}