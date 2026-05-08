import { useCallback, useEffect, useRef, useState } from 'react';
import { MAX_VIDEO_NOTE_DURATION_MS, VIDEO_NOTE_DIMENSION } from '@corp/shared-constants';

export type VideoNoteRecorderState = 'idle' | 'preparing' | 'recording' | 'finalizing';

export interface VideoNoteRecording {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

interface Options {
  maxDurationMs?: number;
}

function pickMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) return c;
  }
  return 'video/webm';
}

export function useVideoNoteRecorder({
  maxDurationMs = MAX_VIDEO_NOTE_DURATION_MS,
}: Options = {}) {
  const [state, setState] = useState<VideoNoteRecorderState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recording, setRecording] = useState<VideoNoteRecording | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const stopRequestedRef = useRef(false);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
  }, []);

  const stopRecorder = useCallback(() => {
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
  }, []);

  const dispose = useCallback(() => {
    stopRecorder();
    stopTracks();
    setState('idle');
    setElapsedMs(0);
    setRecording(null);
    setError(null);
  }, [stopRecorder, stopTracks]);

  // Tear everything down on unmount.
  useEffect(() => () => dispose(), [dispose]);

  // Acquire the camera stream and (if `videoEl` is given) attach it for live preview.
  const acquireStream = useCallback(async (videoEl: HTMLVideoElement | null): Promise<MediaStream> => {
    if (streamRef.current) {
      // Stream already alive; just (re-)attach to the video element.
      if (videoEl && videoEl.srcObject !== streamRef.current) {
        videoEl.srcObject = streamRef.current;
        videoEl.muted = true;
        videoEl.play().catch(() => undefined);
      }
      return streamRef.current;
    }
    setState('preparing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: VIDEO_NOTE_DIMENSION * 2 },
          height: { ideal: VIDEO_NOTE_DIMENSION * 2 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      if (videoEl) {
        videoEl.srcObject = stream;
        videoEl.muted = true;
        videoEl.play().catch(() => undefined);
      }
      setState('idle');
      return stream;
    } catch (err) {
      setState('idle');
      setError(err as Error);
      throw err;
    }
  }, []);

  const start = useCallback(async (videoEl: HTMLVideoElement | null) => {
    if (state === 'recording' || state === 'finalizing') return;
    setError(null);
    stopRequestedRef.current = false;
    chunksRef.current = [];
    setElapsedMs(0);

    try {
      const stream = await acquireStream(videoEl);
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 800_000 });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };

      // Strip codec parameters: "video/webm;codecs=vp8,opus" has an unquoted
      // comma that is invalid per RFC 2045 — Chrome+multer end up storing the
      // file as text/plain. Use the base mime everywhere downstream.
      const baseMime = mimeType.split(';')[0].trim();

      recorder.onstop = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const blob = new Blob(chunksRef.current, { type: baseMime });
        if (tickRef.current !== null) {
          cancelAnimationFrame(tickRef.current);
          tickRef.current = null;
        }
        mediaRecorderRef.current = null;
        setState('idle');
        setElapsedMs(0);
        // We surface the recording via state so the consumer never has to rely on
        // a stale onComplete callback — they just read `recording`.
        if (blob.size > 0 && stopRequestedRef.current) {
          setRecording({ blob, mimeType: baseMime, durationMs: elapsed });
        }
        stopRequestedRef.current = false;
      };

      // Small timeslice so the encoder flushes data steadily and even short clips
      // (<1s) end up with a non-empty blob.
      recorder.start(100);
      startTimeRef.current = Date.now();
      setState('recording');

      const tick = () => {
        const elapsed = Date.now() - startTimeRef.current;
        setElapsedMs(elapsed);
        if (elapsed >= maxDurationMs) {
          // Auto-stop, treat as a successful stop.
          stop();
          return;
        }
        tickRef.current = requestAnimationFrame(tick);
      };
      tickRef.current = requestAnimationFrame(tick);
    } catch (err) {
      stopRecorder();
      setState('idle');
      setError(err as Error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, maxDurationMs, acquireStream, stopRecorder]);

  const stop = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    stopRequestedRef.current = true;
    setState('finalizing');
    try {
      // Force a final dataavailable in case the encoder hasn't flushed yet.
      mediaRecorderRef.current.requestData();
    } catch {
      // ignore
    }
    mediaRecorderRef.current.stop();
  }, []);

  // Cancel an in-progress recording without producing a `recording` value.
  const cancel = useCallback(() => {
    stopRequestedRef.current = false;
    stopRecorder();
    setState('idle');
    setElapsedMs(0);
  }, [stopRecorder]);

  // Discard the recorded blob (used by overlay when user picks "Re-record").
  const discardRecording = useCallback(() => {
    setRecording(null);
  }, []);

  // Tear down everything (used by overlay on close).
  const closeAndDispose = useCallback(() => {
    dispose();
  }, [dispose]);

  return {
    state,
    elapsedMs,
    recording,
    error,
    streamRef,
    acquireStream,
    start,
    stop,
    cancel,
    discardRecording,
    closeAndDispose,
  };
}
