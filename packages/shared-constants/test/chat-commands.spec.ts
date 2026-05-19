import { parseChatCommand } from '../src/chat-commands';

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
