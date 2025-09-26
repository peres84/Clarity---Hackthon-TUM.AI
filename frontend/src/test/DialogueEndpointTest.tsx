// src/test/DialogueEndpointTest.tsx
// Test the beta text-to-dialogue endpoint for voice expressions

import React, { useState } from 'react';
import { ArrowLeft, Play, Download, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DebugConsole, DebugToggle } from '../components/DebugConsole';

interface DialogueInput {
  text: string;
  voice_id: string;
}

interface TestCase {
  id: string;
  name: string;
  inputs: DialogueInput[];
  description: string;
}

const TEST_CASES: TestCase[] = [
  {
    id: 'baseline_dialogue',
    name: 'Baseline Dialogue (No Tags)',
    inputs: [
      { text: "Hi! I'm Sarah! That sounds really interesting.", voice_id: 'EXAVITQu4vr4xnSDxMaL' },
      { text: "Who do you think would want to use this?", voice_id: 'EXAVITQu4vr4xnSDxMaL' }
    ],
    description: 'Normal dialogue without voice expression tags'
  },
  {
    id: 'expression_dialogue',
    name: 'With Voice Expressions',
    inputs: [
      { text: "[excited] Hi! I'm Sarah! That sounds really interesting.", voice_id: 'EXAVITQu4vr4xnSDxMaL' },
      { text: "[curious] Who do you think would want to use this?", voice_id: 'EXAVITQu4vr4xnSDxMaL' }
    ],
    description: 'Same dialogue with voice expression tags'
  },
  {
    id: 'multi_voice_expressions',
    name: 'Multi-Voice with Expressions',
    inputs: [
      { text: "[excited] Hi! I'm Sarah! That sounds really interesting.", voice_id: 'EXAVITQu4vr4xnSDxMaL' },
      { text: "[curious] And I'm Alex! How are you planning to build this?", voice_id: 'TxGEqnHWrfWFTfGW9XjX' },
      { text: "[thoughtful] That's a great question from Alex...", voice_id: 'EXAVITQu4vr4xnSDxMaL' }
    ],
    description: 'Multi-voice conversation with different expressions'
  },
  {
    id: 'complex_expressions',
    name: 'Complex Expression Dialogue',
    inputs: [
      { text: "[whispers] This is a secret project we're working on.", voice_id: 'EXAVITQu4vr4xnSDxMaL' },
      { text: "[laughs] Just kidding! It's actually really exciting.", voice_id: 'TxGEqnHWrfWFTfGW9XjX' },
      { text: "[excited] I can't wait to see how this turns out!", voice_id: 'EXAVITQu4vr4xnSDxMaL' }
    ],
    description: 'Complex conversation with multiple expression types'
  },
  {
    id: 'natural_dialogue',
    name: 'Natural Conversation Flow',
    inputs: [
      { text: "[excited] Hey, I just heard about your new project!", voice_id: 'TxGEqnHWrfWFTfGW9XjX' },
      { text: "[curious] Oh really? What did you hear about it?", voice_id: 'EXAVITQu4vr4xnSDxMaL' },
      { text: "[thoughtful] Well, I heard it's supposed to help people practice speaking...", voice_id: 'TxGEqnHWrfWFTfGW9XjX' },
      { text: "[laughs] That's exactly right! How did you know?", voice_id: 'EXAVITQu4vr4xnSDxMaL' }
    ],
    description: 'Natural back-and-forth conversation with expressions'
  }
];

export const DialogueEndpointTest: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<{ [key: string]: { audioUrl: string; audioBuffer: ArrayBuffer } }>({});
  const [showDebugConsole, setShowDebugConsole] = useState(true);

  const generateDialogue = async (testCase: TestCase) => {
    setIsGenerating(true);
    setCurrentTestId(testCase.id);

    try {
      console.log(`🎭 Testing Dialogue: ${testCase.name}`);
      console.log(`🎪 Inputs:`, testCase.inputs);

      // Add to debug console
      if ((window as any).debugConsole) {
        const allVoiceTags = testCase.inputs.flatMap(input =>
          input.text.match(/\[(?:laughs|whispers|sighs|sarcastic|curious|excited|crying|starts laughing|wheezing|snorts|mischievously|thoughtful)\]/gi) || []
        );
        (window as any).debugConsole.addLog('tts', `Dialogue API Test: ${testCase.name}`, {
          inputs: testCase.inputs,
          model: 'eleven_v3',
          endpoint: '/v1/text-to-dialogue/stream',
          voiceTags: allVoiceTags
        }, allVoiceTags);
      }

      const audioBuffer = await callDialogueAPI(testCase.inputs);
      const audioUrl = URL.createObjectURL(new Blob([audioBuffer], { type: 'audio/mpeg' }));

      setGeneratedAudio(prev => ({
        ...prev,
        [testCase.id]: {
          audioUrl,
          audioBuffer: audioBuffer
        }
      }));

      console.log('✅ Dialogue generated successfully for test:', testCase.name);

    } catch (error) {
      console.error('❌ Failed to generate dialogue for test:', testCase.name, error);

      // Add error to debug console
      if ((window as any).debugConsole) {
        (window as any).debugConsole.addLog('error', `Dialogue Test Failed: ${testCase.name}`, {
          testCase,
          error: error instanceof Error ? error.message : error
        });
      }
    } finally {
      setIsGenerating(false);
      setCurrentTestId(null);
    }
  };

  const callDialogueAPI = async (inputs: DialogueInput[]): Promise<ArrayBuffer> => {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;

    if (!apiKey) {
      throw new Error('ElevenLabs API key not found');
    }

    console.log('🚀 Calling ElevenLabs Dialogue API...');

    const url = 'https://api.elevenlabs.io/v1/text-to-dialogue/stream';
    const requestBody = {
      inputs: inputs,
      model_id: 'eleven_v3',
      output_format: 'mp3_44100_128'
    };

    console.log('📡 Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`Dialogue API failed: ${response.status} - ${errorText}`);
    }

    // The response should be streaming audio data
    const audioBuffer = await response.arrayBuffer();

    console.log('✅ Dialogue API response received, size:', audioBuffer.byteLength, 'bytes');

    // Add success to debug console
    if ((window as any).debugConsole) {
      (window as any).debugConsole.addLog('tts', 'Dialogue API Response Success', {
        audioSize: audioBuffer.byteLength,
        endpoint: '/v1/text-to-dialogue/stream',
        model: 'eleven_v3'
      });
    }

    return audioBuffer;
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
      link.download = `dialogue_test_${testId}.mp3`;
      link.click();
    }
  };

  const runAllTests = async () => {
    for (const testCase of TEST_CASES) {
      await generateDialogue(testCase);
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
              to="/test/voice-expressions"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Voice Expression Test</span>
            </Link>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">Text-to-Dialogue API Test</h1>
              <p className="text-sm text-gray-600">
                Test the beta dialogue endpoint to see if it handles voice expressions better
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* API Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">🧪 Beta API Test:</h2>
          <p className="text-blue-700 mb-4">
            Testing the <code>/v1/text-to-dialogue/stream</code> endpoint with <code>eleven_v3</code> model.
            This endpoint is specifically designed for dialogue and may handle voice expressions differently
            than the regular TTS endpoint.
          </p>
          <div className="bg-blue-100 p-3 rounded font-mono text-sm">
            POST /v1/text-to-dialogue/stream<br/>
            Model: eleven_v3<br/>
            Format: mp3_44100_128
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Dialogue Tests</h2>
            <button
              onClick={runAllTests}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={18} className={isGenerating ? 'animate-spin' : ''} />
              {isGenerating ? 'Running Tests...' : 'Run All Dialogue Tests'}
            </button>
          </div>
          <p className="text-gray-600 text-sm">
            This will test the dialogue endpoint which might handle voice expressions more naturally
            compared to the regular TTS endpoint.
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
                  <div className="space-y-2">
                    {testCase.inputs.map((input, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded border flex items-center gap-3">
                        <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded">
                          Voice {idx + 1}
                        </span>
                        <code className="text-sm flex-1">{input.text}</code>
                        <span className="text-xs text-gray-500">
                          {input.voice_id === 'EXAVITQu4vr4xnSDxMaL' ? 'Bella' : 'Josh'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => generateDialogue(testCase)}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {currentTestId === testCase.id && isGenerating ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} />
                        Generate Dialogue
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
                    Play Dialogue
                  </button>
                  <button
                    onClick={() => downloadAudio(testCase.id, testCase.name)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    <Download size={16} />
                    Download
                  </button>
                  <span className="text-sm text-green-600 font-medium">✅ Dialogue Generated</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Analysis Section */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-800 mb-3">🎯 What to Listen For:</h2>
          <ol className="list-decimal list-inside space-y-2 text-green-700">
            <li>Compare "Baseline Dialogue" vs "With Voice Expressions" - do they sound different?</li>
            <li>Listen for emotional tone changes in the expression versions</li>
            <li>Check if voice tags are still being read literally as words</li>
            <li>Notice if the dialogue flows more naturally than single TTS calls</li>
            <li>Test multi-voice conversations with different expressions</li>
          </ol>
        </div>

        {/* Technical Notes */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-3">⚠️ Beta API Notes:</h2>
          <ul className="list-disc list-inside space-y-2 text-yellow-700">
            <li>This is a beta endpoint and may have different behavior than regular TTS</li>
            <li>The dialogue endpoint is designed for conversation flows</li>
            <li>Voice expressions might be handled differently in dialogue context</li>
            <li>Multiple voices in sequence may create more natural conversations</li>
            <li>Check debug console for exact API requests and responses</li>
          </ul>
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