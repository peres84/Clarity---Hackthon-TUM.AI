# Clarity Frontend - React + TypeScript

The frontend interface for Clarity, built with React 18, TypeScript, and Tailwind CSS.

## 🛠️ Setup

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
```

Frontend runs on http://localhost:3000 with Vite's fast HMR.

### Build for Production
```bash
npm run build
```

## 🎨 Design System

### Brand Colors
- **Primary Blue**: `#1C4E80` - Trust, stability, intelligence
- **Accent Teal**: `#2EA4D8` - Innovation, clarity, bridging
- **Accent Green**: `#64B62D` - Growth, success, confidence

### Typography
- **Headings**: Montserrat (geometric, clean)
- **Body**: Lato (readable, friendly)

### Component Library
- **Avatar**: Gender-based avatar display with speaking indicators
- **AudioRecorder**: Speech recording with visual feedback
- **BackgroundAudio**: Environment audio with volume controls
- **ConversationInterface**: Main chat interface

## 🏗️ Architecture

### Component Structure
```
src/
├── components/
│   ├── Avatar.tsx           # Avatar system with gender assignment
│   ├── AudioRecorder.tsx    # Audio recording component
│   ├── BackgroundAudio.tsx  # Environment audio player
│   └── ConversationInterface.tsx # Main chat interface
├── services/
│   ├── api.ts              # Backend API communication
│   └── audioService.ts     # Audio recording/playback
├── types/
│   └── index.ts            # TypeScript interfaces
├── utils/
│   └── avatarUtils.ts      # Avatar assignment logic
└── App.tsx                 # Main application component
```

### State Management
- React hooks for local component state
- WebSocket for real-time conversation updates
- Service classes for audio and API management

## 🎭 Avatar System

### File Naming Convention
Place avatar images in `public/avatars/` with format:
- `{name}-{gender}.jpg/png`
- Example: `sarah-female.jpg`, `max-male.png`

### Automatic Assignment
- Agents get avatars based on name + gender
- Fallback to gender-based defaults
- SVG placeholders generated automatically

### Speaking Indicators
- Pulsing animation when agent is speaking
- Color-coded borders for different states
- Visual feedback for active conversations

## 🎵 Audio Features

### Recording
- Browser-based audio recording with MediaRecorder API
- Visual waveform feedback during recording
- Automatic format conversion for backend compatibility

### Playback
- Agent voice playback with TTS integration
- Background environment audio with volume controls
- Audio streaming for real-time responses

### Browser Support
- Modern browsers with WebRTC support
- Graceful fallbacks for unsupported features
- Permission handling for microphone access

## 🔧 Configuration

### API Endpoints
Configure in `services/api.ts`:
```typescript
const API_BASE_URL = 'http://localhost:8000';
const WS_BASE_URL = 'ws://localhost:8000';
```

### Environment Settings
Update in `vite.config.ts` for proxy configuration:
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:8000',
    '/ws': { target: 'ws://localhost:8000', ws: true }
  }
}
```

## 🎯 Usage

### Starting Conversations
```typescript
// Create session
const session = await ClarityAPI.createSession('environment', 'school');

// WebSocket connection
const ws = ClarityAPI.createWebSocket(session.session_id);
```

### Audio Recording
```typescript
const audioService = new AudioService();
await audioService.startRecording();
const recording = await audioService.stopRecording();
```

### Avatar Display
```typescript
<Avatar
  agent={agent}
  isSpeaking={currentSpeaker === agent.name}
  size="lg"
  showName
/>
```

## 🎨 Styling

### Tailwind Configuration
Custom brand colors and fonts configured in `tailwind.config.js`:
- Brand color palette
- Custom animations
- Component utilities

### CSS Architecture
- Utility-first with Tailwind CSS
- Custom components for reusable patterns
- Responsive design with mobile-first approach

## 📱 Responsive Design

### Breakpoints
- Mobile: 320px - 640px
- Tablet: 640px - 1024px
- Desktop: 1024px+

### Adaptive Features
- Collapsible agent panels on mobile
- Touch-friendly audio controls
- Responsive avatar sizing

## 🔧 Development

### Type Safety
- Comprehensive TypeScript interfaces
- Strict type checking enabled
- Proper error handling with typed responses

### Code Organization
- Component-based architecture
- Service layer separation
- Utility functions for reusable logic

### Performance
- Lazy loading for avatar images
- Efficient WebSocket connection management
- Optimized re-renders with React hooks

## 🧪 Testing

### Manual Testing
- Audio recording across browsers
- WebSocket connection stability
- Avatar display and animations
- Background audio functionality

### Browser Compatibility
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🚀 Deployment

### Build Process
```bash
npm run build
```
Generates optimized production build in `dist/` folder.

### Static File Hosting
- Deploy `dist/` contents to CDN or web server
- Configure API proxy or update API URLs
- Ensure WebSocket support on hosting platform

### Environment Variables
- Update API endpoints for production
- Configure proper CORS origins
- Set up SSL for WebSocket connections