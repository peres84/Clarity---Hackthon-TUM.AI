// TestHome.tsx
// Home page for audio testing with navigation to different tests

import React from 'react';
import { Link } from 'react-router-dom';

const TestHome: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          🎵 Clarity Audio Tests
        </h1>
        <p className="text-lg text-gray-600">
          Test ElevenLabs audio functionality for the Clarity app
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Text-to-Speech Test */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center mb-4">
            <div className="text-3xl mr-4">🗣️</div>
            <h2 className="text-lg font-semibold text-gray-800">
              Text-to-Speech Test
            </h2>
          </div>
          <p className="text-gray-600 mb-6 text-sm">
            Test converting text to speech using ElevenLabs voices. Generate audio from any text input
            with customizable voice selection and playback controls.
          </p>
          <Link
            to="/test/text-to-speech"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            Test TTS →
          </Link>
        </div>

        {/* Sound Effects Test */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center mb-4">
            <div className="text-3xl mr-4">🎵</div>
            <h2 className="text-lg font-semibold text-gray-800">
              Sound Effects Test
            </h2>
          </div>
          <p className="text-gray-600 mb-6 text-sm">
            Generate sound effects and background audio for different environments.
            Perfect for testing ambient audio in conversation modes.
          </p>
          <Link
            to="/test/sound-effects"
            className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
          >
            Test Sound Effects →
          </Link>
        </div>

        {/* Voice Expression Test */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center mb-4">
            <div className="text-3xl mr-4">🎭</div>
            <h2 className="text-lg font-semibold text-gray-800">
              Voice Expression Debug
            </h2>
          </div>
          <p className="text-gray-600 mb-6 text-sm">
            Debug voice expression tags that are being read literally instead of as expressions.
            Test different models and configurations.
          </p>
          <Link
            to="/test/voice-expressions"
            className="inline-block bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
          >
            Debug Expressions →
          </Link>
        </div>

        {/* Non-Streaming Test */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center mb-4">
            <div className="text-3xl mr-4">🔧</div>
            <h2 className="text-lg font-semibold text-gray-800">
              Non-Streaming Fix
            </h2>
          </div>
          <p className="text-gray-600 mb-6 text-sm">
            Quick test of the non-streaming API approach with voice_settings that should fix voice expressions.
          </p>
          <Link
            to="/test/non-streaming"
            className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
          >
            Test Fix →
          </Link>
        </div>
      </div>

      {/* Features Overview */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          🚀 What you can test:
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Text-to-Speech Features:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Convert any text to speech</li>
              <li>• Use different ElevenLabs voices</li>
              <li>• Play generated audio</li>
              <li>• Download MP3 files</li>
              <li>• Real-time audio controls</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Sound Effects Features:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Generate custom sound effects</li>
              <li>• Create background ambient audio</li>
              <li>• Environment-specific sounds</li>
              <li>• Loop and duration controls</li>
              <li>• Multiple environment presets</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Voice Expression Debug:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Test voice expression tags</li>
              <li>• Compare literal vs expressive output</li>
              <li>• Debug different TTS models</li>
              <li>• Real-time API monitoring</li>
              <li>• Audio comparison tools</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-3">
          ⚙️ Setup Required:
        </h3>
        <div className="text-yellow-700 text-sm space-y-2">
          <p>
            <strong>1. Environment Variables:</strong> Make sure you have <code className="bg-yellow-200 px-1 rounded">VITE_ELEVENLABS_API_KEY</code> set in your .env file
          </p>
          <p>
            <strong>2. API Key:</strong> Get your ElevenLabs API key from{' '}
            <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="underline">
              elevenlabs.io
            </a>
          </p>
          <p>
            <strong>3. Voice IDs:</strong> You can find voice IDs in your ElevenLabs dashboard or use the default ones provided
          </p>
          <p>
            <strong>4. Auto-play:</strong> Generated audio will play automatically after creation
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 text-center">
        <Link
          to="/"
          className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Back to Main App
        </Link>
      </div>
    </div>
  );
};

export default TestHome;