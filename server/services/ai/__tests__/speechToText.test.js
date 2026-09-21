import { describe, it, expect } from 'vitest';
import { normalizeAudioMimeType } from '../speechToText.js';

describe('normalizeAudioMimeType', () => {
  it('strips MediaRecorder codec parameters, keeping the base mime type Gemini expects', () => {
    expect(normalizeAudioMimeType('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(normalizeAudioMimeType('audio/ogg;codecs=opus')).toBe('audio/ogg');
    expect(normalizeAudioMimeType('audio/mp4')).toBe('audio/mp4');
  });

  it('lowercases the mime type', () => {
    expect(normalizeAudioMimeType('Audio/WEBM;codecs=Opus')).toBe('audio/webm');
  });

  it('falls back to audio/webm for empty or missing mime types', () => {
    expect(normalizeAudioMimeType('')).toBe('audio/webm');
    expect(normalizeAudioMimeType(undefined)).toBe('audio/webm');
  });
});
