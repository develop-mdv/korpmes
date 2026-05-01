import { CSSProperties, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { CallOverlay } from '@/components/call/CallOverlay';
import { useSocket } from '@/hooks/useSocket';
import { useUIStore } from '@/stores/ui.store';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAppHeight } from '@/hooks/useAppHeight';

export function AppLayout() {
  useSocket();
  useAppHeight();

  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const theme = useUIStore((s) => s.theme);
  const { isMobile } = useBreakpoint();
  const initialMobileCloseRef = useRef(false);
  const location = useLocation();
  const isInsideChat = /^\/chats\/[^/]+/.test(location.pathname);
  const showHamburger = isMobile && !sidebarOpen && !isInsideChat;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isMobile && !initialMobileCloseRef.current) {
      initialMobileCloseRef.current = true;
      if (useUIStore.getState().sidebarOpen) {
        toggleSidebar();
      }
    }
  }, [isMobile, toggleSidebar]);

  const mainStyle = {
    '--sidebar-offset': sidebarOpen ? '320px' : '102px',
  } as CSSProperties;

  return (
    <div className="app-shell">
      {showHamburger && (
        <button className="app-shell__mobile-toggle" onClick={toggleSidebar} aria-label="Открыть навигацию" type="button">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
          <span>Меню</span>
        </button>
      )}

      <div className={clsx('app-shell__backdrop', sidebarOpen && 'is-visible')} onClick={toggleSidebar} />
      <Sidebar />

      <main className="app-shell__main" style={mainStyle}>
        <div className="app-stage">
          <Outlet />
        </div>
      </main>

      <CallOverlay />
    </div>
  );
}
