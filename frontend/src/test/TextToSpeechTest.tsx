// TextToSpeechTest.tsx
// Test page for ElevenLabs Text-to-Speech functionality
// 
// Fixed Issues:
// - Updated to use textToSpeech.stream() instead of convert() per ElevenLabs documentation
// - Fixed parameter naming: output_format -> outputFormat for stream API
// - Added proper ReadableStream handling and conversion to ArrayBuffer
// - Enhanced error handling for audio loading and playback
// - Added validation for audio buffer size

import React, { useState } from 'react';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const TextToSpeechTest: React.FC = () => {
  const [text, setText] = useState('Hello world! This is a test of the ElevenLabs text-to-speech functionality.');
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState('21m00Tcm4TlvDq8ikWAM'); // Default voice ID

  const client = new ElevenLabsClient({
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || '',
  });

  const generateSpeech = async () => {
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAudioUrl(null);

    try {
      const audioStream = await client.textToSpeech.stream(voiceId, {
        text: text,
        modelId: 'eleven_multilingual_v2',
        outputFormat: 'mp3_44100_128',
      });

      // Convert ReadableStream to ArrayBuffer
      const reader = audioStream.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      // Combine all chunks into a single ArrayBuffer
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const audioBuffer = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        audioBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      // Validate audio buffer
      if (audioBuffer.length === 0) {
        throw new Error('Received empty audio buffer from ElevenLabs API');
      }

      console.log('✅ Audio generated successfully, size:', audioBuffer.length, 'bytes');

      // Convert audio buffer to blob and create URL
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      // Automatically play the generated audio with better error handling
      setTimeout(() => {
        const audioElement = new Audio(url);
        
        audioElement.addEventListener('loadeddata', () => {
          console.log('✅ Audio loaded and ready to play');
        });
        
        audioElement.addEventListener('error', (e) => {
          console.error('❌ Audio loading error:', e);
          setError('Failed to load generated audio. The audio format may be unsupported.');
        });

        audioElement.play().catch(err => {
          console.log('Auto-play prevented by browser:', err);
          // Don't set this as an error since auto-play prevention is normal
        });
      }, 100);

    } catch (err) {
      console.error('Error generating speech:', err);
      setError('Failed to generate speech. Check your API key and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = 'generated-speech.mp3';
      a.click();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        Text-to-Speech Test
      </h1>

      <div className="space-y-6">
        {/* Voice ID Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Voice ID
          </label>
          <input
            type="text"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter ElevenLabs Voice ID"
          />
          <p className="text-xs text-gray-500 mt-1">
            Default: 21m00Tcm4TlvDq8ikWAM (Rachel)
          </p>
        </div>

        {/* Text Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text to Convert
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter text to convert to speech..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Characters: {text.length}
          </p>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateSpeech}
          disabled={isLoading}
          className={`w-full py-3 px-6 rounded-md text-white font-medium ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          } transition-colors`}
        >
          {isLoading ? 'Generating Speech...' : 'Generate Speech'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Audio Controls */}
        {audioUrl && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800 text-sm font-medium mb-3">
              ✅ Speech generated successfully!
            </p>
            <div className="flex gap-3">
              <button
                onClick={playAudio}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                🔊 Play Audio
              </button>
              <button
                onClick={downloadAudio}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                📥 Download MP3
              </button>
            </div>

            {/* HTML5 Audio Player */}
            <div className="mt-3">
              <audio controls className="w-full">
                <source src={audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-blue-800 font-medium mb-2">Instructions:</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>1. Make sure your ElevenLabs API key is set as <code className="bg-blue-100 px-1 rounded">VITE_ELEVENLABS_API_KEY</code> in .env</li>
            <li>2. Enter or modify the text you want to convert</li>
            <li>3. Optionally change the voice ID for different voices</li>
            <li>4. Click "Generate Speech" to create audio (plays automatically)</li>
            <li>5. Use the play button or audio controls to listen again</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TextToSpeechTest;