import { describe, it, expect } from 'vitest';
import { extensionForMimeType } from '../speechToText.js';

describe('extensionForMimeType', () => {
  it('maps common MediaRecorder mime types to sensible file extensions', () => {
    expect(extensionForMimeType('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionForMimeType('audio/ogg;codecs=opus')).toBe('ogg');
    expect(extensionForMimeType('audio/mp4')).toBe('m4a');
    expect(extensionForMimeType('audio/wav')).toBe('wav');
    expect(extensionForMimeType('audio/mpeg')).toBe('mp3');
  });

  it('falls back to webm for unknown or missing mime types', () => {
    expect(extensionForMimeType('')).toBe('webm');
    expect(extensionForMimeType(undefined)).toBe('webm');
    expect(extensionForMimeType('application/octet-stream')).toBe('webm');
  });
});
