// src/test/NonStreamingTest.tsx
// Simple test to verify non-streaming approach works for voice expressions

import React, { useState } from 'react';
import { ArrowLeft, Play, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import elevenLabsService from '../services/elevenLabsService';

export const NonStreamingTest: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const testText = "[excited] Hi! I'm Sarah! That sounds really interesting. [curious] Who do you think would want to use this?";

  const runTest = async () => {
    setIsGenerating(true);
    setTestResult(null);
    setAudioUrl(null);

    try {
      console.log('🧪 Testing non-streaming TTS with voice expressions...');

      const audioBuffer = await elevenLabsService.convertTextToSpeech(testText);
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(audioBlob);

      setAudioUrl(url);
      setTestResult('✅ Audio generated successfully! Listen to check if voice expressions work.');

      // Auto-play the audio
      const audio = new Audio(url);
      audio.play();

    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/test"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Tests</span>
            </Link>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">Non-Streaming TTS Test</h1>
              <p className="text-sm text-gray-600">
                Quick test to verify if non-streaming API fixes voice expression issues
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Test Description */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">🔬 Test Details:</h2>
          <p className="text-blue-700 mb-4">
            This test uses the non-streaming API approach with voice_settings that you found working.
            It should properly interpret voice expressions instead of reading them literally.
          </p>
          <div className="bg-blue-100 p-3 rounded font-mono text-sm">
            <strong>Test Text:</strong><br/>
            {testText}
          </div>
          <div className="mt-3 text-sm text-blue-700">
            <strong>Expected:</strong> Natural speech with excited and curious tones<br/>
            <strong>Not Expected:</strong> Voice literally saying "excited" and "curious"
          </div>
        </div>

        {/* Test Button */}
        <div className="bg-white rounded-lg shadow p-6 mb-8 text-center">
          <button
            onClick={runTest}
            disabled={isGenerating}
            className="flex items-center gap-2 px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mx-auto text-lg font-medium"
          >
            <RefreshCw size={20} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Generating Audio...' : 'Run Voice Expression Test'}
          </button>

          {testResult && (
            <div className="mt-4 p-3 rounded-lg text-sm"
                 style={{
                   backgroundColor: testResult.startsWith('✅') ? '#dcfce7' : '#fee2e2',
                   color: testResult.startsWith('✅') ? '#166534' : '#dc2626'
                 }}>
              {testResult}
            </div>
          )}
        </div>

        {/* Audio Player */}
        {audioUrl && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h3 className="text-lg font-semibold mb-4">Generated Audio:</h3>
            <button
              onClick={playAudio}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Play size={18} />
              Play Audio
            </button>
            <p className="text-sm text-gray-600 mt-3">
              Listen carefully: Do you hear natural excited/curious tones, or literal words "excited"/"curious"?
            </p>
          </div>
        )}

        {/* What Changed */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-800 mb-3">🔧 What Changed:</h2>
          <ul className="list-disc list-inside space-y-2 text-green-700 text-sm">
            <li><strong>Non-streaming API:</strong> Using <code>/v1/text-to-speech/{'{voice_id}'}</code> instead of streaming</li>
            <li><strong>Voice Settings:</strong> Added stability, similarity_boost, style, use_speaker_boost parameters</li>
            <li><strong>Direct fetch:</strong> Bypassing SDK streaming to use exact working API format</li>
            <li><strong>eleven_v3 model:</strong> Using the model that should support voice expressions</li>
            <li><strong>Proper headers:</strong> Accept: audio/mpeg, Content-Type: application/json</li>
          </ul>
        </div>

        {/* Technical Details */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-3">⚙️ API Request Details:</h2>
          <pre className="bg-yellow-100 p-3 rounded text-xs overflow-x-auto">
{`POST /v1/text-to-speech/{voice_id}
Headers:
  Accept: audio/mpeg
  Content-Type: application/json
  xi-api-key: [your-key]

Body:
{
  "text": "[excited] Hi! I'm Sarah! ...",
  "model_id": "eleven_v3",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.5,
    "use_speaker_boost": true
  }
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};