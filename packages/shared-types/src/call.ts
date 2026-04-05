export enum CallType {
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
}

export enum CallStatus {
  RINGING = 'RINGING',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  MISSED = 'MISSED',
  REJECTED = 'REJECTED',
}

export interface Call {
  id: string;
  chatId: string;
  initiatedBy: string;
  type: CallType;
  status: CallStatus;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface CallParticipant {
  id: string;
  callId: string;
  userId: string;
  joinedAt: string;
  leftAt?: string;
  isMuted: boolean;
  isVideoOff: boolean;
}
