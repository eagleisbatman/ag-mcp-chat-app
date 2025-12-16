/**
 * Intent Keywords Tests
 */

import { describe, it, expect } from 'vitest';
import { detectIntentsFromKeywords, GLOBAL_INTENT_KEYWORDS } from './keywords';

describe('Intent Keywords', () => {
  describe('GLOBAL_INTENT_KEYWORDS', () => {
    it('should have weather keywords', () => {
      expect(GLOBAL_INTENT_KEYWORDS.weather).toBeDefined();
      expect(GLOBAL_INTENT_KEYWORDS.weather).toContain('weather');
      expect(GLOBAL_INTENT_KEYWORDS.weather).toContain('rain');
      expect(GLOBAL_INTENT_KEYWORDS.weather).toContain('temperature');
    });

    it('should have soil keywords', () => {
      expect(GLOBAL_INTENT_KEYWORDS.soil).toBeDefined();
      expect(GLOBAL_INTENT_KEYWORDS.soil).toContain('soil');
      expect(GLOBAL_INTENT_KEYWORDS.soil).toContain('ph');
    });

    it('should have fertilizer keywords', () => {
      expect(GLOBAL_INTENT_KEYWORDS.fertilizer).toBeDefined();
      expect(GLOBAL_INTENT_KEYWORDS.fertilizer).toContain('fertilizer');
    });

    it('should have feed keywords', () => {
      expect(GLOBAL_INTENT_KEYWORDS.feed).toBeDefined();
      expect(GLOBAL_INTENT_KEYWORDS.feed).toContain('feed');
      expect(GLOBAL_INTENT_KEYWORDS.feed).toContain('cattle');
    });

    it('should have climate keywords', () => {
      expect(GLOBAL_INTENT_KEYWORDS.climate).toBeDefined();
      expect(GLOBAL_INTENT_KEYWORDS.climate).toContain('season');
    });
  });

  describe('detectIntentsFromKeywords', () => {
    it('should detect weather intent', () => {
      const intents = detectIntentsFromKeywords('What is the weather today?');
      expect(intents).toContain('weather');
    });

    it('should detect soil intent', () => {
      const intents = detectIntentsFromKeywords('What is the soil pH in my field?');
      expect(intents).toContain('soil');
    });

    it('should detect fertilizer intent', () => {
      const intents = detectIntentsFromKeywords('Which fertilizer should I use for wheat?');
      expect(intents).toContain('fertilizer');
    });

    it('should detect feed intent', () => {
      const intents = detectIntentsFromKeywords('What should I feed my cattle?');
      expect(intents).toContain('feed');
    });

    it('should detect climate intent', () => {
      const intents = detectIntentsFromKeywords('What is the seasonal forecast?');
      expect(intents).toContain('climate');
    });

    it('should detect multiple intents', () => {
      const intents = detectIntentsFromKeywords('What fertilizer and weather for my wheat?');
      expect(intents).toContain('fertilizer');
      expect(intents).toContain('weather');
    });

    it('should be case insensitive', () => {
      const intents = detectIntentsFromKeywords('WHAT IS THE WEATHER?');
      expect(intents).toContain('weather');
    });

    it('should return empty array for no matches', () => {
      const intents = detectIntentsFromKeywords('Hello how are you?');
      expect(intents).toHaveLength(0);
    });

    it('should return empty array for empty message', () => {
      const intents = detectIntentsFromKeywords('');
      expect(intents).toHaveLength(0);
    });

    it('should detect rain as weather intent', () => {
      const intents = detectIntentsFromKeywords('Will it rain tomorrow?');
      expect(intents).toContain('weather');
    });

    it('should detect nitrogen as soil intent', () => {
      const intents = detectIntentsFromKeywords('How much nitrogen is in the soil?');
      expect(intents).toContain('soil');
    });

    it('should detect livestock as feed intent', () => {
      const intents = detectIntentsFromKeywords('I need help with my livestock nutrition');
      expect(intents).toContain('feed');
    });
  });
});
