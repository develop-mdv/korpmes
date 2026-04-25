import { useSettingsStore } from '@/stores/settings.store';

export function requestDesktopPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return Promise.resolve('denied');
  return Notification.requestPermission();
}

export function showDesktop(
  title: string,
  body: string,
  onClick: () => void,
  options: { tag?: string; icon?: string } = {},
): void {
  if (!useSettingsStore.getState().desktopNotifsEnabled) return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.hasFocus()) return; // don't double-notify when user is already looking

  try {
    const n = new Notification(title, {
      body,
      icon: options.icon || '/favicon.ico',
      tag: options.tag,
    });
    n.onclick = () => {
      window.focus();
      onClick();
      n.close();
    };
  } catch {
    /* ignore — some browsers throw if service worker required */
  }
}
