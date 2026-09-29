import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';
import type { VoiceCommand, VoiceEntryResponse } from '../../types/voice';

interface VoiceEntryButtonProps {
  onResult: (transcript: string, command: VoiceCommand) => void;
  /** Disables starting a new recording, e.g. while a previous command's confirmation card is still open. */
  disabled?: boolean;
  className?: string;
}

type VoiceButtonState = 'idle' | 'recording' | 'processing' | 'error';

const MAX_RECORDING_MS = 15000; // short voice command only, never continuous listening
const MIN_RECORDING_MS = 400;
const UPLOAD_TIMEOUT_MS = 30000;
const ERROR_DISPLAY_MS = 4500;

const CANDIDATE_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4'
];

function pickSupportedMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return null;
  for (const type of CANDIDATE_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

function isVoiceEntrySupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}

export const VoiceEntryButton: React.FC<VoiceEntryButtonProps> = ({ onResult, disabled, className }) => {
  const [state, setState] = useState<VoiceButtonState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [supported] = useState(isVoiceEntrySupported);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const autoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    setState('error');
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => {
      setState('idle');
      setErrorMessage(null);
    }, ERROR_DISPLAY_MS);
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const uploadAndProcess = useCallback(
    async (blob: Blob, mimeType: string) => {
      setState('processing');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

      try {
        const response = await fetch('/api/ai/voice-entry', {
          method: 'POST',
          headers: { 'Content-Type': mimeType },
          body: blob,
          signal: controller.signal
        });

        let data: VoiceEntryResponse;
        try {
          data = await response.json();
        } catch {
          showError("I couldn't process that recording. Please try again.");
          return;
        }

        if (!data.success || !data.command) {
          showError(data.error || "I couldn't understand that. Please try again.");
          return;
        }

        setState('idle');
        onResult(data.transcript || '', data.command);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          showError('That took too long. Please check your connection and try again.');
        } else {
          showError('Network error. Please check your connection and try again.');
        }
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [onResult, showError]
  );

  const stopRecording = useCallback(() => {
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (state === 'recording' || state === 'processing' || disabled) return; // prevent accidental multiple recordings

    if (!supported) {
      showError('Voice entry is not supported in this browser.');
      return;
    }

    const mimeType = pickSupportedMimeType();
    if (!mimeType) {
      showError('This browser cannot record audio for voice entry.');
      return;
    }

    setErrorMessage(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        showError('Microphone access denied. Enable it in your browser settings to use voice entry.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        showError('No microphone was found on this device.');
      } else {
        showError('Could not access the microphone. Please try again.');
      }
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch {
      releaseStream();
      showError('Could not start recording on this device.');
      return;
    }

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const durationMs = Date.now() - startTimeRef.current;
      releaseStream();
      mediaRecorderRef.current = null;

      if (durationMs < MIN_RECORDING_MS || chunksRef.current.length === 0) {
        showError('That recording was too short. Please try again and speak clearly.');
        return;
      }

      const blob = new Blob(chunksRef.current, { type: mimeType });
      void uploadAndProcess(blob, mimeType);
    };

    recorder.onerror = () => {
      releaseStream();
      showError('Recording failed. Please try again.');
    };

    startTimeRef.current = Date.now();
    recorder.start();
    setState('recording');

    autoStopTimerRef.current = setTimeout(() => {
      stopRecording();
    }, MAX_RECORDING_MS);
  }, [state, supported, disabled, releaseStream, showError, stopRecording, uploadAndProcess]);

  const handleClick = useCallback(() => {
    if (state === 'recording') {
      stopRecording();
    } else if ((state === 'idle' || state === 'error') && !disabled) {
      void startRecording();
    }
  }, [state, disabled, stopRecording, startRecording]);

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title="Voice entry isn't supported in this browser. Try Chrome, Edge, or Safari."
        className={`flex items-center gap-1 px-2.5 py-2 bg-slate-800/40 text-slate-500 border border-slate-700/60 rounded-xl text-xs font-bold min-h-[40px] cursor-not-allowed ${className || ''}`}
      >
        <Mic className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Voice</span>
      </button>
    );
  }

  const stateStyles: Record<VoiceButtonState, string> = {
    idle: 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/30',
    recording: 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-600/30 animate-pulse',
    processing: 'bg-sky-500/20 text-sky-300 border-sky-500/40 cursor-wait',
    error: 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
  };

  const label = state === 'recording' ? 'Tap to stop' : state === 'processing' ? 'Understanding...' : state === 'error' ? 'Retry' : 'Voice';
  const title =
    disabled && state === 'idle'
      ? 'Finish reviewing the current voice entry first.'
      : state === 'error' && errorMessage
        ? errorMessage
        : 'Record a voice entry (job, expense, payment, or debt)';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'processing' || (disabled && state === 'idle')}
      title={title}
      aria-label={state === 'error' && errorMessage ? errorMessage : label}
      className={`flex items-center gap-1 px-2.5 py-2 border rounded-xl text-xs font-bold transition shadow-sm active:scale-95 min-h-[40px] ${stateStyles[state]} ${
        disabled && state === 'idle' ? 'opacity-40 cursor-not-allowed' : ''
      } ${className || ''}`}
    >
      {state === 'recording' && <Square className="w-3.5 h-3.5 fill-current" />}
      {state === 'processing' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {state === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
      {state === 'idle' && <Mic className="w-3.5 h-3.5" />}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
};
