import InCallManager from 'react-native-incall-manager';
import { Vibration } from 'react-native';
import { useSettingsStore } from '../stores/settings.store';

// Mobile audio feedback:
// - Incoming-call ringtone: `react-native-incall-manager` plays the system
//   ringtone and routes audio correctly (speaker, proximity sensor).
// - Message sound: not played in-foreground (Expo push handles background);
//   a short vibration gives tactile feedback when the chat isn't active.
// - Call-ended: short vibration cue.

function enabled(): boolean {
  return useSettingsStore.getState().soundEnabled;
}

let ringing = false;

export function startRinging(): void {
  if (!enabled() || ringing) return;
  try {
    // Overloads on InCallManager.startRingtone expect defined numeric timeouts;
    // cast to `any` to pass `undefined` and use the default behavior.
    (InCallManager as any).startRingtone('_BUNDLE_', undefined, undefined, 30);
    ringing = true;
  } catch {
    /* ignore — bundle sound not found etc. */
  }
}

export function stopRinging(): void {
  if (!ringing) return;
  try {
    InCallManager.stopRingtone();
  } catch {
    /* ignore */
  }
  ringing = false;
}

export function playMessage(): void {
  if (!enabled()) return;
  Vibration.vibrate(80);
}

export function playCallEnded(): void {
  if (!enabled()) return;
  Vibration.vibrate([0, 120, 80, 120]);
}
