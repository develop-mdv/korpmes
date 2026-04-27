import { useSettingsStore } from '@/stores/settings.store';

let originalTitle = typeof document !== 'undefined' ? document.title : '';
let intervalId: number | null = null;
let toggled = false;
let flashText = '';
let focusHandler: (() => void) | null = null;

function applyTitle(alt: boolean): void {
  if (typeof document === 'undefined') return;
  document.title = alt ? `(•) ${flashText}` : originalTitle;
}

export function startTitleFlash(text: string): void {
  if (!useSettingsStore.getState().titleFlashEnabled) return;
  if (typeof document === 'undefined') return;
  if (document.hasFocus()) return;

  // Refresh baseline on first call so we track the current page title
  if (intervalId == null) {
    originalTitle = document.title;
  }
  flashText = text;

  if (intervalId != null) return;

  intervalId = window.setInterval(() => {
    toggled = !toggled;
    applyTitle(toggled);
  }, 1500);

  focusHandler = () => stopTitleFlash();
  window.addEventListener('focus', focusHandler);
}

export function stopTitleFlash(): void {
  if (intervalId != null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
  toggled = false;
  if (typeof document !== 'undefined' && originalTitle) {
    document.title = originalTitle;
  }
  if (focusHandler) {
    window.removeEventListener('focus', focusHandler);
    focusHandler = null;
  }
}
