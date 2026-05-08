import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_VOICE_DURATION_MS, VOICE_WAVEFORM_BARS } from '@corp/shared-constants';

export type VoiceRecorderState = 'idle' | 'recording' | 'locked' | 'finalizing';

export interface VoiceRecording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  waveform: number[];
}

interface Options {
  onComplete?: (rec: VoiceRecording) => void;
  onError?: (err: Error) => void;
  maxDurationMs?: number;
}

export function useVoiceRecorder({
  onComplete,
  onError,
  maxDurationMs = MAX_VOICE_DURATION_MS,
}: Options = {}) {
  const [state, setState] = useState<VoiceRecorderState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [amplitude, setAmplitude] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const startTimeRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const peaksRef = useRef<number[]>([]);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (tickRef.current !== null) {
      cancelAnimationFrame(tickRef.current);
      tickRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // already stopped
      }
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const pickMimeType = (): string => {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) return c;
    }
    return 'audio/webm';
  };

  const start = useCallback(async () => {
    if (state !== 'idle' && state !== 'finalizing') return;
    cancelledRef.current = false;
    chunksRef.current = [];
    peaksRef.current = [];
    setElapsedMs(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      // Strip codec params: keeps Content-Type valid per RFC 2045 so multer
      // doesn't fall back to text/plain on the server.
      const baseMime = mimeType.split(';')[0].trim();
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const wasCancelled = cancelledRef.current;
        const elapsed = Date.now() - startTimeRef.current;
        const blob = new Blob(chunksRef.current, { type: baseMime });
        cleanup();
        setState('idle');
        setAmplitude(0);
        setElapsedMs(0);
        if (!wasCancelled && blob.size > 0 && onComplete) {
          onComplete({
            blob,
            mimeType: baseMime,
            durationMs: elapsed,
            waveform: normalizeWaveform(peaksRef.current),
          });
        }
      };

      recorder.start(100);
      startTimeRef.current = Date.now();
      setState('recording');

      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (!analyserRef.current) return;
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = Math.abs(buf[i] - 128) / 128;
          if (v > peak) peak = v;
        }
        peaksRef.current.push(peak);
        setAmplitude(peak);

        const elapsed = Date.now() - startTimeRef.current;
        setElapsedMs(elapsed);
        if (elapsed >= maxDurationMs) {
          stop();
          return;
        }
        tickRef.current = requestAnimationFrame(tick);
      };
      tickRef.current = requestAnimationFrame(tick);
    } catch (err) {
      cleanup();
      setState('idle');
      onError?.(err as Error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, maxDurationMs, onComplete, onError, cleanup]);

  const stop = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    setState('finalizing');
    mediaRecorderRef.current.stop();
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    stop();
  }, [stop]);

  const lock = useCallback(() => {
    setState((s) => (s === 'recording' ? 'locked' : s));
  }, []);

  return { state, elapsedMs, amplitude, start, stop, cancel, lock };
}

function normalizeWaveform(peaks: number[]): number[] {
  if (peaks.length === 0) return [];
  const bars = VOICE_WAVEFORM_BARS;
  const out = new Array(bars).fill(0);
  const bucketSize = peaks.length / bars;
  for (let i = 0; i < bars; i++) {
    const from = Math.floor(i * bucketSize);
    const to = Math.min(peaks.length, Math.floor((i + 1) * bucketSize) + 1);
    let max = 0;
    for (let j = from; j < to; j++) {
      if (peaks[j] > max) max = peaks[j];
    }
    out[i] = Math.round(max * 100);
  }
  return out;
}
