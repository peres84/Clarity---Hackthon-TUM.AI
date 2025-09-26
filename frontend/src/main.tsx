// src/main.tsx
// Application entry point

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import App from './App'
import { JuryMode } from './components/JuryMode'
import { EnvironmentMode } from './components/EnvironmentMode'
import TestHome from './test/TestHome'
import TextToSpeechTest from './test/TextToSpeechTest'
import SoundEffectsTest from './test/SoundEffectsTest'
import { VoiceExpressionTest } from './test/VoiceExpressionTest'
import { DialogueEndpointTest } from './test/DialogueEndpointTest'
import { NonStreamingTest } from './test/NonStreamingTest'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/jury-mode" element={<JuryMode />} />
        <Route path="/environment-mode" element={<EnvironmentMode />} />
        <Route path="/test" element={<TestHome />} />
        <Route path="/test/text-to-speech" element={<TextToSpeechTest />} />
        <Route path="/test/sound-effects" element={<SoundEffectsTest />} />
        <Route path="/test/voice-expressions" element={<VoiceExpressionTest />} />
        <Route path="/test/dialogue-endpoint" element={<DialogueEndpointTest />} />
        <Route path="/test/non-streaming" element={<NonStreamingTest />} />
      </Routes>
    </Router>
  </React.StrictMode>,
)