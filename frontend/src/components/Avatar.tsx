// src/components/Avatar.tsx
// Avatar component with gender-based assignment and active speaker highlighting

import React, { useState, useEffect } from 'react';
import { Agent } from '@/types';
import { AvatarService } from '@/utils/avatarUtils';
import { clsx } from 'clsx';

interface AvatarProps {
  agent: Agent;
  isActive?: boolean;
  isSpeaking?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  className?: string;
  onClick?: () => void;
}

export function Avatar({
  agent,
  isActive = false,
  isSpeaking = false,
  size = 'md',
  showName = false,
  className,
  onClick
}: AvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadAvatar = async () => {
      try {
        const url = await AvatarService.getAvatarUrlWithFallback(agent);
        setAvatarUrl(url);
      } catch (error) {
        console.error('Error loading avatar:', error);
        setAvatarUrl(AvatarService.createPlaceholderAvatar(agent.gender));
      }
    };

    loadAvatar();
  }, [agent]);

  const handleImageError = () => {
    setImageError(true);
    setAvatarUrl(AvatarService.createPlaceholderAvatar(agent.gender));
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  return (
    <div
      className={clsx(
        'flex flex-col items-center gap-2 transition-all duration-300',
        onClick && 'cursor-pointer hover:scale-105',
        className
      )}
      onClick={onClick}
    >
      <div
        className={clsx(
          'relative rounded-full overflow-hidden border-3 transition-all duration-300',
          sizeClasses[size],
          {
            // Active/speaking states
            'border-primary-teal shadow-lg shadow-primary-teal/30 scale-110': isActive || isSpeaking,
            'border-gray-300': !isActive && !isSpeaking,
            // Speaking animation
            'animate-pulse-slow': isSpeaking,
          }
        )}
      >
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt={`${agent.name} avatar`}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        )}

        {/* Speaking indicator */}
        {isSpeaking && (
          <div className="absolute inset-0 border-2 border-accent-green rounded-full animate-ping" />
        )}

        {/* Gender indicator for debugging */}
        <div className={clsx(
          'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
          {
            'bg-blue-500': agent.gender === 'male',
            'bg-pink-500': agent.gender === 'female',
            'bg-purple-500': agent.gender === 'neutral',
          }
        )} />
      </div>

      {showName && (
        <div className="text-center">
          <p className={clsx(
            'font-heading font-medium text-gray-800',
            textSizeClasses[size]
          )}>
            {agent.name}
          </p>
          <p className={clsx(
            'font-body text-gray-500',
            size === 'xl' ? 'text-sm' : 'text-xs'
          )}>
            {agent.persona.replace('_', ' ')}
          </p>
        </div>
      )}
    </div>
  );
}

// Agent list component to display all conversation agents
interface AgentListProps {
  agents: Agent[];
  activeAgent?: string;
  speakingAgent?: string;
  onAgentClick?: (agent: Agent) => void;
  className?: string;
}

export function AgentList({
  agents,
  activeAgent,
  speakingAgent,
  onAgentClick,
  className
}: AgentListProps) {
  return (
    <div className={clsx(
      'flex gap-4 justify-center items-start flex-wrap',
      className
    )}>
      {agents.map((agent, index) => (
        <Avatar
          key={`${agent.name}-${index}`}
          agent={agent}
          isActive={activeAgent === agent.name}
          isSpeaking={speakingAgent === agent.name}
          size="lg"
          showName
          onClick={() => onAgentClick?.(agent)}
          className="transition-all duration-300 hover:scale-105"
        />
      ))}
    </div>
  );
}

// Compact avatar for message bubbles
interface MessageAvatarProps {
  agent: Agent;
  className?: string;
}

export function MessageAvatar({ agent, className }: MessageAvatarProps) {
  return (
    <Avatar
      agent={agent}
      size="sm"
      className={clsx('flex-shrink-0', className)}
    />
  );
}