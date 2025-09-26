// src/utils/avatarUtils.ts
// Avatar system utilities for agent gender-based avatar assignment

import { Agent } from '@/types';

// Avatar mappings based on agent names and genders
// Available files: aria-female.png, fin-male.png, rachel-female.png, roger-male.png, susi-female.png
const AVATAR_MAPPINGS: { [key: string]: string } = {
  // Presentation Jury Mode
  'sarah_chen_female': 'aria-female.png',
  'alex_rodriguez_male': 'roger-male.png',
  'emma_watson_female': 'rachel-female.png',

  // Environment Mode - School
  'max_male': 'fin-male.png',
  'luna_female': 'susi-female.png',
  'jordan_neutral': 'aria-female.png', // Use female avatar for neutral

  // Environment Mode - Office
  'david_kim_male': 'roger-male.png',
  'maria_garcia_female': 'rachel-female.png',

  // Fallback avatars by gender
  'fallback_male': 'fin-male.png',
  'fallback_female': 'aria-female.png',
  'fallback_neutral': 'susi-female.png'
};

// Default avatars for each gender
const DEFAULT_AVATARS = {
  male: 'roger-male.png',
  female: 'aria-female.png',
  neutral: 'susi-female.png'
};

export class AvatarService {

  static getAvatarUrl(agent: Agent): string {
    const baseUrl = '/avatars/';

    // Create a key based on agent name and gender
    const normalizedName = agent.name.toLowerCase().replace(/\s+/g, '_');
    const avatarKey = `${normalizedName}_${agent.gender}`;

    // Try to find specific avatar mapping
    let avatarFilename = AVATAR_MAPPINGS[avatarKey];

    if (!avatarFilename) {
      // Try without the full name, just gender
      avatarFilename = DEFAULT_AVATARS[agent.gender] || DEFAULT_AVATARS.neutral;
    }

    return `${baseUrl}${avatarFilename}`;
  }

  static getAllAvatarUrls(): string[] {
    return Object.values(AVATAR_MAPPINGS).map(filename => `/avatars/${filename}`);
  }

  static preloadAvatars(): void {
    // Preload avatar images for better performance
    const avatarUrls = this.getAllAvatarUrls();

    avatarUrls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }

  static createPlaceholderAvatar(gender: 'male' | 'female' | 'neutral'): string {
    // Create a simple SVG avatar as fallback
    const colors = {
      male: { bg: '#3B82F6', text: '#FFFFFF' },
      female: { bg: '#EC4899', text: '#FFFFFF' },
      neutral: { bg: '#64B62D', text: '#FFFFFF' }
    };

    const color = colors[gender];
    const initial = gender.charAt(0).toUpperCase();

    const svg = `
      <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="${color.bg}"/>
        <text x="50" y="58" font-family="system-ui, -apple-system, sans-serif"
              font-size="32" font-weight="600" text-anchor="middle"
              fill="${color.text}">${initial}</text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  static async checkAvatarExists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  static async getAvatarUrlWithFallback(agent: Agent): Promise<string> {
    const primaryUrl = this.getAvatarUrl(agent);

    // Check if the primary avatar exists
    const exists = await this.checkAvatarExists(primaryUrl);

    if (exists) {
      return primaryUrl;
    }

    // Return placeholder as fallback
    return this.createPlaceholderAvatar(agent.gender);
  }
}

// Sample avatar data for demo purposes
export const DEMO_AVATARS = {
  'aria-female.png': 'Professional woman with friendly appearance',
  'fin-male.png': 'Young professional man with casual style',
  'rachel-female.png': 'Professional woman with warm smile',
  'roger-male.png': 'Mature professional man with confident look',
  'susi-female.png': 'Friendly woman with approachable style'
};

// Create placeholder avatars if actual files don't exist
export function createDemoAvatars() {
  // This would typically be handled by the build process or server
  console.log('Demo avatars would be generated here for development');
}