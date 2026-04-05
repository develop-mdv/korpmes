import { CSSProperties } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { CallOverlay } from '@/components/call/CallOverlay';
import { useSocket } from '@/hooks/useSocket';
import { useUIStore } from '@/stores/ui.store';

export function AppLayout() {
  useSocket();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  const layoutStyle: CSSProperties = {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
  };

  const mainStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    marginLeft: sidebarOpen ? 260 : 72,
    transition: 'margin-left 0.2s ease',
  };

  return (
    <div style={layoutStyle}>
      <Sidebar />
      <main style={mainStyle}>
        <Outlet />
      </main>
      <CallOverlay />
    </div>
  );
}
