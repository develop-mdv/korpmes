import { apiClient } from './client';

export interface CallData {
  id: string;
  chatId: string;
  initiatedBy: string;
  type: 'AUDIO' | 'VIDEO';
  status: 'RINGING' | 'ACTIVE' | 'ENDED' | 'MISSED' | 'REJECTED';
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  participants: Array<{
    id: string;
    userId: string;
    joinedAt: string;
    leftAt: string | null;
  }>;
}

export function initiateCall(chatId: string, type: 'AUDIO' | 'VIDEO'): Promise<CallData> {
  return apiClient.post('/calls', { chatId, type }).then((r) => r.data);
}

export function answerCall(callId: string): Promise<CallData> {
  return apiClient.patch(`/calls/${callId}/answer`).then((r) => r.data);
}

export function rejectCall(callId: string): Promise<CallData> {
  return apiClient.patch(`/calls/${callId}/reject`).then((r) => r.data);
}

export function hangupCall(callId: string): Promise<CallData> {
  return apiClient.patch(`/calls/${callId}/hangup`).then((r) => r.data);
}

export function getAllCallHistory(): Promise<CallData[]> {
  return apiClient.get('/calls/history/all').then((r) => r.data);
}
