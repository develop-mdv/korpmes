import { CSSProperties, useEffect, useRef } from 'react';
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
  const { isMobile } = useBreakpoint();
  const initialMobileCloseRef = useRef(false);
  const location = useLocation();
  const isInsideChat = /^\/chats\/[^/]+/.test(location.pathname);
  const showHamburger = isMobile && !sidebarOpen && !isInsideChat;

  useEffect(() => {
    if (isMobile && !initialMobileCloseRef.current) {
      initialMobileCloseRef.current = true;
      if (useUIStore.getState().sidebarOpen) {
        toggleSidebar();
      }
    }
  }, [isMobile, toggleSidebar]);

  const layoutStyle: CSSProperties = {
    display: 'flex',
    height: 'var(--app-height, 100vh)',
    overflow: 'hidden',
  };

  const mainStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    marginLeft: isMobile ? 0 : sidebarOpen ? 260 : 72,
    paddingTop: showHamburger ? 56 : 0,
    transition: 'margin-left 0.2s ease',
  };

  const backdropStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.4)',
    zIndex: 99,
  };

  const hamburgerStyle: CSSProperties = {
    position: 'fixed',
    top: 12,
    left: 12,
    zIndex: 90,
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-sm)',
    color: 'var(--color-text)',
    fontSize: 20,
    cursor: 'pointer',
    padding: 0,
  };

  return (
    <div style={layoutStyle}>
      {isMobile && sidebarOpen && (
        <div style={backdropStyle} onClick={toggleSidebar} aria-hidden />
      )}
      <Sidebar />
      {showHamburger && (
        <button
          type="button"
          style={hamburgerStyle}
          onClick={toggleSidebar}
          aria-label="Open menu"
        >
          {'☰'}
        </button>
      )}
      <main style={mainStyle}>
        <Outlet />
      </main>
      <CallOverlay />
    </div>
  );
}
