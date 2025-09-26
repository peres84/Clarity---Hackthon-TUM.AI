// src/test/VoiceExpressionTest.tsx
// Test component to debug voice expression tags being read literally

import React, { useState } from 'react';
import { ArrowLeft, Play, Download, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import elevenLabsService from '../services/elevenLabsService';
import { DebugConsole, DebugToggle } from '../components/DebugConsole';

interface TestCase {
  id: string;
  name: string;
  text: string;
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    id: 'baseline',
    name: 'Baseline (No Tags)',
    text: "Hi! I'm Sarah! That sounds really interesting. Who do you think would want to use this?",
    description: 'Normal text without any voice expression tags'
  },
  {
    id: 'with_tags',
    name: 'With Voice Tags',
    text: "[excited] Hi! I'm Sarah! That sounds really interesting. [curious] Who do you think would want to use this?",
    description: 'Same text with voice expression tags included'
  },
  {
    id: 'eleven_turbo_v2',
    name: 'Test eleven_turbo_v2',
    text: "[excited] Hi! I'm Sarah! That sounds really interesting. [curious] Who do you think would want to use this?",
    description: 'Test with eleven_turbo_v2 model (may have better expression support)'
  },
  {
    id: 'eleven_monolingual_v1',
    name: 'Test eleven_monolingual_v1',
    text: "[excited] Hi! I'm Sarah! That sounds really interesting. [curious] Who do you think would want to use this?",
    description: 'Test with eleven_monolingual_v1 model'
  },
  {
    id: 'eleven_multilingual_v2',
    name: 'Test eleven_multilingual_v2',
    text: "[excited] Hi! I'm Sarah! That sounds really interesting. [curious] Who do you think would want to use this?",
    description: 'Test with eleven_multilingual_v2 model'
  },
  {
    id: 'different_voice',
    name: 'Different Voice (Josh)',
    text: "[excited] Hi! I'm Alex! That sounds really interesting. [curious] Who do you think would want to use this?",
    description: 'Test with Josh (TxGEqnHWrfWFTfGW9XjX) voice instead of Bella'
  },
  {
    id: 'longer_text',
    name: 'Longer Text (250+ chars)',
    text: "[excited] Hi there! I'm Sarah and I'm absolutely thrilled to be testing this voice expression functionality with you today. This is such an interesting project and I can't wait to see how it develops. [curious] I'm really wondering though, what do you think makes this different from other similar applications? [thoughtful] There are so many possibilities here.",
    description: 'Longer text (250+ characters) as recommended in docs'
  },
  {
    id: 'tag_spacing_test',
    name: 'Tag Spacing Variations',
    text: "[excited]Hi! [curious] What about this? [laughs]Testing spacing variations here.",
    description: 'Test different spacing around voice tags'
  }
];

export const VoiceExpressionTest: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<{ [key: string]: { audioUrl: string; audioBuffer: ArrayBuffer } }>({});
  const [showDebugConsole, setShowDebugConsole] = useState(true);

  const generateAudio = async (testCase: TestCase) => {
    setIsGenerating(true);
    setCurrentTestId(testCase.id);

    try {
      console.log(`🎬 Testing: ${testCase.name}`);
      console.log(`📝 Text: ${testCase.text}`);

      // Determine model and voice based on test case
      let model = 'eleven_v3';
      let voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Bella (default)

      // Override model based on test case
      if (testCase.id.includes('turbo_v2')) {
        model = 'eleven_turbo_v2';
      } else if (testCase.id.includes('monolingual_v1')) {
        model = 'eleven_monolingual_v1';
      } else if (testCase.id.includes('multilingual_v2')) {
        model = 'eleven_multilingual_v2';
      }

      // Override voice for specific tests
      if (testCase.id === 'different_voice') {
        voiceId = 'TxGEqnHWrfWFTfGW9XjX'; // Josh (male voice)
      }

      console.log(`🎛️ Using Model: ${model}, Voice: ${voiceId}`);

      // Create a modified version of the service to test different models and voices
      const testAudioBuffer = await testTTSWithModel(testCase.text, model, voiceId);
      const audioUrl = URL.createObjectURL(new Blob([testAudioBuffer], { type: 'audio/mpeg' }));

      setGeneratedAudio(prev => ({
        ...prev,
        [testCase.id]: {
          audioUrl,
          audioBuffer: testAudioBuffer
        }
      }));

      console.log('✅ Audio generated successfully for test:', testCase.name);

    } catch (error) {
      console.error('❌ Failed to generate audio for test:', testCase.name, error);

      // Add error to debug console
      if ((window as any).debugConsole) {
        (window as any).debugConsole.addLog('error', `Test Failed: ${testCase.name}`, {
          testCase,
          error: error instanceof Error ? error.message : error
        });
      }
    } finally {
      setIsGenerating(false);
      setCurrentTestId(null);
    }
  };

  const testTTSWithModel = async (text: string, model: string, voiceId: string): Promise<ArrayBuffer> => {
    // Get the ElevenLabs client from the service
    const client = (elevenLabsService as any).client;

    console.log(`🔧 Testing TTS with model: ${model}, voice: ${voiceId}`);

    // Add to debug console
    if ((window as any).debugConsole) {
      const voiceTags = text.match(/\[(?:laughs|whispers|sighs|sarcastic|curious|excited|crying|starts laughing|wheezing|snorts|mischievously|thoughtful)\]/gi) || [];
      (window as any).debugConsole.addLog('tts', `TTS Test: ${model}`, {
        inputText: text,
        voiceId: voiceId,
        model: model,
        voiceTags: voiceTags
      }, voiceTags);
    }

    const audioStream = await client.textToSpeech.stream(voiceId, {
      text: text,
      model_id: model,
      outputFormat: 'mp3_44100_128'
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

    return audioBuffer.buffer;
  };

  const playAudio = (testId: string) => {
    const audio = generatedAudio[testId];
    if (audio) {
      const audioElement = new Audio(audio.audioUrl);
      audioElement.play();
    }
  };

  const downloadAudio = (testId: string, testName: string) => {
    const audio = generatedAudio[testId];
    if (audio) {
      const link = document.createElement('a');
      link.href = audio.audioUrl;
      link.download = `voice_expression_test_${testId}.mp3`;
      link.click();
    }
  };

  const runAllTests = async () => {
    for (const testCase of TEST_CASES) {
      await generateAudio(testCase);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
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
              <h1 className="text-2xl font-bold text-gray-900">Voice Expression Debug Test</h1>
              <p className="text-sm text-gray-600">
                Test voice expression tags to see if they're being read literally or interpreted as expressions
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Problem Description */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">🚨 Problem:</h2>
          <p className="text-yellow-700 mb-4">
            Voice expression tags like <code>[excited]</code> and <code>[curious]</code> are being read literally by the TTS
            instead of being interpreted as voice expressions. According to ElevenLabs documentation, these should modify
            vocal delivery, not be spoken as text.
          </p>
          <div className="bg-yellow-100 p-3 rounded font-mono text-sm">
            Input: "[excited] Hi! I'm Sarah! [curious] Who do you think would want to use this?"<br/>
            Expected: Natural speech with excited and curious tones<br/>
            Actual: Voice literally saying "excited" and "curious"
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Test Controls</h2>
            <button
              onClick={runAllTests}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={18} className={isGenerating ? 'animate-spin' : ''} />
              {isGenerating ? 'Running Tests...' : 'Run All Tests'}
            </button>
          </div>
          <p className="text-gray-600 text-sm">
            This will generate audio for each test case and compare the results.
            Use the debug console to monitor API calls and responses.
          </p>
        </div>

        {/* Test Cases */}
        <div className="space-y-6">
          {TEST_CASES.map((testCase) => (
            <div key={testCase.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{testCase.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{testCase.description}</p>
                  <div className="bg-gray-50 p-3 rounded border">
                    <code className="text-sm">{testCase.text}</code>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => generateAudio(testCase)}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {currentTestId === testCase.id && isGenerating ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} />
                        Generate
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Audio Controls */}
              {generatedAudio[testCase.id] && (
                <div className="flex items-center gap-3 pt-4 border-t">
                  <button
                    onClick={() => playAudio(testCase.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    <Play size={16} />
                    Play Audio
                  </button>
                  <button
                    onClick={() => downloadAudio(testCase.id, testCase.name)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <span className="text-sm text-green-600 font-medium">✅ Audio Generated</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Analysis Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-3">🔍 Analysis Instructions:</h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-700">
            <li>Compare the "Baseline" vs "With Voice Tags" audio - do they sound different?</li>
            <li>Listen carefully to the "With Voice Tags" version - is it saying the words "excited" and "curious"?</li>
            <li>Try the different model versions to see if the issue is model-specific</li>
            <li>Check the debug console for exact API requests and responses</li>
            <li>Test the "Multiple Expression Tags" to see how many tags are being read literally</li>
          </ol>
        </div>

        {/* Potential Solutions Section */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-800 mb-3">💡 Potential Solutions to Test:</h2>
          <ul className="list-disc list-inside space-y-2 text-green-700">
            <li>Different model versions (eleven_v2, eleven_turbo_v2, eleven_monolingual_v1)</li>
            <li>Different parameter formatting or API endpoints</li>
            <li>Voice-specific compatibility (some voices may not support expressions)</li>
            <li>Text preprocessing to position tags differently</li>
            <li>Check if voice expressions require specific subscription tier</li>
          </ul>
          <div className="mt-4 p-3 bg-green-100 rounded">
            <Link
              to="/test/dialogue-endpoint"
              className="inline-flex items-center gap-2 text-green-800 font-medium hover:text-green-900"
            >
              🎭 Try Beta Dialogue Endpoint Test →
            </Link>
            <p className="text-sm text-green-600 mt-1">
              Test the dialogue API which might handle expressions better
            </p>
          </div>
        </div>
      </div>

      {/* Debug Console */}
      <DebugConsole
        isVisible={showDebugConsole}
        onToggle={() => setShowDebugConsole(!showDebugConsole)}
      />
      <DebugToggle
        onToggle={() => setShowDebugConsole(!showDebugConsole)}
        isVisible={showDebugConsole}
      />
    </div>
  );
};