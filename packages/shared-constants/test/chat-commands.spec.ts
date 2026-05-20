import {
  getChatCommandSuggestions,
  prepareTaskCommand,
  parseChatCommand,
} from '../src/chat-commands';

describe('parseChatCommand', () => {
  it('returns none for regular messages', () => {
    expect(parseChatCommand('hello team')).toEqual({ kind: 'none' });
  });

  it('parses a task title', () => {
    expect(parseChatCommand('/task Prepare sales report')).toEqual({
      kind: 'task',
      title: 'Prepare sales report',
    });
  });

  it('normalizes repeated whitespace around a task command', () => {
    expect(parseChatCommand('   /task    Prepare   sales report   ')).toEqual({
      kind: 'task',
      title: 'Prepare sales report',
    });
  });

  it('rejects an empty task command', () => {
    expect(parseChatCommand('/task   ')).toEqual({
      kind: 'invalid',
      command: 'task',
      reason: 'missing-title',
    });
  });
});

describe('getChatCommandSuggestions', () => {
  it('returns task command when slash is typed', () => {
    expect(getChatCommandSuggestions('/')).toEqual([
      {
        command: '/task',
        name: 'task',
        title: 'Создать задачу',
        description: 'Создаёт задачу в текущем чате',
        usage: '/task Название задачи',
      },
    ]);
  });

  it('filters commands by typed name', () => {
    expect(getChatCommandSuggestions('/ta')).toHaveLength(1);
    expect(getChatCommandSuggestions('/unknown')).toEqual([]);
  });

  it('does not show suggestions for regular messages', () => {
    expect(getChatCommandSuggestions('hello /task')).toEqual([]);
  });

  it('hides suggestions after the command is completed', () => {
    expect(getChatCommandSuggestions('/task Prepare report')).toEqual([]);
  });
});

describe('prepareTaskCommand', () => {
  it('uses chat organization when current organization is unavailable', () => {
    expect(
      prepareTaskCommand({
        command: { kind: 'task', title: 'Prepare report' },
        chatId: 'chat-1',
        chatOrganizationId: 'org-from-chat',
        currentOrganizationId: null,
        hasAttachments: false,
      }),
    ).toEqual({
      kind: 'ready',
      title: 'Prepare report',
      chatId: 'chat-1',
      organizationId: 'org-from-chat',
    });
  });

  it('rejects task commands with attachments', () => {
    expect(
      prepareTaskCommand({
        command: { kind: 'task', title: 'Prepare report' },
        chatId: 'chat-1',
        chatOrganizationId: 'org-1',
        currentOrganizationId: 'org-1',
        hasAttachments: true,
      }),
    ).toEqual({
      kind: 'error',
      message: 'Команда /task создаёт только текстовую задачу. Отправьте файлы отдельно.',
    });
  });
});
