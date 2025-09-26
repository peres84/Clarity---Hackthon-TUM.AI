// src/App.tsx
// Main Clarity application component - Modern Landing Page

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mic, MessageSquare, Star, Users, Coffee, TestTube2, Settings, Plus } from 'lucide-react';
import { ConversationInterface } from './components/ConversationInterface';
import { ClarityAPI } from './services/api';
import { ConversationSession, ConversationMode } from './types';
import { AvatarService } from './utils/avatarUtils';
import { clsx } from 'clsx';

function App() {
  const navigate = useNavigate();
  const [showSceneCreator, setShowSceneCreator] = useState(false);

  const handleJuryMode = () => {
    navigate('/jury-mode');
  };

  const handleEnvironmentMode = () => {
    navigate('/environment-mode');
  };

  const handleCreateScene = () => {
    setShowSceneCreator(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg items-center justify-center hidden">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Clarity</h1>
                <p className="text-sm text-gray-600">AI Conversational Learning</p>
              </div>
            </div>
            <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              Beta Version
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">
            Master Your <span className="text-blue-600">Speaking</span>{' '}
            <span className="text-teal-500">Skills</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
            Practice conversations with AI agents in immersive environments. Get expert
            feedback and improve your communication confidence.
          </p>

          {/* Feature Icons */}
          <div className="flex justify-center gap-16 mb-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Mic className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Voice Recording</h3>
              <p className="text-gray-600 text-sm">Practice with real voice input and get instant feedback</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Conversations</h3>
              <p className="text-gray-600 text-sm">Engage with intelligent AI agents in natural dialogues</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Star className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Skill Improvement</h3>
              <p className="text-gray-600 text-sm">Track your progress and improve your speaking abilities</p>
            </div>
          </div>
        </div>

        {/* Learning Modes */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-4">Choose Your Learning Mode</h2>
          <p className="text-gray-600 text-center mb-12">
            Select the type of conversation practice that matches your goals
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Presentation Jury Mode */}
            <div
              onClick={handleJuryMode}
              className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white cursor-pointer hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="bg-white/20 p-3 rounded-xl">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div className="bg-blue-800/30 px-3 py-1 rounded-full text-sm">
                  Professional
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-4">Presentation Jury Mode</h3>
              <p className="text-blue-100 mb-6 leading-relaxed">
                Get expert feedback from a panel of AI judges on your presentation skills
              </p>

              <div className="flex flex-wrap gap-2 mb-8">
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Expert feedback</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Professional setting</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Skill assessment</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Start Learning</span>
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  →
                </div>
              </div>
            </div>

            {/* Environment Chat Mode */}
            <div
              onClick={handleEnvironmentMode}
              className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-8 text-white cursor-pointer hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="bg-white/20 p-3 rounded-xl">
                  <Coffee className="w-8 h-8 text-white" />
                </div>
                <div className="bg-teal-700/30 px-3 py-1 rounded-full text-sm">
                  Casual
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-4">Environment Chat Mode</h3>
              <p className="text-teal-100 mb-6 leading-relaxed">
                Practice conversations in different immersive environments with ambient sounds
              </p>

              <div className="flex flex-wrap gap-2 mb-8">
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Immersive audio</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Natural conversations</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Various settings</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Start Learning</span>
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  →
                </div>
              </div>
            </div>

            {/* Create a Scene Mode */}
            <div
              onClick={handleCreateScene}
              className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-8 text-white cursor-pointer hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="bg-white/20 p-3 rounded-xl">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <div className="bg-purple-700/30 px-3 py-1 rounded-full text-sm">
                  Custom
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-4">Create a Scene</h3>
              <p className="text-purple-100 mb-6 leading-relaxed">
                Design your own conversation scenario with custom agents and settings
              </p>

              <div className="flex flex-wrap gap-2 mb-8">
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Custom agents</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Personalized scenarios</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Flexible setup</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Start Creating</span>
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  →
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pt-16 border-t">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img
              src="/favicon.png"
              alt="Clarity Logo"
              className="w-8 h-8"
              onError={(e) => {
                // Fallback if favicon not found
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg items-center justify-center hidden">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Clarity</span>
          </div>
          <p className="text-gray-600 mb-8">
            Empowering communication through AI-powered conversation practice
          </p>

          <Link
            to="/test"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-full hover:bg-gray-900 transition-colors text-sm font-medium shadow-lg hover:shadow-xl"
          >
            <TestTube2 size={18} />
            <span>Test Audio Features</span>
          </Link>
        </footer>
      </div>

      {/* Scene Creator Modal */}
      {showSceneCreator && <SceneCreatorModal onClose={() => setShowSceneCreator(false)} />}
    </div>
  );
}

// Scene Creator Modal Component
interface Agent {
  name: string;
  gender: 'male' | 'female' | 'neutral';
  personality: string;
  behavior: string;
  image: string;
}

interface SceneCreatorModalProps {
  onClose: () => void;
}

function SceneCreatorModal({ onClose }: SceneCreatorModalProps) {
  const [sceneName, setSceneName] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  const [agents, setAgents] = useState<Agent[]>([
    { name: '', gender: 'neutral', personality: '', behavior: '', image: '' }
  ]);

  const addAgent = () => {
    setAgents([...agents, { name: '', gender: 'neutral', personality: '', behavior: '', image: '' }]);
  };

  const removeAgent = (index: number) => {
    if (agents.length > 1) {
      setAgents(agents.filter((_, i) => i !== index));
    }
  };

  const updateAgent = (index: number, field: keyof Agent, value: string) => {
    const updatedAgents = agents.map((agent, i) =>
      i === index ? { ...agent, [field]: value } : agent
    );
    setAgents(updatedAgents);
  };

  const handleSave = () => {
    console.log('Scene saved:', { sceneName, sceneDescription, agents });
    // This is a mockup - in the real implementation this would save to a backend
    alert('Scene created successfully! (This is a mockup)');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl max-h-[90vh] w-full overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Create a Scene</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">Design your own conversation scenario with custom agents</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Scene Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Scene Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Scene Name</label>
              <input
                type="text"
                value={sceneName}
                onChange={(e) => setSceneName(e.target.value)}
                placeholder="e.g., Job Interview, Pitch Meeting, Casual Chat"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">General Scene Prompt</label>
              <textarea
                value={sceneDescription}
                onChange={(e) => setSceneDescription(e.target.value)}
                placeholder="Describe the scenario, context, and overall goal of the conversation..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Agents Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Agents ({agents.length})</h3>
              <button
                onClick={addAgent}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
              >
                + Add Agent
              </button>
            </div>

            {agents.map((agent, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Agent {index + 1}</h4>
                  {agents.length > 1 && (
                    <button
                      onClick={() => removeAgent(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={agent.name}
                      onChange={(e) => updateAgent(index, 'name', e.target.value)}
                      placeholder="e.g., Sarah, Dr. Smith, Alex"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      value={agent.gender}
                      onChange={(e) => updateAgent(index, 'gender', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="neutral">Neutral</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image URL (optional)</label>
                  <input
                    type="url"
                    value={agent.image}
                    onChange={(e) => updateAgent(index, 'image', e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Personality & Role</label>
                  <textarea
                    value={agent.personality}
                    onChange={(e) => updateAgent(index, 'personality', e.target.value)}
                    placeholder="e.g., Friendly interviewer, Experienced mentor, Critical judge..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Behavior & System Prompt</label>
                  <textarea
                    value={agent.behavior}
                    onChange={(e) => updateAgent(index, 'behavior', e.target.value)}
                    placeholder="Define how this agent should behave, respond, and interact in the conversation..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
          >
            Save Scene
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;