import { CSSProperties, useEffect } from 'react';
import clsx from 'clsx';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { CallOverlay } from '@/components/call/CallOverlay';
import { useSocket } from '@/hooks/useSocket';
import { useUIStore } from '@/stores/ui.store';

export function AppLayout() {
  useSocket();

  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const mainStyle = {
    '--sidebar-offset': sidebarOpen ? '320px' : '102px',
  } as CSSProperties;

  return (
    <div className="app-shell">
      <button className="app-shell__mobile-toggle" onClick={toggleSidebar} aria-label="Открыть навигацию">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

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
