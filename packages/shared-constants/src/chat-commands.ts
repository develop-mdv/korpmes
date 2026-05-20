export type ChatCommandParseResult =
  | { kind: 'none' }
  | { kind: 'task'; title: string }
  | { kind: 'invalid'; command: 'task'; reason: 'missing-title' };

export type PreparedTaskCommand =
  | { kind: 'none' }
  | { kind: 'ready'; title: string; chatId: string; organizationId: string; assignedTo?: string }
  | { kind: 'error'; message: string };

export interface PrepareTaskCommandInput {
  command: ChatCommandParseResult;
  chatId: string;
  chatOrganizationId?: string | null;
  currentOrganizationId?: string | null;
  hasAttachments: boolean;
  chatType?: 'PERSONAL' | 'GROUP' | 'CHANNEL' | 'PROJECT' | null;
  currentUserId?: string | null;
  chatMemberUserIds?: readonly (string | null | undefined)[] | null;
}

export interface ChatCommandSuggestion {
  command: '/task';
  name: 'task';
  title: string;
  description: string;
  usage: string;
}

export const CHAT_COMMAND_SUGGESTIONS: readonly ChatCommandSuggestion[] = [
  {
    command: '/task',
    name: 'task',
    title: 'Создать задачу',
    description: 'Создаёт задачу в текущем чате',
    usage: '/task Название задачи',
  },
];

export function parseChatCommand(input: string): ChatCommandParseResult {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return { kind: 'none' };

  const taskMatch = /^\/task(?:\s+([\s\S]*))?$/i.exec(trimmed);
  if (!taskMatch) return { kind: 'none' };

  const title = (taskMatch[1] ?? '').trim().replace(/\s+/g, ' ');
  if (!title) {
    return { kind: 'invalid', command: 'task', reason: 'missing-title' };
  }

  return { kind: 'task', title };
}

export function getChatCommandSuggestions(input: string): ChatCommandSuggestion[] {
  const trimmedStart = input.trimStart();
  if (!trimmedStart.startsWith('/')) return [];
  if (/\s/.test(trimmedStart)) return [];

  const query = trimmedStart.slice(1).split(/\s+/, 1)[0].toLowerCase();
  if (query.length === 0) return [...CHAT_COMMAND_SUGGESTIONS];

  return CHAT_COMMAND_SUGGESTIONS.filter((item) => item.name.startsWith(query));
}

export function prepareTaskCommand(input: PrepareTaskCommandInput): PreparedTaskCommand {
  if (input.command.kind === 'none') return { kind: 'none' };

  if (input.command.kind === 'invalid') {
    return { kind: 'error', message: 'Используйте: /task Название задачи' };
  }

  if (input.hasAttachments) {
    return {
      kind: 'error',
      message: 'Команда /task создаёт только текстовую задачу. Отправьте файлы отдельно.',
    };
  }

  const organizationId = input.chatOrganizationId || input.currentOrganizationId;
  if (!organizationId) {
    return { kind: 'error', message: 'Не удалось определить организацию чата' };
  }

  const assignedTo =
    input.chatType === 'PERSONAL' && input.currentUserId
      ? input.chatMemberUserIds?.find((userId): userId is string => Boolean(userId && userId !== input.currentUserId))
      : undefined;

  return {
    kind: 'ready',
    title: input.command.title,
    chatId: input.chatId,
    organizationId,
    ...(assignedTo ? { assignedTo } : {}),
  };
}
