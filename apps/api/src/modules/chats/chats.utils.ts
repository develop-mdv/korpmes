import { Chat, ChatType } from './entities/chat.entity';

export function isSelfChat(
  chat: Pick<Chat, 'type'> & { members?: Array<{ userId: string; leftAt?: Date | null }> },
  userId: string,
): boolean {
  if (chat.type !== ChatType.PERSONAL) return false;
  const active = (chat.members ?? []).filter((m) => !m.leftAt);
  return active.length === 1 && active[0].userId === userId;
}
