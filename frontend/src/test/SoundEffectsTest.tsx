// SoundEffectsTest.tsx
// Test page for ElevenLabs Sound Effects generation and background audio
//
// Fixed Issues:
// - Fixed parameter naming: duration_seconds -> durationSeconds, model_id -> modelId
// - Added proper ReadableStream handling and conversion to ArrayBuffer
// - Enhanced error handling for sound effect loading and playback
// - Added validation for sound effect buffer size

import React, { useState, useRef, useEffect } from 'react';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const SoundEffectsTest: React.FC = () => {
  const [description, setDescription] = useState('A dramatic thunderclap during a storm');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(3);
  const [isLooping, setIsLooping] = useState(false);
  const [backgroundAudios, setBackgroundAudios] = useState<{[key: string]: string}>({});
  const [currentBackground, setCurrentBackground] = useState<string | null>(null);

  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);

  const client = new ElevenLabsClient({
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || '',
  });

  // Predefined background sound descriptions
  const backgroundSounds = {
    school: 'Ambient school hallway sounds with students chatting and footsteps',
    cafe: 'Busy coffee shop ambience with chatter, coffee machines, and soft music',
    office: 'Modern office environment with keyboard typing, phone calls, and air conditioning',
    restaurant: 'Restaurant atmosphere with cutlery, conversations, and background music',
    park: 'Peaceful park sounds with birds chirping, leaves rustling, and distant voices',
    library: 'Quiet library ambience with page turning, whispers, and soft footsteps'
  };

  const generateSoundEffect = async () => {
    if (!description.trim()) {
      setError('Please enter a sound description');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);

    try {
      const soundEffectStream = await client.textToSoundEffects.convert({
        text: description,
        durationSeconds: duration,
        loop: isLooping,
        modelId: 'eleven_text_to_sound_v2',
        outputFormat: 'mp3_44100_128',
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

      // Validate sound effect buffer
      if (soundEffectBuffer.length === 0) {
        throw new Error('Received empty sound effect buffer from ElevenLabs API');
      }

      console.log('✅ Sound effect generated successfully, size:', soundEffectBuffer.length, 'bytes');

      // Convert audio buffer to blob and create URL
      const audioBlob = new Blob([soundEffectBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      // Automatically play the generated sound effect with better error handling
      setTimeout(() => {
        const audioElement = new Audio(url);
        
        audioElement.addEventListener('loadeddata', () => {
          console.log('✅ Sound effect loaded and ready to play');
        });
        
        audioElement.addEventListener('error', (e) => {
          console.error('❌ Sound effect loading error:', e);
          setError('Failed to load generated sound effect. The audio format may be unsupported.');
        });

        audioElement.play().catch(err => {
          console.log('Auto-play prevented by browser:', err);
          // Don't set this as an error since auto-play prevention is normal
        });
      }, 100);

    } catch (err) {
      console.error('Error generating sound effect:', err);
      setError('Failed to generate sound effect. Check your API key and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateBackgroundAudio = async (environment: string) => {
    setIsGenerating(true);
    setError(null);

    try {
      const soundEffectStream = await client.textToSoundEffects.convert({
        text: backgroundSounds[environment as keyof typeof backgroundSounds],
        durationSeconds: 10, // Longer duration for background
        loop: true,
        modelId: 'eleven_text_to_sound_v2',
        outputFormat: 'mp3_44100_128',
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

      const audioBlob = new Blob([soundEffectBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(audioBlob);

      setBackgroundAudios(prev => ({
        ...prev,
        [environment]: url
      }));

    } catch (err) {
      console.error('Error generating background audio:', err);
      setError(`Failed to generate ${environment} background audio.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const playBackgroundAudio = (environment: string) => {
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause();
    }

    if (currentBackground === environment) {
      setCurrentBackground(null);
      return;
    }

    const audioUrl = backgroundAudios[environment];
    if (audioUrl) {
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.src = audioUrl;
        backgroundAudioRef.current.loop = true;
        backgroundAudioRef.current.volume = 0.3;
        backgroundAudioRef.current.play();
        setCurrentBackground(environment);
      }
    } else {
      generateBackgroundAudio(environment);
    }
  };

  const stopBackgroundAudio = () => {
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause();
    }
    setCurrentBackground(null);
  };

  const playGeneratedAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  useEffect(() => {
    return () => {
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Sound Effects & Background Audio Test
      </h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Sound Effects Generator */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            🎵 Sound Effects Generator
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sound Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the sound you want to generate..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (seconds)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min="0.5"
                max="30"
                step="0.5"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center space-x-2 mt-6">
                <input
                  type="checkbox"
                  checked={isLooping}
                  onChange={(e) => setIsLooping(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">Loop seamlessly</span>
              </label>
            </div>
          </div>

          <button
            onClick={generateSoundEffect}
            disabled={isGenerating}
            className={`w-full py-3 px-6 rounded-md text-white font-medium ${
              isGenerating
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
            } transition-colors`}
          >
            {isGenerating ? 'Generating Sound...' : 'Generate Sound Effect'}
          </button>

          {audioUrl && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 text-sm font-medium mb-3">
                ✅ Sound effect generated!
              </p>
              <button
                onClick={playGeneratedAudio}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors mr-3"
              >
                🔊 Play Sound
              </button>
              <audio controls className="w-full mt-3">
                <source src={audioUrl} type="audio/mpeg" />
              </audio>
            </div>
          )}
        </div>

        {/* Background Audio */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            🏫 Background Audio Environments
          </h2>

          <div className="space-y-3">
            {Object.entries(backgroundSounds).map(([environment, desc]) => (
              <div key={environment} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-gray-800 capitalize">
                    {environment}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => playBackgroundAudio(environment)}
                      disabled={isGenerating}
                      className={`px-3 py-1 rounded text-sm ${
                        currentBackground === environment
                          ? 'bg-red-500 text-white'
                          : backgroundAudios[environment]
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-500 text-white'
                      } hover:opacity-80 transition-opacity`}
                    >
                      {currentBackground === environment
                        ? '⏸️ Stop'
                        : backgroundAudios[environment]
                        ? '▶️ Play'
                        : '🔄 Generate'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600">{desc}</p>
              </div>
            ))}
          </div>

          {currentBackground && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-yellow-800 text-sm">
                🎵 Playing: <span className="font-medium capitalize">{currentBackground}</span> background audio
              </p>
              <button
                onClick={stopBackgroundAudio}
                className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                Stop All Background Audio
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-blue-800 font-medium mb-2">How to use:</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li><strong>Sound Effects:</strong> Describe any sound and generate it with custom duration and loop options</li>
          <li><strong>Background Audio:</strong> Generate ambient sounds for different environments (school, café, office, etc.)</li>
          <li><strong>Playback:</strong> Use the play buttons to test generated audio or the built-in controls</li>
          <li><strong>Environment:</strong> Background audio loops automatically for ambient atmosphere</li>
        </ul>
      </div>

      {/* Hidden background audio element */}
      <audio ref={backgroundAudioRef} />
    </div>
  );
};

export default SoundEffectsTest;