// ==========================================
// AI SERVICE - SPEECH TO TEXT
// Provider-specific code is isolated to this file. To swap providers later,
// only this module needs to change; callers just get back a transcript string.
// Uses OpenAI's Whisper transcription endpoint via native fetch/FormData/Blob
// (Node 18+), so no extra npm dependency is required.
// ==========================================

const OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';
const TRANSCRIPTION_TIMEOUT_MS = 20000;

export function extensionForMimeType(mimeType) {
  const type = (mimeType || '').toLowerCase();
  if (type.includes('webm')) return 'webm';
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return 'm4a';
  if (type.includes('wav')) return 'wav';
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3';
  return 'webm';
}

/**
 * Sends a recorded audio buffer to OpenAI Whisper and returns the raw
 * transcript text. Throws on missing config, network failure, timeout, or a
 * non-2xx response - callers are responsible for turning that into a
 * user-friendly error message.
 */
export async function transcribeAudio(audioBuffer, mimeType) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server.');
  }

  const blob = new Blob([audioBuffer], { type: mimeType || 'audio/webm' });
  const form = new FormData();
  form.append('file', blob, `voice-entry.${extensionForMimeType(mimeType)}`);
  form.append('model', 'whisper-1');
  form.append('response_format', 'json');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Speech-to-text request failed (HTTP ${response.status}): ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    return typeof data.text === 'string' ? data.text.trim() : '';
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Speech-to-text request timed out.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
