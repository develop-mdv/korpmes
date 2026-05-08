import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraView } from 'expo-camera';
import { MAX_VIDEO_NOTE_DURATION_MS } from '@corp/shared-constants';

export type VideoNoteRecorderState = 'idle' | 'recording' | 'finalizing';

export interface VideoNoteRecording {
  uri: string;
  mimeType: string;
  durationMs: number;
}

interface Options {
  cameraRef: React.RefObject<CameraView>;
  onComplete?: (rec: VideoNoteRecording) => void;
  onError?: (err: Error) => void;
  maxDurationMs?: number;
}

export function useVideoNoteRecorder({
  cameraRef,
  onComplete,
  onError,
  maxDurationMs = MAX_VIDEO_NOTE_DURATION_MS,
}: Options) {
  const [state, setState] = useState<VideoNoteRecorderState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTick();
    };
  }, [stopTick]);

  const start = useCallback(async () => {
    if (state !== 'idle') return;
    if (!cameraRef.current) {
      onError?.(new Error('Camera not ready'));
      return;
    }
    cancelledRef.current = false;
    setElapsedMs(0);
    setState('recording');
    startTimeRef.current = Date.now();

    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedMs(elapsed);
    }, 100);

    try {
      const result = await cameraRef.current.recordAsync({
        maxDuration: Math.floor(maxDurationMs / 1000),
      });
      stopTick();
      const elapsed = Date.now() - startTimeRef.current;
      setState('idle');
      setElapsedMs(0);

      if (cancelledRef.current) return;
      if (result?.uri) {
        onComplete?.({
          uri: result.uri,
          mimeType: 'video/mp4',
          durationMs: elapsed,
        });
      }
    } catch (err) {
      stopTick();
      setState('idle');
      setElapsedMs(0);
      if (!cancelledRef.current) {
        onError?.(err as Error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, cameraRef, maxDurationMs, onComplete, onError, stopTick]);

  const stop = useCallback(() => {
    if (state !== 'recording' || !cameraRef.current) return;
    setState('finalizing');
    cameraRef.current.stopRecording();
  }, [state, cameraRef]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    if (state === 'recording' && cameraRef.current) {
      cameraRef.current.stopRecording();
    }
    stopTick();
    setState('idle');
    setElapsedMs(0);
  }, [state, cameraRef, stopTick]);

  return { state, elapsedMs, start, stop, cancel };
}
