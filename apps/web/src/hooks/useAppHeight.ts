import { useEffect } from 'react';

export function useAppHeight() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const update = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty('--app-height', `${h}px`);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);
}
