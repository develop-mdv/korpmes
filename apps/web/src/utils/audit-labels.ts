import type { ReactNode } from 'react';
import { AUDIT_ACTIONS, type AuditActionPrefix } from '@corp/shared-constants';

export const ACTION_LABELS: Record<string, string> = {
  [AUDIT_ACTIONS.AUTH_REGISTER]: 'Регистрация',
  [AUDIT_ACTIONS.AUTH_LOGIN]: 'Вход',
  [AUDIT_ACTIONS.AUTH_LOGOUT]: 'Выход',
  [AUDIT_ACTIONS.AUTH_LOGOUT_ALL]: 'Выход со всех устройств',
  [AUDIT_ACTIONS.AUTH_PASSWORD_RESET_REQUEST]: 'Запрос сброса пароля',
  [AUDIT_ACTIONS.AUTH_PASSWORD_RESET]: 'Сброс пароля',
  [AUDIT_ACTIONS.AUTH_TWO_FACTOR_ENABLE]: 'Включена 2FA',
  [AUDIT_ACTIONS.AUTH_TWO_FACTOR_DISABLE]: 'Отключена 2FA',

  [AUDIT_ACTIONS.ORG_CREATE]: 'Создана организация',
  [AUDIT_ACTIONS.ORG_UPDATE]: 'Обновлена организация',
  [AUDIT_ACTIONS.ORG_DELETE]: 'Удалена организация',
  [AUDIT_ACTIONS.ORG_SETTINGS_UPDATE]: 'Обновлены настройки',

  [AUDIT_ACTIONS.MEMBER_INVITE]: 'Приглашение участника',
  [AUDIT_ACTIONS.MEMBER_ACCEPT_INVITE]: 'Приглашение принято',
  [AUDIT_ACTIONS.MEMBER_REMOVE]: 'Участник удалён',
  [AUDIT_ACTIONS.MEMBER_ROLE_CHANGE]: 'Изменена роль',

  [AUDIT_ACTIONS.CHAT_CREATE]: 'Создан чат',
  [AUDIT_ACTIONS.CHAT_UPDATE]: 'Обновлён чат',
  [AUDIT_ACTIONS.CHAT_DELETE]: 'Удалён чат',
  [AUDIT_ACTIONS.CHAT_MEMBER_ADD]: 'Добавлен в чат',
  [AUDIT_ACTIONS.CHAT_MEMBER_REMOVE]: 'Удалён из чата',

  [AUDIT_ACTIONS.MESSAGE_DELETE]: 'Удалено сообщение',
  [AUDIT_ACTIONS.MESSAGE_PIN]: 'Закреплено сообщение',
  [AUDIT_ACTIONS.MESSAGE_UNPIN]: 'Снято закрепление',

  [AUDIT_ACTIONS.FILE_UPLOAD]: 'Загружен файл',
  [AUDIT_ACTIONS.FILE_DOWNLOAD]: 'Скачан файл',
  [AUDIT_ACTIONS.FILE_DELETE]: 'Удалён файл',

  [AUDIT_ACTIONS.TASK_CREATE]: 'Создана задача',
  [AUDIT_ACTIONS.TASK_UPDATE]: 'Обновлена задача',
  [AUDIT_ACTIONS.TASK_ASSIGN]: 'Назначен исполнитель',
  [AUDIT_ACTIONS.TASK_DELETE]: 'Удалена задача',
  [AUDIT_ACTIONS.TASK_COMMENT_ADD]: 'Комментарий к задаче',
  [AUDIT_ACTIONS.TASK_CHECKLIST_ADD]: 'Пункт чек-листа',
  [AUDIT_ACTIONS.TASK_CHECKLIST_UPDATE]: 'Обновлён пункт чек-листа',
  [AUDIT_ACTIONS.TASK_CHECKLIST_REMOVE]: 'Удалён пункт чек-листа',
  [AUDIT_ACTIONS.TASK_ATTACHMENT_ADD]: 'Прикреплён файл',
  [AUDIT_ACTIONS.TASK_ATTACHMENT_REMOVE]: 'Откреплён файл',
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export const PREFIX_LABELS: Record<AuditActionPrefix, string> = {
  auth: 'Авторизация',
  org: 'Организация',
  member: 'Участники',
  chat: 'Чаты',
  message: 'Сообщения',
  file: 'Файлы',
  task: 'Задачи',
};

export interface ActionTone {
  color: string;
  bg: string;
}

export const PREFIX_TONES: Record<AuditActionPrefix, ActionTone> = {
  auth: { color: '#5c6f96', bg: 'rgba(92, 111, 150, 0.12)' },
  org: { color: '#9a3737', bg: 'rgba(201, 78, 78, 0.12)' },
  member: { color: '#9a3737', bg: 'rgba(201, 78, 78, 0.12)' },
  chat: { color: '#315f50', bg: 'rgba(92, 135, 117, 0.14)' },
  message: { color: '#315f50', bg: 'rgba(92, 135, 117, 0.14)' },
  file: { color: '#7a5a16', bg: 'rgba(212, 177, 106, 0.18)' },
  task: { color: '#6b5a8f', bg: 'rgba(132, 111, 170, 0.13)' },
};

const FALLBACK_TONE: ActionTone = { color: '#5f6674', bg: 'rgba(124, 132, 147, 0.13)' };

export function actionTone(action: string): ActionTone {
  const prefix = action.split('.')[0] as AuditActionPrefix;
  return PREFIX_TONES[prefix] ?? FALLBACK_TONE;
}

const META_LABELS: Record<string, string> = {
  name: 'Название',
  title: 'Название',
  size: 'Размер',
  mimeType: 'Тип',
  email: 'Email',
  phone: 'Телефон',
  role: 'Роль',
  from: 'Было',
  to: 'Стало',
  priority: 'Приоритет',
  chatId: 'Чат',
  fileId: 'Файл',
  fileName: 'Имя файла',
  itemId: 'Элемент',
  changes: 'Изменения',
  addedUserId: 'Добавлен пользователь',
  removedUserId: 'Удалён пользователь',
  type: 'Тип',
  slug: 'Идентификатор',
  commentId: 'Комментарий',
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export interface MetadataField {
  label: string;
  value: string;
}

function stringifyValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (key === 'size' && typeof value === 'number') return formatBytes(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function renderMetadata(metadata: Record<string, unknown> | null | undefined): MetadataField[] {
  if (!metadata) return [];
  const fields: MetadataField[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined || value === '') continue;
    const label = META_LABELS[key] ?? key;
    fields.push({ label, value: stringifyValue(key, value) });
  }
  return fields;
}

export function PrefixIcon(prefix: AuditActionPrefix | null): ReactNode | null {
  // Reserved for future inline icon mapping; current UI uses tone badges.
  return null;
}
