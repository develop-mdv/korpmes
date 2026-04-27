import { useSettingsStore } from '@/stores/settings.store';

// Uses Web Audio API to synthesize notification sounds — no binary assets needed.
// If you later drop real .mp3 files into /public/sounds/, swap the synthesis
// for `new Audio(url).play()`.

class AudioService {
  private ctx: AudioContext | null = null;
  private ringOscillator: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;
  private ringTimer: number | null = null;

  private getCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    return this.ctx;
  }

  private enabled(): boolean {
    return useSettingsStore.getState().soundEnabled;
  }

  // Short "ding": two quick sine bursts at 880 Hz
  playMessage(): void {
    if (!this.enabled()) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.beep(ctx, 880, now, 0.08, 0.14);
    this.beep(ctx, 660, now + 0.09, 0.08, 0.1);
  }

  // Looping two-tone ring: 440 Hz / 520 Hz alternating every 250 ms, silence 750 ms per cycle
  startRinging(): void {
    if (!this.enabled()) return;
    if (this.ringTimer != null) return; // already ringing
    const ctx = this.getCtx();
    if (!ctx) return;

    const cycle = () => {
      const now = ctx.currentTime;
      this.beep(ctx, 520, now, 0.2, 0.15);
      this.beep(ctx, 440, now + 0.28, 0.2, 0.15);
    };
    cycle();
    this.ringTimer = window.setInterval(cycle, 1200);
  }

  stopRinging(): void {
    if (this.ringTimer != null) {
      window.clearInterval(this.ringTimer);
      this.ringTimer = null;
    }
    if (this.ringOscillator) {
      try {
        this.ringOscillator.stop();
      } catch {
        /* ignore */
      }
      this.ringOscillator = null;
    }
    this.ringGain = null;
  }

  // Descending "beep-beep" for call ended
  playCallEnded(): void {
    if (!this.enabled()) return;
    const ctx = this.getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.beep(ctx, 440, now, 0.12, 0.18);
    this.beep(ctx, 330, now + 0.15, 0.12, 0.18);
  }

  private beep(
    ctx: AudioContext,
    freq: number,
    startAt: number,
    duration: number,
    peakGain = 0.15,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Attack/release envelope to avoid clicks
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(peakGain, startAt + 0.01);
    gain.gain.linearRampToValueAtTime(0, startAt + duration);

    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  }
}

export const audio = new AudioService();
