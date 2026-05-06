export const AUDIT_ACTIONS = {
  AUTH_REGISTER: 'auth.register',
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_LOGOUT_ALL: 'auth.logout_all',
  AUTH_PASSWORD_RESET_REQUEST: 'auth.password_reset_request',
  AUTH_PASSWORD_RESET: 'auth.password_reset',
  AUTH_TWO_FACTOR_ENABLE: 'auth.two_factor_enable',
  AUTH_TWO_FACTOR_DISABLE: 'auth.two_factor_disable',

  ORG_CREATE: 'org.create',
  ORG_UPDATE: 'org.update',
  ORG_DELETE: 'org.delete',
  ORG_SETTINGS_UPDATE: 'org.settings_update',

  MEMBER_INVITE: 'member.invite',
  MEMBER_ACCEPT_INVITE: 'member.accept_invite',
  MEMBER_REMOVE: 'member.remove',
  MEMBER_ROLE_CHANGE: 'member.role_change',

  CHAT_CREATE: 'chat.create',
  CHAT_UPDATE: 'chat.update',
  CHAT_DELETE: 'chat.delete',
  CHAT_MEMBER_ADD: 'chat.member_add',
  CHAT_MEMBER_REMOVE: 'chat.member_remove',

  MESSAGE_DELETE: 'message.delete',
  MESSAGE_PIN: 'message.pin',
  MESSAGE_UNPIN: 'message.unpin',

  FILE_UPLOAD: 'file.upload',
  FILE_DOWNLOAD: 'file.download',
  FILE_DELETE: 'file.delete',

  TASK_CREATE: 'task.create',
  TASK_UPDATE: 'task.update',
  TASK_ASSIGN: 'task.assign',
  TASK_DELETE: 'task.delete',
  TASK_COMMENT_ADD: 'task.comment.add',
  TASK_CHECKLIST_ADD: 'task.checklist.add',
  TASK_CHECKLIST_UPDATE: 'task.checklist.update',
  TASK_CHECKLIST_REMOVE: 'task.checklist.remove',
  TASK_ATTACHMENT_ADD: 'task.attachment.add',
  TASK_ATTACHMENT_REMOVE: 'task.attachment.remove',
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

export const AUDIT_ACTION_PREFIXES = [
  'auth',
  'org',
  'member',
  'chat',
  'message',
  'file',
  'task',
] as const;

export type AuditActionPrefix = typeof AUDIT_ACTION_PREFIXES[number];

export function getActionPrefix(action: string): AuditActionPrefix | null {
  const prefix = action.split('.')[0];
  return (AUDIT_ACTION_PREFIXES as readonly string[]).includes(prefix)
    ? (prefix as AuditActionPrefix)
    : null;
}
