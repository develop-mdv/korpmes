import { useEffect } from 'react';
import { WS_EVENTS } from '@corp/shared-constants';
import { getSocket } from '@/socket/socket';
import type { AuditLogItem } from '@/api/audit.api';

export function useAuditLiveLog(orgId: string | null | undefined, onLog: (log: AuditLogItem) => void) {
  useEffect(() => {
    if (!orgId) return;
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const handle = (log: AuditLogItem) => onLog(log);
    socket.emit('org:join:audit', { orgId });
    socket.on(WS_EVENTS.AUDIT_LOG_NEW, handle);

    return () => {
      socket.off(WS_EVENTS.AUDIT_LOG_NEW, handle);
      socket.emit('org:leave:audit', { orgId });
    };
  }, [orgId, onLog]);
}
