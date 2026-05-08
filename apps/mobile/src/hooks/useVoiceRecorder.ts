import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { MAX_VOICE_DURATION_MS, VOICE_WAVEFORM_BARS } from '@corp/shared-constants';

export type VoiceRecorderState = 'idle' | 'preparing' | 'recording' | 'locked' | 'finalizing';

export interface VoiceRecording {
  uri: string;
  mimeType: string;
  durationMs: number;
  waveform: number[];
}

interface Options {
  onComplete?: (rec: VoiceRecording) => void;
  onError?: (err: Error) => void;
  maxDurationMs?: number;
}

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

export function useVoiceRecorder({
  onComplete,
  onError,
  maxDurationMs = MAX_VOICE_DURATION_MS,
}: Options = {}) {
  const [state, setState] = useState<VoiceRecorderState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [amplitude, setAmplitude] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const peaksRef = useRef<number[]>([]);
  const cancelledRef = useRef(false);
  const finishedRef = useRef(false);

  const cleanup = useCallback(async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // already stopped
      }
      recordingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      void cleanup();
    };
  }, [cleanup]);

  const start = useCallback(async () => {
    if (state !== 'idle' && state !== 'finalizing') return;
    cancelledRef.current = false;
    finishedRef.current = false;
    peaksRef.current = [];
    setElapsedMs(0);
    setState('preparing');

    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setState('idle');
        onError?.(new Error('Microphone permission denied'));
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);

      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording) return;
        if (typeof status.durationMillis === 'number') {
          setElapsedMs(status.durationMillis);
          if (status.durationMillis >= maxDurationMs && !finishedRef.current) {
            finishedRef.current = true;
            void stop();
            return;
          }
        }
        if (typeof status.metering === 'number') {
          // metering is in dB, typically -160 to 0
          const norm = Math.max(0, Math.min(1, (status.metering + 60) / 60));
          peaksRef.current.push(norm);
          setAmplitude(norm);
        }
      });
      recording.setProgressUpdateInterval(80);

      await recording.startAsync();
      recordingRef.current = recording;
      setState('recording');
    } catch (err) {
      await cleanup();
      setState('idle');
      onError?.(err as Error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, maxDurationMs, onError, cleanup]);

  const stop = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    setState('finalizing');
    try {
      await recording.stopAndUnloadAsync();
      const status = await recording.getStatusAsync().catch(() => null);
      const uri = recording.getURI() ?? '';
      const durationMs =
        (status && typeof (status as any).durationMillis === 'number'
          ? (status as any).durationMillis
          : null) ?? elapsedMs;
      recordingRef.current = null;

      const wasCancelled = cancelledRef.current;
      setState('idle');
      setAmplitude(0);
      setElapsedMs(0);

      if (!wasCancelled && uri && onComplete) {
        onComplete({
          uri,
          mimeType: pickMimeFromUri(uri),
          durationMs,
          waveform: normalizeWaveform(peaksRef.current),
        });
      }
    } catch (err) {
      await cleanup();
      setState('idle');
      onError?.(err as Error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, onComplete, onError, cleanup]);

  const cancel = useCallback(async () => {
    cancelledRef.current = true;
    await stop();
  }, [stop]);

  const lock = useCallback(() => {
    setState((s) => (s === 'recording' ? 'locked' : s));
  }, []);

  return { state, elapsedMs, amplitude, start, stop, cancel, lock };
}

function pickMimeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.m4a') || lower.endsWith('.mp4') || lower.endsWith('.aac')) {
    return 'audio/mp4';
  }
  if (lower.endsWith('.caf')) return 'audio/mp4';
  if (lower.endsWith('.3gp') || lower.endsWith('.amr')) return 'audio/mp4';
  return 'audio/mp4';
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
