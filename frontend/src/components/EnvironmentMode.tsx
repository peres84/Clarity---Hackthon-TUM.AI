// EnvironmentMode.tsx
// Environment Mode interface for casual conversations

import React, { useState, useEffect } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConversationInterface } from './ConversationInterface';
import { ClarityAPI } from '../services/api';
import { ConversationSession } from '../types';

export const EnvironmentMode: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState('school');

  const environments = [
    { id: 'school', name: 'School', emoji: '🏫' },
    { id: 'office', name: 'Office', emoji: '🏢' },
    { id: 'cafe', name: 'Café', emoji: '☕' },
    { id: 'park', name: 'Park', emoji: '🌳' }
  ];

  const startConversation = async () => {
    setIsLoading(true);

    try {
      const session = await ClarityAPI.createSession(
        'environment',
        selectedEnvironment,
        'User'
      );

      setCurrentSession(session);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      alert('Failed to start conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSession = () => {
    setCurrentSession(null);
  };

  if (currentSession) {
    return (
      <div className="h-screen bg-gray-50">
        <ConversationInterface
          session={currentSession}
          onSessionReset={resetSession}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </Link>

            <div className="flex items-center gap-3">
              <img
                src="/favicon.png"
                alt="Clarity Logo"
                className="w-10 h-10"
                onError={(e) => {
                  // Fallback if favicon not found
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg items-center justify-center hidden">
                <span className="text-white font-bold">E</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Environment Mode</h1>
                <p className="text-sm text-gray-600">Casual conversations in immersive settings</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-6">
            Choose Your <span className="text-teal-600">Environment</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select an immersive environment for your conversation practice. Each setting includes
            ambient sounds and context-aware AI agents.
          </p>
        </div>

        {/* Environment Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {environments.map((env) => (
            <button
              key={env.id}
              onClick={() => setSelectedEnvironment(env.id)}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
                selectedEnvironment === env.id
                  ? 'border-teal-500 bg-teal-50 shadow-lg shadow-teal-100'
                  : 'border-gray-200 bg-white hover:border-teal-300 hover:shadow-lg'
              }`}
            >
              <div className="text-4xl mb-4">{env.emoji}</div>
              <h3 className="font-semibold text-gray-900">{env.name}</h3>
            </button>
          ))}
        </div>

        {/* Start Button */}
        <div className="text-center">
          <button
            onClick={startConversation}
            disabled={isLoading}
            className="px-12 py-5 text-xl font-bold rounded-2xl transition-all duration-300 bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-2xl hover:shadow-3xl hover:scale-105 hover:from-teal-600 hover:to-teal-700 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-4 focus:ring-teal-200"
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin" />
                Starting Conversation...
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span>Start Conversation</span>
              </div>
            )}
          </button>

          <p className="text-gray-500 text-base mt-6">
            Immersive audio and natural conversations await
          </p>
        </div>
      </div>
    </div>
  );
};