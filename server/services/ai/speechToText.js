// ==========================================
// AI SERVICE - SPEECH TO TEXT
// Provider-specific code is isolated to this file. To swap providers later,
// only this module needs to change; callers just get back a transcript
// string. Uses the Gemini API's native audio understanding (send the audio
// straight to generateContent and ask for a verbatim transcript) via native
// fetch (Node 18+), so no extra npm dependency is required.
// ==========================================

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// A Google-maintained floating alias that always points at their current
// Flash-tier model, so this doesn't go stale as Google ships new versions.
// Pin an exact model (e.g. "gemini-2.5-flash") via GEMINI_MODEL if you want
// stability instead of always-latest.
const TRANSCRIPTION_MODEL = process.env.GEMINI_TRANSCRIBE_MODEL || process.env.GEMINI_MODEL || 'gemini-flash-latest';
const TRANSCRIPTION_TIMEOUT_MS = 20000;

/**
 * Gemini's inlineData.mimeType wants a plain audio mime type (e.g.
 * "audio/webm"), not the "codecs=" parameter MediaRecorder appends
 * (e.g. "audio/webm;codecs=opus"). Exported for testability.
 */
export function normalizeAudioMimeType(mimeType) {
  const base = (mimeType || '').split(';')[0].trim().toLowerCase();
  return base || 'audio/webm';
}

/**
 * Sends a recorded audio buffer to Gemini and returns the raw transcript
 * text. Throws on missing config, network failure, timeout, or a non-2xx
 * response - callers are responsible for turning that into a user-friendly
 * error message.
 */
export async function transcribeAudio(audioBuffer, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_API_BASE}/models/${TRANSCRIPTION_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  'Transcribe this audio recording verbatim, in its original spoken language(s) exactly as spoken. Return ONLY the raw transcript text - no translation, no commentary, no quotation marks, no markdown formatting. If the recording has no discernible speech, return an empty response.'
              },
              { inlineData: { mimeType: normalizeAudioMimeType(mimeType), data: audioBuffer.toString('base64') } }
            ]
          }
        ],
        generationConfig: { temperature: 0 }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Speech-to-text request failed (HTTP ${response.status}): ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    return parts
      .map(p => p.text || '')
      .join('')
      .trim();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Speech-to-text request timed out.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
