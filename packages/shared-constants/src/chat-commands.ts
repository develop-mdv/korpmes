export type ChatCommandParseResult =
  | { kind: 'none' }
  | { kind: 'task'; title: string }
  | { kind: 'invalid'; command: 'task'; reason: 'missing-title' };

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
