import { useCallStore } from '@/stores/call.store';

const POLL_INTERVAL_MS = 200;
const SPEAKING_THRESHOLD = 30;
const HYSTERESIS_TICKS = 3;

interface PeerAnalyser {
  analyser: AnalyserNode;
  source: MediaStreamAudioSourceNode;
  buffer: Uint8Array<ArrayBuffer>;
  recentTicks: number[];
}

class ActiveSpeakerDetector {
  private context: AudioContext | null = null;
  private analysers = new Map<string, PeerAnalyser>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private localUserId: string | null = null;

  start(
    localUserId: string,
    localStream: MediaStream | null,
    remoteStreams: Record<string, MediaStream>,
  ) {
    if (this.timer) return;
    if (typeof AudioContext === 'undefined') return;
    this.context = new AudioContext();
    this.localUserId = localUserId;
    this.update(localStream, remoteStreams);
    this.timer = setInterval(() => this.tick(), POLL_INTERVAL_MS);
  }

  update(
    localStream: MediaStream | null,
    remoteStreams: Record<string, MediaStream>,
  ) {
    if (!this.context || !this.localUserId) return;
    const wanted = new Map<string, MediaStream>();
    if (localStream && localStream.getAudioTracks().length > 0) {
      wanted.set(this.localUserId, localStream);
    }
    for (const [userId, stream] of Object.entries(remoteStreams)) {
      if (stream.getAudioTracks().length > 0) {
        wanted.set(userId, stream);
      }
    }

    for (const userId of this.analysers.keys()) {
      if (!wanted.has(userId)) {
        this.removeAnalyser(userId);
      }
    }
    for (const [userId, stream] of wanted) {
      if (!this.analysers.has(userId)) {
        this.addAnalyser(userId, stream);
      }
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    for (const userId of Array.from(this.analysers.keys())) {
      this.removeAnalyser(userId);
    }
    if (this.context) {
      this.context.close().catch(() => {});
      this.context = null;
    }
    this.localUserId = null;
    useCallStore.getState().setActiveSpeakerId(null);
  }

  private addAnalyser(userId: string, stream: MediaStream) {
    if (!this.context) return;
    try {
      const source = this.context.createMediaStreamSource(stream);
      const analyser = this.context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      const buffer = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      this.analysers.set(userId, {
        analyser,
        source,
        buffer,
        recentTicks: [],
      });
    } catch {
      // some browsers fail on tracks already in use
    }
  }

  private removeAnalyser(userId: string) {
    const peer = this.analysers.get(userId);
    if (peer) {
      try { peer.source.disconnect(); } catch {}
      this.analysers.delete(userId);
    }
  }

  private tick() {
    let bestUser: string | null = null;
    let bestScore = SPEAKING_THRESHOLD;

    for (const [userId, peer] of this.analysers) {
      peer.analyser.getByteFrequencyData(peer.buffer);
      let sum = 0;
      for (let i = 0; i < peer.buffer.length; i++) {
        sum += peer.buffer[i];
      }
      const avg = sum / peer.buffer.length;

      peer.recentTicks.push(avg);
      if (peer.recentTicks.length > HYSTERESIS_TICKS) {
        peer.recentTicks.shift();
      }
      if (peer.recentTicks.length < HYSTERESIS_TICKS) continue;

      const allAbove = peer.recentTicks.every((v) => v > SPEAKING_THRESHOLD);
      if (!allAbove) continue;

      const recentAvg = peer.recentTicks.reduce((a, b) => a + b, 0) / HYSTERESIS_TICKS;
      if (recentAvg > bestScore) {
        bestScore = recentAvg;
        bestUser = userId;
      }
    }

    const current = useCallStore.getState().activeSpeakerId;
    if (current !== bestUser) {
      useCallStore.getState().setActiveSpeakerId(bestUser);
    }
  }
}

export const activeSpeakerDetector = new ActiveSpeakerDetector();
